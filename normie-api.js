// normie-api.js — On-chain Normies data, pixel rendering, stat formulas

const API = 'https://api.normies.art';

// ── PIXEL RENDERING ──
// Renders a Normie's 40x40 bitmap onto a canvas at any size
// pixel string = 1600 chars of '0'/'1' from /normie/:id/pixels
export function renderPixelsToCanvas(pixelStr, canvas, scale = 1) {
  const S = 40;
  canvas.width  = S * scale;
  canvas.height = S * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const ON  = '#48494b';
  const OFF = '#e3e5e4';

  ctx.fillStyle = OFF;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!pixelStr || pixelStr.length < 1600) return;

  ctx.fillStyle = ON;
  for (let i = 0; i < 1600; i++) {
    if (pixelStr[i] === '1') {
      const x = (i % S) * scale;
      const y = Math.floor(i / S) * scale;
      ctx.fillRect(x, y, scale, scale);
    }
  }
}

// Returns a 40x40 offscreen canvas with the Normie drawn on it (cached)
const _pixelCanvasCache = {};
export function getPixelCanvas(id, pixelStr, scale = 1) {
  const key = `${id}_${scale}`;
  if (_pixelCanvasCache[key]) return _pixelCanvasCache[key];
  const c = document.createElement('canvas');
  renderPixelsToCanvas(pixelStr, c, scale);
  _pixelCanvasCache[key] = c;
  return c;
}

// ── API FETCH ──
export async function fetchNormieMeta(id) {
  try {
    const res = await fetch(`${API}/normie/${id}/metadata`);
    if (!res.ok) return null;
    const data = await res.json();
    return parseMetadata(data, id);
  } catch (e) {
    console.warn(`[api] meta ${id} failed`, e);
    return null;
  }
}

export async function fetchNormiePixels(id) {
  try {
    const res = await fetch(`${API}/normie/${id}/pixels`);
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch (e) {
    console.warn(`[api] pixels ${id} failed`, e);
    return null;
  }
}

// Fetch both meta + pixels for a normie
export async function fetchNormieFull(id) {
  const [meta, pixels] = await Promise.all([
    fetchNormieMeta(id),
    fetchNormiePixels(id),
  ]);
  if (!meta) return null;
  meta.pixels = pixels;
  if (pixels) meta.pixelCanvas = getPixelCanvas(id, pixels, 1);
  return meta;
}

function parseMetadata(data, id) {
  const attrs = data.attributes || [];
  const get = key => attrs.find(a => a.trait_type === key)?.value ?? '';

  const type       = get('Type') || 'Human';
  const expression = get('Expression') || 'Neutral';
  const accessory  = get('Accessory') || 'No Accessories';
  const lv         = Number(get('Level')) || 1;
  const px         = Number(get('Pixel Count')) || 400;

  const stats = calcStats({ type, expression, accessory, lv, px });

  return {
    id,
    name:       data.name || `Normie #${id}`,
    type, expression, accessory, lv, px,
    image:      data.image || makeSvgFallback(id),
    ...stats,
    alive: true,
    pixels: null,
    pixelCanvas: null,
  };
}

// ── STAT FORMULAS (from NormieCard) ──
const TYPE_MOD = {
  Human: { spd:0,  def:0,  mp:0,  crit:0.00 },
  Cat:   { spd:3,  def:-1, mp:2,  crit:0.06 },
  Alien: { spd:2,  def:1,  mp:4,  crit:0.04 },
  Agent: { spd:1,  def:4,  mp:-1, crit:0.02 },
};
const EXPR_CRIT = {
  Confident:0.12, Serious:0.08, 'Slight Smile':0.06,
  Friendly:0.05,  Neutral:0.04, Content:0.04, Peaceful:0.03,
};
const ACC_MOD = {
  'Top Hat':    { mp:2 },
  'Fedora':     { spd:1 },
  'Cowboy Hat': { def:1 },
  'Beanie':     { def:1 },
  'Cap':        { spd:1 },
  'Cap Forward':{ spd:2 },
  'Hoodie':     { def:2 },
  'Gold Chain': { mp:3 },
  'Silver Chain':{ mp:2 },
  'Bow Tie':    { mp:1 },
  'Headband':   { spd:1 },
  'Bandana':    { def:1, spd:1 },
  'Eye Patch':  { def:2 },
  'VR Headset': { mp:4 },
};

export function calcStats({ type, expression, accessory, lv, px }) {
  const tm  = TYPE_MOD[type]       || TYPE_MOD.Human;
  const am  = ACC_MOD[accessory]   || {};
  const ec  = EXPR_CRIT[expression]|| 0.04;

  const maxHp  = 60 + lv*10 + Math.floor(px/10);
  const maxMp  = 10 + lv*2  + tm.mp  + (am.mp  || 0);
  const def    = Math.floor(px/80) + lv + tm.def + (am.def || 0);
  const spd    = 5 + lv + tm.spd + (am.spd || 0);
  const crit   = ec + tm.crit;
  const atkBasic    = 10 + lv*5;
  const atkSkill    = 20 + lv*5;
  const atkUltimate = 40 + lv*5;

  // Move names by type
  const sk1 = { Human:'Uppercut', Cat:'Pounce', Alien:'Void Gaze', Agent:'Protocol 47' }[type] || 'Strike';
  const sk2 = { Human:'Normie Stare', Cat:'Feral Rush', Alien:'Cosmic Blast', Agent:'Black Op' }[type] || 'Ultimate';

  return {
    maxHp, hp: maxHp,
    maxMp, mp: maxMp,
    def, spd, crit,
    atkBasic, atkSkill, atkUltimate,
    sk1, sk2,
  };
}

// ── DEMO DATA ──
// Synthetic normie when we can't reach API (demo mode fallback)
export function makeDemoNormie(id) {
  const types = ['Human','Cat','Alien','Agent'];
  const exprs = ['Neutral','Confident','Serious','Slight Smile','Friendly'];
  const accs  = ['No Accessories','Gold Chain','Hoodie','VR Headset','Fedora','Cap'];
  const seed  = id * 1337 + 7;
  const rng   = () => { let s=seed; return ()=>{ s^=s<<13;s^=s>>17;s^=s<<5; return (s>>>0)/0xffffffff; }; };
  const r = rng()();

  const type       = types[id % 4];
  const expression = exprs[id % 5];
  const accessory  = accs[id % 6];
  const lv         = Math.max(1, Math.min(10, (id % 10) + 1));
  const px         = 300 + (id % 400);

  const stats = calcStats({ type, expression, accessory, lv, px });
  return {
    id,
    name:       `Normie #${id}`,
    type, expression, accessory, lv, px,
    image:      makeSvgFallback(id),
    ...stats,
    alive: true,
    pixels: makeFakePixels(id),
    pixelCanvas: null,
  };
}

// Generate plausible-looking pixel art for demo mode (deterministic)
function makeFakePixels(id) {
  let s = id * 6271 + 9337;
  const rng = () => { s^=s<<13;s^=s>>17;s^=s<<5; return (s>>>0)/0xffffffff; };
  const bm = new Array(1600).fill(0);

  // Face oval
  for (let y = 5; y < 35; y++) {
    for (let x = 10; x < 30; x++) {
      const cx=20,cy=20,rx=10,ry=15;
      if ((x-cx)**2/rx**2+(y-cy)**2/ry**2<=1) {
        if (rng()>0.35) bm[y*40+x]=1;
      }
    }
  }
  // Eyes
  for (let i of [13,14,25,26]) bm[14*40+i]=1;
  // Mouth
  for (let i of [14,15,16,17,22,23,24,25]) bm[25*40+i]=1;

  return bm.join('');
}

// SVG fallback (grey silhouette)
export function makeSvgFallback(id) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <rect width="40" height="40" fill="#e3e5e4"/>
    <rect x="12" y="6"  width="16" height="14" rx="2" fill="#48494b"/>
    <rect x="10" y="20" width="20" height="12" fill="#48494b"/>
    <rect x="11" y="32" width="6"  height="6"  fill="#48494b"/>
    <rect x="23" y="32" width="6"  height="6"  fill="#48494b"/>
    <rect x="14" y="10" width="4"  height="4"  fill="#e3e5e4"/>
    <rect x="22" y="10" width="4"  height="4"  fill="#e3e5e4"/>
    <text x="20" y="44" text-anchor="middle" font-size="4" fill="#48494b">#${id}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ── SEED RNG (shared) ──
export function mkRng(seed) {
  let s = (seed | 0) + 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}
