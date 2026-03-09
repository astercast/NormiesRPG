import Phaser from 'phaser';
import { connectWallet, loadWalletNormies, loadDemoNormies, detectWallets } from './wallet.js';
import { makeDemoNormie, fetchNormieFull } from './normie-api.js';
import {
  CHAPTERS, COMPANIONS, DIALOGUES,
  freshAffinity, freshFlags, gainAffinity, loseAffinity, totalAffinity, isAwakened,
  calculateEnding, activeCompanionBonus, dialogueForNpc,
} from './story.js';

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
    chapter: 1,
    kills: 0,
    eliteKills: 0,
    bossDefeated: false,
    caveCleared: false,
    voidCommanderDefeated: false,
    affinity: freshAffinity(),
    flags: freshFlags(),
    companions: {
      grom:   { recruited: false },
      slyx:   { recruited: false },
      lumina: { recruited: false },
      elara:  { recruited: false },
    },
    storyFlags: {},
  },
  meta: {
    wins: 0,
    noLootStreak: 0,
  },
};

const ui = {
  normieSelectScreen: document.getElementById('normie-select-screen'),
  normieSelectGrid: document.getElementById('normie-select-grid'),
  normieSelectStatus: document.getElementById('normie-select-status'),
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
  questBanner: document.getElementById('quest-text'),
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
  battleCard: document.querySelector('.battle-card'),
  toastContainer: document.getElementById('toast-container'),
  btnAttack: document.getElementById('btn-attack'),
  btnSkill: document.getElementById('btn-skill'),
  btnPotion: document.getElementById('btn-potion'),
  btnFlee: document.getElementById('btn-flee'),
  menu: document.getElementById('menu'),
  menuBody: document.getElementById('menu-body'),
  partyBody: document.getElementById('party-body'),
  menuClose: document.getElementById('menu-close'),
  equipSlots: document.getElementById('equip-slots'),
  statsBody: document.getElementById('stats-body'),
  shop: document.getElementById('shop'),
  shopBody: document.getElementById('shop-body'),
  shopClose: document.getElementById('shop-close'),
  btnSaveCloud: document.getElementById('btn-save-cloud'),
  btnLoadCloud: document.getElementById('btn-load-cloud'),
  saveStatus: document.getElementById('save-status'),
};

// ── Tab wiring (runs once DOM is ready) ──────────────────────────
(function wireMenuTabs() {
  const tabs  = document.querySelectorAll('.inv-tab');
  const panes = document.querySelectorAll('.inv-pane');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t)  => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      panes.forEach((p) => p.classList.add('hidden'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      document.getElementById(`tab-pane-${tab.dataset.tab}`)?.classList.remove('hidden');
      if (tab.dataset.tab === 'stats')  renderStatsTab();
      if (tab.dataset.tab === 'party')  renderPartyMenu();
    });
  });
})();

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

/**
 * Renders a Normie pixel-string onto a canvas using flood-fill exterior detection
 * so the full body is correctly filled (not just a 1px ring inside the outline).
 * @param {string} pixels  40×40 bitmap string of '0'/'1'
 * @param {number} size    output pixel size (should be a multiple of 40)
 * @returns {HTMLCanvasElement}
 */
function buildNormiePortraitCanvas(pixels, size) {
  const S = Math.max(1, Math.round((size || 120) / 40));
  const W = 40, H = 40;
  const cv = document.createElement('canvas');
  cv.width = W * S; cv.height = H * S;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  const px = typeof pixels === 'string' ? pixels : '';
  if (px.length >= 1600) {
    // BFS flood-fill from border edge-cells to find exterior (background) region
    const outside = new Uint8Array(W * H);
    const queue = [];
    let qh = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if ((y === 0 || y === H - 1 || x === 0 || x === W - 1) && px[y * W + x] !== '1') {
          outside[y * W + x] = 1;
          queue.push(y * W + x);
        }
      }
    }
    while (qh < queue.length) {
      const idx = queue[qh++];
      const iy = Math.floor(idx / W), ix = idx % W;
      for (let d = 0; d < 4; d++) {
        const nx = ix + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = iy + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const ni = ny * W + nx;
        if (outside[ni] || px[ni] === '1') continue;
        outside[ni] = 1;
        queue.push(ni);
      }
    }
    // Interior '0' pixels = body fill
    ctx.fillStyle = '#d8d8d8';
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (px[y * W + x] !== '1' && !outside[y * W + x])
          ctx.fillRect(x * S, y * S, S, S);
    // '1' pixels = dark outline / details
    ctx.fillStyle = '#111111';
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (px[y * W + x] === '1') ctx.fillRect(x * S, y * S, S, S);
  }
  return cv;
}

function buildLeadNormieTexture() {
  return new Promise((resolve) => {
    if (!gameRef) { resolve(false); return; }
    const lead = leadNormie();
    const px = lead?.pixels || '';
    if (!px || px.length < 1600) { resolve(false); return; }
    const cv = buildNormiePortraitCanvas(px, 120); // 40 × 3 = 120×120
    const img = new Image();
    img.onload = () => {
      if (!gameRef) { resolve(false); return; }
      if (gameRef.textures.exists(LEAD_NORMIE_TEXTURE_KEY))
        gameRef.textures.remove(LEAD_NORMIE_TEXTURE_KEY);
      gameRef.textures.addImage(LEAD_NORMIE_TEXTURE_KEY, img);
      if (overworldRef) overworldRef.refreshLeadAvatar();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = cv.toDataURL();
  });
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
  const q = STATE.quest;
  const ch = Math.min(q.chapter - 1, CHAPTERS.length - 1);
  return CHAPTERS[ch].questText(q);
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
  applyUiTheme(saved || 'light');
}

function walletErrorMessage(err) {
  const code = err?.message || 'UNKNOWN_ERROR';
  if (code === 'NO_WALLET') return 'No browser wallet detected. Install MetaMask/Coinbase/Rabby or use Demo Mode.';
  if (code === 'USER_REJECTED') return 'Wallet request was rejected. Approve the connection prompt to continue.';
  if (code === 'WALLET_PROVIDER_UNAVAILABLE') return 'Selected wallet provider is unavailable. Refresh wallet list and try again.';
  return `Wallet connect failed: ${code}`;
}

// ── Wallet modal ──────────────────────────────────────────────
function openWalletModal() {
  detectedWallets = detectWallets();
  const modal = document.getElementById('wallet-modal');
  const grid  = document.getElementById('wallet-modal-grid');
  const err   = document.getElementById('wallet-modal-error');
  if (!modal || !grid) return;
  err.textContent = '';

  const ALL_WALLETS = [
    { id: 'metamask',  name: 'MetaMask',        icon: '🦊', detect: () => !!window.ethereum?.isMetaMask },
    { id: 'coinbase',  name: 'Coinbase Wallet',  icon: '🔵', detect: () => !!window.ethereum?.isCoinbaseWallet },
    { id: 'rabby',     name: 'Rabby',            icon: '🐰', detect: () => !!window.ethereum?.isRabby },
    { id: 'brave',     name: 'Brave Wallet',     icon: '🦁', detect: () => !!window.ethereum?.isBraveWallet },
    { id: 'injected',  name: 'Browser Wallet',   icon: '🌐', detect: () => !!window.ethereum },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', detect: () => false },
  ];

  grid.innerHTML = '';
  ALL_WALLETS.forEach((w) => {
    const available = detectedWallets.some((d) => d.id === w.id) || w.detect();
    const btn = document.createElement('button');
    btn.className = 'wm-option' + (available ? '' : ' wm-unavailable');
    btn.type = 'button';
    btn.innerHTML = `<span class="wm-icon">${w.icon}</span><span class="wm-name">${w.name}</span>${available ? '' : '<span class="wm-tag">Not installed</span>'}`;
    btn.addEventListener('click', async () => {
      if (!available) {
        err.textContent = `${w.name} is not installed in this browser.`;
        return;
      }
      err.textContent = 'Connecting...';
      closeWalletModal();
      await hydrateWalletParty(w.id);
    });
    grid.appendChild(btn);
  });

  modal.classList.remove('hidden');
}

function closeWalletModal() {
  document.getElementById('wallet-modal')?.classList.add('hidden');
}

function renderWalletChoices() {
  // Legacy — kept for compatibility but wallet flow now uses openWalletModal()
  detectedWallets = detectWallets();
  if (ui.launchWallet) ui.launchWallet.disabled = false;
}

function exitLaunchOverlay() {
  document.body.classList.remove('prelaunch');
  ui.launchOverlay?.classList.add('hidden');
}

function updateHud(zone = null) {
  if (zone) ui.zoneLabel.textContent = zone;

  const lead = leadNormie();
  ui.leadLabel.textContent = lead ? lead.name.replace(/^Normie /, '#') : 'Rookie';
  ui.goldLabel.textContent = String(STATE.player.gold);
  const hp = Math.max(0, Math.floor(STATE.player.hp));
  const mhp = maxHp();
  ui.hpLabel.textContent = `${hp}/${mhp}`;
  ui.potionsLabel.textContent = String(STATE.player.potions);
  ui.eqLabel.textContent = equippedBonus().label;
  ui.questBanner.textContent = questText();
  // HP color-coding
  const hpPct = hp / mhp;
  const hpStat = ui.hpLabel.closest?.('.hud-stat');
  if (hpStat) hpStat.dataset.hpState = hpPct < 0.30 ? 'low' : hpPct < 0.60 ? 'mid' : 'high';
}

function addBattleLog(text) {
  const row = document.createElement('div');
  row.textContent = text;
  if (/CRIT/i.test(text))                   row.classList.add('log-crit');
  else if (/defeated|escaped|legend/i.test(text)) row.classList.add('log-win');
  else if (/restores|heal/i.test(text))     row.classList.add('log-heal');
  else if (/hits for|emerges/i.test(text))  row.classList.add('log-dmg');
  ui.battleLog.appendChild(row);
  ui.battleLog.scrollTop = ui.battleLog.scrollHeight;
}

function showToast(msg, type = 'info') {
  if (!ui.toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  ui.toastContainer.appendChild(el);
  const remove = () => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  setTimeout(remove, 2600);
}

function setOverlayLock(locked) {
  if (overworldRef) overworldRef.overlayLocked = locked;
}

function showDialogue(name, text) {
  ui.dialogueName.textContent = name;
  ui.dialogueText.textContent = text;
  // Remove any existing choice buttons
  const existing = ui.dialogue.querySelector('.dialogue-choices');
  if (existing) existing.remove();
  ui.dialogue.classList.remove('hidden');
  setOverlayLock(true);
}

function hideDialogue() {
  const choiceEl = ui.dialogue.querySelector('.dialogue-choices');
  if (choiceEl) choiceEl.remove();
  ui.dialogue.classList.add('hidden');
  if (!menuOpen && !shopOpen) setOverlayLock(false);
}

/**
 * Display a branching dialogue from story.js DIALOGUES.
 * Handles multi-line sequences and choice trees.
 * @param {string} dialogueId
 * @param {function} [onDone]  callback when fully completed
 */
function showBranchingDialogue(dialogueId, onDone) {
  const entry = DIALOGUES[dialogueId];
  if (!entry) {
    if (onDone) onDone();
    return;
  }

  const q = STATE.quest;
  let lineIdx = 0;

  function showLine() {
    const line = entry.lines[lineIdx];
    ui.dialogueName.textContent = entry.name;
    ui.dialogueText.textContent = line;
    const existing = ui.dialogue.querySelector('.dialogue-choices');
    if (existing) existing.remove();
    ui.dialogue.classList.remove('hidden');
    setOverlayLock(true);

    const isLast = lineIdx >= entry.lines.length - 1;
    if (isLast && entry.choices?.length) {
      // Build choice buttons instead of showing the close button
      const wrap = document.createElement('div');
      wrap.className = 'dialogue-choices';
      entry.choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-choice-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => {
          // Apply affinity delta
          if (choice.affinityDelta) {
            gainAffinity(q.affinity, choice.affinityDelta.who, choice.affinityDelta.val);
          }
          // Apply flag sets
          if (choice.flags) {
            Object.assign(q.flags, choice.flags);
            // Auto-recruit companion if flag set
            const recruitMap = { gromRecruited:'grom', slyxRecruited:'slyx', luminaRecruited:'lumina', elaraRecruited:'elara' };
            for (const [flag, cid] of Object.entries(recruitMap)) {
              if (choice.flags[flag]) recruitCompanion(cid);
            }
          }
          wrap.remove();
          hideDialogue();
          if (choice.next) {
            showBranchingDialogue(choice.next, onDone);
          } else {
            if (onDone) onDone();
          }
        });
        wrap.appendChild(btn);
      });
      ui.dialogue.appendChild(wrap);
    } else {
      // Normal next-line or close
      ui.dialogueClose.onclick = () => {
        lineIdx++;
        if (lineIdx < entry.lines.length) {
          showLine();
        } else {
          ui.dialogueClose.onclick = ui.dialogueClose._defaultClose;
          hideDialogue();
          if (onDone) onDone();
        }
      };
    }
  }

  // Stash real close handler
  if (!ui.dialogueClose._defaultClose) {
    ui.dialogueClose._defaultClose = () => hideDialogue();
  }

  showLine();
}

/**
 * Recruit a companion: mark recruited in STATE, add stat bonuses.
 * @param {string} companionId
 */
function recruitCompanion(companionId) {
  const c = COMPANIONS[companionId];
  if (!c) return;
  const cState = STATE.quest.companions[companionId];
  if (!cState || cState.recruited) return;
  cState.recruited = true;
  // Apply permanent stat bonuses
  STATE.player.baseHp    += c.hpBonus;
  STATE.player.baseAtk   += c.atkBonus;
  STATE.player.baseSkill += c.skillBonus;
  STATE.player.hp = Math.min(STATE.player.hp + c.hpBonus, maxHp());
  showToast(`${c.name} joined the party!`, 'reward');
  updateHud();
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

  // Hydrate new fields that may be missing in older saves
  STATE.quest.chapter          = STATE.quest.chapter          ?? 1;
  STATE.quest.caveCleared      = STATE.quest.caveCleared      ?? false;
  STATE.quest.voidCommanderDefeated = STATE.quest.voidCommanderDefeated ?? false;
  STATE.quest.affinity         = STATE.quest.affinity         ?? freshAffinity();
  STATE.quest.flags            = STATE.quest.flags            ?? freshFlags();
  STATE.quest.companions       = STATE.quest.companions       ?? {
    grom:   { recruited: false },
    slyx:   { recruited: false },
    lumina: { recruited: false },
    elara:  { recruited: false },
  };

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

  STATE.party.roster.forEach((n) => {
    const isLead = lead?.id === n.id;
    const portrait = buildNormiePortraitCanvas(n.pixels || '', 40).toDataURL();
    const skills = [n.sk1, n.sk2, n.sk3].filter(Boolean).join(' / ') || '—';
    const extras = [n.expression, n.accessory !== 'No Accessories' ? n.accessory : null].filter(Boolean).join(' · ');
    rows.push(`
      <div class="party-card${isLead ? ' party-card--lead' : ''}">
        <img src="${portrait}" width="40" height="40" class="nc-portrait" alt="${n.name}">
        <div class="party-card-info">
          <div class="party-card-name">${n.name}${isLead ? ' <span class="party-card-badge">LEAD</span>' : ''}</div>
          <div class="party-card-sub">${n.type}${extras ? ' &middot; ' + extras : ''}</div>
          <div class="party-card-sub">HP&thinsp;${n.maxHp} &middot; ATK&thinsp;${n.atkBasic} &middot; SKL&thinsp;${n.atkSkill} &middot; CRIT&thinsp;${Math.round((n.crit||0)*100)}%</div>
          <div class="party-card-sub">${skills}</div>
        </div>
        ${!isLead ? `<button class="party-set-lead" data-lead="${n.id}">Lead</button>` : ''}
      </div>`);
  });

  for (let i = STATE.party.roster.length; i < 5; i++) {
    rows.push(`<div class="party-slot-empty">Slot ${i + 1} — empty &middot; recruit companions in-world</div>`);
  }

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

function renderStatsTab() {
  const p = STATE.player;
  const expPct = Math.min((p.exp / p.expToLevel) * 100, 100).toFixed(1);
  const blocks = [
    { label: 'LEVEL',   val: p.level,        sub: `${p.exp} / ${p.expToLevel} EXP` },
    { label: 'MAX HP',  val: maxHp(),         sub: `Base ${p.baseHp} + gear` },
    { label: 'ATTACK',  val: atkValue(),      sub: `Base ${p.baseAtk} + gear` },
    { label: 'SKILL',   val: skillValue(),    sub: `Base ${p.baseSkill} + gear` },
    { label: 'GOLD',    val: p.gold,          sub: `Potions: ${p.potions}` },
    { label: 'CRIT %',  val: `${Math.round(p.crit*100)}%`, sub: 'Natural crit rate' },
  ];
  const blockHtml = blocks.map(b => `
    <div class="stat-block">
      <div class="stat-block-label">${b.label}</div>
      <div class="stat-block-val">${b.val}</div>
      <div class="stat-block-sub">${b.sub}</div>
    </div>`).join('');
  const expBar = `
    <div class="exp-bar-wrap">
      <div class="exp-bar-header"><span>EXPERIENCE</span><span>${p.exp} / ${p.expToLevel}</span></div>
      <div class="exp-bar-track"><div class="exp-bar-fill" style="width:${expPct}%"></div></div>
    </div>`;
  if (ui.statsBody) ui.statsBody.innerHTML = blockHtml + expBar;
}

function renderInventoryMenu() {
  const p  = STATE.player;
  const eq = p.equipment;

  // ── Equipped slots ──────────────────────────────────────────
  const SLOT_ICONS = { weapon: '&#9876;', armor: '&#9673;', relic: '&#10022;' };
  const slotHtml = ['weapon','armor','relic'].map((slot) => {
    const item = itemById(eq[slot]);
    const isEmpty = !item;
    return `
      <div class="equip-slot${isEmpty ? ' equip-slot-empty' : ''}">
        <span class="equip-slot-type">${SLOT_ICONS[slot]} ${slot}</span>
        <span class="equip-slot-name">${item ? item.name : 'Empty'}</span>
        <span class="equip-slot-stats">${item ? `ATK+${item.atk||0} HP+${item.hp||0}` : '–'}</span>
      </div>`;
  }).join('');
  if (ui.equipSlots) ui.equipSlots.innerHTML = slotHtml;

  // ── Backpack ───────────────────────────────────────────────
  const body = [];

  if (!p.inventoryGear.length) {
    body.push('<div class="inv-empty">Backpack empty &mdash; loot drops after battles.</div>');
  } else {
    p.inventoryGear.forEach((id, idx) => {
      const it = itemById(id);
      if (!it) return;
      const sub = `${it.slot?.toUpperCase() || 'ITEM'} &nbsp;&middot;&nbsp; ATK+${it.atk||0} HP+${it.hp||0} SKL+${it.skill||0}`;
      body.push(`
        <div class="inv-row">
          <div class="inv-row-icon">${SLOT_ICONS[it.slot] || '&#9670;'}</div>
          <div class="inv-row-info">
            <div class="inv-row-name">${it.name}</div>
            <div class="inv-row-sub">${sub}</div>
          </div>
          <button class="inv-row-action" data-equip="${idx}">Equip</button>
        </div>`);
    });
  }

  ui.menuBody.innerHTML = body.join('');
  ui.menuBody.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx  = Number(btn.dataset.equip);
      const id   = STATE.player.inventoryGear[idx];
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
  // Reset to gear tab each open
  document.querySelectorAll('.inv-tab').forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.inv-pane').forEach((p) => p.classList.add('hidden'));
  const gearTab  = document.getElementById('tab-gear');
  const gearPane = document.getElementById('tab-pane-gear');
  if (gearTab)  { gearTab.classList.add('active');    gearTab.setAttribute('aria-selected','true'); }
  if (gearPane) gearPane.classList.remove('hidden');

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
  const SHOP_ICONS = { weapon:'&#9876;', armor:'&#9673;', relic:'&#10022;', consumable:'&#10084;' };

  body.push(`
    <div class="shop-gold-bar">
      <span>Your Gold</span>
      <strong>${STATE.player.gold}G</strong>
    </div>`);

  SHOP_STOCK.forEach((id) => {
    const item = itemById(id);
    const stats = item.kind === 'consumable'
      ? `Heal ${Math.floor(item.healPct * 100)}%`
      : `ATK+${item.atk||0} HP+${item.hp||0} SKL+${item.skill||0}`;
    const icon = SHOP_ICONS[item.kind] || SHOP_ICONS[item.slot] || '&#9670;';
    body.push(`
      <div class="shop-row">
        <div class="shop-row-icon">${icon}</div>
        <div class="shop-row-info">
          <div class="shop-row-name">${item.name}</div>
          <div class="shop-row-sub">${item.kind?.toUpperCase() || item.slot?.toUpperCase()} &nbsp;&middot;&nbsp; ${stats}</div>
        </div>
        <div class="shop-row-price">
          <span class="shop-gold-tag">${item.price}G</span>
          <button class="shop-buy-btn" data-buy="${id}">Buy</button>
        </div>
      </div>`);
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
  // Companion NPCs always use branching dialogue
  const companionIds = ['grom', 'slyx', 'lumina', 'elara'];
  if (companionIds.includes(npcId)) {
    const dlgId = dialogueForNpc(npcId, q, q.flags);
    if (dlgId) showBranchingDialogue(dlgId);
    return null; // caller should not call showDialogue when null returned
  }

  // Rich dialogue for story NPCs
  const dlgOverride = dialogueForNpc(npcId, q, q.flags);
  if (dlgOverride) {
    showBranchingDialogue(dlgOverride);
    return null;
  }

  // Fallback text for elder, scout, smith, merchant
  if (npcId === 'elder') {
    if (q.step === 0) {
      // Trigger full elder dialogue on first meet
      STATE.quest.step = 1;
      showBranchingDialogue('elder_first_meet');
      return null;
    }
    if (q.chapter < 3) return 'Keep fighting, Normie. The void loses ground one pixel at a time.';
    if (q.chapter === 3) return 'The Cave of First Bits holds the Render Key. The Guardian blocks your path.';
    if (q.chapter === 4) return 'Beyond the cave — the Corrupted Lands and the Void Commander.';
    return 'You stand at the edge of legend. The Citadel awaits. End NULLBYTE.';
  }
  if (npcId === 'scout') {
    if (q.chapter < 2) return 'Void scouts patrol the eastern fields. Stay mobile and hit fast.';
    if (q.chapter === 2) return 'Elite void units are in the Dark Margins. Hit hard or they regenerate.';
    return 'Beyond the cave is void country proper. The Commander is brutal — Elara\'s healing mandatory.';
  }
  if (npcId === 'smith' || npcId === 'blacksmith') {
    return 'New weapon stocks arrived from the last clear-team raid. Gear up before the cave.';
  }
  return 'Trade fast, travel faster. The void doesn\'t wait for negotiations.';
}

function grantVictory(data) {
  const p = STATE.player;
  const q = STATE.quest;
  p.gold += data.gold;
  p.exp += data.exp;
  STATE.meta.wins += 1;

  if (!data.isBoss) {
    q.kills += 1;
    if (data.tier >= 2) q.eliteKills += 1;
    // Affinity boost for every combat win with a companion present
    const recruited = Object.entries(q.companions).filter(([, c]) => c.recruited).map(([id]) => id);
    recruited.forEach((id) => gainAffinity(q.affinity, id, 2));
  }

  // ── Chapter progression — Pixel War arc ────────────────────────
  // Ch.I → Ch.II: defeat 2 wild enemies
  if (q.chapter === 1 && q.kills >= 2) {
    q.chapter = 2;
    q.step = 2;
    p.gold += 35;
    p.potions += 1;
    showDialogue('The Pixel War — Ch.II', 'The Render Fields hold for now. Seek allies in the static. Grom is somewhere in the Dark Margins.');
  }

  // Ch.II → Ch.III: defeat 1 elite unit
  if (q.chapter === 2 && q.eliteKills >= 1) {
    q.chapter = 3;
    q.step = 3;
    p.gold += 60;
    showDialogue('The Pixel War — Ch.III', 'Elite void unit destroyed. The Cave of First Bits lies ahead. Find the Render Key.');
  }

  // Cave cleared (boss tier 3 in cave map context)
  if (data.isBoss && q.chapter === 3 && !q.caveCleared) {
    q.caveCleared = true;
    q.chapter = 4;
    q.step = 4;
    q.flags.caveCleared = true;
    q.flags.renderKeyObtained = true;
    p.gold += 90;
    p.potions += 2;
    showDialogue('The Pixel War — Ch.IV', 'Cave Guardian defeated. The Render Key is yours. The Corrupted Lands stretch beyond.');
  }

  // Void Commander down
  if (data.isBoss && q.chapter === 4 && !q.voidCommanderDefeated) {
    q.voidCommanderDefeated = true;
    q.chapter = 5;
    q.step = 5;
    q.flags.voidCommanderDefeated = true;
    p.gold += 110;
    showDialogue('The Pixel War — Ch.V', 'Void Commander defeated. The Citadel gates are open. NULLBYTE awaits at the core.');
  }

  // Final boss — NULLBYTE
  if (data.isBoss && q.chapter === 5 && !q.bossDefeated) {
    q.bossDefeated = true;
    q.flags.nullbyteConfronted = true;
    q.totalAffinity = totalAffinity(q.affinity);
    p.gold += 200;
    const ending = calculateEnding(q.affinity);
    // Show the right ending dialogue
    const endingDlgId = ending === 'true' ? 'ending_true' : ending === 'normal' ? 'ending_normal' : 'ending_bad';
    showBranchingDialogue(endingDlgId);
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
    showToast(`LEVEL ${p.level}`, 'levelup');
    showDialogue('Level Up', `Lv.${p.level} reached. Build growth applied and +1 potion granted.`);
  }

  // Keep friction low: partial heal after each non-boss victory.
  if (!data.isBoss) p.hp = clamp(p.hp + Math.floor(maxHp() * 0.18), 1, maxHp());

  showToast(`+${data.gold}G  +${data.exp} EXP`, 'reward');

  const drop = dropLootForTier(data.tier);
  if (drop) {
    addGearToInventory(drop);
    showToast(itemById(drop).name, 'loot');
    showDialogue('Loot', `${itemById(drop).name} dropped. Open inventory (I) to equip it.`);
  }

  updateHud();
}

function tintFromLead() {
  const lead = leadNormie();
  return partyTintByType(lead?.type);
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE CONSTANTS — indices into the buildRpgTileset() 8×8 (16 px) atlas.
// TID.WALL (3) is the ONLY collision tile — setCollisionBetween(3,3).
// ─────────────────────────────────────────────────────────────────────────────
const TID = { VOID: 0, GRASS: 1, PATH: 2, WALL: 3, FLOOR: 4, DARK: 5, RUINS: 6, WATER: 7 };

function fillBlock(map, x1, y1, x2, y2, wallId, inId) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      map[y][x] = (y === y1 || y === y2 || x === x1 || x === x2) ? wallId : inId;
}

function buildTownMap() {
  const W = 36, H = 30;
  const map = Array.from({ length: H }, () => Array(W).fill(TID.FLOOR));
  for (let x = 0; x < W; x++) { map[0][x] = TID.WALL; map[H-1][x] = TID.WALL; }
  for (let y = 0; y < H; y++) { map[y][0] = TID.WALL; map[y][W-1] = TID.WALL; }
  for (let x = 15; x <= 20; x++) map[H-1][x] = TID.PATH; // south exit gap
  for (let x = 1; x < W-1; x++) { map[14][x] = TID.PATH; map[15][x] = TID.PATH; } // E-W road
  for (let y = 1; y < H-1; y++) { map[y][17] = TID.PATH; map[y][18] = TID.PATH; } // N-S road
  fillBlock(map,  2,  2, 14, 11, TID.WALL, TID.DARK); // NW building
  fillBlock(map, 21,  2, 33, 11, TID.WALL, TID.DARK); // NE building
  fillBlock(map,  2, 18, 14, 27, TID.WALL, TID.DARK); // SW building
  fillBlock(map, 21, 18, 33, 27, TID.WALL, TID.DARK); // SE building
  return map;
}

function buildOverworldMap() {
  const W = 72, H = 72;
  const map = Array.from({ length: H }, () => Array(W).fill(TID.GRASS));
  for (let x = 0; x < W; x++) { map[0][x] = TID.WALL; map[H-1][x] = TID.WALL; }
  for (let y = 0; y < H; y++) { map[y][0] = TID.WALL; map[y][W-1] = TID.WALL; }
  for (let x = 1; x < W-1; x++) { map[36][x] = TID.PATH; map[37][x] = TID.PATH; } // E-W road
  for (let y = 1; y < H-1; y++) { map[y][30] = TID.PATH; map[y][31] = TID.PATH; } // N-S road
  for (let x = 30; x <= 57; x++) { map[26][x] = TID.PATH; map[27][x] = TID.PATH; } // branch to ruins
  return map;
}

function buildRuinsMap() {
  const W = 36, H = 36;
  const map = Array.from({ length: H }, () => Array(W).fill(TID.RUINS));
  for (let x = 0; x < W; x++) { map[0][x] = TID.WALL; map[H-1][x] = TID.WALL; }
  for (let y = 0; y < H; y++) { map[y][0] = TID.WALL; map[y][W-1] = TID.WALL; }
  for (let py = 4; py < H-4; py += 8)   // pillar columns every 8 tiles
    for (let px = 4; px < W-4; px += 8)
      fillBlock(map, px, py, px+1, py+1, TID.WALL, TID.WALL);
  return map;
}

const MAP_DEFS = {
  town: {
    w: 36, h: 30,
    ground: buildTownMap(),
    spawn: { from_overworld: { col: 18, row: 16 } },
    warps:     [{ col: 15, row: 28, cols: 6, rows: 2, targetMap: 'overworld', targetSpawn: 'from_town' }],
    npcs:      [{ id: 'elder', col: 8, row: 12 }, { id: 'smith', col: 26, row: 12 }, { id: 'merchant', col: 8, row: 17 }, { id: 'scout', col: 26, row: 17 }],
    encounters: [],
    bosses:    [],
  },
  overworld: {
    w: 72, h: 72,
    ground: buildOverworldMap(),
    spawn: { spawn_main: { col: 36, row: 36 }, from_town: { col: 30, row: 40 }, from_ruins: { col: 50, row: 28 } },
    warps:     [{ col: 28, row: 38, cols: 4, rows: 4, targetMap: 'town', targetSpawn: 'from_overworld' }, { col: 55, row: 25, cols: 4, rows: 4, targetMap: 'ruins', targetSpawn: 'from_overworld' }],
    npcs:      [{ id: 'grom', col: 22, row: 20 }, { id: 'slyx', col: 42, row: 15 }],
    encounters: [{ col: 10, row: 10, cols: 20, rows: 20, chance: 0.13, tier: 1 }, { col: 42, row: 10, cols: 20, rows: 20, chance: 0.18, tier: 2 }, { col: 10, row: 42, cols: 20, rows: 20, chance: 0.18, tier: 2 }, { col: 42, row: 42, cols: 20, rows: 20, chance: 0.22, tier: 3 }],
    bosses:    [],
  },
  ruins: {
    w: 36, h: 36,
    ground: buildRuinsMap(),
    spawn: { from_overworld: { col: 18, row: 18 } },
    warps:     [{ col: 15, row: 34, cols: 6, rows: 2, targetMap: 'overworld', targetSpawn: 'from_ruins' }],
    npcs:      [{ id: 'lumina', col: 8, row: 8 }, { id: 'elara', col: 28, row: 28 }],
    encounters: [{ col: 5, row: 5, cols: 26, rows: 26, chance: 0.22, tier: 3 }],
    bosses:    [{ col: 16, row: 15, cols: 4, rows: 4, bossId: 'abyss_warden' }],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Procedural texture builders — pure DOM canvas, no Phaser API.
// All returned as data-URLs fed into load.image / load.spritesheet.
// ─────────────────────────────────────────────────────────────────────────────
function buildRpgTileset() {
  const SZ = 16;
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128; // 8×8 grid of 16×16 tiles
  const c = cv.getContext('2d');
  const t = (tx, ty, fn) => { c.save(); c.translate(tx * SZ, ty * SZ); fn(); c.restore(); };

  // 0 – VOID
  t(0, 0, () => { c.fillStyle = '#0d0d0d'; c.fillRect(0, 0, SZ, SZ); });

  // 1 – GRASS (light with scattered dark marks)
  t(1, 0, () => {
    c.fillStyle = '#dedede'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#2a2a2a';
    [[1,2],[5,0],[8,3],[12,1],[15,5],[2,7],[6,5],[10,6],[14,9],
     [0,11],[3,13],[7,10],[11,13],[4,14],[9,12],[13,8],[1,15]].forEach(([x,y]) => c.fillRect(x,y,1,2));
    c.fillStyle = '#161616';
    [[3,4],[9,8],[14,3],[5,11]].forEach(([x,y]) => c.fillRect(x,y,1,1));
  });

  // 2 – COBBLESTONE PATH (staggered brick pattern)
  t(2, 0, () => {
    c.fillStyle = '#b5b5b5'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#606060';
    c.fillRect(0, 0, SZ, 1); c.fillRect(0, 7, SZ, 1); c.fillRect(0, SZ-1, SZ, 1);
    c.fillRect(7, 1, 1, 6); c.fillRect(3, 8, 1, 7); c.fillRect(11, 8, 1, 7);
    c.fillStyle = '#d4d4d4';
    c.fillRect(1, 1, 5, 5); c.fillRect(9, 1, 6, 5);
    c.fillRect(1, 8, 1, 6); c.fillRect(4, 8, 6, 6); c.fillRect(12, 8, 3, 6);
  });

  // 3 – WALL (collision | dark brick, lit-from-above highlight)
  t(3, 0, () => {
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#707070'; c.fillRect(0, 0, SZ, 1);
    c.fillStyle = '#383838'; c.fillRect(0, 1, SZ, 1);
    c.fillStyle = '#222';
    c.fillRect(0, 5, SZ, 1); c.fillRect(0, 10, SZ, 1);
    c.fillRect(7, 0, 1, 5); c.fillRect(3, 6, 1, 4); c.fillRect(11, 6, 1, 4); c.fillRect(7, 11, 1, 5);
  });

  // 4 – TOWN FLOOR (light stone slab with raised checkerboard faces)
  t(4, 0, () => {
    c.fillStyle = '#cdcdcd'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#999'; c.fillRect(0, 0, SZ, 1); c.fillRect(0, 0, 1, SZ);
    c.fillStyle = '#e8e8e8'; c.fillRect(1, 1, SZ-1, SZ-1);
    c.fillStyle = '#f2f2f2'; c.fillRect(1, 1, 6, 6); c.fillRect(9, 9, 6, 6);
    c.fillStyle = '#dcdcdc'; c.fillRect(9, 1, 6, 6); c.fillRect(1, 9, 6, 6);
  });

  // 5 – DARK FLOOR (building interiors)
  t(5, 0, () => {
    c.fillStyle = '#484848'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#2e2e2e'; c.fillRect(0, 0, SZ, 1); c.fillRect(0, 0, 1, SZ);
    c.fillStyle = '#545454'; c.fillRect(1, 1, SZ-1, SZ-1);
    c.fillStyle = '#5e5e5e'; c.fillRect(1, 1, 6, 6); c.fillRect(9, 9, 6, 6);
    c.fillStyle = '#4e4e4e'; c.fillRect(9, 1, 6, 6); c.fillRect(1, 9, 6, 6);
  });

  // 6 – RUINS FLOOR (very dark cracked stone)
  t(6, 0, () => {
    c.fillStyle = '#202020'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#484848';
    c.fillRect(2, 1, 1, 5); c.fillRect(3, 5, 4, 1); c.fillRect(6, 5, 1, 3);
    c.fillRect(10, 9, 1, 5); c.fillRect(11, 9, 4, 1); c.fillRect(14, 3, 1, 4); c.fillRect(12, 6, 3, 1);
    c.fillStyle = '#181818'; c.fillRect(0, 0, SZ, 1); c.fillRect(0, 0, 1, SZ);
  });

  // 7 – WATER (deep dark with wave highlights)
  t(7, 0, () => {
    c.fillStyle = '#0a1212'; c.fillRect(0, 0, SZ, SZ);
    c.fillStyle = '#203030';
    [[0,3],[4,3],[8,3],[12,3],[0,11],[4,11],[8,11],[12,11]].forEach(([x,y]) => c.fillRect(x,y,3,1));
    c.fillStyle = '#162424';
    [[2,7],[6,7],[10,7],[14,7]].forEach(([x,y]) => c.fillRect(x,y,3,1));
  });

  return cv;
}

function buildPlayerCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 128;
  const ctx = cv.getContext('2d');
  const drawFrame = (col, row, legL = 0, legR = 0) => {
    const x = col * 32; const y = row * 32;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x+10, y+30, 12, 2);
    // legs
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(x+11, y+21, 5, 8 + Math.max(0,  legL));
    ctx.fillRect(x+17, y+21, 5, 8 + Math.max(0,  legR));
    // boots
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(x+10, y+28 + (legL > 0 ? 1 : 0), 6, 3);
    ctx.fillRect(x+17, y+28 + (legR > 0 ? 1 : 0), 6, 3);
    // body (dark tunic)
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x+9, y+12, 14, 10);
    ctx.fillStyle = '#2e2e2e'; ctx.fillRect(x+11, y+14, 10, 6);
    ctx.fillStyle = '#111';    ctx.fillRect(x+9, y+20, 14, 1); // belt
    // arms
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x+5,  y+12, 4, 8 + (Math.abs(legL) > 1 ? 2 : 0));
    ctx.fillRect(x+23, y+12, 4, 8 + (Math.abs(legR) > 1 ? 2 : 0));
    // neck
    ctx.fillStyle = '#c4c4c4'; ctx.fillRect(x+14, y+9, 4, 4);
    // head
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x+10, y+1, 12, 11);
    // hair
    ctx.fillStyle = '#111'; ctx.fillRect(x+10, y+1, 12, 4);
    ctx.fillRect(x+10, y+1, 2, 9); ctx.fillRect(x+20, y+1, 2, 9);
    // eyes
    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(x+13, y+6, 2, 3);
    ctx.fillRect(x+17, y+6, 2, 3);
    ctx.fillRect(x+14, y+10, 4, 1);
  };
  for (let row = 0; row < 4; row += 1) {
    drawFrame(0, row, 0, 0);
    drawFrame(1, row, 3, -2);
    drawFrame(2, row, -2, 3);
  }
  return cv;
}

function buildNpcCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 32;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < 3; i += 1) {
    const x = i * 32; const bob = i === 1 ? -1 : 0;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x+8, 30, 16, 2);
    // robe (wide — distinct from player silhouette)
    ctx.fillStyle = '#181818'; ctx.fillRect(x+7, 13+bob, 18, 15);
    ctx.fillStyle = '#252525'; ctx.fillRect(x+9, 15+bob, 14, 11);
    ctx.fillStyle = '#101010'; ctx.fillRect(x+15, 13+bob, 2, 15);
    // staff
    ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x+24, 3+bob, 2, 25);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x+23, 2+bob, 4, 3);
    // arms
    ctx.fillStyle = '#181818'; ctx.fillRect(x+4, 13+bob, 4, 10);
    ctx.fillRect(x+24, 13+bob, 4, 9);
    // neck
    ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x+14, 9+bob, 4, 5);
    // head (rounded, partially hooded)
    ctx.fillStyle = '#e4e4e4'; ctx.fillRect(x+10, 1+bob, 12, 10);
    ctx.fillStyle = '#111';    ctx.fillRect(x+10, 1+bob, 12, 4);
    ctx.fillRect(x+10, 1+bob, 2, 10); ctx.fillRect(x+20, 1+bob, 2, 10);
    // eyes
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x+13, 5+bob, 2, 2);
    ctx.fillRect(x+17, 5+bob, 2, 2);
  }
  return cv;
}

function buildEnemyCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 32;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < 3; i += 1) {
    const x = i * 32; const p = i === 1 ? -1 : (i === 2 ? 1 : 0);
    // wings / appendages
    ctx.fillStyle = '#111';
    ctx.fillRect(x+2,  12+p, 5, 14);
    ctx.fillRect(x+25, 12+p, 5, 14);
    // body
    ctx.fillStyle = '#0e0e0e'; ctx.fillRect(x+6,  7+p, 20, 19);
    ctx.fillStyle = '#1c1c1c'; ctx.fillRect(x+8,  9+p, 16, 15);
    // glowing white eyes (maximum contrast vs dark body)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x+9,  10+p, 6, 5);
    ctx.fillRect(x+17, 10+p, 6, 5);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x+10, 11+p, 4, 3);
    ctx.fillRect(x+18, 11+p, 4, 3);
    // head
    ctx.fillStyle = '#0e0e0e'; ctx.fillRect(x+8, 1+p, 16, 9);
    ctx.fillStyle = '#1c1c1c'; ctx.fillRect(x+10, 2+p, 12, 7);
    // horns
    ctx.fillStyle = '#080808';
    ctx.fillRect(x+9,  p, 3, 4);
    ctx.fillRect(x+20, p, 3, 4);
  }
  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Tileset built procedurally — crisp monochrome 16×16 pixel tiles, no external file.
    this.load.image(ART_KEYS.tiles, buildRpgTileset().toDataURL());
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
    this.overlayLocked = true; // locked until a Normie is chosen and game is ready
    this.physics.world.setFPS(60);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,I');

    this.player = this.physics.add.sprite(0, 0, leadAvatarKey(), 0).setScale(1.5).setDepth(10);
    this.player.body.setSize(16, 12).setOffset(8, 18);
    this.player.setTint(tintFromLead());

    this.loadMap(STATE.world.mapId, STATE.world.spawnName);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(window.innerWidth < 768 ? 1.5 : 2.5);
    this.cameras.main.roundPixels = true;

    // Touch / pointer controls — left-half drag = move direction vector
    this.touchMove = { x: 0, y: 0 };
    this._touchActive = false;
    this._touchOrig = { x: 0, y: 0 };
    this.input.on('pointerdown', (p) => {
      // Only activate swipe-move if the D-pad is NOT already handling movement
      const dp = window._dpadState || {};
      const dpadActive = dp.up || dp.down || dp.left || dp.right;
      if (!dpadActive && p.x < this.scale.width * 0.65) {
        this._touchActive = true;
        this._touchOrig = { x: p.x, y: p.y };
      }
    });
    this.input.on('pointermove', (p) => {
      if (!this._touchActive) return;
      const dx = p.x - this._touchOrig.x, dy = p.y - this._touchOrig.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this.touchMove.x = len > 10 ? dx / Math.min(len, 65) : 0;
      this.touchMove.y = len > 10 ? dy / Math.min(len, 65) : 0;
    });
    this.input.on('pointerup', () => {
      this._touchActive = false;
      this.touchMove = { x: 0, y: 0 };
    });

    bus.on('state-reloaded', () => {
      this.refreshLeadAvatar();
      this.loadMap(STATE.world.mapId, STATE.world.spawnName);
      if (this.player.texture.key === ART_KEYS.player) this.player.anims.play('player-down', true);
      else this.player.anims.stop();
      // Unlock movement now that a Normie is loaded and the game has started
      this.overlayLocked = false;
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
      // Normie canvas is 120×120 (3px/px) — scale 0.32 = ~38px world, looks great at 2.5x zoom
      this.player.setScale(0.32);
      this.player.body.setSize(60, 68).setOffset(30, 38);
      this.player.clearTint();
      this.player.rotation = 0;
    } else {
      this.player.setScale(1.5);
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

    const mdef = MAP_DEFS[mapId];
    if (!mdef) { console.error('[NormiesRPG] Unknown map:', mapId); return; }

    // Build tilemap from inline data — Kenney mono tileset is 16×16 px per tile.
    // Scale 2 renders each tile at 32×32 px in world space.
    this.map = this.make.tilemap({ data: mdef.ground, tileWidth: 16, tileHeight: 16 });
    this.tileset = this.map.addTilesetImage(ART_KEYS.tiles, undefined, 16, 16);
    if (!this.tileset) {
      console.error('[NormiesRPG] addTilesetImage returned null — texture key:', ART_KEYS.tiles);
      return;
    }

    this.groundLayer = this.map.createLayer(0, this.tileset, 0, 0).setScale(2);
    this.collisionLayer = null; // single-layer; border tiles (index 3) handle collision
    this.groundLayer.setCollisionBetween(3, 3);
    this.physics.add.collider(this.player, this.groundLayer);

    // World size: tile 16px × scale 2 = 32 world-px per tile
    const mapW = mdef.w * 32;
    const mapH = mdef.h * 32;
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBounds(0, 0, mapW, mapH);

    const spawnData = mdef.spawn[spawnName] || Object.values(mdef.spawn)[0];
    if (spawnData) this.player.setPosition(spawnData.col * 32 + 16, spawnData.row * 32 + 16);

    mdef.npcs.forEach(({ id, col, row }) => {
      const npcData = NPCS[id] || (COMPANIONS[id] ? { name: COMPANIONS[id].name } : NPCS.elder);
      const spr = this.add.sprite(col * 32 + 16, row * 32 + 16, ART_KEYS.npc, 0).setScale(1.5).setDepth(9);
      spr.anims.play('npc-idle', true);
      if (COMPANIONS[id]) spr.setTint(COMPANIONS[id].color);
      this.npcs.push({ id, data: npcData, sprite: spr });
    });

    mdef.warps.forEach(({ col, row, cols, rows, targetMap, targetSpawn }) => {
      this.warps.push({ rect: new Phaser.Geom.Rectangle(col * 32, row * 32, cols * 32, rows * 32), targetMap, targetSpawn });
    });

    mdef.encounters.forEach(({ col, row, cols, rows, chance, tier }) => {
      this.encounters.push({ rect: new Phaser.Geom.Rectangle(col * 32, row * 32, cols * 32, rows * 32), chance, tier });
    });

    mdef.bosses.forEach(({ col, row, cols, rows, bossId }) => {
      this.bosses.push({ rect: new Phaser.Geom.Rectangle(col * 32, row * 32, cols * 32, rows * 32), bossId });
    });

    STATE.world.mapId = mapId;
    STATE.world.spawnName = spawnName;
    bus.emit('zone-changed', this.zoneFromMap());
  }

  movePlayer(delta) {
    const tm = this.touchMove;
    const dp = window._dpadState || {};
    const left  = this.keys.LEFT.isDown  || this.keys.A.isDown || tm.x < -0.25 || dp.left;
    const right = this.keys.RIGHT.isDown || this.keys.D.isDown || tm.x >  0.25 || dp.right;
    const up    = this.keys.UP.isDown    || this.keys.W.isDown || tm.y < -0.25 || dp.up;
    const down  = this.keys.DOWN.isDown  || this.keys.S.isDown || tm.y >  0.25 || dp.down;

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
      // Normie avatar is 120×120 canvas — correct base scale is 0.32 (set in refreshLeadAvatar)
      const base = this.player.texture.key === LEAD_NORMIE_TEXTURE_KEY ? 0.32 : 0.9;
      const pulse = (vx !== 0 || vy !== 0) ? (base * (0.97 + Math.sin(this.time.now / 60) * 0.03)) : base;
      this.player.setScale(pulse);

      // Direction-aware flip for normie.
      if (vx < -2) this.player.setFlipX(true);
      else if (vx > 2) this.player.setFlipX(false);
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
          showDialogue(npc.data.name, 'Trade fast, travel faster. The void doesn\'t wait.');
          openShop();
          return;
        }

        // Companion NPCs: always use branching dialogue
        const companionIds = ['grom', 'slyx', 'lumina', 'elara'];
        if (companionIds.includes(npc.id)) {
          const dlgId = dialogueForNpc(npc.id, STATE.quest, STATE.quest.flags);
          if (dlgId) { showBranchingDialogue(dlgId); return; }
        }

        // Story NPCs with branching override
        const override = dialogueForNpc(npc.id, STATE.quest, STATE.quest.flags);
        if (override) {
          showBranchingDialogue(override);
          bus.emit('hud-refresh');
          return;
        }

        // Fallback text
        const text = progressionDialogue(npc.id);
        if (text) showDialogue(npc.data.name, text);
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
    bus.emit('battle-start');
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
    this.heroSprite = this.add.sprite(w * 0.28, h * 0.55, heroKey, 0).setScale(heroKey === LEAD_NORMIE_TEXTURE_KEY ? 1.1 : 4.2).setDepth(2);
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
    // CSS hit-flash on battle card
    if (ui.battleCard) {
      ui.battleCard.classList.remove('hit-flash');
      void ui.battleCard.offsetWidth; // force reflow to restart animation
      ui.battleCard.classList.add('hit-flash');
      ui.battleCard.addEventListener('animationend', () => ui.battleCard.classList.remove('hit-flash'), { once: true });
    }
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
  const DEMO_ID = 6793;
  let normie;
  setLaunchStatus('Loading your Normie...');
  try {
    normie = await fetchNormieFull(DEMO_ID);
  } catch {
    normie = makeDemoNormie(DEMO_ID);
  }
  STATE.party.roster = [normie];
  STATE.party.leadId = normie.id;
  STATE.identity.mode = 'demo';
  STATE.identity.walletAddress = null;
  STATE.identity.walletName = 'Demo';
  applyLeadNormieStats();
  // Build normie texture and wait for it to be ready before starting game
  if (gameRef) await buildLeadNormieTexture();
  bus.emit('state-reloaded');
  updateWalletStatus();
  updateHud();
}

async function hydrateWalletParty(providerId = null) {
  updateWalletStatus('Connecting wallet...');
  setLaunchStatus('Connecting wallet...');
  try {
    const { provider, address, walletName } = await connectWallet(providerId);
    setLaunchStatus('Loading your Normies...');
    const owned = await loadWalletNormies(address, provider);

    if (!owned.length) {
      showDialogue('Wallet', 'No Normies found in this wallet. Starting demo mode.');
      await hydrateDemoParty();
      exitLaunchOverlay();
      return;
    }

    // Show normie picker — player chooses exactly 1.
    showNormiePicker(owned, async (chosen) => {
      STATE.party.roster = [chosen];
      STATE.party.leadId = chosen.id;
      STATE.identity.mode = 'wallet';
      STATE.identity.walletAddress = address;
      STATE.identity.walletName = walletName;
      applyLeadNormieStats();
      if (gameRef) await buildLeadNormieTexture();
      updateWalletStatus();
      setLaunchStatus(`Playing as ${chosen.name}.`);
      updateHud();
      bus.emit('state-reloaded');
      exitLaunchOverlay();
      loadCloud();
    });
  } catch (err) {
    const message = walletErrorMessage(err);
    updateWalletStatus(message);
    setLaunchStatus(message);
  }
}

function showNormiePicker(normies, onPick) {
  if (!ui.normieSelectScreen || !ui.normieSelectGrid) return;

  // Swap launch center content for normie select screen.
  const center = ui.normieSelectScreen.closest('.launch-center');
  center?.querySelectorAll('.launch-kicker, .launch-title, .wallet-picker, .launch-actions, .launch-disclaimer')
    .forEach((el) => el.classList.add('launch-hidden'));
  ui.normieSelectScreen.classList.remove('hidden');

  if (ui.normieSelectStatus) ui.normieSelectStatus.textContent = 'Choose your Normie. Party members join during your adventure.';

  ui.normieSelectGrid.innerHTML = normies.map((n) => `
    <button class="normie-card" data-id="${n.id}" type="button">
      <span class="nc-name">${n.name}</span>
      <span class="nc-type">${n.type}</span>
      <span class="nc-stat">HP ${n.maxHp} &middot; ATK ${n.atkBasic}</span>
    </button>
  `).join('');

  ui.normieSelectGrid.querySelectorAll('.normie-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const chosen = normies.find((n) => n.id === id);
      if (chosen) onPick(chosen);
    });
  });
}

async function launchDemoMode() {
  setLaunchStatus('Loading demo party...');
  await hydrateDemoParty();
  exitLaunchOverlay();
}

ui.dialogueClose.addEventListener('click', () => {
  if (typeof ui.dialogueClose.onclick === 'function') {
    ui.dialogueClose.onclick();
  } else {
    hideDialogue();
  }
});
ui.menuClose.addEventListener('click', closeMenu);
ui.shopClose.addEventListener('click', closeShop);
ui.btnSaveCloud.addEventListener('click', saveCloud);
ui.btnLoadCloud.addEventListener('click', loadCloud);
ui.walletConnect.addEventListener('click', openWalletModal);
ui.walletDemo.addEventListener('click', hydrateDemoParty);
ui.walletRefresh?.addEventListener('click', renderWalletChoices);
ui.launchWallet?.addEventListener('click', openWalletModal);
ui.launchDemo?.addEventListener('click', launchDemoMode);
ui.themeToggle?.addEventListener('click', toggleUiTheme);
ui.launchThemeToggle?.addEventListener('click', toggleUiTheme);
document.getElementById('wallet-modal-close')?.addEventListener('click', closeWalletModal);
document.getElementById('wallet-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeWalletModal();
});
document.getElementById('wallet-modal-demo')?.addEventListener('click', () => {
  closeWalletModal();
  launchDemoMode();
});

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
  if (gameRef) {
    gameRef.scale.resize(window.innerWidth, window.innerHeight);
    if (overworldRef) overworldRef.cameras.main.setZoom(window.innerWidth < 768 ? 1.5 : 2.5);
  }
});

initUiTheme();
renderWalletChoices();
updateHud('Verdant Town');

// D-pad mobile controls — container-based for reliable sliding, diagonals & multi-touch
(function wireDpad() {
  const dpad = { up: false, down: false, left: false, right: false };
  window._dpadState = dpad;

  const container = document.querySelector('.dpad');
  if (!container) return;

  const BTN = {
    up:    document.getElementById('dp-up'),
    down:  document.getElementById('dp-down'),
    left:  document.getElementById('dp-left'),
    right: document.getElementById('dp-right'),
  };

  function clearAll() {
    dpad.up = dpad.down = dpad.left = dpad.right = false;
    Object.values(BTN).forEach((b) => b?.classList.remove('active'));
  }

  function updateFromEvent(e) {
    const rect = container.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const DEAD = 10; // px dead-zone at centre

    clearAll();
    if (Math.abs(dx) < DEAD && Math.abs(dy) < DEAD) return;

    // Diagonals: a direction is active when its component is >= 50% of the other.
    if (Math.abs(dy) >= Math.abs(dx) * 0.5) {
      if (dy < -DEAD) { dpad.up   = true; BTN.up?.classList.add('active');   }
      if (dy >  DEAD) { dpad.down = true; BTN.down?.classList.add('active'); }
    }
    if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
      if (dx < -DEAD) { dpad.left  = true; BTN.left?.classList.add('active');  }
      if (dx >  DEAD) { dpad.right = true; BTN.right?.classList.add('active'); }
    }
  }

  container.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // Release any implicit capture from the child <button>, then re-capture on container
    if (e.target !== container) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    container.setPointerCapture(e.pointerId);
    updateFromEvent(e);
  });

  container.addEventListener('pointermove', (e) => {
    if (!(e.buttons & 1)) return; // only while primary finger/button is down
    updateFromEvent(e);
  });

  container.addEventListener('pointerup',     () => clearAll());
  container.addEventListener('pointercancel', () => clearAll());
  container.addEventListener('contextmenu',   (e) => e.preventDefault());

  // Hide D-pad during battle to keep the canvas uncluttered
  const mBtns = document.getElementById('mobile-btns');
  bus.on('battle-start',    () => { clearAll(); mBtns?.classList.add('d-hidden');    });
  bus.on('battle-finished', () => {             mBtns?.classList.remove('d-hidden'); });
})();

// Mobile action buttons
document.getElementById('btn-m-interact')?.addEventListener('click', () => {
  if (overworldRef && !overworldRef.overlayLocked) overworldRef.handleInteract();
});
document.getElementById('btn-m-menu')?.addEventListener('click', () => {
  if (overworldRef && !overworldRef.overlayLocked && !shopOpen) openMenu();
});
