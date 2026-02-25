// tiles.js — Monochrome tileset engine
import { TILE_DATA, TILE_SIZE } from './tile_data.js';
export { TILE_SIZE };

export const T = {
  BED_FLOOR:0, BED_WALL:1, STAIRS_DN:2, BED:3, BOOKSHELF:4, DOOR:5,
  GRASS0:6, GRASS1:7, GRASS2:8, DARK_GRASS:9, PATH:10, TREE:11,
  HOUSE_WALL:12, ROOF:13, TOWN_FLOOR:14, SIGN:15,
  WATER:16, CAVE_FLOOR:17, CAVE_WALL:18, VOID:19,
  WALL:20, INN_FLOOR:21,
};

const ID_TO_KEY = [
  'bed_floor','bed_wall','stairs_dn','bed','bookshelf','door',
  'grass0','grass1','grass2','dark_grass','path','tree',
  'house_wall','roof','town_floor','sign',
  'water0','cave_floor','cave_wall','void0',
  'wall','inn_floor',
];

const IMG = {};
let loaded=0, total=0;

function loadImg(key, src) {
  total++;
  const img=new Image();
  img.onload=()=>{IMG[key]=img;loaded++;};
  img.src=src;
}

// Load all tiles
Object.keys(TILE_DATA).forEach(k=>{
  loadImg(k, TILE_DATA[k]);
});

export const tilesReady=()=>loaded>=total;

let _wf=0,_vf=0,_wc=0,_vc=0;
export function tickTiles(dt) {
  _wc+=dt; _vc+=dt;
  if(_wc>200){_wf=(_wf+1)%4;_wc=0;}
  if(_vc>180){_vf=(_vf+1)%4;_vc=0;}
}

export function getTile(id) {
  if(id===T.WATER) return IMG[`water${_wf}`]||null;
  if(id===T.VOID)  return IMG[`void${_vf}`]||null;
  const key=ID_TO_KEY[id];
  return key ? (IMG[key]||null) : null;
}
