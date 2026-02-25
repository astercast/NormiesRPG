// game.js — THE PIXEL WAR v5
// Multi-map • Walking animation • Quest system • Story-driven NPCs • Animated battles

import { fetchNormieMeta, fetchNormiePixels, makeDemoNormie, calcStats } from './normie-api.js';
import { connectWallet, loadWalletNormies, loadDemoNormies, detectWallets } from './wallet.js';
import { T, getTile, tickTiles, TILE_SIZE, tilesReady } from './tiles.js';
import { MAP_BUILDERS, isTileBlocked, MAP_SPAWN } from './mapgen.js';
import { QUESTS, ITEMS, NPC_DEFS, ENEMIES, MAPS, LORE } from './story.js';
import { buildNpcSprite, buildEnemySprite, buildPlayerSprite, buildPartyBattleSprite } from './sprites.js';

const TS  = TILE_SIZE;   // 16px native
const SCL = 4;           // 4× scale → 64px per tile
const TSS = TS * SCL;    // 64px rendered tile size

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
    quests: {}, activeQuests: [], completedQuests: [],
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
// PIXI RENDERER
// ═══════════════════════════════════════════════════════════
let pixiApp = null;
let W = 0, H = 0;
let raf = null, lastT = 0;

// PixiJS scene graph layers
let groundLayer    = null;   // floor tiles
let objectLayer    = null;   // trees, walls, roofs (overlap player)
let spriteLayer    = null;   // player + NPCs (Y-sorted)
let shadowLayer    = null;   // drop shadows under sprites
let lightLayer     = null;   // darkness mask + torch glow
let uiLayer        = null;   // notifications, quest tracker

// Tile texture cache
const tileTexCache = {};
// Sprite display object pools
const npcSprites   = {};    // npcId → PIXI.Sprite
let   playerPIXI   = null;  // PIXI.Sprite for player
let   shadowGfx    = null;  // PIXI.Graphics for drop shadows
let   lightGfx     = null;  // PIXI.Graphics for light mask
let   questText    = null;  // PIXI.Text quest tracker
let   notifText    = null;  // PIXI.Text notification
let   notifBg      = null;  // PIXI.Graphics notification bg
let   fadeRect     = null;  // PIXI.Graphics for map fade

// Zone colour-matrix tints
const ZONE_TINTS = {
  home:       [1.05, 1.0,  0.9,  0],   // warm indoor
  overworld:  [1.0,  1.02, 0.95, 0],   // subtle warm green
  town:       [1.02, 1.0,  1.0,  0],   // neutral
  cave:       [0.7,  0.8,  1.1,  0],   // cold blue-grey
  void_lands: [0.75, 0.7,  1.1,  0],   // sick purple tint
  citadel:    [0.6,  0.6,  1.15, 0],   // deep void blue
};
let colorFilter = null;

function initCanvas() {
  const container = document.getElementById('world-canvas');
  W = window.innerWidth;
  H = window.innerHeight;

  pixiApp = new PIXI.Application({
    width: W,
    height: H,
    backgroundColor: 0x1a1b1c,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  // Replace the plain canvas element with the pixi canvas
  container.parentNode.replaceChild(pixiApp.view, container);
  pixiApp.view.id = 'world-canvas';

  // Scene graph
  groundLayer  = new PIXI.Container();
  objectLayer  = new PIXI.Container();
  shadowLayer  = new PIXI.Container();
  spriteLayer  = new PIXI.Container();
  lightLayer   = new PIXI.Container();
  uiLayer      = new PIXI.Container();

  pixiApp.stage.addChild(groundLayer);
  pixiApp.stage.addChild(objectLayer);
  pixiApp.stage.addChild(shadowLayer);
  pixiApp.stage.addChild(spriteLayer);
  pixiApp.stage.addChild(lightLayer);
  pixiApp.stage.addChild(uiLayer);

  // Colour filter applied to world layers (not UI)
  colorFilter = new PIXI.ColorMatrixFilter();
  groundLayer.filters  = [colorFilter];
  objectLayer.filters  = [colorFilter];
  shadowLayer.filters  = [colorFilter];
  spriteLayer.filters  = [colorFilter];

  // Persistent graphics objects
  lightGfx  = new PIXI.Graphics();
  lightLayer.addChild(lightGfx);

  fadeRect = new PIXI.Graphics();
  fadeRect.beginFill(0x000000, 1);
  fadeRect.drawRect(0, 0, W, H);
  fadeRect.endFill();
  fadeRect.alpha = 0;
  uiLayer.addChild(fadeRect);

  // Notification text + bg
  notifBg   = new PIXI.Graphics();
  notifText = new PIXI.Text('', {
    fontFamily: 'Space Mono, monospace',
    fontSize: 11,
    fontWeight: 'bold',
    fill: 0xe3e5e4,
  });
  notifText.anchor.set(0.5, 0.5);
  uiLayer.addChild(notifBg);
  uiLayer.addChild(notifText);

  // Quest tracker text
  questText = new PIXI.Text('', {
    fontFamily: 'Space Mono, monospace',
    fontSize: 9,
    fill: 0xe3e5e4,
  });
  questText.anchor.set(1, 0);
  uiLayer.addChild(questText);

  // Shadows layer graphics
  shadowGfx = new PIXI.Graphics();
  shadowLayer.addChild(shadowGfx);

  window.addEventListener('resize', resizeCanvas);
  pixiApp.ticker.stop(); // we drive the loop ourselves
}

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  if (pixiApp) {
    pixiApp.renderer.resize(W, H);
    if (fadeRect) { fadeRect.clear(); fadeRect.beginFill(0x000000,1); fadeRect.drawRect(0,0,W,H); fadeRect.endFill(); }
  }
}

// Convert a canvas element (from tile_data / sprites) to a PIXI Texture
function canvasToTexture(canvas) {
  return PIXI.Texture.from(canvas);
}

// Animated tile IDs that change frame each tick
const ANIM_TILES = new Set([16, 19]); // WATER=16, VOID=19

// Get or create a PIXI Texture for a tile id
function getPixiTile(tileId) {
  const img = getTile(tileId);
  if (!img) return null;
  // Animated tiles: re-create texture from current frame canvas
  if (ANIM_TILES.has(tileId)) {
    const tex = PIXI.Texture.from(img);
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    return tex;
  }
  // Static tiles: cache by source
  const key = img.src || img.currentSrc || (img.tagName + tileId);
  if (tileTexCache[key]) return tileTexCache[key];
  const tex = PIXI.Texture.from(img);
  tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
  tileTexCache[key] = tex;
  return tex;
}

// Tiles that should render ABOVE the player (overlap layer)
const OVERLAP_TILES = new Set([11,12,13,4,1,20,18]); // TREE,HOUSE_WALL,ROOF,BOOKSHELF,BED_WALL,WALL,CAVE_WALL

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

  // Clear PixiJS tile sprite pool so new map tiles are freshly laid out
  for (const key in tileSprites) {
    const e = tileSprites[key];
    if (e.ground) { groundLayer.removeChild(e.ground); e.ground.destroy(); }
    if (e.object) { objectLayer.removeChild(e.object); e.object.destroy(); }
    delete tileSprites[key];
  }
  // Clear NPC pixi sprites (they'll be recreated for the new map)
  for (const id in npcSprites) {
    const e = npcSprites[id];
    if (e.spr) spriteLayer.removeChild(e.spr);
    if (e.label) spriteLayer.removeChild(e.label);
    if (e.labelBg) spriteLayer.removeChild(e.labelBg);
    delete npcSprites[id];
  }

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

  // Home exits
  if (G.mapId === 'home') {
    if (tile === T.DOOR) {
      completeQuestStep('prologue', 'leave_home');
      fadeToMap('overworld', 16, 23);
      G.moveCooldown = 400;
      return;
    }
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
    const boost = (tile===T.DARK_GRASS||tile===T.VOID) ? 1.4 : 1.0;
    if (Math.random() < base*boost) {
      G.encounterCooldown = 22;
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
  ['btn-atk','btn-skill','btn-ult','btn-bpot','btn-flee'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.disabled=locked;
  });
  if(cur){
    document.getElementById('btn-skill').disabled=locked||cur.mp<3;
    document.getElementById('btn-ult').disabled=locked||cur.mp<6;
    document.getElementById('btn-bpot').disabled=locked||(G.save.inventory.potion||0)<=0;
    // Flee disabled for bosses
    const fleeBtn=document.getElementById('btn-flee');
    if(fleeBtn) fleeBtn.disabled=locked||(G.battle.enemy?.tier>=4);
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

  if(type==='flee'){
    // Flee chance: 65% base, reduced by enemy tier, impossible for bosses
    const isBoss = enemy.tier >= 4;
    if(isBoss){
      bLog(`${enemy.name} won't let you escape!`,'log-big');
      G.battle.actionLocked=false;
      renderBattle();
      setTimeout(()=>{ nextTurn(); }, 600);
      return;
    }
    const fleeChance = Math.max(0.25, 0.70 - (enemy.tier||0)*0.1);
    if(Math.random() < fleeChance){
      bLog(`Got away safely!`,'log-em');
      G.encounterCooldown = 18;
      setTimeout(()=>{
        G.battle=null;
        document.getElementById('battle').classList.add('hidden');
        renderHUD();
      }, 800);
    } else {
      bLog(`Can't escape!`,'log-big');
      G.battle.actionLocked=false;
      renderBattle();
      setTimeout(()=>{
        G.battle.actionLocked=false;
        if(checkBattleEnd()) return;
        nextTurn();
      }, 700);
    }
    return;
  }

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
// LIGHTING SYSTEM
// ═══════════════════════════════════════════════════════════
let lightCanvas = null, lightCtx2d = null, lightSprite = null;

function drawLighting() {
  const cx = W/2, cy = H/2;

  // Lazy-create the offscreen light canvas
  if (!lightCanvas || lightCanvas.width !== W || lightCanvas.height !== H) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width  = W;
    lightCanvas.height = H;
    lightCtx2d = lightCanvas.getContext('2d');

    if (lightSprite) {
      lightLayer.removeChild(lightSprite);
      lightSprite.destroy(true);
    }
    const tex = PIXI.Texture.from(lightCanvas);
    lightSprite = new PIXI.Sprite(tex);
    lightSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    lightLayer.addChild(lightSprite);
  }

  lightCtx2d.clearRect(0, 0, W, H);

  if (G.mapId === 'cave' || G.mapId === 'citadel') {
    const flicker = 1 + Math.sin(Date.now()*0.007)*0.035 + Math.sin(Date.now()*0.021)*0.018;
    const radius  = TSS * 4.0 * flicker;

    // Fill entire canvas near-black
    lightCtx2d.fillStyle = 'rgba(0,0,0,0.94)';
    lightCtx2d.fillRect(0, 0, W, H);

    // Punch radial torch light using destination-out composite
    lightCtx2d.save();
    lightCtx2d.globalCompositeOperation = 'destination-out';
    const grad = lightCtx2d.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0,   'rgba(0,0,0,0.97)');
    grad.addColorStop(0.35,'rgba(0,0,0,0.88)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
    lightCtx2d.fillStyle = grad;
    lightCtx2d.fillRect(0, 0, W, H);
    lightCtx2d.restore();

    // Warm amber tint on the bright center
    lightCtx2d.save();
    lightCtx2d.globalCompositeOperation = 'source-atop';
    const warmGrad = lightCtx2d.createRadialGradient(cx, cy, 0, cx, cy, radius*0.6);
    warmGrad.addColorStop(0,   'rgba(255,200,80,0.07)');
    warmGrad.addColorStop(1,   'rgba(255,200,80,0.0)');
    lightCtx2d.fillStyle = warmGrad;
    lightCtx2d.fillRect(0, 0, W, H);
    lightCtx2d.restore();

  } else if (G.mapId === 'void_lands') {
    const pulse  = 1 + Math.sin(Date.now()*0.004)*0.07;
    const radius = TSS * 5.8 * pulse;

    lightCtx2d.fillStyle = 'rgba(0,0,0,0.88)';
    lightCtx2d.fillRect(0, 0, W, H);

    lightCtx2d.save();
    lightCtx2d.globalCompositeOperation = 'destination-out';
    const grad = lightCtx2d.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0,   'rgba(0,0,0,0.90)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.60)');
    grad.addColorStop(0.85,'rgba(0,0,0,0.20)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
    lightCtx2d.fillStyle = grad;
    lightCtx2d.fillRect(0, 0, W, H);
    lightCtx2d.restore();

    // Sickly purple tint at edge
    lightCtx2d.save();
    lightCtx2d.globalCompositeOperation = 'source-atop';
    const edgeGrad = lightCtx2d.createRadialGradient(cx, cy, radius*0.3, cx, cy, radius);
    edgeGrad.addColorStop(0, 'rgba(80,0,160,0.0)');
    edgeGrad.addColorStop(1, 'rgba(80,0,160,0.12)');
    lightCtx2d.fillStyle = edgeGrad;
    lightCtx2d.fillRect(0, 0, W, H);
    lightCtx2d.restore();

  } else {
    // Overworld/home/town: soft vignette only
    const vigR = Math.max(W, H) * 0.8;
    lightCtx2d.fillStyle = 'rgba(0,0,0,0)';
    lightCtx2d.fillRect(0, 0, W, H);

    lightCtx2d.save();
    lightCtx2d.globalCompositeOperation = 'source-over';
    const vg = lightCtx2d.createRadialGradient(cx, cy, vigR*0.35, cx, cy, vigR);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.30)');
    lightCtx2d.fillStyle = vg;
    lightCtx2d.fillRect(0, 0, W, H);
    lightCtx2d.restore();
  }

  // Update the pixi sprite texture from the canvas
  if (lightSprite && lightSprite.texture) {
    lightSprite.texture.baseTexture.resource.source = lightCanvas;
    lightSprite.texture.baseTexture.update();
  }
}

// ═══════════════════════════════════════════════════════════
// PIXI RENDERING
// ═══════════════════════════════════════════════════════════

// Tile display object pool — reused across frames
const tileSprites = {}; // key "tx,ty" → {ground: Sprite, object: Sprite}

// Apply zone colour-matrix tint
function applyZoneTint(mapId) {
  const t = ZONE_TINTS[mapId] || ZONE_TINTS.overworld;
  colorFilter.matrix = [
    t[0],0,0,0,t[3],
    0,t[1],0,0,t[3],
    0,0,t[2],0,t[3],
    0,0,0,1,0,
  ];
}

// Update or create a tile sprite in the correct layer
function syncTileSprite(tx, ty, tileId, ox, oy) {
  const key = `${tx},${ty}`;
  const tex = getPixiTile(tileId);
  const isOverlap = OVERLAP_TILES.has(tileId);
  const layer = isOverlap ? objectLayer : groundLayer;

  if (!tileSprites[key]) {
    tileSprites[key] = { ground: null, object: null, lastId: -1, lastOverlap: null };
  }
  const entry = tileSprites[key];

  // For animated tiles, always update the texture (frame changes each tick)
  if (ANIM_TILES.has(tileId)) {
    const spr = isOverlap ? entry.object : entry.ground;
    if (spr) {
      const newTex = getPixiTile(tileId);
      if (newTex) spr.texture = newTex;
    }
  }

  // If tile type changed, tear down old sprite
  if (entry.lastId !== tileId) {
    if (entry.ground) { groundLayer.removeChild(entry.ground); entry.ground.destroy(); entry.ground = null; }
    if (entry.object) { objectLayer.removeChild(entry.object); entry.object.destroy(); entry.object = null; }
    if (tex) {
      const spr = new PIXI.Sprite(tex);
      spr.width = TSS; spr.height = TSS;
      spr.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      layer.addChild(spr);
      if (isOverlap) entry.object = spr; else entry.ground = spr;
    }
    entry.lastId = tileId;
  }

  const spr = isOverlap ? entry.object : entry.ground;
  if (spr) {
    spr.x = tx * TSS - ox;
    spr.y = ty * TSS - oy;
    spr.visible = true;
  }
}

function render(dt) {
  if (!pixiApp || !G.mapData) return;
  tickTiles(dt);

  const { tiles, w, h } = G.mapData;

  // Smooth camera
  const mapPxW = w*TSS, mapPxH = h*TSS;
  const tcx = Math.max(0, Math.min(G.px*TSS + TSS/2 - W/2, mapPxW - W));
  const tcy = Math.max(0, Math.min(G.py*TSS + TSS/2 - H/2, mapPxH - H));
  G.camX += (tcx - G.camX) * 0.14;
  G.camY += (tcy - G.camY) * 0.14;
  const ox = Math.round(G.camX), oy = Math.round(G.camY);

  // Background colour per zone
  const bgCol = (G.mapId==='cave'||G.mapId==='citadel') ? 0x242526
              : G.mapId==='void_lands' ? 0x1a1b1c : 0x9a9b9a;
  pixiApp.renderer.backgroundColor = bgCol;

  // Zone tint
  applyZoneTint(G.mapId);

  // Mark all existing tile sprites invisible, then re-show in-viewport ones
  for (const key in tileSprites) {
    const e = tileSprites[key];
    if (e.ground) e.ground.visible = false;
    if (e.object) e.object.visible = false;
  }

  const vtx = Math.max(0, Math.floor(ox/TSS) - 1);
  const vty = Math.max(0, Math.floor(oy/TSS) - 1);
  const vtw = Math.ceil(W/TSS) + 3;
  const vth = Math.ceil(H/TSS) + 3;

  for (let ty = vty; ty < Math.min(vty+vth, h); ty++) {
    for (let tx = vtx; tx < Math.min(vtx+vtw, w); tx++) {
      syncTileSprite(tx, ty, tiles[ty][tx], ox, oy);
    }
  }

  // ── Drop shadows ────────────────────────────────────────────
  shadowGfx.clear();

  // ── Player sprite ────────────────────────────────────────────
  const psx = G.px*TSS - ox;
  const psy = G.py*TSS - oy;
  const pdh = TSS * 1.7;
  const pdw = pdh * 0.6;

  if (G.playerSprite) {
    if (!playerPIXI) {
      const tex = PIXI.Texture.from(G.playerSprite.canvas);
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      playerPIXI = new PIXI.Sprite(tex);
      playerPIXI.anchor.set(0.5, 1);
      spriteLayer.addChild(playerPIXI);
    } else {
      playerPIXI.texture.update();
    }
    playerPIXI.x = psx + TSS/2;
    playerPIXI.y = psy + TSS;
    playerPIXI.width  = pdw;
    playerPIXI.height = pdh;
    playerPIXI.zIndex = G.py * 1000 + 500;

    // Drop shadow ellipse
    shadowGfx.beginFill(0x000000, 0.18);
    shadowGfx.drawEllipse(psx + TSS/2, psy + TSS - 4, pdw*0.38, 6);
    shadowGfx.endFill();
  }

  // ── NPC sprites ──────────────────────────────────────────────
  const mapNpcs = NPC_DEFS.filter(n => n.mapId === G.mapId);
  const activeNpcIds = new Set(mapNpcs.map(n => n.id));

  // Remove sprites for NPCs not on this map
  for (const id in npcSprites) {
    if (!activeNpcIds.has(id)) {
      spriteLayer.removeChild(npcSprites[id].spr);
      if (npcSprites[id].label) spriteLayer.removeChild(npcSprites[id].label);
      if (npcSprites[id].labelBg) spriteLayer.removeChild(npcSprites[id].labelBg);
      delete npcSprites[id];
    }
  }

  mapNpcs.forEach(npc => {
    const sx = npc.x*TSS - ox;
    const sy = npc.y*TSS - oy;
    if (sx < -128 || sy < -160 || sx > W+128 || sy > H+160) return;

    const bob = Math.sin(Date.now()*0.0025 + npc.id.charCodeAt(0)*0.7) * 3;
    const dh = TSS * 1.45, dw = dh * 0.62;

    const canvasSrc = G.npcSprites[npc.id];
    if (!canvasSrc) return;

    if (!npcSprites[npc.id]) {
      const tex = PIXI.Texture.from(canvasSrc);
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      const spr = new PIXI.Sprite(tex);
      spr.anchor.set(0.5, 1);

      // Name label background
      const labelBg = new PIXI.Graphics();
      const label = new PIXI.Text(npc.name, {
        fontFamily: 'Space Mono, monospace',
        fontSize: 10,
        fontWeight: 'bold',
        fill: 0xe3e5e4,
      });
      label.anchor.set(0.5, 1);

      spriteLayer.addChild(labelBg);
      spriteLayer.addChild(spr);
      spriteLayer.addChild(label);
      npcSprites[npc.id] = { spr, label, labelBg };
    }

    const entry = npcSprites[npc.id];
    entry.spr.x = sx + TSS/2;
    entry.spr.y = sy + TSS + bob;
    entry.spr.width  = dw;
    entry.spr.height = dh;
    entry.spr.zIndex = npc.y * 1000;

    const lx = sx + TSS/2;
    const ly = sy + TSS - dh + bob - 6;
    const lw = entry.label.width + 14;
    entry.label.x = lx;
    entry.label.y = ly;
    entry.label.zIndex = npc.y * 1000 + 1;

    entry.labelBg.clear();
    entry.labelBg.beginFill(0x1a1b1c, 0.82);
    entry.labelBg.drawRect(lx - lw/2, ly - 14, lw, 14);
    entry.labelBg.endFill();
    entry.labelBg.zIndex = npc.y * 1000 - 1;

    // Drop shadow for NPC
    shadowGfx.beginFill(0x000000, 0.13);
    shadowGfx.drawEllipse(sx + TSS/2, sy + TSS - 4, dw*0.38, 5);
    shadowGfx.endFill();
  });

  // Y-sort the sprite layer
  spriteLayer.sortableChildren = true;
  spriteLayer.sortChildren();

  // ── Dynamic lighting via radial gradient canvas texture ─────
  drawLighting();

  // ── Fade overlay ─────────────────────────────────────────────
  fadeRect.alpha = G.fadeAlpha;

  // ── Notifications ─────────────────────────────────────────────
  drawNotifications();
  drawQuestTracker();

  // Tick the PixiJS renderer manually
  pixiApp.renderer.render(pixiApp.stage);
}

function drawNotifications() {
  let activeNotif = null;
  let y = 60;

  if (G.questNotif) {
    G.questNotif.timer--;
    if (G.questNotif.timer > 0) activeNotif = { text: G.questNotif.text, timer: G.questNotif.timer, y };
    else G.questNotif = null;
    y += 30;
  }
  if (!activeNotif && G.itemNotif) {
    G.itemNotif.timer--;
    if (G.itemNotif.timer > 0) activeNotif = { text: G.itemNotif.text, timer: G.itemNotif.timer, y };
    else G.itemNotif = null;
  }

  if (activeNotif) {
    const alpha = Math.min(1, activeNotif.timer / 30);
    notifText.text = activeNotif.text;
    notifText.alpha = alpha;
    notifText.x = W/2;
    notifText.y = activeNotif.y + 10;
    const nw = notifText.width + 24;
    notifBg.clear();
    notifBg.beginFill(0x48494b, 0.9 * alpha);
    notifBg.drawRect(W/2 - nw/2, activeNotif.y, nw, 20);
    notifBg.endFill();
    notifText.visible = true;
    notifBg.visible = true;
  } else {
    notifText.visible = false;
    notifBg.visible = false;
  }
}

function drawQuestTracker() {
  if (!G.save.activeQuests.length) { questText.visible = false; return; }
  const qid = G.save.activeQuests[0];
  const qs = G.save.quests[qid]; const qdef = QUESTS[qid];
  if (!qs || !qdef) { questText.visible = false; return; }
  const nextStep = qs.steps.find(s => !s.done);
  if (!nextStep) { questText.visible = false; return; }

  questText.text = `◉ ${nextStep.text}`;
  questText.x = W - 8;
  questText.y = 8;
  questText.visible = true;
}

// ═══════════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════════
function renderHUD() {
  function set(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
  function css(id, prop, val) { const el=document.getElementById(id); if(el) el.style[prop]=val; }

  set('zone-name', MAPS[G.mapId]?.name||G.mapId);
  set('hud-gold', G.save.gold);
  set('hud-pot', '⬜×'+(G.save.inventory.potion||0));

  const lead=G.party[0];
  if(!lead) return;
  const hpPct=Math.max(0,lead.hp/lead.maxHp*100);
  const mpPct=Math.max(0,lead.mp/lead.maxMp*100);
  set('hud-lead-name', lead.name);
  set('hud-lead-type', lead.type+' #'+lead.id);
  css('hud-hp-bar', 'width', hpPct+'%');
  css('hud-mp-bar', 'width', mpPct+'%');
  set('hud-hp-val', lead.hp+'/'+lead.maxHp);
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
  const W=320, H=107;
  c.width=W; c.height=H;
  const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#e3e5e4'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#48494b';

  // "THE PIXEL WAR" — two lines, large pixel font
  // Line 1: "THE" small above
  const small = {
    'T':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'H':[[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'E':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  };
  'THE'.split('').forEach((ch,i)=>{
    const g=small[ch]||small['T'];
    g.forEach((row,ry)=>row.forEach((on,rx)=>{
      if(on) ctx.fillRect(14+i*14+rx*2, 8+ry*2, 2,2);
    }));
  });

  // Divider line under "THE"
  ctx.fillRect(14, 22, 32, 1);

  // Line 2: "PIXEL" big
  const BIG = {
    'P':[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
    'I':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'X':[[1,0,0,1],[1,0,0,1],[0,1,1,0],[1,0,0,1],[1,0,0,1]],
    'E':[[1,1,1,0],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,0]],
    'L':[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'W':[[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
    'A':[[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
    'R':[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,1,0,0],[1,0,1,0]],
  };
  const S=5; // pixel scale
  const words = [['P','I','X','E','L'],['W','A','R']];
  const wordWidths = words.map(w=>w.reduce((a,ch)=>a+(BIG[ch]?.[0]?.length||3)+1,0)-1);
  const totalW = wordWidths[0]*S + 16 + wordWidths[1]*S;
  let startX = Math.floor((W - totalW)/2);

  // Draw PIXEL
  let cx = startX;
  'PIXEL'.split('').forEach(ch=>{
    const g=BIG[ch];
    if(!g){cx+=4*S;return;}
    g.forEach((row,ry)=>row.forEach((on,rx)=>{
      if(on) ctx.fillRect(cx+rx*S, 30+ry*S, S,S);
    }));
    cx+=(g[0].length+1)*S;
  });

  // Draw WAR (slightly offset right with gap)
  cx += 16;
  'WAR'.split('').forEach(ch=>{
    const g=BIG[ch];
    if(!g){cx+=4*S;return;}
    g.forEach((row,ry)=>row.forEach((on,rx)=>{
      if(on) ctx.fillRect(cx+rx*S, 30+ry*S, S,S);
    }));
    cx+=(g[0].length+1)*S;
  });

  // Subtitle
  ctx.font='bold 10px monospace';
  ctx.textAlign='center';
  ctx.fillStyle='#8a8b8a';
  ctx.fillText('A  N O R M I E S  A D V E N T U R E', W/2, 97);
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
  const cc=document.getElementById('col-count');
  if(cc) cc.textContent=G.collection.length?`(${G.collection.length})`:'';
  if(!G.collection.length){
    grid.innerHTML='<div class="grid-loading">Loading Normies…</div>';
    return;
  }
  grid.innerHTML='';
  G.collection.forEach(n=>{
    const inParty=G.party.some(p=>p.id===n.id);
    const card=document.createElement('div');
    card.className='ncard'+(inParty?' in-party':'');
    const bsp=G.battleSprites[n.id];
    const cv=document.createElement('canvas'); cv.width=48; cv.height=48;
    const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false;
    if(bsp) cx.drawImage(bsp,0,0,48,48);
    else { cx.fillStyle='#e0e0de'; cx.fillRect(0,0,48,48); cx.fillStyle='#999'; cx.font='9px monospace'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('#'+n.id,24,24); }
    card.appendChild(cv);
    const id=document.createElement('div'); id.className='ncard-id'; id.textContent='#'+n.id;
    const ty=document.createElement('div'); ty.className='ncard-type'; ty.textContent=n.type;
    const st=document.createElement('div'); st.className='ncard-stat'; st.textContent=`HP ${n.maxHp} · SPD ${n.spd}`;
    const ex=document.createElement('div'); ex.className='ncard-expr'; ex.textContent=n.expression;
    card.append(id,ty,st,ex);
    if(!inParty) card.onclick=()=>{ if(G.party.length>=5)return; G.party.push({...n}); renderSlots(); renderGrid(); };
    grid.appendChild(card);
  });
}

function renderSlots() {
  const cont=document.getElementById('party-slots'); cont.innerHTML='';
  const pc=document.getElementById('party-count'); if(pc) pc.textContent=`${G.party.length} / 5`;
  const sb=document.getElementById('btn-start'); if(sb) sb.disabled=G.party.length===0;
  for(let i=0;i<5;i++){
    const n=G.party[i], sl=document.createElement('div');
    sl.className='pslot '+(n?'filled':'empty');
    if(n){
      const bsp=G.battleSprites[n.id];
      const cv=document.createElement('canvas'); cv.width=40; cv.height=40;
      const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false;
      if(bsp) cx.drawImage(bsp,0,0,40,40);
      sl.appendChild(cv);
      const info=document.createElement('div'); info.className='pslot-info';
      if(i===0){ const lm=document.createElement('div'); lm.className='pslot-lead'; lm.textContent='LEAD'; info.appendChild(lm); }
      const nm=document.createElement('div'); nm.className='pslot-name'; nm.textContent='#'+n.id;
      const ty=document.createElement('div'); ty.className='pslot-type'; ty.textContent=n.type;
      const hp=document.createElement('div'); hp.className='pslot-hp'; hp.textContent=`HP ${n.maxHp}`;
      info.append(nm,ty,hp); sl.appendChild(info);
      sl.title='Click to remove'; sl.onclick=()=>{ G.party.splice(i,1); renderSlots(); renderGrid(); };
    } else {
      const em=document.createElement('div'); em.className='pslot-num'; em.textContent=i+1; sl.appendChild(em);
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
    if(el) el.classList.remove('hidden');
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
  const fleeBtn=document.getElementById('btn-flee');
  if(fleeBtn) fleeBtn.onclick=()=>window.__battleAction('flee');
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
  const openMenuBtn=document.getElementById('btn-open-menu');
  if(openMenuBtn) openMenuBtn.onclick=()=>{ if(G.screen==='game') openMenu('inventory'); };

  // Dialogue click
  document.getElementById('dialogue').addEventListener('click', advanceDialogue);

  // Back buttons
  document.getElementById('btn-back-title').onclick=()=>{
    if(raf){cancelAnimationFrame(raf);raf=null;}
    showScreen('title');
  };

  document.getElementById('btn-ending-play-again').onclick=()=>location.reload();
});

function buildBattleSprite(n) {
  if(!G.battleSprites[n.id]) {
    G.battleSprites[n.id] = buildPartyBattleSprite(n.pixels);
  }
}

function startGame() {
  // Init world state
  G.save.gold=0; G.save.battlesWon=0;
  G.save.inventory={potion:3};
  G.save.journal=['Chapter 1: The First Render — Your story begins.'];
  G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});

  // Reset PixiJS player sprite so it's rebuilt with new party lead
  if (playerPIXI) { spriteLayer.removeChild(playerPIXI); playerPIXI = null; }

  // Build player sprite from lead Normie
  const lead=G.party[0];
  G.playerSprite=buildPlayerSprite(lead?.pixels, lead?.px);

  loadMap('home');
  // Snap camera to spawn (no lerp lag on start)
  const mapPxW = G.mapData.w * TSS, mapPxH = G.mapData.h * TSS;
  G.camX = Math.max(0, Math.min(G.px*TSS + TSS/2 - W/2, mapPxW - W));
  G.camY = Math.max(0, Math.min(G.py*TSS + TSS/2 - H/2, mapPxH - H));

  showScreen('game');
  renderHUD();

  // Opening dialogue from Mom
  setTimeout(()=>{
    const mom=NPC_DEFS.find(n=>n.id==='mom');
    if(mom) openDialogue(mom.name, mom.lines, G.npcSprites['mom']);
  }, 800);

  if(raf) cancelAnimationFrame(raf);
  raf=requestAnimationFrame(gameLoop);
}
