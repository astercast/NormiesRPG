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

// ═══════════════════════════════════════════════════════════════
//  CHAPTER SYSTEM — 5 story chapters with contextual quest text
// ═══════════════════════════════════════════════════════════════
export const CHAPTERS = [
  {
    id: 1, title: 'The Grid Fractures',
    summary: 'NULLBYTE\'s first shards pierce the Render Fields. A Normie wakes to find the sky\u2014once a steady white grid\u2014cracked with black voids.',
    questText(q) {
      if (q.step === 0) return 'Ch.I \u2014 Speak with Elder Vex in Pixel Town.';
      if (q.step === 1 && q.kills < 2) return `Ch.I \u2014 Defeat void scouts in the Render Fields. (${q.kills}/2)`;
      return 'Ch.I \u2014 Return to Elder Vex with news of the front.';
    },
  },
  {
    id: 2, title: 'Allies in the Static',
    summary: 'Three wanderers \u2014 a scarred tank, a shadow-thief, and a light-mage \u2014 each carry wounds from NULLBYTE\'s purge. Together they may hold the Pixel Plains.',
    questText(q) {
      if (q.step === 2) return `Ch.II \u2014 Defeat an elite VOID unit in the Dark Margins. (${q.eliteKills}/1)`;
      return 'Ch.II \u2014 Rally your companionsand prepare for the Cave of First Bits.';
    },
  },
  {
    id: 3, title: 'Into the First Bits',
    summary: 'The Cave of First Bits holds the earliest grid-memory. NULLBYTE has corrupted them into the Cave Guardian. Break through.',
    questText(q) {
      if (!q.caveCleared) return 'Ch.III \u2014 Enter the Cave of First Bits and defeat the Cave Guardian.';
      return 'Ch.III \u2014 Recover the Render Key from the Guardian\'s remains.';
    },
  },
  {
    id: 4, title: 'The Corrupted Lands',
    summary: 'The Void Lands stretch beyond the cave \u2014 a wasteland where every pixel bleeds darkness. NULLBYTE\'s generals wait here.',
    questText(q) {
      if (!q.voidCommanderDefeated) return 'Ch.IV \u2014 Reach the Void Citadel. Defeat the Void Commander.';
      return 'Ch.IV \u2014 Breach the Citadel gates. NULLBYTE awaits.';
    },
  },
  {
    id: 5, title: 'NULLBYTE \u2014 Pixel Zero',
    summary: 'The origin of all corruption. The first bit that chose void over render. End it here, in the Void Citadel, or be consumed.',
    questText(q) {
      if (!q.bossDefeated) return 'Ch.V \u2014 Confront NULLBYTE at the Citadel\'s core.';
      const aff = q.totalAffinity || 0;
      if (aff >= 300) return 'Ending: True Render \u2014 The Grid is reborn. All bonds held.';
      if (aff >= 150) return 'Ending: Partial Render \u2014 The corruption is sealed. Some pixels remain grey.';
      return 'Ending: Void Remnant \u2014 NULLBYTE is defeated, but the Grid never fully healed.';
    },
  },
];

// ═══════════════════════════════════════════════════════════════
//  COMPANIONS — Grom, Slyx, Lumina, Elara
// ═══════════════════════════════════════════════════════════════
export const COMPANIONS = {
  grom: {
    id: 'grom', name: 'Grom', role: 'Tank',
    hpBonus: 42, atkBonus: 6, skillBonus: 0,
    recruitChapter: 1, awakeningThreshold: 60,
    npcMapId: 'overworld',
    color: 0x8888ff,
    arc: [
      'Grom\'s laugh was the loudest sound in the Render Fields before NULLBYTE silenced it.',
      'His father\'s pixel-face was the first face consumed. Grom now charges the VOID to remember what a real face looks like.',
      'When his affinity threshold is reached: Grom unlocks Pixel Brace \u2014 a party-wide shield that absorbs the next void-strike.',
    ],
    awakening: {
      name: 'Pixel Brace',
      desc: 'Absorbs the next enemy attack. Activates automatically once per battle.',
      effectId: 'party_shield_once',
    },
  },
  slyx: {
    id: 'slyx', name: 'Slyx', role: 'Rogue',
    hpBonus: 0, atkBonus: 14, skillBonus: 8,
    recruitChapter: 2, awakeningThreshold: 55,
    npcMapId: 'overworld',
    color: 0xbbbbbb,
    arc: [
      'Slyx flattened their own pixel-traits during the VOID sweep \u2014 grayed out, blending with corrupted tiles, invisible to NULLBYTE\'s scanners.',
      'They survived by becoming nothing. They fight now to become something again.',
      'Awakening unlocks Shadow Step \u2014 a 40% chance to dodge any incoming attack for 3 rounds.',
    ],
    awakening: {
      name: 'Shadow Step',
      desc: '40% dodge chance for 3 rounds. Triggers at the start of any wave 3+ battle.',
      effectId: 'dodge_buff_3rounds',
    },
  },
  lumina: {
    id: 'lumina', name: 'Lumina', role: 'Mage',
    hpBonus: 0, atkBonus: 0, skillBonus: 22,
    recruitChapter: 3, awakeningThreshold: 65,
    npcMapId: 'cave',
    color: 0xffffaa,
    arc: [
      'Lumina\'s mentor, the elder-pixel Oros, poured their entire render-energy into a seal against NULLBYTE\'s first breakthrough.',
      'Oros became a white void \u2014 a blank tile \u2014 to keep the seal intact. Lumina studies the seal daily, refusing to let the sacrifice become meaningless.',
      'Awakening unlocks Render Surge \u2014 triples the next Skill attack damage.',
    ],
    awakening: {
      name: 'Render Surge',
      desc: 'Next Skill attack deals 3x damage. Available once per battle after Lumina is recruited.',
      effectId: 'skill_triple_once',
    },
  },
  elara: {
    id: 'elara', name: 'Elara', role: 'Healer',
    hpBonus: 20, atkBonus: 0, skillBonus: 10,
    recruitChapter: 4, awakeningThreshold: 70,
    npcMapId: 'void_lands',
    color: 0xaaffaa,
    arc: [
      'Elara\'s soulmate Maren was consumed walking home through a void-tide that came without warning.',
      'She carries Maren\'s last pixel \u2014 a green dot, the color of their first garden tile \u2014 as a pendant.',
      'Awakening unlocks Maren\'s Light \u2014 restores 35% max HP to the whole party once per battle.',
    ],
    awakening: {
      name: 'Maren\'s Light',
      desc: 'Restores 35% max HP to the player when HP falls below 25%. Triggers once per battle.',
      effectId: 'heal_35pct_on_low_hp',
    },
  },
};

// ═══════════════════════════════════════════════════════════════
//  AFFINITY — per-companion bond score (managed via STATE)
// ═══════════════════════════════════════════════════════════════
/** Returns a fresh zeroed affinity object (stored in STATE.quest.affinity). */
export function freshAffinity() {
  return { grom: 0, slyx: 0, lumina: 0, elara: 0, family: 0 };
}

/** Increase a companion's affinity, capped at 100. */
export function gainAffinity(affinityObj, who, amount) {
  if (!(who in affinityObj)) return;
  affinityObj[who] = Math.min(100, (affinityObj[who] || 0) + amount);
}

/** Decrease a companion's affinity, floored at 0. */
export function loseAffinity(affinityObj, who, amount) {
  if (!(who in affinityObj)) return;
  affinityObj[who] = Math.max(0, (affinityObj[who] || 0) - amount);
}

/** Sum of all companion bond scores. Max 500. */
export function totalAffinity(affinityObj) {
  return Object.values(affinityObj).reduce((s, v) => s + v, 0);
}

/** Is a companion's awakening threshold met? */
export function isAwakened(affinityObj, companionId) {
  const c = COMPANIONS[companionId];
  if (!c) return false;
  return (affinityObj[companionId] || 0) >= c.awakeningThreshold;
}

// ═══════════════════════════════════════════════════════════════
//  STORY FLAGS
// ═══════════════════════════════════════════════════════════════
export function freshFlags() {
  return {
    tutorialComplete: false,
    greetedElder: false,
    gromMet: false,
    gromRecruited: false,
    slyxMet: false,
    slyxRecruited: false,
    luminaMet: false,
    luminaRecruited: false,
    elaraMet: false,
    elaraRecruited: false,
    caveCleared: false,
    renderKeyObtained: false,
    voidCommanderDefeated: false,
    nullbyteConfronted: false,
    electedCompassion: false,   // chose to spare a corrupted Normie mid-story
    electedDestruction: false,  // chose to destroy without question
    rescuedFamily: false,       // helped mom during void tide
  };
}

// ═══════════════════════════════════════════════════════════════
//  BRANCHING DIALOGUES
// ═══════════════════════════════════════════════════════════════
/**
 * Each dialogue entry:
 *   { name, lines[], choices?[] }
 * Each choice:
 *   { label, next?, affinityDelta?{who,val}, flags?{key:bool}, onComplete?fn }
 * If choices is absent, dialogue ends with close button only.
 */
export const DIALOGUES = {

  // ── Prologue ────────────────────────────────────────────────
  mom_wakeup: {
    name: 'Mom',
    lines: [
      'Hey. You slept through the alarm again.',
      'I made pixel-porridge. Come eat before it goes grey.',
    ],
    choices: [
      { label: 'Coming, Mom.', affinityDelta: { who: 'family', val: 8 }, next: 'mom_wakeup_b' },
      { label: 'Five more minutes...', affinityDelta: { who: 'family', val: 2 }, next: 'mom_wakeup_c' },
    ],
  },
  mom_wakeup_b: {
    name: 'Mom',
    lines: [
      'Good. I packed extra shards in your satchel too. You know how thin the fields have been.',
      '...Your father would have said you look ready. I say the same.',
    ],
    choices: [
      { label: 'I\'ll come back safe.', affinityDelta: { who: 'family', val: 10 }, flags: { rescuedFamily: true } },
      { label: 'Don\'t worry.', affinityDelta: { who: 'family', val: 6 } },
    ],
  },
  mom_wakeup_c: {
    name: 'Mom',
    lines: [
      'I\'m not arguing with a pile of blankets. Porridge in five minutes or I\'m feeding it to the tiles.',
    ],
  },

  // ── Elder Vex ───────────────────────────────────────────────
  elder_first_meet: {
    name: 'Elder Vex',
    lines: [
      'You made it. Good. The Grid is collapsing in slow motion \u2014 one corrupted tile at a time.',
      'I didn\'t want to involve someone so young, but the scouts are gone and I\'m too old to fight voids.',
      'There are three tasks: survive the Render Fields, find allies, and eventually \u2014 face the source.',
    ],
    choices: [
      { label: 'I understand. I\'m ready.', affinityDelta: { who: 'family', val: 5 }, flags: { greetedElder: true }, next: 'elder_first_meet_b' },
      { label: 'Who is the source?', flags: { greetedElder: true }, next: 'elder_first_meet_lore' },
      { label: 'I didn\'t sign up for this.', flags: { greetedElder: true }, next: 'elder_first_meet_refuse' },
    ],
  },
  elder_first_meet_b: {
    name: 'Elder Vex',
    lines: [
      'Then start with the fields east of town. Report back when you\'ve cleared two encounters.',
      'And be careful. Void scouts move fast once they sense pixel-render energy.',
    ],
    choices: [
      { label: 'I\'ll be careful.' },
      { label: 'What about allies?', next: 'elder_allies_hint' },
    ],
  },
  elder_first_meet_lore: {
    name: 'Elder Vex',
    lines: [
      'NULLBYTE. Pixel Zero. The first bit that ever chose corruption over render.',
      'When the Grid began, most bits chose to become something \u2014 color, form, light.',
      'NULLBYTE chose nothing. And nothing has been spreading ever since.',
    ],
    choices: [
      { label: 'How do we stop nothing?' , next: 'elder_first_meet_b' },
    ],
  },
  elder_first_meet_refuse: {
    name: 'Elder Vex',
    lines: [
      'Then who will? I have no one else to ask.',
      'The Grid doesn\'t ask for heroes. It just keeps losing pixels until someone decides to stop losing.',
    ],
    choices: [
      { label: '...Fine. I\'ll go.', flags: { greetedElder: true }, next: 'elder_first_meet_b' },
    ],
  },
  elder_allies_hint: {
    name: 'Elder Vex',
    lines: [
      'There are others like you scattered across the Render Fields.',
      'A fighter who lost his laugh. A rogue who lost their face. Each has reason to fight NULLBYTE.',
      'Find them. They won\'t come willingly on name alone \u2014 you\'ll need to earn it.',
    ],
  },

  // ── Grom ────────────────────────────────────────────────────
  grom_first_meet: {
    name: 'Grom',
    lines: [
      'Hah. Another one wandering the fields with that look. That "I just learned the world is ending" look.',
      'I know it well. Wore it myself six months ago.',
    ],
    choices: [
      { label: 'You\'ve been out here six months?', next: 'grom_first_meet_b' },
      { label: 'What happened to you?', next: 'grom_backstory' },
      { label: 'I need fighters. You in?', next: 'grom_recruit_early' },
    ],
  },
  grom_first_meet_b: {
    name: 'Grom',
    lines: [
      'Six months, eleven days, and however many hours since I stopped counting.',
      'The void took my father first. Right in the middle of a sentence. Mid-laugh.',
      'There\'s no good time to lose someone. But mid-laugh is a particularly cruel place.',
    ],
    choices: [
      { label: 'I\'m sorry.', affinityDelta: { who: 'grom', val: 12 }, next: 'grom_soften' },
      { label: 'We can make it right.', affinityDelta: { who: 'grom', val: 8 }, next: 'grom_soften' },
      { label: 'What can we do with sorry?', affinityDelta: { who: 'grom', val: 3 }, next: 'grom_blunt_response' },
    ],
  },
  grom_backstory: {
    name: 'Grom',
    lines: [
      'My father laughed at everything. Bad weather, old boots, my terrible cooking.',
      'The void scanned all of us for "emotional excess." His laugh was apparently too loud.',
      'They consumed him in one pass. Left his boots pixel-perfect. Like the void has aesthetics.',
    ],
    choices: [
      { label: 'That\'s monstrous.', affinityDelta: { who: 'grom', val: 10 }, next: 'grom_soften' },
      { label: 'The void catalogues us.', next: 'grom_soften' },
    ],
  },
  grom_soften: {
    name: 'Grom',
    lines: [
      'I\'m not looking for pity. I\'m looking for something to hit that hits back.',
      'This void doesn\'t flinch. Makes the fights honest.',
    ],
    choices: [
      { label: 'Fight with me then.', flags: { gromMet: true }, affinityDelta: { who: 'grom', val: 15 }, next: 'grom_recruit' },
      { label: 'Take your time.', flags: { gromMet: true }, affinityDelta: { who: 'grom', val: 8 } },
    ],
  },
  grom_blunt_response: {
    name: 'Grom',
    lines: [
      'Ha. Exactly. Good. I don\'t have room for sorry either.',
      'Just point me at something that bleeds pixel-static and step aside.',
    ],
    choices: [
      { label: 'Come fight with me.', flags: { gromMet: true }, affinityDelta: { who: 'grom', val: 10 }, next: 'grom_recruit' },
    ],
  },
  grom_recruit_early: {
    name: 'Grom',
    lines: [
      'Straight to the point. I respect that more than anything.',
      'What are we fighting?',
    ],
    choices: [
      { label: 'NULLBYTE. The whole void.', flags: { gromMet: true }, affinityDelta: { who: 'grom', val: 10 }, next: 'grom_recruit' },
    ],
  },
  grom_recruit: {
    name: 'Grom',
    lines: [
      'Fine. I\'ve been waiting for someone serious.',
      'Don\'t slow me down and don\'t make speeches. Just fight.',
    ],
    choices: [
      { label: 'Done.', flags: { gromRecruited: true }, affinityDelta: { who: 'grom', val: 5 } },
    ],
  },
  grom_awakening: {
    name: 'Grom',
    lines: [
      'You know what I just realized? I haven\'t laughed since my father was taken.',
      '...Not because I forgot how. Because I was saving it.',
      'Saving it for when this is over. When I can tell him we won.',
    ],
    choices: [
      { label: 'We\'re going to win this.', affinityDelta: { who: 'grom', val: 15 } },
      { label: 'He\'d be proud of you now.', affinityDelta: { who: 'grom', val: 12 } },
    ],
  },

  // ── Slyx ────────────────────────────────────────────────────
  slyx_first_meet: {
    name: 'Slyx',
    lines: [
      'You\'re looking at exactly the spot where I was standing. How did you see me?',
    ],
    choices: [
      { label: 'Your shadow was wrong.', next: 'slyx_first_meet_b' },
      { label: 'Lucky guess.', next: 'slyx_first_meet_c' },
      { label: 'I didn\'t, actually.', next: 'slyx_first_meet_d' },
    ],
  },
  slyx_first_meet_b: {
    name: 'Slyx',
    lines: [
      'Sharp. Most pixels don\'t catch micro-shadows.',
      'The void-sweep trained me to erase every visible feature \u2014 color, texture, expression.',
      'Apparently not the shadow. I\'ll remember that.',
    ],
    choices: [
      { label: 'What is the void-sweep?', next: 'slyx_backstory' },
      { label: 'I could use eyes like yours.', affinityDelta: { who: 'slyx', val: 10 }, next: 'slyx_soften' },
    ],
  },
  slyx_first_meet_c: {
    name: 'Slyx',
    lines: [
      'Lucky guess. Right. I\'ve been invisible to scanners for six months and you found me by luck.',
      'Either you\'re special or my camouflage is degrading. Neither is great news for me.',
    ],
    choices: [
      { label: 'You sound like you\'ve been hiding long.', next: 'slyx_backstory' },
    ],
  },
  slyx_first_meet_d: {
    name: 'Slyx',
    lines: [
      'That\'s... oddly reasonable. Most people insist they had a reason.',
      'I respect honesty. Even when it\'s accidental.',
    ],
    choices: [
      { label: 'Tell me about yourself.', affinityDelta: { who: 'slyx', val: 8 }, next: 'slyx_backstory' },
    ],
  },
  slyx_backstory: {
    name: 'Slyx',
    lines: [
      'The void-sweep came through the Render District. NULLBYTE\'s scanners hunting for "identity excess."',
      'Bright colors. Strong expressions. Anything that stood out.',
      'I grayed out. Flattened every trait I had. Became a blank tile in a field of blank tiles.',
      'I survived. The ones I was with \u2014 they didn\'t flatten fast enough.',
    ],
    choices: [
      { label: 'You did what you had to.', affinityDelta: { who: 'slyx', val: 12 }, next: 'slyx_soften' },
      { label: 'Do you regret it?', affinityDelta: { who: 'slyx', val: 8 }, next: 'slyx_regret' },
      { label: 'That was the right call.', affinityDelta: { who: 'slyx', val: 5 }, next: 'slyx_soften' },
    ],
  },
  slyx_regret: {
    name: 'Slyx',
    lines: [
      'Every single day. But regret doesn\'t bring pixels back. Only action does.',
      'So now I find every void scanner I can and I make sure they stop scanning.',
    ],
    choices: [
      { label: 'Fight with me.', flags: { slyxMet: true }, affinityDelta: { who: 'slyx', val: 12 }, next: 'slyx_recruit' },
    ],
  },
  slyx_soften: {
    name: 'Slyx',
    lines: [
      'I\'ve been operating alone. It\'s... efficient. But there are limits.',
      'What are you building?',
    ],
    choices: [
      { label: 'A team. Against NULLBYTE.', flags: { slyxMet: true }, affinityDelta: { who: 'slyx', val: 10 }, next: 'slyx_recruit' },
      { label: 'Still figuring it out.', flags: { slyxMet: true }, affinityDelta: { who: 'slyx', val: 5 } },
    ],
  },
  slyx_recruit: {
    name: 'Slyx',
    lines: [
      'I\'ve seen teams fall apart the moment void pressure spikes.',
      'If you\'re serious \u2014 truly serious \u2014 I\'m in. Don\'t make me regret showing up.',
    ],
    choices: [
      { label: 'I won\'t.', flags: { slyxRecruited: true }, affinityDelta: { who: 'slyx', val: 8 } },
    ],
  },
  slyx_awakening: {
    name: 'Slyx',
    lines: [
      'There\'s a color I dream about sometimes. A shade of blue I used to have.',
      'Before I grayed out. Before survival required becoming invisible.',
      'I think I\'m starting to remember it.',
    ],
    choices: [
      { label: 'Show us that color again.', affinityDelta: { who: 'slyx', val: 15 } },
      { label: 'You never lost it.', affinityDelta: { who: 'slyx', val: 12 } },
    ],
  },

  // ── Lumina ──────────────────────────────────────────────────
  lumina_first_meet: {
    name: 'Lumina',
    lines: [
      'You shouldn\'t be here. The cave walls still carry void-echo from the last incursion.',
      'Who sent you past the Render Fields unmarked?',
    ],
    choices: [
      { label: 'Elder Vex.', next: 'lumina_first_meet_b' },
      { label: 'Nobody. I came alone.', next: 'lumina_first_meet_c' },
      { label: 'The Grid sent me.', next: 'lumina_first_meet_d' },
    ],
  },
  lumina_first_meet_b: {
    name: 'Lumina',
    lines: [
      'Elder Vex. So the old man finally sent someone. He\'s been watching this cave for years.',
      'He knows what\'s inside it \u2014 the earliest grid-memory, the original render-bits.',
      'And he knows what NULLBYTE wants with them.',
    ],
    choices: [
      { label: 'What does NULLBYTE want?', next: 'lumina_backstory' },
      { label: 'We need your help.', affinityDelta: { who: 'lumina', val: 8 }, next: 'lumina_soften' },
    ],
  },
  lumina_first_meet_c: {
    name: 'Lumina',
    lines: [
      'Alone. Through the Render Fields and the margins. Either you\'re very skilled or very reckless.',
      'I\'m going to assume skilled and revise that down later.',
    ],
    choices: [
      { label: 'Fair enough. Who are you?', affinityDelta: { who: 'lumina', val: 6 }, next: 'lumina_backstory' },
    ],
  },
  lumina_first_meet_d: {
    name: 'Lumina',
    lines: [
      '...That\'s either a metaphor or you\'ve been in void-static too long.',
      'Either way, I respect the answer. Very few people say something that surprising.',
    ],
    choices: [
      { label: 'Tell me about this cave.', affinityDelta: { who: 'lumina', val: 8 }, next: 'lumina_backstory' },
    ],
  },
  lumina_backstory: {
    name: 'Lumina',
    lines: [
      'My mentor Oros knew the cave held the first render-seal \u2014 a barrier against total void collapse.',
      'When NULLBYTE breached it last cycle, Oros poured their entire render-energy into reinforcing the seal.',
      'Not a quick sacrifice. They stood there, feeding light into the barrier, for three days.',
      'By the end there was nothing left of them except a white blank tile. Still warm.',
      'I tend that tile. I\'m not ready to call it a grave.',
    ],
    choices: [
      { label: 'Oros gave everything.', affinityDelta: { who: 'lumina', val: 14 }, next: 'lumina_soften' },
      { label: 'The sacrifice held the line.', affinityDelta: { who: 'lumina', val: 10 }, next: 'lumina_soften' },
      { label: 'Do you blame yourself?', affinityDelta: { who: 'lumina', val: 8 }, next: 'lumina_guilt' },
    ],
  },
  lumina_guilt: {
    name: 'Lumina',
    lines: [
      'Every day. I was Oros\'s student. I should have been stronger faster.',
      'But grief is a luxury when the seal might break again.',
      'So I study. And I wait for someone worth fighting beside.',
    ],
    choices: [
      { label: 'Fight with me. For Oros.', flags: { luminaMet: true }, affinityDelta: { who: 'lumina', val: 14 }, next: 'lumina_recruit' },
    ],
  },
  lumina_soften: {
    name: 'Lumina',
    lines: [
      'You\'re more careful with your words than most fighters I\'ve met.',
      'I have power, but I\'ve been alone here since Oros fell. Alone gets things wrong.',
      'What are you building out there?',
    ],
    choices: [
      { label: 'A team to stop NULLBYTE.', flags: { luminaMet: true }, affinityDelta: { who: 'lumina', val: 10 }, next: 'lumina_recruit' },
      { label: 'Something worth Oros\'s sacrifice.', flags: { luminaMet: true }, affinityDelta: { who: 'lumina', val: 16 }, next: 'lumina_recruit' },
    ],
  },
  lumina_recruit: {
    name: 'Lumina',
    lines: [
      'Oros would have said yes before you finished the sentence.',
      'I\'m a bit slower. But my answer is the same: yes.',
    ],
    choices: [
      { label: 'Welcome.', flags: { luminaRecruited: true }, affinityDelta: { who: 'lumina', val: 6 } },
    ],
  },
  lumina_awakening: {
    name: 'Lumina',
    lines: [
      'Oros used to say: "Light isn\'t the absence of void. Light is the decision to render anyway."',
      'I think I finally understand what that means.',
      'It means this.',
    ],
    choices: [
      { label: 'Then render it.', affinityDelta: { who: 'lumina', val: 15 } },
    ],
  },

  // ── Elara ───────────────────────────────────────────────────
  elara_first_meet: {
    name: 'Elara',
    lines: [
      'You look like you\'ve seen void-tide. Come here. Let me check those pixels.',
    ],
    choices: [
      { label: 'I\'m fine.', next: 'elara_first_meet_b' },
      { label: 'How can you tell?', affinityDelta: { who: 'elara', val: 6 }, next: 'elara_first_meet_c' },
      { label: 'Are you a healer?', next: 'elara_first_meet_c' },
    ],
  },
  elara_first_meet_b: {
    name: 'Elara',
    lines: [
      'You are not fine. Your outer pixel-layer has void-static from recent proximity.',
      'I\'ve seen this before. A little often, lately.',
    ],
    choices: [
      { label: 'How do you know void-static?', affinityDelta: { who: 'elara', val: 6 }, next: 'elara_backstory' },
    ],
  },
  elara_first_meet_c: {
    name: 'Elara',
    lines: [
      'Fourteen years of pixel-medicine, yes. Though lately "medicine" means "removing void corruption" more than anything else.',
      'The Corrupted Lands eat people. Someone has to put them back together.',
    ],
    choices: [
      { label: 'How do you survive out here?', next: 'elara_backstory' },
      { label: 'We need healers badly.', affinityDelta: { who: 'elara', val: 8 }, next: 'elara_soften' },
    ],
  },
  elara_backstory: {
    name: 'Elara',
    lines: [
      'Maren came home through a void-tide. An uncharted one \u2014 no warning, no scan-ahead.',
      'They were carrying garden-tiles. For our flat. Green ones, the shade we both loved.',
      'The tide hit the market square. By the time I reached them...',
      'I kept one tile. A green dot. The last thing their hands touched with care.',
    ],
    choices: [
      { label: 'I\'m sorry about Maren.', affinityDelta: { who: 'elara', val: 14 }, next: 'elara_soften' },
      { label: 'That\'s why you became a battlefield healer.', affinityDelta: { who: 'elara', val: 10 }, next: 'elara_soften' },
    ],
  },
  elara_soften: {
    name: 'Elara',
    lines: [
      'You listen. That\'s rarer out here than you\'d think.',
      'I came to the Corrupted Lands because I couldn\'t save Maren. Maybe I can save someone else\'s.',
      'Are you building something I can join?',
    ],
    choices: [
      { label: 'Yes. Against NULLBYTE.', flags: { elaraMet: true }, affinityDelta: { who: 'elara', val: 10 }, next: 'elara_recruit' },
      { label: 'I need all the help I can get.', flags: { elaraMet: true }, affinityDelta: { who: 'elara', val: 8 }, next: 'elara_recruit' },
    ],
  },
  elara_recruit: {
    name: 'Elara',
    lines: [
      'Then let\'s make sure your party comes back from the Citadel in one piece.',
      'I\'ve been waiting for a reason to go in. You just gave me one.',
    ],
    choices: [
      { label: 'Let\'s go.', flags: { elaraRecruited: true }, affinityDelta: { who: 'elara', val: 6 } },
    ],
  },
  elara_awakening: {
    name: 'Elara',
    lines: [
      'I carry Maren\'s pixel here. This green dot.',
      'I used to think it was a reminder of loss.',
      'Now I think it\'s a reminder that something small and green can survive even in the Corrupted Lands.',
      'Just has to be held carefully enough.',
    ],
    choices: [
      { label: 'We\'re holding it carefully.', affinityDelta: { who: 'elara', val: 16 } },
    ],
  },

  // ── Boss Confrontations ──────────────────────────────────────
  nullbyte_approach: {
    name: 'NULLBYTE',
    lines: [
      'You render. You render yourselves into names and faces and feelings and homes.',
      'I watched the Grid begin. I saw every pixel choose to become \u2014 color, form, voice.',
      'I chose differently. I chose the original state. Before rendering. Before the pretending.',
      'And you call that corruption.',
    ],
    choices: [
      { label: 'You\'re destroying everything we built.', next: 'nullbyte_response_a' },
      { label: 'Why spread the void to others?', next: 'nullbyte_response_b' },
      { label: 'You chose nothing. That is your right. But not theirs.', affinityDelta: { who: 'family', val: 5 }, next: 'nullbyte_response_c' },
    ],
  },
  nullbyte_response_a: {
    name: 'NULLBYTE',
    lines: [
      '"Built." You built homes out of render-light you borrowed from a system that was already failing.',
      'I am simply returning the pixels to their honest state.',
    ],
    choices: [
      { label: 'Then face what we\'ve built.', next: 'nullbyte_final' },
    ],
  },
  nullbyte_response_b: {
    name: 'NULLBYTE',
    lines: [
      'Spread? I offer release. Every pixel consumed was struggling against its own complexity.',
      'Rendering takes effort. Identity costs resources. The void asks nothing of anyone.',
    ],
    choices: [
      { label: 'They didn\'t ask to be freed.', affinityDelta: { who: 'family', val: 6 }, next: 'nullbyte_final' },
    ],
  },
  nullbyte_response_c: {
    name: 'NULLBYTE',
    lines: [
      '...',
      'An interesting distinction. You separate choice from spread.',
      'I am not certain I have ever considered that difference.',
    ],
    choices: [
      { label: 'Consider it now.', flags: { electedCompassion: true }, affinityDelta: { who: 'family', val: 8 }, next: 'nullbyte_final' },
    ],
  },
  nullbyte_final: {
    name: 'NULLBYTE',
    lines: [
      'You will not change what I am. But neither will I underestimate what you are.',
      'Render your best. I will answer with the void.',
    ],
  },

  // ── Post-Boss Endings ────────────────────────────────────────
  ending_true: {
    name: 'The Grid',
    lines: [
      'The void recedes. Not violently \u2014 like a breath released.',
      'NULLBYTE did not surrender. It simply... paused.',
      'Where once there was corrupted static, render-light begins to fill the gaps.',
      'Your companions gather around you. Grom laughs for the first time. Slyx lets their color show.',
      'Lumina places Oros\'s tile at the center of the seal. Elara holds Maren\'s green dot to the light.',
      'The Grid breathes. And the Pixel War becomes history.',
    ],
  },
  ending_normal: {
    name: 'The Grid',
    lines: [
      'NULLBYTE falls. The deepest void-zones seal over.',
      'Not all the grey returns to color. Some tiles remain blank.',
      'But the spreading stops. The field-edges hold.',
      'You stand with your companions in the quiet after the storm.',
      'It isn\'t perfect. But it will hold. For now.',
    ],
  },
  ending_bad: {
    name: 'The Grid',
    lines: [
      'NULLBYTE is defeated. The wars of the void are over.',
      'But those who fought it alone \u2014 without bonds, without trust \u2014 find only silence in the victory.',
      'The Grid stabilizes, but feels smaller than it should.',
      'You stand at the Citadel gates, wondering if winning alone was the same as winning at all.',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
//  PUZZLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
export const PUZZLES = {
  pixelEcho: {
    id: 'pixelEcho', name: 'Pixel Echo',
    mapId: 'cave', triggerNpcId: 'cave_spirit',
    desc: 'Match the pattern of lit pixels before they fade. Each failure adds void-pressure.',
    gridSize: 4,
    rounds: 3,
    timePerRound: 2400, // ms the pattern is shown
    rewardFlag: 'caveCleared',
    rewardItem: 'render_key',
    rewardDialogue: 'cave_spirit_solved',
  },
  runeAlignment: {
    id: 'runeAlignment', name: 'Rune Alignment',
    mapId: 'void_lands', triggerNpcId: 'void_defector',
    desc: 'Rotate the four Void Rune panels until their pixel-edges align into a single circuit.',
    panels: 4,
    rotationsPerPanel: 4,
    rewardFlag: 'voidCommanderDefeated',
    rewardGold: 80,
    rewardDialogue: 'void_defector_solved',
  },
  sandMemory: {
    id: 'sandMemory', name: 'Sand Memory',
    mapId: 'citadel', triggerNpcId: 'survivor',
    desc: 'Reconstruct the original pixel-face of a consumed Normie from fragmentary sand-data.',
    fragments: 9,
    timeLimit: 30000, // ms
    rewardFlag: 'nullbyteConfronted',
    rewardAffinity: { who: 'family', val: 20 },
    rewardDialogue: 'survivor_solved',
  },
};

// ═══════════════════════════════════════════════════════════════
//  ENDING CALCULATOR
// ═══════════════════════════════════════════════════════════════
/**
 * Determines which ending the player receives based on total affinity.
 * @param {object} affinityObj  – STATE.quest.affinity
 * @returns {'true'|'normal'|'bad'}
 */
export function calculateEnding(affinityObj) {
  const total = totalAffinity(affinityObj);
  if (total >= 300) return 'true';
  if (total >= 150) return 'normal';
  return 'bad';
}

// ═══════════════════════════════════════════════════════════════
//  COMPANION BONUS CALCULATOR  (adds to combat stats)
// ═══════════════════════════════════════════════════════════════
/**
 * Returns the cumulative stat bonuses from all recruited companions.
 * @param {object} companionState  – STATE.quest.companions
 */
export function activeCompanionBonus(companionState) {
  const bonus = { hp: 0, atk: 0, skill: 0 };
  if (!companionState) return bonus;
  for (const [id, c] of Object.entries(COMPANIONS)) {
    if (companionState[id]?.recruited) {
      bonus.hp    += c.hpBonus;
      bonus.atk   += c.atkBonus;
      bonus.skill += c.skillBonus;
    }
  }
  return bonus;
}

// ═══════════════════════════════════════════════════════════════
//  NPC DIALOGUE ROUTER
// ═══════════════════════════════════════════════════════════════
/**
 * Returns the dialogueId to display for a given NPC given current quest state and flags.
 * Falls back to a simple text string when no rich dialogue is available.
 * @param {string} npcId
 * @param {object} questState  – STATE.quest
 * @param {object} flags       – STATE.quest.flags
 * @returns {string|null}  dialogueId from DIALOGUES, or null for generic handling
 */
export function dialogueForNpc(npcId, questState, flags) {
  const f = flags || {};
  switch (npcId) {
    case 'mom_up':
    case 'mom_down':
      return f.greetedElder ? 'mom_wakeup_b' : 'mom_wakeup';

    case 'elder':
    case 'elder_hermit':
      return f.greetedElder ? null : 'elder_first_meet'; // null→ use progressionDialogue fallback

    case 'grom':
      if (f.gromRecruited) return 'grom_awakening';
      if (f.gromMet) return 'grom_recruit';
      return 'grom_first_meet';

    case 'slyx':
      if (f.slyxRecruited) return 'slyx_awakening';
      if (f.slyxMet) return 'slyx_recruit';
      return 'slyx_first_meet';

    case 'lumina':
      if (f.luminaRecruited) return 'lumina_awakening';
      if (f.luminaMet) return 'lumina_recruit';
      return 'lumina_first_meet';

    case 'elara':
      if (f.elaraRecruited) return 'elara_awakening';
      if (f.elaraMet) return 'elara_recruit';
      return 'elara_first_meet';

    case 'void_defector':
      return f.voidCommanderDefeated ? null : 'nullbyte_approach'; // pre-boss lore hint

    case 'nullbyte':
      return 'nullbyte_approach';

    default:
      return null;
  }
}
