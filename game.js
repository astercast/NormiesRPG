// ═══════════════════════════════════════════════════════════════════
// NORMIES RPG  — Pure Canvas 2D engine, no Phaser, no WebGL issues
// Data source: https://api.normies.art/llms.txt
// Normies: 10,000-piece ERC-721 on-chain collection on Ethereum
// Each Normie is a 40×40 monochrome bitmap stored entirely on-chain
// Colors: #48494b (pixel on), #e3e5e4 (pixel off)
// ═══════════════════════════════════════════════════════════════════

import { fetchNormieMeta, makeSvgFallback, mkRng, calcStats } from './normie-api.js';
import { connectWallet, loadWalletNormies, loadDemoNormies } from './wallet.js';

// ── RNG ──────────────────────────────────────────────────────────
function rng(seed) { return mkRng(seed); }

// ════════════════════════════════════════════════════════════════
// MAP / WORLD
// ════════════════════════════════════════════════════════════════
const TILE   = 32;
const MAP_W  = 60;
const MAP_H  = 60;
const T = { GRASS:0, TALL:1, PATH:2, WALL:3, TREE:4, WATER:5, TOWN:6, INN:7, SHOP:8, SIGN:9, CAVE:10 };

// Zone definitions — 4 areas with escalating enemy tiers
const ZONES = [
  { name:'NORMIE PLAINS', x0:0,  x1:35, y0:0,  y1:35, tier:0, rate:0.11,
    desc:'The starting region. Wild Normies and Paper Hands roam the tall grass.' },
  { name:'DARK FOREST',   x0:35, x1:60, y0:0,  y1:28, tier:1, rate:0.19,
    desc:'Dense trees muffle everything. The Void and Cope Lord haunt these woods.' },
  { name:'COIN CAVES',    x0:0,  x1:28, y0:35, y1:60, tier:2, rate:0.22,
    desc:'Rocky tunnels echo with gas prices. Gas Fee Demon and FUD Specter lurk here.' },
  { name:'RUGGED LANDS',  x0:28, x1:60, y0:28, y1:60, tier:3, rate:0.26,
    desc:'The final frontier. Rugpuller and Bearmarkt. Bring your five strongest Normies.' },
];

function getZone(tx, ty) {
  return ZONES.find(z => tx>=z.x0 && tx<z.x1 && ty>=z.y0 && ty<z.y1) || ZONES[0];
}

// NPC roster — Normies lore characters
const NPCS = [
  { x:31, y:29, name:'ELDER NORM', dialogue:[
    'Each Normie is 1,600 bits on the Ethereum blockchain. 40×40 pixels, stored entirely on-chain.',
    'Type determines your style. Human is balanced. Cat is fast. Alien has the most MP. Agent tanks everything.',
    'Pixel Count determines HP. The more pixels a Normie has, the higher their max HP. Check the bag for details.',
  ]},
  { x:28, y:31, name:'CHAD VENDOR', shop:true, dialogue:[
    'On-chain potions, 15 Gold each. Brewed from SSTORE2 data. High quality.',
    'Accessories matter. Gold Chain gives +3 MP. Hoodie gives +2 DEF. Hoodie Agents are nearly unkillable.',
    'I\'ll sell you 2 potions for 15G. Deal?',
  ]},
  { x:32, y:30, name:'INNKEEPER FREN', inn:true, dialogue:[
    'Rest your Normies here. Full HP and MP restore. Free, because I\'m fren.',
    'The Rugged Lands are brutal. Come back here between runs to recover.',
  ]},
  { x:16, y:30, name:'DEGEN TRAVELER', dialogue:[
    'I tried the Coin Caves without potions. Lost three Normies to a Gas Fee Demon. Don\'t be me.',
    'Paper Hands in the plains panic-sell their attacks. Easy to counter once you know the pattern.',
    'Confident-expression Normies crit 12% of the time. Build around that.',
  ]},
  { x:30, y:16, name:'COPE SCOUT', dialogue:[
    'The Dark Forest... I keep hearing seething sounds from the trees. The Cope Lord is in there.',
    'Aliens wreck it. Void Gaze bypasses half its DEF.',
    'The Void spawns from pure negativity. It\'s fast. Kill it before it gets turns.',
  ]},
  { x:15, y:44, name:'DIAMOND MINER', dialogue:[
    'Deep in the caves, the Gas Fee Demon burns everything. Agents eat the damage. Everyone else suffers.',
    'FUD Specter is sneaky. High SPD, spreads confusion debuffs. Kill it fast.',
    'The Gold down here is worth it. Tier 2 enemies drop the most.',
  ]},
  { x:44, y:30, name:'WANDERING GM', dialogue:[
    'gm. Walk on tall grass (darker green) for encounters. Stay on white paths to travel safely.',
    'The rates go up as you move further from town. Regular grass in the rugged lands is dangerous.',
    'I\'ve been walking for 10,000 steps. Still bullish.',
  ]},
  { x:12, y:12, name:'FOREST HERMIT', dialogue:[
    'I came to the forest during the last bear market. The trees judge no one.',
    'The Cope Lord feeds on missed attacks. Use your highest-damage moves first.',
    'Normie Stare ignores 60% of DEF. Best ability in the game for tank enemies.',
  ]},
  { x:50, y:50, name:'RUGGED RONIN', dialogue:[
    'The Rugpuller waits at the south-east corner of the Rugged Lands. It\'s not a joke.',
    'The Bearmarkt has 550 base HP and hits for 60 base ATK. Bring a party of 5 or don\'t come.',
    'If you beat the Bearmarkt... you\'ve mastered the overworld. You are a true Normie.',
  ]},
  { x:8,  y:48, name:'CAVE ARCHIVIST', dialogue:[
    'I archive every on-chain Normie. The rarest have pixel counts above 700. That\'s 70 extra HP.',
    'Expression is underrated. Confident Normies crit 12%. Peaceful only 3%. Check yours.',
    'VR Headset gives +4 MP. The single best accessory for Alien types.',
  ]},
];

let MAP = null;
let MAP_CANVAS = null;  // pre-rendered map texture
let MAP_DIRTY  = true;

function generateMap() {
  const r = rng(9371);
  MAP = Array.from({length:MAP_H}, () => new Array(MAP_W).fill(T.GRASS));

  // Border walls
  for (let x=0;x<MAP_W;x++){ MAP[0][x]=T.WALL; MAP[MAP_H-1][x]=T.WALL; }
  for (let y=0;y<MAP_H;y++){ MAP[y][0]=T.WALL; MAP[y][MAP_W-1]=T.WALL; }

  // Scatter tall grass and trees
  for (let y=2;y<MAP_H-2;y++) for (let x=2;x<MAP_W-2;x++) {
    const v=r();
    if      (v<0.07) MAP[y][x]=T.TALL;
    else if (v<0.12) MAP[y][x]=T.TREE;
  }

  // Water pools
  [[6,5,4,3],[44,4,3,3],[4,44,5,3],[48,46,4,3],[38,22,3,3],[16,20,4,2],[52,14,3,2],[28,50,3,2]]
    .forEach(([wx,wy,ww,wh])=>{
      for(let dy=0;dy<wh;dy++) for(let dx=0;dx<ww;dx++)
        if(wy+dy<MAP_H-1&&wx+dx<MAP_W-1) MAP[wy+dy][wx+dx]=T.WATER;
    });

  // Main cross paths
  for(let x=1;x<MAP_W-1;x++) MAP[30][x]=T.PATH;
  for(let y=1;y<MAP_H-1;y++) MAP[y][30]=T.PATH;
  // Secondary paths
  for(let x=5;x<55;x++) MAP[15][x]=T.PATH;
  for(let x=5;x<30;x++) MAP[45][x]=T.PATH;
  for(let y=15;y<45;y++) MAP[y][15]=T.PATH;
  for(let y=5; y<30;y++) MAP[y][45]=T.PATH;
  for(let y=30;y<55;y++) MAP[y][45]=T.PATH;

  // Dark forest — dense trees top-right
  for(let y=2;y<26;y++) for(let x=37;x<58;x++)
    if(MAP[y][x]===T.GRASS||MAP[y][x]===T.TALL) if(r()<0.35) MAP[y][x]=T.TREE;

  // Coin caves — rocky passages bottom-left
  for(let y=37;y<58;y++) for(let x=2;x<26;x++)
    if(MAP[y][x]===T.GRASS) if(r()<0.16) MAP[y][x]=T.CAVE;

  // Town center 30,30
  for(let dy=-5;dy<=5;dy++) for(let dx=-5;dx<=5;dx++) MAP[30+dy][30+dx]=T.TOWN;

  // Inn + Shop buildings
  [[26,32],[26,33],[27,32],[27,33]].forEach(([y,x])=>MAP[y][x]=T.INN);
  [[32,26],[32,27],[33,26],[33,27]].forEach(([y,x])=>MAP[y][x]=T.SHOP);

  // Signs at 4 exits
  [[29,30],[31,30],[30,29],[30,31]].forEach(([y,x])=>MAP[y][x]=T.SIGN);

  // Clear NPC spots
  NPCS.forEach(n=>{ if(MAP[n.y]?.[n.x]!==undefined) MAP[n.y][n.x]=T.PATH; });

  // Re-stamp core town
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++) MAP[30+dy][30+dx]=T.TOWN;
  [[26,32],[26,33],[27,32],[27,33]].forEach(([y,x])=>MAP[y][x]=T.INN);
  [[32,26],[32,27],[33,26],[33,27]].forEach(([y,x])=>MAP[y][x]=T.SHOP);
  [[29,30],[31,30],[30,29],[30,31]].forEach(([y,x])=>MAP[y][x]=T.SIGN);
}

const WALK  = t => t!==T.WALL && t!==T.TREE && t!==T.WATER && t!==T.CAVE;
const ENCTR = t => t===T.GRASS || t===T.TALL;

// Pre-render the entire map to an offscreen canvas for fast blitting
function buildMapCanvas() {
  const mc = document.createElement('canvas');
  mc.width  = MAP_W * TILE;
  mc.height = MAP_H * TILE;
  const ctx = mc.getContext('2d');

  const COLORS = {
    [T.GRASS]:{fill:'#f2f2f2',stroke:'#e5e5e5'},
    [T.TALL]: {fill:'#e5ede5',stroke:'#ccdacc'},
    [T.PATH]: {fill:'#e8e8e8',stroke:'#d0d0d0'},
    [T.WALL]: {fill:'#0e0e0e',stroke:null},
    [T.TREE]: {fill:'#162015',stroke:null},
    [T.WATER]:{fill:'#bbc8d2',stroke:'#9badb8'},
    [T.TOWN]: {fill:'#eeeeee',stroke:'#cccccc'},
    [T.INN]:  {fill:'#e0e0e0',stroke:'#777777'},
    [T.SHOP]: {fill:'#e0e0e0',stroke:'#777777'},
    [T.SIGN]: {fill:'#ddd8b0',stroke:'#998855'},
    [T.CAVE]: {fill:'#282828',stroke:'#444444'},
  };

  for(let ty=0;ty<MAP_H;ty++) for(let tx=0;tx<MAP_W;tx++) {
    const t  = MAP[ty][tx];
    const sx = tx*TILE, sy = ty*TILE;
    const c  = COLORS[t]||COLORS[T.GRASS];

    ctx.fillStyle = c.fill;
    ctx.fillRect(sx, sy, TILE, TILE);

    if(c.stroke) {
      ctx.strokeStyle=c.stroke; ctx.lineWidth=0.5;
      ctx.strokeRect(sx+.25, sy+.25, TILE-.5, TILE-.5);
    }

    // Tile decorations
    if(t===T.TREE) {
      ctx.fillStyle='#233020';
      ctx.beginPath();
      ctx.moveTo(sx+TILE/2, sy+3);
      ctx.lineTo(sx+4, sy+TILE-5);
      ctx.lineTo(sx+TILE-4, sy+TILE-5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#162015';
      ctx.fillRect(sx+12, sy+TILE-8, 8, 8);
    } else if(t===T.TALL) {
      ctx.fillStyle='rgba(100,140,80,0.55)';
      for(let i=0;i<5;i++) ctx.fillRect(sx+2+i*6, sy+TILE-9, 3, 9);
    } else if(t===T.WATER) {
      ctx.strokeStyle='rgba(100,130,150,0.6)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(sx+4,sy+TILE/2-5); ctx.lineTo(sx+TILE-4,sy+TILE/2-5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx+7,sy+TILE/2+4); ctx.lineTo(sx+TILE-7,sy+TILE/2+4); ctx.stroke();
    } else if(t===T.INN||t===T.SHOP) {
      ctx.fillStyle='#999'; ctx.fillRect(sx+6, sy+7, TILE-12, 9);
      ctx.fillStyle='#333'; ctx.fillRect(sx+12, sy+17, 8, 11);
      ctx.fillStyle='rgba(0,0,0,0.7)';
      ctx.font='6px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(t===T.INN?'INN':'SHP', sx+TILE/2, sy+TILE-6);
    } else if(t===T.SIGN) {
      ctx.fillStyle='#775533'; ctx.fillRect(sx+14,sy+14,4,16);
      ctx.fillStyle='#ccaa55'; ctx.fillRect(sx+7,sy+9,18,10);
      ctx.fillStyle='#443311'; ctx.fillRect(sx+9,sy+12,14,2);
    } else if(t===T.CAVE) {
      ctx.fillStyle='rgba(80,80,80,0.4)';
      ctx.fillRect(sx+4,sy+4,TILE-8,TILE-8);
      // rocky texture marks
      ctx.fillStyle='rgba(100,100,100,0.3)';
      ctx.fillRect(sx+8,sy+8,6,4); ctx.fillRect(sx+18,sy+14,5,3);
    }

    // Path direction marks on main arteries
    if(t===T.PATH && (ty===30||tx===30)) {
      ctx.strokeStyle='rgba(180,180,180,0.35)'; ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(sx+TILE/2, sy+3); ctx.lineTo(sx+TILE/2, sy+TILE-3);
      ctx.stroke();
    }
  }

  // Draw NPC figures onto map
  NPCS.forEach(npc => {
    const sx=npc.x*TILE, sy=npc.y*TILE;
    ctx.fillStyle='#ffe066';
    ctx.fillRect(sx+9,sy+6,14,12);   // head
    ctx.fillRect(sx+8,sy+18,16,10);  // torso
    ctx.fillStyle='#333';
    ctx.fillRect(sx+11,sy+9,3,3);    // left eye
    ctx.fillRect(sx+18,sy+9,3,3);    // right eye
    ctx.fillStyle='#ffe066';
    ctx.fillRect(sx+9,sy+28,5,7);    // left leg
    ctx.fillRect(sx+18,sy+28,5,7);   // right leg
    // name tag
    ctx.font='bold 7px monospace'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillStyle='rgba(255,255,255,0.9)';
    const nm=npc.name.split(' ')[0];
    const w=ctx.measureText(nm).width;
    ctx.fillRect(sx+TILE/2-w/2-2, sy-10, w+4, 10);
    ctx.fillStyle='#555';
    ctx.fillText(nm, sx+TILE/2, sy-1);
  });

  MAP_CANVAS = mc;
  MAP_DIRTY  = false;
}

// ════════════════════════════════════════════════════════════════
// ENEMY DEFINITIONS  (Normies lore)
// ════════════════════════════════════════════════════════════════
const ENEMIES = [
  // Tier 0 — Normie Plains
  { id:'wild_normie', name:'WILD NORMIE',   seed:101,  hpBase:75,  atkBase:13, def:1, spd:6,
    lore:'A stray on-chain Normie, separated from its wallet. Confused but surprisingly tough.' },
  { id:'paper_hand',  name:'PAPER HAND',    seed:212,  hpBase:62,  atkBase:17, def:0, spd:10,
    lore:'Sold the bottom. Never forgave itself. Attacks in waves of panic and instant regret.' },
  // Tier 1 — Dark Forest
  { id:'the_void',    name:'THE VOID',      seed:1001, hpBase:145, atkBase:22, def:3, spd:7,
    lore:'Pure negative sentiment crystallized into form. First appeared during a bear market.' },
  { id:'cope_lord',   name:'COPE LORD',     seed:2002, hpBase:210, atkBase:28, def:5, spd:9,
    lore:'Master of seething and malding. Grows stronger with every missed attack against it.' },
  // Tier 2 — Coin Caves
  { id:'gas_demon',   name:'GAS FEE DEMON', seed:3003, hpBase:285, atkBase:36, def:7, spd:13,
    lore:'Spawned from peak gas prices. Burns through HP like ETH during NFT season.' },
  { id:'fud_specter', name:'FUD SPECTER',   seed:3444, hpBase:240, atkBase:32, def:6, spd:16,
    lore:'Spreads disinformation as a combat technique. Impossible to predict its next move.' },
  // Tier 3 — Rugged Lands
  { id:'rugpuller',   name:'RUGPULLER',     seed:4004, hpBase:420, atkBase:48, def:11, spd:15,
    lore:'It gives liquidity and it takes it away. Most feared entity in the entire overworld.' },
  { id:'bearmarkt',   name:'BEARMARKT',     seed:5005, hpBase:560, atkBase:62, def:17, spd:19,
    lore:'Ancient. Inevitable. 550 base HP. Arrives when prices are lowest. True final boss.' },
];

function pickEnemy(tier, partySize) {
  const lo = tier * 2;
  const hi = Math.min(lo+1, ENEMIES.length-1);
  const def = ENEMIES[lo + Math.floor(Math.random()*(hi-lo+1))];
  const psc = 0.55 + partySize * 0.09;
  return {
    ...def,
    maxHp: Math.round(def.hpBase * psc),
    hp:    Math.round(def.hpBase * psc),
    atk:   Math.round(def.atkBase * psc),
  };
}

// Enemy pixel art generator — seeded 8×14 mirrored bitmap
function drawEnemySprite(canvas, seed, size=96) {
  const COLS=8, ROWS=14;
  canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext('2d');
  const cw=size/COLS, ch=size/ROWS;
  const r=rng(seed*6271+9337);
  const bm=Array.from({length:ROWS},()=>new Uint8Array(COLS));

  for(let row=0;row<ROWS;row++) {
    for(let col=0;col<4;col++) {
      let p=0.42;
      if(row<=1)       p=col<2?0.10:0.66;
      else if(row<=3)  p=col<3?0.73:0.20;
      else if(row<=8)  p=col>=1?0.82:0.08;
      else if(row<=11) p=(col===1||col===2)?0.90:0.04;
      else             p=col===1?0.88:0.02;
      bm[row][col]=r()<p?1:0;
    }
    for(let col=0;col<4;col++) bm[row][7-col]=r()<0.78?bm[row][col]:(r()<0.4?1:0);
  }
  // Eyes
  bm[2][2]=1; bm[2][3]=0; bm[2][5]=1; bm[2][4]=0;

  ctx.clearRect(0,0,size,size);
  // Background match Normies palette
  ctx.fillStyle='#e3e5e4';
  ctx.fillRect(0,0,size,size);
  for(let row=0;row<ROWS;row++) for(let col=0;col<COLS;col++) {
    if(!bm[row][col]) continue;
    const isEdge=
      (row===0||!bm[row-1][col])||(row===ROWS-1||!bm[row+1][col])||
      (col===0||!bm[row][col-1])||(col===COLS-1||!bm[row][col+1]);
    ctx.fillStyle=isEdge?'#1a1a1a':'#48494b';
    ctx.fillRect(Math.round(col*cw),Math.round(row*ch),Math.ceil(cw)+1,Math.ceil(ch)+1);
  }
}

// ════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════════════
const G = {
  collection:[], party:[], demo:false,
  provider:null, address:null,
  world: { gold:0, potions:3, steps:0, battlesWon:0, journal:[], px:30, py:30, eCooldown:0 },
  battle: null,
  screen: 'title',
  // cached normie image elements
  imgCache: {},
};

// ════════════════════════════════════════════════════════════════
// OVERWORLD CANVAS RENDERER
// ════════════════════════════════════════════════════════════════
let worldCanvas, worldCtx;
let camX=0, camY=0;         // camera offset in pixels
let keys={};
let moveCd=0;
let dialogueOpen=false;
let battleOpen=false;
let bagOpen=false;
let lastTime=0;
let rafId=null;

function initWorldCanvas() {
  worldCanvas = document.getElementById('world-canvas');
  worldCtx    = worldCanvas.getContext('2d');
  resizeWorldCanvas();
  window.addEventListener('resize', resizeWorldCanvas);
  window.addEventListener('keydown', e=>{ keys[e.code]=true; handleKeyDown(e); });
  window.addEventListener('keyup',   e=>{ keys[e.code]=false; });
  worldCanvas.addEventListener('click', onWorldClick);
}

function resizeWorldCanvas() {
  const hud=76;
  worldCanvas.width  = window.innerWidth;
  worldCanvas.height = window.innerHeight - hud;
  worldCanvas.style.width  = worldCanvas.width  + 'px';
  worldCanvas.style.height = worldCanvas.height + 'px';
}

function handleKeyDown(e) {
  if (battleOpen) return;
  if (e.code==='KeyE' || e.code==='Enter') {
    if (dialogueOpen) { closeDialogue(); return; }
    tryInteract();
  }
  if (e.code==='KeyI' || e.code==='Escape') {
    if (bagOpen) { closeBag(); return; }
    if (dialogueOpen) { closeDialogue(); return; }
    openBag();
  }
}

function onWorldClick(e) {
  // Clicking the canvas while dialogue open closes it
  if (dialogueOpen) { closeDialogue(); return; }
}

function updateCamera() {
  const W = worldCanvas.width, H = worldCanvas.height;
  const targetX = G.world.px * TILE + TILE/2 - W/2;
  const targetY = G.world.py * TILE + TILE/2 - H/2;
  // Smooth camera follow
  camX += (targetX - camX) * 0.12;
  camY += (targetY - camY) * 0.12;
  // Clamp
  camX = Math.max(0, Math.min(camX, MAP_W*TILE - W));
  camY = Math.max(0, Math.min(camY, MAP_H*TILE - H));
}

function drawWorld(dt) {
  if (!worldCtx || !MAP_CANVAS) return;
  updateCamera();
  const ctx = worldCtx;
  const W=worldCanvas.width, H=worldCanvas.height;

  ctx.clearRect(0,0,W,H);

  // Blit pre-rendered map
  const ox=Math.round(camX), oy=Math.round(camY);
  ctx.drawImage(MAP_CANVAS, ox, oy, W, H, 0, 0, W, H);

  // Draw player
  const px = G.world.px*TILE+TILE/2-TILE/2 - ox;
  const py = G.world.py*TILE+TILE/2-TILE/2 - oy;
  drawPlayer(ctx, px, py);
}

function drawPlayer(ctx, x, y) {
  const lead = G.party[0];
  const img  = lead ? G.imgCache[lead.id] : null;
  if (img && img.complete && img.naturalWidth>0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, TILE, TILE);
    // Small type indicator dot
    const typeColors = {Human:'#888',Cat:'#aa8',Alien:'#8a8',Agent:'#88a'};
    ctx.fillStyle = typeColors[lead.type]||'#888';
    ctx.beginPath(); ctx.arc(x+TILE-5, y+5, 3, 0, Math.PI*2); ctx.fill();
  } else {
    // Pixel figure in Normies palette
    ctx.fillStyle='#48494b';
    ctx.fillRect(x+10,y+4,  12,10);  // head
    ctx.fillRect(x+9, y+14, 14,10);  // body
    ctx.fillRect(x+9, y+24, 5, 8);   // left leg
    ctx.fillRect(x+18,y+24, 5, 8);   // right leg
    ctx.fillStyle='#e3e5e4';
    ctx.fillRect(x+11,y+6, 3,3);     // left eye
    ctx.fillRect(x+18,y+6, 3,3);     // right eye
    // Direction dot
    ctx.fillStyle='#48494b';
    ctx.beginPath(); ctx.arc(x+TILE/2,y+2,2,0,Math.PI*2); ctx.fill();
  }
}

function gameLoop(ts=0) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  if (!battleOpen && !bagOpen) {
    moveCd -= dt;
    handleMovement();
    drawWorld(dt);
  }

  rafId = requestAnimationFrame(gameLoop);
}

function handleMovement() {
  if (dialogueOpen || moveCd > 0) return;

  const w = G.world;
  let nx=w.px, ny=w.py, moved=false;

  if (keys['ArrowLeft']  || keys['KeyA']) { nx--; moved=true; }
  else if (keys['ArrowRight'] || keys['KeyD']) { nx++; moved=true; }
  else if (keys['ArrowUp']    || keys['KeyW']) { ny--; moved=true; }
  else if (keys['ArrowDown']  || keys['KeyS']) { ny++; moved=true; }

  if (!moved) return;
  if (nx<0||ny<0||nx>=MAP_W||ny>=MAP_H) return;
  if (!WALK(MAP[ny][nx])) return;

  w.px=nx; w.py=ny; w.steps++;
  moveCd = 130;

  updateZoneBar();
  renderHUD();

  // Encounter check
  const tile = MAP[ny][nx];
  if (ENCTR(tile) && w.eCooldown===0) {
    const zone = getZone(nx,ny);
    const rate = tile===T.TALL ? zone.rate*1.6 : zone.rate;
    if (Math.random() < rate) {
      w.eCooldown = 12;
      triggerEncounter(zone);
      return;
    }
  }
  if (w.eCooldown>0) w.eCooldown--;
}

function tryInteract() {
  const w = G.world;
  const adj = [[w.px,w.py],[w.px,w.py-1],[w.px,w.py+1],[w.px-1,w.py],[w.px+1,w.py]];
  for (const [tx,ty] of adj) {
    const npc = NPCS.find(n=>n.x===tx&&n.y===ty);
    if (npc) {
      let text = npc.dialogue[Math.floor(Math.random()*npc.dialogue.length)];
      let name = npc.name;
      if (npc.inn) {
        G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
        renderHUD();
        text = `Full HP & MP restored for your party! Rest well, fren. You have ${G.world.potions} potions.`;
      }
      if (npc.shop) {
        const cost=15;
        if (G.world.gold>=cost) {
          G.world.gold-=cost; G.world.potions+=2; renderHUD();
          text=`Sold you 2 potions for ${cost}G. Total potions: ${G.world.potions}. Based transaction.`;
        } else {
          text=`Potions are ${cost}G each (×2). You only have ${G.world.gold}G. Go win some battles.`;
        }
      }
      openDialogue(name, text); return;
    }
    const tile = MAP[ty]?.[tx];
    if (tile===T.SIGN) {
      openDialogue('SIGNPOST',
        '↑ Dark Forest  — tier 1 enemies\n↓ Coin Caves   — tier 2 enemies\n← Normie Plains — tier 0 (start here)\n→ Rugged Lands  — tier 3 (final zone)\n\nTip: Inn restores HP/MP · Shop sells potions');
      return;
    }
  }
}

function updateZoneBar() {
  const z=getZone(G.world.px, G.world.py);
  document.getElementById('zone-name').textContent=z.name;
  document.getElementById('step-count').textContent=G.world.steps+' steps';
}

// ════════════════════════════════════════════════════════════════
// DIALOGUE
// ════════════════════════════════════════════════════════════════
function openDialogue(speaker, text) {
  dialogueOpen=true;
  document.getElementById('dlg-speaker').textContent=speaker;
  document.getElementById('dlg-text').textContent=text;
  document.getElementById('dialogue').classList.remove('hidden');
}
function closeDialogue() {
  dialogueOpen=false;
  document.getElementById('dialogue').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════════
// BATTLE SYSTEM
// ════════════════════════════════════════════════════════════════
let B = null;  // battle state

function triggerEncounter(zone) {
  battleOpen=true;
  const enemy = pickEnemy(zone.tier, G.party.length);
  G.world.journal.push(`${zone.name}: ${enemy.name} appeared!`);

  B = {
    party:    G.party.map(n=>({...n})),
    enemy:    {...enemy},
    potions:  G.world.potions,
    zone,
    round:    1,
    turn:     0,
    order:    null,
    over:     false,
  };

  // Speed-sorted turn order
  B.order = [
    ...B.party.filter(n=>n.alive).map(n=>({...n,isPlayer:true})),
    {...B.enemy, isEnemy:true},
  ].sort((a,b)=>b.spd-a.spd);

  // Draw enemy sprite
  const ec=document.getElementById('enemy-canvas');
  drawEnemySprite(ec, enemy.seed, 96);
  document.getElementById('enemy-name').textContent=enemy.name;
  document.getElementById('enemy-lore').textContent=enemy.lore;
  updateEnemyBar();
  document.getElementById('bat-zone').textContent=zone.name;
  document.getElementById('bat-log').innerHTML='';

  document.getElementById('battle').classList.remove('hidden');
  document.getElementById('bat-main').classList.remove('hidden');
  document.getElementById('bat-result').classList.add('hidden');

  renderBattleParty();
  battleLog(`${enemy.name} appeared!`, 'em');
  battleLog(enemy.lore, 'lore');
  checkEnemyTurn();
}

function battleLog(msg, cls='normal') {
  if(!msg) return;
  const log=document.getElementById('bat-log');
  const d=document.createElement('div');
  d.className='log-'+cls; d.textContent=msg;
  log.appendChild(d); log.scrollTop=log.scrollHeight;
}

function renderBattleParty() {
  const cont=document.getElementById('bat-party');
  cont.innerHTML='';
  B.party.forEach(n=>{
    const active=isTurn(n);
    const div=document.createElement('div');
    div.className='bnorm'+(n.alive?'':' dead')+(active?' active':'');
    div.id='bn'+n.id;

    const img=document.createElement('img');
    img.src=G.imgCache[n.id]?.src || n.image || makeSvgFallback(n.id);
    img.onerror=()=>{ img.src=makeSvgFallback(n.id); };
    div.appendChild(img);

    const nm=document.createElement('div'); nm.className='bnorm-name';
    nm.textContent=n.name.replace(/^Normie /,'#'); div.appendChild(nm);

    const tp=document.createElement('div'); tp.className='bnorm-type';
    tp.textContent=n.type; div.appendChild(tp);

    const hpP=Math.max(0,n.hp/n.maxHp*100);
    const mpP=Math.max(0,n.mp/n.maxMp*100);
    div.innerHTML+=`
      <div class="bnorm-bar-wrap"><div class="bnorm-bar-hp" style="width:${hpP}%"></div></div>
      <div class="bnorm-bar-wrap"><div class="bnorm-bar-mp" style="width:${mpP}%"></div></div>
      <div class="bnorm-hp">${n.hp}/${n.maxHp}</div>`;
    cont.appendChild(div);
  });
  updateBattleButtons();
}

function updateEnemyBar() {
  const pct=Math.max(0,B.enemy.hp/B.enemy.maxHp*100);
  document.getElementById('enemy-hp-bar').style.width=pct+'%';
  document.getElementById('enemy-hp-text').textContent=`${B.enemy.hp} / ${B.enemy.maxHp} HP`;
}

function isTurn(n) { const t=B.order[B.turn]; return t&&t.isPlayer&&t.id===n.id; }
function curTurn() { return B.order[B.turn]; }

function updateBattleButtons() {
  const cur=curTurn();
  const ti=document.getElementById('bat-turn-info');
  const lbl=document.getElementById('bat-action-label');
  const dis=!cur||cur.isEnemy||B.over;
  ['btn-atk','btn-skill','btn-ult','btn-pot'].forEach(id=>document.getElementById(id).disabled=dis);
  if(dis){ ti.textContent=cur?.isEnemy?`${B.enemy.name} is acting…`:'—'; return; }

  document.getElementById('btn-skill').disabled = cur.mp<3;
  document.getElementById('btn-ult').disabled   = cur.mp<6;
  document.getElementById('btn-pot').disabled   = B.potions<=0;

  document.getElementById('lbl-atk').textContent   = `${cur.atkBasic} dmg · +2 MP`;
  document.getElementById('lbl-skill').textContent  = `${cur.sk1} · ${cur.atkSkill} dmg · 3 MP`;
  document.getElementById('lbl-ult').textContent    = `${cur.sk2} · ${cur.atkUltimate} dmg · 6 MP`;
  document.getElementById('lbl-pot').textContent    = `×${B.potions} · +35% HP`;
  ti.textContent  = `${cur.name} · HP ${cur.hp}/${cur.maxHp} · MP ${cur.mp}/${cur.maxMp} · CRIT ${Math.round(cur.crit*100)}%`;
  lbl.textContent = `${cur.name} (${cur.type}) — choose action`;

  document.querySelectorAll('.bnorm').forEach(el=>el.classList.remove('active'));
  document.getElementById('bn'+cur.id)?.classList.add('active');
}

function rollDmg(base, def, crit=0.05) {
  const reduced = Math.max(1, base - Math.floor(def*0.5));
  const isCrit  = Math.random()<crit;
  const v = Math.round(reduced*(0.88+Math.random()*0.24)*(isCrit?1.6:1));
  return { dmg:Math.max(1,v), crit:isCrit };
}

function floatDmg(val, onEnemy, isCrit=false) {
  const arena=document.getElementById('arena');
  const el=document.createElement('div');
  el.className='fdmg'+(isCrit?' crit-flash':'');
  el.textContent=(isCrit?'CRIT ':'') + '-'+val;
  el.style.cssText=onEnemy
    ? `right:${15+Math.random()*60}px; bottom:${50+Math.random()*50}px; color:${isCrit?'#000':'#444'}`
    : `left:${15+Math.random()*200}px; bottom:${40+Math.random()*50}px; color:${isCrit?'#000':'#666'}`;
  arena.appendChild(el);
  setTimeout(()=>el.remove(), 750);
}

// Player action handler — called from buttons
function battleAction(type) {
  if(!B||B.over) return;
  const actor=curTurn();
  if(!actor||actor.isEnemy) return;
  const en=B.enemy;

  if(type==='attack') {
    const {dmg,crit}=rollDmg(actor.atkBasic, en.def, actor.crit);
    en.hp=Math.max(0,en.hp-dmg);
    actor.mp=Math.min(actor.maxMp,actor.mp+2);
    floatDmg(dmg,true,crit);
    battleLog(`${actor.name} attacks — ${dmg}${crit?' CRIT!':''}`, crit?'crit':'normal');

  } else if(type==='skill') {
    if(actor.mp<3) return;
    actor.mp-=3;
    const {dmg,crit}=rollDmg(actor.atkSkill, en.def, actor.crit);
    en.hp=Math.max(0,en.hp-dmg);
    floatDmg(dmg,true,crit);
    battleLog(`${actor.name} uses ${actor.sk1} — ${dmg}${crit?' CRIT!':''}`, crit?'crit':'em');

  } else if(type==='ult') {
    if(actor.mp<6) return;
    actor.mp-=6;
    const {dmg,crit}=rollDmg(actor.atkUltimate, Math.floor(en.def*0.4), actor.crit+0.15);
    en.hp=Math.max(0,en.hp-dmg);
    floatDmg(dmg,true,crit);
    battleLog(`${actor.name} unleashes ${actor.sk2} — ${dmg}${crit?' CRIT!':''}!!`, 'big');

  } else if(type==='potion') {
    if(B.potions<=0) return;
    B.potions--;
    const target=B.party.filter(n=>n.alive).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
    if(target){ const h=Math.floor(target.maxHp*0.35); target.hp=Math.min(target.maxHp,target.hp+h); battleLog(`Potion → ${target.name} +${h} HP.`); }
  }

  // Sync MP back
  const inParty=B.party.find(p=>p.id===actor.id);
  if(inParty){ inParty.mp=actor.mp; inParty.hp=actor.hp; }

  renderBattleParty(); updateEnemyBar();
  if(checkEnd()) return;
  nextTurn();
}

function checkEnemyTurn() {
  if(curTurn()?.isEnemy){ updateBattleButtons(); setTimeout(enemyAct, 1050); }
}

function enemyAct() {
  if(!B||B.over) return;
  const alive=B.party.filter(n=>n.alive);
  if(!alive.length) return;

  // Target weakest HP %
  const target=alive.sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
  const heavy=Math.random()>0.72;
  const {dmg,crit}=rollDmg(heavy?Math.round(B.enemy.atk*1.65):B.enemy.atk, target.def, 0.06);
  target.hp=Math.max(0,target.hp-dmg);
  if(target.hp<=0) target.alive=false;
  floatDmg(dmg,false,crit);
  battleLog(
    heavy ? `${B.enemy.name} HEAVY STRIKE on ${target.name} — ${dmg}${crit?' CRIT!':''}!!`
          : `${B.enemy.name} attacks ${target.name} — ${dmg}${crit?' CRIT!':''}`,
    heavy||crit ? 'big' : 'normal'
  );
  renderBattleParty(); updateEnemyBar();
  if(checkEnd()) return;
  nextTurn();
}

function nextTurn() {
  B.order.forEach(t=>{ if(t.isPlayer){ const p=B.party.find(n=>n.id===t.id); if(p){ t.hp=p.hp; t.mp=p.mp; t.alive=p.alive; } } });
  let n=(B.turn+1)%B.order.length;
  for(let i=0;i<B.order.length;i++){
    const t=B.order[n];
    if(t.isEnemy||(t.isPlayer&&t.alive)) break;
    n=(n+1)%B.order.length;
  }
  if(n<=B.turn){ B.round++; if(B.round%3===0) battleLog(`— Round ${B.round} —`,'round'); }
  B.turn=n;
  updateBattleButtons();
  checkEnemyTurn();
}

function checkEnd() {
  if(B.enemy.hp<=0) {
    B.over=true;
    const gold=Math.floor(14+Math.random()*20+G.party.length*2+B.round*1.5);
    battleLog(`${B.enemy.name} defeated! +${gold} Gold.`,'big');
    setTimeout(()=>showBattleResult('victory',gold),800);
    return true;
  }
  if(!B.party.some(n=>n.alive)) {
    B.over=true;
    battleLog('All Normies fell.','big');
    setTimeout(()=>showBattleResult('defeat',0),800);
    return true;
  }
  return false;
}

function showBattleResult(type, gold) {
  document.getElementById('bat-main').classList.add('hidden');
  document.getElementById('bat-result').classList.remove('hidden');
  document.getElementById('bat-result-title').textContent = type==='victory'?'Victory.':'Defeated.';
  document.getElementById('bat-result-sub').textContent   = type==='victory'
    ? `${B.enemy.name} has been defeated.`
    : `Your party fell on round ${B.round}.`;
  const ge=document.getElementById('bat-result-gold');
  ge.textContent=gold>0?`+ ${gold} Gold`:'';

  // Update world state
  G.world.potions=B.potions;
  if(type==='victory'){ G.world.gold+=gold; G.world.battlesWon++; G.world.journal.push(`Defeated ${B.enemy.name}. +${gold}G.`); }
  else { G.world.journal.push(`Defeated by ${B.enemy.name} in ${B.zone.name}. Revived at ${G.world.potions} potions.`); }

  // Sync HP/MP
  B.party.forEach((bp,i)=>{ if(!G.party[i]) return; G.party[i].hp=bp.hp; G.party[i].mp=bp.mp; G.party[i].alive=bp.alive; });
  G.party.forEach(n=>{
    if(!n.alive){ n.alive=true; n.hp=Math.max(1,Math.floor(n.maxHp*.10)); }
    else{ n.hp=Math.min(n.maxHp,n.hp+Math.floor(n.maxHp*.12)); n.mp=Math.min(n.maxMp,n.mp+Math.floor(n.maxMp*.25)); }
  });
  renderHUD();
}

function closeBattleOverlay() {
  battleOpen=false;
  document.getElementById('battle').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════════
// BAG (Inventory)
// ════════════════════════════════════════════════════════════════
function openBag() {
  bagOpen=true;
  renderBag();
  document.getElementById('bag').classList.remove('hidden');
}
function closeBag() {
  bagOpen=false;
  document.getElementById('bag').classList.add('hidden');
}

function renderBag() {
  // Items
  const el=document.getElementById('bag-items'); el.innerHTML='';

  const makePot=()=>{
    const d=document.createElement('div'); d.className='bag-item';
    d.innerHTML=`<div class="bag-item-name">⬜ Potion</div>
      <div class="bag-item-desc">Restores 35% HP to the most injured Normie. Buy at the Shop in town for 15G.</div>
      <div class="bag-item-qty">×${G.world.potions}</div>`; return d;
  };
  el.appendChild(makePot());
  if(G.world.gold>0){
    const gd=document.createElement('div'); gd.className='bag-item';
    gd.innerHTML=`<div class="bag-item-name">◆ Gold</div>
      <div class="bag-item-desc">Earned from battles. Spend at the Shop (15G = 2 potions). ${G.world.battlesWon} battles won.</div>
      <div class="bag-item-qty">${G.world.gold} G</div>`;
    el.appendChild(gd);
  }

  // Party
  const pl=document.getElementById('bag-party'); pl.innerHTML='';
  G.party.forEach(n=>{
    const c=document.createElement('div'); c.className='bpc';
    const img=document.createElement('img');
    img.src=G.imgCache[n.id]?.src||n.image||makeSvgFallback(n.id);
    img.onerror=()=>{img.src=makeSvgFallback(n.id);};
    const hpP=Math.max(0,n.hp/n.maxHp*100), mpP=Math.max(0,n.mp/n.maxMp*100);
    const inf=document.createElement('div'); inf.className='bpc-info';
    inf.innerHTML=`
      <div class="bpc-name">${n.name}</div>
      <div class="bpc-type">${n.type} · Lv${n.lv} · ${n.alive?'✓ Active':'✕ KO'}</div>
      <div class="bpc-traits">${n.expression} · ${n.accessory} · ${n.gender}</div>
      <div class="bpc-stats">HP ${n.hp}/${n.maxHp} · MP ${n.mp}/${n.maxMp} · DEF ${n.def} · SPD ${n.spd} · CRIT ${Math.round(n.crit*100)}%<br/>${n.sk1}: ${n.atkSkill}dmg · ${n.sk2}: ${n.atkUltimate}dmg</div>
      <div class="bpc-bar-row"><div class="bpc-bar-wrap"><div class="bpc-bar-hp" style="width:${hpP}%"></div></div><div class="bpc-val">${n.hp}/${n.maxHp} HP</div></div>
      <div class="bpc-bar-row"><div class="bpc-bar-wrap"><div class="bpc-bar-mp" style="width:${mpP}%"></div></div><div class="bpc-val">${n.mp}/${n.maxMp} MP</div></div>`;
    c.append(img,inf); pl.appendChild(c);
  });

  // Journal
  const jl=document.getElementById('bag-journal');
  jl.textContent=G.world.journal.length?G.world.journal.slice(-16).reverse().join('\n'):'No entries yet.';
}

// ════════════════════════════════════════════════════════════════
// HUD
// ════════════════════════════════════════════════════════════════
function renderHUD() {
  const cont=document.getElementById('hud-party'); cont.innerHTML='';
  G.party.forEach(n=>{
    const div=document.createElement('div');
    div.className='hm'+(n.alive?'':' dead');
    const img=document.createElement('img');
    img.src=G.imgCache[n.id]?.src||n.image||makeSvgFallback(n.id);
    img.onerror=()=>{img.src=makeSvgFallback(n.id);};
    const hpP=Math.max(0,n.hp/n.maxHp*100), mpP=Math.max(0,n.mp/n.maxMp*100);
    const inf=document.createElement('div'); inf.className='hm-info';
    inf.innerHTML=`<div class="hm-name">${n.name.replace(/^Normie /,'#')}</div>
      <div class="hm-type">${n.type}</div>
      <div class="bar-wrap"><div class="bar-hp" style="width:${hpP}%"></div></div>
      <div class="bar-wrap"><div class="bar-mp" style="width:${mpP}%"></div></div>
      <div class="hm-hp">${n.hp}/${n.maxHp}</div>`;
    div.append(img,inf); cont.appendChild(div);
  });
  document.getElementById('hud-gold').textContent=G.world.gold;
  document.getElementById('hud-pot-count').textContent=G.world.potions;
}

// ════════════════════════════════════════════════════════════════
// PARTY SELECT
// ════════════════════════════════════════════════════════════════
const MAX_PARTY=5;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  G.screen=id;
}

function renderSlots() {
  const cont=document.getElementById('party-slots'); cont.innerHTML='';
  document.getElementById('party-count').textContent=`${G.party.length} / ${MAX_PARTY} selected`;
  document.getElementById('btn-start').disabled=G.party.length===0;
  for(let i=0;i<MAX_PARTY;i++){
    const n=G.party[i];
    const slot=document.createElement('div');
    slot.className='pslot '+(n?'filled':'empty');
    if(n){
      const img=document.createElement('img');
      img.src=G.imgCache[n.id]?.src||n.image||makeSvgFallback(n.id);
      img.onerror=()=>{img.src=makeSvgFallback(n.id);};
      const nm=document.createElement('div'); nm.className='pslot-name'; nm.textContent=n.name.replace(/^Normie /,'#');
      const tp=document.createElement('div'); tp.className='pslot-type'; tp.textContent=n.type;
      const st=document.createElement('div'); st.className='pslot-stat'; st.textContent=`Lv${n.lv} · HP${n.maxHp}`;
      slot.append(img,nm,tp,st);
      slot.onclick=()=>{ G.party.splice(i,1); renderSlots(); renderGrid(); };
    } else {
      slot.innerHTML=`<div class="pslot-num">${i+1}</div><div class="pslot-empty">—</div>`;
    }
    cont.appendChild(slot);
  }
}

function renderGrid() {
  const grid=document.getElementById('normie-grid');
  document.getElementById('col-count').textContent=G.collection.length?`(${G.collection.length})`:'';
  if(!G.collection.length){ grid.innerHTML='<div class="grid-loading">Loading your Normies…</div>'; return; }
  grid.innerHTML='';
  G.collection.forEach(n=>{
    const sel=G.party.some(p=>p.id===n.id);
    const card=document.createElement('div'); card.className='ncard'+(sel?' selected':'');
    const img=document.createElement('img');
    img.src=G.imgCache[n.id]?.src||n.image||makeSvgFallback(n.id);
    img.onerror=()=>{img.src=makeSvgFallback(n.id);};
    card.appendChild(img);
    card.innerHTML+=`<div class="ncard-id">#${n.id}</div>
      <div class="ncard-type">${n.type} · Lv${n.lv}</div>
      <div class="ncard-stat">HP ${n.maxHp} · ${n.sk1}</div>
      <div class="ncard-expr">${n.expression}${n.accessory!=='No Accessories'?' · '+n.accessory:''}</div>`;
    if(!sel) card.onclick=()=>{
      if(G.party.length>=MAX_PARTY) return;
      G.party.push({...n});
      renderSlots(); renderGrid();
    };
    grid.appendChild(card);
  });
}

// Preload images into cache for fast canvas rendering
function cacheImages(collection) {
  collection.forEach(n=>{
    if(G.imgCache[n.id]) return;
    const img=new Image();
    img.crossOrigin='anonymous';
    img.src=n.image||makeSvgFallback(n.id);
    img.onerror=()=>{ img.src=makeSvgFallback(n.id); };
    G.imgCache[n.id]=img;
  });
}

// Draw logo on title screen
function drawLogo() {
  const c=document.getElementById('logo-canvas');
  const ctx=c.getContext('2d');
  const r=rng(42);
  ctx.fillStyle='#e3e5e4'; ctx.fillRect(0,0,200,80);
  ctx.fillStyle='#48494b';
  for(let y=0;y<80;y+=2) for(let x=0;x<200;x+=2) {
    const cx=100,cy=40,rx=90,ry=35;
    if(Math.pow((x-cx)/rx,2)+Math.pow((y-cy)/ry,2)<1 && r()>0.6) ctx.fillRect(x,y,2,2);
  }
  // Eyes
  [[70,30],[90,30],[110,30],[130,30]].forEach(([ex,ey])=>{
    ctx.fillRect(ex,ey,6,6);
  });
}

// ════════════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', ()=>{
  drawLogo();

  // Battle action buttons
  document.getElementById('btn-atk').onclick   = ()=>battleAction('attack');
  document.getElementById('btn-skill').onclick  = ()=>battleAction('skill');
  document.getElementById('btn-ult').onclick    = ()=>battleAction('ult');
  document.getElementById('btn-pot').onclick    = ()=>battleAction('potion');
  document.getElementById('btn-bat-world').onclick = ()=>{ closeBattleOverlay(); };
  document.getElementById('btn-bat-party').onclick = ()=>{
    closeBattleOverlay();
    G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
    if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
    document.getElementById('screen-game').classList.remove('active');
    showScreen('party'); renderSlots(); renderGrid();
  };

  // Dialogue close
  document.getElementById('dialogue').addEventListener('click', ()=>closeDialogue());

  // Bag close
  document.getElementById('btn-close-bag').onclick = ()=>closeBag();

  // Back button
  document.getElementById('btn-back-title').onclick = ()=>showScreen('title');

  // Connect wallet
  document.getElementById('btn-connect').onclick = async ()=>{
    const btn=document.getElementById('btn-connect');
    btn.disabled=true; btn.textContent='Connecting…';
    try {
      const {provider,address}=await connectWallet();
      G.provider=provider; G.address=address; G.demo=false;
      const el=document.getElementById('wallet-addr');
      el.textContent=address.slice(0,6)+'…'+address.slice(-4);
      btn.textContent='Loading NFTs…';
      showScreen('party'); renderGrid();
      G.collection=await loadWalletNormies(address,provider,col=>{
        G.collection=col; cacheImages(col); renderGrid();
      });
      cacheImages(G.collection); renderGrid();
      btn.textContent='Connected'; btn.disabled=false;
    } catch(e){
      btn.textContent='Failed — retry'; btn.disabled=false; console.error(e);
    }
  };

  // Demo mode
  document.getElementById('btn-demo').onclick = async ()=>{
    G.demo=true; G.collection=[];
    document.getElementById('demo-pill').classList.add('show');
    showScreen('party'); renderGrid();
    G.collection=await loadDemoNormies(col=>{
      G.collection=col; cacheImages(col); renderGrid();
    });
    cacheImages(G.collection); renderGrid();
  };

  // Enter world
  document.getElementById('btn-start').onclick = ()=>{
    if(!G.party.length) return;
    G.world={gold:0,potions:3,steps:0,battlesWon:0,journal:[],px:30,py:30,eCooldown:0};
    G.party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
    generateMap();
    buildMapCanvas();

    showScreen('game');
    initWorldCanvas();
    updateZoneBar();
    renderHUD();

    // Start game loop
    keys={}; moveCd=0; dialogueOpen=false; battleOpen=false; bagOpen=false;
    if(rafId) cancelAnimationFrame(rafId);
    rafId=requestAnimationFrame(gameLoop);
  };

  window.addEventListener('resize',()=>{
    if(G.screen==='game'){ resizeWorldCanvas(); }
  });
});
