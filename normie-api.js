// normie-api.js — Normies NFT API + stat calculation + progression
const API = 'https://api.normies.art';
const CACHE = {};

// Abort fetch after 4 s so demo mode never hangs waiting for an unreachable API
async function fetchWithTimeout(url, ms = 4000) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

export async function fetchNormieMeta(id) {
  if (CACHE[`meta_${id}`]) return CACHE[`meta_${id}`];
  const r = await fetchWithTimeout(`${API}/normie/${id}/metadata`);
  const data = await r.json();
  CACHE[`meta_${id}`] = data;
  return data;
}

export async function fetchNormiePixels(id) {
  if (CACHE[`px_${id}`]) return CACHE[`px_${id}`];
  const r = await fetchWithTimeout(`${API}/normie/${id}/pixels`);
  const raw = await r.json();

  // Resolve colour array: API may return array directly, or object with .pixels/.data array
  const arr = Array.isArray(raw)          ? raw :
              Array.isArray(raw?.pixels)  ? raw.pixels :
              Array.isArray(raw?.data)    ? raw.data  : null;
  if (arr && arr.length >= 1600) {
    CACHE[`px_${id}`] = arr;
    return arr;
  }

  // Fall back to string formats
  const pxStr = raw?.pixels || raw?.data || raw?.pixel_string || raw?.pixelString ||
                (typeof raw === 'string' && raw.length >= 1600 ? raw : null) || '';
  CACHE[`px_${id}`] = pxStr;
  return pxStr;
}

/**
 * Parse the inline SVG from metadata `image` field into a 40×40 color array.
 * The SVG contains <rect> elements with fill colors on a background.
 * Returns array of 1600 hex strings, or null if parsing fails.
 */
export function parseSvgColors(meta) {
  if (!meta?.image) return null;
  try {
    // image field is "data:image/svg+xml;base64,..." 
    const b64Match = meta.image.match(/base64,(.+)/);
    if (!b64Match) return null;
    const svgText = atob(b64Match[1]);

    // Extract background fill from the first large rect (covers full canvas)
    const bgMatch = svgText.match(/<rect[^>]*width="40"[^>]*height="40"[^>]*fill="([^"]+)"/);
    const bgColor = bgMatch ? bgMatch[1].toLowerCase() : '#e3e5e4';

    // Build a 40×40 grid initialized to background
    const W = 40, H = 40;
    const grid = new Array(W * H).fill(bgColor);

    // Parse all <rect> elements with position and fill
    const rectRe = /<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"\s+fill="([^"]+)"/g;
    let m;
    while ((m = rectRe.exec(svgText)) !== null) {
      const rx = parseInt(m[1], 10);
      const ry = parseInt(m[2], 10);
      const rw = parseInt(m[3], 10);
      const rh = parseInt(m[4], 10);
      const fill = m[5];
      if (fill.toLowerCase() === bgColor) continue; // skip background rects
      for (let dy = 0; dy < rh; dy++) {
        for (let dx = 0; dx < rw; dx++) {
          const px = rx + dx, py = ry + dy;
          if (px < W && py < H) grid[py * W + px] = fill;
        }
      }
    }

    // Check if we actually found colored pixels (not just background)
    const hasColors = grid.some(c => c.toLowerCase() !== bgColor);
    if (!hasColors) return null;

    return grid;
  } catch (e) {
    console.warn('parseSvgColors failed:', e);
    return null;
  }
}

export function calcStats(meta, pixelStr, lv=1) {
  const attrs = meta.attributes || [];
  const get = (k) => attrs.find(a => a.trait_type === k)?.value || '';

  const type       = get('Type') || 'Human';
  const expression = get('Expression') || 'Neutral';
  const accessory  = get('Accessory') || 'No Accessories';
  const background = get('Background') || '';

  // Count "active" (drawn) pixels for stat scaling
  let pixelCount;
  if (Array.isArray(pixelStr)) {
    // Colour array: count non-white pixels
    pixelCount = pixelStr.filter((hex) => {
      const h = (hex || '#fff').replace(/^#?/, '');
      const r = parseInt(h.slice(0, 2), 16) || 0;
      const g = parseInt(h.slice(2, 4), 16) || 0;
      const b = parseInt(h.slice(4, 6), 16) || 0;
      return r + g + b < 660;
    }).length;
  } else {
    pixelCount = pixelStr ? (pixelStr.match(/1/g) || []).length : 800;
  }

  const TYPE_MOD = {
    Human: { hp:0,  mp:0,  def:0,  spd:0,  atk:0  },
    Cat:   { hp:-5, mp:5,  def:-1, spd:3,  atk:2  },
    Alien: { hp:0,  mp:8,  def:1,  spd:-1, atk:1  },
    Agent: { hp:5,  mp:3,  def:3,  spd:1,  atk:3  },
  };
  const ACC_MOD = {
    'Top Hat':       { mp:3 },
    'Fedora':        { spd:1 },
    'Cowboy Hat':    { def:1 },
    'Beanie':        { def:1 },
    'Cap':           { spd:1 },
    'Cap Forward':   { spd:2 },
    'Hoodie':        { def:3 },
    'Gold Chain':    { mp:4 },
    'Silver Chain':  { mp:2 },
    'Bow Tie':       { mp:1 },
    'Headband':      { spd:2 },
    'Bandana':       { def:2, spd:1 },
    'Eye Patch':     { def:3 },
    'VR Headset':    { mp:6 },
    'Headphones':    { mp:2 },
  };
  const CRIT_MOD = {
    'Confident':0.14,'Serious':0.10,'Slight Smile':0.07,
    'Friendly':0.06,'Neutral':0.04,'Content':0.04,'Peaceful':0.03,
  };
  const BG_MOD = {
    'Gold':   { goldMult:0.20 },
    'Red':    { atkMult:0.10 },
    'Blue':   { mpBonus:2    },
    'Purple': { critBonus:0.03 },
    'Green':  { hpMult:0.05  },
  };

  const tm = TYPE_MOD[type] || TYPE_MOD.Human;
  const am = ACC_MOD[accessory] || {};
  const bg = BG_MOD[background] || {};

  // Level scaling
  const lvMult = 1 + (lv-1)*0.12;

  const maxHp  = Math.round((80 + (tm.hp||0) + Math.floor(pixelCount/10)) * lvMult);
  const maxMp  = 12 + (tm.mp||0) + (am.mp||0) + (lv-1)*2 + (bg.mpBonus||0);
  const def    = Math.floor((Math.floor(pixelCount/80) + (tm.def||0) + lv) * lvMult);
  const spd    = 5 + (tm.spd||0) + (am.spd||0) + lv;
  const crit   = (CRIT_MOD[expression]||0.04) + (bg.critBonus||0);

  const atkBasic    = Math.round((10 + (tm.atk||0) + lv*5) * lvMult);
  const atkSkill    = Math.round((16 + (tm.atk||0) + lv*7) * lvMult);
  const atkUltimate = Math.round((28 + (tm.atk||0) + lv*12) * lvMult);

  const SKILL_NAMES = {
    Human: ['Render Strike',   'Pixel Burst',     'Render Nova'],
    Cat:   ['Claw Swipe',      'Void Scratch',    'Phase Pounce'],
    Alien: ['Null Beam',       'Grid Override',   'Grid Collapse'],
    Agent: ['Protocol Breach', 'System Crash',    'System Crash'],
  };
  const [sk1, sk2, sk3] = SKILL_NAMES[type] || SKILL_NAMES.Human;

  const goldMult = 1 + (bg.goldMult||0);

  return {
    maxHp, hp:maxHp, maxMp, mp:maxMp, def, spd, crit,
    atkBasic, atkSkill, atkUltimate, sk1, sk2, sk3,
    type, expression, accessory, background, px:pixelCount,
    goldMult,
  };
}

export async function fetchNormieFull(id) {
  try {
    const [meta, pixData] = await Promise.all([fetchNormieMeta(id), fetchNormiePixels(id)]);
    // Try to extract real colors from SVG in metadata first
    const svgColors = parseSvgColors(meta);
    const pixelStr = svgColors || pixData || '';
    const stats = calcStats(meta, pixelStr);
    const name = meta.name || `Normie #${id}`;
    return {
      id, name, pixels: pixelStr, alive: true,
      lv: 1, xp: 0, xpToNext: 100,
      skillPoints: 0,
      unlockedSkills: {},
      equippedItems: {},
      ...stats
    };
  } catch (e) {
    console.warn(`fetchNormieFull(${id}) failed:`, e);
    return makeDemoNormie(id);
  }
}

export function makeDemoNormie(id) {
  const types = ['Human','Cat','Alien','Agent'];
  const exprs = ['Neutral','Confident','Serious','Friendly','Peaceful'];
  const accs  = ['No Accessories','Gold Chain','Hoodie','Bandana','VR Headset'];
  const type  = types[id%4], expr = exprs[id%5], acc = accs[id%5];
  const pixels = makeFakePixels(id);
  const meta   = { name:`Normie #${id}`, attributes:[
    {trait_type:'Type',value:type},{trait_type:'Expression',value:expr},{trait_type:'Accessory',value:acc}
  ]};
  const stats = calcStats(meta, pixels);
  return {
    id, name:`Normie #${id}`, pixels, alive:true,
    lv:1, xp:0, xpToNext:100,
    skillPoints:0, unlockedSkills:{}, equippedItems:{},
    ...stats
  };
}

export function makeFakePixels(id) {
  const W = 40, H = 40;
  const bits = new Array(W * H).fill('0');
  const set = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H) bits[y * W + x] = '1'; };
  const row = (y, x1, x2) => { for (let x = x1; x <= x2; x++) set(x, y); };
  const col = (x, y1, y2) => { for (let y = y1; y <= y2; y++) set(x, y); };
  const border = (x1, y1, x2, y2) => { row(y1,x1,x2); row(y2,x1,x2); col(x1,y1,y2); col(x2,y1,y2); };

  // ── Head outline (rectangular — BFS flood-fill will fill interior as skin) ─
  border(9, 4, 30, 24);

  // ── Hair (5 styles) ───────────────────────────────────────────────────────
  switch (id % 5) {
    case 0: row(3,9,30); row(2,11,28); break;                              // flat crop
    case 1: row(3,9,30); col(9,1,5); col(10,1,5); break;                  // curtain-left
    case 2: for(let x=9;x<=30;x+=3){set(x,3);set(x+1,2);} break;         // spiky
    case 3: row(3,7,32); row(2,8,31); row(1,10,29); break;                // big puff
    case 4: col(19,1,4); col(20,1,4); set(18,2); set(21,2); break;        // twin horns
  }

  // ── Eyes (3 shapes) ──────────────────────────────────────────────────────
  const ey = 11;
  switch (id % 3) {
    case 0: border(12,ey,15,ey+2); border(24,ey,27,ey+2); break;           // square
    case 1: row(ey+1,12,16); row(ey+1,23,27); break;                       // slit
    case 2: border(11,ey,16,ey+3); border(23,ey,28,ey+3); break;           // large
  }

  // ── Eyebrows ─────────────────────────────────────────────────────────────
  switch ((id >> 1) % 3) {
    case 0: row(ey-2,12,15); row(ey-2,24,27); break;                       // flat
    case 1: row(ey-2,14,16); set(12,ey-3); set(13,ey-3);
            row(ey-2,22,24); set(26,ey-3); set(27,ey-3); break;            // arched
    case 2: row(ey-2,12,14); set(15,ey-3);
            row(ey-2,25,27); set(24,ey-3); break;                          // angled angry
  }

  // ── Nose ─────────────────────────────────────────────────────────────────
  set(19, 16); set(20, 16);

  // ── Mouth (4 expressions) ────────────────────────────────────────────────
  const mouthY = 20;
  switch (id % 4) {
    case 0: row(mouthY,13,26); set(12,mouthY-1); set(27,mouthY-1); break;  // smile
    case 1: row(mouthY,14,25); break;                                       // neutral
    case 2: row(mouthY,13,26); row(mouthY+1,14,25); break;                 // open happy
    case 3: row(mouthY,17,22); set(23,mouthY-1); break;                    // smirk
  }

  // ── Neck (2 columns each side, rows 25-27) ───────────────────────────────
  col(15,25,27); col(16,25,27); col(23,25,27); col(24,25,27);

  // ── Body / shirt (closed rectangle so BFS fills interior correctly) ──────
  border(7, 28, 32, 37);
  row(30, 8, 31); // collar/shirt crease

  return bits.join('');
}

// XP required for each level
export function xpForLevel(lv) {
  return Math.round(100 * Math.pow(lv, 1.6));
}

// Grant XP to a normie, handle level-up
export function grantXP(normie, amount) {
  normie.xp = (normie.xp||0) + amount;
  const msgs = [];
  while (normie.xp >= (normie.xpToNext||100)) {
    normie.xp -= normie.xpToNext;
    normie.lv = (normie.lv||1) + 1;
    normie.xpToNext = xpForLevel(normie.lv);
    normie.skillPoints = (normie.skillPoints||0) + 1;
    // Recalculate stats with new level
    const meta = { name:normie.name, attributes:[
      {trait_type:'Type',value:normie.type},
      {trait_type:'Expression',value:normie.expression},
      {trait_type:'Accessory',value:normie.accessory},
    ]};
    const newStats = calcStats(meta, normie.pixels, normie.lv);
    const hpDiff = newStats.maxHp - normie.maxHp;
    Object.assign(normie, newStats);
    normie.hp = Math.min(normie.hp + hpDiff, normie.maxHp);
    normie.mp = Math.min(normie.mp + 3, normie.maxMp);
    msgs.push(`${normie.name} reached Lv.${normie.lv}! +1 Skill Point`);
  }
  return msgs;
}
