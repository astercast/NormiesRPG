// battle.js — battle logic (HTML overlay, triggered from Phaser overworld)
// Not a Phaser Scene — runs in DOM overlay for full UI control.

import { makeSvgFallback } from './normie-api.js';

let state = null; // current battle state

// ── ENEMY DEFINITIONS ──
const ENEMY_POOL = [
  { name: 'WILD NORMIE',    seed: 101,  hpBase: 80,  atkBase: 14, def: 1,  spd: 5  },
  { name: 'THE VOID',       seed: 1001, hpBase: 120, atkBase: 18, def: 2,  spd: 5  },
  { name: 'COPE LORD',      seed: 2002, hpBase: 180, atkBase: 24, def: 4,  spd: 8  },
  { name: 'GAS FEE DEMON',  seed: 3003, hpBase: 260, atkBase: 32, def: 6,  spd: 11 },
  { name: 'RUGPULLER',      seed: 4004, hpBase: 360, atkBase: 42, def: 9,  spd: 13 },
  { name: 'BEARMARKT',      seed: 5005, hpBase: 500, atkBase: 55, def: 14, spd: 16 },
];

export function buildEnemy(tier, partySize) {
  const def = ENEMY_POOL[Math.max(0, Math.min(tier, ENEMY_POOL.length - 1))];
  const psc = 0.55 + partySize * 0.09;
  const maxHp = Math.round(def.hpBase * psc);
  const atk   = Math.round(def.atkBase * psc);
  return { ...def, maxHp, hp: maxHp, atk };
}

// ── SPRITE GENERATOR (enemies) ──
function mkRng(seed) {
  let s = (seed | 0) + 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

export function genEnemyCanvas(seed, size = 80) {
  const COLS = 8, ROWS = 14;
  const cw = size / COLS, ch = size / ROWS;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  const r   = mkRng(seed * 6271 + 9337);
  const bm  = Array.from({ length: ROWS }, () => new Uint8Array(COLS));

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < 4; col++) {
      let p = 0.42;
      if (row <= 1)       p = col < 2 ? 0.1 : 0.65;
      else if (row <= 3)  p = col < 3 ? 0.72 : 0.2;
      else if (row <= 8)  p = col >= 1 ? 0.82 : 0.08;
      else if (row <= 11) p = (col === 1 || col === 2) ? 0.9 : 0.04;
      else                p = col === 1 ? 0.88 : 0.02;
      bm[row][col] = r() < p ? 1 : 0;
    }
    for (let col = 0; col < 4; col++)
      bm[row][7 - col] = r() < 0.75 ? bm[row][col] : (r() < 0.4 ? 1 : 0);
  }
  // Eyes
  bm[2][2] = 1; bm[2][3] = 0; bm[2][5] = 1; bm[2][4] = 0;

  ctx.clearRect(0, 0, size, size);
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    if (!bm[row][col]) continue;
    const isEdge =
      (row === 0 || !bm[row-1][col]) || (row === ROWS-1 || !bm[row+1][col]) ||
      (col === 0 || !bm[row][col-1]) || (col === COLS-1 || !bm[row][col+1]);
    ctx.fillStyle = isEdge ? '#000' : '#555';
    ctx.fillRect(Math.round(col*cw), Math.round(row*ch), Math.ceil(cw), Math.ceil(ch));
  }
  return cv;
}

// ── PUBLIC API ──

export function startBattle(opts) {
  // opts: { party, enemy, zoneName, onEnd }
  const party = opts.party.map(n => ({ ...n })); // shallow copy so HP persists
  state = {
    party,
    enemy:    { ...opts.enemy },
    potions:  opts.potions ?? 3,
    zoneName: opts.zoneName || 'ENCOUNTER',
    onEnd:    opts.onEnd,
    turnOrder: null,
    turn: 0,
    over: false,
  };

  // Build turn order by SPD
  state.turnOrder = [
    ...state.party.filter(n => n.alive).map(n => ({ ...n, isPlayer: true })),
    { ...state.enemy, isEnemy: true }
  ].sort((a, b) => b.spd - a.spd);

  // Show overlay
  const panel = document.getElementById('panel-battle');
  const main  = document.getElementById('battle-main');
  const result= document.getElementById('battle-result');
  panel.style.display   = 'block';
  main.style.display    = 'block';
  result.style.display  = 'none';

  document.getElementById('encounter-zone').textContent = state.zoneName;
  document.getElementById('wave-num').textContent        = '!';
  document.getElementById('battle-log').innerHTML        = '';

  renderBattle();
  log(`${state.enemy.name} appeared!`, 'em');
  checkEnemy();
}

export function closeBattle() {
  document.getElementById('panel-battle').style.display = 'none';
}

// ── RENDERING ──
function renderBattle() { renderParty(); renderEnemy(); updateActions(); }

function renderParty() {
  const cont = document.getElementById('b-party');
  cont.innerHTML = '';
  state.party.forEach(n => {
    const active = isMyTurn(n);
    const div = document.createElement('div');
    div.className = 'b-normie' + (n.alive ? '' : ' dead') + (active ? ' active' : '');
    div.id = 'bn' + n.id;

    const img = document.createElement('img');
    img.className = 'b-normie-img';
    img.src = n.image || makeSvgFallback(n.id);
    img.onerror = () => { img.src = makeSvgFallback(n.id); };
    div.appendChild(img);

    const nm = document.createElement('div');
    nm.className = 'b-normie-name';
    nm.textContent = n.name.replace(/^Normie /, '#');
    div.appendChild(nm);

    const hpPct = Math.max(0, n.hp / n.maxHp * 100);
    const hpRow = document.createElement('div');
    hpRow.className = 'b-stat-row';
    hpRow.innerHTML = `<div class="b-stat-bar-wrap"><div class="b-stat-bar" style="width:${hpPct}%"></div></div><div class="b-stat-label">${n.hp}/${n.maxHp}</div>`;
    div.appendChild(hpRow);

    const mpPct = Math.max(0, n.mp / n.maxMp * 100);
    const mpRow = document.createElement('div');
    mpRow.className = 'b-stat-row';
    mpRow.innerHTML = `<div class="b-stat-bar-wrap"><div class="b-stat-bar-mp" style="width:${mpPct}%"></div></div><div class="b-stat-label" style="color:#bbb">${n.mp}mp</div>`;
    div.appendChild(mpRow);

    cont.appendChild(div);
  });
}

function renderEnemy() {
  const e    = state.enemy;
  const cont = document.getElementById('b-enemy');
  cont.innerHTML = '';
  const cv = genEnemyCanvas(e.seed, 80);
  cv.style.cssText = 'display:block; margin-left:auto; image-rendering:pixelated;';
  cont.appendChild(cv);

  const nm = document.createElement('div'); nm.className = 'b-enemy-name'; nm.textContent = e.name; cont.appendChild(nm);
  const hp = document.createElement('div'); hp.className = 'b-enemy-hp-txt'; hp.textContent = `${e.hp} / ${e.maxHp} HP`; cont.appendChild(hp);
  const bw = document.createElement('div'); bw.className = 'b-enemy-bar-wrap';
  const bf = document.createElement('div'); bf.className = 'b-enemy-bar-fill'; bf.style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
  bw.appendChild(bf); cont.appendChild(bw);
}

function updateActions() {
  const cur = currentTurn();
  const ti  = document.getElementById('turn-info');
  const lbl = document.getElementById('action-label');
  const ids = ['btn-atk','btn-skill','btn-ult','btn-pot'];

  if (!cur || cur.isEnemy || state.over) {
    ids.forEach(id => document.getElementById(id).disabled = true);
    if (cur && cur.isEnemy) ti.textContent = `${state.enemy.name} is acting…`;
    return;
  }

  ids.forEach(id => document.getElementById(id).disabled = false);
  document.getElementById('btn-skill').disabled = cur.mp < 3;
  document.getElementById('btn-ult').disabled   = cur.mp < 6;
  document.getElementById('btn-pot').disabled   = state.potions <= 0;

  document.getElementById('atk-lbl').textContent   = `${cur.atkBasic} dmg`;
  document.getElementById('skill-lbl').textContent  = `${cur.sk1} · ${cur.atkSkill} dmg · 3MP`;
  document.getElementById('ult-lbl').textContent    = `${cur.sk2} · ${cur.atkUltimate} dmg · 6MP`;
  document.getElementById('pot-lbl').textContent    = `×${state.potions} · heal 35%`;

  ti.textContent  = `${cur.name} · HP ${cur.hp}/${cur.maxHp} · MP ${cur.mp}/${cur.maxMp}`;
  lbl.textContent = `${cur.name} — choose action`;

  document.querySelectorAll('.b-normie').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('bn' + cur.id);
  if (el) el.classList.add('active');
}

function isMyTurn(n) {
  const t = state.turnOrder[state.turn];
  return t && t.isPlayer && t.id === n.id;
}
function currentTurn() { return state.turnOrder[state.turn]; }

// ── ACTIONS (called from HTML buttons) ──
window.__battleAct = function(type) {
  if (!state || state.over) return;
  const actor = currentTurn();
  if (!actor || actor.isEnemy) return;
  const enemy = state.enemy;

  if (type === 'attack') {
    const d = rollDmg(actor.atkBasic, enemy.def);
    enemy.hp = Math.max(0, enemy.hp - d);
    floatDmg(d, false);
    actor.mp = Math.min(actor.maxMp, actor.mp + 2);
    log(`${actor.name} attacks — ${d} damage.`);
  } else if (type === 'skill') {
    if (actor.mp < 3) return;
    actor.mp -= 3;
    const d = rollDmg(actor.atkSkill, enemy.def);
    enemy.hp = Math.max(0, enemy.hp - d);
    floatDmg(d, false);
    log(`${actor.name} uses ${actor.sk1} — ${d} damage.`, 'em');
  } else if (type === 'ult') {
    if (actor.mp < 6) return;
    actor.mp -= 6;
    const d = Math.max(1, actor.atkUltimate - Math.floor(enemy.def * 0.5));
    enemy.hp = Math.max(0, enemy.hp - d);
    floatDmg(d, false);
    log(`${actor.name} uses ${actor.sk2} — ${d} damage.`, 'big');
  } else if (type === 'potion') {
    if (state.potions <= 0) return;
    state.potions--;
    const t = state.party.filter(n => n.alive).sort((a, b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
    if (t) { const h = Math.floor(t.maxHp * 0.35); t.hp = Math.min(t.maxHp, t.hp + h); log(`Potion on ${t.name} — +${h} HP.`); }
  }

  // Sync back to party array
  const inParty = state.party.find(p => p.id === actor.id);
  if (inParty) { inParty.mp = actor.mp; }

  renderBattle();
  if (checkEnd()) return;
  nextTurn();
};

function rollDmg(base, def) {
  const r = Math.max(1, base - Math.floor(def * 0.5));
  return Math.max(1, Math.round(r * (0.92 + Math.random() * 0.16)));
}

function checkEnemy() {
  const t = currentTurn();
  if (t && t.isEnemy) { updateActions(); setTimeout(enemyAct, 950); }
}

function enemyAct() {
  if (!state || state.over) return;
  const alive = state.party.filter(n => n.alive);
  if (!alive.length) return;
  const target = alive[Math.floor(Math.random() * alive.length)];
  const heavy  = Math.random() > 0.72;
  const d      = rollDmg(heavy ? Math.round(state.enemy.atk * 1.55) : state.enemy.atk, target.def);
  target.hp = Math.max(0, target.hp - d);
  if (target.hp <= 0) target.alive = false;
  floatDmg(d, true);
  log(heavy
    ? `${state.enemy.name} heavy strike on ${target.name} — ${d}.`
    : `${state.enemy.name} attacks ${target.name} — ${d}.`,
    heavy ? 'big' : '');
  renderBattle();
  if (checkEnd()) return;
  nextTurn();
}

function nextTurn() {
  // Sync HP/MP from party into turnOrder
  state.turnOrder.forEach(t => {
    if (t.isPlayer) {
      const p = state.party.find(n => n.id === t.id);
      if (p) { t.hp = p.hp; t.mp = p.mp; t.alive = p.alive; }
    }
  });
  let n = (state.turn + 1) % state.turnOrder.length;
  for (let i = 0; i < state.turnOrder.length; i++) {
    const t = state.turnOrder[n];
    if (t.isEnemy || (t.isPlayer && t.alive)) break;
    n = (n + 1) % state.turnOrder.length;
  }
  state.turn = n;
  updateActions();
  checkEnemy();
}

function checkEnd() {
  const alive = state.party.filter(n => n.alive);

  if (state.enemy.hp <= 0) {
    state.over = true;
    const gold = Math.floor(10 + Math.random() * 20);
    log(`${state.enemy.name} defeated! +${gold} Gold.`, 'big');
    setTimeout(() => showResult('victory', gold), 700);
    return true;
  }
  if (!alive.length) {
    state.over = true;
    log('All Normies defeated.', 'big');
    setTimeout(() => showResult('defeat', 0), 700);
    return true;
  }
  return false;
}

function showResult(type, gold) {
  document.getElementById('battle-main').style.display  = 'none';
  document.getElementById('battle-result').style.display = 'block';
  document.getElementById('result-title').textContent = type === 'victory' ? 'Victory.' : 'Defeated.';
  document.getElementById('result-sub').textContent   = type === 'victory' ? 'You won the encounter.' : 'Your party was defeated.';
  document.getElementById('result-gold').textContent  = gold > 0 ? `+${gold} Gold` : '';
  document.getElementById('result-gold').style.display = gold > 0 ? 'block' : 'none';

  // Notify overworld
  if (state.onEnd) state.onEnd({ type, gold, party: state.party, potions: state.potions });
}

// ── LOG / FLOAT ──
function log(msg, cls = '') {
  const l = document.getElementById('battle-log');
  const d = document.createElement('div');
  d.className = 'log-line ' + cls; d.textContent = msg;
  l.appendChild(d); l.scrollTop = l.scrollHeight;
}

function floatDmg(val, onPlayer) {
  const arena = document.getElementById('arena');
  const el    = document.createElement('div');
  el.className = 'fdmg'; el.textContent = '-' + val;
  el.style.cssText = onPlayer
    ? `left:${20 + Math.random() * 160}px; bottom:${50 + Math.random() * 40}px;`
    : `right:70px; bottom:${60 + Math.random() * 40}px;`;
  arena.appendChild(el);
  setTimeout(() => el.remove(), 700);
}
