// sprites.js — All pixel art drawn procedurally on canvas
// Monochrome palette: #e3e5e4 (light), #48494b (dark), grays between

const L  = [227,229,228,255]; // light bg
const D  = [72, 73, 75, 255]; // dark fg
const M1 = [140,141,140,255]; // mid 1
const M2 = [170,171,170,255]; // mid 2
const DK = [50, 51, 52, 255]; // near-black
const LT = [210,211,210,255]; // near-white

function mkCanvas(w,h) {
  const c=document.createElement('canvas'); c.width=w; c.height=h; return c;
}
function px(ctx,x,y,col) {
  if(x<0||y<0||x>=ctx.canvas.width||y>=ctx.canvas.height)return;
  ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${(col[3]||255)/255})`;
  ctx.fillRect(x,y,1,1);
}
function rect(ctx,x,y,w,h,col) {
  ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${(col[3]||255)/255})`;
  ctx.fillRect(x,y,w,h);
}

// ── WALKING LEGS (8 frames, 2 wide × 4 tall each, below normie head)
// Returns array of 8 ImageData frames for walking animation
export function buildLegsFrames() {
  const frames = [];
  // 8 frames of walking: 0=stand, 1-3=right step, 4=stand, 5-7=left step
  const configs = [
    // [leftX,leftY, rightX,rightY, bodyOffset]
    [2,0, 6,0, 0],   // stand
    [2,0, 6,1, 0],   // right foot forward step 1
    [2,0, 6,2, 1],   // right foot forward step 2
    [2,1, 6,2, 0],   // right foot back
    [2,0, 6,0, 0],   // stand
    [2,1, 6,0, 0],   // left foot forward step 1
    [2,2, 6,0, 1],   // left foot forward step 2
    [2,2, 6,1, 0],   // left foot back
  ];
  configs.forEach(([lx,ly,rx,ry,bo]) => {
    const c = mkCanvas(10, 6);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // Body bottom (connects to head above)
    rect(ctx, 3,0, 4,1, D);
    // Left leg
    rect(ctx, lx,1+ly, 2,2, D);
    rect(ctx, lx, 3+ly, 2,1, M1); // shoe
    // Right leg
    rect(ctx, rx,1+ry, 2,2, D);
    rect(ctx, rx, 3+ry, 2,1, M1);
    frames.push(c);
  });
  return frames;
}

// ── NPC SPRITE TYPES — deterministic 10×16 pixel characters
// Each returns a canvas with the character drawn
const NPC_SPRITES = {
  elder_f: (ctx) => {
    // Mom — small elderly woman, apron, bun hair
    rect(ctx,3,0,4,4,D);   // hair bun
    rect(ctx,2,4,6,6,L);   // face
    px(ctx,3,6,D); px(ctx,6,6,D); // eyes
    px(ctx,4,8,M1); px(ctx,5,8,M1); // mouth
    rect(ctx,1,10,8,6,M2); // dress
    rect(ctx,2,10,6,2,LT); // apron
    rect(ctx,1,16,3,2,D);  // left leg
    rect(ctx,6,16,3,2,D);  // right leg
    rect(ctx,0,9,2,4,M2);  // left arm
    rect(ctx,8,9,2,4,M2);  // right arm
  },
  neighbor: (ctx) => {
    // Pix — young person, spiky hair
    rect(ctx,2,0,6,3,D);   // hair
    px(ctx,1,1,D); px(ctx,8,1,D); // hair spikes
    rect(ctx,2,3,6,6,L);   // face
    px(ctx,3,5,D); px(ctx,6,5,D); // eyes
    px(ctx,4,7,M1); px(ctx,5,7,M1);
    rect(ctx,1,9,8,7,D);   // shirt (dark)
    rect(ctx,1,16,3,2,D);
    rect(ctx,6,16,3,2,D);
    rect(ctx,0,10,1,4,D);
    rect(ctx,9,10,1,4,D);
  },
  guard: (ctx) => {
    // Grid Soldier — helmet, armor
    rect(ctx,1,0,8,4,D);   // helmet
    rect(ctx,2,1,6,2,M1);  // visor
    rect(ctx,2,4,6,5,L);   // face
    px(ctx,3,6,D); px(ctx,6,6,D);
    rect(ctx,1,9,8,7,D);   // armor
    rect(ctx,2,10,6,2,M1); // chest plate
    rect(ctx,0,9,1,5,D);   // left pauldron
    rect(ctx,9,9,1,5,D);
    rect(ctx,1,16,3,3,D);
    rect(ctx,6,16,3,3,D);
  },
  merchant: (ctx) => {
    // Pixel Merchant — top hat, coat
    rect(ctx,3,0,4,1,D);   // hat brim
    rect(ctx,3,1,4,3,D);   // hat top
    rect(ctx,2,4,6,6,L);   // face
    px(ctx,3,6,D); px(ctx,6,6,D);
    px(ctx,4,8,D); // goatee
    rect(ctx,1,10,8,6,D);  // coat
    rect(ctx,3,10,4,3,LT); // shirt front
    rect(ctx,0,10,1,5,D);
    rect(ctx,9,10,1,5,D);
    rect(ctx,2,16,2,2,D);
    rect(ctx,6,16,2,2,D);
  },
  oracle: (ctx) => {
    // Oracle — star pattern robe, wild hair
    rect(ctx,1,0,8,3,D);   // hair wild
    px(ctx,0,1,D); px(ctx,9,1,D);
    rect(ctx,2,3,6,6,L);   // face
    px(ctx,3,5,D); px(ctx,6,5,D); // eyes (hollow)
    px(ctx,3,5,M1); px(ctx,6,5,M1);
    px(ctx,4,7,D); px(ctx,5,7,D); // thin mouth
    rect(ctx,0,9,10,8,D);  // robe
    // Star pattern on robe
    px(ctx,2,11,L); px(ctx,5,12,L); px(ctx,7,11,L); px(ctx,3,14,L); px(ctx,6,14,L);
    rect(ctx,2,17,2,1,D);
    rect(ctx,6,17,2,1,D);
  },
  innkeeper: (ctx) => {
    // Luma — round face, apron
    rect(ctx,2,0,6,3,M1);  // hair
    rect(ctx,2,3,6,6,L);   // face
    px(ctx,3,5,D); px(ctx,6,5,D);
    px(ctx,4,7,M1); px(ctx,5,7,M1);
    rect(ctx,1,9,8,7,M2);  // clothes
    rect(ctx,2,9,6,3,LT);  // apron
    rect(ctx,0,10,1,4,M2);
    rect(ctx,9,10,1,4,M2);
    rect(ctx,2,16,2,2,M2);
    rect(ctx,6,16,2,2,M2);
  },
  scholar: (ctx) => {
    // Historian Dot — glasses, book
    rect(ctx,2,0,6,3,D);   // neat hair
    rect(ctx,2,3,6,5,L);   // face
    // Glasses
    rect(ctx,2,5,2,2,D); rect(ctx,5,5,2,2,D);
    px(ctx,4,5,D); // bridge
    px(ctx,4,7,M1); px(ctx,5,7,M1);
    rect(ctx,1,8,8,8,M2);  // robe
    rect(ctx,1,8,1,6,D);   // book (left arm holding)
    rect(ctx,2,16,2,2,M2);
    rect(ctx,6,16,2,2,M2);
  },
  blacksmith: (ctx) => {
    // Render Smith — big, apron, hammer
    rect(ctx,2,0,6,4,D);   // hair short
    rect(ctx,2,4,6,5,L);   // face
    px(ctx,3,6,D); px(ctx,6,6,D);
    rect(ctx,1,9,8,8,D);   // apron
    rect(ctx,2,9,6,4,M2);  // apron lighter
    rect(ctx,0,10,1,5,D);
    rect(ctx,9,9,1,2,D);   // hammer handle top
    rect(ctx,9,11,2,2,D);  // hammer head
    rect(ctx,2,17,2,2,D);
    rect(ctx,6,17,2,2,D);
  },
  spirit: (ctx) => {
    // Grid Spirit — ghostly, floating
    rect(ctx,2,0,6,4,L);   // ethereal head
    rect(ctx,1,1,8,6,L);   // wider face
    px(ctx,3,3,D); px(ctx,6,3,D); // empty eyes
    px(ctx,4,5,M1); px(ctx,5,5,M1);
    rect(ctx,1,7,8,8,M1);  // wispy body
    px(ctx,0,9,L); px(ctx,9,9,L); // transparent edges
    px(ctx,0,11,L); px(ctx,9,11,L);
    rect(ctx,2,15,2,3,M1); // wispy tail
    rect(ctx,6,15,2,3,M1);
    px(ctx,1,16,L); px(ctx,8,16,L);
  },
  survivor: (ctx) => {
    // Last Survivor — ragged, wounded
    rect(ctx,2,0,6,3,D);   // messy hair
    px(ctx,1,0,D); px(ctx,8,1,D);
    rect(ctx,2,3,6,6,L);   // face
    px(ctx,3,5,D); px(ctx,6,5,D);
    px(ctx,4,7,M2); // sad mouth
    rect(ctx,1,9,8,7,D);   // ragged clothes
    // Torn bits
    px(ctx,1,12,L); px(ctx,8,11,L); px(ctx,2,15,L);
    rect(ctx,0,10,1,4,D);
    rect(ctx,9,10,1,3,D);
    rect(ctx,1,16,3,2,D);
    rect(ctx,6,16,3,2,D);
  },
};

// Build NPC canvas 10×18 at scale
export function buildNpcSprite(type, scale=2) {
  const W=10, H=18;
  const c = mkCanvas(W*scale, H*scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Draw at 1x then scale
  const tmp = mkCanvas(W, H);
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  rect(tctx,0,0,W,H,[0,0,0,0]); // transparent bg
  const drawFn = NPC_SPRITES[type] || NPC_SPRITES.neighbor;
  drawFn(tctx);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0,0, W*scale, H*scale);
  return c;
}

// ── ENEMY SPRITES — bigger 20×24 pixel art
export function buildEnemySprite(type, seed) {
  const W=24, H=24;
  const c = mkCanvas(W*3, H*3);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tmp = mkCanvas(W, H);
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;

  function r(s) { // deterministic rng
    let v=s; return ()=>{v=(v*1664525+1013904223)&0x7fffffff; return v/0x7fffffff;};
  }

  const draw = {
    void_scout: (ctx) => {
      // Small void sprite — scattered pixels, hollow eyes
      rect(ctx,8,2,8,8,D);
      px(ctx,9,4,L); px(ctx,14,4,L);  // hollow eyes
      rect(ctx,7,10,10,8,D);
      rect(ctx,6,11,2,4,D); rect(ctx,16,11,2,4,D); // arms
      rect(ctx,9,18,3,4,D); rect(ctx,13,18,3,4,D); // legs
      // VOID static
      const rv = r(seed);
      for(let i=0;i<8;i++) {
        px(ctx,Math.floor(rv()*20)+2, Math.floor(rv()*20)+2, rv()<0.5?D:M1);
      }
    },
    glitch: (ctx) => {
      rect(ctx,7,1,10,9,D);
      px(ctx,9,4,L); px(ctx,13,4,L);
      // glitch horizontal corruption lines
      for(let y=2;y<8;y+=2) { rect(ctx,7+y%4,y,10-y%3,1,M1); }
      rect(ctx,6,10,12,8,D);
      rect(ctx,5,11,2,5,D); rect(ctx,17,11,2,5,D);
      rect(ctx,8,18,4,5,D); rect(ctx,13,18,4,5,D);
    },
    void_heavy: (ctx) => {
      // Big armored void soldier
      rect(ctx,5,0,14,12,D);
      rect(ctx,4,2,3,3,D); rect(ctx,17,2,3,3,D); // shoulder plates
      px(ctx,8,4,L); px(ctx,8,5,L); px(ctx,13,4,L); px(ctx,13,5,L); // eyes
      rect(ctx,7,6,10,2,M1); // visor line
      rect(ctx,4,12,16,10,D);
      rect(ctx,6,13,12,4,M1); // chest plate
      rect(ctx,3,12,3,7,D); rect(ctx,18,12,3,7,D); // arms
      rect(ctx,7,22,4,2,D); rect(ctx,13,22,4,2,D);
    },
    wraith: (ctx) => {
      // Wispy bit wraith — tall and thin
      rect(ctx,9,0,6,6,D);
      px(ctx,10,2,L); px(ctx,13,2,L); // eyes
      rect(ctx,8,6,8,12,M1);
      // wispy edges
      for(let y=6;y<18;y+=2){px(ctx,7+y%2,y,D); px(ctx,16-y%2,y,D);}
      rect(ctx,9,18,2,5,M1); rect(ctx,13,18,2,5,M1);
      rect(ctx,7,12,2,4,M1); rect(ctx,15,12,2,4,M1);
    },
    guardian: (ctx) => {
      // Cave Guardian — massive, ancient, corrupted flame in chest
      rect(ctx,3,0,18,14,D);
      // Ancient geometric face
      rect(ctx,5,2,4,4,D); rect(ctx,15,2,4,4,D); // eye sockets
      rect(ctx,6,3,2,2,L); rect(ctx,16,3,2,2,L);  // glowing eyes
      rect(ctx,8,8,8,3,D); // "mouth" grate
      px(ctx,9,9,L); px(ctx,11,9,L); px(ctx,13,9,L); // teeth
      rect(ctx,2,14,20,8,D); // body
      rect(ctx,8,16,8,4,M1); // chest cavity
      rect(ctx,10,17,4,2,[255,255,200,180]); // flame glow (warm)
      rect(ctx,1,13,2,8,D); rect(ctx,21,13,2,8,D); // arms
      rect(ctx,6,22,5,2,D); rect(ctx,13,22,5,2,D);
    },
    golem: (ctx) => {
      // Pixel Golem — chunky blocks
      rect(ctx,4,0,16,8,D);   // block head
      rect(ctx,6,2,4,3,D); rect(ctx,14,2,4,3,D); // eye sockets
      px(ctx,7,3,L); px(ctx,15,3,L);
      rect(ctx,3,8,18,12,D);  // blocky body
      rect(ctx,1,8,3,10,D); rect(ctx,20,8,3,10,D); // arm blocks
      // pixel texture on body
      const rg=r(seed);
      for(let i=0;i<10;i++) {
        px(ctx,Math.floor(rg()*14)+4,Math.floor(rg()*10)+9,M1);
      }
      rect(ctx,6,20,5,4,D); rect(ctx,13,20,5,4,D);
    },
    commander: (ctx) => {
      // Void Commander — imposing, cape, crown of consumed pixels
      // Crown
      for(let i=0;i<5;i++) rect(ctx,5+i*3,0,2,2+(i%2)*2,D);
      rect(ctx,4,4,16,10,D); // head
      px(ctx,7,7,L); px(ctx,7,8,L); px(ctx,13,7,L); px(ctx,13,8,L); // glowing eyes
      rect(ctx,9,10,6,2,D); // stern mouth
      rect(ctx,3,14,18,8,D); // body
      // Cape flowing behind
      rect(ctx,1,12,3,12,M1); rect(ctx,20,12,3,12,M1);
      rect(ctx,6,22,5,2,D); rect(ctx,13,22,5,2,D);
      rect(ctx,5,14,4,4,M1); rect(ctx,15,14,4,4,M1); // shoulder armor
    },
    nullbyte: (ctx) => {
      // NULLBYTE — the void itself, glitched, cosmic
      // Unstable form — larger
      rect(ctx,2,0,20,22,DK); // void mass
      // Pixel eyes — the only things that are clear
      rect(ctx,5,5,4,4,D); rect(ctx,15,5,4,4,D); // eye sockets
      rect(ctx,6,6,2,2,L); rect(ctx,16,6,2,2,L);  // white pupils
      // Glitch lines
      for(let y=0;y<22;y+=3) { rect(ctx,2,y,20,1,M1); }
      // Hands/tendrils
      rect(ctx,0,10,3,3,DK); rect(ctx,21,10,3,3,DK);
      rect(ctx,0,14,2,2,DK); rect(ctx,22,14,2,2,DK);
      // Static corruption aura
      const rn=r(seed+1);
      for(let i=0;i<16;i++){
        const ex=Math.floor(rn()*24), ey=Math.floor(rn()*24);
        if(ex<24&&ey<24) px(ctx,ex,ey,rn()<0.5?D:L);
      }
      // "#0000" on the body
      rect(ctx,8,15,8,5,L);
      rect(ctx,9,16,6,3,DK); // "0000" suggestion
    },
  };

  (draw[type] || draw.void_scout)(tctx);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0,0, W*3, H*3);
  return c;
}

// ── PLAYER SPRITE: Normie head (from pixels) + walking legs
// Returns object with { canvas, update(frame, dir) }
export function buildPlayerSprite(normiePixels, normiePixelCount) {
  const HEAD_W = 10, HEAD_H = 10; // display size
  const LEGS_W = 10, LEGS_H = 6;
  const SCALE = 2;

  // Build head canvas from 40×40 pixel string
  const headCanvas = mkCanvas(HEAD_W * SCALE, HEAD_H * SCALE);
  {
    const ctx = headCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (normiePixels && normiePixels.length >= 1600) {
      // Take just the top half of the Normie (rows 0-19 = head region)
      // Scale 40 wide → 10 wide (every 4 pixels average)
      const S = 40;
      const tgtW = HEAD_W, tgtH = HEAD_H;
      const scX = S/tgtW, scY = S/tgtH;
      ctx.fillStyle = '#e3e5e4';
      ctx.fillRect(0,0,HEAD_W*SCALE, HEAD_H*SCALE);
      for(let ty=0;ty<tgtH;ty++) {
        for(let tx=0;tx<tgtW;tx++) {
          let ones=0, total=0;
          for(let sy=0;sy<scY;sy++) {
            for(let sx=0;sx<scX;sx++) {
              const idx = Math.floor(ty*scY+sy)*S + Math.floor(tx*scX+sx);
              if(idx<1600){ total++; if(normiePixels[idx]==='1') ones++; }
            }
          }
          const dark = ones/total > 0.45;
          ctx.fillStyle = dark ? '#48494b' : '#e3e5e4';
          ctx.fillRect(tx*SCALE, ty*SCALE, SCALE, SCALE);
        }
      }
    } else {
      // Fallback: simple generic face
      ctx.fillStyle = '#e3e5e4';
      ctx.fillRect(0,0,HEAD_W*SCALE,HEAD_H*SCALE);
      ctx.fillStyle = '#48494b';
      ctx.fillRect(2*SCALE,1*SCALE,6*SCALE,8*SCALE); // head oval
      ctx.fillStyle = '#e3e5e4';
      ctx.fillRect(3*SCALE,3*SCALE,2*SCALE,2*SCALE); // left eye
      ctx.fillRect(6*SCALE,3*SCALE,2*SCALE,2*SCALE); // right eye
      ctx.fillRect(4*SCALE,6*SCALE,3*SCALE,1*SCALE); // mouth
    }
  }

  const legsFrames = buildLegsFrames();

  // Final sprite canvas: head on top, legs on bottom
  const totalH = (HEAD_H + LEGS_H) * SCALE;
  const totalW = HEAD_W * SCALE;
  const spriteCanvas = mkCanvas(totalW, totalH);

  function render(frame) {
    const sctx = spriteCanvas.getContext('2d');
    sctx.clearRect(0,0,totalW,totalH);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(headCanvas, 0, 0);
    const legFrame = legsFrames[frame % legsFrames.length];
    sctx.drawImage(legFrame, 0, HEAD_H*SCALE, LEGS_W*SCALE, LEGS_H*SCALE);
  }

  render(0);
  return { canvas: spriteCanvas, render, width: totalW, height: totalH };
}

// ── BATTLE PARTY SPRITE (static, just head at larger scale)
export function buildPartyBattleSprite(normiePixels) {
  const W=40, H=40;
  const c = mkCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#e3e5e4';
  ctx.fillRect(0,0,W,H);
  if(normiePixels && normiePixels.length>=1600) {
    const S=40;
    for(let i=0;i<1600;i++) {
      if(normiePixels[i]==='1') {
        ctx.fillStyle='#48494b';
        ctx.fillRect(i%S, Math.floor(i/S), 1, 1);
      }
    }
  }
  return c;
}
