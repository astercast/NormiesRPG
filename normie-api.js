// Normies API + stat calculation
// All formulas from https://www.normies.art/normiecard

const API = 'https://api.normies.art';

export function calcStats(lv, px, type) {
  // HP = 60 + Level×10 + floor(PixelCount÷10)
  const maxHp = 60 + lv * 10 + Math.floor(px / 10);
  const maxMp = 10 + lv * 2;
  const def   = Math.floor(px / 80) + lv;
  const spdBase = { Human:5, Zombie:3, Alien:8, Robot:4, Vampire:7, Wizard:6 };
  const spd = (spdBase[type] || 5) + lv;

  // Move damage = base + Level×5
  const atkBasic    = 10 + lv * 5;  // basic attack
  const atkSkill    = 20 + lv * 5;  // Pixel Punch
  const atkUltimate = 40 + lv * 5;  // Normie Stare

  const moveNames = {
    Human:   ['Pixel Punch', 'Normie Stare'],
    Zombie:  ['Dead Bite',   'Undead Surge'],
    Alien:   ['Beam Shot',   'Void Stare'],
    Robot:   ['Laser Bolt',  'Overclock'],
    Vampire: ['Blood Drain', 'Crimson Gaze'],
    Wizard:  ['Fireball',    'Arcane Stare'],
  };
  const [sk1, sk2] = moveNames[type] || moveNames.Human;

  return { maxHp, hp: maxHp, maxMp, mp: maxMp, def, spd, atkBasic, atkSkill, atkUltimate, sk1, sk2, alive: true };
}

export async function fetchNormieMeta(id) {
  try {
    const res = await fetch(`${API}/normie/${id}/metadata`);
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    const attrs = {};
    (data.attributes || []).forEach(a => { attrs[a.trait_type] = a.value; });
    const lv   = Number(attrs['Level'] || 1);
    const px   = Number(attrs['Pixel Count'] || 400);
    const type = attrs['Type'] || 'Human';
    return {
      id,
      name:  data.name || `Normie #${id}`,
      image: data.image || makeSvgFallback(id),
      type, lv, px,
      ...calcStats(lv, px, type)
    };
  } catch {
    return makeFallback(id);
  }
}

export function makeFallback(id) {
  const types = ['Human','Zombie','Alien','Robot','Vampire','Wizard'];
  const type  = types[id % types.length];
  const lv    = (id % 10) + 1;
  const px    = 300 + (id % 400);
  return { id, name: `Normie #${id}`, image: makeSvgFallback(id), type, lv, px, ...calcStats(lv, px, type) };
}

export function makeSvgFallback(id) {
  const r = mkRng(id); const rects = [];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++)
    if (r() > 0.58) rects.push(`<rect x="${x*2}" y="${y*2}" width="2" height="2" fill="#000"/>`);
  return 'data:image/svg+xml;base64,' + btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">${rects.join('')}</svg>`
  );
}

function mkRng(seed) {
  let s = (seed | 0) + 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}
