// mapgen.js — Procedural map generation for each zone
import { T } from './tiles.js';
import { NPC_DEFS, MAPS } from './story.js';

function rng(seed) {
  let s = (seed*1664525+1013904223)&0x7fffffff;
  return () => { s=(s*1664525+1013904223)&0x7fffffff; return s/0x7fffffff; };
}

function blankMap(w, h, fill=T.GRASS0) {
  return Array.from({length:h}, ()=>new Array(w).fill(fill));
}

// ─── HOME (bedroom upstairs + living room downstairs) ───────
export function buildHomeMap() {
  const W=10, H=10;
  const m = blankMap(W, H, T.BED_FLOOR);

  // Walls
  for (let x=0;x<W;x++) { m[0][x]=T.BED_WALL; m[H-1][x]=T.BED_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.BED_WALL; m[y][W-1]=T.BED_WALL; }

  // Furniture
  m[1][2]=T.BED; m[1][3]=T.BED;
  m[1][7]=T.BOOKSHELF; m[1][8]=T.BOOKSHELF;

  // Stairs going down (near center-right)
  m[8][4]=T.STAIRS_DN; m[8][5]=T.STAIRS_DN;

  // Door at bottom center (exit)
  m[9][4]=T.DOOR; m[9][5]=T.DOOR;

  return { tiles: m, w:W, h:H, blocked: (x,y)=>{
    const t=m[y]?.[x];
    return t===T.BED_WALL||t===T.BED||t===T.BOOKSHELF;
  }};
}

// ─── OVERWORLD ──────────────────────────────────────────────
export function buildOverworldMap() {
  const W=48, H=48;
  const r = rng(31337);
  const m = blankMap(W, H, T.GRASS0);

  // Varied grass
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    const v = r();
    if      (v < 0.12) m[y][x] = T.GRASS1;
    else if (v < 0.22) m[y][x] = T.GRASS2;
    else if (v < 0.26) m[y][x] = T.DARK_GRASS;
  }

  // Dark void margin in east (corrupted edge)
  for (let y=0;y<H;y++) for (let x=38;x<W;x++) {
    m[y][x] = r()<0.65 ? T.DARK_GRASS : T.GRASS1;
  }

  // Border trees/walls
  for (let x=0;x<W;x++) { m[0][x]=T.TREE; m[H-1][x]=T.TREE; }
  for (let y=0;y<H;y++) { m[y][0]=T.TREE; m[y][W-1]=T.TREE; }

  // Water river (horizontal, middle)
  for (let x=5;x<42;x++) { m[15][x]=T.WATER; m[16][x]=T.WATER; }
  // Bridge/path over river
  m[15][20]=T.PATH; m[16][20]=T.PATH;
  m[15][21]=T.PATH; m[16][21]=T.PATH;

  // Tree clusters
  const treeClusters = [[5,5,4,4],[30,8,5,5],[8,30,3,4],[35,35,4,3],[12,40,3,3]];
  treeClusters.forEach(([cx,cy,cw,ch])=>{
    for (let dy=0;dy<ch;dy++) for (let dx=0;dx<cw;dx++) {
      if (r()<0.7 && cx+dx<W-1 && cy+dy<H-1) m[cy+dy][cx+dx]=T.TREE;
    }
  });

  // Main stone path
  for (let x=1;x<W-1;x++) { if(m[22][x]!==T.WATER) m[22][x]=T.PATH; }
  for (let y=1;y<H-1;y++) { if(m[y][22]!==T.WATER) m[y][22]=T.PATH; }

  // Secondary path to town (east)
  for (let x=30;x<46;x++) m[24][x]=T.PATH;

  // Home area (Render Street) - clear and cobble
  for (let y=19;y<26;y++) for (let x=12;x<22;x++) {
    m[y][x] = T.PATH;
  }

  // Player home
  for (let y=19;y<22;y++) for (let x=14;x<18;x++) m[y][x]=T.HOUSE_WALL;
  m[21][15]=T.DOOR; m[21][16]=T.DOOR;
  for (let x=14;x<18;x++) m[18][x]=T.ROOF;

  // Pix's house
  for (let y=20;y<23;y++) for (let x=24;x<28;x++) m[y][x]=T.HOUSE_WALL;
  m[22][25]=T.DOOR;
  for (let x=24;x<28;x++) m[19][x]=T.ROOF;

  // Sign post near start
  m[23][17]=T.SIGN;

  // Town entrance marker (east)
  m[24][37]=T.SIGN; m[24][38]=T.SIGN;

  return { tiles: m, w:W, h:H };
}

// ─── PIXEL TOWN ─────────────────────────────────────────────
export function buildTownMap() {
  const W=24, H=20;
  const r = rng(77777);
  const m = blankMap(W, H, T.TOWN_FLOOR);

  // Walls around town
  for (let x=0;x<W;x++) { m[0][x]=T.WALL; m[H-1][x]=T.WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.WALL; m[y][W-1]=T.WALL; }

  // Town exits (west = back to overworld)
  m[10][0]=T.PATH; m[11][0]=T.PATH;

  // Oracle's sanctum (north center)
  for (let y=1;y<7;y++) for (let x=4;x<14;x++) m[y][x]=T.INN_FLOOR;
  for (let x=4;x<14;x++) { m[1][x]=T.WALL; }
  for (let y=1;y<7;y++) { m[y][4]=T.WALL; m[y][13]=T.WALL; }
  m[6][8]=T.DOOR; m[6][9]=T.DOOR;

  // Inn (west side)
  for (let y=7;y<13;y++) for (let x=1;x<7;x++) m[y][x]=T.INN_FLOOR;
  for (let x=1;x<7;x++) m[7][x]=T.WALL;
  for (let y=7;y<13;y++) { m[y][1]=T.WALL; m[y][6]=T.WALL; }
  m[12][3]=T.DOOR; m[12][4]=T.DOOR;

  // Shop (east side)
  for (let y=7;y<14;y++) for (let x=16;x<22;x++) m[y][x]=T.INN_FLOOR;
  for (let x=16;x<22;x++) m[7][x]=T.WALL;
  for (let y=7;y<14;y++) { m[y][16]=T.WALL; m[y][21]=T.WALL; }
  m[13][18]=T.DOOR; m[13][19]=T.DOOR;

  // Historian building (center-right)
  for (let y=1;y<7;y++) for (let x=15;x<22;x++) m[y][x]=T.INN_FLOOR;
  for (let x=15;x<22;x++) m[1][x]=T.WALL;
  for (let y=1;y<7;y++) { m[y][15]=T.WALL; m[y][21]=T.WALL; }
  m[6][17]=T.DOOR; m[6][18]=T.DOOR;

  // Cave path (south)
  for (let y=14;y<H-1;y++) for (let x=8;x<16;x++) m[y][x]=T.PATH;
  m[H-1][11]=T.PATH; m[H-1][12]=T.PATH; // town exit south → cave

  // Signs
  m[14][7]=T.SIGN; m[14][16]=T.SIGN;

  // Trees/decoration
  [[2,14],[3,2],[21,2],[21,14],[2,3],[21,3]].forEach(([y,x])=>m[y][x]=T.TREE);

  return { tiles: m, w:W, h:H };
}

// ─── CAVE OF FIRST BITS ──────────────────────────────────────
export function buildCaveMap() {
  const W=22, H=18;
  const r = rng(55555);
  const m = blankMap(W, H, T.CAVE_FLOOR);

  // Cave walls
  for (let x=0;x<W;x++) { m[0][x]=T.CAVE_WALL; m[H-1][x]=T.CAVE_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.CAVE_WALL; m[y][W-1]=T.CAVE_WALL; }

  // Random rock clusters
  for (let y=2;y<H-2;y++) for (let x=2;x<W-2;x++) {
    if (r()<0.18) m[y][x]=T.CAVE_WALL;
  }

  // Main corridor (L-shape)
  for (let x=2;x<W-2;x++) { m[8][x]=T.CAVE_FLOOR; m[9][x]=T.CAVE_FLOOR; }
  for (let y=2;y<H-2;y++) { m[y][4]=T.CAVE_FLOOR; m[y][5]=T.CAVE_FLOOR; }
  for (let y=2;y<H-2;y++) { m[y][16]=T.CAVE_FLOOR; m[y][17]=T.CAVE_FLOOR; }

  // Boss room at east end
  for (let y=5;y<13;y++) for (let x=14;x<20;x++) m[y][x]=T.CAVE_FLOOR;
  for (let x=14;x<20;x++) { m[5][x]=T.CAVE_WALL; m[12][x]=T.CAVE_WALL; }
  m[6][14]=T.CAVE_WALL; m[11][14]=T.CAVE_WALL;

  // Entry (north) from town
  m[1][4]=T.CAVE_FLOOR; m[1][5]=T.CAVE_FLOOR;

  // Exit south → void lands
  m[H-1][16]=T.CAVE_FLOOR; m[H-1][17]=T.CAVE_FLOOR;

  // Spirit NPC area
  for (let y=3;y<6;y++) for (let x=3;x<8;x++) m[y][x]=T.CAVE_FLOOR;

  return { tiles: m, w:W, h:H };
}

// ─── CORRUPTED VOID LANDS ────────────────────────────────────
export function buildVoidLandsMap() {
  const W=32, H=28;
  const r = rng(99999);
  const m = blankMap(W, H, T.DARK_GRASS);

  // Void cracks (horizontal bands)
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    m[y][x] = r()<0.55 ? T.VOID : T.DARK_GRASS;
  }

  // Stone path through the void (only safe route)
  for (let x=2;x<W-2;x++) { m[14][x]=T.PATH; m[15][x]=T.PATH; }
  for (let y=6;y<H-4;y++) { m[y][4]=T.PATH; m[y][5]=T.PATH; }

  // Ruined buildings
  [[5,7,5,4],[8,18,4,3],[15,22,5,4]].forEach(([cy,cx,cw,ch])=>{
    for (let dy=0;dy<ch;dy++) for (let dx=0;dx<cw;dx++) {
      m[cy+dy][cx+dx] = (r()<0.6) ? T.WALL : T.CAVE_FLOOR;
    }
  });

  // Border walls
  for (let x=0;x<W;x++) { m[0][x]=T.CAVE_WALL; m[H-1][x]=T.CAVE_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.CAVE_WALL; m[y][W-1]=T.CAVE_WALL; }

  // Cave entrance (west)
  m[14][0]=T.PATH; m[15][0]=T.PATH;
  // Citadel entrance (east)
  m[14][W-1]=T.PATH; m[15][W-1]=T.PATH;

  // Survivor shelter
  for (let y=6;y<10;y++) for (let x=3;x<8;x++) m[y][x]=T.CAVE_FLOOR;

  return { tiles: m, w:W, h:H };
}

// ─── VOID CITADEL ────────────────────────────────────────────
export function buildCitadelMap() {
  const W=20, H=18;
  const r = rng(11111);
  const m = blankMap(W, H, T.CAVE_FLOOR);

  // Outer void walls
  for (let x=0;x<W;x++) { m[0][x]=T.CAVE_WALL; m[H-1][x]=T.CAVE_WALL; }
  for (let y=0;y<H;y++) { m[y][0]=T.CAVE_WALL; m[y][W-1]=T.CAVE_WALL; }

  // Void tiles throughout
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    if (r()<0.35) m[y][x]=T.VOID;
  }

  // Main corridor to boss
  for (let x=1;x<W-1;x++) { m[9][x]=T.PATH; m[10][x]=T.PATH; }
  for (let y=1;y<H-1;y++) { m[y][10]=T.PATH; }

  // Boss chamber
  for (let y=2;y<8;y++) for (let x=14;x<19;x++) m[y][x]=T.CAVE_FLOOR;
  for (let x=14;x<19;x++) m[2][x]=T.CAVE_WALL;
  for (let y=2;y<8;y++) { m[y][14]=T.CAVE_WALL; m[y][18]=T.CAVE_WALL; }

  // Entrance from void lands (west)
  m[9][0]=T.PATH; m[10][0]=T.PATH;

  return { tiles: m, w:W, h:H };
}

// ─── OBSTACLE CHECKER ───────────────────────────────────────
const BLOCKED_TILES = new Set([
  T.BED_WALL, T.BOOKSHELF, T.TREE, T.HOUSE_WALL, T.ROOF,
  T.WALL, T.CAVE_WALL, T.BED, T.WATER, T.DOOR,
]);
export const isTileBlocked = t => BLOCKED_TILES.has(t);

// Tile is "enter map trigger" if it's a door or stairs
export const isTrigger = t => t===T.DOOR || t===T.STAIRS_DN;

export const MAP_BUILDERS = {
  home:       buildHomeMap,
  overworld:  buildOverworldMap,
  town:       buildTownMap,
  cave:       buildCaveMap,
  void_lands: buildVoidLandsMap,
  citadel:    buildCitadelMap,
};

export const MAP_SPAWN = {
  home:       { x:4, y:7 },
  overworld:  { x:16, y:22 },
  town:       { x:4, y:10 },
  cave:       { x:4, y:3 },
  void_lands: { x:5, y:14 },
  citadel:    { x:3, y:9 },
};
