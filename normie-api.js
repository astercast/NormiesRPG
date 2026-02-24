// normie-api.js — sourced from https://api.normies.art/llms.txt
// Normies: 10,000-piece on-chain ERC-721 collection on Ethereum
// 40×40 monochrome bitmaps, stored entirely on-chain

const API = 'https://api.normies.art';

// ── TRUE TYPES from llms.txt: Human, Cat, Alien, Agent ──
const TYPE_STATS = {
  Human: { spdMod:0,  defMod:0,  mpMod:0,  critMod:0.00, flavor:'Balanced and resilient. The everyday Normie. Never count them out.' },
  Cat:   { spdMod:3,  defMod:-1, mpMod:2,  critMod:0.06, flavor:'Fast and unpredictable. Cats act on instinct and dodge like ghosts.' },
  Alien: { spdMod:2,  defMod:1,  mpMod:4,  critMod:0.04, flavor:'High-MP technologists. Beam weapons and void abilities wreck enemies.' },
  Agent: { spdMod:1,  defMod:4,  mpMod:-1, critMod:0.02, flavor:'Armored tacticians. Slow to anger, impossible to kill. Protocol 47 hits hard.' },
};

// Skill names per type
const TYPE_MOVES = {
  Human: { sk1:'Pixel Punch',      sk2:'Normie Stare'   },
  Cat:   { sk1:'Claw Swipe',       sk2:'Nine Lives'      },
  Alien: { sk1:'Beam Shot',        sk2:'Void Gaze'       },
  Agent: { sk1:'Tactical Strike',  sk2:'Protocol 47'     },
};

// Accessory passive bonuses
const ACC_BONUS = {
  'Top Hat':      { mpMod:2 },
  'Fedora':       { spdMod:1 },
  'Cowboy Hat':   { defMod:1 },
  'Beanie':       { defMod:1 },
  'Cap':          { spdMod:1 },
  'Cap Forward':  { spdMod:2 },
  'Hoodie':       { defMod:2 },
  'Gold Chain':   { mpMod:3 },
  'Silver Chain': { mpMod:2 },
  'Bow Tie':      { mpMod:1 },
  'Headband':     { spdMod:1 },
  'Bandana':      { defMod:1, spdMod:1 },
  'Eye Patch':    { defMod:2 },
};

// Expression → crit chance bonus
const EXPR_CRIT = {
  'Confident':    0.12,
  'Serious':      0.08,
  'Slight Smile': 0.06,
  'Friendly':     0.05,
  'Neutral':      0.04,
  'Content':      0.04,
  'Peaceful':     0.03,
};

// ── STAT FORMULA (legacy.normies.art/normiecard) ──
// HP = 60 + Level×10 + floor(PixelCount÷10)
// Move damage = base + Level×5
export function calcStats(lv, px, type, expression = 'Neutral', accessory = 'No Accessories') {
  const t = TYPE_STATS[type] || TYPE_STATS.Human;
  const a = ACC_BONUS[accessory] || {};
  const m = TYPE_MOVES[type] || TYPE_MOVES.Human;

  const maxHp = 60 + lv * 10 + Math.floor(px / 10);
  const maxMp = 10 + lv * 2 + (t.mpMod || 0) + (a.mpMod || 0);
  const def   = Math.floor(px / 80) + lv + (t.defMod || 0) + (a.defMod || 0);
  const spd   = 5 + lv + (t.spdMod || 0) + (a.spdMod || 0);
  const crit  = (EXPR_CRIT[expression] || 0.04) + (t.critMod || 0);

  return {
    maxHp, hp: maxHp, maxMp, mp: maxMp,
    def, spd, crit,
    atkBasic:    10 + lv * 5,
    atkSkill:    20 + lv * 5,
    atkUltimate: 40 + lv * 5,
    sk1: m.sk1, sk2: m.sk2,
    alive: true,
    flavor: t.flavor,
  };
}

// ── API FETCH ──
export async function fetchNormieMeta(id) {
  try {
    const res = await fetch(`${API}/normie/${id}/metadata`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const a = {};
    (data.attributes || []).forEach(x => { a[x.trait_type] = x.value; });

    const lv         = Number(a['Level'] || 1);
    const px         = Number(a['Pixel Count'] || 400);
    const type       = a['Type'] || 'Human';
    const expression = a['Expression'] || 'Neutral';
    const accessory  = a['Accessory'] || 'No Accessories';

    return {
      id,
      name:       data.name || `Normie #${id}`,
      image:      `${API}/normie/${id}/image.svg`,  // on-chain SVG
      type, lv, px, expression, accessory,
      gender:     a['Gender'] || 'Non-Binary',
      age:        a['Age'] || 'Young',
      eyes:       a['Eyes'] || 'No Glasses',
      hair:       a['Hair Style'] || 'Short Hair',
      facial:     a['Facial Feature'] || 'Clean Shaven',
      ...calcStats(lv, px, type, expression, accessory),
    };
  } catch (e) {
    console.warn(`fetchNormieMeta(${id}) failed:`, e.message);
    return makeFallback(id);
  }
}

export function makeFallback(id) {
  const types = ['Human','Cat','Alien','Agent'];
  const type  = types[id % types.length];
  const lv    = (id % 10) + 1;
  const px    = 280 + (id % 420);
  return {
    id, name: `Normie #${id}`,
    image: makeSvgFallback(id),
    type, lv, px,
    expression: 'Neutral', accessory: 'No Accessories',
    gender: 'Non-Binary', age: 'Young',
    eyes: 'No Glasses', hair: 'Short Hair', facial: 'Clean Shaven',
    ...calcStats(lv, px, type),
  };
}

// Procedural SVG in exact Normies palette: #48494b on #e3e5e4
export function makeSvgFallback(id) {
  const r = mkRng(id * 1337 + 42);
  const rects = [];
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const cx = 20, cy = 19;
    const inHead = Math.pow((x-cx)/13,2) + Math.pow((y-cy)/15,2) < 1;
    if (!inHead) continue;
    // eyes
    const le = (x>=12&&x<=15&&y>=15&&y<=17);
    const re = (x>=25&&x<=28&&y>=15&&y<=17);
    // mouth
    const mo = (y>=24&&y<=25&&x>=15&&x<=25);
    const on = le || re || mo || r() > 0.58;
    if (on) rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" shape-rendering="crispEdges">` +
    `<rect width="40" height="40" fill="#e3e5e4"/>` +
    `<g fill="#48494b">${rects.join('')}</g></svg>`
  );
}

export function mkRng(seed) {
  let s = (seed | 0) + 1;
  return () => { s^=s<<13; s^=s>>17; s^=s<<5; return (s>>>0)/0xffffffff; };
}
