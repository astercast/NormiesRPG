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

// ─── HOME UPSTAIRS (bedroom) ────────────────────────────────
export function buildHomeUpMap() {
  const W=12, H=10;
  const m = blankMap(W, H, T.BED_FLOOR);
  // Walls
  for(let x=0;x<W;x++){m[0][x]=T.BED_WALL;m[H-1][x]=T.BED_WALL;}
  for(let y=0;y<H;y++){m[y][0]=T.BED_WALL;m[y][W-1]=T.BED_WALL;}
  // Bed (top-left area)
  m[1][1]=T.BED; m[1][2]=T.BED;
  // Bookshelf (top-right)
  m[1][9]=T.BOOKSHELF; m[1][10]=T.BOOKSHELF;
  // Stairs going down (center-bottom)
  m[8][5]=T.STAIRS_DN; m[8][6]=T.STAIRS_DN;
  // Window decorations as wall
  m[0][4]=T.BED_WALL; m[0][5]=T.BED_WALL;
  return { tiles:m, w:W, h:H };
}

// ─── HOME DOWNSTAIRS (living room / kitchen) ────────────────
export function buildHomeDownMap() {
  const W=12, H=10;
  const m = blankMap(W, H, T.INN_FLOOR);
  // Walls
  for(let x=0;x<W;x++){m[0][x]=T.WALL;m[H-1][x]=T.WALL;}
  for(let y=0;y<H;y++){m[y][0]=T.WALL;m[y][W-1]=T.WALL;}
  // Stairs up (top center — matching home_up bottom)
  m[1][5]=T.STAIRS_DN; m[1][6]=T.STAIRS_DN;
  // Front door exit at bottom
  m[9][5]=T.DOOR; m[9][6]=T.DOOR;
  // Kitchen shelf area (right side)
  m[1][9]=T.BOOKSHELF; m[1][10]=T.BOOKSHELF;
  // Table in center
  m[4][5]=T.BED; m[4][6]=T.BED;
  // Mom NPC will be at x:3, y:2
  return { tiles:m, w:W, h:H };
}

// ─── OVERWORLD ──────────────────────────────────────────────
export function buildOverworldMap() {
  const W=48, H=48;
  const r = rng(31337);
  const m = blankMap(W, H, T.GRASS0);
  // Varied grass
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    const v=r();
    if(v<0.12)m[y][x]=T.GRASS1;
    else if(v<0.22)m[y][x]=T.GRASS2;
    else if(v<0.26)m[y][x]=T.DARK_GRASS;
  }
  // Dark void margin (east)
  for(let y=0;y<H;y++) for(let x=38;x<W;x++){
    m[y][x]=r()<0.65?T.DARK_GRASS:T.GRASS1;
  }
  // Border trees
  for(let x=0;x<W;x++){m[0][x]=T.TREE;m[H-1][x]=T.TREE;}
  for(let y=0;y<H;y++){m[y][0]=T.TREE;m[y][W-1]=T.TREE;}
  // River
  for(let x=5;x<42;x++){m[15][x]=T.WATER;m[16][x]=T.WATER;}
  m[15][20]=T.PATH;m[16][20]=T.PATH;m[15][21]=T.PATH;m[16][21]=T.PATH;
  // Tree clusters
  [[5,5,4,4],[30,8,5,5],[8,30,3,4],[35,35,4,3],[12,40,3,3]].forEach(([cx,cy,cw,ch])=>{
    for(let dy=0;dy<ch;dy++) for(let dx=0;dx<cw;dx++){
      if(r()<0.7&&cx+dx<W-1&&cy+dy<H-1) m[cy+dy][cx+dx]=T.TREE;
    }
  });
  // Main paths
  for(let x=1;x<W-1;x++){if(m[22][x]!==T.WATER)m[22][x]=T.PATH;}
  for(let y=1;y<H-1;y++){if(m[y][22]!==T.WATER)m[y][22]=T.PATH;}
  for(let x=30;x<46;x++)m[24][x]=T.PATH;
  // Home area
  for(let y=19;y<26;y++) for(let x=12;x<22;x++) m[y][x]=T.PATH;
  // Player home
  for(let y=19;y<22;y++) for(let x=14;x<18;x++) m[y][x]=T.HOUSE_WALL;
  m[21][15]=T.DOOR;m[21][16]=T.DOOR;
  for(let x=14;x<18;x++) m[18][x]=T.ROOF;
  // Pix's house
  for(let y=20;y<23;y++) for(let x=24;x<28;x++) m[y][x]=T.HOUSE_WALL;
  m[22][25]=T.DOOR;
  for(let x=24;x<28;x++) m[19][x]=T.ROOF;
  // Elder Vex hut (northwest)
  for(let y=8;y<11;y++) for(let x=6;x<10;x++) m[y][x]=T.HOUSE_WALL;
  m[10][7]=T.DOOR;
  for(let x=6;x<10;x++) m[7][x]=T.ROOF;
  // Signs
  m[23][17]=T.SIGN;
  m[24][37]=T.SIGN;m[24][38]=T.SIGN;
  return { tiles:m, w:W, h:H };
}

// ─── PIXEL TOWN ─────────────────────────────────────────────
export function buildTownMap() {
  const W=26, H=22;
  const r = rng(77777);
  const m = blankMap(W, H, T.TOWN_FLOOR);
  for(let x=0;x<W;x++){m[0][x]=T.WALL;m[H-1][x]=T.WALL;}
  for(let y=0;y<H;y++){m[y][0]=T.WALL;m[y][W-1]=T.WALL;}
  // West exit (overworld)
  m[10][0]=T.PATH;m[11][0]=T.PATH;
  // Oracle sanctum (north center)
  for(let y=1;y<7;y++) for(let x=5;x<15;x++) m[y][x]=T.INN_FLOOR;
  for(let x=5;x<15;x++) m[1][x]=T.WALL;
  for(let y=1;y<7;y++){m[y][5]=T.WALL;m[y][14]=T.WALL;}
  m[6][9]=T.DOOR;m[6][10]=T.DOOR;
  // Inn (west)
  for(let y=7;y<13;y++) for(let x=1;x<7;x++) m[y][x]=T.INN_FLOOR;
  for(let x=1;x<7;x++) m[7][x]=T.WALL;
  for(let y=7;y<13;y++){m[y][1]=T.WALL;m[y][6]=T.WALL;}
  m[12][3]=T.DOOR;m[12][4]=T.DOOR;
  // Shop (east)
  for(let y=7;y<15;y++) for(let x=17;x<24;x++) m[y][x]=T.INN_FLOOR;
  for(let x=17;x<24;x++) m[7][x]=T.WALL;
  for(let y=7;y<15;y++){m[y][17]=T.WALL;m[y][23]=T.WALL;}
  m[14][20]=T.DOOR;m[14][21]=T.DOOR;
  // Library/Historian (northeast)
  for(let y=1;y<7;y++) for(let x=17;x<24;x++) m[y][x]=T.INN_FLOOR;
  for(let x=17;x<24;x++) m[1][x]=T.WALL;
  for(let y=1;y<7;y++){m[y][17]=T.WALL;m[y][23]=T.WALL;}
  m[6][19]=T.DOOR;m[6][20]=T.DOOR;
  // Cave path (south)
  for(let y=15;y<H-1;y++) for(let x=9;x<17;x++) m[y][x]=T.PATH;
  m[H-1][12]=T.PATH;m[H-1][13]=T.PATH;
  // Decorative trees
  [[2,15],[3,2],[22,2],[22,14],[2,3],[22,3]].forEach(([y,x])=>m[y][x]=T.TREE);
  m[15][8]=T.SIGN;m[15][17]=T.SIGN;
  return { tiles:m, w:W, h:H };
}

// ─── CAVE ───────────────────────────────────────────────────
export function buildCaveMap() {
  const W=24, H=20;
  const r = rng(55555);
  const m = blankMap(W, H, T.CAVE_FLOOR);
  for(let x=0;x<W;x++){m[0][x]=T.CAVE_WALL;m[H-1][x]=T.CAVE_WALL;}
  for(let y=0;y<H;y++){m[y][0]=T.CAVE_WALL;m[y][W-1]=T.CAVE_WALL;}
  // Random rocks
  for(let y=2;y<H-2;y++) for(let x=2;x<W-2;x++){
    if(r()<0.18) m[y][x]=T.CAVE_WALL;
  }
  // Main corridors
  for(let x=2;x<W-2;x++){m[9][x]=T.CAVE_FLOOR;m[10][x]=T.CAVE_FLOOR;}
  for(let y=2;y<H-2;y++){m[y][4]=T.CAVE_FLOOR;m[y][5]=T.CAVE_FLOOR;}
  for(let y=2;y<H-2;y++){m[y][18]=T.CAVE_FLOOR;m[y][19]=T.CAVE_FLOOR;}
  // Boss room
  for(let y=4;y<12;y++) for(let x=15;x<22;x++) m[y][x]=T.CAVE_FLOOR;
  for(let x=15;x<22;x++){m[4][x]=T.CAVE_WALL;m[11][x]=T.CAVE_WALL;}
  m[5][15]=T.CAVE_WALL;m[10][15]=T.CAVE_WALL;
  // Spirit area
  for(let y=2;y<6;y++) for(let x=3;x<8;x++) m[y][x]=T.CAVE_FLOOR;
  // Entries/exits
  m[1][4]=T.CAVE_FLOOR;m[1][5]=T.CAVE_FLOOR;
  m[H-1][18]=T.CAVE_FLOOR;m[H-1][19]=T.CAVE_FLOOR;
  // Water puddles
  m[6][10]=T.WATER;m[6][11]=T.WATER;m[13][6]=T.WATER;
  return { tiles:m, w:W, h:H };
}

// ─── VOID LANDS ─────────────────────────────────────────────
export function buildVoidLandsMap() {
  const W=34, H=30;
  const r = rng(99999);
  const m = blankMap(W, H, T.DARK_GRASS);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    m[y][x]=r()<0.55?T.VOID:T.DARK_GRASS;
  }
  for(let x=2;x<W-2;x++){m[14][x]=T.PATH;m[15][x]=T.PATH;}
  for(let y=6;y<H-4;y++){m[y][4]=T.PATH;m[y][5]=T.PATH;}
  // Ruins
  [[5,7,5,4],[8,18,4,3],[15,22,5,4]].forEach(([cy,cx,cw,ch])=>{
    for(let dy=0;dy<ch;dy++) for(let dx=0;dx<cw;dx++){
      m[cy+dy][cx+dx]=(r()<0.6)?T.WALL:T.CAVE_FLOOR;
    }
  });
  // Survivor shelter
  for(let y=6;y<10;y++) for(let x=3;x<8;x++) m[y][x]=T.CAVE_FLOOR;
  // Defector position area
  for(let y=6;y<10;y++) for(let x=20;x<26;x++) m[y][x]=T.CAVE_FLOOR;
  // Borders
  for(let x=0;x<W;x++){m[0][x]=T.CAVE_WALL;m[H-1][x]=T.CAVE_WALL;}
  for(let y=0;y<H;y++){m[y][0]=T.CAVE_WALL;m[y][W-1]=T.CAVE_WALL;}
  m[14][0]=T.PATH;m[15][0]=T.PATH;
  m[14][W-1]=T.PATH;m[15][W-1]=T.PATH;
  return { tiles:m, w:W, h:H };
}

// ─── CITADEL ────────────────────────────────────────────────
export function buildCitadelMap() {
  const W=22, H=20;
  const r = rng(11111);
  const m = blankMap(W, H, T.CAVE_FLOOR);
  for(let x=0;x<W;x++){m[0][x]=T.CAVE_WALL;m[H-1][x]=T.CAVE_WALL;}
  for(let y=0;y<H;y++){m[y][0]=T.CAVE_WALL;m[y][W-1]=T.CAVE_WALL;}
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    if(r()<0.30) m[y][x]=T.VOID;
  }
  for(let x=1;x<W-1;x++){m[9][x]=T.PATH;m[10][x]=T.PATH;}
  for(let y=1;y<H-1;y++) m[y][11]=T.PATH;
  // Boss chamber
  for(let y=2;y<9;y++) for(let x=15;x<20;x++) m[y][x]=T.CAVE_FLOOR;
  for(let x=15;x<20;x++) m[2][x]=T.CAVE_WALL;
  for(let y=2;y<9;y++){m[y][15]=T.CAVE_WALL;m[y][19]=T.CAVE_WALL;}
  m[9][0]=T.PATH;m[10][0]=T.PATH;
  return { tiles:m, w:W, h:H };
}

const BLOCKED_TILES = new Set([
  T.BED_WALL,T.BOOKSHELF,T.TREE,T.HOUSE_WALL,T.ROOF,
  T.WALL,T.CAVE_WALL,T.BED,T.WATER,
]);
export const isTileBlocked = t => BLOCKED_TILES.has(t);
export const isTrigger = t => t===T.DOOR||t===T.STAIRS_DN;

export const MAP_BUILDERS = {
  home_up:    buildHomeUpMap,
  home_down:  buildHomeDownMap,
  overworld:  buildOverworldMap,
  town:       buildTownMap,
  cave:       buildCaveMap,
  void_lands: buildVoidLandsMap,
  citadel:    buildCitadelMap,
};

export const MAP_SPAWN = {
  home_up:    { x:5, y:5 },
  home_down:  { x:5, y:3 },
  overworld:  { x:16, y:22 },
  town:       { x:4, y:10 },
  cave:       { x:4, y:3 },
  void_lands: { x:5, y:14 },
  citadel:    { x:3, y:9 },
};
