// sprites.js — pixel art sprites
// Player: actual Normie NFT pixel art + animated pixel-art legs

const K = '#0e0e0f';
const D = '#383838';
const M = '#707070';
const L = '#aaaaaa';
const W = '#e4e4e0';

function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function px(ctx,x,y,col){if(x<0||y<0||x>=ctx.canvas.width||y>=ctx.canvas.height)return;ctx.fillStyle=col;ctx.fillRect(x,y,1,1);}
function r(ctx,x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(x,y,w,h);}
function dith(ctx,x,y,w,h,ca,cb,pct){
  const t=[[0,0.5],[0.75,0.25]];
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)
    px(ctx,x+dx,y+dy,pct>t[dy%2][dx%2]?cb:ca);
}

// ── ANIMATED LEGS ─────────────────────────────────────────────
function buildLegsFrames(legW) {
  const H=12, frames=[];
  for(let f=0;f<8;f++){
    const c=mkCanvas(legW,H); const ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    r(ctx,1,0,legW-2,3,D); r(ctx,1,0,legW-2,1,M);
    const phase=f/8*Math.PI*2;
    const lOff=Math.round(Math.sin(phase)*2);
    const rOff=-lOff;
    const lKnee=Math.abs(Math.sin(phase))>0.7?1:0;
    const rKnee=Math.abs(Math.sin(phase+Math.PI))>0.7?1:0;
    const lx=Math.floor(legW*0.15);
    r(ctx,lx,3,3,3+lKnee,D); r(ctx,lx,3,1,3+lKnee,M);
    r(ctx,lx+Math.round(lOff*0.4),6+lKnee,3,2,D);
    r(ctx,lx+Math.round(lOff*0.7)-1,8+lKnee,4,1,K);
    px(ctx,lx+Math.round(lOff*0.7),8+lKnee,M);
    const rx=Math.floor(legW*0.6);
    r(ctx,rx,3,3,3+rKnee,D); r(ctx,rx,3,1,3+rKnee,M);
    r(ctx,rx+Math.round(rOff*0.4),6+rKnee,3,2,D);
    r(ctx,rx+Math.round(rOff*0.7)-1,8+rKnee,4,1,K);
    px(ctx,rx+Math.round(rOff*0.7),8+rKnee,M);
    frames.push(c);
  }
  return frames;
}
export function buildLegsFrames8(w){ return buildLegsFrames(w); }

// ── Normie pixel string → canvas ─────────────────────────────
export function normiePixelsToCanvas(pixelStr, size) {
  const c=mkCanvas(size,size); const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,size,size);
  const S=40, scale=size/S;
  if(pixelStr&&pixelStr.length>=1600){
    ctx.fillStyle=K;
    for(let i=0;i<1600;i++){
      if(pixelStr[i]==='1'){
        const bx=i%S, by=Math.floor(i/S);
        ctx.fillRect(Math.floor(bx*scale),Math.floor(by*scale),
                     Math.max(1,Math.ceil(scale)),Math.max(1,Math.ceil(scale)));
      }
    }
  } else {
    ctx.fillStyle=W; ctx.fillRect(0,0,size,size);
    ctx.fillStyle=K; ctx.fillRect(4,4,size-8,size-8);
    ctx.fillStyle=W; ctx.fillRect(5,5,size-10,size-10);
    const e=Math.max(1,Math.floor(size/8));
    ctx.fillStyle=K;
    ctx.fillRect(Math.floor(size*.25),Math.floor(size*.35),e,e);
    ctx.fillRect(Math.floor(size*.60),Math.floor(size*.35),e,e);
    ctx.fillRect(Math.floor(size*.30),Math.floor(size*.60),Math.floor(size*.4),Math.max(1,Math.floor(size/14)));
  }
  return c;
}

// ── PLAYER SPRITE ─────────────────────────────────────────────
// The Normie NFT art IS the full character body, legs added below
export function buildPlayerSprite(normiePixels) {
  const NFT_SIZE=26;
  const LEGS_H=12;
  const TOTAL_H=NFT_SIZE+LEGS_H;
  const SC=2;
  const normieC = normiePixelsToCanvas(normiePixels, NFT_SIZE);
  const legsFrames = buildLegsFrames(NFT_SIZE);
  const spriteC = mkCanvas(NFT_SIZE*SC, TOTAL_H*SC);

  function render(frame) {
    const sctx=spriteC.getContext('2d');
    sctx.imageSmoothingEnabled=false;
    sctx.clearRect(0,0,NFT_SIZE*SC,TOTAL_H*SC);
    sctx.drawImage(normieC, 0, 0, NFT_SIZE*SC, NFT_SIZE*SC);
    const lf=legsFrames[frame%legsFrames.length];
    sctx.drawImage(lf, 0, NFT_SIZE*SC, NFT_SIZE*SC, LEGS_H*SC);
  }
  render(0);
  return {canvas:spriteC, render, width:NFT_SIZE*SC, height:TOTAL_H*SC};
}

// ── BATTLE PORTRAIT (40×40) ───────────────────────────────────
export function buildPartyBattleSprite(normiePixels) {
  const SIZE=40;
  const c=mkCanvas(SIZE,SIZE); const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle=W; ctx.fillRect(0,0,SIZE,SIZE);
  if(normiePixels&&normiePixels.length>=1600){
    ctx.fillStyle=K;
    for(let i=0;i<1600;i++){
      if(normiePixels[i]==='1') ctx.fillRect(i%40,Math.floor(i/40),1,1);
    }
    ctx.globalAlpha=0.07; ctx.fillStyle=W;
    for(let y=0;y<20;y++) for(let x=0;x<20;x++) if((x+y)%2===0) ctx.fillRect(x,y,1,1);
    ctx.globalAlpha=1;
  } else {
    ctx.fillStyle=D; ctx.fillRect(8,2,24,8);
    ctx.fillStyle=W; ctx.fillRect(6,10,28,20);
    ctx.fillStyle=D; ctx.fillRect(10,14,8,5); ctx.fillRect(22,14,8,5);
    ctx.fillStyle=K; ctx.fillRect(12,15,2,2); ctx.fillRect(24,15,2,2);
    ctx.fillStyle=D; ctx.fillRect(14,25,12,3);
  }
  ctx.fillStyle=K;
  ctx.fillRect(0,0,SIZE,1); ctx.fillRect(0,SIZE-1,SIZE,1);
  ctx.fillRect(0,0,1,SIZE); ctx.fillRect(SIZE-1,0,1,SIZE);
  ctx.fillStyle=M;
  ctx.fillRect(1,1,SIZE-2,1); ctx.fillRect(1,1,1,SIZE-2);
  return c;
}

// ── NPC SPRITES ───────────────────────────────────────────────
const NPC_ART = {
  elder_f: (ctx) => {
    r(ctx,5,0,6,2,D); r(ctx,6,0,4,3,K);
    r(ctx,3,2,10,8,W); r(ctx,2,3,12,5,W);
    r(ctx,3,2,1,8,M); r(ctx,12,2,1,8,K); r(ctx,2,3,1,5,M); r(ctx,13,3,1,5,K);
    r(ctx,4,4,3,2,K); r(ctx,9,4,3,2,K);
    px(ctx,5,4,W); px(ctx,10,4,W); px(ctx,5,5,L); px(ctx,10,5,L);
    px(ctx,4,6,L); px(ctx,11,6,L);
    r(ctx,6,7,4,1,D); px(ctx,5,7,M); px(ctx,10,7,M);
    r(ctx,2,10,12,12,M); r(ctx,2,10,12,1,L); r(ctx,2,10,1,12,L); r(ctx,13,10,1,12,K);
    r(ctx,4,10,8,10,L); r(ctx,4,10,8,1,W); r(ctx,4,10,1,10,W);
    r(ctx,0,11,2,8,D); r(ctx,0,11,1,8,M); r(ctx,14,11,2,8,D); r(ctx,15,11,1,8,M);
    r(ctx,0,19,2,2,L); r(ctx,14,19,2,2,L);
    r(ctx,3,22,4,2,D); r(ctx,9,22,4,2,D); r(ctx,3,22,2,1,M); r(ctx,9,22,2,1,M);
  },
  neighbor: (ctx) => {
    r(ctx,4,0,8,2,K); for(let i=0;i<4;i++) r(ctx,4+i*2,0,1,3-i%2,K);
    r(ctx,2,2,12,8,W); r(ctx,1,3,14,5,W);
    r(ctx,2,2,1,8,M); r(ctx,13,2,1,8,K); r(ctx,1,3,1,5,M); r(ctx,14,3,1,5,K);
    r(ctx,3,4,3,2,K); r(ctx,9,4,3,2,K);
    px(ctx,4,4,W); px(ctx,10,4,W); px(ctx,4,5,L); px(ctx,10,5,L);
    r(ctx,6,7,5,1,D); px(ctx,10,7,M);
    r(ctx,2,10,12,12,D); r(ctx,2,10,12,1,M); r(ctx,2,10,1,12,M); r(ctx,13,10,1,12,K);
    r(ctx,7,10,2,12,K); px(ctx,7,11,M); px(ctx,7,14,M); px(ctx,7,17,M);
    r(ctx,4,10,4,3,M); r(ctx,8,10,4,3,M);
    r(ctx,0,11,2,9,D); r(ctx,0,11,1,9,M); r(ctx,14,11,2,9,D); r(ctx,15,11,1,9,M);
    r(ctx,3,22,4,2,M); r(ctx,9,22,4,2,M); r(ctx,3,22,2,1,L); r(ctx,9,22,2,1,L);
  },
  guard: (ctx) => {
    r(ctx,3,0,10,4,D); r(ctx,2,3,12,2,K);
    r(ctx,3,2,10,2,K); r(ctx,4,2,4,1,D); r(ctx,8,2,4,1,D);
    px(ctx,4,2,M); px(ctx,5,2,M);
    r(ctx,3,4,10,5,D); r(ctx,3,4,10,1,M);
    r(ctx,2,9,12,13,D); r(ctx,2,9,12,1,M); r(ctx,2,9,1,13,M); r(ctx,13,9,1,13,K);
    r(ctx,4,10,8,8,M); r(ctx,4,10,8,1,L); r(ctx,4,10,1,8,L);
    r(ctx,7,12,2,4,K); r(ctx,5,13,6,2,K); r(ctx,7,12,1,4,D); r(ctx,5,13,3,1,D);
    r(ctx,0,9,3,5,D); r(ctx,0,9,2,5,M); r(ctx,13,9,3,5,D); r(ctx,15,9,2,5,M);
    r(ctx,0,14,2,6,D); r(ctx,0,14,1,6,M); r(ctx,14,14,2,6,D); r(ctx,15,14,1,6,M);
    r(ctx,3,22,4,2,K); r(ctx,9,22,4,2,K); r(ctx,3,22,2,1,D); r(ctx,9,22,2,1,D);
  },
  merchant: (ctx) => {
    r(ctx,5,0,6,4,K); r(ctx,5,0,6,1,D); r(ctx,3,3,10,2,K); r(ctx,3,3,10,1,D);
    r(ctx,3,5,10,7,W); r(ctx,2,6,12,5,W);
    r(ctx,3,5,1,7,M); r(ctx,12,5,1,7,K); r(ctx,2,6,1,5,M); r(ctx,13,6,1,5,K);
    r(ctx,4,7,3,2,K); r(ctx,9,7,3,2,K);
    px(ctx,5,7,D); px(ctx,10,7,D);
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++)
      if(Math.abs(dx)+Math.abs(dy)===1) px(ctx,10+dx,7+dy,K);
    r(ctx,5,10,6,1,D);
    r(ctx,2,12,12,10,D); r(ctx,2,12,12,1,M); r(ctx,2,12,1,10,M); r(ctx,13,12,1,10,K);
    r(ctx,5,12,3,5,M); r(ctx,8,12,3,5,M); r(ctx,5,12,6,10,M); r(ctx,5,12,1,10,L);
    r(ctx,7,15,2,1,L);
    r(ctx,0,13,2,6,D); r(ctx,0,13,1,6,M); r(ctx,14,13,2,6,D); r(ctx,15,13,1,6,M);
  },
  oracle: (ctx) => {
    for(let i=0;i<6;i++) r(ctx,2+i*2,Math.max(0,-(i%3)),2,3+i%2,K);
    r(ctx,3,0,10,3,D);
    r(ctx,3,3,10,7,W); r(ctx,2,4,12,5,W);
    r(ctx,3,3,1,7,M); r(ctx,12,3,1,7,K); r(ctx,2,4,1,5,M); r(ctx,13,4,1,5,K);
    r(ctx,3,5,4,3,K); r(ctx,9,5,4,3,K);
    r(ctx,4,5,2,3,W); r(ctx,10,5,2,3,W);
    px(ctx,5,6,L); px(ctx,11,6,L); px(ctx,4,6,M); px(ctx,10,6,M);
    r(ctx,5,9,6,1,D); px(ctx,4,9,M); px(ctx,11,9,M);
    r(ctx,2,10,12,13,M); r(ctx,2,10,12,1,L); r(ctx,2,10,1,13,L); r(ctx,13,10,1,13,K);
    [[5,13],[11,16],[7,19],[10,21],[4,18]].forEach(([sx,sy])=>{
      px(ctx,sx,sy,W); px(ctx,sx-1,sy,L); px(ctx,sx+1,sy,L); px(ctx,sx,sy-1,L); px(ctx,sx,sy+1,L);
    });
    r(ctx,0,11,2,9,M); dith(ctx,0,14,2,6,M,D,0.5);
    r(ctx,14,11,2,9,M); dith(ctx,14,14,2,6,M,D,0.5);
  },
  innkeeper: (ctx) => {
    r(ctx,4,0,8,3,D); r(ctx,3,1,10,2,D);
    r(ctx,3,2,10,8,W); r(ctx,2,3,12,6,W);
    r(ctx,3,2,1,8,M); r(ctx,12,2,1,8,K); r(ctx,2,3,1,6,M); r(ctx,13,3,1,6,K);
    r(ctx,3,5,3,2,L); r(ctx,10,5,3,2,L);
    r(ctx,4,4,3,3,K); r(ctx,9,4,3,3,K);
    px(ctx,5,5,W); px(ctx,10,5,W); px(ctx,5,6,L); px(ctx,10,6,L);
    r(ctx,5,8,6,1,D); px(ctx,4,8,M); px(ctx,11,8,M); px(ctx,5,9,M); px(ctx,10,9,M);
    r(ctx,2,10,12,12,D); r(ctx,2,10,12,1,M); r(ctx,2,10,1,12,M); r(ctx,13,10,1,12,K);
    r(ctx,4,10,8,11,W); r(ctx,4,10,8,1,L); r(ctx,4,10,1,11,L);
    px(ctx,3,10,L); px(ctx,12,10,L);
    r(ctx,0,11,2,8,D); r(ctx,0,11,1,8,M); r(ctx,14,11,2,8,D); r(ctx,15,11,1,8,M);
    r(ctx,0,18,2,3,L); r(ctx,14,18,2,3,L); r(ctx,0,19,2,1,W); r(ctx,14,19,2,1,W);
    r(ctx,3,22,4,2,D); r(ctx,9,22,4,2,D); r(ctx,3,22,2,1,M); r(ctx,9,22,2,1,M);
  },
  scholar: (ctx) => {
    r(ctx,4,0,8,3,K); r(ctx,8,0,1,3,L); r(ctx,3,1,10,2,K);
    r(ctx,3,3,10,8,W); r(ctx,2,4,12,6,W);
    r(ctx,3,3,1,8,M); r(ctx,12,3,1,8,K); r(ctx,2,4,1,6,M); r(ctx,13,4,1,6,K);
    r(ctx,3,5,4,3,K); r(ctx,9,5,4,3,K);
    r(ctx,4,5,2,3,L); r(ctx,10,5,2,3,L); px(ctx,4,6,W); px(ctx,10,6,W);
    r(ctx,7,6,2,1,K); px(ctx,5,6,D); px(ctx,11,6,D);
    r(ctx,6,9,4,1,D); px(ctx,5,9,M); px(ctx,10,9,M);
    r(ctx,2,11,12,11,M); r(ctx,2,11,12,1,L); r(ctx,2,11,1,11,L); r(ctx,13,11,1,11,K);
    r(ctx,4,13,8,8,D); r(ctx,4,13,8,1,M); r(ctx,4,13,1,8,M); r(ctx,11,13,1,8,K);
    for(let i=0;i<3;i++) r(ctx,5,14+i*2,6,1,L);
    r(ctx,2,13,2,8,M); r(ctx,12,13,2,8,M);
    r(ctx,3,22,4,2,D); r(ctx,9,22,4,2,D);
  },
  blacksmith: (ctx) => {
    r(ctx,3,0,10,2,K);
    r(ctx,2,2,12,8,W); r(ctx,1,3,14,6,W);
    r(ctx,2,2,1,8,M); r(ctx,13,2,1,8,K); r(ctx,1,3,1,6,M); r(ctx,14,3,1,6,K);
    r(ctx,3,3,5,2,D); r(ctx,8,3,5,2,D);
    r(ctx,4,5,3,2,K); r(ctx,9,5,3,2,K); px(ctx,5,5,D); px(ctx,10,5,D);
    r(ctx,3,9,10,1,L); r(ctx,6,6,1,4,L);
    r(ctx,1,10,14,13,D); r(ctx,1,10,14,1,M); r(ctx,1,10,1,13,M); r(ctx,14,10,1,13,K);
    r(ctx,3,10,10,13,K); r(ctx,3,10,10,1,D); r(ctx,3,10,1,13,D);
    r(ctx,4,13,3,2,M); r(ctx,9,13,3,2,M);
    r(ctx,0,10,1,10,M); r(ctx,15,10,1,10,M);
    r(ctx,13,14,3,2,K); r(ctx,14,16,1,6,D); r(ctx,13,14,1,2,D); r(ctx,15,14,1,2,M);
    r(ctx,2,22,5,2,K); r(ctx,9,22,5,2,K); r(ctx,2,22,2,2,D); r(ctx,9,22,2,2,D);
  },
  spirit: (ctx) => {
    dith(ctx,4,0,8,3,'rgba(0,0,0,0)',D,0.3);
    r(ctx,3,3,10,8,'rgba(112,112,112,0.7)');
    r(ctx,2,4,12,6,'rgba(112,112,112,0.75)');
    r(ctx,4,5,4,4,K); r(ctx,8,5,4,4,K);
    px(ctx,5,7,D); px(ctx,6,7,D); px(ctx,9,7,D); px(ctx,10,7,D);
    px(ctx,5,6,L); px(ctx,10,6,L);
    r(ctx,5,9,6,1,K);
    dith(ctx,3,11,10,5,'rgba(0,0,0,0)',M,0.65);
    dith(ctx,4,14,8,5,'rgba(0,0,0,0)',M,0.5);
    dith(ctx,0,12,3,5,'rgba(0,0,0,0)',D,0.5);
    dith(ctx,13,12,3,5,'rgba(0,0,0,0)',D,0.5);
  },
  survivor: (ctx) => {
    r(ctx,4,0,8,3,D); for(let i=0;i<5;i++) px(ctx,4+i,i%2,K);
    r(ctx,3,1,10,2,K);
    r(ctx,3,2,10,8,W); r(ctx,2,3,12,6,W);
    r(ctx,3,2,1,8,M); r(ctx,12,2,1,8,K); r(ctx,2,3,1,6,M); r(ctx,13,3,1,6,K);
    r(ctx,4,4,3,3,K); r(ctx,9,4,3,3,K); px(ctx,5,5,D); px(ctx,10,5,D);
    r(ctx,4,7,2,1,D); r(ctx,9,7,2,1,D); px(ctx,3,6,M); px(ctx,12,6,M);
    r(ctx,6,8,4,1,K); px(ctx,5,8,D); px(ctx,10,8,D);
    r(ctx,2,10,12,12,D); r(ctx,2,10,12,1,M); r(ctx,2,10,1,12,M); r(ctx,13,10,1,12,K);
    r(ctx,6,12,2,2,K); r(ctx,10,16,2,3,K); r(ctx,4,20,2,2,K);
    r(ctx,0,12,2,4,W); r(ctx,14,12,2,4,W);
    r(ctx,3,22,4,2,K); r(ctx,9,22,4,2,K);
  },
};

export function buildNpcSprite(type, scale=2) {
  const NW=16, NH=24;
  const tmp=mkCanvas(NW,NH); const ctx=tmp.getContext('2d');
  ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,NW,NH);
  (NPC_ART[type]||NPC_ART.neighbor)(ctx);
  const out=mkCanvas(NW*scale,NH*scale); const octx=out.getContext('2d');
  octx.imageSmoothingEnabled=false; octx.drawImage(tmp,0,0,NW*scale,NH*scale);
  return out;
}

// ── ENEMY SPRITES ─────────────────────────────────────────────
let _rSeed=12345;
function rr(){_rSeed=(_rSeed*1664525+1013904223)&0x7fffffff;return _rSeed/0x7fffffff;}

const ENEMY_ART = {
  void_scout: (ctx) => {
    dith(ctx,8,0,16,32,K,D,0.6);
    r(ctx,10,2,12,10,D); r(ctx,10,2,12,1,M); r(ctx,10,2,1,10,M); r(ctx,21,2,1,10,K);
    r(ctx,11,4,4,4,K); r(ctx,17,4,4,4,K);
    r(ctx,12,4,2,4,D); r(ctx,18,4,2,4,D);
    px(ctx,12,6,L); px(ctx,19,6,L);
    dith(ctx,9,12,14,12,K,D,0.75);
    r(ctx,11,12,10,10,D); r(ctx,11,12,10,1,M); r(ctx,11,12,1,10,M);
    r(ctx,6,14,5,3,D); r(ctx,6,14,2,3,K);
    for(let i=0;i<4;i++){r(ctx,3+i,16+i%2,2,3,K);}
    r(ctx,21,14,5,3,D); r(ctx,24,14,2,3,K);
    for(let i=0;i<4;i++){r(ctx,27-i,16+i%2,2,3,K);}
    for(let i=0;i<8;i++) px(ctx,Math.floor(rr()*24)+4,Math.floor(rr()*24)+4,rr()<0.5?M:L);
    dith(ctx,10,22,12,8,D,K,0.6);
  },
  glitch: (ctx) => {
    r(ctx,4,4,24,24,D); r(ctx,4,4,24,1,M); r(ctx,4,4,1,24,M); r(ctx,27,4,1,24,K);
    r(ctx,6,6,20,20,M);
    for(let i=0;i<5;i++){const gy=8+i*4,gx=4+Math.floor(rr()*6);r(ctx,gx,gy,20-Math.floor(rr()*8),2,rr()<0.5?K:L);}
    r(ctx,8,10,6,4,K); r(ctx,18,10,6,4,K);
    r(ctx,9,10,4,4,D); r(ctx,19,10,4,4,D);
    px(ctx,10,12,W); px(ctx,11,12,W); px(ctx,20,12,W); px(ctx,21,12,W);
    for(let i=0;i<12;i++) r(ctx,4+Math.floor(rr()*22),4+Math.floor(rr()*22),2,2,rr()<0.5?K:W);
    r(ctx,10,18,12,2,K); for(let x=10;x<22;x+=3) px(ctx,x,18,D);
    r(ctx,7,22,18,4,K); px(ctx,8,23,M); px(ctx,9,23,M); px(ctx,11,23,M); px(ctx,15,23,M);
  },
  void_heavy: (ctx) => {
    r(ctx,4,0,24,32,D); r(ctx,4,0,24,1,M); r(ctx,4,0,1,32,M); r(ctx,27,0,1,32,K);
    r(ctx,6,0,20,8,K); r(ctx,5,2,22,6,D);
    r(ctx,7,3,18,3,K); r(ctx,8,3,5,2,D); r(ctx,16,3,5,2,D);
    px(ctx,8,4,M); px(ctx,9,4,M); px(ctx,16,4,M); px(ctx,17,4,M);
    r(ctx,10,8,12,3,D); r(ctx,10,8,12,1,M);
    r(ctx,5,11,22,14,M); r(ctx,5,11,22,1,L); r(ctx,5,11,1,14,L); r(ctx,26,11,1,14,K);
    r(ctx,7,13,18,10,D); r(ctx,7,13,18,1,L); r(ctx,7,13,1,10,L); r(ctx,24,13,1,10,K);
    r(ctx,14,15,4,8,K); r(ctx,11,18,10,3,K); r(ctx,14,15,2,8,D); r(ctx,11,18,5,2,D);
    r(ctx,1,10,5,7,D); r(ctx,1,10,3,7,M); r(ctx,26,10,5,7,D); r(ctx,29,10,3,7,M);
    r(ctx,2,17,4,8,D); r(ctx,2,17,2,8,M); r(ctx,26,17,4,8,D); r(ctx,28,17,2,8,M);
    r(ctx,1,24,5,4,K); r(ctx,26,24,5,4,K); r(ctx,1,24,3,4,D); r(ctx,26,24,3,4,D);
    r(ctx,6,25,8,6,D); r(ctx,18,25,8,6,D); r(ctx,6,25,5,6,M); r(ctx,18,25,5,6,M);
    r(ctx,5,30,10,2,K); r(ctx,17,30,10,2,K);
  },
  wraith: (ctx) => {
    dith(ctx,6,0,20,4,K,D,0.5);
    r(ctx,8,2,16,8,D); r(ctx,8,2,16,1,M); r(ctx,8,2,1,8,M); r(ctx,23,2,1,8,K);
    r(ctx,9,3,14,8,K); r(ctx,10,3,12,7,D);
    r(ctx,10,5,5,4,K); r(ctx,17,5,5,4,K);
    r(ctx,11,5,3,4,D); r(ctx,18,5,3,4,D);
    px(ctx,12,7,L); px(ctx,13,7,L); px(ctx,19,7,L); px(ctx,20,7,L);
    r(ctx,10,9,12,2,K); for(let x=10;x<22;x+=2) r(ctx,x,9,1,2,D);
    r(ctx,7,11,18,8,D); r(ctx,7,11,18,1,M); r(ctx,7,11,1,8,M);
    dith(ctx,8,14,16,4,D,K,0.4); dith(ctx,9,18,14,5,D,K,0.6);
    dith(ctx,10,22,12,5,K,D,0.7); dith(ctx,11,26,10,4,K,'rgba(0,0,0,0)',0.7);
    r(ctx,2,12,6,4,D); dith(ctx,2,14,6,4,D,K,0.5);
    r(ctx,24,12,6,4,D); dith(ctx,24,14,6,4,D,K,0.5);
    for(let i=0;i<5;i++) dith(ctx,10+i*2,28,2,3,K,'rgba(0,0,0,0)',0.5);
  },
  guardian: (ctx) => {
    r(ctx,2,0,28,32,D); r(ctx,2,0,28,1,M); r(ctx,2,0,1,32,M); r(ctx,29,0,1,32,K);
    r(ctx,6,0,20,8,M); r(ctx,6,0,20,1,L); r(ctx,6,0,1,8,L); r(ctx,25,0,1,8,K);
    for(let i=0;i<6;i++) r(ctx,7+i*3,2,2,1,L);
    r(ctx,8,2,6,5,K); r(ctx,18,2,6,5,K);
    r(ctx,9,2,4,5,D); r(ctx,19,2,4,5,D);
    px(ctx,10,4,W); px(ctx,11,4,W); px(ctx,20,4,W); px(ctx,21,4,W);
    px(ctx,10,5,L); px(ctx,11,5,L); px(ctx,20,5,L); px(ctx,21,5,L);
    r(ctx,4,8,24,16,M); r(ctx,4,8,24,1,L); r(ctx,4,8,1,16,L); r(ctx,27,8,1,16,K);
    r(ctx,6,10,20,12,D); r(ctx,6,10,20,1,L); r(ctx,6,10,1,12,L);
    [[8,12],[18,12],[13,16],[8,20],[18,20]].forEach(([rx,ry])=>{
      r(ctx,rx,ry,4,1,L); r(ctx,rx+1,ry-1,2,3,L); px(ctx,rx,ry-1,M); px(ctx,rx+3,ry-1,M);
    });
    r(ctx,12,14,8,6,K); r(ctx,13,15,6,4,W); r(ctx,14,15,4,4,L); r(ctx,15,16,2,2,W);
    dith(ctx,12,14,8,1,K,L,0.5);
    r(ctx,0,8,4,14,D); r(ctx,0,8,3,14,M); r(ctx,28,8,4,14,D); r(ctx,30,8,2,14,M);
    r(ctx,0,21,5,5,M); r(ctx,0,21,3,5,L); r(ctx,27,21,5,5,M); r(ctx,29,21,3,5,L);
    r(ctx,6,24,9,8,M); r(ctx,6,24,6,8,D); r(ctx,17,24,9,8,M); r(ctx,17,24,6,8,D);
    r(ctx,5,30,11,2,L); r(ctx,16,30,11,2,L);
  },
  golem: (ctx) => {
    r(ctx,4,4,24,24,M); r(ctx,4,4,24,1,L); r(ctx,4,4,1,24,L); r(ctx,27,4,1,24,K);
    for(let y=4;y<28;y+=4) r(ctx,4,y,24,1,D);
    for(let x=4;x<28;x+=4) r(ctx,x,4,1,24,D);
    r(ctx,8,8,16,10,D); r(ctx,8,8,16,1,M); r(ctx,8,8,1,10,M); r(ctx,23,8,1,10,K);
    r(ctx,9,10,5,5,K); r(ctx,18,10,5,5,K);
    r(ctx,10,10,3,5,L); r(ctx,19,10,3,5,L); r(ctx,10,11,2,3,W); r(ctx,19,11,2,3,W);
    r(ctx,10,17,12,2,K); for(let x=10;x<22;x+=2) px(ctx,x,17,D);
    r(ctx,1,4,4,6,M); r(ctx,1,4,3,6,L); r(ctx,27,4,4,6,M); r(ctx,29,4,2,6,L);
    r(ctx,0,9,5,12,D); r(ctx,0,9,3,12,M); r(ctx,27,9,5,12,D); r(ctx,29,9,2,12,M);
    r(ctx,0,20,6,6,M); r(ctx,0,20,4,6,L); r(ctx,26,20,6,6,M); r(ctx,28,20,4,6,L);
    r(ctx,7,27,7,4,M); r(ctx,7,27,5,4,L); r(ctx,18,27,7,4,M); r(ctx,18,27,5,4,L);
  },
  commander: (ctx) => {
    for(let i=0;i<6;i++){const cx=6+i*4,cy=4-i%2*3;r(ctx,cx,cy,2,6-cy,D);px(ctx,cx,cy,L);px(ctx,cx+1,cy,M);}
    r(ctx,6,5,20,4,D); r(ctx,6,5,20,1,M); r(ctx,6,5,1,4,M); r(ctx,25,5,1,4,K);
    r(ctx,8,8,16,8,D); r(ctx,8,8,16,1,M); r(ctx,8,8,1,8,M); r(ctx,23,8,1,8,K);
    r(ctx,10,10,4,3,K); r(ctx,18,10,4,3,K);
    px(ctx,11,11,W); px(ctx,12,11,W); px(ctx,19,11,W); px(ctx,20,11,W);
    px(ctx,11,12,L); px(ctx,12,12,L); px(ctx,19,12,L); px(ctx,20,12,L);
    r(ctx,11,14,10,2,K); r(ctx,11,14,10,1,D);
    r(ctx,6,16,20,14,D); r(ctx,6,16,20,1,M); r(ctx,6,16,1,14,M); r(ctx,25,16,1,14,K);
    r(ctx,9,17,14,8,M); r(ctx,9,17,14,1,L); r(ctx,9,17,1,8,L);
    r(ctx,11,19,10,4,D); r(ctx,12,19,8,1,L);
    for(let i=0;i<3;i++) px(ctx,12+i*3,20,W);
    r(ctx,2,15,5,6,D); r(ctx,2,15,3,6,M); r(ctx,25,15,5,6,D); r(ctx,28,15,2,6,M);
    r(ctx,1,16,4,15,M); dith(ctx,0,20,4,11,M,D,0.5);
    r(ctx,27,16,4,15,M); dith(ctx,28,20,4,11,M,D,0.5);
    r(ctx,10,24,12,4,K); r(ctx,10,24,12,1,D);
    for(let i=0;i<4;i++) px(ctx,11+i*3,25,L);
    r(ctx,8,29,6,3,K); r(ctx,18,29,6,3,K); r(ctx,8,29,4,3,D); r(ctx,18,29,4,3,D);
  },
  nullbyte: (ctx) => {
    dith(ctx,0,0,32,32,K,D,0.65);
    r(ctx,3,2,26,28,D); r(ctx,3,2,26,2,M); r(ctx,3,2,2,28,M); r(ctx,28,2,1,28,K);
    for(let i=0;i<25;i++) px(ctx,Math.floor(rr()*24)+4,Math.floor(rr()*24)+3,rr()<0.6?M:L);
    r(ctx,5,4,6,5,K); r(ctx,13,3,6,6,K); r(ctx,21,4,6,5,K);
    r(ctx,6,5,4,3,D); r(ctx,7,5,2,3,M); px(ctx,7,6,W); px(ctx,8,6,W);
    r(ctx,14,4,4,4,D); r(ctx,15,4,2,4,M); px(ctx,15,5,W); px(ctx,16,5,W);
    r(ctx,22,5,4,3,D); r(ctx,23,5,2,3,M); px(ctx,23,6,W); px(ctx,24,6,W);
    r(ctx,10,9,4,4,K); r(ctx,11,9,2,4,D); px(ctx,11,11,W);
    r(ctx,5,14,22,10,K); r(ctx,6,15,20,1,D);
    for(let x=5;x<27;x+=3){r(ctx,x,14,2,4,M);r(ctx,x+1,14,1,4,L);}
    for(let x=6;x<26;x+=3){r(ctx,x,20,2,4,M);r(ctx,x+1,21,1,3,L);}
    r(ctx,0,6,4,4,D); dith(ctx,0,8,4,5,D,K,0.55);
    r(ctx,28,6,4,4,D); dith(ctx,28,8,4,5,D,K,0.55);
    r(ctx,0,14,3,5,D); dith(ctx,0,17,3,5,D,K,0.65);
    r(ctx,29,14,3,5,D); dith(ctx,29,17,3,5,D,K,0.65);
    r(ctx,4,24,24,6,K);
    [[5,25],[5,26],[5,27],[5,28],[6,28],[7,25],[7,26],[7,27],[7,28],
     [9,25],[9,28],[10,28],[11,25],[11,28],
     [13,25],[13,26],[13,27],[13,28],[14,28],[15,25],[15,28],
     [17,25],[17,26],[17,27],[18,25],[19,26],[19,27],[19,28]
    ].forEach(([nx,ny])=>px(ctx,nx,ny,W));
    r(ctx,12,14,8,8,K); r(ctx,13,15,6,6,D); r(ctx,14,16,4,4,M); r(ctx,15,17,2,2,W);
  },
};

export function buildEnemySprite(type) {
  _rSeed=12345+((type||'').charCodeAt(0)||0)*7;
  const EW=32,EH=32,SC=2;
  const tmp=mkCanvas(EW,EH); const ctx=tmp.getContext('2d');
  ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,EW,EH);
  (ENEMY_ART[type]||ENEMY_ART.void_scout)(ctx);
  const out=mkCanvas(EW*SC,EH*SC); const octx=out.getContext('2d');
  octx.imageSmoothingEnabled=false; octx.drawImage(tmp,0,0,EW*SC,EH*SC);
  return out;
}
