import Phaser from 'phaser';
import { fetchNormieMeta, makeSvgFallback, calcStats } from './normie-api.js';
import { connectWallet, loadWalletNormies, loadDemoNormies } from './wallet.js';
import { startBattle, closeBattle, buildEnemy } from './battle.js';

// ════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════
const TILE    = 32;
const MAP_W   = 50;
const MAP_H   = 50;
const MAX_PARTY = 5;

// Tile type IDs
const T = { GRASS:0, PATH:1, WALL:2, TREE:3, WATER:4, TOWN:5, INN:6, SHOP:7, SIGN:8, TALL_GRASS:9 };

// World zones (higher tier = harder enemies)
const ZONES = [
  { name:'NORMIE PLAINS',  minX:0,  maxX:30, minY:0,  maxY:30, rate:0.13, tier:0 },
  { name:'DARK FOREST',    minX:30, maxX:50, minY:0,  maxY:25, rate:0.20, tier:1 },
  { name:'COIN CAVES',     minX:0,  maxX:25, minY:30, maxY:50, rate:0.22, tier:2 },
  { name:'RUGGED LANDS',   minX:25, maxX:50, minY:25, maxY:50, rate:0.25, tier:3 },
];

// NPC story characters — names and dialogue fit the Normies NFT lore
const NPC_DEFS = [
  { x:26, y:24, name:'ELDER NORM',
    text:'Long ago, the Normies were just pixels on a screen. Then the chain gave them life. Now they roam, they fight, they accumulate. Welcome, traveler.' },
  { x:24, y:26, name:'CHAD VENDOR',
    text:'I sell potions brewed from on-chain data. The rarer the Normie, the stronger the brew. High pixel count? That\'s natural armor right there.' },
  { x:26, y:26, name:'INNKEEPER FREN',
    text:'Rest your Normies here. A good innkeeper never asks about rarity. Gold is gold.' },
  { x:14, y:25, name:'DEGEN TRAVELER',
    text:'I walked through the Coin Caves. Lost three Normies to a Gas Fee Demon. Not financial advice but: always carry potions.' },
  { x:25, y:14, name:'COPE SCOUT',
    text:'The Dark Forest is dense with enemies. Pixel Punch barely scratches the Rugpuller. Save your Ultimate for boss fights.' },
  { x:25, y:36, name:'DIAMOND MINER',
    text:'Strange things happen at the bottom of the caves. The Bearmarkt lurks there. Some say it appears only when prices drop.' },
  { x:36, y:25, name:'WANDERING GM',
    text:'Walking on tall grass triggers wild encounters. Stay on the white path tiles to travel safely between zones. Gm.' },
  { x:10, y:10, name:'FOREST HERMIT',
    text:'Deep in the Dark Forest lives the Cope Lord. It feeds on negative sentiment. Bring a Wizard — their Arcane Stare devastates it.' },
  { x:40, y:40, name:'RUGGED RONIN',
    text:'The Rugpuller waits in the Rugged Lands. It\'s fast, it hits hard. Bring your highest-level Normies and stack DEF. Godspeed.' },
  { x:10, y:40, name:'CAVE CHRONICLER',
    text:'The Gas Fee Demon burns everything. Robots resist it best — high DEF from pixel density. Laser Bolt hits its weak point.' },
];

// Enemy pool — tied to Normies NFT lore
const ENEMY_POOL = [
  // tier 0 — Normie Plains
  { name:'WILD NORMIE',      seed:101,  hpBase:70,  atkBase:12, def:1, spd:5,
    lore:'A stray Normie that got separated from its wallet. Confused but scrappy.' },
  { name:'PAPER HAND',       seed:202,  hpBase:90,  atkBase:15, def:2, spd:7,
    lore:'Sold too early and has been bitter ever since. Attacks with regret.' },
  // tier 1 — Dark Forest
  { name:'THE VOID',         seed:1001, hpBase:130, atkBase:20, def:3, spd:6,
    lore:'An entity of pure negativity that appeared during a market downturn.' },
  { name:'COPE LORD',        seed:2002, hpBase:190, atkBase:26, def:5, spd:9,
    lore:'Master of cope and seething. Grows stronger when ignored.' },
  // tier 2 — Coin Caves
  { name:'GAS FEE DEMON',    seed:3003, hpBase:270, atkBase:34, def:7, spd:12,
    lore:'Born from peak congestion on mainnet. Burns everything it touches.' },
  { name:'FUD SPECTER',      seed:3333, hpBase:220, atkBase:30, def:6, spd:14,
    lore:'Spreads misinformation as a combat technique. Hard to pin down.' },
  // tier 3 — Rugged Lands
  { name:'RUGPULLER',        seed:4004, hpBase:380, atkBase:45, def:10, spd:14,
    lore:'It giveth liquidity and taketh away. The most feared entity in the overworld.' },
  { name:'BEARMARKT',        seed:5005, hpBase:520, atkBase:58, def:15, spd:17,
    lore:'Ancient and inevitable. Appears only in the deepest zones. True final boss energy.' },
];

// ════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════
const G = {
  collection: [], party: [], demo: false,
  provider: null, address: null,
  world: {
    gold: 0, potions: 3, steps: 0, battlesWon: 0, journal: [],
    px: 25, py: 25, encounterCooldown: 0,
  },
  game: null, scene: null,
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
  const r = mkRng(7331);
  MAP = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(T.GRASS));

  // Border
  for (let x = 0; x < MAP_W; x++) { MAP[0][x] = T.WALL; MAP[MAP_H-1][x] = T.WALL; }
  for (let y = 0; y < MAP_H; y++) { MAP[y][0] = T.WALL; MAP[y][MAP_W-1] = T.WALL; }

  // Scatter tall grass patches (encounter zones) and trees
  for (let y = 2; y < MAP_H-2; y++) {
    for (let x = 2; x < MAP_W-2; x++) {
      const v = r();
      if      (v < 0.08) MAP[y][x] = T.TALL_GRASS;
      else if (v < 0.12) MAP[y][x] = T.TREE;
    }
  }

  // Water features
  const waterSpots = [[7,6,3,2],[38,5,2,3],[5,38,4,2],[40,38,3,3],[32,18,2,2],[15,15,2,3],[42,12,3,2]];
  waterSpots.forEach(([wx,wy,ww,wh]) => {
    for (let dy=0;dy<wh;dy++) for (let dx=0;dx<ww;dx++)
      if (wy+dy < MAP_H-1 && wx+dx < MAP_W-1) MAP[wy+dy][wx+dx] = T.WATER;
  });

  // Main cross paths
  for (let x = 1; x < MAP_W-1; x++) MAP[25][x] = T.PATH;
  for (let y = 1; y < MAP_H-1; y++) MAP[y][25] = T.PATH;
  // Secondary paths
  for (let x = 5; x < 45; x++) MAP[12][x] = T.PATH;
  for (let x = 5; x < 20; x++) MAP[37][x] = T.PATH;
  for (let y = 12; y < 38; y++) MAP[y][12] = T.PATH;
  for (let y = 5;  y < 25; y++) MAP[y][38] = T.PATH;

  // Dense forest top-right
  for (let y = 2; y < 22; y++) for (let x = 32; x < 48; x++)
    if (MAP[y][x] === T.GRASS && r() < 0.30) MAP[y][x] = T.TREE;

  // Rocky caves bottom-left
  for (let y = 32; y < 48; y++) for (let x = 2; x < 22; x++)
    if (MAP[y][x] === T.GRASS && r() < 0.15) MAP[y][x] = T.WALL;

  // Town center around 25,25
  for (let dy=-4; dy<=4; dy++) for (let dx=-4; dx<=4; dx++)
    MAP[25+dy][25+dx] = T.TOWN;

  // Buildings in town
  [[22,27],[22,28],[23,27],[23,28]].forEach(([y,x]) => MAP[y][x] = T.INN);
  [[27,22],[27,23],[28,22],[28,23]].forEach(([y,x]) => MAP[y][x] = T.SHOP);

  // Signs at town exits
  MAP[24][25] = T.SIGN;
  MAP[26][25] = T.SIGN;
  MAP[25][24] = T.SIGN;
  MAP[25][26] = T.SIGN;

  // Clear NPC positions and spawn
  NPC_DEFS.forEach(n => { if (MAP[n.y]?.[n.x] !== undefined) MAP[n.y][n.x] = T.PATH; });
  for (let dy=-2; dy<=2; dy++) for (let dx=-2; dx<=2; dx++) MAP[25+dy][25+dx] = T.TOWN;
  [[22,27],[22,28],[23,27],[23,28]].forEach(([y,x]) => MAP[y][x] = T.INN);
  [[27,22],[27,23],[28,22],[28,23]].forEach(([y,x]) => MAP[y][x] = T.SHOP);
}

const WALKABLE = t => t !== T.WALL && t !== T.TREE && t !== T.WATER;
const ENCOUNTER_TILE = t => t === T.GRASS || t === T.TALL_GRASS;

function getZone(x, y) {
  return ZONES.find(z => x>=z.minX && x<z.maxX && y>=z.minY && y<z.maxY) || ZONES[0];
}

// ════════════════════════════════════════════════════════
// PHASER SCENE — uses Graphics objects (no external textures, no WebGL framebuffer issues)
// ════════════════════════════════════════════════════════
class OverworldScene extends Phaser.Scene {
  constructor() { super({ key: 'OverworldScene' }); }

  preload() {
    // Load normie images as textures using their data URIs / URLs
    // We load each party member's image via Phaser loader
    G.party.forEach(n => {
      if (n.image && !this.textures.exists('normie_' + n.id)) {
        this.load.image('normie_' + n.id, n.image);
      }
    });
  }

  create() {
    G.scene = this;
    if (!MAP) generateMap();

    this._dialogueOpen = false;
    this._battleOpen   = false;
    this._invOpen      = false;

    const totalW = MAP_W * TILE;
    const totalH = MAP_H * TILE;

    // ── Draw entire map using Phaser Graphics (Canvas renderer compatible) ──
    this.mapGraphics = this.add.graphics();
    this._drawMap();

    // ── NPC sprites as colored rectangles with labels ──
    this.npcGroup = this.add.group();
    NPC_DEFS.forEach(npc => {
      const sx = npc.x * TILE, sy = npc.y * TILE;
      const body = this.add.graphics();
      // Body
      body.fillStyle(0xffe066, 1).fillRect(sx+8, sy+6, 16, 12);   // head
      body.fillStyle(0xffe066, 1).fillRect(sx+7, sy+18, 18, 10);   // torso
      body.fillStyle(0x333333, 1).fillRect(sx+9, sy+8, 4, 4);      // left eye
      body.fillStyle(0x333333, 1).fillRect(sx+19, sy+8, 4, 4);     // right eye
      body.fillStyle(0xffe066, 1).fillRect(sx+8, sy+28, 5, 8);     // left leg
      body.fillStyle(0xffe066, 1).fillRect(sx+19, sy+28, 5, 8);    // right leg
      body.setDepth(5);
      this.npcGroup.add(body);
      // Name label
      this.add.text(sx + TILE/2, sy - 2, npc.name.split(' ')[0],
        { fontFamily:'monospace', fontSize:'8px', color:'#555555',
          backgroundColor:'rgba(255,255,255,0.85)', padding:{x:2,y:1} }
      ).setOrigin(0.5, 1).setDepth(6);
    });

    // ── Player sprite ──
    const lead = G.party[0];
    const { px, py } = G.world;
    if (lead && this.textures.exists('normie_' + lead.id)) {
      this.playerSprite = this.add.image(px*TILE+TILE/2, py*TILE+TILE/2, 'normie_' + lead.id)
        .setDisplaySize(TILE, TILE).setDepth(10);
    } else {
      // Pixel figure fallback
      this.playerSprite = this.add.graphics().setDepth(10);
      this._drawPlayerFigure(this.playerSprite, px*TILE, py*TILE);
    }

    // ── Camera ──
    this.cameras.main.setBounds(0, 0, totalW, totalH);
    this.cameras.main.startFollow(
      { x: px*TILE+TILE/2, y: py*TILE+TILE/2 }, true, 0.12, 0.12
    );
    this._camTarget = { x: px*TILE+TILE/2, y: py*TILE+TILE/2 };

    // ── Input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE    = this.input.keyboard.addKey('E');
    this.keyI    = this.input.keyboard.addKey('I');

    this._moveCooldown = 0;

    // ── Show HUD ──
    this._showHUD();
    this._updateZoneLabel();
    this._renderHUD();
  }

  _drawMap() {
    const g = this.mapGraphics;
    g.clear();

    // Color palette matching B&W aesthetic
    const COLORS = {
      [T.GRASS]:      { fill: 0xf2f2f2, stroke: 0xe0e0e0 },
      [T.TALL_GRASS]: { fill: 0xe8f0e8, stroke: 0xc8d8c8 },
      [T.PATH]:       { fill: 0xe8e8e8, stroke: 0xcccccc },
      [T.WALL]:       { fill: 0x111111, stroke: null },
      [T.TREE]:       { fill: 0x1a2a1a, stroke: null },
      [T.WATER]:      { fill: 0xc0c8d0, stroke: 0xa0a8b0 },
      [T.TOWN]:       { fill: 0xeeeeee, stroke: 0xcccccc },
      [T.INN]:        { fill: 0xdde0dd, stroke: 0x666666 },
      [T.SHOP]:       { fill: 0xdde0dd, stroke: 0x666666 },
      [T.SIGN]:       { fill: 0xddddbb, stroke: 0x888866 },
    };

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t  = MAP[ty][tx];
        const sx = tx * TILE, sy = ty * TILE;
        const col = COLORS[t] || { fill: 0xffffff, stroke: null };

        g.fillStyle(col.fill, 1);
        g.fillRect(sx, sy, TILE, TILE);

        if (col.stroke !== null) {
          g.lineStyle(0.5, col.stroke, 1);
          g.strokeRect(sx + 0.25, sy + 0.25, TILE - 0.5, TILE - 0.5);
        }

        // Tile decoration marks
        if (t === T.TREE) {
          g.fillStyle(0x334433, 1);
          g.fillTriangle(sx+TILE/2, sy+4, sx+4, sy+TILE-4, sx+TILE-4, sy+TILE-4);
        } else if (t === T.WATER) {
          g.lineStyle(1, 0x8898a8, 0.7);
          g.beginPath();
          g.moveTo(sx+4, sy+TILE/2-4); g.lineTo(sx+TILE-4, sy+TILE/2-4);
          g.moveTo(sx+6, sy+TILE/2+4); g.lineTo(sx+TILE-6, sy+TILE/2+4);
          g.strokePath();
        } else if (t === T.TALL_GRASS) {
          g.fillStyle(0x88aa66, 0.5);
          for (let i = 0; i < 4; i++) {
            const bx = sx + 4 + i*7, by = sy + TILE - 6;
            g.fillRect(bx, by-8, 2, 8);
          }
        } else if (t === T.INN) {
          // small door mark
          g.fillStyle(0x444444, 1); g.fillRect(sx+13, sy+18, 6, 10);
          g.fillStyle(0x888888, 1); g.fillRect(sx+8, sy+8, 16, 8); // window
        } else if (t === T.SHOP) {
          g.fillStyle(0x444444, 1); g.fillRect(sx+13, sy+18, 6, 10);
          g.fillStyle(0x888888, 1); g.fillRect(sx+8, sy+8, 16, 8);
        } else if (t === T.SIGN) {
          // post + board
          g.fillStyle(0x886644, 1); g.fillRect(sx+14, sy+12, 4, 16);
          g.fillStyle(0xccaa66, 1); g.fillRect(sx+8, sy+8, 16, 10);
          g.fillStyle(0x443322, 1); g.fillRect(sx+10, sy+11, 12, 2);
        } else if (t === T.PATH) {
          // subtle direction lines on main paths
          if (ty === 25 || tx === 25) {
            g.lineStyle(0.5, 0xbbbbbb, 0.4);
            g.beginPath();
            g.moveTo(sx+TILE/2, sy+2); g.lineTo(sx+TILE/2, sy+TILE-2);
            g.strokePath();
          }
        }
      }
    }
    g.setDepth(0);
  }

  _drawPlayerFigure(g, sx, sy) {
    g.clear();
    g.fillStyle(0x111111, 1);
    g.fillRect(sx+10, sy+4, 12, 10);   // head
    g.fillRect(sx+9, sy+14, 14, 10);   // body
    g.fillRect(sx+9, sy+24, 5, 7);     // left leg
    g.fillRect(sx+18, sy+24, 5, 7);    // right leg
    g.fillStyle(0xffffff, 1);
    g.fillRect(sx+11, sy+6, 3, 3);     // left eye
    g.fillRect(sx+18, sy+6, 3, 3);     // right eye
  }

  update(time, delta) {
    if (this._battleOpen || this._dialogueOpen || this._invOpen) return;

    if (Phaser.Input.Keyboard.JustDown(this.keyI)) { this._openInventory(); return; }
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) { this._tryInteract(); return; }

    this._moveCooldown -= delta;
    if (this._moveCooldown > 0) return;

    const w = G.world;
    let nx = w.px, ny = w.py, moved = false;

    if      (this.cursors.left.isDown  || this.wasd.A.isDown) { nx--; moved = true; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { nx++; moved = true; }
    else if (this.cursors.up.isDown    || this.wasd.W.isDown) { ny--; moved = true; }
    else if (this.cursors.down.isDown  || this.wasd.S.isDown) { ny++; moved = true; }

    if (!moved) return;
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return;
    if (!WALKABLE(MAP[ny][nx])) return;

    w.px = nx; w.py = ny;
    w.steps++;
    this._moveCooldown = 130;

    // Move player sprite
    const tx = nx * TILE + TILE/2, ty = ny * TILE + TILE/2;
    if (this.playerSprite.setPosition) {
      this.playerSprite.setPosition(tx, ty);
    } else {
      // Graphics fallback — redraw
      this._drawPlayerFigure(this.playerSprite, nx*TILE, ny*TILE);
    }

    // Camera follow target
    this._camTarget = { x: tx, y: ty };
    this.cameras.main.centerOn(tx, ty);

    this._updateZoneLabel();
    this._renderHUD();

    // Random encounter
    const tile = MAP[ny][nx];
    if (ENCOUNTER_TILE(tile) && w.encounterCooldown === 0) {
      const zone = getZone(nx, ny);
      const rate = tile === T.TALL_GRASS ? zone.rate * 1.5 : zone.rate;
      if (Math.random() < rate) {
        w.encounterCooldown = 10;
        this._triggerEncounter(zone);
        return;
      }
    }
    if (w.encounterCooldown > 0) w.encounterCooldown--;
  }

  // ── ENCOUNTER ──
  _triggerEncounter(zone) {
    this._battleOpen = true;
    const enemy = this._pickEnemy(zone.tier);
    G.world.journal.push(`${zone.name}: encountered ${enemy.name}.`);

    this.cameras.main.flash(300, 0, 0, 0);
    this.cameras.main.shake(200, 0.005);

    setTimeout(() => {
      startBattle({
        party:    G.party.map(n => ({ ...n })),
        enemy,
        potions:  G.world.potions,
        zoneName: zone.name,
        onEnd: (result) => {
          G.world.potions = result.potions;
          if (result.type === 'victory') {
            G.world.gold += result.gold;
            G.world.battlesWon++;
            G.world.journal.push(`Defeated ${enemy.name}. +${result.gold} G.`);
          } else {
            G.world.journal.push(`Defeated by ${enemy.name} in ${zone.name}.`);
          }
          // Sync HP/MP back
          result.party.forEach((bp, i) => {
            if (!G.party[i]) return;
            G.party[i].hp = bp.hp;
            G.party[i].mp = bp.mp;
            G.party[i].alive = bp.alive;
          });
          // Revive KO'd; partial recovery for survivors
          G.party.forEach(n => {
            if (!n.alive) { n.alive = true; n.hp = Math.max(1, Math.floor(n.maxHp * 0.1)); }
            else {
              n.hp = Math.min(n.maxHp, n.hp + Math.floor(n.maxHp * 0.12));
              n.mp = Math.min(n.maxMp, n.mp + Math.floor(n.maxMp * 0.25));
            }
          });
          this._renderHUD();
        }
      });
    }, 350);
  }

  _pickEnemy(tier) {
    // Filter to tier range, with small chance of harder enemy
    const pool = ENEMY_POOL.filter(e => {
      const idx = ENEMY_POOL.indexOf(e);
      return idx <= tier * 2 + 1;
    });
    // Weight toward current tier but allow ±1
    const candidates = pool.filter((_, i) => {
      if (i === tier * 2 || i === tier * 2 + 1) return true;  // current tier
      if (i === Math.max(0, tier*2-1)) return Math.random() < 0.3; // easier
      if (i === tier*2+2) return Math.random() < 0.15;             // harder
      return false;
    });
    const pick = candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : pool[0];
    const psc  = 0.55 + G.party.length * 0.09;
    return { ...pick, maxHp: Math.round(pick.hpBase*psc), hp: Math.round(pick.hpBase*psc), atk: Math.round(pick.atkBase*psc) };
  }

  // ── INTERACT ──
  _tryInteract() {
    const w  = G.world;
    const adj = [[w.px,w.py-1],[w.px,w.py+1],[w.px-1,w.py],[w.px+1,w.py],[w.px,w.py]];
    for (const [tx,ty] of adj) {
      const npc = NPC_DEFS.find(n => n.x===tx && n.y===ty);
      if (npc) { this._openDialogue(npc.name, npc.text); return; }
      const tile = MAP[ty]?.[tx];
      if (tile === T.SIGN) {
        this._openDialogue('SIGNPOST', 'You stand at the town crossroads.\n↑ Dark Forest (danger: high)\n↓ Coin Caves (danger: high)\n← Normie Plains (safe)\n→ Normie Plains (safe)');
        return;
      }
      if (tile === T.INN) {
        // Actually heal the party
        G.party.forEach(n => { n.hp = n.maxHp; n.mp = n.maxMp; n.alive = true; });
        this._renderHUD();
        this._openDialogue('INNKEEPER FREN', 'Your Normies have been fully restored. Sweet dreams, fren. (Full HP & MP restored!)');
        return;
      }
      if (tile === T.SHOP) {
        const cost = 15;
        if (G.world.gold >= cost) {
          G.world.gold -= cost;
          G.world.potions += 2;
          this._renderHUD();
          this._openDialogue('CHAD VENDOR', `Sold you 2 potions for ${cost}G. You now have ${G.world.potions} potions. Based transaction.`);
        } else {
          this._openDialogue('CHAD VENDOR', `Potions cost ${cost}G. You only have ${G.world.gold}G. Win some battles, fren.`);
        }
        return;
      }
    }
  }

  // ── DIALOGUE ──
  _openDialogue(name, text) {
    this._dialogueOpen = true;
    document.getElementById('dialogue-name').textContent = name;
    document.getElementById('dialogue-text').textContent = text;
    document.getElementById('dialogue').style.display = 'block';
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
    document.getElementById('hud').style.display   = 'flex';
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
      const hpP = Math.max(0, n.hp/n.maxHp*100);
      const mpP = Math.max(0, n.mp/n.maxMp*100);
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

  _updateZoneLabel() {
    const z = getZone(G.world.px, G.world.py);
    document.getElementById('zone-label').textContent = z.name;
  }
}

// ════════════════════════════════════════════════════════
// PHASER GAME — CANVAS renderer (avoids WebGL framebuffer issues entirely)
// ════════════════════════════════════════════════════════
function launchPhaser() {
  if (G.game) { G.game.destroy(true); G.game = null; G.scene = null; }

  const HUD_H = 80;
  const W = window.innerWidth;
  const H = window.innerHeight - HUD_H;

  G.game = new Phaser.Game({
    type: Phaser.CANVAS,          // ← Canvas, not AUTO/WebGL — no framebuffer issues
    width:  W,
    height: H,
    parent: 'phaser-canvas-wrap', // render into inner div, HUD stays outside
    backgroundColor: '#f2f2f2',
    pixelArt: true,
    roundPixels: true,
    scene: [OverworldScene],
    scale: {
      mode:       Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // No audio
    audio: { noAudio: true },
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

  const makePotionCard = () => {
    const el = document.createElement('div'); el.className = 'inv-item';
    el.innerHTML = `<div class="inv-item-name">⬜ Potion</div>
      <div class="inv-item-desc">Restores 35% HP to most injured member. Buy at the shop in town for 15G.</div>
      <div class="inv-item-qty">Qty: ${G.world.potions}</div>`;
    return el;
  };
  grid.appendChild(makePotionCard());

  if (G.world.gold > 0 || G.world.battlesWon > 0) {
    const goldEl = document.createElement('div'); goldEl.className = 'inv-item';
    goldEl.innerHTML = `<div class="inv-item-name">◆ Gold</div>
      <div class="inv-item-desc">Earned from battle. Spend at the shop. ${G.world.battlesWon} battles won.</div>
      <div class="inv-item-qty">${G.world.gold} G</div>`;
    grid.appendChild(goldEl);
  }
  itemsEl.appendChild(grid);

  // Party status
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
      <div class="party-card-type">${n.type} · Lv${n.lv} · Pixels ${n.px} · ${n.alive ? '✓ Alive' : '✕ KO'}</div>
      <div class="party-card-stats">
        HP ${n.hp}/${n.maxHp} · MP ${n.mp}/${n.maxMp}<br>
        Basic ${n.atkBasic} · ${n.sk1} ${n.atkSkill} · ${n.sk2} ${n.atkUltimate}<br>
        DEF ${n.def} · SPD ${n.spd}
      </div>
      <div class="stat-bar-row"><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${hpP}%"></div></div><div class="stat-val">${n.hp}/${n.maxHp} HP</div></div>
      <div class="stat-bar-row"><div class="stat-bar-wrap"><div class="stat-bar-mp-fill" style="width:${mpP}%"></div></div><div class="stat-val">${n.mp}/${n.maxMp} MP</div></div>`;
    card.append(img, info);
    partyEl.appendChild(card);
  });

  // Journal
  const jEl = document.getElementById('inv-journal');
  jEl.style.cssText = 'font-size:11px;color:#888;line-height:1.9;white-space:pre-line';
  jEl.textContent = G.world.journal.length
    ? G.world.journal.slice(-12).reverse().join('\n')
    : 'No entries yet. Start exploring!';
}

// ════════════════════════════════════════════════════════
// PARTY SELECT UI
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
      nm.className = 'slot-name';
      nm.textContent = n.name.replace(/^Normie /, '#');
      // Show HP stat
      const st = document.createElement('div');
      st.style.cssText = 'font-size:8px;color:#aaa;margin-top:2px';
      st.textContent = `HP ${n.maxHp} · Lv${n.lv}`;
      slot.append(rm, img, nm, st);
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
    // Show normiecard stats
    card.innerHTML += `
      <div class="ncard-id">${n.name.replace(/^Normie /, '#')}</div>
      <div class="ncard-type">${n.type} · Lv${n.lv}</div>
      <div class="ncard-stats">HP ${n.maxHp} · ${n.sk1} ${n.atkSkill}</div>`;
    if (!inParty) card.onclick = () => {
      if (G.party.length >= MAX_PARTY) return;
      G.party.push({ ...n });
      renderSlots(); renderGrid();
    };
    grid.appendChild(card);
  });
}

// ════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {

  // MetaMask connect
  document.getElementById('btn-connect').onclick = async () => {
    const btn = document.getElementById('btn-connect');
    btn.disabled = true; btn.textContent = 'Connecting…';
    try {
      const { provider, address } = await connectWallet();
      G.provider = provider; G.address = address; G.demo = false;
      const el = document.getElementById('wallet-address');
      el.textContent = address; el.style.display = 'block';
      btn.textContent = 'Loading NFTs…';
      showPanel('party'); renderGrid();
      G.collection = await loadWalletNormies(address, provider, col => { G.collection = col; renderGrid(); });
      renderGrid(); btn.textContent = 'Connected';
    } catch (e) {
      btn.textContent = 'Failed — retry'; btn.disabled = false; console.error(e);
    }
  };

  // Demo mode
  document.getElementById('btn-demo').onclick = async () => {
    G.demo = true; G.collection = [];
    document.getElementById('demo-badge').style.display = 'inline-block';
    showPanel('party'); renderGrid();
    G.collection = await loadDemoNormies(col => { G.collection = col; renderGrid(); });
    renderGrid();
  };

  document.getElementById('btn-back-connect').onclick = () => showPanel('connect');

  // Enter world — reset world state and launch Phaser
  document.getElementById('btn-explore').onclick = () => {
    if (!G.party.length) return;
    G.world = { gold:0, potions:3, steps:0, battlesWon:0, journal:[], px:25, py:25, encounterCooldown:0 };
    G.party.forEach(n => { n.hp = n.maxHp; n.mp = n.maxMp; n.alive = true; });

    // Hide all panels, show game container
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    launchPhaser();
  };

  // Battle action buttons
  document.getElementById('btn-atk').onclick   = () => window.__battleAct('attack');
  document.getElementById('btn-skill').onclick  = () => window.__battleAct('skill');
  document.getElementById('btn-ult').onclick    = () => window.__battleAct('ult');
  document.getElementById('btn-pot').onclick    = () => window.__battleAct('potion');

  // Battle result
  document.getElementById('btn-result-world').onclick = () => {
    closeBattle();
    if (G.scene) G.scene._battleOpen = false;
  };
  document.getElementById('btn-result-party').onclick = () => {
    closeBattle();
    G.party.forEach(n => { n.hp = n.maxHp; n.mp = n.maxMp; n.alive = true; });
    if (G.game) { G.game.destroy(true); G.game = null; G.scene = null; }
    document.getElementById('game-container').style.display = 'none';
    showPanel('party'); renderSlots(); renderGrid();
  };

  // Dialogue close
  document.getElementById('dialogue-close').onclick = () => {
    if (G.scene) G.scene._closeDialogue();
  };

  // Inventory close
  document.getElementById('btn-close-inv').onclick = () => {
    if (G.scene) G.scene._closeInventory();
  };

  // Resize
  window.addEventListener('resize', () => {
    if (G.game) G.game.scale.resize(window.innerWidth, window.innerHeight - 80);
  });
});
