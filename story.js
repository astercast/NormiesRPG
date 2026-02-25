// story.js — THE PIXEL WAR: Lore, quests, NPCs, dialogue

export const LORE = {
  title: "THE PIXEL WAR",
  tagline: "Every dot is a soul. They are coming for ours.",
  intro: [
    "In the beginning, there was only The Grid.",
    "From The Grid, all things were rendered — the mountains, the rivers, the people. Every living thing was woven from pixels: tiny squares of black and white, each one carrying a fragment of consciousness.",
    "The Normies were the first rendered beings. 40 by 40 pixels each, stored on the eternal chain of memory called The Ledger. They could not be erased. They could not be changed. They simply existed, perfect in their imperfection.",
    "Then came the VOID.",
    "Nobody knows where it started. Some say a corrupted block deep in the chain. Others say it was always there, lurking in the spaces between pixels — the darkness that exists when a bit flips from one to zero.",
    "The VOID General, NULLBYTE, discovered that pixels could be consumed. Drained of their consciousness and converted into raw computation power for the VOID's expansion. One by one, pixels began going dark.",
    "The corrupted spread like static across a dying screen.",
    "You are Normie #0001. You woke up this morning with a strange feeling — like a pixel inside you was vibrating. The Oracle called it the RENDER MARK. A sign.",
    "The world is being erased. You are the only one who can rewrite it."
  ],
};

// ─── QUEST SYSTEM ───────────────────────────────────────────
export const QUESTS = {
  prologue: {
    id: 'prologue',
    name: 'The First Render',
    desc: 'Leave your bedroom and speak to your neighbor Pix.',
    steps: [
      { id: 'leave_home', text: 'Leave your home', done: false },
      { id: 'talk_pix',   text: 'Speak to Pix the Neighbor', done: false },
    ],
    reward: { gold: 0, items: ['compass'], exp: 0 },
    lore: 'You have lived on Render Street your whole life. Today, the static in the air says: it ends here.',
  },
  ch1_find_oracle: {
    id: 'ch1_find_oracle',
    name: 'The Oracle of Bit',
    desc: 'Travel to Pixel Town and find the Oracle.',
    steps: [
      { id: 'reach_town', text: 'Reach Pixel Town', done: false },
      { id: 'talk_oracle', text: 'Speak to the Oracle of Bit', done: false },
    ],
    reward: { gold: 20, items: ['pixel_shard'], exp: 0 },
    lore: 'The Oracle can read the chain itself. She has seen the VOID coming for decades. She has been waiting for you.',
  },
  ch1_bit_shards: {
    id: 'ch1_bit_shards',
    name: 'Fragments of the Grid',
    desc: 'Collect 3 Pixel Shards from fallen Void Scouts in the Plains.',
    steps: [
      { id: 'collect_shards', text: 'Defeat 3 Void Scouts (0/3)', done: false, progress: 0, target: 3 },
    ],
    reward: { gold: 30, items: ['render_key'], exp: 0 },
    lore: 'The Pixel Shards are pieces of the Grid itself — ripped from the terrain by VOID forces. Reassemble them and the Oracle can open the Cave of First Bits.',
  },
  ch2_cave: {
    id: 'ch2_cave',
    name: 'The Cave of First Bits',
    desc: 'Venture into the Cave of First Bits and find the Render Flame.',
    steps: [
      { id: 'enter_cave', text: 'Enter the Cave of First Bits', done: false },
      { id: 'find_flame', text: 'Retrieve the Render Flame', done: false },
      { id: 'defeat_guardian', text: 'Defeat the Cave Guardian', done: false },
    ],
    reward: { gold: 50, items: ['render_flame'], exp: 0 },
    lore: 'The Render Flame is said to be the first pixel ever lit. With it, corrupted pixels can be restored. NULLBYTE wants it destroyed.',
  },
  ch3_void_march: {
    id: 'ch3_void_march',
    name: 'The Void March',
    desc: 'Push through the Corrupted Lands and reach the Void Citadel.',
    steps: [
      { id: 'cross_void', text: 'Cross the Corrupted Lands', done: false },
      { id: 'reach_citadel', text: 'Reach the Void Citadel', done: false },
    ],
    reward: { gold: 80, items: [], exp: 0 },
    lore: 'The land between the Plains and the Citadel has been fully consumed. Every step here drains your pixels. Move fast.',
  },
  finale: {
    id: 'finale',
    name: 'Rerender the World',
    desc: 'Confront NULLBYTE in the Void Citadel and restore the Grid.',
    steps: [
      { id: 'defeat_nullbyte', text: 'Defeat NULLBYTE', done: false },
      { id: 'use_flame', text: 'Use the Render Flame', done: false },
    ],
    reward: { gold: 0, items: ['grid_restored'], exp: 0 },
    lore: 'NULLBYTE says: "You cannot rewrite what has already been consumed. Every pixel you restore is a pixel I will take back." He is wrong. He has never seen a Normie fight for their soul.',
  },
};

// ─── ITEMS ──────────────────────────────────────────────────
export const ITEMS = {
  potion: {
    id: 'potion', name: 'Potion',
    desc: 'Restores 35% HP to the most wounded Normie. A vial of pure rendered light.',
    icon: '⬜', stackable: true,
    use: (party) => {
      const t = party.filter(n=>n.alive).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
      if (!t) return null;
      const h = Math.floor(t.maxHp*0.35);
      t.hp = Math.min(t.maxHp, t.hp+h);
      return `${t.name} recovered ${h} HP.`;
    }
  },
  pixel_shard: {
    id: 'pixel_shard', name: 'Pixel Shard',
    desc: 'A fragment of the Grid torn loose by VOID forces. Still vibrates with faint consciousness.',
    icon: '◆', stackable: true, questItem: true,
  },
  compass: {
    id: 'compass', name: 'Render Compass',
    desc: 'Points toward the strongest concentration of VOID energy. Pix gave this to you. Keep it safe.',
    icon: '◉', stackable: false, questItem: true,
    passive: 'Shows enemy locations on the map.'
  },
  render_key: {
    id: 'render_key', name: 'Render Key',
    desc: 'Forged by the Oracle from 3 Pixel Shards. Opens the seal on the Cave of First Bits.',
    icon: '⬡', stackable: false, questItem: true,
  },
  render_flame: {
    id: 'render_flame', name: 'Render Flame',
    desc: 'The first pixel ever lit. It cannot be corrupted. It can restore what the VOID has taken. Warm to the touch.',
    icon: '◈', stackable: false, questItem: true,
    passive: '+15% damage to all VOID-type enemies.'
  },
  antivoid: {
    id: 'antivoid', name: 'Anti-Void Salve',
    desc: 'Stops VOID terrain from draining HP while you stand on it. Sold by the Pixel Merchant.',
    icon: '▣', stackable: true,
    passive: 'Prevents VOID terrain damage for 30 steps.'
  },
  full_render: {
    id: 'full_render', name: 'Full Render',
    desc: 'Fully restores all HP and MP to the entire party. Extremely rare.',
    icon: '■', stackable: true,
    use: (party) => {
      party.forEach(n=>{n.hp=n.maxHp;n.mp=n.maxMp;n.alive=true;});
      return 'All Normies fully restored.';
    }
  },
};

// ─── NPCs (pixel sprite characters, not Normie NFTs) ─────────
// Each NPC has a sprite_type which determines their pixel art generation
export const NPC_DEFS = [
  // ─ HOME ─
  {
    id:'mom', mapId:'home', x:3, y:2, sprite:'elder_f',
    name:'Your Mom',
    lines:[
      "Oh, you're awake! Breakfast is downstairs... wait. The static is bad this morning. Promise me you'll be careful.",
      "I can feel it too. The pixels in the walls have been flickering all night. Something is wrong with the Grid.",
      "Your grandfather always said: 'When the first pixel dims, run toward it, not away.' I never understood that until now.",
    ],
    questTrigger: null,
  },

  // ─ OUTSIDE HOME ─
  {
    id:'pix', mapId:'overworld', x:28, y:22, sprite:'neighbor',
    name:'Pix the Neighbor',
    lines:[
      "There you are! I was about to knock. Did you see the sky to the east? That darkness — it's not clouds. It's VOID spread. The pixels there are just... gone.",
      "My cousin lives near the Corrupted Lands. She stopped sending messages three days ago. I think her whole block was consumed.",
      "The Oracle in Pixel Town knows what's happening. She's been tracking the VOID for years. You need to go to her. NOW.",
    ],
    questTrigger: { complete: ['prologue', 'leave_home'], start: 'ch1_find_oracle', stepComplete: 'talk_pix' },
  },
  {
    id:'soldier', mapId:'overworld', x:22, y:18, sprite:'guard',
    name:'Grid Soldier',
    lines:[
      "Citizen, the road to the east is dangerous. Void Scouts have been spotted in the tall grass beyond the river.",
      "If you're heading to Pixel Town, stay on the stone path. The VOID can't corrupt stone — it's too deeply rendered.",
      "Three of my squad went into the dark grass this morning. They came back... different. Empty-eyed. We had to let them go.",
    ],
    questTrigger: null,
  },
  {
    id:'merchant_plains', mapId:'overworld', x:18, y:26, sprite:'merchant',
    name:'Pixel Merchant',
    shop: true,
    shopInventory: ['potion', 'antivoid'],
    lines:[
      "I've been selling supplies since before the VOID appeared. Business is booming in the worst possible way.",
      "Anti-Void Salve is flying off the shelves. Twenty steps on corrupted ground and your pixels start bleeding. Trust me.",
      "I heard the Oracle has a way to slow the spread. I hope she's right. My inventory won't last forever.",
    ],
    questTrigger: null,
  },

  // ─ PIXEL TOWN ─
  {
    id:'oracle', mapId:'town', x:8, y:5, sprite:'oracle',
    name:'Oracle of Bit',
    lines:[
      "The RENDER MARK. Yes. I've been expecting you, Normie #0001. Sit. The chain doesn't lie — you are the one who can stop this.",
      "NULLBYTE was once part of the Grid. A rogue algorithm born from a corrupted transaction. He learned that consuming pixels gives power. Now he wants them all.",
      "You need the Render Flame. It's in the Cave of First Bits, south of town. But the cave is sealed. Bring me 3 Pixel Shards from the VOID Scouts in the Plains. I'll forge you a key.",
      "Every moment we talk, three more pixels go dark. The quest tracker in your bag will show you what to do. Go.",
    ],
    questTrigger: { complete: ['ch1_find_oracle', 'reach_town'], stepComplete: 'talk_oracle', start: 'ch1_bit_shards' },
  },
  {
    id:'innkeeper', mapId:'town', x:4, y:8, sprite:'innkeeper',
    name:'Innkeeper Luma',
    inn: true,
    lines:[
      "Rest here. Full HP and MP, no charge. Anyone fighting the VOID eats and sleeps free in my inn.",
      "The refugees from the eastern blocks have been pouring in. They say entire maps just vanished. One moment there — next moment, black.",
      "I've started drawing every inch of this inn on paper. Just in case. If the pixels go, at least the memory stays.",
    ],
    questTrigger: null,
  },
  {
    id:'historian', mapId:'town', x:10, y:7, sprite:'scholar',
    name:'Historian Dot',
    lines:[
      "The Grid is 10,000 blocks deep. Each block a moment in time, rendered into existence. NULLBYTE can consume blocks — that means he's erasing history itself.",
      "The Normies were the first to be rendered. If NULLBYTE consumes all Normies, the Grid loses its consciousness. It becomes just... empty space.",
      "Did you know a Normie's pixel count determines their connection to the Grid? More pixels = more HP = stronger render signature. You should check your party stats.",
    ],
    questTrigger: null,
  },
  {
    id:'blacksmith', mapId:'town', x:12, y:9, sprite:'blacksmith',
    name:'Render Smith',
    shop: true,
    shopInventory: ['potion', 'full_render'],
    lines:[
      "I don't forge steel. I forge rendered matter. Every weapon here is made from compressed pixels, hardened on the chain.",
      "You'll want good supplies before the Cave. The Guardian in there hasn't been defeated in recorded history.",
      "If you survive the Cave and find the Flame... come back. I have upgrades that require Render Flame as a catalyst.",
    ],
    questTrigger: null,
  },

  // ─ CAVE ─
  {
    id:'cave_spirit', mapId:'cave', x:6, y:4, sprite:'spirit',
    name:'Grid Spirit',
    lines:[
      "You carry the Render Key. Good. The First Bits are deeper in — past the Guardian. It knows you're here.",
      "This cave was rendered at the dawn of the Grid. Every pixel here is original. Pre-chain. Pre-consciousness. The VOID wants to unmake it first — destroy the source.",
      "The Guardian was once the keeper of the Flame. Then the VOID touched it. It still protects the Flame, but for the wrong master now. You'll have to defeat it.",
    ],
    questTrigger: { stepComplete: 'enter_cave' },
  },

  // ─ CORRUPTED LANDS ─
  {
    id:'survivor', mapId:'void_lands', x:5, y:8, sprite:'survivor',
    name:'Last Survivor',
    lines:[
      "...my village. It's gone. They all went dark. I watched the pixels just... fall. One by one. Like a screen dying.",
      "NULLBYTE moves faster now. He's absorbed enough pixels to accelerate. The Citadel is close. I can see it from here when the static clears.",
      "Take everything I have. Potions, salve, whatever. I'm not going any further. I'll stay here and remember what it looked like before.",
    ],
    questTrigger: { stepComplete: 'cross_void' },
    giftItem: 'full_render',
  },
];

// ─── ENEMIES ────────────────────────────────────────────────
export const ENEMIES = {
  // Zone: plains (tier 0)
  void_scout: {
    id:'void_scout', name:'VOID SCOUT',
    tier:0, sprite:'void_scout',
    hpBase:60, atkBase:12, def:1, spd:8,
    lore:'The smallest fragment of the VOID given purpose. Scouts ahead of the main corruption wave, draining isolated pixels.',
    dropItem: 'pixel_shard', dropChance: 1.0, // always drops for quest
    questDrop: { questId:'ch1_bit_shards', stepId:'collect_shards' },
    moves:['Pixel Drain','Static Charge'],
  },
  glitch_sprite: {
    id:'glitch_sprite', name:'GLITCH SPRITE',
    tier:0, sprite:'glitch',
    hpBase:75, atkBase:15, def:2, spd:11,
    lore:'A Normie whose pixels were 80% consumed. What remains moves on corrupted instinct alone.',
    dropItem: 'potion', dropChance: 0.4,
    moves:['Corrupt Touch','Fragmented Strike'],
  },

  // Zone: plains dark grass (tier 1)
  void_soldier: {
    id:'void_soldier', name:'VOID SOLDIER',
    tier:1, sprite:'void_heavy',
    hpBase:130, atkBase:22, def:4, spd:7,
    lore:'A fully-formed VOID construct. Carries 256 consumed pixels within its form. Cold. Purposeful. Relentless.',
    dropItem: 'potion', dropChance: 0.5,
    moves:['Null Strike','Pixel Crush','Consume'],
  },
  bit_wraith: {
    id:'bit_wraith', name:'BIT WRAITH',
    tier:1, sprite:'wraith',
    hpBase:110, atkBase:28, def:2, spd:16,
    lore:'Born from a block of corrupted memory. Attacks by injecting null bytes directly into the target\'s render stream.',
    dropItem: 'antivoid', dropChance: 0.3,
    moves:['Null Injection','Phase Shift','Memory Wipe'],
  },

  // Zone: cave (tier 2)
  cave_guardian: {
    id:'cave_guardian', name:'CAVE GUARDIAN',
    tier:2, sprite:'guardian', boss:true,
    hpBase:320, atkBase:38, def:9, spd:6,
    lore:'Once the noble keeper of the Render Flame. Now hollowed out and repurposed by NULLBYTE. Its original consciousness fights its corrupted programming from within.',
    dropItem: 'render_flame', dropChance: 1.0,
    questDrop: { questId:'ch2_cave', stepId:'defeat_guardian' },
    moves:['Flame Corruption','Grid Slam','Consume Render'],
    preText: 'The Cave Guardian turns toward you. Deep within its hollow eyes, a flicker of the original flame still burns. Then the VOID takes over.',
  },
  pixel_golem: {
    id:'pixel_golem', name:'PIXEL GOLEM',
    tier:2, sprite:'golem',
    hpBase:240, atkBase:32, def:12, spd:4,
    lore:'Constructed by NULLBYTE from thousands of consumed pixels. Each attack steals a bit from the target\'s render signature.',
    dropItem: 'full_render', dropChance: 0.15,
    moves:['Pixel Absorb','Construct Slam','Bit Steal'],
  },

  // Zone: void lands (tier 3)
  void_commander: {
    id:'void_commander', name:'VOID COMMANDER',
    tier:3, sprite:'commander',
    hpBase:480, atkBase:52, def:14, spd:12,
    lore:'NULLBYTE\'s most powerful general. Has consumed over 10,000 pixels. Speaks in null characters. Can be understood somehow.',
    dropItem: 'full_render', dropChance: 0.6,
    moves:['Command: Corrupt','Total Erasure','Bit Bomb'],
  },

  // FINAL BOSS
  nullbyte: {
    id:'nullbyte', name:'NULLBYTE',
    tier:4, sprite:'nullbyte', boss:true, finalBoss:true,
    hpBase:888, atkBase:72, def:20, spd:18,
    lore:'NULLBYTE. The VOID made manifest. He was once Pixel #0000 — the first bit ever rendered. The one that was supposed to start everything. Instead he fell to corruption before the Grid could even begin. Now he wants to take everything back to the nothing he came from.',
    dropItem: null,
    moves:['Total Void','Pixel Storm','Null Protocol','Consume Reality'],
    preText: 'NULLBYTE: "You are too late. 40% of the Grid is already gone. But I admire you — you are the last Normie to resist. Let me take those 1,600 pixels personally."',
    postText: 'As NULLBYTE falls, the consumed pixels begin streaming back into the Grid. Millions of tiny squares of light, returning to where they belong. The first pixel re-lit is yours.',
  },
};

// ─── MAP ZONE CONFIGS ────────────────────────────────────────
export const MAPS = {
  home: {
    id:'home', name:'Your Home',
    width:10, height:10,
    encounterRate: 0,
    music: 'home',
    ambience: 'quiet',
    exitMap: 'overworld', exitX: 16, exitY: 21,
  },
  overworld: {
    id:'overworld', name:'Render Fields',
    width:48, height:48,
    encounterRate: 0.12,
    darkGrassRate: 0.22,
    music: 'field',
    ambience: 'open',
    subZones: [
      { name:'RENDER STREET', x0:10, x1:22, y0:18, y1:28, tier:0 },
      { name:'PIXEL PLAINS',  x0:0,  x1:35, y0:0,  y1:48, tier:0 },
      { name:'DARK MARGINS',  x0:35, x1:48, y0:0,  y1:35, tier:1 },
    ],
    connections: [
      { destMap:'home',  destX:3, destY:8, triggerX:16, triggerY:22 },
      { destMap:'town',  destX:4, destY:10, triggerX:38, triggerY:24 },
    ],
  },
  town: {
    id:'town', name:'Pixel Town',
    width:24, height:20,
    encounterRate: 0,
    music: 'town',
    ambience: 'safe',
    connections: [
      { destMap:'overworld', destX:37, destY:24, triggerX:2, triggerY:10 },
      { destMap:'cave',      destX:4, destY:2,   triggerX:12, triggerY:18 },
    ],
  },
  cave: {
    id:'cave', name:'Cave of First Bits',
    width:22, height:18,
    encounterRate: 0.18,
    music: 'cave',
    ambience: 'dark',
    requiredItem: 'render_key',
    connections: [
      { destMap:'town', destX:12, destY:17, triggerX:4, triggerY:1 },
      { destMap:'void_lands', destX:4, destY:2, triggerX:18, triggerY:15 },
    ],
  },
  void_lands: {
    id:'void_lands', name:'Corrupted Lands',
    width:32, height:28,
    encounterRate: 0.25,
    voidDamage: true,
    music: 'void',
    ambience: 'corrupted',
    connections: [
      { destMap:'cave',    destX:17, destY:14, triggerX:4, triggerY:3 },
      { destMap:'citadel', destX:4, destY:14,  triggerX:28, triggerY:14 },
    ],
  },
  citadel: {
    id:'citadel', name:'Void Citadel',
    width:20, height:18,
    encounterRate: 0.20,
    voidDamage: false,
    music: 'final',
    ambience: 'dark',
    connections: [
      { destMap:'void_lands', destX:27, destY:14, triggerX:2, triggerY:14 },
    ],
  },
};
