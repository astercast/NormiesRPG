// mapgen.js — Procedural map generation
import { T } from './tiles.js';
import { NPC_DEFS, MAPS } from './story.js';

function rng(seed) {
  let s = (seed*1664525+1013904223)&0x7fffffff;
  return () => { s=(s*1664525+1013904223)&0x7fffffff; return s/0x7fffffff; };
}
function blankMap(w, h, fill=T.GRASS0) {
  return Array.from({length:h}, ()=>new Array(w).fill(fill));
}

// ─── HOME ────────────────────────────────────────────────────
export function buildHomeMap() {
  const W=12, H=13;
  const m = blankMap(W, H, T.BED_FLOOR);
  // Full border walls
  for (let x=0;x<W;x++) { m[0][x]=T.BED_WALL; m[H-1][x]=T.BED_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.BED_WALL; m[y][W-1]=T.BED_WALL; }
  // Door gap at bottom center — use DOOR tile (walkable, triggers exit)
  m[H-1][5]=T.DOOR; m[H-1][6]=T.DOOR;
  // Furniture
  m[1][2]=T.BED; m[1][3]=T.BED; m[2][2]=T.BED; m[2][3]=T.BED;
  m[1][8]=T.BOOKSHELF; m[1][9]=T.BOOKSHELF; m[2][8]=T.BOOKSHELF;
  // Rug
  m[6][4]=T.TOWN_FLOOR; m[6][5]=T.TOWN_FLOOR; m[6][6]=T.TOWN_FLOOR; m[6][7]=T.TOWN_FLOOR;
  m[7][4]=T.TOWN_FLOOR; m[7][5]=T.TOWN_FLOOR; m[7][6]=T.TOWN_FLOOR; m[7][7]=T.TOWN_FLOOR;
  // Path leading to door
  m[H-2][5]=T.PATH; m[H-2][6]=T.PATH;
  return { tiles:m, w:W, h:H };
}

// ─── OVERWORLD ──────────────────────────────────────────────
export function buildOverworldMap() {
  const W=56, H=56;
  const r = rng(31337);
  const m = blankMap(W, H, T.GRASS0);
  // Varied grass
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    const v=r();
    if      (v<0.12) m[y][x]=T.GRASS1;
    else if (v<0.22) m[y][x]=T.GRASS2;
  }
  // Eastern dark margin
  for (let y=0;y<H;y++) for (let x=40;x<W;x++) {
    m[y][x]=r()<0.7?T.DARK_GRASS:T.GRASS1;
  }
  // Border trees
  for (let x=0;x<W;x++) { m[0][x]=T.TREE; m[H-1][x]=T.TREE; }
  for (let y=0;y<H;y++) { m[y][0]=T.TREE; m[y][W-1]=T.TREE; }
  // River (horizontal band)
  for (let x=4;x<50;x++) { m[17][x]=T.WATER; m[18][x]=T.WATER; }
  // Bridge over river
  for (let i=0;i<3;i++) { m[17][22+i]=T.PATH; m[18][22+i]=T.PATH; }
  // Tree clusters
  [[6,6,5,4],[32,10,4,5],[10,32,4,4],[36,38,5,4]].forEach(([cx,cy,cw,ch])=>{
    for (let dy=0;dy<ch;dy++) for (let dx=0;dx<cw;dx++) {
      if (r()<0.65 && cx+dx<W-1 && cy+dy<H-1) m[cy+dy][cx+dx]=T.TREE;
    }
  });
  // Main path east-west
  for (let x=2;x<W-2;x++) if(m[24][x]!==T.WATER) m[24][x]=T.PATH;
  for (let x=38;x<W-2;x++) m[26][x]=T.PATH;
  // Render Street (home area)
  for (let y=21;y<28;y++) for (let x=13;x<24;x++) {
    if (m[y][x]!==T.TREE) m[y][x]=T.PATH;
  }
  // Player home building at (14,21)
  for (let y=21;y<24;y++) for (let x=14;x<19;x++) m[y][x]=T.HOUSE_WALL;
  for (let x=14;x<19;x++) m[20][x]=T.ROOF;
  m[24][15]=T.PATH; m[24][16]=T.PATH;
  // Pix's house
  for (let y=21;y<24;y++) for (let x=25;x<30;x++) m[y][x]=T.HOUSE_WALL;
  for (let x=25;x<30;x++) m[20][x]=T.ROOF;
  m[23][26]=T.PATH; m[23][27]=T.PATH;
  // Signs
  m[25][17]=T.SIGN; m[26][42]=T.SIGN;
  return { tiles:m, w:W, h:H };
}

// ─── TOWN ────────────────────────────────────────────────────
export function buildTownMap() {
  const W=26, H=22;
  const r=rng(77777);
  const m=blankMap(W,H,T.TOWN_FLOOR);
  for (let x=0;x<W;x++) { m[0][x]=T.WALL; m[H-1][x]=T.WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.WALL; m[y][W-1]=T.WALL; }
  // West exit
  m[11][0]=T.PATH; m[12][0]=T.PATH;
  // Oracle sanctum (north center)
  for (let y=1;y<7;y++) for (let x=5;x<15;x++) m[y][x]=T.INN_FLOOR;
  for (let x=5;x<15;x++) m[1][x]=T.WALL;
  for (let y=1;y<7;y++) { m[y][5]=T.WALL; m[y][14]=T.WALL; }
  m[6][9]=T.PATH; m[6][10]=T.PATH;
  // Inn (west)
  for (let y=8;y<14;y++) for (let x=1;x<7;x++) m[y][x]=T.INN_FLOOR;
  for (let x=1;x<7;x++) m[8][x]=T.WALL;
  for (let y=8;y<14;y++) { m[y][1]=T.WALL; m[y][6]=T.WALL; }
  m[13][3]=T.PATH; m[13][4]=T.PATH;
  // Shop (east)
  for (let y=8;y<15;y++) for (let x=18;x<24;x++) m[y][x]=T.INN_FLOOR;
  for (let x=18;x<24;x++) m[8][x]=T.WALL;
  for (let y=8;y<15;y++) { m[y][18]=T.WALL; m[y][23]=T.WALL; }
  m[14][20]=T.PATH; m[14][21]=T.PATH;
  // Historian (north right)
  for (let y=1;y<7;y++) for (let x=17;x<24;x++) m[y][x]=T.INN_FLOOR;
  for (let x=17;x<24;x++) m[1][x]=T.WALL;
  for (let y=1;y<7;y++) { m[y][17]=T.WALL; m[y][23]=T.WALL; }
  m[6][19]=T.PATH; m[6][20]=T.PATH;
  // South path to cave
  for (let y=15;y<H-1;y++) for (let x=10;x<16;x++) m[y][x]=T.PATH;
  m[H-1][12]=T.PATH; m[H-1][13]=T.PATH;
  [[2,16],[3,3],[20,3],[20,16]].forEach(([y,x])=>m[y][x]=T.TREE);
  m[15][8]=T.SIGN; m[15][17]=T.SIGN;
  return { tiles:m, w:W, h:H };
}

// ─── CAVE ────────────────────────────────────────────────────
export function buildCaveMap() {
  const W=24, H=20;
  const r=rng(55555);
  const m=blankMap(W,H,T.CAVE_FLOOR);
  for (let x=0;x<W;x++) { m[0][x]=T.CAVE_WALL; m[H-1][x]=T.CAVE_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.CAVE_WALL; m[y][W-1]=T.CAVE_WALL; }
  for (let y=2;y<H-2;y++) for (let x=2;x<W-2;x++) {
    if (r()<0.18) m[y][x]=T.CAVE_WALL;
  }
  // L-corridor
  for (let x=2;x<W-2;x++) { m[9][x]=T.CAVE_FLOOR; m[10][x]=T.CAVE_FLOOR; }
  for (let y=2;y<H-2;y++) { m[y][4]=T.CAVE_FLOOR; m[y][5]=T.CAVE_FLOOR; }
  for (let y=2;y<H-2;y++) { m[y][18]=T.CAVE_FLOOR; m[y][19]=T.CAVE_FLOOR; }
  // Boss room
  for (let y=4;y<14;y++) for (let x=15;x<22;x++) m[y][x]=T.CAVE_FLOOR;
  for (let x=15;x<22;x++) { m[4][x]=T.CAVE_WALL; m[13][x]=T.CAVE_WALL; }
  m[5][15]=T.CAVE_WALL; m[12][15]=T.CAVE_WALL;
  // Entries
  m[1][4]=T.CAVE_FLOOR; m[1][5]=T.CAVE_FLOOR;
  m[H-1][18]=T.CAVE_FLOOR; m[H-1][19]=T.CAVE_FLOOR;
  // Spirit area
  for (let y=3;y<7;y++) for (let x=3;x<8;x++) m[y][x]=T.CAVE_FLOOR;
  return { tiles:m, w:W, h:H };
}

// ─── VOID LANDS ──────────────────────────────────────────────
export function buildVoidLandsMap() {
  const W=34, H=30;
  const r=rng(99999);
  const m=blankMap(W,H,T.DARK_GRASS);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    m[y][x]=r()<0.55?T.VOID:T.DARK_GRASS;
  }
  // Safe path
  for (let x=2;x<W-2;x++) { m[15][x]=T.PATH; m[16][x]=T.PATH; }
  for (let y=6;y<H-4;y++) { m[y][4]=T.PATH; m[y][5]=T.PATH; }
  // Ruins
  [[5,8,5,4],[9,20,4,3],[16,24,5,4]].forEach(([cy,cx,cw,ch])=>{
    for (let dy=0;dy<ch;dy++) for (let dx=0;dx<cw;dx++) {
      m[cy+dy][cx+dx]=r()<0.6?T.WALL:T.CAVE_FLOOR;
    }
  });
  for (let x=0;x<W;x++) { m[0][x]=T.CAVE_WALL; m[H-1][x]=T.CAVE_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.CAVE_WALL; m[y][W-1]=T.CAVE_WALL; }
  m[15][0]=T.PATH; m[16][0]=T.PATH;
  m[15][W-1]=T.PATH; m[16][W-1]=T.PATH;
  for (let y=6;y<10;y++) for (let x=3;x<8;x++) m[y][x]=T.CAVE_FLOOR;
  return { tiles:m, w:W, h:H };
}

// ─── CITADEL ─────────────────────────────────────────────────
export function buildCitadelMap() {
  const W=22, H=20;
  const r=rng(11111);
  const m=blankMap(W,H,T.CAVE_FLOOR);
  for (let x=0;x<W;x++) { m[0][x]=T.CAVE_WALL; m[H-1][x]=T.CAVE_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.CAVE_WALL; m[y][W-1]=T.CAVE_WALL; }
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    if (r()<0.35) m[y][x]=T.VOID;
  }
  for (let x=1;x<W-1;x++) { m[10][x]=T.PATH; m[11][x]=T.PATH; }
  for (let y=1;y<H-1;y++) m[y][11]=T.PATH;
  for (let y=2;y<9;y++) for (let x=15;x<21;x++) m[y][x]=T.CAVE_FLOOR;
  for (let x=15;x<21;x++) m[2][x]=T.CAVE_WALL;
  for (let y=2;y<9;y++) { m[y][15]=T.CAVE_WALL; m[y][20]=T.CAVE_WALL; }
  m[10][0]=T.PATH; m[11][0]=T.PATH;
  return { tiles:m, w:W, h:H };
}

// ─── BLOCKED / TRIGGER ───────────────────────────────────────
const BLOCKED_TILES = new Set([
  T.BED_WALL, T.BOOKSHELF, T.TREE, T.HOUSE_WALL, T.ROOF,
  T.WALL, T.CAVE_WALL, T.BED, T.WATER,
]);
export const isTileBlocked = t => BLOCKED_TILES.has(t);
export const isTrigger = t => t===T.DOOR;

export const MAP_BUILDERS = {
  home: buildHomeMap, overworld: buildOverworldMap,
  town: buildTownMap, cave: buildCaveMap,
  void_lands: buildVoidLandsMap, citadel: buildCitadelMap,
};
export const MAP_SPAWN = {
  home:       { x:5, y:7 },
  overworld:  { x:15, y:25 },
  town:       { x:4, y:12 },
  cave:       { x:4, y:3 },
  void_lands: { x:5, y:15 },
  citadel:    { x:3, y:10 },
};
