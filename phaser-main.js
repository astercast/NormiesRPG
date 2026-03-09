import Phaser from 'phaser';
import { connectWallet, loadWalletNormies, loadDemoNormies, detectWallets } from './wallet.js';

const bus = new Phaser.Events.EventEmitter();

const ART_CONFIG = {
  // Drop files in assets/art/... to upgrade visuals without touching code.
  tilesPath: 'assets/art/tileset/world_tileset_32.png',
  playerPath: 'assets/art/sprites/player_sheet_32.png',
  npcPath: 'assets/art/sprites/npc_sheet_32.png',
  enemyPath: 'assets/art/sprites/enemy_sheet_32.png',
  frameW: 32,
  frameH: 32,
};

const ART_KEYS = {
  tiles: 'generatedTiles',
  player: 'playerSheet',
  npc: 'npcSheet',
  enemy: 'enemySheet',
};

const NPCS = {
  elder: { name: 'Elder Vex' },
  smith: { name: 'Forge Ada' },
  scout: { name: 'Scout Nori' },
  merchant: { name: 'Merchant Zen' },
};

const ENEMIES_BY_TIER = {
  1: [
    { id: 'byte_wolf', name: 'Byte Wolf', hp: 76, atk: 12, exp: 30, goldMin: 14, goldMax: 22, color: 0xbdbdbd },
    { id: 'drift_slime', name: 'Drift Slime', hp: 84, atk: 11, exp: 33, goldMin: 15, goldMax: 24, color: 0x9e9e9e },
  ],
  2: [
    { id: 'hex_raider', name: 'Hex Raider', hp: 102, atk: 16, exp: 43, goldMin: 20, goldMax: 32, color: 0x8a8a8a },
    { id: 'error_mantis', name: 'Error Mantis', hp: 112, atk: 17, exp: 47, goldMin: 23, goldMax: 35, color: 0xa3a3a3 },
  ],
  3: [
    { id: 'void_seraph', name: 'Void Seraph', hp: 142, atk: 21, exp: 62, goldMin: 30, goldMax: 45, color: 0x7a7a7a },
    { id: 'core_hunter', name: 'Core Hunter', hp: 150, atk: 22, exp: 65, goldMin: 32, goldMax: 48, color: 0x6a6a6a },
  ],
};

const BOSSES = {
  abyss_warden: {
    id: 'abyss_warden',
    name: 'Abyss Warden',
    hp: 290,
    atk: 28,
    exp: 170,
    goldMin: 95,
    goldMax: 130,
    color: 0x5a5a5a,
  },
};

const ITEMS = {
  potion: { id: 'potion', kind: 'consumable', name: 'Potion', healPct: 0.34, price: 18 },
  ion_blade: { id: 'ion_blade', kind: 'weapon', slot: 'weapon', name: 'Ion Blade', atk: 7, price: 80 },
  eclipse_edge: { id: 'eclipse_edge', kind: 'weapon', slot: 'weapon', name: 'Eclipse Edge', atk: 12, price: 145 },
  carbon_mail: { id: 'carbon_mail', kind: 'armor', slot: 'armor', name: 'Carbon Mail', hp: 24, price: 92 },
  titan_shell: { id: 'titan_shell', kind: 'armor', slot: 'armor', name: 'Titan Shell', hp: 40, price: 165 },
  chrono_relic: { id: 'chrono_relic', kind: 'relic', slot: 'relic', name: 'Chrono Relic', skill: 8, price: 130 },
  pulse_core: { id: 'pulse_core', kind: 'relic', slot: 'relic', name: 'Pulse Core', skill: 14, price: 205 },
};

const SHOP_STOCK = ['potion', 'ion_blade', 'carbon_mail', 'chrono_relic', 'eclipse_edge', 'titan_shell', 'pulse_core'];
const LOOT_BY_TIER = { 1: ['ion_blade', 'carbon_mail'], 2: ['chrono_relic', 'ion_blade', 'carbon_mail'], 3: ['eclipse_edge', 'titan_shell', 'pulse_core'] };

const STATE = {
  identity: {
    walletAddress: null,
    walletName: null,
    mode: 'demo',
  },
  player: {
    level: 1,
    exp: 0,
    expToLevel: 95,
    baseHp: 126,
    hp: 126,
    baseAtk: 21,
    baseSkill: 34,
    crit: 0.1,
    gold: 40,
    potions: 3,
    equipment: { weapon: null, armor: null, relic: null },
    inventoryGear: [],
  },
  party: {
    roster: [],
    leadId: null,
  },
  world: {
    mapId: 'town',
    spawnName: 'from_overworld',
  },
  quest: {
    step: 0,
    kills: 0,
    eliteKills: 0,
    bossDefeated: false,
    storyFlags: {},
  },
  meta: {
    wins: 0,
    noLootStreak: 0,
  },
};

const ui = {
  launchOverlay: document.getElementById('launch-overlay'),
  launchStatus: document.getElementById('launch-status'),
  walletPicker: document.getElementById('wallet-picker'),
  walletRefresh: document.getElementById('btn-wallet-refresh'),
  launchWallet: document.getElementById('btn-launch-wallet'),
  launchDemo: document.getElementById('btn-launch-demo'),
  themeToggle: document.getElementById('btn-theme-toggle'),
  launchThemeToggle: document.getElementById('btn-theme-toggle-launch'),
  walletConnect: document.getElementById('btn-wallet-connect'),
  walletDemo: document.getElementById('btn-wallet-demo'),
  walletStatus: document.getElementById('wallet-status'),
  leadLabel: document.getElementById('lead-label'),
  zoneLabel: document.getElementById('zone-label'),
  fpsLabel: document.getElementById('fps-label'),
  goldLabel: document.getElementById('gold-label'),
  hpLabel: document.getElementById('hp-label'),
  potionsLabel: document.getElementById('potions-label'),
  eqLabel: document.getElementById('eq-label'),
  questBanner: document.getElementById('quest-banner'),
  dialogue: document.getElementById('dialogue'),
  dialogueName: document.getElementById('dialogue-name'),
  dialogueText: document.getElementById('dialogue-text'),
  dialogueClose: document.getElementById('dialogue-close'),
  battle: document.getElementById('battle'),
  battleEnemyName: document.getElementById('battle-enemy-name'),
  battleRound: document.getElementById('battle-round'),
  battleHeroHp: document.getElementById('battle-hero-hp'),
  battleEnemyHp: document.getElementById('battle-enemy-hp'),
  battleLog: document.getElementById('battle-log'),
  btnAttack: document.getElementById('btn-attack'),
  btnSkill: document.getElementById('btn-skill'),
  btnPotion: document.getElementById('btn-potion'),
  btnFlee: document.getElementById('btn-flee'),
  menu: document.getElementById('menu'),
  menuBody: document.getElementById('menu-body'),
  partyBody: document.getElementById('party-body'),
  menuClose: document.getElementById('menu-close'),
  shop: document.getElementById('shop'),
  shopBody: document.getElementById('shop-body'),
  shopClose: document.getElementById('shop-close'),
  btnSaveCloud: document.getElementById('btn-save-cloud'),
  btnLoadCloud: document.getElementById('btn-load-cloud'),
  saveStatus: document.getElementById('save-status'),
};

let gameRef = null;
let overworldRef = null;
let menuOpen = false;
let shopOpen = false;
let detectedWallets = [];
let selectedWalletId = null;
let uiTheme = 'dark';
const LEAD_NORMIE_TEXTURE_KEY = 'leadNormieAvatar';

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shortAddr(addr) {
  if (!addr) return 'not connected';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function slotKey() {
  return STATE.identity.walletAddress ? `wallet_${STATE.identity.walletAddress.toLowerCase()}` : 'demo_guest';
}

function itemById(id) {
  return ITEMS[id] || null;
}

function leadNormie() {
  if (!STATE.party.roster.length) return null;
  return STATE.party.roster.find((n) => n.id === STATE.party.leadId) || STATE.party.roster[0];
}

function buildLeadNormieTexture() {
  if (!gameRef) return false;
  const lead = leadNormie();
  const px = lead?.pixels || '';
  if (!px || px.length < 1600) return false;

  const size = 40;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#000000';

  // Keep only dark pixels from the Normie bitmap.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      if (px[i] === '1') ctx.fillRect(x, y, 1, 1);
    }
  }

  if (gameRef.textures.exists(LEAD_NORMIE_TEXTURE_KEY)) {
    gameRef.textures.remove(LEAD_NORMIE_TEXTURE_KEY);
  }
  gameRef.textures.addCanvas(LEAD_NORMIE_TEXTURE_KEY, cv);
  return true;
}

function leadAvatarKey() {
  return gameRef?.textures?.exists(LEAD_NORMIE_TEXTURE_KEY)
    ? LEAD_NORMIE_TEXTURE_KEY
    : ART_KEYS.player;
}

function applyLeadNormieStats() {
  const lead = leadNormie();
  if (!lead) return;

  // Keep progression smooth by blending lead NFT stats with campaign scaling.
  STATE.player.baseHp = Math.max(110, Math.floor(lead.maxHp * 0.55));
  STATE.player.baseAtk = Math.max(16, Math.floor(lead.atkBasic * 0.58));
  STATE.player.baseSkill = Math.max(24, Math.floor(lead.atkSkill * 0.62));
  STATE.player.crit = clamp(lead.crit || 0.08, 0.05, 0.22);
  STATE.player.hp = clamp(STATE.player.hp, 1, maxHp());
}

function equippedBonus() {
  const eq = STATE.player.equipment;
  const weapon = itemById(eq.weapon);
  const armor = itemById(eq.armor);
  const relic = itemById(eq.relic);
  return {
    hp: armor?.hp || 0,
    atk: weapon?.atk || 0,
    skill: relic?.skill || 0,
    label: [weapon?.name, armor?.name, relic?.name].filter(Boolean).join(' / ') || 'None',
  };
}

function maxHp() {
  return STATE.player.baseHp + equippedBonus().hp + (STATE.player.level - 1) * 14;
}

function atkValue() {
  return STATE.player.baseAtk + equippedBonus().atk + (STATE.player.level - 1) * 3;
}

function skillValue() {
  return STATE.player.baseSkill + equippedBonus().skill + (STATE.player.level - 1) * 4;
}

function questText() {
  if (STATE.quest.step === 0) return 'Chapter I: Speak with Elder Vex.';
  if (STATE.quest.step === 1) return `Chapter I: Defeat 2 wild enemies (${STATE.quest.kills}/2).`;
  if (STATE.quest.step === 2) return `Chapter II: Defeat 1 elite enemy (${STATE.quest.eliteKills}/1).`;
  if (STATE.quest.step === 3) return 'Chapter III: Defeat Abyss Warden in Null Ruins.';
  return 'Epilogue: Explore, level up, and optimize your party build.';
}

function updateWalletStatus(msg = null) {
  if (msg) {
    ui.walletStatus.textContent = msg;
    return;
  }
  const mode = STATE.identity.mode === 'wallet' ? 'wallet' : 'demo';
  ui.walletStatus.textContent = `Wallet: ${shortAddr(STATE.identity.walletAddress)} (${mode}, slot ${slotKey()})`;
}

function setLaunchStatus(message) {
  if (ui.launchStatus) ui.launchStatus.textContent = message;
}

function applyUiTheme(theme) {
  uiTheme = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.uiTheme = uiTheme;
  const nextLabel = uiTheme === 'dark' ? 'Light UI' : 'Dark UI';
  if (ui.themeToggle) ui.themeToggle.textContent = nextLabel;
  if (ui.launchThemeToggle) ui.launchThemeToggle.textContent = nextLabel;
  localStorage.setItem('normies-ui-theme', uiTheme);
}

function toggleUiTheme() {
  applyUiTheme(uiTheme === 'dark' ? 'light' : 'dark');
}

function initUiTheme() {
  const saved = localStorage.getItem('normies-ui-theme');
  applyUiTheme(saved || 'dark');
}

function walletErrorMessage(err) {
  const code = err?.message || 'UNKNOWN_ERROR';
  if (code === 'NO_WALLET') return 'No browser wallet detected. Install MetaMask/Coinbase/Rabby or use Demo Mode.';
  if (code === 'USER_REJECTED') return 'Wallet request was rejected. Approve the connection prompt to continue.';
  if (code === 'WALLET_PROVIDER_UNAVAILABLE') return 'Selected wallet provider is unavailable. Refresh wallet list and try again.';
  return `Wallet connect failed: ${code}`;
}

function renderWalletChoices() {
  if (!ui.walletPicker) return;

  detectedWallets = detectWallets();
  ui.walletPicker.innerHTML = '';

  if (!detectedWallets.length) {
    selectedWalletId = null;
    if (ui.launchWallet) ui.launchWallet.disabled = true;
    ui.walletPicker.innerHTML = '<div class="wallet-empty">No injected wallet detected. Install MetaMask, Coinbase Wallet, Rabby, or use Demo Mode.</div>';
    setLaunchStatus('No wallet detected. You can still play instantly in demo mode.');
    return;
  }

  const preferred = selectedWalletId && detectedWallets.some((w) => w.id === selectedWalletId)
    ? selectedWalletId
    : detectedWallets[0].id;

  selectedWalletId = preferred;
  detectedWallets.forEach((wallet) => {
    const button = document.createElement('button');
    button.className = `wallet-choice${wallet.id === selectedWalletId ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.walletId = wallet.id;
    button.innerHTML = `<span class="wallet-choice-name">${wallet.name}</span><span class="wallet-choice-tag">${wallet.id}</span>`;
    button.addEventListener('click', () => {
      selectedWalletId = wallet.id;
      renderWalletChoices();
    });
    ui.walletPicker.appendChild(button);
  });

  if (ui.launchWallet) ui.launchWallet.disabled = false;
  const selected = detectedWallets.find((w) => w.id === selectedWalletId);
  setLaunchStatus(`Selected provider: ${selected?.name || 'Wallet'}.`);
}

function exitLaunchOverlay() {
  document.body.classList.remove('prelaunch');
  ui.launchOverlay?.classList.add('hidden');
}

function updateHud(zone = null) {
  if (zone) ui.zoneLabel.textContent = `Zone: ${zone}`;

  const lead = leadNormie();
  ui.leadLabel.textContent = `Lead: ${lead ? lead.name.replace(/^Normie /, '#') : 'Rookie'}`;
  ui.goldLabel.textContent = `Gold: ${STATE.player.gold}`;
  ui.hpLabel.textContent = `HP: ${Math.max(0, Math.floor(STATE.player.hp))}/${maxHp()}`;
  ui.potionsLabel.textContent = `Potions: ${STATE.player.potions}`;
  ui.eqLabel.textContent = `Gear: ${equippedBonus().label}`;
  ui.questBanner.textContent = questText();
}

function addBattleLog(text) {
  const row = document.createElement('div');
  row.textContent = text;
  ui.battleLog.appendChild(row);
  ui.battleLog.scrollTop = ui.battleLog.scrollHeight;
}

function setOverlayLock(locked) {
  if (overworldRef) overworldRef.overlayLocked = locked;
}

function showDialogue(name, text) {
  ui.dialogueName.textContent = name;
  ui.dialogueText.textContent = text;
  ui.dialogue.classList.remove('hidden');
  setOverlayLock(true);
}

function hideDialogue() {
  ui.dialogue.classList.add('hidden');
  if (!menuOpen && !shopOpen) setOverlayLock(false);
}

function cloudPayload() {
  return {
    identity: STATE.identity,
    player: STATE.player,
    party: STATE.party,
    world: STATE.world,
    quest: STATE.quest,
    meta: STATE.meta,
    savedAt: Date.now(),
  };
}

function applyCloudPayload(data) {
  if (!data?.player || !data?.party || !data?.world || !data?.quest) return false;
  STATE.identity = data.identity || STATE.identity;
  STATE.player = data.player;
  STATE.party = data.party;
  STATE.world = data.world;
  STATE.quest = data.quest;
  STATE.meta = data.meta || STATE.meta;

  applyLeadNormieStats();
  buildLeadNormieTexture();
  STATE.player.hp = clamp(STATE.player.hp, 1, maxHp());
  updateWalletStatus();
  updateHud();
  bus.emit('state-reloaded');
  return true;
}

async function saveCloud() {
  ui.saveStatus.textContent = `Cloud save (${slotKey()}): syncing...`;
  try {
    const resp = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: slotKey(), data: cloudPayload() }),
    });
    const json = await resp.json();
    if (!resp.ok || !json.ok) throw new Error(json.error || 'Save failed');
    ui.saveStatus.textContent = `Cloud save (${slotKey()}): success`;
  } catch (err) {
    localStorage.setItem(`normies-rpg-backup:${slotKey()}`, JSON.stringify(cloudPayload()));
    ui.saveStatus.textContent = `Cloud save failed (${err.message}). Local backup written.`;
  }
}

async function loadCloud() {
  ui.saveStatus.textContent = `Cloud load (${slotKey()}): syncing...`;
  try {
    const resp = await fetch(`/api/load?slot=${encodeURIComponent(slotKey())}`);
    const json = await resp.json();
    if (!resp.ok || !json.ok) throw new Error(json.error || 'Load failed');
    if (!applyCloudPayload(json.data)) throw new Error('Corrupt payload');
    ui.saveStatus.textContent = `Cloud load (${slotKey()}): success`;
  } catch (err) {
    const backup = localStorage.getItem(`normies-rpg-backup:${slotKey()}`);
    if (backup && applyCloudPayload(JSON.parse(backup))) {
      ui.saveStatus.textContent = `Cloud load failed (${err.message}). Local backup restored.`;
    } else {
      ui.saveStatus.textContent = `Cloud load failed: ${err.message}`;
    }
  }
}

function partyTintByType(type) {
  return 0xffffff;
}

function renderPartyMenu() {
  const lead = leadNormie();
  const rows = [];
  rows.push('<div class="panel-row"><span>Party (click Set Lead for battle avatar/stat baseline)</span><span></span></div>');

  STATE.party.roster.slice(0, 5).forEach((n) => {
    const isLead = lead?.id === n.id;
    rows.push(`<div class="panel-row"><span>${n.name} · ${n.type} · HP ${n.maxHp} · Basic ${n.atkBasic}</span><span><button class="btn alt" data-lead="${n.id}">${isLead ? 'Lead' : 'Set Lead'}</button></span></div>`);
  });
  ui.partyBody.innerHTML = rows.join('');

  ui.partyBody.querySelectorAll('[data-lead]').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.party.leadId = Number(btn.dataset.lead);
      applyLeadNormieStats();
      STATE.player.hp = clamp(STATE.player.hp, 1, maxHp());
      buildLeadNormieTexture();
      bus.emit('lead-changed');
      updateHud();
      renderPartyMenu();
    });
  });
}

function renderInventoryMenu() {
  const p = STATE.player;
  const eq = p.equipment;
  const body = [];

  body.push(`<div class="panel-row"><span>Level ${p.level} · EXP ${p.exp}/${p.expToLevel}</span><span>ATK ${atkValue()} · SKILL ${skillValue()} · HP ${maxHp()}</span></div>`);
  body.push(`<div class="panel-row"><span>Potions</span><span>${p.potions}</span></div>`);

  ['weapon', 'armor', 'relic'].forEach((slot) => {
    const current = itemById(eq[slot]);
    body.push(`<div class="panel-row"><span>${slot.toUpperCase()}</span><span>${current ? current.name : 'None'}</span></div>`);
  });

  p.inventoryGear.forEach((id, idx) => {
    const it = itemById(id);
    if (!it) return;
    body.push(`<div class="panel-row"><span>${it.name}</span><span><button class="btn alt" data-equip="${idx}">Equip</button></span></div>`);
  });

  if (!p.inventoryGear.length) body.push('<div class="panel-row"><span>No spare gear yet. Loot and shop upgrades appear quickly now.</span><span></span></div>');

  ui.menuBody.innerHTML = body.join('');
  ui.menuBody.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.equip);
      const id = STATE.player.inventoryGear[idx];
      const item = itemById(id);
      if (!item?.slot) return;

      const old = STATE.player.equipment[item.slot];
      STATE.player.equipment[item.slot] = id;
      STATE.player.inventoryGear.splice(idx, 1);
      if (old) STATE.player.inventoryGear.push(old);

      STATE.player.hp = clamp(STATE.player.hp, 1, maxHp());
      updateHud();
      renderInventoryMenu();
    });
  });
}

function openMenu() {
  menuOpen = true;
  ui.menu.classList.remove('hidden');
  setOverlayLock(true);
  renderInventoryMenu();
  renderPartyMenu();
}

function closeMenu() {
  menuOpen = false;
  ui.menu.classList.add('hidden');
  if (!shopOpen && ui.dialogue.classList.contains('hidden')) setOverlayLock(false);
}

function addGearToInventory(itemId) {
  STATE.player.inventoryGear.push(itemId);
}

function buyItem(itemId) {
  const item = itemById(itemId);
  if (!item) return;
  if (STATE.player.gold < item.price) {
    showDialogue('Merchant Zen', 'Not enough gold. Try one more encounter, rewards are generous now.');
    return;
  }

  STATE.player.gold -= item.price;
  if (item.kind === 'consumable') STATE.player.potions += 1;
  else addGearToInventory(item.id);

  updateHud();
  renderShop();
}

function renderShop() {
  const body = [];
  body.push(`<div class="panel-row"><span>Your Gold</span><span>${STATE.player.gold}</span></div>`);

  SHOP_STOCK.forEach((id) => {
    const item = itemById(id);
    const stats = item.kind === 'consumable'
      ? `Heal ${Math.floor(item.healPct * 100)}%`
      : `+${item.atk || 0} ATK +${item.hp || 0} HP +${item.skill || 0} SKILL`;
    body.push(`<div class="panel-row"><span>${item.name} (${stats})</span><span><button class="btn" data-buy="${id}">${item.price}G</button></span></div>`);
  });

  ui.shopBody.innerHTML = body.join('');
  ui.shopBody.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => buyItem(btn.dataset.buy));
  });
}

function openShop() {
  if (!ui.dialogue.classList.contains('hidden')) hideDialogue();
  shopOpen = true;
  ui.shop.classList.remove('hidden');
  setOverlayLock(true);
  renderShop();
}

function closeShop() {
  shopOpen = false;
  ui.shop.classList.add('hidden');
  if (!menuOpen && ui.dialogue.classList.contains('hidden')) setOverlayLock(false);
}

function getObjectProp(obj, name, fallback = null) {
  const p = (obj.properties || []).find((it) => it.name === name);
  return p ? p.value : fallback;
}

function scaleObjRect(obj, scale) {
  return new Phaser.Geom.Rectangle(obj.x * scale, obj.y * scale, obj.width * scale, obj.height * scale);
}

function pointInRect(x, y, rect) {
  return x >= rect.x && y >= rect.y && x <= rect.right && y <= rect.bottom;
}

function enemyForTier(tier) {
  const pool = ENEMIES_BY_TIER[tier] || ENEMIES_BY_TIER[1];
  return pool[randInt(0, pool.length - 1)];
}

function dropLootForTier(tier) {
  const pool = LOOT_BY_TIER[tier] || [];
  if (!pool.length) return null;

  const pityChance = Math.min(0.9, 0.28 + STATE.meta.noLootStreak * 0.2);
  if (Math.random() > pityChance) {
    STATE.meta.noLootStreak += 1;
    return null;
  }

  STATE.meta.noLootStreak = 0;
  return pool[randInt(0, pool.length - 1)];
}

function progressionDialogue(npcId) {
  const q = STATE.quest;
  if (npcId === 'elder') {
    if (q.step === 0) return 'The Grid is splintering. Start with two field wins, then report back stronger.';
    if (q.step === 1) return 'Stay calm and finish two wins. You are almost ready for chapter two.';
    if (q.step === 2) return 'Excellent. Hunt one elite foe in the highlands to prove mastery.';
    if (q.step === 3) return 'All roads point to the Null Ruins. Defeat Abyss Warden.';
    return 'You did it, champion. Keep training your Normies for future expansions.';
  }
  if (npcId === 'scout') {
    if (q.step < 2) return 'You can force quick wins in plains. Fights are shorter now by design.';
    if (q.step === 2) return 'Elites roam deep fields and ruins edge. One elite kill unlocks the boss phase.';
    return 'Boss is in the ruins center. Keep one potion for phase pressure.';
  }
  if (npcId === 'smith') return 'Gear spikes your build. Equip from menu after each drop for huge power jumps.';
  return 'Need goods? My prices are tuned for fast progression, no long grind.';
}

function grantVictory(data) {
  const p = STATE.player;
  p.gold += data.gold;
  p.exp += data.exp;
  STATE.meta.wins += 1;

  if (!data.isBoss) {
    STATE.quest.kills += 1;
    if (data.tier >= 2) STATE.quest.eliteKills += 1;
  }

  if (STATE.quest.step === 1 && STATE.quest.kills >= 2) {
    STATE.quest.step = 2;
    p.gold += 35;
    p.potions += 1;
    showDialogue('Chapter II', 'Wild phase complete. Bonus 35G and +1 potion awarded. Defeat one elite foe next.');
  } else if (STATE.quest.step === 2 && STATE.quest.eliteKills >= 1) {
    STATE.quest.step = 3;
    p.gold += 60;
    showDialogue('Chapter III', 'Elite target down. Abyss Warden is now vulnerable in Null Ruins.');
  }

  if (data.isBoss) {
    STATE.quest.step = 4;
    STATE.quest.bossDefeated = true;
    p.gold += 120;
    showDialogue('Epilogue', 'Abyss Warden is defeated. The realm stabilizes and your party enters legend.');
  }

  while (p.exp >= p.expToLevel) {
    p.exp -= p.expToLevel;
    p.level += 1;
    p.expToLevel = Math.floor(p.expToLevel * 1.18);
    p.baseHp += 10;
    p.baseAtk += 2;
    p.baseSkill += 3;
    p.potions += 1;
    p.hp = maxHp();
    showDialogue('Level Up', `Lv.${p.level} reached. Build growth applied and +1 potion granted.`);
  }

  // Keep friction low: partial heal after each non-boss victory.
  if (!data.isBoss) p.hp = clamp(p.hp + Math.floor(maxHp() * 0.18), 1, maxHp());

  const drop = dropLootForTier(data.tier);
  if (drop) {
    addGearToInventory(drop);
    showDialogue('Loot', `${itemById(drop).name} dropped. Open inventory (I) and equip it.`);
  }

  updateHud();
}

function tintFromLead() {
  const lead = leadNormie();
  return partyTintByType(lead?.type);
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural texture builders — pure DOM canvas, no Phaser API.
// Converted to data-URLs and fed into load.image / load.spritesheet so Phaser
// handles the full WebGL upload pipeline (the only reliable cross-GPU path).
// ─────────────────────────────────────────────────────────────────────────────
function buildTileCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const ctx = cv.getContext('2d');
  const S = 32;
  const tile = (tx, ty, base, detail, grid) => {
    const x = tx * S; const y = ty * S;
    ctx.fillStyle = base; ctx.fillRect(x, y, S, S);
    if (detail) {
      ctx.fillStyle = detail;
      for (let dy = 4; dy < S - 4; dy += 8)
        for (let dx = 4; dx < S - 4; dx += 8)
          ctx.fillRect(x + dx, y + dy, 2, 2);
    }
    if (grid) {
      ctx.fillStyle = grid;
      ctx.fillRect(x, y + S - 1, S, 1);
      ctx.fillRect(x + S - 1, y, 1, S);
    }
  };
  tile(0, 0, '#b4bec0', '#c8d2d4', '#9eaaac'); // ID 1 – overworld ground
  tile(1, 0, '#8a989c', '#9aacb0', '#7a8890');
  tile(2, 0, '#6a7478', '#7a8488', '#5a666a');
  tile(3, 0, '#2a3038', '#343c44', '#1e262e');
  tile(0, 1, '#c0cac8', '#d0d8d6', '#a8b4b2'); // ID 5 – town ground
  tile(1, 1, '#848e8c', '#949e9c', '#747e7c');
  tile(2, 1, '#484e54', '#585e64', '#383e44');
  tile(3, 1, '#dce4e4', '#eaf0f0', '#c8d0d0');
  tile(0, 2, '#1a2028', '#242a32', '#121820');
  tile(1, 2, '#243038', '#2e3c44', '#18242c');
  tile(2, 2, '#303840', '#3c444c', '#242c34');
  tile(3, 2, '#3c4450', '#48505c', '#30383c');
  tile(0, 3, '#18242e', '#204050', '#101c24');
  tile(1, 3, '#204858', '#286070', '#18404e');
  tile(2, 3, '#10181e', '#181e26', '#0c1016');
  tile(3, 3, '#e8e8e8', '#f4f4f4', '#cccccc');
  return cv;
}

function buildPlayerCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 128;
  const ctx = cv.getContext('2d');
  const drawFrame = (col, row, legL = 0, legR = 0) => {
    const x = col * 32; const y = row * 32;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + 10, y + 29, 12, 2);
    ctx.fillStyle = '#8090a0';
    ctx.fillRect(x + 12, y + 22, 4, 7 + legL);
    ctx.fillRect(x + 16, y + 22, 4, 7 + legR);
    ctx.fillStyle = '#404850';
    ctx.fillRect(x + 12, y + 26 + legL, 4, 3);
    ctx.fillRect(x + 16, y + 26 + legR, 4, 3);
    ctx.fillStyle = '#1e242a'; ctx.fillRect(x + 9,  y + 11, 14, 12);
    ctx.fillStyle = '#606870'; ctx.fillRect(x + 10, y + 12, 12, 10);
    ctx.fillStyle = '#8090a0'; ctx.fillRect(x + 11, y + 13,  4,  4);
    ctx.fillStyle = '#606870';
    ctx.fillRect(x + 6,  y + 12, 4, 6);
    ctx.fillRect(x + 22, y + 12, 4, 6);
    ctx.fillStyle = '#1e242a'; ctx.fillRect(x + 10, y + 3, 12, 10);
    ctx.fillStyle = '#d4d8dc'; ctx.fillRect(x + 11, y + 4, 10,  8);
    ctx.fillStyle = '#1a2028'; ctx.fillRect(x + 11, y + 6, 10,  3);
    ctx.fillStyle = '#c8e8ff';
    ctx.fillRect(x + 12, y + 7, 3, 1);
    ctx.fillRect(x + 17, y + 7, 3, 1);
  };
  for (let row = 0; row < 4; row += 1) {
    drawFrame(0, row, 0, 0);
    drawFrame(1, row, 3, -1);
    drawFrame(2, row, -1, 3);
  }
  return cv;
}

function buildNpcCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 32;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < 3; i += 1) {
    const x = i * 32; const bob = i === 1 ? -1 : 0;
    ctx.fillStyle = '#1e2a22'; ctx.fillRect(x + 8, 13 + bob, 16, 14);
    ctx.fillStyle = '#3a5040'; ctx.fillRect(x + 9, 14 + bob, 14, 12);
    ctx.fillStyle = '#1e2420'; ctx.fillRect(x + 10, 3 + bob, 12, 11);
    ctx.fillStyle = '#c8b8a0'; ctx.fillRect(x + 11, 4 + bob, 10,  9);
    ctx.fillStyle = '#201c18';
    ctx.fillRect(x + 13, 6 + bob, 2, 2);
    ctx.fillRect(x + 17, 6 + bob, 2, 2);
    ctx.fillStyle = '#2a3828'; ctx.fillRect(x + 10, 3 + bob, 12, 3);
    ctx.fillStyle = '#8a6840'; ctx.fillRect(x + 22, 8 + bob,  2, 18);
  }
  return cv;
}

function buildEnemyCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 32;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < 3; i += 1) {
    const x = i * 32; const p = i === 1 ? -1 : (i === 2 ? 1 : 0);
    ctx.fillStyle = '#1e0e18';
    ctx.fillRect(x + 4,  14 + p, 4, 10);
    ctx.fillRect(x + 24, 14 + p, 4, 10);
    ctx.fillStyle = '#120a10'; ctx.fillRect(x + 6,  8 + p, 20, 18);
    ctx.fillStyle = '#2a1828'; ctx.fillRect(x + 7,  9 + p, 18, 16);
    ctx.fillStyle = '#3c2438'; ctx.fillRect(x + 9,  10 + p, 6,  8);
    ctx.fillStyle = '#1a0e18'; ctx.fillRect(x + 9,  3 + p, 14, 10);
    ctx.fillStyle = '#301828'; ctx.fillRect(x + 10, 4 + p, 12,  8);
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(x + 11, 6 + p, 4, 3);
    ctx.fillRect(x + 17, 6 + p, 4, 3);
    ctx.fillStyle = '#60b8ff';
    ctx.fillRect(x + 12, 7 + p, 2, 1);
    ctx.fillRect(x + 18, 7 + p, 2, 1);
  }
  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.load.tilemapTiledJSON('overworld', 'assets/maps/overworld.json');
    this.load.tilemapTiledJSON('town',      'assets/maps/town.json');
    this.load.tilemapTiledJSON('ruins',     'assets/maps/ruins.json');

    // Load procedural art as data-URLs — goes through Phaser's full image
    // pipeline, which guarantees correct WebGL texture upload on all GPUs.
    this.load.image(ART_KEYS.tiles, buildTileCanvas().toDataURL());
    this.load.spritesheet(ART_KEYS.player, buildPlayerCanvas().toDataURL(), { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet(ART_KEYS.npc,    buildNpcCanvas().toDataURL(),    { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet(ART_KEYS.enemy,  buildEnemyCanvas().toDataURL(),  { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    this.anims.create({ key: 'player-down',  frames: this.anims.generateFrameNumbers(ART_KEYS.player, { frames: [0, 1, 2]   }), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'player-left',  frames: this.anims.generateFrameNumbers(ART_KEYS.player, { frames: [3, 4, 5]   }), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'player-right', frames: this.anims.generateFrameNumbers(ART_KEYS.player, { frames: [6, 7, 8]   }), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'player-up',    frames: this.anims.generateFrameNumbers(ART_KEYS.player, { frames: [9, 10, 11] }), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'npc-idle',     frames: this.anims.generateFrameNumbers(ART_KEYS.npc,    { frames: [0, 1, 2]   }), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'enemy-idle',   frames: this.anims.generateFrameNumbers(ART_KEYS.enemy,  { frames: [0, 1, 2]   }), frameRate: 5, repeat: -1 });

    this.scene.start('OverworldScene');
    this.scene.launch('UIScene');
  }
}

class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    updateHud('Verdant Town');
    bus.on('zone-changed', (zone) => updateHud(zone));
    bus.on('hud-refresh', () => updateHud());

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        if (gameRef) ui.fpsLabel.textContent = `FPS: ${Math.round(gameRef.loop.actualFps)}`;
      },
    });
  }
}

class OverworldScene extends Phaser.Scene {
  constructor() {
    super('OverworldScene');
    this.map = null;
    this.tileset = null;
    this.groundLayer = null;
    this.collisionLayer = null;
    this.player = null;
    this.npcs = [];
    this.warps = [];
    this.encounters = [];
    this.bosses = [];
    this.overlayLocked = false;
    this.interactPressedLast = false;
    this.menuPressedLast = false;
    this.keys = null;
    this.encounterCooldown = 0;
  }

  create() {
    overworldRef = this;
    this.physics.world.setFPS(60);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,I');

    this.player = this.physics.add.sprite(0, 0, leadAvatarKey(), 0).setScale(1.65).setDepth(10);
    this.player.body.setSize(16, 12).setOffset(8, 18);
    this.player.setTint(tintFromLead());

    this.loadMap(STATE.world.mapId, STATE.world.spawnName);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.02);
    this.cameras.main.roundPixels = true;

    bus.on('state-reloaded', () => {
      this.refreshLeadAvatar();
      this.loadMap(STATE.world.mapId, STATE.world.spawnName);
      if (this.player.texture.key === ART_KEYS.player) this.player.anims.play('player-down', true);
    });

    bus.on('lead-changed', () => {
      this.refreshLeadAvatar();
      bus.emit('hud-refresh');
    });

    bus.on('battle-finished', (result) => {
      if (result.victory) grantVictory(result);
      this.scene.resume();
      this.overlayLocked = false;
      this.encounterCooldown = 900;
      bus.emit('hud-refresh');
    });
  }

  refreshLeadAvatar() {
    const key = leadAvatarKey();
    this.player.setTexture(key, 0);
    if (key === LEAD_NORMIE_TEXTURE_KEY) {
      this.player.setScale(1.65);
      this.player.body.setSize(20, 20).setOffset(10, 10);
      this.player.clearTint();
    } else {
      this.player.setScale(2);
      this.player.body.setSize(16, 12).setOffset(8, 18);
      this.player.setTint(tintFromLead());
    }
  }

  zoneFromMap() {
    if (STATE.world.mapId === 'town') return 'Verdant Town';
    if (STATE.world.mapId === 'ruins') return 'Null Ruins';
    return 'Neon Plains';
  }

  clearMapObjects() {
    this.npcs.forEach((n) => n.sprite.destroy());
    this.npcs = [];
    this.warps = [];
    this.encounters = [];
    this.bosses = [];
    this.groundLayer?.destroy();
    this.collisionLayer?.destroy();
    this.map?.destroy();
  }

  loadMap(mapId, spawnName) {
    this.clearMapObjects();

    this.map = this.make.tilemap({ key: mapId });
    this.tileset = this.map.addTilesetImage('generated-tileset', ART_KEYS.tiles, 32, 32, 0, 0, 1);
    if (!this.tileset) {
      console.error('[PixelWar] addTilesetImage returned null — texture key:', ART_KEYS.tiles);
      return;
    }

    this.groundLayer = this.map.createLayer('ground', this.tileset, 0, 0).setScale(2);
    this.collisionLayer = this.map.createLayer('collision', this.tileset, 0, 0).setScale(2).setVisible(false);

    this.collisionLayer.setCollisionByExclusion([0]);
    this.physics.add.collider(this.player, this.collisionLayer);

    this.physics.world.setBounds(0, 0, this.map.widthInPixels * 2, this.map.heightInPixels * 2);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels * 2, this.map.heightInPixels * 2);

    const objects = this.map.getObjectLayer('objects')?.objects || [];
    let spawn = objects.find((o) => o.type === 'spawn' && o.name === spawnName);
    if (!spawn) spawn = objects.find((o) => o.type === 'spawn');
    if (spawn) this.player.setPosition((spawn.x + 16) * 2, (spawn.y + 16) * 2);

    objects.forEach((obj) => {
      if (obj.type === 'npc') {
        const npcId = getObjectProp(obj, 'npcId', 'elder');
        const npcData = NPCS[npcId] || NPCS.elder;
        const spr = this.add.sprite((obj.x + 16) * 2, (obj.y + 16) * 2, ART_KEYS.npc, 0).setScale(2).setDepth(9);
        spr.anims.play('npc-idle', true);
        this.npcs.push({ id: npcId, data: npcData, sprite: spr });
      }
      if (obj.type === 'warp') this.warps.push({ rect: scaleObjRect(obj, 2), targetMap: getObjectProp(obj, 'targetMap', 'overworld'), targetSpawn: getObjectProp(obj, 'targetSpawn', 'spawn_main') });
      if (obj.type === 'encounter') this.encounters.push({ rect: scaleObjRect(obj, 2), chance: Number(getObjectProp(obj, 'chance', 0.1)), tier: Number(getObjectProp(obj, 'tier', 1)) });
      if (obj.type === 'boss') this.bosses.push({ rect: scaleObjRect(obj, 2), bossId: getObjectProp(obj, 'bossId', 'abyss_warden') });
    });

    STATE.world.mapId = mapId;
    STATE.world.spawnName = spawnName;
    bus.emit('zone-changed', this.zoneFromMap());
  }

  movePlayer(delta) {
    const left = this.keys.LEFT.isDown || this.keys.A.isDown;
    const right = this.keys.RIGHT.isDown || this.keys.D.isDown;
    const up = this.keys.UP.isDown || this.keys.W.isDown;
    const down = this.keys.DOWN.isDown || this.keys.S.isDown;

    const sprint = this.keys.SHIFT.isDown ? 1.7 : 1;
    const speed = 172 * sprint;

    let vx = 0;
    let vy = 0;
    if (left) vx -= speed;
    if (right) vx += speed;
    if (up) vy -= speed;
    if (down) vy += speed;
    if (vx !== 0 && vy !== 0) { vx *= 0.72; vy *= 0.72; }

    this.player.body.setVelocity(vx, vy);

    if (this.player.texture.key === ART_KEYS.player) {
      if (vx !== 0 || vy !== 0) {
        if (Math.abs(vx) > Math.abs(vy)) this.player.anims.play(vx < 0 ? 'player-left' : 'player-right', true);
        else this.player.anims.play(vy < 0 ? 'player-up' : 'player-down', true);
      } else this.player.anims.stop();
    } else {
      const pulse = (vx !== 0 || vy !== 0) ? (1.62 + Math.sin(this.time.now / 60) * 0.05) : 1.65;
      this.player.setScale(pulse);

      // Direction-aware body language for static Normie pixel avatar.
      if (vx < -2) this.player.setFlipX(true);
      else if (vx > 2) this.player.setFlipX(false);

      const targetTilt = clamp(vx * 0.0024, -0.14, 0.14);
      this.player.rotation += (targetTilt - this.player.rotation) * 0.18;
      if (Math.abs(vx) < 1 && Math.abs(vy) < 1) this.player.rotation *= 0.78;
    }

    this.npcs.forEach((n) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.sprite.x, n.sprite.y);
      n.sprite.setTint(d < 95 ? 0xd0d0d0 : 0xffffff);
    });

    if (this.encounterCooldown > 0) this.encounterCooldown = Math.max(0, this.encounterCooldown - delta);
  }

  handleInteract() {
    const px = this.player.x;
    const py = this.player.y;

    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(px, py, npc.sprite.x, npc.sprite.y);
      if (d < 94) {
        if (npc.id === 'merchant') {
          showDialogue(npc.data.name, progressionDialogue('merchant'));
          openShop();
          return;
        }

        if (npc.id === 'elder' && STATE.quest.step === 0) STATE.quest.step = 1;
        showDialogue(npc.data.name, progressionDialogue(npc.id));
        bus.emit('hud-refresh');
        return;
      }
    }

    showDialogue('System', 'No interaction target nearby.');
  }

  maybeWarpOrBoss() {
    const px = this.player.x;
    const py = this.player.y;

    for (const warp of this.warps) {
      if (pointInRect(px, py, warp.rect)) {
        this.loadMap(warp.targetMap, warp.targetSpawn);
        return true;
      }
    }

    if (STATE.quest.step >= 3 && !STATE.quest.bossDefeated) {
      for (const boss of this.bosses) {
        if (pointInRect(px, py, boss.rect)) {
          this.startBattle(BOSSES[boss.bossId], 3, true);
          return true;
        }
      }
    }

    return false;
  }

  maybeEncounter() {
    if (this.encounterCooldown > 0) return;

    const px = this.player.x;
    const py = this.player.y;

    for (const zone of this.encounters) {
      if (!pointInRect(px, py, zone.rect)) continue;
      if (Math.random() < zone.chance) this.startBattle(enemyForTier(zone.tier), zone.tier, false);
      return;
    }
  }

  startBattle(enemyBase, tier, isBoss) {
    this.overlayLocked = true;
    this.player.body.setVelocity(0, 0);
    this.scene.launch('BattleScene', { enemyBase, tier, isBoss });
    this.scene.pause();
  }

  update(_, delta) {
    const interactPressed = this.keys.E.isDown;
    const menuPressed = this.keys.I.isDown;

    if (interactPressed && !this.interactPressedLast && !this.overlayLocked) this.handleInteract();
    if (menuPressed && !this.menuPressedLast && !shopOpen && !ui.dialogue.classList.contains('hidden')) hideDialogue();
    else if (menuPressed && !this.menuPressedLast && !this.overlayLocked) openMenu();

    this.interactPressedLast = interactPressed;
    this.menuPressedLast = menuPressed;

    if (this.overlayLocked) return;

    this.movePlayer(delta);
    if (!this.maybeWarpOrBoss()) this.maybeEncounter();
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.state = null;
    this.heroSprite = null;
    this.enemySprite = null;
    this.slashEmitter = null;
  }

  create(data) {
    const levelScale = 1 + (STATE.player.level - 1) * 0.1;
    const enemy = {
      ...data.enemyBase,
      hp: Math.floor(data.enemyBase.hp * levelScale),
      maxHp: Math.floor(data.enemyBase.hp * levelScale),
      atk: Math.floor(data.enemyBase.atk * (1 + (STATE.player.level - 1) * 0.06)),
    };

    this.state = {
      enemy,
      heroHp: STATE.player.hp,
      tier: data.tier,
      isBoss: data.isBoss,
      round: 1,
      locked: false,
      over: false,
    };

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x04090b, 0.42);

    const heroKey = leadAvatarKey();
    this.heroSprite = this.add.sprite(w * 0.28, h * 0.55, heroKey, 0).setScale(heroKey === LEAD_NORMIE_TEXTURE_KEY ? 3.2 : 4.2).setDepth(2);
    if (heroKey === ART_KEYS.player) {
      this.heroSprite.anims.play('player-right', true);
      this.heroSprite.setTint(tintFromLead());
    } else {
      this.heroSprite.clearTint();
      this.tweens.add({ targets: this.heroSprite, y: this.heroSprite.y - 4, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    this.enemySprite = this.add.sprite(w * 0.72, h * 0.43, ART_KEYS.enemy, 0).setScale(4.7).setDepth(2);
    this.enemySprite.anims.play('enemy-idle', true);
    this.enemySprite.setTint(enemy.color || 0xffffff);

    this.slashEmitter = this.add.particles(0, 0, ART_KEYS.enemy, {
      frame: 1,
      lifespan: 280,
      speed: { min: 80, max: 190 },
      scale: { start: 0.18, end: 0 },
      quantity: 0,
      frequency: -1,
      emitting: false,
    });

    ui.battle.classList.remove('hidden');
    ui.battleEnemyName.textContent = enemy.name;
    ui.battleRound.textContent = 'Round 1';
    ui.battleLog.innerHTML = '';
    addBattleLog(`${enemy.name} emerged from the shard storm.`);
    addBattleLog('Choose your action.');

    this.bindButtons();
    this.renderBars();
    setOverlayLock(true);
  }

  bindButtons() {
    ui.btnAttack.onclick = () => this.playerAction('attack');
    ui.btnSkill.onclick = () => this.playerAction('skill');
    ui.btnPotion.onclick = () => this.playerAction('potion');
    ui.btnFlee.onclick = () => this.playerAction('flee');
  }

  renderBars() {
    ui.battleHeroHp.style.width = `${clamp((this.state.heroHp / maxHp()) * 100, 0, 100)}%`;
    ui.battleEnemyHp.style.width = `${clamp((this.state.enemy.hp / this.state.enemy.maxHp) * 100, 0, 100)}%`;
  }

  animateHit(target, crit = false) {
    this.tweens.add({ targets: target, x: target.x + (target === this.enemySprite ? -20 : 20), duration: 80, yoyo: true, ease: 'Quad.out' });
    this.cameras.main.shake(130, crit ? 0.012 : 0.006);
    this.cameras.main.flash(90, 255, 255, 255, false);
    if (target === this.enemySprite) this.slashEmitter.emitParticleAt(target.x, target.y, crit ? 16 : 8);
  }

  playerAction(type) {
    if (this.state.locked || this.state.over) return;

    if (type === 'flee' && this.state.isBoss) {
      addBattleLog('Cannot flee a boss encounter.');
      return;
    }

    if (type === 'flee') {
      this.state.locked = true;
      if (Math.random() < 0.78) {
        addBattleLog('Escape successful.');
        this.finishBattle(false);
      } else {
        addBattleLog('Escape failed.');
        this.time.delayedCall(360, () => this.enemyTurn());
      }
      return;
    }

    if (type === 'potion') {
      if (STATE.player.potions <= 0) {
        addBattleLog('No potions left.');
        return;
      }
      this.state.locked = true;
      STATE.player.potions -= 1;
      const heal = Math.floor(maxHp() * ITEMS.potion.healPct);
      this.state.heroHp = clamp(this.state.heroHp + heal, 0, maxHp());
      STATE.player.hp = this.state.heroHp;
      addBattleLog(`Potion restores ${heal} HP.`);
      this.renderBars();
      this.time.delayedCall(380, () => this.enemyTurn());
      return;
    }

    const base = type === 'skill' ? skillValue() : atkValue();
    const crit = Math.random() < (type === 'skill' ? clamp(STATE.player.crit + 0.08, 0.08, 0.35) : STATE.player.crit);
    const damage = randInt(Math.floor(base * 0.85), Math.floor(base * 1.2)) * (crit ? 2 : 1);

    this.state.enemy.hp = clamp(this.state.enemy.hp - damage, 0, this.state.enemy.maxHp);
    this.animateHit(this.enemySprite, crit);
    addBattleLog(`${type === 'skill' ? 'Photon Slash' : 'Attack'} for ${damage}${crit ? ' (CRIT)' : ''}.`);
    this.renderBars();

    if (this.state.enemy.hp <= 0) {
      this.state.over = true;
      const reward = {
        victory: true,
        tier: this.state.tier,
        isBoss: this.state.isBoss,
        gold: randInt(this.state.enemy.goldMin, this.state.enemy.goldMax),
        exp: this.state.enemy.exp,
      };
      addBattleLog(`${this.state.enemy.name} defeated. +${reward.gold}G +${reward.exp} EXP.`);
      this.time.delayedCall(640, () => this.finishBattle(true, reward));
      return;
    }

    this.state.locked = true;
    this.time.delayedCall(460, () => this.enemyTurn());
  }

  enemyTurn() {
    if (this.state.over) return;

    const crit = Math.random() < 0.1;
    const damage = randInt(Math.floor(this.state.enemy.atk * 0.88), Math.floor(this.state.enemy.atk * 1.2)) * (crit ? 2 : 1);
    this.state.heroHp = clamp(this.state.heroHp - damage, 0, maxHp());
    STATE.player.hp = this.state.heroHp;

    this.animateHit(this.heroSprite, crit);
    addBattleLog(`${this.state.enemy.name} hits for ${damage}${crit ? ' (CRIT)' : ''}.`);
    this.renderBars();

    if (this.state.heroHp <= 0) {
      this.state.over = true;
      addBattleLog('Defeat. Recovery protocol restored you to 55% HP.');
      STATE.player.hp = Math.floor(maxHp() * 0.55);
      this.time.delayedCall(700, () => this.finishBattle(false));
      return;
    }

    this.state.round += 1;
    ui.battleRound.textContent = `Round ${this.state.round}`;
    this.state.locked = false;
  }

  finishBattle(victory, reward = null) {
    ui.battle.classList.add('hidden');
    this.scene.stop();
    bus.emit('battle-finished', reward || { victory, tier: this.state.tier, isBoss: this.state.isBoss, gold: 0, exp: 0 });
  }
}

async function hydrateDemoParty() {
  updateWalletStatus('Loading demo Normies...');
  const normies = await loadDemoNormies();
  STATE.party.roster = normies.slice(0, 5);
  STATE.party.leadId = STATE.party.roster[0]?.id || null;
  STATE.identity.mode = 'demo';
  STATE.identity.walletAddress = null;
  STATE.identity.walletName = 'Demo';
  applyLeadNormieStats();
  buildLeadNormieTexture();
  bus.emit('state-reloaded');
  updateWalletStatus();
  updateHud();
}

async function hydrateWalletParty(providerId = null) {
  updateWalletStatus('Connecting wallet...');
  setLaunchStatus('Connecting wallet...');
  try {
    const { provider, address, walletName } = await connectWallet(providerId);
    updateWalletStatus('Loading owned Normies...');
    setLaunchStatus('Loading owned Normies...');
    const owned = await loadWalletNormies(address, provider);

    if (!owned.length) {
      showDialogue('Wallet', 'No Normies found in wallet. Switching to demo party for now.');
      await hydrateDemoParty();
      exitLaunchOverlay();
      return;
    }

    STATE.party.roster = owned.slice(0, 5);
    STATE.party.leadId = STATE.party.roster[0].id;
    STATE.identity.mode = 'wallet';
    STATE.identity.walletAddress = address;
    STATE.identity.walletName = walletName;
    applyLeadNormieStats();
    buildLeadNormieTexture();
    updateWalletStatus();
    setLaunchStatus(`Connected ${walletName}: ${shortAddr(address)}.`);
    updateHud();
    bus.emit('state-reloaded');
    exitLaunchOverlay();

    // Auto attempt load from wallet slot so progression follows wallet identity.
    await loadCloud();
  } catch (err) {
    const message = walletErrorMessage(err);
    updateWalletStatus(message);
    setLaunchStatus(message);
  }
}

async function launchDemoMode() {
  setLaunchStatus('Loading demo party...');
  await hydrateDemoParty();
  exitLaunchOverlay();
}

ui.dialogueClose.addEventListener('click', hideDialogue);
ui.menuClose.addEventListener('click', closeMenu);
ui.shopClose.addEventListener('click', closeShop);
ui.btnSaveCloud.addEventListener('click', saveCloud);
ui.btnLoadCloud.addEventListener('click', loadCloud);
ui.walletConnect.addEventListener('click', hydrateWalletParty);
ui.walletDemo.addEventListener('click', hydrateDemoParty);
ui.walletRefresh?.addEventListener('click', renderWalletChoices);
ui.launchWallet?.addEventListener('click', () => hydrateWalletParty(selectedWalletId));
ui.launchDemo?.addEventListener('click', launchDemoMode);
ui.themeToggle?.addEventListener('click', toggleUiTheme);
ui.launchThemeToggle?.addEventListener('click', toggleUiTheme);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!ui.dialogue.classList.contains('hidden')) hideDialogue();
    else if (menuOpen) closeMenu();
    else if (shopOpen) closeShop();
  }
});

gameRef = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#111110',
  scene: [BootScene, OverworldScene, BattleScene, UIScene],
  physics: { default: 'arcade', arcade: { debug: false } },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
});

window.addEventListener('resize', () => {
  if (gameRef) gameRef.scale.resize(window.innerWidth, window.innerHeight);
});

initUiTheme();
renderWalletChoices();
updateHud('Verdant Town');
