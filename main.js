import Phaser from 'phaser';
import { fetchNormieMeta, makeSvgFallback, makeFallback } from './normie-api.js';
import { connectWallet, loadWalletNormies, loadDemoNormies } from './wallet.js';
import { startBattle, closeBattle, buildEnemy } from './battle.js';

// ════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════
const TILE    = 32;
const MAP_W   = 40;
const MAP_H   = 40;
const MAX_PARTY = 5;

// Tile types
const T = { GRASS:0, PATH:1, WALL:2, TREE:3, WATER:4, TOWN:5, INN:6, SHOP:7, SIGN:8 };

// Zone definitions
const ZONES = [
  { name:'NORMIE PLAINS',  minX:0,  maxX:25, minY:0,  maxY:25, rate:.12, tier:0 },
  { name:'DARK FOREST',    minX:25, maxX:40, minY:0,  maxY:20, rate:.18, tier:1 },
  { name:'COIN CAVES',     minX:0,  maxX:20, minY:25, maxY:40, rate:.20, tier:2 },
  { name:'RUGGED LANDS',   minX:20, maxX:40, minY:25, maxY:40, rate:.22, tier:3 },
];

// NPC definitions
const NPC_DEFS = [
  { x:21, y:19, name:'TOWN ELDER',  text:'Welcome, adventurer. The plains hold many secrets. Beware the dark forest to the north-east.' },
  { x:18, y:21, name:'MERCHANT',    text:'Rare loot awaits in the Coin Caves to the south. Watch your step.' },
  { x:22, y:20, name:'INNKEEPER',   text:'Rest and restore your party here anytime. (Inn feature coming soon.)' },
  { x:10, y:20, name:'TRAVELER',    text:'I saw something enormous in the Rugged Lands. South-east. You\'ve been warned.' },
  { x:20, y:10, name:'SCOUT',       text:'The forest ahead is dense with enemies. Higher level Normies fare better there.' },
  { x:20, y:30, name:'MINER',       text:'The caves echo with strange sounds. The loot is worth the risk though.' },
  { x:30, y:20, name:'WANDERER',    text:'Step off the path into tall grass to find wild encounters. Stay on paths to travel safely.' },
];

// ════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════
const G = {
  // NFT collection + party
  collection: [],
  party:      [],
  demo:       false,
  provider:   null,
  address:    null,

  // Persistent world state
  world: {
    gold:     0,
    potions:  3,
    steps:    0,
    battlesWon: 0,
    journal:  [],
    px: 20, py: 20,   // player tile position
    encounterCooldown: 0,
  },

  // Phaser game instance
  game: null,
  overworldScene: null,
};

// ════════════════════════════════════════════════════════
// MAP GENERATION
// ════════════════════════════════════════════════════════
let MAP = null;

function mkRng(seed) {
  let s = (seed | 0) + 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

function generateMap() {
  const r = mkRng(42);
  MAP = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(T.GRASS));

  // Border walls
  for (let x = 0; x < MAP_W; x++) { MAP[0][x] = T.WALL; MAP[MAP_H-1][x] = T.WALL; }
  for (let y = 0; y < MAP_H; y++) { MAP[y][0] = T.WALL; MAP[y][MAP_W-1] = T.WALL; }

  // Random trees
  for (let y = 1; y < MAP_H-1; y++) for (let x = 1; x < MAP_W-1; x++)
    if (r() < 0.06) MAP[y][x] = T.TREE;

  // Water pools
  [[8,8,3,2],[30,5,2,3],[5,32,4,2],[32,32,3,3],[28,15,2,2]].forEach(([px,py,pw,ph]) => {
    for (let dy = 0; dy < ph; dy++) for (let dx = 0; dx < pw; dx++)
      if (py+dy < MAP_H-1 && px+dx < MAP_W-1) MAP[py+dy][px+dx] = T.WATER;
  });

  // Paths
  for (let x = 1; x < MAP_W-1; x++) MAP[20][x] = T.PATH;
  for (let y = 1; y < MAP_H-1; y++) MAP[y][20] = T.PATH;
  for (let x = 10; x < 30; x++) MAP[10][x] = T.PATH;
  for (let x = 5; x < 15; x++)  MAP[30][x] = T.PATH;
  for (let y = 10; y < 30; y++) MAP[y][10] = T.PATH;

  // Town center
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++)
    MAP[20+dy][20+dx] = T.TOWN;

  // Buildings
  [[17,22],[17,23],[18,22],[18,23]].forEach(([y,x]) => MAP[y][x] = T.INN);
  [[22,17],[22,18],[23,17],[23,18]].forEach(([y,x]) => MAP[y][x] = T.SHOP);
  MAP[19][20] = T.SIGN;
  MAP[20][19] = T.SIGN;

  // Dark forest (denser trees top-right)
  for (let y = 2; y < 18; y++) for (let x = 26; x < 38; x++)
    if (MAP[y][x] === T.GRASS && r() < 0.25) MAP[y][x] = T.TREE;

  // Coin caves (extra walls bottom-left)
  for (let y = 26; y < 38; y++) for (let x = 2; x < 18; x++)
    if (MAP[y][x] === T.GRASS && r() < 0.12) MAP[y][x] = T.WALL;

  // Keep spawn clear
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
    MAP[20+dy][20+dx] = T.TOWN;
  [[17,22],[17,23],[18,22],[18,23]].forEach(([y,x]) => MAP[y][x] = T.INN);
  [[22,17],[22,18],[23,17],[23,18]].forEach(([y,x]) => MAP[y][x] = T.SHOP);
  MAP[19][20] = T.SIGN;
  MAP[20][19] = T.SIGN;
}

const WALKABLE = t => t !== T.WALL && t !== T.TREE && t !== T.WATER;

// ════════════════════════════════════════════════════════
// TILESET GENERATION (canvas → Phaser texture)
// We generate a 32×32 tile for each tile type programmatically
// so we never need an external image file
// ════════════════════════════════════════════════════════
const TILE_COLORS = {
  [T.GRASS]: { bg:'#f5f5f5', border:'#e8e8e8' },
  [T.PATH]:  { bg:'#ebebeb', border:'#d0d0d0' },
  [T.WALL]:  { bg:'#111111', border:null },
  [T.TREE]:  { bg:'#1a1a1a', border:null },
  [T.WATER]: { bg:'#cccccc', border:'#aaaaaa' },
  [T.TOWN]:  { bg:'#efefef', border:'#cccccc' },
  [T.INN]:   { bg:'#e0e0e0', border:'#888888' },
  [T.SHOP]:  { bg:'#e0e0e0', border:'#888888' },
  [T.SIGN]:  { bg:'#dddddd', border:'#888888' },
};
const TILE_EMOJI = {
  [T.TREE]:  '▲',
  [T.WATER]: '~',
  [T.INN]:   'INN',
  [T.SHOP]:  'SHP',
  [T.SIGN]:  '!',
};

function makeTileTexture(scene, type, key) {
  const cv  = document.createElement('canvas');
  cv.width  = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d');
  const col = TILE_COLORS[type] || { bg:'#fff' };
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, TILE, TILE);
  if (col.border) {
    ctx.strokeStyle = col.border;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0.5, 0.5, TILE-1, TILE-1);
  }
  const lbl = TILE_EMOJI[type];
  if (lbl) {
    ctx.fillStyle = (type === T.WALL || type === T.TREE) ? '#fff' : '#444';
    ctx.font = type === T.INN || type === T.SHOP ? '9px monospace' : '14px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lbl, TILE/2, TILE/2);
  }
  scene.textures.addCanvas(key, cv);
}

// Generate a normie-style pixel figure texture for NPCs
function makeNpcTexture(scene) {
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(11, 6, 10, 8);  // head
  ctx.fillRect(10, 14, 12, 8); // body
  ctx.fillRect(10, 22, 4, 6);  // left leg
  ctx.fillRect(18, 22, 4, 6);  // right leg
  ctx.fillStyle = '#333';
  ctx.fillRect(13, 9, 2, 2);   // left eye
  ctx.fillRect(17, 9, 2, 2);   // right eye
  scene.textures.addCanvas('npc', cv);
}

// Generate player texture from normie image (or fallback pixel figure)
function makePlayerTexture(scene, normie) {
  return new Promise(resolve => {
    const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
    const ctx = cv.getContext('2d');

    const drawFallback = () => {
      ctx.clearRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#000';
      ctx.fillRect(11, 4, 10, 9);  // head
      ctx.fillRect(10, 13, 12, 9); // body
      ctx.fillRect(10, 22, 4, 6);  // left leg
      ctx.fillRect(18, 22, 4, 6);  // right leg
      ctx.fillStyle = '#fff';
      ctx.fillRect(12, 7, 2, 2);
      ctx.fillRect(17, 7, 2, 2);
      if (scene.textures.exists('player')) scene.textures.remove('player');
      scene.textures.addCanvas('player', cv);
      resolve();
    };

    if (!normie || !normie.image) { drawFallback(); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, TILE, TILE);
      if (scene.textures.exists('player')) scene.textures.remove('player');
      scene.textures.addCanvas('player', cv);
      resolve();
    };
    img.onerror = drawFallback;
    img.src = normie.image;
  });
}

// ════════════════════════════════════════════════════════
// OVERWORLD PHASER SCENE
// ════════════════════════════════════════════════════════
class OverworldScene extends Phaser.Scene {
  constructor() { super({ key: 'OverworldScene' }); }

  async create() {
    G.overworldScene = this;
    if (!MAP) generateMap();

    // ── Build textures for each tile type ──
    Object.values(T).forEach(t => makeTileTexture(this, t, `tile_${t}`));
    makeNpcTexture(this);

    // ── Draw static tilemap ──
    this.tileImages = [];
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const tileType = MAP[ty][tx];
        const img = this.add.image(tx * TILE + TILE/2, ty * TILE + TILE/2, `tile_${tileType}`);
        this.tileImages.push(img);
      }
    }

    // ── Draw NPCs ──
    NPC_DEFS.forEach(npc => {
      this.add.image(npc.x * TILE + TILE/2, npc.y * TILE + TILE/2, 'npc');
      this.add.text(npc.x * TILE + TILE/2, npc.y * TILE - 4,
        npc.name.split(' ')[0],
        { font: '6px monospace', fill: '#555', backgroundColor: 'rgba(255,255,255,0.8)', padding: { x:2, y:1 } }
      ).setOrigin(0.5, 1);
    });

    // ── Player sprite ──
    await makePlayerTexture(this, G.party[0]);
    const { px, py } = G.world;
    this.player = this.add.image(px * TILE + TILE/2, py * TILE + TILE/2, 'player');
    this.player.setDepth(10);

    // ── Camera follows player ──
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── Input ──
    this.cursors   = this.input.keyboard.createCursorKeys();
    this.wasd      = this.input.keyboard.addKeys({ up:'W', down:'S', left:'A', right:'D' });
    this.keyE      = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyI      = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);

    this._moveCooldown = 0;
    this._dialogueOpen = false;
    this._battleOpen   = false;

    // Show HUD
    this._showHUD();
    this._updateZoneLabel();
    this._renderHUD();
  }

  update(time, delta) {
    if (this._battleOpen || this._dialogueOpen || this._invOpen) return;

    // Inventory key
    if (Phaser.Input.Keyboard.JustDown(this.keyI)) {
      this._openInventory(); return;
    }

    // Interact key
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this._tryInteract(); return;
    }

    // Movement throttle
    this._moveCooldown -= delta;
    if (this._moveCooldown > 0) return;

    const w = G.world;
    let nx = w.px, ny = w.py;
    let moved = false;

    if (this.cursors.up.isDown    || this.wasd.up.isDown)    { ny--; moved = true; }
    else if (this.cursors.down.isDown  || this.wasd.down.isDown)  { ny++; moved = true; }
    else if (this.cursors.left.isDown  || this.wasd.left.isDown)  { nx--; moved = true; }
    else if (this.cursors.right.isDown || this.wasd.right.isDown) { nx++; moved = true; }

    if (!moved) return;

    // Bounds + walkability
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return;
    if (!WALKABLE(MAP[ny][nx])) return;

    w.px = nx; w.py = ny;
    w.steps++;
    this.player.setPosition(nx * TILE + TILE/2, ny * TILE + TILE/2);
    this._moveCooldown = 140;
    this._updateZoneLabel();
    this._renderHUD();

    // Random encounter
    if (MAP[ny][nx] === T.GRASS && w.encounterCooldown === 0) {
      const zone = this._getZone(nx, ny);
      if (Math.random() < zone.rate) {
        w.encounterCooldown = 8;
        this._triggerEncounter(zone);
        return;
      }
    }
    if (w.encounterCooldown > 0) w.encounterCooldown--;
  }

  // ── ENCOUNTER ──
  _triggerEncounter(zone) {
    this._battleOpen = true;
    G.world.journal.push(`Encountered enemy in ${zone.name}.`);

    const enemy = buildEnemy(zone.tier, G.party.length);

    // Quick flash
    this.cameras.main.flash(200, 0, 0, 0);

    setTimeout(() => {
      startBattle({
        party:    G.party.map(n => ({ ...n })),
        enemy,
        potions:  G.world.potions,
        zoneName: zone.name,
        onEnd: (result) => {
          // Update world state from battle result
          G.world.potions = result.potions;
          if (result.type === 'victory') {
            G.world.gold       += result.gold;
            G.world.battlesWon += 1;
            G.world.journal.push(`Defeated ${enemy.name}. +${result.gold} G.`);
          }
          // Sync HP/MP back to party
          result.party.forEach((bp, i) => {
            if (G.party[i]) {
              G.party[i].hp    = bp.hp;
              G.party[i].mp    = bp.mp;
              G.party[i].alive = bp.alive;
            }
          });
          // Revive KO'd at 1 HP; partial recovery for survivors
          G.party.forEach(n => {
            if (!n.alive) { n.alive = true; n.hp = 1; }
            else {
              n.hp = Math.min(n.maxHp, n.hp + Math.floor(n.maxHp * 0.15));
              n.mp = Math.min(n.maxMp, n.mp + Math.floor(n.maxMp * 0.3));
            }
          });
          this._renderHUD();
        }
      });
    }, 250);
  }

  // ── INTERACT ──
  _tryInteract() {
    const w = G.world;
    const dirs = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
    // Try all adjacent tiles
    for (const [, [dx, dy]] of Object.entries(dirs)) {
      const tx = w.px + dx, ty = w.py + dy;
      const npc = NPC_DEFS.find(n => n.x === tx && n.y === ty);
      if (npc) { this._openDialogue(npc.name, npc.text); return; }
      const tile = MAP[ty]?.[tx];
      if (tile === T.SIGN) { this._openDialogue('SIGN', 'Town crossroads. Normie Plains west, Dark Forest north-east, Coin Caves south.'); return; }
      if (tile === T.INN)  { this._openDialogue('INNKEEPER', 'Welcome! Full heal for your party. (Coming soon!)'); return; }
      if (tile === T.SHOP) { this._openDialogue('MERCHANT', 'Shop inventory: Potions, Buffs. (Coming soon!)'); return; }
    }
  }

  // ── DIALOGUE ──
  _openDialogue(name, text) {
    this._dialogueOpen = true;
    const d = document.getElementById('dialogue');
    document.getElementById('dialogue-name').textContent = name;
    document.getElementById('dialogue-text').textContent = text;
    d.style.display = 'block';
  }
  _closeDialogue() {
    this._dialogueOpen = false;
    document.getElementById('dialogue').style.display = 'none';
  }

  // ── INVENTORY ──
  _openInventory() {
    this._invOpen = true;
    renderInventory();
    document.getElementById('panel-inventory').style.display = 'block';
  }
  _closeInventory() {
    this._invOpen = false;
    document.getElementById('panel-inventory').style.display = 'none';
  }

  // ── HUD ──
  _showHUD() {
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('hud').style.display    = 'flex';
    document.getElementById('zone-label').style.display = 'block';
  }

  _renderHUD() {
    const cont = document.getElementById('hud-party');
    cont.innerHTML = '';
    G.party.forEach(n => {
      const div = document.createElement('div');
      div.className = 'hud-member' + (n.alive ? '' : ' dead');
      const img = document.createElement('img');
      img.className = 'hud-img';
      img.src = n.image || makeSvgFallback(n.id);
      img.onerror = () => { img.src = makeSvgFallback(n.id); };
      div.appendChild(img);
      const hpP = Math.max(0, n.hp / n.maxHp * 100);
      const mpP = Math.max(0, n.mp / n.maxMp * 100);
      const info = document.createElement('div');
      info.innerHTML = `
        <div class="hud-name">${n.name.replace(/^Normie /, '#')}</div>
        <div class="hud-bars">
          <div class="hud-bar-wrap"><div class="hud-bar-fill" style="width:${hpP}%"></div></div>
          <div class="hud-bar-wrap"><div class="hud-bar-mp" style="width:${mpP}%"></div></div>
          <div class="hud-hp-txt">${n.hp}/${n.maxHp}</div>
        </div>`;
      div.appendChild(info);
      cont.appendChild(div);
    });
    document.getElementById('hud-gold').textContent = G.world.gold + ' G';
  }

  _getZone(x, y) {
    return ZONES.find(z => x >= z.minX && x < z.maxX && y >= z.minY && y < z.maxY) || ZONES[0];
  }
  _updateZoneLabel() {
    const z = this._getZone(G.world.px, G.world.py);
    document.getElementById('zone-label').textContent = z.name;
  }
}

// ════════════════════════════════════════════════════════
// PHASER GAME INIT
// ════════════════════════════════════════════════════════
function launchPhaser() {
  if (G.game) { G.game.destroy(true); G.game = null; }

  const hudHeight = 80;
  const W = window.innerWidth;
  const H = window.innerHeight - hudHeight;

  G.game = new Phaser.Game({
    type: Phaser.AUTO,
    width:  W,
    height: H,
    parent: 'game-container',
    pixelArt:    true,
    roundPixels: true,
    backgroundColor: '#ffffff',
    scene: [OverworldScene],
    scale: {
      mode:           Phaser.Scale.RESIZE,
      autoCenter:     Phaser.Scale.CENTER_BOTH,
    },
  });
}

// ════════════════════════════════════════════════════════
// UI: PARTY SELECT
// ════════════════════════════════════════════════════════
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('panel-' + id);
  if (el) el.classList.add('active');
}

function renderSlots() {
  const cont = document.getElementById('party-slots');
  cont.innerHTML = '';
  document.getElementById('party-count-label').textContent = `${G.party.length} / ${MAX_PARTY}`;
  document.getElementById('btn-explore').disabled = G.party.length === 0;
  for (let i = 0; i < MAX_PARTY; i++) {
    const n = G.party[i];
    const slot = document.createElement('div');
    slot.className = 'slot ' + (n ? 'filled' : 'empty');
    if (n) {
      const rm = document.createElement('button');
      rm.className = 'slot-remove'; rm.textContent = '×';
      rm.onclick = e => { e.stopPropagation(); G.party.splice(i, 1); renderSlots(); renderGrid(); };
      const img = document.createElement('img');
      img.src = n.image || makeSvgFallback(n.id);
      img.onerror = () => { img.src = makeSvgFallback(n.id); };
      const nm = document.createElement('div');
      nm.className = 'slot-name'; nm.textContent = n.name.replace(/^Normie /, '#');
      slot.append(rm, img, nm);
    } else {
      slot.innerHTML = `<div class="slot-num">${i+1}</div><div class="slot-empty-label">—</div>`;
    }
    cont.appendChild(slot);
  }
}

function renderGrid() {
  const grid = document.getElementById('normie-grid');
  document.getElementById('col-count').textContent = G.collection.length ? `(${G.collection.length})` : '';
  if (!G.collection.length) { grid.innerHTML = '<div class="loading-state">Loading…</div>'; return; }
  grid.innerHTML = '';
  G.collection.forEach(n => {
    const inParty = G.party.some(p => p.id === n.id);
    const card = document.createElement('div');
    card.className = 'ncard' + (inParty ? ' in-party' : '');
    const img = document.createElement('img');
    img.src = n.image || makeSvgFallback(n.id);
    img.onerror = () => { img.src = makeSvgFallback(n.id); };
    card.appendChild(img);
    card.innerHTML += `
      <div class="ncard-id">${n.name.replace(/^Normie /, '#')}</div>
      <div class="ncard-type">${n.type} · Lv${n.lv}</div>
      <div class="ncard-stats">HP ${n.maxHp} · ATK ${n.atkBasic}</div>`;
    if (!inParty) card.onclick = () => {
      if (G.party.length >= MAX_PARTY) return;
      G.party.push({ ...n, hp: n.maxHp, mp: n.maxMp, alive: true });
      renderSlots(); renderGrid();
    };
    grid.appendChild(card);
  });
}

// ════════════════════════════════════════════════════════
// INVENTORY RENDER
// ════════════════════════════════════════════════════════
function renderInventory() {
  // Items
  const itemsEl = document.getElementById('inv-items');
  itemsEl.innerHTML = '';
  const grid = document.createElement('div'); grid.className = 'inv-grid';
  const potion = document.createElement('div'); potion.className = 'inv-item';
  potion.innerHTML = `<div class="inv-item-name">Potion</div><div class="inv-item-desc">Restores 35% HP to the most injured party member.</div><div class="inv-item-qty">Qty: ${G.world.potions}</div>`;
  grid.appendChild(potion);
  if (G.world.gold > 0) {
    const gold = document.createElement('div'); gold.className = 'inv-item';
    gold.innerHTML = `<div class="inv-item-name">Gold</div><div class="inv-item-desc">Earned from victories.</div><div class="inv-item-qty">${G.world.gold} G</div>`;
    grid.appendChild(gold);
  }
  itemsEl.appendChild(grid);

  // Party
  const partyEl = document.getElementById('inv-party'); partyEl.innerHTML = '';
  G.party.forEach(n => {
    const card = document.createElement('div'); card.className = 'party-card';
    const img  = document.createElement('img');
    img.src = n.image || makeSvgFallback(n.id);
    img.onerror = () => { img.src = makeSvgFallback(n.id); };
    const hpP = Math.max(0, n.hp/n.maxHp*100);
    const mpP = Math.max(0, n.mp/n.maxMp*100);
    const info = document.createElement('div'); info.className = 'party-card-info';
    info.innerHTML = `
      <div class="party-card-name">${n.name}</div>
      <div class="party-card-type">${n.type} · Lv${n.lv} · ${n.alive ? 'Alive' : 'KO'}</div>
      <div class="party-card-stats">HP ${n.hp}/${n.maxHp} · MP ${n.mp}/${n.maxMp}<br>ATK ${n.atkBasic}/${n.atkSkill}/${n.atkUltimate} · DEF ${n.def} · SPD ${n.spd}</div>
      <div class="stat-bar-row"><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${hpP}%"></div></div><div class="stat-val">${n.hp}/${n.maxHp} HP</div></div>
      <div class="stat-bar-row"><div class="stat-bar-wrap"><div class="stat-bar-mp-fill" style="width:${mpP}%"></div></div><div class="stat-val">${n.mp}/${n.maxMp} MP</div></div>`;
    card.append(img, info);
    partyEl.appendChild(card);
  });

  // Journal
  const journalEl = document.getElementById('inv-journal');
  journalEl.style.cssText = 'font-size:11px;color:#888;line-height:1.9;white-space:pre-line';
  journalEl.textContent = G.world.journal.length
    ? G.world.journal.slice(-10).reverse().join('\n')
    : 'No entries yet. Start exploring!';
}

// ════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {

  // Connect MetaMask
  document.getElementById('btn-connect').onclick = async () => {
    const btn = document.getElementById('btn-connect');
    btn.disabled = true; btn.textContent = 'Connecting…';
    try {
      const { provider, address } = await connectWallet();
      G.provider = provider; G.address = address; G.demo = false;
      const el = document.getElementById('wallet-address');
      el.textContent = address; el.style.display = 'block';
      btn.textContent = 'Loading NFTs…';
      showPanel('party');
      renderGrid();
      G.collection = await loadWalletNormies(address, provider, col => {
        G.collection = col; renderGrid();
      });
      renderGrid();
      btn.textContent = 'Connected';
    } catch (e) {
      btn.textContent = 'Failed — retry'; btn.disabled = false;
      console.error(e);
    }
  };

  // Demo mode
  document.getElementById('btn-demo').onclick = async () => {
    G.demo = true; G.collection = [];
    document.getElementById('demo-badge').style.display = 'inline-block';
    showPanel('party');
    renderGrid();
    G.collection = await loadDemoNormies(col => { G.collection = col; renderGrid(); });
    renderGrid();
  };

  // Back to connect
  document.getElementById('btn-back-connect').onclick = () => showPanel('connect');

  // Enter world
  document.getElementById('btn-explore').onclick = () => {
    G.world.potions = 3;
    G.party.forEach(n => { n.hp = n.maxHp; n.mp = n.maxMp; n.alive = true; });
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    launchPhaser();
  };

  // Battle buttons — delegate to battle.js via window.__battleAct
  ['atk','skill','ult','pot'].forEach(t => {
    const type = t === 'atk' ? 'attack' : t === 'pot' ? 'potion' : t;
    document.getElementById('btn-' + t).onclick = () => window.__battleAct(type);
  });

  // Battle result buttons
  document.getElementById('btn-result-world').onclick = () => {
    closeBattle();
    if (G.overworldScene) G.overworldScene._battleOpen = false;
  };
  document.getElementById('btn-result-party').onclick = () => {
    closeBattle();
    G.party.forEach(n => { n.hp = n.maxHp; n.mp = n.maxMp; n.alive = true; });
    if (G.game) { G.game.destroy(true); G.game = null; }
    document.getElementById('game-container').style.display = 'none';
    showPanel('party');
    renderSlots(); renderGrid();
  };

  // Dialogue close
  document.getElementById('dialogue-close').onclick = () => {
    if (G.overworldScene) G.overworldScene._closeDialogue();
  };

  // Inventory close
  document.getElementById('btn-close-inv').onclick = () => {
    if (G.overworldScene) G.overworldScene._closeInventory();
  };

  // Handle resize
  window.addEventListener('resize', () => {
    if (G.game) G.game.scale.resize(window.innerWidth, window.innerHeight - 80);
  });
});
