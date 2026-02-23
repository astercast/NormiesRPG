// Example generative story/NPCs
const npcs = [
  { x: 5, y: 5, name: 'Guide', text: [
    'Welcome to the Normies world! Explore and find your destiny.',
    'Talk to the Merchant for supplies and the Scholar for wisdom.',
    'Return to me after your first battle.'
  ], event: (state) => { if (state.firstBattle) return 'You look stronger already!'; } },
  { x: 15, y: 10, name: 'Merchant', text: [
    'Find treasures and beware of wild enemies!',
    'If you bring me a rare Normie, I will reward you.'
  ], quest: 'bringRare', event: (state) => {
    if (state.hasRare) return 'Amazing! Here is your reward: 50 Gold.';
  } },
  { x: 10, y: 3, name: 'Scholar', text: [
    'Legends say a rare Normie appears at night.',
    'Knowledge is the greatest treasure.'
  ] },
  { x: 3, y: 12, name: 'Lost Child', text: [
    'I lost my Normie friend in the woods. Can you help?',
    'Thank you for finding my friend!'
  ], quest: 'findLost', event: (state) => {
    if (state.foundLost) return 'You are a true hero!';
  } },
  { x: 18, y: 13, name: 'Old Warrior', text: [
    'I once fought the Rugpuller. Stay strong, young one.',
    'If you defeat the Rugpuller, come tell me.'
  ], quest: 'defeatBoss', event: (state) => {
    if (state.defeatedBoss) return 'You have the heart of a champion!';
  } },
  { x: 8, y: 8, name: 'Poet', text: [
    'Every step is a new verse in your story.',
    'Write your legend with courage.'
  ] },
  { x: 17, y: 2, name: 'Inventor', text: [
    'I am building a device to track Normie stats in real time.',
    'Bring me a Normie with over 100 HP!'
  ], quest: 'bringStrong', event: (state) => {
    if (state.hasStrong) return 'Incredible! My invention is complete.';
  } },
  { x: 2, y: 2, name: 'Hermit', text: [
    'The world changes every time you enter. Nothing is ever the same.',
    'Embrace the unknown.'
  ] },
  { x: 12, y: 13, name: 'Healer', text: [
    'If your Normies are hurt, come to me for help.',
    'Your party is healed!'
  ], event: (state, healParty) => { healParty(); return 'Your party is healed!'; } },
  { x: 6, y: 10, name: 'Storyteller', text: [
    'Long ago, a hero united all Normies. Will you be next?',
    'Your journey is just beginning.'
  ] }
];
function drawNPCs(scene) {
  if (!scene.npcSprites) scene.npcSprites = [];
  scene.npcSprites.forEach(s => s.destroy());
  scene.npcSprites = [];
  for (const npc of npcs) {
    const sprite = scene.add.rectangle(npc.x * TILE_SIZE + TILE_SIZE/2, npc.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE * 0.8, TILE_SIZE * 0.8, 0xffe066).setOrigin(0.5);
    scene.npcSprites.push(sprite);
    scene.add.text(npc.x * TILE_SIZE + TILE_SIZE/2, npc.y * TILE_SIZE + TILE_SIZE/2 - 18, npc.name, { font: '12px monospace', fill: '#222', backgroundColor: '#fff', padding: { x: 2, y: 1 } }).setOrigin(0.5);
  }
}

import Phaser from 'phaser';
import { fetchNormieStats } from './normie-api';
import { BattleScene } from './battle.js';

// Tileset and player sprite asset paths
const TILESET_KEY = 'tileset';
const PLAYER_KEY = 'player';

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const TILESET_COLUMNS = 8; // Number of tiles per row in tileset

// Generative tilemap: 0 = grass, 1 = path, 2 = wall, 3 = tree, 4 = water
function generateTilemap() {
  const map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1) row.push(2); // wall
      else if ((x === 10 && y > 2 && y < 12) || (y === 7 && x > 2 && x < 17)) row.push(1); // path
      else if (Math.random() < 0.07) row.push(3); // tree
      else if (Math.random() < 0.03) row.push(4); // water
      else row.push(0); // grass
    }
    map.push(row);
  }
  return map;
}
let tilemap = generateTilemap();

const config = {
  type: Phaser.AUTO,
  width: TILE_SIZE * MAP_WIDTH,
  height: TILE_SIZE * MAP_HEIGHT,
  parent: 'game-container',
  pixelArt: true,
  scene: [
    {
      key: 'default',
      preload,
      create,
      update
    },
    BattleScene
  ]
};

let player, cursors, canMove = true;
let playerTile = { x: 10, y: 7 };
let encounterText = null;
let encounterCooldown = 0;
let party = [];
let partyStats = [];


function preload() {
  // Load tileset and player sprite
  this.load.spritesheet(TILESET_KEY, 'assets/tileset.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
  this.load.spritesheet(PLAYER_KEY, 'assets/player.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
}

async function create() {
    drawNPCs(this);
    // Show story event if player near NPC
  // Quest state
  this.questState = this.questState || {
    firstBattle: false,
    hasRare: false,
    async function create() {
      drawNPCs(this);
      // Show story event if player near NPC
      this.events.on('update', () => {
        for (const npc of npcs) {
          if (Math.abs(playerTile.x - npc.x) + Math.abs(playerTile.y - npc.y) === 1) {
            let msg = '';
            if (npc.event) {
              msg = npc.event(this.questState, healParty) || '';
            }
            if (!msg) {
              if (Array.isArray(npc.text)) {
                msg = npc.text[0];
                if (npc.quest && this.questState[npc.quest]) msg = npc.text[1];
              } else {
                msg = npc.text;
              }
            }
            if (!this.storyText || this.storyText.text !== `${npc.name}: ${msg}`) {
              if (this.storyText) this.storyText.destroy();
              this.storyText = this.add.text(
                this.cameras.main.width / 2,
                40,
                `${npc.name}: ${msg}`,
                { font: '16px monospace', fill: '#fff', backgroundColor: '#222', padding: { x: 10, y: 6 } }
              ).setOrigin(0.5);
            }
            return;
          }
        }
        if (this.storyText) { this.storyText.destroy(); this.storyText = null; }
      });

      // Draw tilemap using tileset
      this.tileSprites = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tileType = tilemap[y][x];
          // Map tileType to frame index: 0=grass, 1=path, 2=wall, 3=tree, 4=water
          const frame = tileType;
          const tile = this.add.sprite(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILESET_KEY, frame).setOrigin(0.5);
          this.tileSprites.push(tile);
        }
      }

      // Get party from window (set by UI)
      party = window.selectedParty || [{ id: 1, name: 'Normie #1' }];
      // Fetch stats for each party member
      partyStats = [];
      for (const n of party) {
        let stats = { hp: 10 };
        try {
          stats = await fetchNormieStats(n.id);
        } catch (e) {}
        partyStats.push({ ...n, ...stats });
      }

      // Player sprite (animated)
      this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers(PLAYER_KEY, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
      player = this.add.sprite(playerTile.x * TILE_SIZE + TILE_SIZE/2, playerTile.y * TILE_SIZE + TILE_SIZE/2, PLAYER_KEY, 0);
      player.play('walk');
      cursors = this.input.keyboard.createCursorKeys();
      // HUD text for stats (show first party member)
      this.statsText = this.add.text(10, 10, `Party: ${party.map(p=>p.name).join(', ')} | HP: ${partyStats[0]?.hp ?? 10}`, { font: '16px monospace', fill: '#fff' }).setScrollFactor?.(0);
    }
  player = this.add.sprite(playerTile.x * TILE_SIZE + TILE_SIZE/2, playerTile.y * TILE_SIZE + TILE_SIZE/2, 'player');
  cursors = this.input.keyboard.createCursorKeys();
  // HUD text for stats (show first party member)
  this.statsText = this.add.text(10, 10, `Party: ${party.map(p=>p.name).join(', ')} | HP: ${partyStats[0]?.hp ?? 10}`, { font: '16px monospace', fill: '#fff' }).setScrollFactor?.(0);
}


function update() {
  if (!canMove || !cursors) return;
  let moved = false;
  let nx = playerTile.x, ny = playerTile.y;
  if (Phaser.Input.Keyboard.JustDown(cursors.left))  nx--;
  else if (Phaser.Input.Keyboard.JustDown(cursors.right)) nx++;
  else if (Phaser.Input.Keyboard.JustDown(cursors.up))    ny--;
  else if (Phaser.Input.Keyboard.JustDown(cursors.down))  ny++;
  if ((nx !== playerTile.x || ny !== playerTile.y) && tilemap[ny][nx] !== 2) {
    playerTile.x = nx; playerTile.y = ny;
    player.x = nx * TILE_SIZE + TILE_SIZE/2;
    player.y = ny * TILE_SIZE + TILE_SIZE/2;
    moved = true;
  }
  if (moved) {
    canMove = false;
    setTimeout(() => { canMove = true; }, 120); // movement throttle
    // Random encounter system: only on grass, with cooldown
    if (tilemap[playerTile.y][playerTile.x] === 0 && encounterCooldown === 0) {
      if (Math.random() < 0.18) {
        triggerEncounter(this);
        encounterCooldown = 6; // steps before next possible encounter
      }
    }
    if (encounterCooldown > 0) encounterCooldown--;
  }
}

function triggerEncounter(scene) {
  if (encounterText) encounterText.destroy();
  // Pick a random enemy for demo
  const enemy = { name: 'Wild Normie', hp: 30 + Math.floor(Math.random()*20), maxHp: 30 + Math.floor(Math.random()*20), atk: 8 + Math.floor(Math.random()*4) };
  encounterText = scene.add.text(
    scene.cameras.main.width / 2,
    scene.cameras.main.height / 2,
    'A wild enemy appears!',
    { font: '20px monospace', fill: '#fff', backgroundColor: '#000', padding: { x: 12, y: 8 }, align: 'center' }
  ).setOrigin(0.5);
  scene.time.delayedCall(1000, () => {
    if (encounterText) { encounterText.destroy(); encounterText = null; }
    scene.scene.start('BattleScene', { party: partyStats, enemy });
  });
}

window.phaserGame = new Phaser.Game(config);
