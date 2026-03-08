# Phaser Art Pack Setup

Use this folder to upgrade visuals without changing game logic.

## Recommended Packs (Start Here)
1. Kenney - `Tiny Dungeon` (CC0)
2. Kenney - `Fantasy Tileset` or `RPG Urban Pack` (CC0)
3. 0x72 - `Dungeontileset II` (paid, high quality) for premium look
4. Cup Nooble - character sheets (itch.io, verify license)

Tip: If you want one cohesive style fast, use **all Kenney assets** first.

## Required Files
Place PNGs with these exact names:

- `assets/art/tileset/world_tileset_32.png`
- `assets/art/sprites/player_sheet_32.png`
- `assets/art/sprites/npc_sheet_32.png`
- `assets/art/sprites/enemy_sheet_32.png`

## Required Format
- Tile size: `32x32`
- Player/NPC/Enemy sheets: frame size `32x32`
- Minimum animation frames expected by code:
  - player: 12 frames (3 per direction)
  - npc: 3 frames idle
  - enemy: 3 frames idle

## Player Frame Layout
- Row 0: down (frames 0,1,2)
- Row 1: left (frames 3,4,5)
- Row 2: right (frames 6,7,8)
- Row 3: up (frames 9,10,11)

## Tileset Notes
Map JSON uses tile IDs 1..8 for:
1. deep water
2. shallow water
3. sand
4. grass
5. stone
6. road
7. town ground
8. ruins ground

If your source pack has many tiles, build a reduced 4x2 atlas in this order to `world_tileset_32.png`.

## Verify
1. Run `npm run dev`
2. Open `phaser.html`
3. If any file is missing or malformed, the game auto-falls back to generated placeholder art.
