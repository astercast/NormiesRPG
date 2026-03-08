import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('assets/maps');
const TW = 32;
const TH = 32;

function makeLayer(name, w, h, data) {
  return {
    id: 1,
    name,
    type: 'tilelayer',
    width: w,
    height: h,
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    data,
  };
}

function makeCollisionLayer(name, w, h, data) {
  return {
    id: 2,
    name,
    type: 'tilelayer',
    width: w,
    height: h,
    opacity: 1,
    visible: false,
    x: 0,
    y: 0,
    data,
  };
}

function objectLayer(id, name, objects) {
  return {
    id,
    name,
    type: 'objectgroup',
    opacity: 1,
    visible: true,
    draworder: 'topdown',
    objects,
  };
}

function o(id, name, type, x, y, width = 32, height = 32, properties = []) {
  return { id, name, type, x, y, width, height, rotation: 0, visible: true, properties };
}

function prop(name, value, type = typeof value === 'number' ? 'float' : 'string') {
  return { name, type, value };
}

function makeTileset() {
  return [{
    firstgid: 1,
    source: '',
    name: 'generated-tileset',
    tilewidth: TW,
    tileheight: TH,
    tilecount: 16,
    columns: 4,
    image: 'generated-tiles.png',
    imagewidth: 128,
    imageheight: 128,
  }];
}

function writeMap(name, map) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(map, null, 2));
}

function buildOverworld() {
  const w = 72;
  const h = 72;
  const data = new Array(w * h).fill(4); // grass tile gid 4
  const col = new Array(w * h).fill(0);

  function idx(x, y) { return y * w + x; }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const border = x < 2 || y < 2 || x > w - 3 || y > h - 3;
      const nearSea = x < 8 || y < 7;
      if (border || nearSea) {
        data[idx(x, y)] = 1; // deep water
        col[idx(x, y)] = 1;
      }
      if (!border && (x < 11 || y < 10) && !nearSea) data[idx(x, y)] = 2; // shallow water
    }
  }

  for (let x = 10; x < 66; x++) data[idx(x, 40)] = 6; // road
  for (let y = 13; y < 61; y++) data[idx(41, y)] = 6;

  for (let y = 28; y < 44; y++) {
    for (let x = 30; x < 48; x++) data[idx(x, y)] = 7; // town tiles
  }

  for (let y = 52; y < 69; y++) {
    for (let x = 52; x < 70; x++) data[idx(x, y)] = 8; // ruins tiles
  }

  for (let y = 48; y < 66; y++) {
    for (let x = 20; x < 29; x++) {
      if ((x + y) % 3 === 0) data[idx(x, y)] = 5; // stone patches
    }
  }

  const objects = [
    o(1, 'spawn_main', 'spawn', 42 * TW, 42 * TH),
    o(2, 'to_town', 'warp', 38 * TW, 34 * TH, 4 * TW, 4 * TH, [prop('targetMap', 'town'), prop('targetSpawn', 'from_overworld')]),
    o(3, 'to_ruins', 'warp', 58 * TW, 58 * TH, 8 * TW, 8 * TH, [prop('targetMap', 'ruins'), prop('targetSpawn', 'from_overworld')]),
    o(4, 'encounter_plains', 'encounter', 18 * TW, 18 * TH, 30 * TW, 26 * TH, [prop('chance', 0.12), prop('tier', 1)]),
    o(5, 'encounter_highlands', 'encounter', 42 * TW, 44 * TH, 24 * TW, 20 * TH, [prop('chance', 0.18), prop('tier', 2)]),
    o(6, 'encounter_coast', 'encounter', 9 * TW, 10 * TH, 20 * TW, 16 * TH, [prop('chance', 0.09), prop('tier', 1)]),
  ];

  return {
    compressionlevel: -1,
    height: h,
    infinite: false,
    layers: [
      makeLayer('ground', w, h, data),
      makeCollisionLayer('collision', w, h, col),
      objectLayer(3, 'objects', objects),
    ],
    nextlayerid: 4,
    nextobjectid: 7,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TH,
    tilesets: makeTileset(),
    tilewidth: TW,
    type: 'map',
    version: '1.10',
    width: w,
  };
}

function buildTown() {
  const w = 36;
  const h = 30;
  const data = new Array(w * h).fill(7); // town ground
  const col = new Array(w * h).fill(0);
  function idx(x, y) { return y * w + x; }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < 2 || y < 2 || x > w - 3 || y > h - 3) {
        data[idx(x, y)] = 5;
        col[idx(x, y)] = 1;
      }
    }
  }

  for (let x = 4; x < w - 4; x++) data[idx(x, 15)] = 6;
  for (let y = 5; y < h - 4; y++) data[idx(18, y)] = 6;

  const objects = [
    o(1, 'from_overworld', 'spawn', 18 * TW, 25 * TH),
    o(2, 'to_overworld', 'warp', 16 * TW, 26 * TH, 4 * TW, 2 * TH, [prop('targetMap', 'overworld'), prop('targetSpawn', 'to_town')]),
    o(3, 'elder_vex', 'npc', 15 * TW, 12 * TH, TW, TH, [prop('npcId', 'elder')]),
    o(4, 'forge_ada', 'npc', 22 * TW, 13 * TH, TW, TH, [prop('npcId', 'smith')]),
    o(5, 'merchant_zen', 'npc', 20 * TW, 18 * TH, TW, TH, [prop('npcId', 'merchant')]),
    o(6, 'scout_nori', 'npc', 12 * TW, 18 * TH, TW, TH, [prop('npcId', 'scout')]),
  ];

  return {
    compressionlevel: -1,
    height: h,
    infinite: false,
    layers: [
      makeLayer('ground', w, h, data),
      makeCollisionLayer('collision', w, h, col),
      objectLayer(3, 'objects', objects),
    ],
    nextlayerid: 4,
    nextobjectid: 7,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TH,
    tilesets: makeTileset(),
    tilewidth: TW,
    type: 'map',
    version: '1.10',
    width: w,
  };
}

function buildRuins() {
  const w = 38;
  const h = 34;
  const data = new Array(w * h).fill(8);
  const col = new Array(w * h).fill(0);
  function idx(x, y) { return y * w + x; }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < 2 || y < 2 || x > w - 3 || y > h - 3) {
        data[idx(x, y)] = 5;
        col[idx(x, y)] = 1;
      }
      if ((x + y) % 7 === 0) data[idx(x, y)] = 5;
    }
  }

  for (let y = 11; y < 25; y++) {
    for (let x = 12; x < 26; x++) data[idx(x, y)] = 4;
  }

  const objects = [
    o(1, 'from_overworld', 'spawn', 19 * TW, 28 * TH),
    o(2, 'to_overworld', 'warp', 17 * TW, 29 * TH, 4 * TW, 2 * TH, [prop('targetMap', 'overworld'), prop('targetSpawn', 'to_ruins')]),
    o(3, 'boss_trigger', 'boss', 14 * TW, 13 * TH, 10 * TW, 8 * TH, [prop('bossId', 'abyss_warden')]),
    o(4, 'encounter_ruins', 'encounter', 6 * TW, 6 * TH, 26 * TW, 24 * TH, [prop('chance', 0.2), prop('tier', 3)]),
  ];

  return {
    compressionlevel: -1,
    height: h,
    infinite: false,
    layers: [
      makeLayer('ground', w, h, data),
      makeCollisionLayer('collision', w, h, col),
      objectLayer(3, 'objects', objects),
    ],
    nextlayerid: 4,
    nextobjectid: 5,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TH,
    tilesets: makeTileset(),
    tilewidth: TW,
    type: 'map',
    version: '1.10',
    width: w,
  };
}

fs.mkdirSync(OUT, { recursive: true });
writeMap('overworld', buildOverworld());
writeMap('town', buildTown());
writeMap('ruins', buildRuins());
console.log('Generated maps in assets/maps');
