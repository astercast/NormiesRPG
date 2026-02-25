// game.js — Normies RPG v4
// Real pixel art tiles • NPC Normies from on-chain API • AAA rendering

import { fetchNormieFull, makeDemoNormie, makeSvgFallback, mkRng, calcStats, getPixelCanvas, renderPixelsToCanvas } from './normie-api.js';
import { connectWallet, loadWalletNormies, loadDemoNormies } from './wallet.js';
import { TileID, getTile, tickTiles, preloadAllTiles, TILE_SIZE, tilesReady } from './tiles.js';

const TS = TILE_SIZE;
const MAP_W = 64, MAP_H = 64, MAX_PARTY = 5;
const T = TileID;

// ── ZONES ──
const ZONES = [
  { name:'NORMIE PLAINS', x0:0,  x1:36, y0:0,  y1:36, tier:0, rate:0.11 },
  { name:'DARK FOREST',   x0:36, x1:64, y0:0,  y1:30, tier:1, rate:0.20 },
  { name:'COIN CAVES',    x0:0,  x1:30, y0:36, y1:64, tier:2, rate:0.22 },
  { name:'RUGGED LANDS',  x0:30, x1:64, y0:30, y1:64, tier:3, rate:0.26 },
];
const getZone = (tx,ty) => ZONES.find(z=>tx>=z.x0&&tx<z.x1&&ty>=z.y0&&ty<z.y1)||ZONES[0];

// ── NPC DEFINITIONS — real Normie IDs from the contract ──
const NPC_DEFS = [
  { id:1,    x:32, y:30, role:'ELDER',     name:'ELDER NORM',      lines:[
    'Each Normie is 1,600 bits on Ethereum. 40×40 pixels. Entirely on-chain.',
    'Type determines your combat style. Humans are balanced. Cats are fast. Aliens have the most MP. Agents have the most DEF.',
    'Pixel Count determines HP. The more pixels, the more HP. Rarer Normies are tougher.',
  ]},
  { id:7,    x:30, y:32, role:'VENDOR',    name:'CHAD VENDOR',     shop:true, lines:[
    'Potions: 2 for 15 Gold. On-chain brewed. No middlemen.',
    'Gold Chain gives +3 MP. VR Headset gives +4 MP. Know your accessories before battle.',
    'Best combo for the Rugged Lands: Agent with Hoodie. Nearly unkillable.',
  ]},
  { id:42,   x:33, y:31, role:'INN',       name:'INNKEEPER FREN',  inn:true, lines:[
    'Full HP and MP restore, free. That\'s what frens are for.',
    'Rest here after the Dark Forest. The Cope Lord hits very hard.',
  ]},
  { id:100,  x:16, y:31, role:'DEGEN',     name:'DEGEN TRAVELER',  lines:[
    'I went into the Coin Caves without potions. Lost my whole party. Don\'t.',
    'Confident-expression Normies crit at 12%. Check your expressions in the bag.',
    'The Rugged Lands are not a joke. Bring all 5 Normies.',
  ]},
  { id:256,  x:31, y:16, role:'SCOUT',     name:'COPE SCOUT',      lines:[
    'The Dark Forest gives me bad vibes. The Cope Lord is in there. Seething.',
    'Aliens are best against The Void. Void Gaze bypasses 60% of DEF.',
    'Any Normie with Confident expression crits at 12%. Build your team around crits.',
  ]},
  { id:420,  x:15, y:47, role:'MINER',     name:'DIAMOND MINER',   lines:[
    'The Gas Fee Demon burns through HP like ETH during NFT season. Bring an Agent.',
    'FUD Specter has the highest SPD in tier 2. Kill it first turn or it will lap you.',
    'The caves pay well. Enough gold for potions before the Rugged Lands.',
  ]},
  { id:888,  x:47, y:31, role:'GM',        name:'WANDERING GM',    lines:[
    'gm. The dark green tiles are tall grass — higher encounter rate than normal grass.',
    'Stay on the stone paths to avoid battles while traveling between zones.',
    'I have been walking for 10,000 steps since genesis. Still bullish.',
  ]},
  { id:1000, x:12, y:12, role:'HERMIT',    name:'FOREST HERMIT',   lines:[
    'I have lived in this forest since the last bear market. The trees don\'t FUD.',
    'Cope Lord gets stronger each time you miss. Use your most accurate moves first.',
    'Protocol 47 and Normie Stare bypass 60% of enemy DEF. Save them for high-DEF targets.',
  ]},
  { id:3333, x:55, y:55, role:'RONIN',     name:'RUGGED RONIN',    lines:[
    'The Rugpuller waits in the south-east corner of the Rugged Lands. It is not bluffing.',
    'The Bearmarkt: 560 base HP scaled to your party size. Bring all five Normies or stay home.',
    'Beat the Bearmarkt and you are a legend. Normie mastery achieved.',
  ]},
  { id:9999, x:8,  y:50, role:'ARCHIVIST', name:'CAVE ARCHIVIST',  lines:[
    'I have indexed every Normie. The rarest ones have over 700 pixels. +70 base HP.',
    'VR Headset + Alien type = maximum MP. 10 + Lv×2 + 4 (Alien) + 4 (VR). All Ultimates all day.',
    'Bandana gives +1 DEF and +1 SPD. Underrated. Most people sleep on the Bandana.',
  ]},
];

// Loaded NPC normie data: id → { name, pixels, pixelCanvas, ... }
const npcData = {};
// In-world NPC pixel canvases rendered at TS size
const npcCanvas = {}; // id → HTMLCanvasElement (32×32)

// ── ENEMIES ──
const ENEMIES = [
  { id:'wild',  name:'WILD NORMIE',   seed:101, hpBase:75,  atkBase:13, def:1,  spd:6,  lore:'A stray on-chain Normie, separated from its wallet. Confused but surprisingly resilient.' },
  { id:'paper', name:'PAPER HAND',    seed:212, hpBase:62,  atkBase:17, def:0,  spd:10, lore:'Sold the bottom and never forgave itself. Attacks in cascading waves of panic.' },
  { id:'void',  name:'THE VOID',      seed:1001,hpBase:145, atkBase:22, def:3,  spd:7,  lore:'Pure negative sentiment given physical form. First appeared during a bear market.' },
  { id:'cope',  name:'COPE LORD',     seed:2002,hpBase:210, atkBase:28, def:5,  spd:9,  lore:'Master of seething and malding. Grows stronger every time you miss.' },
  { id:'gas',   name:'GAS FEE DEMON', seed:3003,hpBase:285, atkBase:36, def:7,  spd:13, lore:'Spawned from peak congestion. Burns HP like ETH during NFT season.' },
  { id:'fud',   name:'FUD SPECTER',   seed:3444,hpBase:240, atkBase:32, def:6,  spd:16, lore:'Spreads disinformation as combat strategy. Impossible to predict.' },
  { id:'rug',   name:'RUGPULLER',     seed:4004,hpBase:420, atkBase:48, def:11, spd:15, lore:'Gives liquidity then takes it away. The most feared entity in the overworld.' },
  { id:'bear',  name:'BEARMARKT',     seed:5005,hpBase:560, atkBase:62, def:17, spd:19, lore:'Ancient. Inevitable. 550 base HP. Arrives when prices are at their lowest.' },
];

function pickEnemy(tier, ps) {
  const lo = tier*2, hi = Math.min(lo+1, ENEMIES.length-1);
  const def = ENEMIES[lo + Math.floor(Math.random()*(hi-lo+1))];
  const sc = 0.55 + ps*0.09;
  return { ...def, maxHp:Math.round(def.hpBase*sc), hp:Math.round(def.hpBase*sc), atk:Math.round(def.atkBase*sc) };
}

// ── MAP GENERATION ──
let MAP = null, MSHADOW = null;

function generateMap() {
  const r = mkRng(9371);
  MAP = Array.from({length:MAP_H}, () => new Array(MAP_W).fill(T.GRASS));
  MSHADOW = Array.from({length:MAP_H}, () => new Array(MAP_W).fill(0));

  // Borders
  for (let x=0;x<MAP_W;x++) { MAP[0][x]=T.WALL; MAP[MAP_H-1][x]=T.WALL; }
  for (let y=0;y<MAP_H;y++) { MAP[y][0]=T.WALL; MAP[y][MAP_W-1]=T.WALL; }

  // Terrain variety
  for (let y=2;y<MAP_H-2;y++) for (let x=2;x<MAP_W-2;x++) {
    const v = r();
    if      (v < 0.08) MAP[y][x] = T.TALL;
    else if (v < 0.13) MAP[y][x] = T.TREE;
    else if (v < 0.21) MAP[y][x] = T.GRASS2;
    else if (v < 0.27) MAP[y][x] = T.GRASS3;
    else if (v < 0.30) MAP[y][x] = T.GRASS4;
  }

  // Water lakes (irregular)
  const lakes = [[5,4,6,5],[48,3,5,4],[3,46,7,4],[52,48,6,5],[38,24,4,4],[14,18,5,3],[56,14,4,3],[26,52,4,3]];
  lakes.forEach(([wx,wy,ww,wh]) => {
    for (let dy=-1;dy<wh+1;dy++) for (let dx=-1;dx<ww+1;dx++) {
      const tx=wx+dx, ty=wy+dy;
      if (tx<1||ty<1||tx>=MAP_W-1||ty>=MAP_H-1) continue;
      const dist = Math.min(dx+1, ww-dx, dy+1, wh-dy);
      if (dist >= 1) MAP[ty][tx] = T.WATER;
    }
  });

  // Paths
  for (let x=1;x<MAP_W-1;x++) MAP[32][x] = T.PATH;
  for (let y=1;y<MAP_H-1;y++) MAP[y][32] = T.PATH;
  for (let x=4;x<58;x++) MAP[16][x] = T.PATH;
  for (let x=4;x<30;x++) MAP[48][x] = T.PATH;
  for (let y=16;y<48;y++) MAP[y][16] = T.PATH;
  for (let y=4;y<32;y++) MAP[y][48] = T.PATH;
  for (let y=32;y<58;y++) MAP[y][48] = T.PATH;

  // Dark Forest — dense trees
  for (let y=2;y<28;y++) for (let x=38;x<62;x++) {
    if (r() < 0.40) MAP[y][x] = r()<0.4 ? T.TREE_DARK : T.TREE;
    else if (r() < 0.08) MAP[y][x] = T.TALL;
  }

  // Coin Caves — rocky
  for (let y=38;y<62;y++) for (let x=2;x<28;x++) {
    if ([T.GRASS,T.GRASS2].includes(MAP[y][x]) && r()<0.20) MAP[y][x] = T.CAVE;
  }

  // Town center
  for (let dy=-6;dy<=6;dy++) for (let dx=-6;dx<=6;dx++) {
    MAP[32+dy][32+dx] = Math.max(Math.abs(dy),Math.abs(dx))<=4 ? T.TOWN : T.PATH;
  }

  // Buildings
  [[28,33],[28,34],[29,33],[29,34]].forEach(([y,x]) => MAP[y][x] = T.INN);
  [[34,28],[34,29],[35,28],[35,29]].forEach(([y,x]) => MAP[y][x] = T.SHOP);
  [[31,32],[33,32],[32,31],[32,33]].forEach(([y,x]) => MAP[y][x] = T.SIGN);
  [[28,32],[29,35]].forEach(([y,x]) => MAP[y][x] = T.TORCH);

  // Shadow map (trees cast shadows SE)
  for (let y=1;y<MAP_H-1;y++) for (let x=1;x<MAP_W-1;x++) {
    const t = MAP[y][x];
    if (t===T.TREE || t===T.TREE_DARK) {
      if (MAP[y+1]?.[x] && ![T.TREE,T.TREE_DARK,T.WALL].includes(MAP[y+1][x])) MSHADOW[y+1][x]=2;
      if (MAP[y]?.[x+1] && ![T.TREE,T.TREE_DARK,T.WALL].includes(MAP[y][x+1])) MSHADOW[y][x+1]=1;
    }
    if (t===T.WALL && MAP[y+1]?.[x]) MSHADOW[y+1][x]=3;
  }

  // Clear NPC positions
  NPC_DEFS.forEach(n => {
    if (MAP[n.y]?.[n.x] !== undefined) {
      if ([T.TREE,T.TREE_DARK,T.WALL,T.WATER,T.CAVE].includes(MAP[n.y][n.x]))
        MAP[n.y][n.x] = T.PATH;
    }
  });

  // Re-stamp town
  for (let dy=-4;dy<=4;dy++) for (let dx=-4;dx<=4;dx++) MAP[32+dy][32+dx]=T.TOWN;
  [[28,33],[28,34],[29,33],[29,34]].forEach(([y,x]) => MAP[y][x]=T.INN);
  [[34,28],[34,29],[35,28],[35,29]].forEach(([y,x]) => MAP[y][x]=T.SHOP);
  [[31,32],[33,32],[32,31],[32,33]].forEach(([y,x]) => MAP[y][x]=T.SIGN);
  [[28,32],[29,35]].forEach(([y,x]) => MAP[y][x]=T.TORCH);
}

const WALK  = t => ![T.WALL,T.TREE,T.TREE_DARK,T.WATER,T.CAVE].includes(t);
const ENCTR = t => [T.GRASS,T.GRASS2,T.GRASS3,T.GRASS4,T.TALL].includes(t);

// ── GLOBAL STATE ──
const G = {
  collection:[], party:[], demo:false,
  world:{ gold:0, potions:3, steps:0, battlesWon:0, journal:[], px:32, py:32, eCooldown:0 },
  screen:'title', imgCache:{},
};

// ── CANVAS + CAMERA ──
let wC, wX;
let camX=0, camY=0;
let keys={}, moveCd=0;
let dlgOpen=false, batOpen=false, bagOpen=false;
let lastT=0, rafId=null;

function initCanvas() {
  wC = document.getElementById('world-canvas');
  wX = wC.getContext('2d');
  wX.imageSmoothingEnabled = false;
  resz();
  window.addEventListener('resize', resz);
  window.addEventListener('keydown', e => { keys[e.code]=true; hkey(e); });
  window.addEventListener('keyup',   e => { keys[e.code]=false; });
  wC.addEventListener('click', () => { if(dlgOpen) closeDlg(); });
}

function resz() {
  wC.width  = window.innerWidth;
  wC.height = window.innerHeight - 76;
  wX.imageSmoothingEnabled = false;
}

// ── MAIN DRAW ──
function draw() {
  if (!wX || !MAP) return;
  const ctx=wX, W=wC.width, H=wC.height;
  tickTiles(16);

  // Smooth camera chase
  const tcx = Math.max(0, Math.min(G.world.px*TS+TS/2-W/2, MAP_W*TS-W));
  const tcy = Math.max(0, Math.min(G.world.py*TS+TS/2-H/2, MAP_H*TS-H));
  camX += (tcx-camX)*0.14;
  camY += (tcy-camY)*0.14;

  ctx.clearRect(0,0,W,H);
  const ox=Math.round(camX), oy=Math.round(camY);
  const vtx=Math.max(0,Math.floor(ox/TS)-1), vty=Math.max(0,Math.floor(oy/TS)-1);
  const vtw=Math.ceil(W/TS)+3, vth=Math.ceil(H/TS)+3;

  // Pass 1: tiles
  for (let ty=vty;ty<vty+vth&&ty<MAP_H;ty++) {
    for (let tx=vtx;tx<vtx+vtw&&tx<MAP_W;tx++) {
      if (ty<0||tx<0) continue;
      const tile = getTile(MAP[ty][tx]);
      const sx=tx*TS-ox, sy=ty*TS-oy;
      if (tile) ctx.drawImage(tile, sx, sy, TS, TS);
      else { ctx.fillStyle='#6fa832'; ctx.fillRect(sx,sy,TS,TS); }
    }
  }

  // Pass 2: shadows
  for (let ty=vty;ty<vty+vth&&ty<MAP_H;ty++) {
    for (let tx=vtx;tx<vtx+vtw&&tx<MAP_W;tx++) {
      const s=MSHADOW[ty]?.[tx];
      if (!s) continue;
      ctx.fillStyle=['','rgba(0,0,0,0.15)','rgba(0,0,0,0.30)','rgba(0,0,0,0.48)'][s];
      ctx.fillRect(tx*TS-ox, ty*TS-oy, TS, TS);
    }
  }

  // Pass 3: NPC Normies — rendered pixel-by-pixel from on-chain data
  NPC_DEFS.forEach(npc => {
    const sx=npc.x*TS-ox, sy=npc.y*TS-oy;
    if (sx<-TS||sy<-TS||sx>W+TS||sy>H+TS) return;
    drawNpc(ctx, npc, sx, sy);
  });

  // Pass 4: Player
  drawPlayer(ctx, G.world.px*TS-ox, G.world.py*TS-oy);

  // Pass 5: Zone vignette
  const zone=getZone(G.world.px, G.world.py);
  const vc = zone.tier===1?'rgba(10,20,5,0.20)' : zone.tier===2?'rgba(5,5,20,0.22)' : zone.tier===3?'rgba(20,5,5,0.25)' : 'rgba(0,0,0,0.08)';
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.9);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,vc);
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}

// ── NPC RENDERING — uses on-chain pixel data ──
function drawNpc(ctx, npc, sx, sy) {
  const nd = npcData[npc.id];

  // Ground shadow
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(sx+TS/2, sy+TS-3, 9, 3, 0, 0, Math.PI*2); ctx.fill();

  // Slight bob animation
  const bob = Math.sin(Date.now()*0.003+npc.id*0.7)*1.8;

  if (npcCanvas[npc.id]) {
    // Real on-chain pixel art — upscale 40×40 → 28×28 within the tile
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(npcCanvas[npc.id], sx+2, sy+2+bob, TS-4, TS-4);
  } else if (nd?.image) {
    // SVG fallback while pixels load
    const img = G.imgCache[npc.id];
    if (img && img.complete) {
      ctx.drawImage(img, sx+2, sy+2+bob, TS-4, TS-4);
    } else {
      drawFallbackNpc(ctx, sx, sy+bob, npc.id);
    }
  } else {
    drawFallbackNpc(ctx, sx, sy+bob, npc.id);
  }

  // Name tag
  const roleColors = {
    ELDER:'#f8d060', VENDOR:'#60d8a8', INN:'#60a8f8', DEGEN:'#e08060',
    SCOUT:'#a0e060', MINER:'#d0c060', GM:'#c0a0f8', HERMIT:'#a0b8a0',
    RONIN:'#f06060', ARCHIVIST:'#80c0c8',
  };
  const label = nd ? `#${npc.id}` : npc.name.split(' ')[0];
  drawNameTag(ctx, sx+TS/2, sy-1, label, roleColors[npc.role]||'#f0f0f0');
}

function drawNameTag(ctx, cx, cy, text, color) {
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const tw = ctx.measureText(text).width + 8;
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(Math.round(cx-tw/2-1), cy-13, tw+2, 12);
  ctx.fillStyle = color;
  ctx.fillText(text, cx, cy-2);
}

function drawFallbackNpc(ctx, sx, sy, seed) {
  // Minimal pixel figure while loading
  ctx.fillStyle='#ffe066';
  ctx.fillRect(sx+9,sy+6,14,12);
  ctx.fillRect(sx+8,sy+18,16,10);
  ctx.fillStyle='#333';
  ctx.fillRect(sx+11,sy+9,3,3); ctx.fillRect(sx+18,sy+9,3,3);
  ctx.fillStyle='#ffe066';
  ctx.fillRect(sx+9,sy+28,5,7); ctx.fillRect(sx+18,sy+28,5,7);
}

// ── PLAYER RENDERING — renders lead Normie pixel art ──
function drawPlayer(ctx, sx, sy) {
  const lead = G.party[0];

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(sx+TS/2, sy+TS-2, 10, 4, 0, 0, Math.PI*2); ctx.fill();

  if (lead && npcCanvas[`player_${lead.id}`]) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(npcCanvas[`player_${lead.id}`], sx, sy, TS, TS);
    // Highlight ring
    ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=1;
    ctx.strokeRect(sx, sy, TS, TS);
  } else if (lead && G.imgCache[lead.id]?.complete) {
    ctx.drawImage(G.imgCache[lead.id], sx, sy, TS, TS);
    ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=1;
    ctx.strokeRect(sx, sy, TS, TS);
  } else {
    ctx.fillStyle='#48494b';
    ctx.fillRect(sx+10,sy+4,12,10); ctx.fillRect(sx+9,sy+14,14,10);
    ctx.fillRect(sx+9,sy+24,5,8);   ctx.fillRect(sx+18,sy+24,5,8);
    ctx.fillStyle='#e3e5e4';
    ctx.fillRect(sx+11,sy+6,3,3);   ctx.fillRect(sx+18,sy+6,3,3);
    ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1;
    ctx.strokeRect(sx+9,sy+4,14,20);
  }
}

// ── BUILD PLAYER PIXEL CANVAS ──
function buildPlayerCanvas(normie) {
  if (!normie.pixels) return;
  const c = document.createElement('canvas');
  c.width = c.height = TS;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Scale 40×40 pixel string to 32×32 canvas
  const scale = TS / 40;
  ctx.fillStyle = '#e3e5e4'; ctx.fillRect(0,0,TS,TS);
  ctx.fillStyle = '#48494b';
  for (let i=0;i<1600;i++) {
    if (normie.pixels[i]==='1') {
      const px = (i%40)*scale, py = Math.floor(i/40)*scale;
      ctx.fillRect(px, py, scale, scale);
    }
  }
  npcCanvas[`player_${normie.id}`] = c;
}

// ── BUILD NPC PIXEL CANVAS (from on-chain pixels string) ──
function buildNpcCanvas(id, pixelStr) {
  const c = document.createElement('canvas');
  c.width = c.height = TS;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const scale = TS / 40;
  ctx.fillStyle = '#e3e5e4'; ctx.fillRect(0,0,TS,TS);
  ctx.fillStyle = '#48494b';
  for (let i=0;i<1600;i++) {
    if (pixelStr[i]==='1') {
      const px = (i%40)*scale, py = Math.floor(i/40)*scale;
      ctx.fillRect(px, py, scale, scale);
    }
  }
  npcCanvas[id] = c;
  return c;
}

// ── GAME LOOP ──
function gloop(ts=0) {
  const dt=Math.min(ts-lastT,50); lastT=ts;
  if (!batOpen && !bagOpen) { moveCd-=dt; move(); draw(); }
  rafId = requestAnimationFrame(gloop);
}

function move() {
  if (dlgOpen||moveCd>0) return;
  const w=G.world; let nx=w.px,ny=w.py,mv=false;
  if (keys['ArrowLeft']||keys['KeyA'])  { nx--; mv=true; }
  else if (keys['ArrowRight']||keys['KeyD']) { nx++; mv=true; }
  else if (keys['ArrowUp']||keys['KeyW'])    { ny--; mv=true; }
  else if (keys['ArrowDown']||keys['KeyS'])  { ny++; mv=true; }
  if (!mv) return;
  if (nx<0||ny<0||nx>=MAP_W||ny>=MAP_H) return;
  if (!WALK(MAP[ny][nx])) return;
  w.px=nx; w.py=ny; w.steps++; moveCd=130;
  updZone(); renderHUD();
  const t=MAP[ny][nx];
  if (ENCTR(t) && w.eCooldown===0) {
    const z=getZone(nx,ny), rt=t===T.TALL?z.rate*1.6:z.rate;
    if (Math.random()<rt) { w.eCooldown=12; encounter(z); return; }
  }
  if (w.eCooldown>0) w.eCooldown--;
}

function hkey(e) {
  if (batOpen) return;
  if (e.code==='KeyE'||e.code==='Enter') { if(dlgOpen){closeDlg();return;} interact(); }
  if (e.code==='KeyI'||e.code==='Escape') { if(bagOpen){closeBag();return;} if(dlgOpen){closeDlg();return;} openBag(); }
}

function interact() {
  const w=G.world;
  for (const [tx,ty] of [[w.px,w.py],[w.px,w.py-1],[w.px,w.py+1],[w.px-1,w.py],[w.px+1,w.py]]) {
    const npc=NPC_DEFS.find(n=>n.x===tx&&n.y===ty);
    if (npc) {
      let txt=npc.lines[Math.floor(Math.random()*npc.lines.length)];
      const nd=npcData[npc.id], spk=nd?nd.name:npc.name;
      if (npc.inn) {
        G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
        renderHUD();
        txt=`Full HP & MP restored!\n\nAll Normies are at peak power. You have ${G.world.potions} potions.`;
      }
      if (npc.shop) {
        const cost=15;
        if (G.world.gold>=cost) { G.world.gold-=cost; G.world.potions+=2; renderHUD(); txt=`Sold you 2 potions for ${cost}G. Total: ${G.world.potions}.\nBased transaction. Stay safe out there.`; }
        else txt=`2 Potions cost ${cost}G. You only have ${G.world.gold}G.\nWin some battles and come back.`;
      }
      openDlg(spk, txt, npc.id);
      return;
    }
    const tile=MAP[ty]?.[tx];
    if (tile===T.SIGN) {
      openDlg('SIGNPOST',
        '↑ DARK FOREST   — tier 1 enemies\n↓ COIN CAVES    — tier 2 enemies\n← NORMIE PLAINS — starter zone\n→ RUGGED LANDS  — tier 3 (hardest)\n\n[ Inn ]  Full HP & MP restore — free\n[ Shop ] 2 Potions for 15 Gold', null);
      return;
    }
  }
}

// ── DIALOGUE ──
function openDlg(spk, txt, npcId=null) {
  dlgOpen=true;
  document.getElementById('dlg-speaker').textContent=spk;
  document.getElementById('dlg-text').textContent=txt;
  const p=document.getElementById('dlg-portrait');
  // Show the NPC's pixel art in the portrait box
  if (npcId!==null && npcCanvas[npcId]) {
    p.src=npcCanvas[npcId].toDataURL();
    p.style.display='block';
  } else if (npcId!==null && G.imgCache[npcId]?.complete) {
    p.src=G.imgCache[npcId].src;
    p.style.display='block';
  } else {
    p.style.display='none';
  }
  document.getElementById('dialogue').classList.remove('hidden');
}
function closeDlg() {
  dlgOpen=false;
  document.getElementById('dialogue').classList.add('hidden');
}

// ── BATTLE ──
let B = null;

function encounter(zone) {
  batOpen=true;
  const en=pickEnemy(zone.tier, G.party.length);
  G.world.journal.push(`${zone.name}: ${en.name} appeared!`);
  B={party:G.party.map(n=>({...n})), enemy:{...en}, potions:G.world.potions,
     zone, round:1, turn:0, order:null, over:false};
  B.order=[
    ...B.party.filter(n=>n.alive).map(n=>({...n,isPlayer:true})),
    {...B.enemy, isEnemy:true},
  ].sort((a,b)=>b.spd-a.spd);

  drawEnemyArt(document.getElementById('enemy-canvas'), en.seed, 96);
  document.getElementById('enemy-name').textContent=en.name;
  document.getElementById('enemy-lore').textContent=en.lore;
  updEB();
  document.getElementById('bat-zone').textContent=zone.name;
  document.getElementById('bat-log').innerHTML='';
  document.getElementById('battle').classList.remove('hidden');
  document.getElementById('bat-main').classList.remove('hidden');
  document.getElementById('bat-result').classList.add('hidden');
  renderBP(); bLog(`${en.name} appeared!`,'em'); bLog(en.lore,'lore');
  chkET();
}

// Enemy sprite — deterministic pixel art from seed (big, readable, Normies-palette)
function drawEnemyArt(cv, seed, sz=96) {
  const COLS=8,ROWS=14,cw=sz/COLS,ch=sz/ROWS;
  cv.width=sz; cv.height=sz;
  const ctx=cv.getContext('2d');
  const r=mkRng(seed*6271+9337);
  const bm=Array.from({length:ROWS},()=>new Uint8Array(COLS));
  for (let row=0;row<ROWS;row++) {
    for (let col=0;col<4;col++) {
      let p=0.42;
      if (row<=1) p=col<2?0.10:0.66;
      else if (row<=3) p=col<3?0.73:0.20;
      else if (row<=8) p=col>=1?0.82:0.08;
      else if (row<=11) p=(col===1||col===2)?0.90:0.04;
      else p=col===1?0.88:0.02;
      bm[row][col]=r()<p?1:0;
    }
    for (let col=0;col<4;col++) bm[row][7-col]=r()<0.78?bm[row][col]:(r()<0.4?1:0);
  }
  bm[2][2]=1;bm[2][3]=0;bm[2][5]=1;bm[2][4]=0;
  ctx.fillStyle='#e3e5e4'; ctx.fillRect(0,0,sz,sz);
  for (let row=0;row<ROWS;row++) for (let col=0;col<COLS;col++) {
    if (!bm[row][col]) continue;
    const ie=(row===0||!bm[row-1]?.[col])||(row===ROWS-1||!bm[row+1]?.[col])||(col===0||!bm[row][col-1])||(col===COLS-1||!bm[row][col+1]);
    ctx.fillStyle=ie?'#1a1a1a':'#48494b';
    ctx.fillRect(Math.round(col*cw), Math.round(row*ch), Math.ceil(cw)+1, Math.ceil(ch)+1);
  }
}

function bLog(m,c='normal') {
  if (!m) return;
  const l=document.getElementById('bat-log'), d=document.createElement('div');
  d.className='log-'+c; d.textContent=m; l.appendChild(d); l.scrollTop=l.scrollHeight;
}

function renderBP() {
  const cont=document.getElementById('bat-party'); cont.innerHTML='';
  B.party.forEach(n => {
    const act=isTurn(n), div=document.createElement('div');
    div.className='bnorm'+(n.alive?'':' dead')+(act?' active':''); div.id='bn'+n.id;
    // Pixel art portrait
    const pc=npcCanvas[`player_${n.id}`]||npcCanvas[n.id];
    if (pc) {
      const c2=document.createElement('canvas'); c2.width=c2.height=32;
      const x=c2.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(pc,0,0,32,32);
      div.appendChild(c2);
    } else {
      const img=document.createElement('img'); img.src=G.imgCache[n.id]?.src||makeSvgFallback(n.id);
      img.onerror=()=>{img.src=makeSvgFallback(n.id);}; div.appendChild(img);
    }
    div.innerHTML+=`<div class="bnorm-name">${n.name.replace(/^Normie /,'#')}</div>
      <div class="bnorm-type">${n.type}</div>
      <div class="bnorm-bar-wrap"><div class="bnorm-bar-hp" style="width:${Math.max(0,n.hp/n.maxHp*100)}%"></div></div>
      <div class="bnorm-bar-wrap"><div class="bnorm-bar-mp" style="width:${Math.max(0,n.mp/n.maxMp*100)}%"></div></div>
      <div class="bnorm-hp">${n.hp}/${n.maxHp}</div>`;
    cont.appendChild(div);
  });
  updBB();
}

function updEB() {
  const pct=Math.max(0,B.enemy.hp/B.enemy.maxHp*100);
  document.getElementById('enemy-hp-bar').style.width=pct+'%';
  document.getElementById('enemy-hp-text').textContent=`${B.enemy.hp} / ${B.enemy.maxHp} HP`;
}

function isTurn(n) { const t=B.order[B.turn]; return t&&t.isPlayer&&t.id===n.id; }
function curT()    { return B.order[B.turn]; }

function updBB() {
  const c=curT(), dis=!c||c.isEnemy||B.over;
  ['btn-atk','btn-skill','btn-ult','btn-pot'].forEach(id=>document.getElementById(id).disabled=dis);
  const ti=document.getElementById('bat-turn-info');
  if (dis) { ti.textContent=c?.isEnemy?`${B.enemy.name} is acting…`:'—'; return; }
  document.getElementById('btn-skill').disabled=c.mp<3;
  document.getElementById('btn-ult').disabled=c.mp<6;
  document.getElementById('btn-pot').disabled=B.potions<=0;
  document.getElementById('lbl-atk').textContent=`${c.atkBasic}dmg +2MP`;
  document.getElementById('lbl-skill').textContent=`${c.sk1} ${c.atkSkill}dmg 3MP`;
  document.getElementById('lbl-ult').textContent=`${c.sk2} ${c.atkUltimate}dmg 6MP`;
  document.getElementById('lbl-pot').textContent=`×${B.potions} +35%HP`;
  ti.textContent=`${c.name} · ${c.hp}/${c.maxHp}HP · ${c.mp}/${c.maxMp}MP · CRIT ${Math.round(c.crit*100)}%`;
  document.getElementById('bat-action-label').textContent=`${c.name} (${c.type}) — choose action`;
  document.querySelectorAll('.bnorm').forEach(el=>el.classList.remove('active'));
  document.getElementById('bn'+c.id)?.classList.add('active');
}

function rdmg(base, def, crit=0.05) {
  const red=Math.max(1,base-Math.floor(def*0.5));
  const ic=Math.random()<crit;
  return { dmg:Math.max(1,Math.round(red*(0.88+Math.random()*0.24)*(ic?1.6:1))), crit:ic };
}

function fDmg(v, onEnemy, ic=false) {
  const a=document.getElementById('arena'), el=document.createElement('div');
  el.className='fdmg'+(ic?' crit-flash':'');
  el.textContent=(ic?'CRIT! -':'-')+v;
  el.style.cssText=onEnemy
    ?`right:${15+Math.random()*60}px;bottom:${45+Math.random()*50}px;`
    :`left:${15+Math.random()*180}px;bottom:${35+Math.random()*50}px;`;
  a.appendChild(el); setTimeout(()=>el.remove(),750);
}

window.__battleAct = function(tp) {
  if (!B||B.over) return;
  const ac=curT(); if (!ac||ac.isEnemy) return;
  const en=B.enemy;
  if (tp==='attack') {
    const {dmg,crit}=rdmg(ac.atkBasic,en.def,ac.crit);
    en.hp=Math.max(0,en.hp-dmg); ac.mp=Math.min(ac.maxMp,ac.mp+2);
    fDmg(dmg,true,crit); bLog(`${ac.name} attacks — ${dmg}${crit?' CRIT!':''}`,crit?'crit':'normal');
  } else if (tp==='skill') {
    if (ac.mp<3) return; ac.mp-=3;
    const {dmg,crit}=rdmg(ac.atkSkill,en.def,ac.crit);
    en.hp=Math.max(0,en.hp-dmg); fDmg(dmg,true,crit);
    bLog(`${ac.name} — ${ac.sk1}: ${dmg}${crit?' CRIT!':''}`,crit?'crit':'em');
  } else if (tp==='ult') {
    if (ac.mp<6) return; ac.mp-=6;
    const {dmg,crit}=rdmg(ac.atkUltimate,Math.floor(en.def*0.4),ac.crit+0.15);
    en.hp=Math.max(0,en.hp-dmg); fDmg(dmg,true,crit);
    bLog(`${ac.name} — ${ac.sk2}: ${dmg}${crit?' CRIT!':''}!!`,'big');
  } else if (tp==='potion') {
    if (B.potions<=0) return; B.potions--;
    const tgt=B.party.filter(n=>n.alive).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
    if (tgt) { const h=Math.floor(tgt.maxHp*0.35); tgt.hp=Math.min(tgt.maxHp,tgt.hp+h); bLog(`Potion → ${tgt.name} +${h}HP`); }
  }
  const ip=B.party.find(p=>p.id===ac.id); if (ip){ip.mp=ac.mp;ip.hp=ac.hp;}
  renderBP(); updEB(); if (chkEnd()) return; nxtT();
};

function chkET() { if (curT()?.isEnemy) { updBB(); setTimeout(eAct,1050); } }

function eAct() {
  if (!B||B.over) return;
  const alive=B.party.filter(n=>n.alive); if (!alive.length) return;
  const tgt=alive.sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
  const hv=Math.random()>0.72;
  const {dmg,crit}=rdmg(hv?Math.round(B.enemy.atk*1.65):B.enemy.atk, tgt.def, 0.06);
  tgt.hp=Math.max(0,tgt.hp-dmg); if(tgt.hp<=0) tgt.alive=false;
  fDmg(dmg,false,crit);
  bLog(hv?`${B.enemy.name} HEAVY STRIKE — ${dmg}${crit?' CRIT!':''}!!`:`${B.enemy.name} attacks ${tgt.name} — ${dmg}${crit?' CRIT!':''}`,
       hv||crit?'big':'normal');
  renderBP(); updEB(); if (chkEnd()) return; nxtT();
}

function nxtT() {
  B.order.forEach(t=>{ if(t.isPlayer){const p=B.party.find(n=>n.id===t.id);if(p){t.hp=p.hp;t.mp=p.mp;t.alive=p.alive;}} });
  let n=(B.turn+1)%B.order.length;
  for (let i=0;i<B.order.length;i++) {
    const t=B.order[n]; if(t.isEnemy||(t.isPlayer&&t.alive)) break;
    n=(n+1)%B.order.length;
  }
  if (n<=B.turn){B.round++;if(B.round%3===0) bLog(`— Round ${B.round} —`,'round');}
  B.turn=n; updBB(); chkET();
}

function chkEnd() {
  if (B.enemy.hp<=0) {
    B.over=true;
    const g=Math.floor(14+Math.random()*20+G.party.length*2+B.round*1.5);
    bLog(`${B.enemy.name} defeated! +${g} Gold.`,'big');
    setTimeout(()=>showRes('victory',g),800); return true;
  }
  if (!B.party.some(n=>n.alive)) {
    B.over=true; bLog('All Normies fell.','big');
    setTimeout(()=>showRes('defeat',0),800); return true;
  }
  return false;
}

function showRes(tp, gold) {
  document.getElementById('bat-main').classList.add('hidden');
  document.getElementById('bat-result').classList.remove('hidden');
  document.getElementById('bat-result-title').textContent=tp==='victory'?'Victory.':'Defeated.';
  document.getElementById('bat-result-sub').textContent=tp==='victory'?`${B.enemy.name} defeated.`:`Fell on round ${B.round}.`;
  const ge=document.getElementById('bat-result-gold');
  ge.textContent=gold>0?`+ ${gold} Gold`:''; ge.style.display=gold>0?'block':'none';
  G.world.potions=B.potions;
  if (tp==='victory'){G.world.gold+=gold;G.world.battlesWon++;G.world.journal.push(`Defeated ${B.enemy.name}. +${gold}G.`);}
  else G.world.journal.push(`Defeated by ${B.enemy.name}.`);
  B.party.forEach((bp,i)=>{if(!G.party[i])return;G.party[i].hp=bp.hp;G.party[i].mp=bp.mp;G.party[i].alive=bp.alive;});
  G.party.forEach(n=>{
    if(!n.alive){n.alive=true;n.hp=Math.max(1,Math.floor(n.maxHp*0.10));}
    else{n.hp=Math.min(n.maxHp,n.hp+Math.floor(n.maxHp*0.12));n.mp=Math.min(n.maxMp,n.mp+Math.floor(n.maxMp*0.25));}
  });
  renderHUD();
}

// ── BAG ──
function openBag() { bagOpen=true; renderBag(); document.getElementById('bag').classList.remove('hidden'); }
function closeBag() { bagOpen=false; document.getElementById('bag').classList.add('hidden'); }

function renderBag() {
  const el=document.getElementById('bag-items'); el.innerHTML='';
  const p=document.createElement('div'); p.className='bag-item';
  p.innerHTML=`<div class="bag-item-name">⬜ Potion</div><div class="bag-item-desc">+35% HP to weakest Normie. Buy at Shop 15G.</div><div class="bag-item-qty">×${G.world.potions}</div>`;
  el.appendChild(p);
  if (G.world.gold>0) {
    const g=document.createElement('div'); g.className='bag-item';
    g.innerHTML=`<div class="bag-item-name">◆ Gold</div><div class="bag-item-desc">${G.world.battlesWon} battles won.</div><div class="bag-item-qty">${G.world.gold}G</div>`;
    el.appendChild(g);
  }
  const pl=document.getElementById('bag-party'); pl.innerHTML='';
  G.party.forEach(n => {
    const c=document.createElement('div'); c.className='bpc';
    const pc=npcCanvas[`player_${n.id}`]||npcCanvas[n.id];
    if (pc) {
      const cv=document.createElement('canvas'); cv.width=cv.height=40;
      const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false; cx.drawImage(pc,0,0,40,40);
      c.appendChild(cv);
    } else {
      const img=document.createElement('img'); img.src=G.imgCache[n.id]?.src||makeSvgFallback(n.id);
      img.onerror=()=>{img.src=makeSvgFallback(n.id);}; c.appendChild(img);
    }
    const hp=Math.max(0,n.hp/n.maxHp*100), mp=Math.max(0,n.mp/n.maxMp*100);
    const inf=document.createElement('div'); inf.className='bpc-info';
    inf.innerHTML=`<div class="bpc-name">${n.name}</div>
      <div class="bpc-type">${n.type} · Lv${n.lv} · ${n.px}px · ${n.alive?'✓':'✕ KO'}</div>
      <div class="bpc-traits">${n.expression} · ${n.accessory}</div>
      <div class="bpc-stats">HP ${n.hp}/${n.maxHp} · MP ${n.mp}/${n.maxMp} · DEF ${n.def} · SPD ${n.spd} · CRIT ${Math.round(n.crit*100)}%<br/>${n.sk1} ${n.atkSkill}dmg · ${n.sk2} ${n.atkUltimate}dmg</div>
      <div class="bpc-bar-row"><div class="bpc-bar-wrap"><div class="bpc-bar-hp" style="width:${hp}%"></div></div><div class="bpc-val">${n.hp}/${n.maxHp}HP</div></div>
      <div class="bpc-bar-row"><div class="bpc-bar-wrap"><div class="bpc-bar-mp" style="width:${mp}%"></div></div><div class="bpc-val">${n.mp}/${n.maxMp}MP</div></div>`;
    c.appendChild(inf); pl.appendChild(c);
  });
  document.getElementById('bag-journal').textContent = G.world.journal.length
    ? G.world.journal.slice(-14).reverse().join('\n') : 'No entries yet.';
}

// ── HUD ──
function renderHUD() {
  const cont=document.getElementById('hud-party'); cont.innerHTML='';
  G.party.forEach(n => {
    const div=document.createElement('div'); div.className='hm'+(n.alive?'':' dead');
    const pc=npcCanvas[`player_${n.id}`]||npcCanvas[n.id];
    if (pc) {
      const cv=document.createElement('canvas'); cv.width=cv.height=28;
      const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false; cx.drawImage(pc,0,0,28,28);
      div.appendChild(cv);
    } else {
      const img=document.createElement('img'); img.src=G.imgCache[n.id]?.src||makeSvgFallback(n.id);
      img.onerror=()=>{img.src=makeSvgFallback(n.id);}; div.appendChild(img);
    }
    const hp=Math.max(0,n.hp/n.maxHp*100), mp=Math.max(0,n.mp/n.maxMp*100);
    const inf=document.createElement('div'); inf.className='hm-info';
    inf.innerHTML=`<div class="hm-name">${n.name.replace(/^Normie /,'#')}</div>
      <div class="hm-type">${n.type}</div>
      <div class="bar-wrap"><div class="bar-hp" style="width:${hp}%"></div></div>
      <div class="bar-wrap"><div class="bar-mp" style="width:${mp}%"></div></div>
      <div class="hm-hp">${n.hp}/${n.maxHp}</div>`;
    div.appendChild(inf); cont.appendChild(div);
  });
  document.getElementById('hud-gold').textContent=G.world.gold;
  document.getElementById('hud-pot-count').textContent=G.world.potions;
}

function updZone() {
  const z=getZone(G.world.px,G.world.py);
  document.getElementById('zone-name').textContent=z.name;
  document.getElementById('step-count').textContent=G.world.steps+' steps';
}

// ── PARTY SELECT ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  G.screen=id;
}

function renderSlots() {
  const cont=document.getElementById('party-slots'); cont.innerHTML='';
  document.getElementById('party-count').textContent=`${G.party.length} / ${MAX_PARTY} selected`;
  document.getElementById('btn-start').disabled=G.party.length===0;
  for (let i=0;i<MAX_PARTY;i++) {
    const n=G.party[i], sl=document.createElement('div');
    sl.className='pslot '+(n?'filled':'empty');
    if (n) {
      const pc=npcCanvas[`player_${n.id}`]||npcCanvas[n.id];
      if (pc) {
        const cv=document.createElement('canvas'); cv.width=cv.height=36;
        const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false; cx.drawImage(pc,0,0,36,36);
        sl.appendChild(cv);
      } else {
        const img=document.createElement('img'); img.src=G.imgCache[n.id]?.src||makeSvgFallback(n.id);
        img.onerror=()=>{img.src=makeSvgFallback(n.id);}; sl.appendChild(img);
      }
      sl.innerHTML+=`<div class="pslot-name">${n.name.replace(/^Normie /,'#')}</div>
        <div class="pslot-type">${n.type} · Lv${n.lv}</div>
        <div class="pslot-stat">HP ${n.maxHp}</div>`;
      sl.onclick=()=>{G.party.splice(i,1);renderSlots();renderGrid();};
    } else {
      sl.innerHTML=`<div class="pslot-num">${i+1}</div><div class="pslot-empty">—</div>`;
    }
    cont.appendChild(sl);
  }
}

function renderGrid() {
  const grid=document.getElementById('normie-grid');
  document.getElementById('col-count').textContent=G.collection.length?`(${G.collection.length})`:'';
  if (!G.collection.length) { grid.innerHTML='<div class="grid-loading">Loading your Normies…</div>'; return; }
  grid.innerHTML='';
  G.collection.forEach(n => {
    const sel=G.party.some(p=>p.id===n.id), card=document.createElement('div');
    card.className='ncard'+(sel?' selected':'');
    const pc=npcCanvas[`player_${n.id}`]||npcCanvas[n.id];
    if (pc) {
      const cv=document.createElement('canvas'); cv.width=cv.height=48;
      const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false; cx.drawImage(pc,0,0,48,48);
      card.appendChild(cv);
    } else {
      const img=document.createElement('img'); img.src=G.imgCache[n.id]?.src||makeSvgFallback(n.id);
      img.onerror=()=>{img.src=makeSvgFallback(n.id);}; card.appendChild(img);
    }
    card.innerHTML+=`<div class="ncard-id">#${n.id}</div>
      <div class="ncard-type">${n.type} · Lv${n.lv}</div>
      <div class="ncard-stat">HP ${n.maxHp} · ${n.sk1}</div>
      <div class="ncard-expr">${n.expression}${n.accessory!=='No Accessories'?' · '+n.accessory:''}</div>`;
    if (!sel) card.onclick=()=>{if(G.party.length>=MAX_PARTY)return;G.party.push({...n});renderSlots();renderGrid();};
    grid.appendChild(card);
  });
}

function cacheImg(n) {
  if (G.imgCache[n.id]) return;
  const img=new Image(); img.crossOrigin='anonymous';
  img.src=n.image||makeSvgFallback(n.id);
  img.onerror=()=>{img.src=makeSvgFallback(n.id);};
  G.imgCache[n.id]=img;
  if (n.pixels) buildPlayerCanvas(n);
}

// Load NPC Normies from the real API — fetches pixels for in-world rendering
async function loadNpcNormies() {
  const ids=NPC_DEFS.map(n=>n.id);
  for (let i=0;i<ids.length;i+=2) {
    await Promise.all(ids.slice(i,i+2).map(async id=>{
      try {
        const full = await fetchNormieFull(id);
        if (full) {
          npcData[id]=full;
          if (full.pixels) buildNpcCanvas(id, full.pixels);
          else if (full.image) {
            const img=new Image(); img.crossOrigin='anonymous'; img.src=full.image;
            G.imgCache[id]=img;
          }
          console.log(`[npc] #${id} loaded (${full.type}, ${full.px}px)`);
        }
      } catch(e) { console.warn('[npc] failed',id,e); }
    }));
    await new Promise(r=>setTimeout(r,700)); // ~60/min rate limit
  }
  console.log('[npcs] done:', Object.keys(npcData).length);
}

// ── TITLE LOGO ──
function drawTitleLogo() {
  const c=document.getElementById('logo-canvas');
  if (!c) return;
  const ctx=c.getContext('2d'), r=mkRng(1337);
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#e3e5e4'; ctx.fillRect(0,0,200,80);
  ctx.fillStyle='#48494b';
  for (let y=0;y<80;y+=2) for (let x=0;x<200;x+=2) {
    const dx=(x-100)/88, dy=(y-38)/34;
    if (dx*dx+dy*dy<1 && r()>0.55) ctx.fillRect(x,y,2,2);
  }
  // Eyes
  [[68,28],[92,28],[108,28],[132,28]].forEach(([ex,ey])=>{
    ctx.fillRect(ex,ey,8,6);
    ctx.fillStyle='#e3e5e4'; ctx.fillRect(ex+2,ey+2,2,2);
    ctx.fillStyle='#48494b';
  });
  ctx.fillRect(80,54,40,3); ctx.fillRect(76,52,4,3); ctx.fillRect(120,52,4,3);
}

// ── BOOT ──
window.addEventListener('DOMContentLoaded', () => {
  drawTitleLogo();

  // Battle buttons
  document.getElementById('btn-atk').onclick   = () => window.__battleAct('attack');
  document.getElementById('btn-skill').onclick  = () => window.__battleAct('skill');
  document.getElementById('btn-ult').onclick    = () => window.__battleAct('ult');
  document.getElementById('btn-pot').onclick    = () => window.__battleAct('potion');
  document.getElementById('btn-bat-world').onclick = () => { batOpen=false; document.getElementById('battle').classList.add('hidden'); };
  document.getElementById('btn-bat-party').onclick = () => {
    batOpen=false; document.getElementById('battle').classList.add('hidden');
    G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
    if (rafId){cancelAnimationFrame(rafId);rafId=null;}
    document.getElementById('screen-game').classList.remove('active');
    showScreen('party'); renderSlots(); renderGrid();
  };
  document.getElementById('dialogue').addEventListener('click', ()=>closeDlg());
  document.getElementById('btn-close-bag').onclick = ()=>closeBag();
  document.getElementById('btn-back-title').onclick = ()=>showScreen('title');

  document.getElementById('btn-connect').onclick = async () => {
    const btn=document.getElementById('btn-connect');
    btn.disabled=true; btn.textContent='Connecting…';
    try {
      const {provider,address}=await connectWallet();
      G.provider=provider; G.address=address; G.demo=false;
      document.getElementById('wallet-addr').textContent=address.slice(0,6)+'…'+address.slice(-4);
      btn.textContent='Loading NFTs…';
      showScreen('party'); renderGrid();
      G.collection = await loadWalletNormies(address, provider, col=>{
        G.collection=col; col.forEach(cacheImg); renderGrid();
      });
      G.collection.forEach(cacheImg); renderGrid();
      btn.textContent='Connected'; btn.disabled=false;
    } catch(e) { btn.textContent='Failed — retry'; btn.disabled=false; console.error(e); }
  };

  document.getElementById('btn-demo').onclick = async () => {
    G.demo=true; G.collection=[];
    document.getElementById('demo-pill').classList.add('show');
    showScreen('party'); renderGrid();
    G.collection = await loadDemoNormies(col=>{
      G.collection=col;
      col.forEach(n=>{cacheImg(n); if(n.pixels) buildPlayerCanvas(n);});
      renderGrid();
    });
    G.collection.forEach(n=>{cacheImg(n); if(n.pixels) buildPlayerCanvas(n);});
    renderGrid();
  };

  document.getElementById('btn-start').onclick = () => {
    if (!G.party.length) return;
    G.world={gold:0,potions:3,steps:0,battlesWon:0,journal:[],px:32,py:32,eCooldown:0};
    G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
    // Build pixel canvases for party
    G.party.forEach(n=>{ if(n.pixels) buildPlayerCanvas(n); });

    generateMap();
    showScreen('game');
    initCanvas();
    preloadAllTiles();
    loadNpcNormies(); // async — NPCs upgrade from fallback sprites as they load
    updZone();
    renderHUD();
    keys={}; moveCd=0; dlgOpen=false; batOpen=false; bagOpen=false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId=requestAnimationFrame(gloop);
  };

  window.addEventListener('resize', ()=>{ if(G.screen==='game') resz(); });
});
