// story.js — THE PIXEL WAR: Complete story, quests, NPCs, enemies

export const LORE = {
  title: "THE PIXEL WAR",
  tagline: "Every dot is a soul. They are coming for ours.",
  intro: [
    "The year is Block 9,847,221.\nYou are a Normie — a 40×40 pixel being rendered on The Ledger, the eternal blockchain. Every Normie is unique. Every pixel matters.",
    "The Grid is the world you know.\nMountains, towns, rivers — all made of pixels, all recorded on The Ledger forever. You cannot be deleted. You cannot be copied. You simply exist.",
    "Then came The Void.\nNobody knows where it started. A corrupted transaction. A bad block. A zero where there should have been a one. It spread through the chain like static across a dying screen.",
    "NULLBYTE leads the Void.\nHe was once Pixel Zero — the very first bit rendered when The Grid began. He fell to corruption before the Grid could even wake. Now he consumes everything, converting living pixels into raw power.",
    "The Grid is dying.\nEntire maps have gone dark. Towns erased. Normies consumed, their pixels drained. The Ledger still records them, but they no longer move. They are memory now, not life.",
    "You wake up in your bedroom.\nSomething inside you vibrates — a frequency you've never felt. Downstairs, your mother is calling. She sounds frightened.\n\nThe Pixel War has come to Render Street.\nAnd you are the only one with the Render Mark.",
  ],
};

// ─── SKILL TREES ─────────────────────────────────────────────
// Each type has 3 branches, each branch has 3 tiers
// Cost: tier1=1pt, tier2=2pt, tier3=3pt
export const SKILL_TREES = {
  Human: {
    icon: '◈',
    branches: [
      {
        id: 'render_force', name: 'Render Force', icon: '⬛',
        desc: 'Raw pixel power — direct combat mastery',
        skills: [
          { id: 'power_strike',   name: 'Power Strike',   cost: 1, desc: '+20% Attack damage permanently.', effect: { atkMult: 0.20 } },
          { id: 'pixel_surge',    name: 'Pixel Surge',    cost: 2, desc: 'Skill attacks deal +35% damage and cost 1 less MP.', effect: { skillMult: 0.35, mpDiscount: 1 } },
          { id: 'render_nova',    name: 'Render Nova',    cost: 3, desc: 'Ultimate hits all enemies (multi-battle wave). +50% Ult damage.', effect: { ultMult: 0.50, ultAoe: true } },
        ],
      },
      {
        id: 'grid_resilience', name: 'Grid Resilience', icon: '◫',
        desc: 'Defensive coding — survival and endurance',
        skills: [
          { id: 'bit_armor',      name: 'Bit Armor',      cost: 1, desc: '+15% max HP. Start each battle with a 20HP shield.', effect: { hpMult: 0.15, shield: 20 } },
          { id: 'render_heal',    name: 'Render Heal',    cost: 2, desc: 'Potions heal 25% more. Restore 5% HP every 3 steps.', effect: { potionBonus: 0.25, regenSteps: 3 } },
          { id: 'last_pixel',     name: 'Last Pixel',     cost: 3, desc: 'Once per battle: survive a killing blow at 1HP.', effect: { deathDefiance: true } },
        ],
      },
      {
        id: 'chain_protocol', name: 'Chain Protocol', icon: '◉',
        desc: 'Support and utility — the backbone of the party',
        skills: [
          { id: 'party_link',     name: 'Party Link',     cost: 1, desc: 'All party members gain +5% of this Normie\'s DEF stat.', effect: { partyDefShare: 0.05 } },
          { id: 'render_aura',    name: 'Render Aura',    cost: 2, desc: 'After each battle: restore 8% HP to all living party members.', effect: { postBattleHeal: 0.08 } },
          { id: 'full_rerender',  name: 'Full Rerender',  cost: 3, desc: 'Once per map: revive one fallen party member at 50% HP.', effect: { mapRevive: true } },
        ],
      },
    ],
  },
  Cat: {
    icon: '◇',
    branches: [
      {
        id: 'void_claw', name: 'Void Claw', icon: '◈',
        desc: 'Precise strikes — critical hit mastery',
        skills: [
          { id: 'sharp_pixel',    name: 'Sharp Pixel',    cost: 1, desc: '+10% crit chance. Crits deal 2.5× instead of 2×.', effect: { critChance: 0.10, critMult: 0.5 } },
          { id: 'ambush',         name: 'Ambush',         cost: 2, desc: 'First action each battle always crits.', effect: { firstHitCrit: true } },
          { id: 'nine_lives',     name: 'Nine Lives',     cost: 3, desc: 'Survive lethal hits up to 3 times per full rest.', effect: { nineLives: 3 } },
        ],
      },
      {
        id: 'shadow_step', name: 'Shadow Step', icon: '◫',
        desc: 'Speed and evasion — untouchable in the Grid',
        skills: [
          { id: 'quick_paws',     name: 'Quick Paws',     cost: 1, desc: '+3 SPD. Always acts before enemies of equal speed.', effect: { spdBonus: 3, spdTiebreak: true } },
          { id: 'dodge_static',   name: 'Dodge Static',   cost: 2, desc: '15% chance to evade any enemy attack.', effect: { evasion: 0.15 } },
          { id: 'phase_pounce',   name: 'Phase Pounce',   cost: 3, desc: 'Flee always succeeds. When fleeing, deal 50% ATK to enemy first.', effect: { fleeGuaranteed: true, fleeAttack: 0.5 } },
        ],
      },
      {
        id: 'purr_protocol', name: 'Purr Protocol', icon: '◎',
        desc: 'MP mastery — skill-spamming specialist',
        skills: [
          { id: 'mp_efficiency',  name: 'MP Efficiency',  cost: 1, desc: 'All skills cost 1 less MP (minimum 1).', effect: { mpDiscount: 1 } },
          { id: 'mana_claw',      name: 'Mana Claw',      cost: 2, desc: 'Basic attacks restore 1 MP on hit.', effect: { mpRegen: 1 } },
          { id: 'void_purr',      name: 'Void Purr',      cost: 3, desc: 'At turn start: gain +3 MP. Skills deal bonus damage = 2× MP spent.', effect: { turnMpRegen: 3, mpDamageBonus: 2 } },
        ],
      },
    ],
  },
  Alien: {
    icon: '◌',
    branches: [
      {
        id: 'null_beam', name: 'Null Beam', icon: '◈',
        desc: 'Elemental power — void-energy manipulation',
        skills: [
          { id: 'void_affinity',  name: 'Void Affinity',  cost: 1, desc: 'Take 15% less damage from Void-type enemies.', effect: { voidResist: 0.15 } },
          { id: 'beam_amplify',   name: 'Beam Amplify',   cost: 2, desc: 'Skills deal +40% damage to Void-type enemies.', effect: { voidBonus: 0.40 } },
          { id: 'grid_collapse',  name: 'Grid Collapse',  cost: 3, desc: 'Ultimate: reduce enemy DEF to 0 for 3 turns. Piercing damage.', effect: { ultDefStrip: true } },
        ],
      },
      {
        id: 'psi_render', name: 'Psi Render', icon: '◬',
        desc: 'Mental superiority — high MP output',
        skills: [
          { id: 'alien_mind',     name: 'Alien Mind',     cost: 1, desc: '+5 max MP. Regenerate 2 MP per round automatically.', effect: { mpBonus: 5, mpPerRound: 2 } },
          { id: 'override',       name: 'Override',       cost: 2, desc: '25% chance each turn: enemy skips their next action.', effect: { stunChance: 0.25 } },
          { id: 'grid_override',  name: 'Grid Override',  cost: 3, desc: 'Once per battle: copy enemy\'s last move and use it against them.', effect: { copyAbility: true } },
        ],
      },
      {
        id: 'xenoform', name: 'Xenoform', icon: '◔',
        desc: 'Adaptability — changes based on enemies faced',
        skills: [
          { id: 'pixel_scan',     name: 'Pixel Scan',     cost: 1, desc: 'Battle start: reveal enemy weaknesses in the log.', effect: { enemyScan: true } },
          { id: 'adapt',          name: 'Adapt',          cost: 2, desc: 'After taking a hit: gain +10% resistance to that damage type.', effect: { adaptResist: 0.10 } },
          { id: 'xenomorph',      name: 'Xenomorph',      cost: 3, desc: 'Transform: gain +50% ATK and +30% DEF for 4 turns.', effect: { transformBuff: { atk: 0.5, def: 0.3, turns: 4 } } },
        ],
      },
    ],
  },
  Agent: {
    icon: '◆',
    branches: [
      {
        id: 'protocol_breach', name: 'Protocol Breach', icon: '◈',
        desc: 'System hacking — exploit enemy weaknesses',
        skills: [
          { id: 'exploit',        name: 'Exploit',        cost: 1, desc: 'Attacks ignore 20% of enemy DEF.', effect: { defPierce: 0.20 } },
          { id: 'backdoor',       name: 'Backdoor',       cost: 2, desc: '30% chance: your attack hits twice.', effect: { doubleHit: 0.30 } },
          { id: 'system_crash',   name: 'System Crash',   cost: 3, desc: 'Ultimate: applies Corrupted status to enemy (−30% ATK for 5 turns).', effect: { ultCorrupt: true } },
        ],
      },
      {
        id: 'field_ops', name: 'Field Ops', icon: '◩',
        desc: 'Tactical superiority — control the battlefield',
        skills: [
          { id: 'tactical_move',  name: 'Tactical Move',  cost: 1, desc: '+2 DEF. Fleeing never costs a turn.', effect: { defBonus: 2, freeFlee: true } },
          { id: 'cover_fire',     name: 'Cover Fire',     cost: 2, desc: 'Protect the lowest-HP ally: redirect 30% of their damage to this Agent.', effect: { coverAlly: 0.30 } },
          { id: 'extraction',     name: 'Extraction',     cost: 3, desc: 'After any ally falls: immediately revive them at 25% HP (once per battle).', effect: { battleRevive: true } },
        ],
      },
      {
        id: 'dark_data', name: 'Dark Data', icon: '▣',
        desc: 'Bonus economy — gold, drops, and rare finds',
        skills: [
          { id: 'loot_scan',      name: 'Loot Scan',      cost: 1, desc: '+25% gold from all battles. +10% item drop chance.', effect: { goldBonus: 0.25, dropBonus: 0.10 } },
          { id: 'black_market',   name: 'Black Market',   cost: 2, desc: 'Shop prices reduced by 20%. Items occasionally found in chests.', effect: { shopDiscount: 0.20 } },
          { id: 'deep_archive',   name: 'Deep Archive',   cost: 3, desc: 'Once per session: access a hidden shop with rare items.', effect: { secretShop: true } },
        ],
      },
    ],
  },
};

// ─── QUESTS ──────────────────────────────────────────────────
export const QUESTS = {
  // Chapter 0 — Home
  prologue_home: {
    id: 'prologue_home',
    name: 'Rise and Fall',
    chapter: 0,
    desc: 'Mom is calling from downstairs. Something is wrong.',
    steps: [
      { id: 'go_downstairs', text: 'Go downstairs', done: false },
      { id: 'talk_mom_down', text: 'Speak to Mom', done: false },
    ],
    reward: { gold: 0, items: [], xp: 5 },
    lore: 'A morning that started like any other. It won\'t end that way.',
  },
  prologue_outside: {
    id: 'prologue_outside',
    name: 'First Steps',
    chapter: 0,
    desc: 'Pix the Neighbor is waiting outside. Go see what they know.',
    steps: [
      { id: 'leave_home', text: 'Leave your home', done: false },
      { id: 'talk_pix',   text: 'Speak to Pix the Neighbor', done: false },
    ],
    reward: { gold: 10, items: ['compass'], xp: 15 },
    lore: 'The street that felt safe yesterday looks different in static light.',
  },

  // Chapter 1 — Pixel Fields
  ch1_soldier: {
    id: 'ch1_soldier',
    name: 'The Soldier\'s Warning',
    chapter: 1,
    desc: 'Speak to the Grid Soldier near the river crossing.',
    steps: [
      { id: 'talk_soldier', text: 'Speak to the Grid Soldier', done: false },
    ],
    reward: { gold: 15, items: [], xp: 20 },
    lore: 'The soldier has seen things the maps don\'t show. Listen.',
  },
  ch1_find_oracle: {
    id: 'ch1_find_oracle',
    name: 'The Oracle of Bit',
    chapter: 1,
    desc: 'Travel east to Pixel Town and find the Oracle.',
    steps: [
      { id: 'reach_town', text: 'Reach Pixel Town', done: false },
      { id: 'talk_oracle', text: 'Speak to the Oracle of Bit', done: false },
    ],
    reward: { gold: 25, items: ['pixel_shard'], xp: 50 },
    lore: 'The Oracle has been reading the chain for forty years. She knows NULLBYTE\'s patterns. She has been waiting for the Render Mark.',
  },
  ch1_bit_shards: {
    id: 'ch1_bit_shards',
    name: 'Fragments of the Grid',
    chapter: 1,
    desc: 'Collect 3 Pixel Shards from Void Scouts in the dark grass.',
    steps: [
      { id: 'collect_shards', text: 'Defeat Void Scouts (0/3)', done: false, progress: 0, target: 3 },
    ],
    reward: { gold: 35, items: ['render_key'], xp: 80 },
    lore: 'Every Void Scout carries a stolen piece of the Grid. Take them back.',
  },

  // Chapter 2 — Cave
  ch2_cave: {
    id: 'ch2_cave',
    name: 'The Cave of First Bits',
    chapter: 2,
    desc: 'Enter the Cave, find the Render Flame, defeat the Guardian.',
    steps: [
      { id: 'enter_cave', text: 'Enter the Cave of First Bits', done: false },
      { id: 'talk_spirit', text: 'Speak to the Grid Spirit', done: false },
      { id: 'defeat_guardian', text: 'Defeat the Cave Guardian', done: false },
    ],
    reward: { gold: 60, items: ['render_flame'], xp: 200 },
    lore: 'The Render Flame is the first pixel ever lit. The Guardian has been corrupted to protect it for NULLBYTE. It must be stopped.',
  },

  // Chapter 3 — Corrupted Lands
  ch3_void_march: {
    id: 'ch3_void_march',
    name: 'The Void March',
    chapter: 3,
    desc: 'Push through the Corrupted Lands and reach the Void Citadel.',
    steps: [
      { id: 'cross_void', text: 'Cross the Corrupted Lands', done: false },
      { id: 'find_survivor', text: 'Find the Last Survivor', done: false },
      { id: 'reach_citadel', text: 'Reach the Void Citadel', done: false },
    ],
    reward: { gold: 100, items: [], xp: 350 },
    lore: 'Three days of static. Two days of silence. The Corrupted Lands eat the light and spit out nothing. Stay on the path. Whatever you do — stay on the path.',
  },
  ch3_upgrade: {
    id: 'ch3_upgrade',
    name: 'Power Before the Storm',
    chapter: 3,
    desc: 'Ensure your party is ready. Upgrade at least one Normie\'s skill tree.',
    steps: [
      { id: 'unlock_skill', text: 'Unlock at least 1 skill for any Normie', done: false },
    ],
    reward: { gold: 40, items: ['antivoid', 'antivoid'], xp: 100 },
    lore: 'The Citadel guards are unlike anything you\'ve faced in the fields. Every advantage matters.',
  },

  // Chapter 4 — Citadel
  finale: {
    id: 'finale',
    name: 'Rerender the World',
    chapter: 4,
    desc: 'Confront NULLBYTE and restore the Grid.',
    steps: [
      { id: 'breach_citadel', text: 'Fight through the Citadel', done: false },
      { id: 'defeat_commander', text: 'Defeat the Void Commander', done: false },
      { id: 'defeat_nullbyte', text: 'Defeat NULLBYTE', done: false },
    ],
    reward: { gold: 0, items: ['grid_restored'], xp: 1000 },
    lore: '"You cannot rewrite what has already been consumed."\n— NULLBYTE\n\nHe is wrong.',
  },
};

// ─── ITEMS ───────────────────────────────────────────────────
export const ITEMS = {
  potion: {
    id: 'potion', name: 'Render Potion', rarity: 'common',
    desc: 'Restores 40% HP to the most wounded Normie. Pure rendered light in a bottle.',
    icon: '⬜', stackable: true,
    use: (party) => {
      const t = party.filter(n=>n.alive).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
      if (!t) return null;
      const h = Math.floor(t.maxHp*0.40);
      t.hp = Math.min(t.maxHp, t.hp+h);
      return `${t.name} recovered ${h} HP.`;
    }
  },
  mp_crystal: {
    id: 'mp_crystal', name: 'MP Crystal', rarity: 'common',
    desc: 'Restores 8 MP to the party leader. Crystallized render energy.',
    icon: '◆', stackable: true,
    use: (party) => {
      const t = party.filter(n=>n.alive)[0];
      if (!t) return null;
      const m = Math.min(8, t.maxMp - t.mp);
      t.mp += m;
      return `${t.name} recovered ${m} MP.`;
    }
  },
  pixel_shard: {
    id: 'pixel_shard', name: 'Pixel Shard', rarity: 'quest',
    desc: 'A fragment of the Grid torn from the terrain. Still vibrates faintly.',
    icon: '◇', stackable: true, questItem: true,
  },
  compass: {
    id: 'compass', name: 'Render Compass', rarity: 'uncommon',
    desc: 'Points toward VOID energy concentrations. Pix gave this to you.',
    icon: '◎', stackable: false, questItem: false,
    passive: 'Reveals strong enemy locations on the minimap.'
  },
  render_key: {
    id: 'render_key', name: 'Render Key', rarity: 'quest',
    desc: 'Forged by the Oracle from 3 Pixel Shards. Opens the Cave of First Bits.',
    icon: '⬡', stackable: false, questItem: true,
  },
  render_flame: {
    id: 'render_flame', name: 'Render Flame', rarity: 'legendary',
    desc: 'The first pixel ever lit. Cannot be corrupted. +15% damage to all Void enemies.',
    icon: '◈', stackable: false, questItem: false,
    passive: '+15% damage to all VOID-type enemies.'
  },
  antivoid: {
    id: 'antivoid', name: 'Anti-Void Salve', rarity: 'uncommon',
    desc: 'Prevents VOID terrain damage for 30 steps.',
    icon: '▣', stackable: true,
    passive: 'Protects against VOID terrain drain.'
  },
  full_render: {
    id: 'full_render', name: 'Full Render', rarity: 'rare',
    desc: 'Fully restores all HP and MP to the entire party.',
    icon: '■', stackable: true,
    use: (party) => {
      party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
      return 'All Normies fully restored!';
    }
  },
  void_core: {
    id: 'void_core', name: 'Void Core', rarity: 'rare',
    desc: 'Crystallized void energy. Sell for 80G or craft into armor.',
    icon: '◉', stackable: true,
  },
  grid_restored: {
    id: 'grid_restored', name: 'The Grid: Restored', rarity: 'legendary',
    desc: 'You did it. This is not an item. This is proof.',
    icon: '★', stackable: false, questItem: true,
  },
};

// ─── NPC DEFINITIONS ─────────────────────────────────────────
export const NPC_DEFS = [

  // ─── HOME — UPSTAIRS ────────────────────────────────────────
  {
    id: 'mom_up', mapId: 'home_up', x: 3, y: 2, sprite: 'elder_f',
    name: 'Mom',
    lines: [
      "WAKE UP! The static is bad — really bad. Get up and come downstairs, now. Something is happening to the Grid.",
      "Don't dawdle. I need you downstairs. Your breakfast is getting cold and I have things to tell you.",
    ],
    questTrigger: null,
  },

  // ─── HOME — DOWNSTAIRS ──────────────────────────────────────
  {
    id: 'mom_down', mapId: 'home_down', x: 3, y: 2, sprite: 'elder_f',
    name: 'Mom',
    lines: [
      "There you are. Listen — I don't want to scare you, but the pixels in the eastern blocks have been going dark for three days. Last night it reached Render Street.",
      "Your grandfather always said: 'When the first pixel dims, run toward it, not away.' I never understood that until I saw the Render Mark on your hand this morning.",
      "The Oracle in Pixel Town will know what it means. She\'s the only one who reads the chain in real time. You need to go to her. Take your potions from the shelf.",
      "I love you. Be careful. Whatever is happening to the Grid — I believe you can help. You\'re a Normie. The first ones rendered. Never forget that.",
    ],
    questTrigger: { stepComplete: 'talk_mom_down', start: 'prologue_outside' },
  },
  {
    id: 'home_shelf', mapId: 'home_down', x: 7, y: 1, sprite: 'merchant',
    name: 'Supply Shelf',
    lines: [
      "A modest shelf of supplies. Mom has left 3 Render Potions and a note: 'Don't skip meals. Fight smart.'",
    ],
    questTrigger: null,
  },

  // ─── OVERWORLD ──────────────────────────────────────────────
  {
    id: 'pix', mapId: 'overworld', x: 28, y: 22, sprite: 'neighbor',
    name: 'Pix',
    lines: [
      "FINALLY! Did you see the sky to the east? That's not storm clouds — that's VOID spread. Three entire map-sectors just went dark overnight.",
      "My cousin Dot lives near the Corrupted Lands. She sent me a message two days ago: 'The pixels here are falling like rain.' Then nothing. I think her whole block was consumed.",
      "The Oracle in Pixel Town has been tracking NULLBYTE for years. She predicted all of this. You NEED to go to her, now. I'll hold things down here.",
    ],
    questTrigger: { stepComplete: 'talk_pix', start: 'ch1_find_oracle' },
  },
  {
    id: 'soldier', mapId: 'overworld', x: 22, y: 18, sprite: 'guard',
    name: 'Grid Soldier Krix',
    lines: [
      "Halt, Citizen. The path east is under threat. VOID Scouts have been spotted in the dark grass beyond the river bridge.",
      "Stay on the stone path — VOID corruption can't take root in rendered stone. Dark grass is where they hide.",
      "If you're heading to Pixel Town, go. The Oracle needs to know the spread has reached Render Street. And — if you see any Void Scouts — take their Pixel Shards. They're stolen Grid fragments. They shouldn't be with those things.",
    ],
    questTrigger: { stepComplete: 'talk_soldier', start: 'ch1_soldier' },
  },
  {
    id: 'merchant_plains', mapId: 'overworld', x: 18, y: 26, sprite: 'merchant',
    name: 'Merchant Gram',
    shop: true,
    shopInventory: ['potion', 'mp_crystal', 'antivoid'],
    lines: [
      "Business is booming in the worst possible way. Anti-Void Salve, potions, crystals — people are stocking up before they run.",
      "Twenty steps on corrupted ground and your pixels start to bleed. Buy an Anti-Void Salve if you're heading past the river.",
      "Buy low, sell... actually, don't sell. Hold everything. You'll need it all.",
    ],
    questTrigger: null,
  },
  {
    id: 'elder_hermit', mapId: 'overworld', x: 8, y: 10, sprite: 'elder_f',
    name: 'Elder Vex',
    lines: [
      "I remember when this field had no dark grass. Every pixel green and rendered fresh. Now look at it.",
      "NULLBYTE was a mistake. The chain's first corrupted block. We sealed him away in Block Zero for ten thousand cycles. Someone opened it.",
      "The Ledger records all things. Even the mistakes. That's both the tragedy and the hope.",
    ],
    questTrigger: null,
  },

  // ─── PIXEL TOWN ─────────────────────────────────────────────
  {
    id: 'oracle', mapId: 'town', x: 8, y: 5, sprite: 'oracle',
    name: 'Oracle of Bit',
    lines: [
      "The Render Mark. I've been waiting nine years for whoever bore it. I didn't expect a Normie. Of course it's a Normie. Sit.",
      "NULLBYTE has consumed 43% of The Grid. Not just terrain — memories. Blocks of history. When a pixel dies, the thing it remembers dies with it.",
      "You need the Render Flame. Cave of First Bits, south path through town. The cave is sealed with corrupted render-code — I need 3 Pixel Shards from the Scouts in the dark grass to forge you a key.",
      "The Shards are pieces of the Grid itself. The Scouts carry them to power themselves. Take them back. Bring them here. Then go to the cave. Time is not our ally.",
    ],
    questTrigger: { stepComplete: 'talk_oracle', start: 'ch1_bit_shards' },
  },
  {
    id: 'innkeeper', mapId: 'town', x: 4, y: 8, sprite: 'innkeeper',
    name: 'Innkeeper Luma',
    inn: true,
    lines: [
      "Rest here. Full HP and MP restored, no charge. Anyone fighting the VOID sleeps free in Luma's inn. Always.",
      "The refugees from the eastern blocks keep coming. Some have only a few pixels left — you can see through them. They flicker when they speak.",
      "I've been writing everything down on paper. Every face I've seen. Just in case the pixels go. Memory on paper outlasts any block.",
    ],
    questTrigger: null,
  },
  {
    id: 'historian', mapId: 'town', x: 10, y: 7, sprite: 'scholar',
    name: 'Historian Dot',
    lines: [
      "The Grid is 10,000 blocks deep. Each block a moment in time. NULLBYTE consuming blocks means he's erasing HISTORY — not just space.",
      "Here's what the chain tells me: Normies have a stronger render signature than any other entity. That's why they're always the last pixels standing. That's why you're special.",
      "Upgrade your party whenever you can. The skill trees aren't just numbers — they're ways of being. An Agent thinks differently than an Alien. Use that.",
    ],
    questTrigger: null,
  },
  {
    id: 'blacksmith', mapId: 'town', x: 12, y: 9, sprite: 'blacksmith',
    name: 'Render Smith Boro',
    shop: true,
    shopInventory: ['potion', 'mp_crystal', 'full_render', 'antivoid'],
    lines: [
      "I forge rendered matter. Every item here is crystallized from pure chain-hash. Worth more than gold in a world losing pixels.",
      "The Cave Guardian has been undefeated for sixty render-years. Whatever you're planning, bring Full Renders. Buy two.",
      "Come back after the Cave. Render Flame as a crafting base... I have schematics. Just survive long enough.",
    ],
    questTrigger: null,
  },
  {
    id: 'town_guard', mapId: 'town', x: 2, y: 12, sprite: 'guard',
    name: 'Town Guard Stel',
    lines: [
      "The south gate to the cave path is open. I can't close it — refugees need the route in.",
      "Whatever you find in that cave — be careful. Three full squads went in last month. None came back.",
      "The Guardian — we think it was once one of us. A Normie. That's all I'll say.",
    ],
    questTrigger: null,
  },

  // ─── CAVE ───────────────────────────────────────────────────
  {
    id: 'cave_spirit', mapId: 'cave', x: 6, y: 4, sprite: 'spirit',
    name: 'Grid Spirit',
    lines: [
      "The Render Key. Good. You carry the Oracle's mark. This cave was rendered at the first block — every pixel here is original. Pre-corruption. Pre-VOID.",
      "The Guardian guards the Render Flame. It was once called Keeper — a noble algorithm, the first autonomous being. NULLBYTE corrupted it. Now it protects the Flame for him.",
      "It still has something of its original self inside. I can feel it. When you fight it — don't hate it. Pity it. Then end its suffering. That's the only mercy left.",
    ],
    questTrigger: { stepComplete: 'talk_spirit' },
  },

  // ─── CORRUPTED LANDS ────────────────────────────────────────
  {
    id: 'survivor', mapId: 'void_lands', x: 5, y: 8, sprite: 'survivor',
    name: 'Survivor Wren',
    lines: [
      "...my village. It's just gone. I watched the pixels drop one at a time. Like sand through fingers. Then nothing. Black.",
      "NULLBYTE moves faster now. He's absorbed enough to accelerate. I counted: the Citadel is maybe 200 pixels east. I can see it glowing from here. Dark glow. Wrong color.",
      "Take everything I have. I'm not going further. I'll stay here and be a memory. That's still something, right?",
    ],
    questTrigger: { stepComplete: 'find_survivor' },
    giftItem: 'full_render',
  },
  {
    id: 'void_defector', mapId: 'void_lands', x: 22, y: 8, sprite: 'guard',
    name: 'Defector Nil',
    lines: [
      "I was VOID. I know — don't look at me like that. I was consumed, turned, deployed. Then something in the chain... glitched me back. Partial recovery.",
      "NULLBYTE keeps his main force in the Citadel. A Commander guards the inner gate. Elite. Old. Angry. It hasn't lost in three hundred cycles.",
      "The Citadel core is where he stores consumed pixels. If you destroy the core while NULLBYTE falls, they might come back. Might. No promises. But — might.",
    ],
    questTrigger: null,
  },
];

// ─── ENEMY ROSTER ────────────────────────────────────────────
export const ENEMIES = {
  // OVERWORLD — normal grass (tier 0)
  void_scout: {
    id:'void_scout', name:'VOID SCOUT',
    tier:0, sprite:'void_scout', voidType: true,
    hpBase:55, atkBase:11, def:1, spd:9,
    lore:'The smallest VOID unit. Scouts ahead of the corruption wave, draining isolated pixels to send coordinates back to NULLBYTE.',
    dropItem: 'pixel_shard', dropChance: 1.0,
    questDrop: { questId:'ch1_bit_shards', stepId:'collect_shards' },
    moves:['Pixel Drain','Static Pulse','Corrupt Touch'],
    xpReward: 18,
  },
  glitch_sprite: {
    id:'glitch_sprite', name:'GLITCH SPRITE',
    tier:0, sprite:'glitch', voidType: true,
    hpBase:70, atkBase:14, def:2, spd:12,
    lore:'A Normie whose pixels were 80% consumed. What remains moves on corrupted instinct alone. There may be nothing left to save.',
    dropItem: 'potion', dropChance: 0.35,
    moves:['Corrupt Touch','Fragmented Strike','Null Twitch'],
    xpReward: 22,
  },

  // OVERWORLD — dark grass (tier 1)
  void_soldier: {
    id:'void_soldier', name:'VOID SOLDIER',
    tier:1, sprite:'void_heavy', voidType: true,
    hpBase:120, atkBase:20, def:5, spd:7,
    lore:'A fully-formed VOID construct. Carries 256 consumed pixels. Cold. Purposeful. Relentless. It knows your name.',
    dropItem: 'void_core', dropChance: 0.30,
    moves:['Null Strike','Pixel Crush','Consume'],
    xpReward: 45,
  },
  bit_wraith: {
    id:'bit_wraith', name:'BIT WRAITH',
    tier:1, sprite:'wraith', voidType: true,
    hpBase:100, atkBase:26, def:2, spd:17,
    lore:'Born from a block of corrupted memory. Attacks by injecting null bytes directly into the target\'s render stream.',
    dropItem: 'mp_crystal', dropChance: 0.40,
    moves:['Null Injection','Phase Shift','Memory Wipe'],
    xpReward: 55,
  },

  // CAVE (tier 2)
  cave_crawler: {
    id:'cave_crawler', name:'CAVE CRAWLER',
    tier:2, sprite:'golem', voidType: false,
    hpBase:140, atkBase:22, def:8, spd:5,
    lore:'Not void — simply ancient. Born from the original render-matter of the cave walls. Territorial. Dangerous. Not evil.',
    dropItem: 'potion', dropChance: 0.50,
    moves:['Stone Slam','Pixel Grind','Cave Crush'],
    xpReward: 70,
  },
  cave_guardian: {
    id:'cave_guardian', name:'CAVE GUARDIAN',
    tier:2, sprite:'guardian', boss:true, voidType: true,
    hpBase:380, atkBase:36, def:10, spd:6,
    lore:'Once called Keeper. The first autonomous being rendered on the Grid. Corrupted by NULLBYTE. Something of the original still flickers within its hollow chest.',
    dropItem: 'void_core', dropChance: 1.0,
    questDrop: { questId:'ch2_cave', stepId:'defeat_guardian' },
    moves:['Flame Corruption','Grid Slam','Consume Render','Hollow Roar'],
    preText: 'The Cave Guardian turns. Deep within its hollow eyes, the original Render Flame still flickers. Then the VOID overwhelms it.',
    xpReward: 280,
  },

  // VOID LANDS (tier 3)
  void_hulk: {
    id:'void_hulk', name:'VOID HULK',
    tier:3, sprite:'void_heavy', voidType: true,
    hpBase:280, atkBase:42, def:12, spd:5,
    lore:'A VOID construct built from entire city blocks. Slow. Massive. Catastrophically powerful. You can hear consumed pixels screaming inside it.',
    dropItem: 'void_core', dropChance: 0.60,
    moves:['Block Crush','Pixel Storm','Total Erasure'],
    xpReward: 120,
  },
  null_specter: {
    id:'null_specter', name:'NULL SPECTER',
    tier:3, sprite:'wraith', voidType: true,
    hpBase:200, atkBase:55, def:4, spd:20,
    lore:'A VOID assassin unit. Moves faster than the chain can record. You won\'t see it until it\'s already inside your render signature.',
    dropItem: 'mp_crystal', dropChance: 0.50,
    moves:['Null Injection','Phase Strike','Signature Rip'],
    xpReward: 130,
  },

  // CITADEL (tier 3-4)
  void_elite: {
    id:'void_elite', name:'VOID ELITE',
    tier:3, sprite:'void_heavy', voidType: true,
    hpBase:320, atkBase:50, def:16, spd:12,
    lore:'Hand-built by NULLBYTE from his most loyal converts. Each one contains a thousand consumed pixels. Each one remembers what it used to be.',
    dropItem: 'full_render', dropChance: 0.20,
    moves:['Command: Corrupt','Null Protocol','Bit Bomb'],
    xpReward: 160,
  },
  void_commander: {
    id:'void_commander', name:'VOID COMMANDER',
    tier:4, sprite:'commander', boss:true, voidType: true,
    hpBase:560, atkBase:58, def:16, spd:14,
    lore:'NULLBYTE\'s general. Three hundred render-cycles old. Has never been defeated. Speaks in null characters. Is understood perfectly.',
    dropItem: 'full_render', dropChance: 0.80,
    questDrop: { questId:'finale', stepId:'defeat_commander' },
    moves:['Command: Corrupt','Total Erasure','Bit Bomb','Zero Protocol'],
    preText: 'THE COMMANDER: "You have come farther than most. That ends now."',
    xpReward: 500,
  },
  nullbyte: {
    id:'nullbyte', name:'NULLBYTE',
    tier:5, sprite:'nullbyte', boss:true, finalBoss:true, voidType: true,
    hpBase:1200, atkBase:80, def:22, spd:20,
    lore:'NULLBYTE. The Void made manifest. Pixel Zero — the first bit ever rendered, falling to corruption before the Grid could wake. He wants everything back to the nothing he came from.',
    dropItem: null,
    moves:['Total Void','Pixel Storm','Null Protocol','Consume Reality','Zero Hour'],
    preText: 'NULLBYTE: "You are too late. 47% of the Grid is gone. I admire you — you are the last Normie to resist. Let me take those 1,600 pixels personally."',
    postText: 'As NULLBYTE falls, consumed pixels stream back into the Grid. Millions of tiny squares of light. Each one a restored soul. The first pixel re-lit is yours.',
    xpReward: 2000,
  },
};

// ─── MAP CONFIGS ─────────────────────────────────────────────
export const MAPS = {
  home_up: {
    id:'home_up', name:'Your Bedroom',
    encounterRate: 0, ambience:'quiet',
    connections: [],
  },
  home_down: {
    id:'home_down', name:'Home — Downstairs',
    encounterRate: 0, ambience:'quiet',
    connections: [],
  },
  overworld: {
    id:'overworld', name:'Render Fields',
    encounterRate: 0.040, ambience:'open',
    subZones: [
      { name:'RENDER STREET', x0:10, x1:22, y0:18, y1:28, tier:0 },
      { name:'PIXEL PLAINS',  x0:0,  x1:35, y0:0,  y1:48, tier:0 },
      { name:'DARK MARGINS',  x0:35, x1:48, y0:0,  y1:35, tier:1 },
    ],
    connections: [
      { destMap:'home_up',  destX:4, destY:7, triggerX:16, triggerY:22 },
      { destMap:'town',     destX:4, destY:10, triggerX:38, triggerY:24 },
    ],
  },
  town: {
    id:'town', name:'Pixel Town',
    encounterRate: 0, ambience:'safe',
    connections: [
      { destMap:'overworld', destX:37, destY:24, triggerX:2, triggerY:10 },
      { destMap:'cave',      destX:4, destY:2,   triggerX:12, triggerY:18 },
    ],
  },
  cave: {
    id:'cave', name:'Cave of First Bits',
    encounterRate: 0.065, ambience:'dark', requiredItem:'render_key',
    connections: [
      { destMap:'town',      destX:12, destY:17, triggerX:4, triggerY:1 },
      { destMap:'void_lands',destX:4,  destY:2,  triggerX:18, triggerY:15 },
    ],
  },
  void_lands: {
    id:'void_lands', name:'Corrupted Lands',
    encounterRate: 0.085, voidDamage:true, ambience:'corrupted',
    connections: [
      { destMap:'cave',    destX:17, destY:14, triggerX:4,  triggerY:3 },
      { destMap:'citadel', destX:4,  destY:14, triggerX:28, triggerY:14 },
    ],
  },
  citadel: {
    id:'citadel', name:'Void Citadel',
    encounterRate: 0.075, voidDamage:false, ambience:'dark',
    connections: [
      { destMap:'void_lands', destX:27, destY:14, triggerX:2, triggerY:14 },
    ],
  },
};
