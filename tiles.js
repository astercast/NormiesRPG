// tiles.js — Uses pre-generated real pixel art PNGs + animated water/torch frames
import { TILE_DATA, TILE_SIZE } from './tile_data.js';

export { TILE_SIZE };

export const TileID = {
  GRASS:0, GRASS2:1, GRASS3:2, GRASS4:3,
  TALL:4, PATH:5, WALL:6,
  TREE:7, TREE_DARK:8,
  WATER:9,
  TOWN:10, INN:11, SHOP:12, SIGN:13,
  CAVE:14, BUILDING_WALL:15, ROOF:16, TORCH:17,
};

const T = TileID;

// Pre-load all images from base64 data
const IMG = {};
let _loadCount = 0, _totalCount = 0;

function loadImg(key, data) {
  _totalCount++;
  const img = new Image();
  img.onload = () => { IMG[key] = img; _loadCount++; };
  img.src = data;
}

// Static tiles
loadImg('grass0', TILE_DATA.grass0);
loadImg('grass1', TILE_DATA.grass1);
loadImg('grass2', TILE_DATA.grass2);
loadImg('grass3', TILE_DATA.grass3);
loadImg('tall',   TILE_DATA.tall);
loadImg('path',   TILE_DATA.path);
loadImg('wall',   TILE_DATA.wall);
loadImg('tree',   TILE_DATA.tree);
loadImg('treed',  TILE_DATA.treed);
loadImg('town',   TILE_DATA.town);
loadImg('inn',    TILE_DATA.inn);
loadImg('shop',   TILE_DATA.shop);
loadImg('sign',   TILE_DATA.sign);
loadImg('cave',   TILE_DATA.cave);
loadImg('bwall',  TILE_DATA.bwall);
loadImg('roof',   TILE_DATA.roof);

// Animated frames
for (let f = 0; f < 8; f++) loadImg(`water${f}`, TILE_DATA[`water${f}`]);
for (let f = 0; f < 6; f++) loadImg(`torch${f}`, TILE_DATA[`torch${f}`]);

export function tilesReady() { return _loadCount >= _totalCount; }

let _animTick = 0;
let _waterFrame = 0, _torchFrame = 0;
let _waterCounter = 0, _torchCounter = 0;

export function tickTiles(dt) {
  _animTick += dt;
  _waterCounter += dt;
  _torchCounter += dt;
  if (_waterCounter > 150) { _waterFrame = (_waterFrame + 1) % 8; _waterCounter = 0; }
  if (_torchCounter > 100) { _torchFrame = (_torchFrame + 1) % 6; _torchCounter = 0; }
}

const TILE_KEYS = {
  [T.GRASS]: () => 'grass0',
  [T.GRASS2]: () => 'grass1',
  [T.GRASS3]: () => 'grass2',
  [T.GRASS4]: () => 'grass3',
  [T.TALL]: () => 'tall',
  [T.PATH]: () => 'path',
  [T.WALL]: () => 'wall',
  [T.TREE]: () => 'tree',
  [T.TREE_DARK]: () => 'treed',
  [T.WATER]: () => `water${_waterFrame}`,
  [T.TOWN]: () => 'town',
  [T.INN]: () => 'inn',
  [T.SHOP]: () => 'shop',
  [T.SIGN]: () => 'sign',
  [T.CAVE]: () => 'cave',
  [T.BUILDING_WALL]: () => 'bwall',
  [T.ROOF]: () => 'roof',
  [T.TORCH]: () => `torch${_torchFrame}`,
};

export function getTile(id) {
  const fn = TILE_KEYS[id];
  if (!fn) return IMG['grass0'];
  return IMG[fn()] || IMG['grass0'];
}

export function preloadAllTiles() {
  // Images are loaded on module init — just log status
  console.log(`[tiles] ${_loadCount}/${_totalCount} loaded`);
}
