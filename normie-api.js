// normie-api.js — Normies NFT API + stat calculation + progression
const API = 'https://api.normies.art';
const CACHE = {};

export async function fetchNormieMeta(id) {
  if (CACHE[`meta_${id}`]) return CACHE[`meta_${id}`];
  const r = await fetch(`${API}/normie/${id}/metadata`);
  const data = await r.json();
  CACHE[`meta_${id}`] = data;
  return data;
}

export async function fetchNormiePixels(id) {
  if (CACHE[`px_${id}`]) return CACHE[`px_${id}`];
  const r = await fetch(`${API}/normie/${id}/pixels`);
  const data = await r.json();
  CACHE[`px_${id}`] = data;
  return data;
}

export function calcStats(meta, pixelStr, lv=1) {
  const attrs = meta.attributes || [];
  const get = (k) => attrs.find(a => a.trait_type === k)?.value || '';

  const type       = get('Type') || 'Human';
  const expression = get('Expression') || 'Neutral';
  const accessory  = get('Accessory') || 'No Accessories';
  const background = get('Background') || '';

  const pixelCount = pixelStr ? (pixelStr.match(/1/g)||[]).length : 800;

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
    const pixelStr = pixData?.pixels || pixData?.data || pixData || '';
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
  let bits = '';
  const s = id*7+3;
  function rn(i){let v=(s+i)*1664525+1013904223;v&=0x7fffffff;return v/0x7fffffff;}
  for(let y=0;y<40;y++) for(let x=0;x<40;x++) {
    const i=y*40+x;
    const cx=20,cy=18,r=14;
    const inHead=(x-cx)**2+(y-cy)**2<=r*r;
    if(!inHead){bits+='0';continue;}
    const inEyes=(x>11&&x<16&&y>14&&y<18)||(x>24&&x<29&&y>14&&y<18);
    const inMouth=y>23&&y<26&&x>13&&x<27;
    const inOutline=(x-cx)**2+(y-cy)**2>=(r-1)**2;
    if(inOutline||inEyes||inMouth) bits+='1';
    else bits+=rn(i)<0.18?'1':'0';
  }
  return bits;
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
