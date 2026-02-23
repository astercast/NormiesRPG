# NormiesRPG

A browser RPG inspired by Pokémon/Final Fantasy, using Phaser.js and dynamic Normie stats from https://www.normies.art.

## Features
- Tile-based overworld with grid movement
- Dynamic pixel sprite for player
- Random encounter system
- Normie stats fetched live from normies.art

## Getting Started

### 1. Install dependencies
```
npm install
```

### 2. Run the development server
```
npm run dev
```
Visit the local URL shown in your terminal (usually http://localhost:5173/).

### 3. Build for production
```
npm run build
```

### 4. Deploy to Vercel
- Push your project to GitHub.
- Import the repo in Vercel and set the root to `/game`.
- Vercel will auto-detect as a static site (Vite/Phaser) and deploy.

## Folder Structure
- `/game/index.html` — Main HTML entry
- `/game/style.css` — Styles
- `/game/main.js` — Phaser.js game logic
- `/game/normie-api.js` — Normie stats fetcher

## Customization
- To use your own Normie or party, update the logic in `main.js` to fetch and display your chosen Normie(s).
- Sprite generation can be extended for unique looks per Normie.

---
MIT License
