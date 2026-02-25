// game.js — THE PIXEL WAR v5
// Multi-map • Walking animation • Quest system • Story-driven NPCs • Animated battles

import { fetchNormieMeta, fetchNormiePixels, makeDemoNormie, calcStats } from './normie-api.js';
import { connectWallet, loadWalletNormies, loadDemoNormies } from './wallet.js';
import { T, getTile, tickTiles, TILE_SIZE, tilesReady } from './tiles.js';
import { MAP_BUILDERS, isTileBlocked, MAP_SPAWN } from './mapgen.js';
import { QUESTS, ITEMS, NPC_DEFS, ENEMIES, MAPS, LORE } from './story.js';
import { buildNpcSprite, buildEnemySprite, buildPlayerSprite, buildPartyBattleSprite } from './sprites.js';

const TS = TILE_SIZE; // 16px tiles

// ═══════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════
const G = {
  // Wallet / collection
  collection: [], party: [], demo: false,

  // World state
  mapId: 'home',
  mapData: null,   // { tiles, w, h }
  px: 4, py: 7,   // player tile position
  facing: 'down',
  walkFrame: 0,
  walkTimer: 0,
  moving: false,

  // Camera
  camX: 0, camY: 0,

  // Persistent save
  save: {
    gold: 0,
    inventory: { potion: 3 },  // itemId → count
    quests: {},           // questId → quest state copy
    activeQuests: ['prologue'],
    completedQuests: [],
    voidSteps: 0,         // steps on void terrain
    antivoidSteps: 0,     // steps of protection remaining
    steps: 0,
    battlesWon: 0,
    journal: [],
    talkedTo: {},         // npcId → true
    visitedMaps: {},      // mapId → true
    flags: {},            // general story flags
  },

  // Screen
  screen: 'title',
  fadeAlpha: 0,
  fadeDir: 0,
  fadeCallback: null,

  // Dialogue
  dlg: null,  // { speaker, lines, lineIdx, portrait, onClose }

  // Battle
  battle: null,

  // Menu/overlay
  menu: null, // 'inventory' | 'journal' | 'map'

  // Sprites cache
  playerSprite: null,
  npcSprites: {},
  enemySprites: {},
  battleSprites: {}, // normieId → 40×40 canvas
  npcSpriteBuilt: {},

  // Input
  keys: {},
  moveCooldown: 0,
  interactPressed: false,
  menuPressed: false,

  // Encounter cooldown
  encounterCooldown: 0,

  // Quest notification
  questNotif: null, // { text, timer }
  itemNotif: null,  // { text, timer }

  // Battle animation
  batAnim: null,
};

// Deep-clone quest data into save
function initQuestSave() {
  Object.entries(QUESTS).forEach(([id, q]) => {
    G.save.quests[id] = {
      id,
      steps: q.steps.map(s => ({...s})),
      complete: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// CANVAS
// ═══════════════════════════════════════════════════════════
let canvas, ctx, hudCanvas, hudCtx;
let W = 0, H = 0;
let raf = null, lastT = 0;

function initCanvas() {
  canvas = document.getElementById('world-canvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  if (ctx) ctx.imageSmoothingEnabled = false;
}

// ═══════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════
function initInput() {
  window.addEventListener('keydown', e => {
    G.keys[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')
      G.interactPressed = true;
    if (e.code === 'KeyI' || e.code === 'Escape' || e.code === 'KeyM')
      G.menuPressed = true;
  });
  window.addEventListener('keyup', e => { G.keys[e.code] = false; });

  // Touch/click for mobile
  canvas.addEventListener('click', () => {
    G.interactPressed = true;
  });
}

// ═══════════════════════════════════════════════════════════
// MAP LOADING
// ═══════════════════════════════════════════════════════════
function loadMap(mapId, spawnX, spawnY) {
  G.mapId = mapId;
  G.mapData = MAP_BUILDERS[mapId]();
  G.px = spawnX !== undefined ? spawnX : MAP_SPAWN[mapId].x;
  G.py = spawnY !== undefined ? spawnY : MAP_SPAWN[mapId].y;
  G.encounterCooldown = 8;
  G.save.visitedMaps[mapId] = true;

  // Build NPC sprites for this map
  NPC_DEFS.filter(n => n.mapId === mapId).forEach(n => {
    if (!G.npcSpriteBuilt[n.id]) {
      G.npcSprites[n.id] = buildNpcSprite(n.sprite, 2);
      G.npcSpriteBuilt[n.id] = true;
    }
  });

  // Quest: entering cave
  if (mapId === 'cave') completeQuestStep('ch2_cave', 'enter_cave');
  if (mapId === 'citadel') completeQuestStep('ch3_void_march', 'reach_citadel');
  if (mapId === 'town') completeQuestStep('ch1_find_oracle', 'reach_town');
  if (mapId === 'void_lands') completeQuestStep('ch3_void_march', 'cross_void');
}

function fadeToMap(mapId, spawnX, spawnY) {
  startFade(1, () => {
    loadMap(mapId, spawnX, spawnY);
    startFade(-1, null);
  });
}

// ═══════════════════════════════════════════════════════════
// FADE
// ═══════════════════════════════════════════════════════════
function startFade(dir, cb) {
  G.fadeDir = dir;
  G.fadeCallback = cb;
  if (dir > 0) G.fadeAlpha = 0;
  else G.fadeAlpha = 1;
}

function updateFade(dt) {
  if (G.fadeDir === 0) return;
  G.fadeAlpha += G.fadeDir * dt * 0.005;
  if (G.fadeDir > 0 && G.fadeAlpha >= 1) {
    G.fadeAlpha = 1; G.fadeDir = 0;
    if (G.fadeCallback) { G.fadeCallback(); G.fadeCallback = null; }
  } else if (G.fadeDir < 0 && G.fadeAlpha <= 0) {
    G.fadeAlpha = 0; G.fadeDir = 0;
  }
}

// ═══════════════════════════════════════════════════════════
// QUEST SYSTEM
// ═══════════════════════════════════════════════════════════
function completeQuestStep(questId, stepId, amount=1) {
  const qs = G.save.quests[questId];
  if (!qs || qs.complete) return false;
  if (!G.save.activeQuests.includes(questId)) return false;
  const step = qs.steps.find(s => s.id === stepId);
  if (!step || step.done) return false;

  if (step.target !== undefined) {
    step.progress = Math.min(step.target, (step.progress||0) + amount);
    // Update display text
    const base = QUESTS[questId].steps.find(s=>s.id===stepId).text;
    step.text = base.replace(/\(\d+\/\d+\)/, `(${step.progress}/${step.target})`);
    if (step.progress >= step.target) step.done = true;
  } else {
    step.done = true;
  }

  // Check if all steps done → complete quest
  if (qs.steps.every(s => s.done)) {
    qs.complete = true;
    G.save.completedQuests.push(questId);
    G.save.activeQuests = G.save.activeQuests.filter(q => q !== questId);
    // Give rewards
    const qdef = QUESTS[questId];
    if (qdef.reward) {
      if (qdef.reward.gold) G.save.gold += qdef.reward.gold;
      (qdef.reward.items||[]).forEach(item => addItem(item, 1));
    }
    showQuestNotif(`Quest Complete: ${QUESTS[questId].name}`);
    addJournal(`[Quest Complete] ${QUESTS[questId].name}`);
    // Start follow-up quests automatically if needed
    startFollowupQuests(questId);
  } else {
    // Show step notification
    if (step.done) showQuestNotif(step.text);
  }
  renderHUD();
  return true;
}

function startQuest(questId) {
  if (G.save.activeQuests.includes(questId)) return;
  if (G.save.completedQuests.includes(questId)) return;
  G.save.activeQuests.push(questId);
  showQuestNotif(`New Quest: ${QUESTS[questId].name}`);
  addJournal(`[New Quest] ${QUESTS[questId].name}: ${QUESTS[questId].desc}`);
  renderHUD();
}

function startFollowupQuests(completedId) {
  const followups = {
    prologue: ['ch1_find_oracle'],
    ch1_find_oracle: [],
    ch1_bit_shards: ['ch2_cave'],
    ch2_cave: ['ch3_void_march'],
    ch3_void_march: ['finale'],
  };
  (followups[completedId] || []).forEach(startQuest);
}

function addItem(itemId, count=1) {
  G.save.inventory[itemId] = (G.save.inventory[itemId]||0) + count;
  const item = ITEMS[itemId];
  if (item) showItemNotif(`Got: ${item.icon} ${item.name}`);
}

function hasItem(itemId) { return (G.save.inventory[itemId]||0) > 0; }

function showQuestNotif(text) {
  G.questNotif = { text, timer: 220 };
}
function showItemNotif(text) {
  G.itemNotif = { text, timer: 180 };
}
function addJournal(entry) {
  const ts = `Step ${G.save.steps}`;
  G.save.journal.unshift(`${ts}: ${entry}`);
  if (G.save.journal.length > 60) G.save.journal.pop();
}

// ═══════════════════════════════════════════════════════════
// MOVEMENT & MAP LOGIC
// ═══════════════════════════════════════════════════════════
function handleMovement(dt) {
  if (G.dlg || G.battle || G.menu || G.fadeDir) return;

  G.moveCooldown -= dt;
  if (G.moveCooldown > 0) return;

  let dx=0, dy=0;
  if (G.keys['ArrowLeft']||G.keys['KeyA'])  { dx=-1; G.facing='left'; }
  else if (G.keys['ArrowRight']||G.keys['KeyD']) { dx=1;  G.facing='right'; }
  else if (G.keys['ArrowUp']||G.keys['KeyW'])    { dy=-1; G.facing='up'; }
  else if (G.keys['ArrowDown']||G.keys['KeyS'])  { dy=1;  G.facing='down'; }
  else { G.moving=false; return; }

  const nx=G.px+dx, ny=G.py+dy;
  const { tiles, w, h } = G.mapData;
  if (nx<0||ny<0||nx>=w||ny>=h) return;

  const tile = tiles[ny][nx];
  if (isTileBlocked(tile)) { G.moving=false; return; }

  // Check map transition
  const mapCfg = MAPS[G.mapId];
  if (mapCfg?.connections) {
    for (const conn of mapCfg.connections) {
      if (nx===conn.triggerX && ny===conn.triggerY) {
        // Check if cave requires render_key
        if (conn.destMap==='cave' && !hasItem('render_key') &&
            !G.save.completedQuests.includes('ch1_bit_shards')) {
          openDialogue('CAVE ENTRANCE', [
            'The cave entrance is sealed with ancient render-code.',
            'It can only be opened with a Render Key.',
            'Defeat 3 Void Scouts in the plains and bring their Pixel Shards to the Oracle.',
          ]);
          return;
        }
        fadeToMap(conn.destMap, conn.destX, conn.destY);
        G.moveCooldown = 300;
        return;
      }
    }
  }

  // Home door exit
  if (G.mapId==='home' && tile===T.DOOR) {
    completeQuestStep('prologue','leave_home');
    fadeToMap('overworld', 15, 22);
    G.moveCooldown=300;
    return;
  }
  if (G.mapId==='home' && tile===T.STAIRS_DN) {
    // stay in home but go "downstairs" - just navigate within
    G.px=nx; G.py=ny;
    G.moving=true; G.moveCooldown=110;
    advanceWalk(dt);
    return;
  }

  G.px=nx; G.py=ny;
  G.moving=true; G.moveCooldown=110;
  G.save.steps++;
  G.encounterCooldown = Math.max(0, G.encounterCooldown-1);

  // Void damage
  if (MAPS[G.mapId]?.voidDamage && (tile===T.VOID||tile===T.DARK_GRASS)) {
    if (G.save.antivoidSteps > 0) {
      G.save.antivoidSteps--;
    } else {
      G.save.voidSteps++;
      if (G.save.voidSteps % 4 === 0) {
        G.party.filter(n=>n.alive).forEach(n=>{
          const dmg=Math.max(1,Math.floor(n.maxHp*0.04));
          n.hp=Math.max(1,n.hp-dmg);
        });
        showItemNotif('VOID DRAIN: -4% HP');
        renderHUD();
      }
    }
  }

  // Random encounter
  const encTile = [T.GRASS0,T.GRASS1,T.GRASS2,T.DARK_GRASS,T.VOID,T.CAVE_FLOOR];
  if (encTile.includes(tile) && G.encounterCooldown===0) {
    const mapCfg = MAPS[G.mapId];
    const base = mapCfg?.encounterRate||0;
    const boost = (tile===T.DARK_GRASS||tile===T.VOID) ? 1.8 : 1.0;
    if (Math.random() < base*boost) {
      G.encounterCooldown = 10;
      startEncounter();
      return;
    }
  }

  advanceWalk(dt);
  renderHUD();
}

function advanceWalk(dt) {
  G.walkTimer += dt;
  if (G.walkTimer > 100) { G.walkFrame=(G.walkFrame+1)%8; G.walkTimer=0; }
  if (G.playerSprite) G.playerSprite.render(G.moving ? G.walkFrame : 0);
}

// ═══════════════════════════════════════════════════════════
// INTERACTION
// ═══════════════════════════════════════════════════════════
function handleInteract() {
  if (!G.interactPressed) return;
  G.interactPressed = false;

  if (G.battle) return;
  if (G.menu) { closeMenu(); return; }

  if (G.dlg) {
    advanceDialogue();
    return;
  }

  // Check NPC adjacency
  const dirs = [[0,0],[0,-1],[0,1],[-1,0],[1,0]];
  for (const [dx,dy] of dirs) {
    const tx=G.px+dx, ty=G.py+dy;
    const npc = NPC_DEFS.find(n=>n.mapId===G.mapId&&n.x===tx&&n.y===ty);
    if (npc) { interactNPC(npc); return; }
  }

  // Check sign
  for (const [dx,dy] of dirs) {
    const tx=G.px+dx, ty=G.py+dy;
    const tile=G.mapData?.tiles[ty]?.[tx];
    if (tile===T.SIGN) {
      openDialogue('SIGNPOST', [
        G.mapId==='overworld'
          ? '← Your Home   |   → Pixel Town\nStay on the path.\nVoid Scouts in the dark grass.'
          : G.mapId==='town'
          ? '↑ Oracle (N)  |  ↓ Cave Path (S)\n← Overworld   |  → Shop / Library'
          : 'You are deep in the Grid. Be careful.'
      ]);
      return;
    }
  }
}

function interactNPC(npc) {
  G.save.talkedTo[npc.id] = (G.save.talkedTo[npc.id]||0)+1;
  const lineIdx = G.save.talkedTo[npc.id] % npc.lines.length;
  const lines = [npc.lines[lineIdx]];

  // Inn: heal
  if (npc.inn) {
    G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
    addJournal(`Rested at ${npc.name}`);
    renderHUD();
    lines.push('All Normies fully restored.');
  }

  // Shop
  if (npc.shop) {
    // Open shop dialogue, then show shop menu
    openDialogue(npc.name, lines, G.npcSprites[npc.id], () => openShop(npc));
    return;
  }

  // Gift item
  if (npc.giftItem && !G.save.flags[`gift_${npc.id}`]) {
    G.save.flags[`gift_${npc.id}`] = true;
    addItem(npc.giftItem, 1);
  }

  // Quest triggers
  if (npc.questTrigger) {
    const qt = npc.questTrigger;
    if (qt.stepComplete) {
      const qid = G.save.activeQuests.find(qid => {
        const qs = G.save.quests[qid];
        return qs && qs.steps.some(s=>s.id===qt.stepComplete);
      }) || Object.keys(G.save.quests).find(qid => {
        return G.save.quests[qid]?.steps.some(s=>s.id===qt.stepComplete);
      });
      if (qid) completeQuestStep(qid, qt.stepComplete);
    }
    if (qt.start) startQuest(qt.start);
  }

  openDialogue(npc.name, lines, G.npcSprites[npc.id]);
}

// ═══════════════════════════════════════════════════════════
// DIALOGUE
// ═══════════════════════════════════════════════════════════
function openDialogue(speaker, lines, portrait=null, onClose=null) {
  G.dlg = { speaker, lines: Array.isArray(lines)?lines:[lines], lineIdx:0, portrait, onClose };
  renderDialogue();
}

function advanceDialogue() {
  if (!G.dlg) return;
  G.dlg.lineIdx++;
  if (G.dlg.lineIdx >= G.dlg.lines.length) {
    const cb = G.dlg.onClose;
    G.dlg = null;
    document.getElementById('dialogue').classList.add('hidden');
    if (cb) cb();
  } else {
    renderDialogue();
  }
}

function renderDialogue() {
  if (!G.dlg) return;
  const el = document.getElementById('dialogue');
  el.classList.remove('hidden');
  document.getElementById('dlg-speaker').textContent = G.dlg.speaker;
  document.getElementById('dlg-text').textContent = G.dlg.lines[G.dlg.lineIdx];
  document.getElementById('dlg-page').textContent =
    G.dlg.lines.length > 1 ? `${G.dlg.lineIdx+1}/${G.dlg.lines.length}` : '';

  const portrait = document.getElementById('dlg-portrait');
  if (G.dlg.portrait) {
    portrait.innerHTML='';
    const scaled = document.createElement('canvas');
    scaled.width=40; scaled.height=40;
    const sctx=scaled.getContext('2d'); sctx.imageSmoothingEnabled=false;
    sctx.drawImage(G.dlg.portrait, 0,0,40,40);
    portrait.appendChild(scaled);
    portrait.style.display='block';
  } else {
    portrait.style.display='none';
  }
}

// ═══════════════════════════════════════════════════════════
// SHOP
// ═══════════════════════════════════════════════════════════
const SHOP_PRICES = { potion:12, antivoid:18, full_render:60 };

function openShop(npc) {
  const el = document.getElementById('shop');
  el.classList.remove('hidden');
  const inv = document.getElementById('shop-items');
  inv.innerHTML = '';

  (npc.shopInventory||[]).forEach(itemId => {
    const item=ITEMS[itemId]; if(!item) return;
    const price=SHOP_PRICES[itemId]||15;
    const row=document.createElement('div'); row.className='shop-row';
    row.innerHTML=`<span class="shop-icon">${item.icon}</span>
      <span class="shop-name">${item.name}</span>
      <span class="shop-desc">${item.desc}</span>
      <span class="shop-price">${price}G</span>
      <button class="btn-buy" data-item="${itemId}" data-price="${price}">Buy</button>`;
    inv.appendChild(row);
  });

  document.getElementById('shop-gold').textContent=G.save.gold;
  document.querySelectorAll('.btn-buy').forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.item, price=parseInt(btn.dataset.price);
      if(G.save.gold>=price){
        G.save.gold-=price; addItem(id,1);
        document.getElementById('shop-gold').textContent=G.save.gold;
        renderHUD();
        showItemNotif(`Bought: ${ITEMS[id].name} for ${price}G`);
      } else {
        showItemNotif('Not enough Gold.');
      }
    };
  });
}

// ═══════════════════════════════════════════════════════════
// ENCOUNTER / BATTLE
// ═══════════════════════════════════════════════════════════
function getZoneTier() {
  const mapCfg = MAPS[G.mapId];
  if (!mapCfg?.subZones) return (mapCfg?.encounterRate||0)>0.2 ? 2 : 0;
  for (const z of mapCfg.subZones) {
    if (G.px>=z.x0&&G.px<z.x1&&G.py>=z.y0&&G.py<z.y1) return z.tier;
  }
  return mapCfg.id==='cave'?2 : mapCfg.id==='void_lands'?3 : mapCfg.id==='citadel'?4 : 0;
}

const TIER_ENEMIES = [
  ['void_scout','glitch_sprite'],
  ['void_soldier','bit_wraith'],
  ['pixel_golem'],
  ['void_commander'],
];

function startEncounter(forcedEnemyId) {
  const tier = getZoneTier();
  const pool = TIER_ENEMIES[Math.min(tier, TIER_ENEMIES.length-1)];
  const enemyId = forcedEnemyId || pool[Math.floor(Math.random()*pool.length)];
  const edef = ENEMIES[enemyId];

  const partySize = G.party.filter(n=>n.alive).length || 1;
  const scale = 0.5 + partySize*0.1 + tier*0.08;
  const enemy = {
    ...edef,
    maxHp: Math.round(edef.hpBase * scale),
    hp:    Math.round(edef.hpBase * scale),
    atk:   Math.round(edef.atkBase * scale),
    animX: 0, shakeTimer: 0, flashTimer: 0,
  };

  // Build enemy sprite if needed
  if (!G.enemySprites[enemyId]) {
    G.enemySprites[enemyId] = buildEnemySprite(edef.sprite||enemyId, enemyId.length*37+tier);
  }

  // Build party battle sprites
  G.party.forEach(n=>{
    if(!G.battleSprites[n.id])
      G.battleSprites[n.id] = buildPartyBattleSprite(n.pixels);
  });

  // Turn order
  const fighters = [
    ...G.party.filter(n=>n.alive).map(n=>({...n,isPlayer:true,animX:0,flashTimer:0})),
    {...enemy, isEnemy:true},
  ].sort((a,b)=>b.spd-a.spd);

  G.battle = {
    enemy, fighters, turn: 0, round: 1,
    over: false, result: null,
    log: [],
    animQueue: [], animPlaying: false,
    actionLocked: false,
  };

  if (edef.preText) G.battle.log.push({ text: edef.preText, cls:'log-lore' });
  G.battle.log.push({ text:`${enemy.name} appeared!`, cls:'log-em' });
  G.battle.log.push({ text: edef.lore, cls:'log-lore' });

  addJournal(`Encountered: ${enemy.name}`);
  openBattleScreen();
}

function openBattleScreen() {
  document.getElementById('battle').classList.remove('hidden');
  document.getElementById('bat-result').classList.add('hidden');
  document.getElementById('bat-main').classList.remove('hidden');
  renderBattle();
  checkEnemyTurn();
}

function renderBattle() {
  if (!G.battle) return;
  const { enemy, fighters, turn } = G.battle;
  const mapName = MAPS[G.mapId]?.name||'';
  document.getElementById('bat-zone').textContent = mapName.toUpperCase();
  const roundEl=document.getElementById('bat-round'); if(roundEl) roundEl.textContent='Round '+G.battle.round;

  // Enemy side
  const ec = document.getElementById('enemy-canvas');
  const esprite = G.enemySprites[enemy.id];
  ec.width=72; ec.height=72;
  const ectx=ec.getContext('2d'); ectx.imageSmoothingEnabled=false;
  if (esprite) {
    ectx.drawImage(esprite, enemy.animX||0, 0, 72, 72);
  }
  // Flash on hit
  if (enemy.flashTimer>0) {
    ectx.globalAlpha=0.5; ectx.fillStyle='#fff';
    ectx.fillRect(0,0,72,72); ectx.globalAlpha=1;
  }
  document.getElementById('enemy-name').textContent = enemy.name;
  document.getElementById('enemy-hp-text').textContent = `${Math.max(0,enemy.hp)} / ${enemy.maxHp}`;
  document.getElementById('enemy-hp-bar').style.width = Math.max(0,enemy.hp/enemy.maxHp*100)+'%';

  // Party side
  const partyEl=document.getElementById('bat-party'); partyEl.innerHTML='';
  const curFighter = fighters[turn];
  G.party.forEach(n=>{
    const isActive = curFighter?.isPlayer && curFighter.id===n.id;
    const div=document.createElement('div');
    div.className='bnorm'+(n.alive?'':' dead')+(isActive?' active':'');
    div.id='bfighter_'+n.id;

    // Portrait from battle sprites
    const bsprite=G.battleSprites[n.id];
    if(bsprite){
      const bc=document.createElement('canvas'); bc.width=40; bc.height=40;
      const bctx=bc.getContext('2d'); bctx.imageSmoothingEnabled=false;
      bctx.drawImage(bsprite,0,0,40,40);
      // Flash
      const f=fighters.find(f=>f.isPlayer&&f.id===n.id);
      if(f?.flashTimer>0){bctx.globalAlpha=0.6;bctx.fillStyle='#fff';bctx.fillRect(0,0,40,40);bctx.globalAlpha=1;}
      div.appendChild(bc);
    }

    div.innerHTML+=`<div class="bnorm-name">#${n.id}</div>
      <div class="bnorm-type">${n.type}</div>
      <div class="bnorm-bar-wrap"><div class="bnorm-bar-hp" style="width:${Math.max(0,n.hp/n.maxHp*100)}%"></div></div>
      <div class="bnorm-bar-wrap"><div class="bnorm-bar-mp" style="width:${Math.max(0,n.mp/n.maxMp*100)}%"></div></div>
      <div class="bnorm-hp">${n.hp}/${n.maxHp}</div>`;
    partyEl.appendChild(div);
  });

  // Log
  const logEl=document.getElementById('bat-log'); logEl.innerHTML='';
  G.battle.log.slice(-8).forEach(entry=>{
    const d=document.createElement('div'); d.className=entry.cls||'log-normal';
    d.textContent=entry.text; logEl.appendChild(d);
  });
  logEl.scrollTop=logEl.scrollHeight;

  // Action bar
  const cur=fighters.find(f=>f.isPlayer&&f===fighters[turn]);
  const locked=G.battle.actionLocked||!cur||G.battle.over;
  ['btn-atk','btn-skill','btn-ult','btn-bpot'].forEach(id=>
    document.getElementById(id).disabled=locked);
  if(cur){
    document.getElementById('btn-skill').disabled=locked||cur.mp<3;
    document.getElementById('btn-ult').disabled=locked||cur.mp<6;
    document.getElementById('btn-bpot').disabled=locked||(G.save.inventory.potion||0)<=0;
    document.getElementById('bat-action-label').textContent=
      `${cur.name} — ATK:${cur.atkBasic} SKL:${cur.atkSkill} ULT:${cur.atkUltimate} | ${cur.hp}/${cur.maxHp}HP ${cur.mp}/${cur.maxMp}MP`;
  } else {
    document.getElementById('bat-action-label').textContent=
      fighters[G.battle.turn]?.isEnemy ? `${enemy.name} is acting…` : '—';
  }
}

function bLog(text, cls='log-normal') {
  G.battle.log.push({text,cls});
  if(G.battle.log.length>30) G.battle.log.shift();
}

// Damage with animation flash
function dealDamage(target, base, defVal, critChance=0.05, isBoss=false) {
  const red=Math.max(1,base-Math.floor(defVal*(isBoss?0.4:0.5)));
  const crit=Math.random()<critChance;
  const dmg=Math.max(1,Math.round(red*(0.85+Math.random()*0.3)*(crit?1.65:1)));
  target.hp=Math.max(0,target.hp-dmg);
  target.flashTimer=8;
  spawnFloatDmg(dmg, crit, target.isEnemy);
  return {dmg,crit};
}

function spawnFloatDmg(dmg, crit, onEnemy) {
  const arena=document.getElementById('arena');
  const el=document.createElement('div');
  el.className='fdmg'+(crit?' crit-flash':'');
  el.textContent=(crit?'★ ':'')+(onEnemy?'-':'-')+dmg;
  el.style.cssText=onEnemy
    ?`right:${20+Math.random()*50}px;top:${10+Math.random()*40}px`
    :`left:${10+Math.random()*120}px;top:${10+Math.random()*40}px`;
  arena.appendChild(el);
  setTimeout(()=>el.remove(), 800);
}

window.__battleAction = function(type) {
  if(!G.battle||G.battle.over||G.battle.actionLocked) return;
  const {fighters,turn,enemy}=G.battle;
  const actor=fighters[turn];
  if(!actor||!actor.isPlayer) return;

  G.battle.actionLocked=true;

  if(type==='attack'){
    const {dmg,crit}=dealDamage(enemy,actor.atkBasic,enemy.def,actor.crit);
    actor.mp=Math.min(actor.maxMp,actor.mp+2);
    bLog(`${actor.name} attacks — ${dmg} dmg${crit?' CRIT!':''}`,crit?'log-crit':'log-normal');
  } else if(type==='skill'){
    if(actor.mp<3){G.battle.actionLocked=false;return;}
    actor.mp-=3;
    const bonus=hasItem('render_flame')&&enemy.tier>=1?1.15:1;
    const {dmg,crit}=dealDamage(enemy,Math.floor(actor.atkSkill*bonus),enemy.def,actor.crit+0.05);
    bLog(`${actor.name}: ${actor.sk1} — ${dmg}${crit?' CRIT!':''}!`,'log-em');
  } else if(type==='ult'){
    if(actor.mp<6){G.battle.actionLocked=false;return;}
    actor.mp-=6;
    const bonus=hasItem('render_flame')&&enemy.tier>=1?1.15:1;
    const {dmg,crit}=dealDamage(enemy,Math.floor(actor.atkUltimate*bonus),Math.floor(enemy.def*0.4),actor.crit+0.15);
    bLog(`${actor.name}: ${actor.sk2} — ${dmg}${crit?' CRIT!!':'!!!'}`,'log-big');
  } else if(type==='potion'){
    if(!G.save.inventory.potion){G.battle.actionLocked=false;return;}
    G.save.inventory.potion--;
    const tgt=G.party.filter(n=>n.alive).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
    if(tgt){const h=Math.floor(tgt.maxHp*0.35);tgt.hp=Math.min(tgt.maxHp,tgt.hp+h);bLog(`Potion → ${tgt.name} +${h}HP`);}
  }

  // Sync fighter HP
  const pf=fighters.find(f=>f.isPlayer&&f.id===actor.id);
  if(pf){pf.mp=actor.mp;pf.hp=actor.hp;}

  setTimeout(()=>{
    G.battle.actionLocked=false;
    if(checkBattleEnd()) return;
    nextTurn();
  }, 400);
  renderBattle();
};

function checkEnemyTurn() {
  if(!G.battle||G.battle.over) return;
  const cur=G.battle.fighters[G.battle.turn];
  if(cur&&cur.isEnemy) {
    G.battle.actionLocked=true;
    renderBattle();
    setTimeout(enemyAct, 900);
  }
}

function enemyAct() {
  if(!G.battle||G.battle.over) return;
  const {enemy,fighters}=G.battle;
  const alive=G.party.filter(n=>n.alive);
  if(!alive.length) return;
  const tgt=alive.sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];

  // Pick move
  const move=enemy.moves[Math.floor(Math.random()*enemy.moves.length)];
  const heavy=Math.random()<0.25;
  const atkVal=heavy?Math.round(enemy.atk*1.6):enemy.atk;
  const pf=fighters.find(f=>f.isPlayer&&f.id===tgt.id);
  const {dmg,crit}=dealDamage(tgt,atkVal,tgt.def,0.06);
  // hp already updated in dealDamage
  // Re-sync
  if(pf){pf.hp=tgt.hp;}
  if(tgt.hp<=0) tgt.alive=false;
  bLog(`${enemy.name}: ${move} → ${tgt.name} ${dmg}${crit?' CRIT!':''}`,heavy||crit?'log-big':'log-normal');

  setTimeout(()=>{
    G.battle.actionLocked=false;
    if(checkBattleEnd()) return;
    nextTurn();
  }, 400);
  renderBattle();
}

function nextTurn() {
  if(!G.battle) return;
  const {fighters}=G.battle;
  let n=(G.battle.turn+1)%fighters.length;
  for(let i=0;i<fighters.length;i++){
    const f=fighters[n];
    if(f.isEnemy||(f.isPlayer&&f.alive)) break;
    n=(n+1)%fighters.length;
  }
  if(n<=G.battle.turn) G.battle.round++;
  G.battle.turn=n;

  // Decay flash timers
  fighters.forEach(f=>{if(f.flashTimer>0)f.flashTimer--;});
  G.battle.enemy.flashTimer=Math.max(0,(G.battle.enemy.flashTimer||0)-1);

  renderBattle();
  setTimeout(checkEnemyTurn, 100);
}

function checkBattleEnd() {
  if(!G.battle) return false;
  const {enemy}=G.battle;
  if(enemy.hp<=0){
    endBattle('victory');
    return true;
  }
  if(!G.party.some(n=>n.alive)){
    endBattle('defeat');
    return true;
  }
  return false;
}

function endBattle(result) {
  G.battle.over=true;
  G.battle.result=result;
  const {enemy}=G.battle;

  if(result==='victory'){
    const gold=Math.round(12+Math.random()*18+enemy.tier*8);
    G.save.gold+=gold;
    G.save.battlesWon++;
    bLog(`${enemy.name} defeated! +${gold}G`,'log-big');
    addJournal(`Defeated ${enemy.name} — +${gold}G`);

    // Item drops
    if(enemy.dropItem && Math.random()<(enemy.dropChance||0.3)){
      addItem(enemy.dropItem, 1);
      bLog(`Dropped: ${ITEMS[enemy.dropItem]?.name||enemy.dropItem}`,'log-em');
    }

    // Quest drops
    if(enemy.questDrop){
      const {questId,stepId}=enemy.questDrop;
      completeQuestStep(questId, stepId, 1);
    }

    // Post-battle partial heal
    G.party.filter(n=>n.alive).forEach(n=>{
      n.hp=Math.min(n.maxHp,n.hp+Math.floor(n.maxHp*0.1));
      n.mp=Math.min(n.maxMp,n.mp+Math.floor(n.maxMp*0.2));
    });
    G.party.filter(n=>!n.alive).forEach(n=>{
      n.alive=true;
      n.hp=Math.max(1,Math.floor(n.maxHp*0.05));
    });

    // Final boss special
    if(enemy.finalBoss){
      setTimeout(()=>{
        G.battle=null;
        document.getElementById('battle').classList.add('hidden');
        showEnding();
      }, 1500);
      return;
    }

    setTimeout(showBattleResult, 600);
  } else {
    bLog('All Normies fell.','log-big');
    G.party.forEach(n=>{n.alive=true;n.hp=Math.max(1,Math.floor(n.maxHp*0.08));});
    setTimeout(showBattleResult, 600);
  }
  renderBattle();
  renderHUD();
}

function showBattleResult() {
  document.getElementById('bat-main').classList.add('hidden');
  document.getElementById('bat-result').classList.remove('hidden');
  const res=G.battle.result;
  document.getElementById('bat-result-title').textContent=res==='victory'?'VICTORY':'DEFEATED';
  document.getElementById('bat-result-sub').textContent=
    res==='victory'?`${G.battle.enemy.name} destroyed.`:`Normies fell. Rendered back at low HP.`;
  document.getElementById('bat-result-gold').textContent=
    res==='victory'?`+${Math.round(12+G.battle.enemy.tier*8)}G`:'';
  renderHUD();
}

// ═══════════════════════════════════════════════════════════
// INVENTORY / JOURNAL MENU
// ═══════════════════════════════════════════════════════════
function handleMenuKey() {
  if(!G.menuPressed) return;
  G.menuPressed=false;
  if(G.battle||G.dlg) return;
  if(G.menu) { closeMenu(); return; }
  openMenu('inventory');
}

function openMenu(tab) {
  G.menu=tab;
  document.getElementById('menu-overlay').classList.remove('hidden');
  renderMenuTab(tab);
  document.querySelectorAll('.menu-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab===tab);
  });
}

function closeMenu() {
  G.menu=null;
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('shop').classList.add('hidden');
}

function renderMenuTab(tab) {
  // Show/hide all content panels
  const panels = { inventory:'menu-inv', quests:'menu-quests', party:'menu-party', journal:'menu-journal' };
  Object.values(panels).forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
  const active=panels[tab];
  if(active) { const el=document.getElementById(active); if(el) el.style.display='block'; }

  if(tab==='inventory') renderInventory();
  else if(tab==='journal') renderJournal();
  else if(tab==='party') renderPartyStatus();
  else if(tab==='quests') renderQuests();
}

function renderInventory() {
  const el=document.getElementById('menu-inv'); el.innerHTML='';
  let hasAny=false;
  Object.entries(G.save.inventory).forEach(([id,count])=>{
    if(!count) return; hasAny=true;
    const item=ITEMS[id]; if(!item) return;
    const row=document.createElement('div'); row.className='inv-row';
    row.innerHTML=`<span class="inv-icon">${item.icon}</span>
      <div class="inv-info">
        <div class="inv-name">${item.name} ×${count}</div>
        <div class="inv-desc">${item.desc}</div>
        ${item.passive?`<div class="inv-passive">◉ ${item.passive}</div>`:''}
      </div>`;
    if(item.use && !item.questItem) {
      const btn=document.createElement('button');
      btn.className='btn-use'; btn.textContent='Use';
      btn.onclick=()=>{
        const msg=item.use(G.party);
        if(msg){
          G.save.inventory[id]=Math.max(0,count-1);
          showItemNotif(msg); renderHUD(); renderInventory();
        }
      };
      row.appendChild(btn);
    }
    el.appendChild(row);
  });
  if(!hasAny) el.innerHTML='<div class="inv-empty">Your bag is empty.</div>';
  document.getElementById('menu-gold').textContent=`◆ ${G.save.gold} Gold`;
}

function renderJournal() {
  const el=document.getElementById('menu-journal'); el.innerHTML='';
  if(!G.save.journal.length){
    el.innerHTML='<div class="journal-empty">No entries yet. Your story is just beginning.</div>';
    return;
  }
  G.save.journal.forEach(entry=>{
    const d=document.createElement('div'); d.className='journal-entry';
    d.textContent=entry; el.appendChild(d);
  });
}

function renderPartyStatus() {
  const el=document.getElementById('menu-party'); el.innerHTML='';
  G.party.forEach(n=>{
    const card=document.createElement('div'); card.className='party-card';
    const bsprite=G.battleSprites[n.id];
    let imgHtml='';
    if(bsprite){
      const c2=document.createElement('canvas');c2.width=40;c2.height=40;
      const c2x=c2.getContext('2d');c2x.imageSmoothingEnabled=false;
      c2x.drawImage(bsprite,0,0,40,40);
      imgHtml=c2.outerHTML;
    }
    card.innerHTML=`${imgHtml}
      <div class="pc-info">
        <div class="pc-name">${n.name} <span class="pc-type">${n.type}</span></div>
        <div class="pc-level">Lv${n.lv} · ${n.px}px · ${n.expression}</div>
        <div class="pc-acc">${n.accessory!=='No Accessories'?n.accessory:'No Accessory'}</div>
        <div class="pc-stats">HP ${n.hp}/${n.maxHp} · MP ${n.mp}/${n.maxMp} · DEF ${n.def} · SPD ${n.spd} · CRIT ${Math.round(n.crit*100)}%</div>
        <div class="pc-moves">${n.sk1} (${n.atkSkill}dmg) · ${n.sk2} (${n.atkUltimate}dmg)</div>
      </div>`;
    el.appendChild(card);
  });
}

function renderQuests() {
  const el=document.getElementById('menu-quests'); el.innerHTML='';
  const active=G.save.activeQuests;
  const done=G.save.completedQuests;

  if(active.length){
    const h=document.createElement('div'); h.className='q-section-title'; h.textContent='ACTIVE QUESTS';
    el.appendChild(h);
    active.forEach(qid=>{
      const qs=G.save.quests[qid]; const qdef=QUESTS[qid]; if(!qs||!qdef) return;
      const div=document.createElement('div'); div.className='q-entry active';
      div.innerHTML=`<div class="q-name">${qdef.name}</div>
        <div class="q-desc">${qdef.desc}</div>
        <div class="q-lore">${qdef.lore}</div>
        <div class="q-steps">${qs.steps.map(s=>`${s.done?'■':'□'} ${s.text}`).join('<br>')}</div>`;
      el.appendChild(div);
    });
  }

  if(done.length){
    const h=document.createElement('div'); h.className='q-section-title'; h.textContent='COMPLETED';
    el.appendChild(h);
    done.forEach(qid=>{
      const qdef=QUESTS[qid]; if(!qdef) return;
      const div=document.createElement('div'); div.className='q-entry done';
      div.innerHTML=`<div class="q-name">■ ${qdef.name}</div>`;
      el.appendChild(div);
    });
  }

  if(!active.length&&!done.length)
    el.innerHTML='<div class="q-empty">No quests yet.</div>';
}

// ═══════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════
function render(dt) {
  if (!ctx || !G.mapData) return;
  tickTiles(dt);

  const { tiles, w, h } = G.mapData;

  // Smooth camera
  const tcx=Math.max(0,Math.min(G.px*TS+TS/2-W/2, w*TS-W));
  const tcy=Math.max(0,Math.min(G.py*TS+TS/2-H/2, h*TS-H));
  G.camX+=(tcx-G.camX)*0.16;
  G.camY+=(tcy-G.camY)*0.16;
  const ox=Math.round(G.camX), oy=Math.round(G.camY);

  // Clear
  ctx.fillStyle='#e3e5e4';
  ctx.fillRect(0,0,W,H);
  ctx.imageSmoothingEnabled=false;

  // Tiles
  const vtx=Math.max(0,Math.floor(ox/TS)-1);
  const vty=Math.max(0,Math.floor(oy/TS)-1);
  const vtw=Math.ceil(W/TS)+3, vth=Math.ceil(H/TS)+3;
  for(let ty=vty;ty<Math.min(vty+vth,h);ty++){
    for(let tx=vtx;tx<Math.min(vtx+vtw,w);tx++){
      const tile=getTile(tiles[ty][tx]);
      const sx=tx*TS-ox, sy=ty*TS-oy;
      if(tile) ctx.drawImage(tile,sx,sy,TS,TS);
      else{
        // Fallback color
        const t=tiles[ty][tx];
        ctx.fillStyle=t===T.VOID?'#32333a':t===T.DARK_GRASS?'#6a6b6a':'#c8c9c8';
        ctx.fillRect(sx,sy,TS,TS);
      }
    }
  }

  // NPC sprites
  NPC_DEFS.filter(n=>n.mapId===G.mapId).forEach(npc=>{
    const sx=npc.x*TS-ox, sy=npc.y*TS-oy;
    if(sx<-32||sy<-40||sx>W+32||sy>H+40) return;
    const spr=G.npcSprites[npc.id];
    if(spr){
      ctx.imageSmoothingEnabled=false;
      // Bob
      const bob=Math.sin(Date.now()*0.003+npc.id.charCodeAt(0)*0.7)*1.5;
      ctx.drawImage(spr, sx, sy+bob-4, spr.width, spr.height);
      // Name tag
      ctx.font='bold 7px monospace';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillStyle='rgba(0,0,0,0.65)';
      const tw=ctx.measureText(npc.name).width+6;
      ctx.fillRect(sx+TS/2-tw/2-1, sy-15, tw+2, 11);
      ctx.fillStyle='#e3e5e4';
      ctx.fillText(npc.name, sx+TS/2, sy-4);
    } else {
      // Placeholder dot
      ctx.fillStyle='#48494b'; ctx.fillRect(sx+4,sy+2,8,10);
    }
  });

  // Player
  const psx=G.px*TS-ox, psy=G.py*TS-oy;
  if(G.playerSprite){
    ctx.imageSmoothingEnabled=false;
    const sp=G.playerSprite;
    // Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(psx+TS/2,psy+TS-1,6,2,0,0,Math.PI*2); ctx.fill();
    ctx.drawImage(sp.canvas, psx+TS/2-sp.width/2, psy+TS-sp.height);
  } else {
    ctx.fillStyle='#48494b';
    ctx.fillRect(psx+4,psy,8,12);
    ctx.fillStyle='#e3e5e4';
    ctx.fillRect(psx+5,psy+2,2,2); ctx.fillRect(psx+8,psy+2,2,2);
  }

  // Zone ambience vignette
  drawVignette();

  // Fade overlay
  if(G.fadeAlpha>0){
    ctx.fillStyle=`rgba(0,0,0,${G.fadeAlpha})`;
    ctx.fillRect(0,0,W,H);
  }

  // Notifications
  drawNotifications();

  // HUD overlay (quest tracker)
  drawQuestTracker();
}

function drawVignette() {
  const mapId=G.mapId;
  let col='rgba(0,0,0,0.06)';
  if(mapId==='cave')      col='rgba(0,0,0,0.35)';
  if(mapId==='void_lands') col='rgba(0,0,0,0.45)';
  if(mapId==='citadel')   col='rgba(0,0,0,0.50)';
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.8);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,col);
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}

function drawNotifications() {
  let y=60;
  if(G.questNotif){
    G.questNotif.timer--;
    if(G.questNotif.timer>0){
      drawNotif(G.questNotif.text, y, G.questNotif.timer);
    } else G.questNotif=null;
    y+=28;
  }
  if(G.itemNotif){
    G.itemNotif.timer--;
    if(G.itemNotif.timer>0){
      drawNotif(G.itemNotif.text, y, G.itemNotif.timer);
    } else G.itemNotif=null;
  }
}

function drawNotif(text, y, timer) {
  const alpha=Math.min(1, timer/30);
  const tw=ctx.measureText(text).width+24;
  ctx.font='bold 11px monospace';
  const nx=W/2-tw/2;
  ctx.fillStyle=`rgba(72,73,75,${alpha*0.9})`;
  ctx.fillRect(nx,y,tw,20);
  ctx.fillStyle=`rgba(227,229,228,${alpha})`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text, W/2, y+10);
}

function drawQuestTracker() {
  if(!G.save.activeQuests.length) return;
  const qid=G.save.activeQuests[0];
  const qs=G.save.quests[qid]; const qdef=QUESTS[qid];
  if(!qs||!qdef) return;
  const nextStep=qs.steps.find(s=>!s.done);
  if(!nextStep) return;

  ctx.font='9px monospace';
  ctx.textAlign='right'; ctx.textBaseline='top';
  const label=`◉ ${nextStep.text}`;
  const tw=ctx.measureText(label).width+12;
  ctx.fillStyle='rgba(72,73,75,0.75)';
  ctx.fillRect(W-tw-6,6,tw+6,18);
  ctx.fillStyle='#e3e5e4';
  ctx.fillText(label, W-8, 11);
}

// ═══════════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════════
function renderHUD() {
  // Map name
  document.getElementById('zone-name').textContent = MAPS[G.mapId]?.name||G.mapId;
  document.getElementById('step-count').textContent = G.save.steps+' steps';
  document.getElementById('hud-gold').textContent = G.save.gold;
  document.getElementById('hud-pot').textContent = '⬜×'+(G.save.inventory.potion||0);

  // Lead party member only
  const lead=G.party[0];
  if(!lead) return;
  const hpPct=Math.max(0,lead.hp/lead.maxHp*100);
  const mpPct=Math.max(0,lead.mp/lead.maxMp*100);
  document.getElementById('hud-lead-name').textContent=lead.name;
  document.getElementById('hud-lead-type').textContent=lead.type+' #'+lead.id;
  document.getElementById('hud-hp-bar').style.width=hpPct+'%';
  document.getElementById('hud-mp-bar').style.width=mpPct+'%';
  document.getElementById('hud-hp-val').textContent=lead.hp+'/'+lead.maxHp;
}

// ═══════════════════════════════════════════════════════════
// ENDING
// ═══════════════════════════════════════════════════════════
function showEnding() {
  showScreen('ending');
  document.getElementById('ending-normie-id').textContent='#'+(G.party[0]?.id||'0001');
  document.getElementById('ending-battles').textContent=G.save.battlesWon;
  document.getElementById('ending-steps').textContent=G.save.steps;
  document.getElementById('ending-gold').textContent=G.save.gold;
}

// ═══════════════════════════════════════════════════════════
// TITLE SCREEN LOGO
// ═══════════════════════════════════════════════════════════
function drawTitleLogo() {
  const c=document.getElementById('logo-canvas');
  if(!c) return;
  const ctx=c.getContext('2d');
  c.width=240; c.height=80;
  ctx.fillStyle='#e3e5e4'; ctx.fillRect(0,0,240,80);
  // Draw THE PIXEL WAR title in pixel font
  ctx.fillStyle='#48494b';
  // Large pixel letters (simplified)
  const letters='PIXEL WAR';
  for(let i=0;i<letters.length;i++){
    const lx=10+i*26, ly=20;
    if(letters[i]===' ') continue;
    drawPixelLetter(ctx, letters[i], lx, ly, 3);
  }
  // Subtitle
  ctx.font='7px monospace'; ctx.textAlign='center';
  ctx.fillText('A NORMIES ADVENTURE', 120, 72);
}

function drawPixelLetter(ctx, ch, x, y, s) {
  const glyphs = {
    'P':[[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
    'I':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'X':[[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
    'E':[[1,1,0],[1,0,0],[1,1,0],[1,0,0],[1,1,0]],
    'L':[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'W':[[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
    'A':[[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'R':[[1,1,0],[1,0,1],[1,1,0],[1,1,0],[1,0,1]],
  };
  const g=glyphs[ch]||glyphs['P'];
  g.forEach((row,ry)=>row.forEach((on,rx)=>{
    if(on){ ctx.fillRect(x+rx*s, y+ry*s, s,s); }
  }));
}

// ═══════════════════════════════════════════════════════════
// INTRO / CUTSCENE
// ═══════════════════════════════════════════════════════════
function showIntro() {
  const lines = LORE.intro;
  let idx=0;
  showScreen('intro'); // hides all other screens first

  const textEl=document.getElementById('intro-text');
  const pageEl=document.getElementById('intro-page');

  function showLine(){
    textEl.textContent=lines[idx];
    pageEl.textContent=`${idx+1} / ${lines.length}`;
  }
  showLine();

  document.getElementById('btn-intro-next').onclick=()=>{
    idx++;
    if(idx>=lines.length){
      showScreen('party');
      renderSlots(); renderGrid();
    } else showLine();
  };
  document.getElementById('btn-intro-skip').onclick=()=>{
    showScreen('party');
    renderSlots(); renderGrid();
  };
}

// ═══════════════════════════════════════════════════════════
// PARTY SELECT
// ═══════════════════════════════════════════════════════════
function renderGrid() {
  const grid=document.getElementById('normie-grid');
  document.getElementById('col-count').textContent=G.collection.length?`(${G.collection.length})`:'';
  if(!G.collection.length){
    grid.innerHTML='<div class="grid-loading">Loading Normies…</div>';
    return;
  }
  grid.innerHTML='';
  G.collection.forEach(n=>{
    const sel=G.party.some(p=>p.id===n.id);
    const card=document.createElement('div'); card.className='ncard'+(sel?' selected':'');
    const bsp=G.battleSprites[n.id];
    if(bsp){
      const cv=document.createElement('canvas');cv.width=40;cv.height=40;
      const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;cx.drawImage(bsp,0,0,40,40);
      card.appendChild(cv);
    } else {
      const img=document.createElement('div');
      img.style.cssText='width:40px;height:40px;background:#ccc;display:flex;align-items:center;justify-content:center;font-size:9px;color:#666';
      img.textContent='#'+n.id; card.appendChild(img);
    }
    card.innerHTML+=`<div class="ncard-id">#${n.id}</div>
      <div class="ncard-type">${n.type}</div>
      <div class="ncard-stat">HP ${n.maxHp} SPD ${n.spd}</div>
      <div class="ncard-expr">${n.expression}</div>`;
    if(!sel) card.onclick=()=>{
      if(G.party.length>=5)return;
      G.party.push({...n});
      renderSlots(); renderGrid();
    };
    grid.appendChild(card);
  });
}

function renderSlots() {
  const cont=document.getElementById('party-slots'); cont.innerHTML='';
  document.getElementById('party-count').textContent=`${G.party.length} / 5`;
  document.getElementById('btn-start').disabled=G.party.length===0;
  for(let i=0;i<5;i++){
    const n=G.party[i], sl=document.createElement('div');
    sl.className='pslot '+(n?'filled':'empty');
    if(n){
      const bsp=G.battleSprites[n.id];
      if(bsp){
        const cv=document.createElement('canvas');cv.width=32;cv.height=32;
        const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;cx.drawImage(bsp,0,0,32,32);
        sl.appendChild(cv);
      }
      sl.innerHTML+=`<div class="pslot-name">#${n.id}</div><div class="pslot-type">${n.type}</div>`;
      sl.onclick=()=>{G.party.splice(i,1);renderSlots();renderGrid();};
    } else {
      sl.innerHTML=`<div class="pslot-empty">${i+1}</div>`;
    }
    cont.appendChild(sl);
  }
}

// ═══════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════
function gameLoop(ts=0) {
  const dt=Math.min(ts-lastT,50); lastT=ts;

  if(G.screen==='game'){
    updateFade(dt);
    if(!G.battle && !G.menu && !G.dlg){
      handleMovement(dt);
    }
    handleInteract();
    handleMenuKey();

    // Decay flash in battle
    if(G.battle){
      if(G.battle.enemy.flashTimer>0) G.battle.enemy.flashTimer--;
      G.battle.fighters?.forEach(f=>{if(f.flashTimer>0)f.flashTimer--;});
    }
    render(dt);
  }

  raf=requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  G.screen=id;
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  drawTitleLogo();
  initCanvas();
  initInput();
  initQuestSave();
  startQuest('prologue');

  // Detect wallets on load and update button label
  function refreshWalletBtn() {
    const btn=document.getElementById('btn-connect');
    const wallets=detectWallets();
    if(wallets.length===0){
      btn.textContent='No Wallet Found';
      btn.title='Install MetaMask, Coinbase Wallet, or another Web3 wallet';
    } else {
      btn.textContent=`⬜ Connect ${wallets[0].name}`;
    }
  }
  refreshWalletBtn();
  // Re-check after a tick (wallets may inject late)
  setTimeout(refreshWalletBtn, 800);

  // Buttons
  document.getElementById('btn-connect').onclick=async()=>{
    const btn=document.getElementById('btn-connect');
    const wallets=detectWallets();
    if(wallets.length===0){
      // No wallet installed — show helpful message
      showWalletHelp();
      return;
    }
    // If multiple wallets, show picker; otherwise connect directly
    if(wallets.length>1){
      showWalletPicker(wallets, async(walletId)=>{
        await doConnect(walletId);
      });
    } else {
      await doConnect(wallets[0].id);
    }
  };

  async function doConnect(walletId) {
    const btn=document.getElementById('btn-connect');
    btn.disabled=true; btn.textContent='Connecting…';
    try{
      const {provider,address,walletName}=await connectWallet(walletId);
      G.demo=false;
      document.getElementById('wallet-addr').textContent=
        `${walletName}: ${address.slice(0,6)}…${address.slice(-4)}`;
      btn.textContent='Loading NFTs…';
      G.collection=await loadWalletNormies(address,provider,col=>{
        G.collection=col; col.forEach(buildBattleSprite); renderGrid();
      });
      G.collection.forEach(buildBattleSprite);
      if(G.collection.length===0){
        // No Normies — offer demo
        btn.textContent='No Normies Found';
        btn.disabled=false;
        document.getElementById('wallet-addr').textContent+=
          ' · No Normies found — try Demo Mode';
      } else {
        showIntro();
      }
    }catch(e){
      btn.disabled=false;
      refreshWalletBtn();
      if(e.message==='NO_WALLET') showWalletHelp();
      else if(e.code===4001) btn.textContent='Rejected — try again';
      else { btn.textContent='Failed — retry'; console.error(e); }
    }
  }

  function showWalletHelp() {
    const el=document.getElementById('wallet-help');
    if(el) el.style.display='block';
  }

  function showWalletPicker(wallets, cb) {
    const overlay=document.createElement('div');
    overlay.className='wallet-picker-overlay';
    overlay.innerHTML=`<div class="wallet-picker">
      <div class="wp-title">Choose Wallet</div>
      ${wallets.map(w=>`<button class="wp-btn btn-ghost" data-id="${w.id}">${w.name}</button>`).join('')}
      <button class="wp-cancel btn-back">Cancel</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.wp-btn').forEach(b=>{
      b.onclick=()=>{ overlay.remove(); cb(b.dataset.id); };
    });
    overlay.querySelector('.wp-cancel').onclick=()=>overlay.remove();
    overlay.onclick=(e)=>{ if(e.target===overlay) overlay.remove(); };
  }

  document.getElementById('btn-demo').onclick=async()=>{
    G.demo=true; G.collection=[];
    document.getElementById('demo-pill').classList.add('show');
    G.collection=await loadDemoNormies(col=>{
      G.collection=col; col.forEach(buildBattleSprite); renderGrid();
    });
    G.collection.forEach(buildBattleSprite);
    showIntro();
  };

  document.getElementById('btn-start').onclick=()=>{
    if(!G.party.length) return;
    startGame();
  };

  // Battle buttons
  document.getElementById('btn-atk').onclick  =()=>window.__battleAction('attack');
  document.getElementById('btn-skill').onclick =()=>window.__battleAction('skill');
  document.getElementById('btn-ult').onclick   =()=>window.__battleAction('ult');
  document.getElementById('btn-bpot').onclick  =()=>window.__battleAction('potion');
  document.getElementById('btn-bat-world').onclick=()=>{
    if(G.battle){ G.battle=null; document.getElementById('battle').classList.add('hidden'); renderHUD(); }
  };
  document.getElementById('btn-bat-party').onclick=()=>{
    G.battle=null; document.getElementById('battle').classList.add('hidden');
    G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
    if(raf){cancelAnimationFrame(raf);raf=null;}
    G.screen='party'; showScreen('party'); renderSlots(); renderGrid();
  };

  // Menu tabs
  document.querySelectorAll('.menu-tab').forEach(t=>{
    t.onclick=()=>{ renderMenuTab(t.dataset.tab); document.querySelectorAll('.menu-tab').forEach(x=>x.classList.toggle('active',x===t)); };
  });
  document.getElementById('btn-close-menu').onclick=closeMenu;
  document.getElementById('btn-close-shop').onclick=()=>document.getElementById('shop').classList.add('hidden');

  // Dialogue click
  document.getElementById('dialogue').addEventListener('click', advanceDialogue);

  // Back buttons
  document.getElementById('btn-back-title').onclick=()=>{
    if(raf){cancelAnimationFrame(raf);raf=null;}
    G.screen='title'; showScreen('title');
  };

  document.getElementById('btn-ending-play-again').onclick=()=>{
    document.getElementById('screen-ending').classList.remove('active');
    location.reload();
  };
});

function buildBattleSprite(n) {
  if(!G.battleSprites[n.id]) {
    G.battleSprites[n.id] = buildPartyBattleSprite(n.pixels);
  }
}

function startGame() {
  // Init world state
  G.save.gold=0; G.save.steps=0; G.save.battlesWon=0;
  G.save.inventory={potion:3};
  G.save.journal=['Chapter 1: The First Render — Your story begins.'];
  G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});

  // Build player sprite from lead Normie
  const lead=G.party[0];
  G.playerSprite=buildPlayerSprite(lead?.pixels, lead?.px);

  // Start in home map
  loadMap('home');
  G.camX=G.px*TS; G.camY=G.py*TS;

  // Show game screen & start loop
  showScreen('game');
  document.getElementById('screen-game').style.display='block'; // canvas needs block not flex
  G.screen='game';
  renderHUD();

  // Opening dialogue from Mom
  setTimeout(()=>{
    const mom=NPC_DEFS.find(n=>n.id==='mom');
    if(mom) openDialogue(mom.name, mom.lines, G.npcSprites['mom']);
  }, 800);

  if(raf) cancelAnimationFrame(raf);
  raf=requestAnimationFrame(gameLoop);
}
