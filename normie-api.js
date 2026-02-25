// normie-api.js — Normies NFT API + stat calculation
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

export function calcStats(meta, pixelStr) {
  const attrs = meta.attributes || [];
  const get = (k) => attrs.find(a => a.trait_type === k)?.value || '';

  const type       = get('Type') || 'Human';
  const expression = get('Expression') || 'Neutral';
  const accessory  = get('Accessory') || 'No Accessories';

  const pixelCount = pixelStr ? (pixelStr.match(/1/g)||[]).length : 800;
  const lv = 1;

  const TYPE_MOD = {
    Human: { mp:0,def:0,spd:0 }, Cat: { mp:1,def:-1,spd:2 },
    Alien: { mp:3,def:1,spd:-1 }, Agent: { mp:2,def:2,spd:1 },
  };
  const ACC_MOD = {
    'Top Hat':{mp:2},'Fedora':{spd:1},'Cowboy Hat':{def:1},'Beanie':{def:1},
    'Cap':{spd:1},'Cap Forward':{spd:2},'Hoodie':{def:2},'Gold Chain':{mp:3},
    'Silver Chain':{mp:2},'Bow Tie':{mp:1},'Headband':{spd:1},
    'Bandana':{def:1,spd:1},'Eye Patch':{def:2},'VR Headset':{mp:4},
  };
  const CRIT_MOD = {
    'Confident':0.12,'Serious':0.08,'Slight Smile':0.06,'Friendly':0.05,
    'Neutral':0.04,'Content':0.04,'Peaceful':0.03,
  };

  const tm = TYPE_MOD[type] || TYPE_MOD.Human;
  const am = ACC_MOD[accessory] || {};

  const maxHp  = 60 + lv*10 + Math.floor(pixelCount/10);
  const maxMp  = 10 + lv*2  + (tm.mp||0) + (am.mp||0);
  const def    = Math.floor(pixelCount/80) + lv + (tm.def||0) + (am.def||0);
  const spd    = 5 + lv + (tm.spd||0) + (am.spd||0);
  const crit   = (CRIT_MOD[expression]||0.04);
  const atkBasic    = 8 + lv*5;
  const atkSkill    = 12 + lv*7;
  const atkUltimate = 20 + lv*10;

  // Skill names from type
  const SKILLS = {
    Human: ['Render Strike','Pixel Burst'],
    Cat:   ['Claw Swipe','Void Scratch'],
    Alien: ['Null Beam','Grid Override'],
    Agent: ['Protocol Breach','System Crash'],
  };
  const [sk1, sk2] = SKILLS[type] || SKILLS.Human;

  return { maxHp, hp:maxHp, maxMp, mp:maxMp, def, spd, crit, lv,
           atkBasic, atkSkill, atkUltimate, sk1, sk2,
           type, expression, accessory, px:pixelCount };
}

export async function fetchNormieFull(id) {
  try {
    const [meta, pixData] = await Promise.all([fetchNormieMeta(id), fetchNormiePixels(id)]);
    const pixelStr = pixData?.pixels || pixData?.data || pixData || '';
    const stats = calcStats(meta, pixelStr);
    const name = meta.name || `Normie #${id}`;
    return { id, name, pixels: pixelStr, alive: true, ...stats };
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
    {trait_type:'Type',value:type},{trait_type:'Expression',value:expr},
    {trait_type:'Accessory',value:acc}
  ]};
  const stats  = calcStats(meta, pixels);
  return { id, name:`Normie #${id}`, pixels, alive:true, ...stats };
}

export function makeFakePixels(id) {
  let bits = '';
  const s = id*7+3;
  function rn(i){let v=(s+i)*1664525+1013904223;v&=0x7fffffff;return v/0x7fffffff;}
  for(let y=0;y<40;y++) for(let x=0;x<40;x++) {
    const i=y*40+x;
    const cx=20,cy=18,r=14;
    const inHead=(x-cx)**2+(y-cy)**2 <= r*r;
    if(!inHead){bits+='0';continue;}
    // Simple face: eyes, mouth, outline
    const inEyes=(x>11&&x<16&&y>14&&y<18)||(x>24&&x<29&&y>14&&y<18);
    const inMouth=y>23&&y<26&&x>13&&x<27;
    const inOutline=(x-cx)**2+(y-cy)**2>=(r-1)**2;
    if(inOutline||inEyes||inMouth) bits+='1';
    else bits+=rn(i)<0.18?'1':'0';
  }
  return bits;
}
