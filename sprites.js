// sprites.js — SNES/GB-quality monochrome pixel art
// 5-tone palette, Bayer dithering, proper shading & anatomy

// ─── 5-TONE GRAYSCALE PALETTE ───────────────────────────────────────────────
// Mimics Game Boy / GB Pokémon look: high contrast, punchy
const K  = '#0e0e0f';  // near-black  — hard outlines, deepest shadow
const D  = '#383838';  // dark        — shadow fill, recessed surfaces
const M  = '#707070';  // mid         — main body fill
const L  = '#aaaaaa';  // light       — lit surfaces, highlights
const W  = '#e4e4e0';  // near-white  — brightest hits, faces, sky
const TR = 'rgba(0,0,0,0)';

function mkCanvas(w,h){ const c=document.createElement('canvas');c.width=w;c.height=h;return c; }

// Pixel — bounds-safe
function p(ctx,x,y,col){
  if(x<0||y<0||x>=ctx.canvas.width||y>=ctx.canvas.height)return;
  ctx.fillStyle=col; ctx.fillRect(x,y,1,1);
}
// Rect
function r(ctx,x,y,w,h,col){ ctx.fillStyle=col; ctx.fillRect(x,y,w,h); }
// Fill whole canvas
function fill(ctx,col){ r(ctx,0,0,ctx.canvas.width,ctx.canvas.height,col); }

// 2×2 Bayer ordered dither — pct 0=all ca, 1=all cb
function dith(ctx,x,y,w,h,ca,cb,pct){
  const t=[[0,0.5],[0.75,0.25]];
  for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++)
    p(ctx,x+dx,y+dy, pct>t[dy%2][dx%2]?cb:ca);
}
// Horizontal gradient dither
function hgrad(ctx,x,y,w,h,ca,cb){
  for(let dx=0;dx<w;dx++) dith(ctx,x+dx,y,1,h,ca,cb,dx/Math.max(1,w-1));
}
// Vertical gradient dither
function vgrad(ctx,x,y,w,h,ca,cb){
  for(let dy=0;dy<h;dy++) dith(ctx,x,y+dy,w,1,ca,cb,dy/Math.max(1,h-1));
}

// ─── WALKING BODY FRAMES (for player sprite) ────────────────────────────────
function buildBodyFrames(W){
  const H=10, frames=[];
  for(let f=0;f<8;f++){
    const c=mkCanvas(W,H);
    const ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    // Torso
    r(ctx,2,0,W-4,5,D);
    r(ctx,2,0,W-4,1,M);  // shoulder highlight
    r(ctx,2,0,1,5,M);    // left edge light
    r(ctx,W-3,0,1,5,K);  // right edge shadow
    // Arm swing
    const swing=Math.sin(f/8*Math.PI*2)*1.5;
    const la=Math.round(swing), ra=Math.round(-swing);
    r(ctx,0,1+la,2,4,D); r(ctx,0,1+la,1,4,M);
    r(ctx,W-2,1+ra,2,4,D); r(ctx,W-1,1+ra,1,4,M);
    p(ctx,0,5+la,M); p(ctx,W-2,5+ra,M); // hands
    // Walk cycle legs
    const ll=Math.sin(f/8*Math.PI*2)*1.5, rl=-ll;
    const lk=Math.abs(ll)>0.8?1:0, rk=Math.abs(rl)>0.8?1:0;
    r(ctx,3,5,3,3,D); r(ctx,3,5,1,3,M);
    r(ctx,3+Math.round(ll*0.5),7+lk,3,2,D);
    r(ctx,2+Math.round(ll*0.7),9,4,1,K);
    r(ctx,8,5,3,3,D); r(ctx,8,5,1,3,M);
    r(ctx,8+Math.round(rl*0.5),7+rk,3,2,D);
    r(ctx,7+Math.round(rl*0.7),9,4,1,K);
    frames.push(c);
  }
  return frames;
}
export function buildLegsFrames(){ return buildBodyFrames(10); }

// ─── NPC SPRITES (16×24 native → 2× = 32×48) ───────────────────────────────
// Drawn at 1× with proper shaded anatomy, scaled up crisp

const NPC={

  elder_f:(ctx)=>{
    // Hair bun — dark, sitting on top
    r(ctx,5,0,6,3,D); r(ctx,6,1,4,3,K);
    p(ctx,5,1,M); p(ctx,10,1,M);
    // Head — bright face with shaded sides
    r(ctx,3,3,10,7,W);
    r(ctx,3,3,1,7,L);  // left face shade
    r(ctx,12,3,1,7,L);
    r(ctx,3,3,10,1,L); r(ctx,3,9,10,1,L);
    p(ctx,3,3,L); p(ctx,12,3,L); p(ctx,3,9,L); p(ctx,12,9,L);
    // Elderly crinkled eyes
    r(ctx,5,5,2,1,K); r(ctx,9,5,2,1,K);
    p(ctx,4,5,D); p(ctx,7,5,D); p(ctx,8,5,D); p(ctx,11,5,D);
    // Warm smile
    p(ctx,4,7,D); p(ctx,11,7,D);
    r(ctx,6,7,4,1,D);
    // Neck
    r(ctx,6,10,4,2,W); r(ctx,6,11,4,1,L);
    // Dress — shaded
    r(ctx,2,12,12,8,D);
    r(ctx,3,12,10,1,M); r(ctx,2,12,1,8,M);
    r(ctx,13,12,1,8,K);
    // Apron
    r(ctx,5,12,6,7,M); r(ctx,5,12,6,1,L); r(ctx,5,12,1,7,L);
    // Arms
    r(ctx,0,13,3,6,D); r(ctx,0,13,1,6,M);
    r(ctx,13,13,3,6,D); r(ctx,15,13,1,6,M);
    r(ctx,0,18,3,2,M); r(ctx,13,18,3,2,M);
    // Legs + shoes
    r(ctx,4,20,3,4,D); r(ctx,9,20,3,4,D);
    r(ctx,4,20,1,4,M); r(ctx,9,20,1,4,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
    r(ctx,3,23,2,1,M); r(ctx,8,23,2,1,M);
  },

  neighbor:(ctx)=>{
    // Spiky hair
    r(ctx,3,0,10,4,D); r(ctx,3,0,10,1,M);
    p(ctx,2,1,D); p(ctx,13,1,D); p(ctx,1,2,K); p(ctx,14,2,K);
    p(ctx,4,0,K); p(ctx,7,0,K); p(ctx,10,0,K);
    // Head
    r(ctx,3,4,10,6,W);
    r(ctx,3,4,1,6,L); r(ctx,12,4,1,6,L);
    r(ctx,3,4,10,1,L); r(ctx,3,9,10,1,L);
    // Alert eyes with highlight dot
    r(ctx,5,6,2,2,K); r(ctx,9,6,2,2,K);
    p(ctx,6,6,D); p(ctx,10,6,D);
    p(ctx,5,6,M); p(ctx,9,6,M);
    p(ctx,6,6,W); p(ctx,10,6,W);
    // Mouth
    r(ctx,7,8,2,1,D); p(ctx,6,8,M); p(ctx,9,8,M);
    // Neck
    r(ctx,6,10,4,2,W); r(ctx,6,11,4,1,L);
    // Jacket — two panels
    r(ctx,2,12,12,8,K);
    r(ctx,3,12,5,8,D); r(ctx,9,12,4,8,D);
    r(ctx,7,12,2,8,M); // zipper
    r(ctx,3,12,9,1,M);
    r(ctx,2,12,1,8,M);
    r(ctx,0,13,3,5,K); r(ctx,0,13,1,5,D);
    r(ctx,13,13,3,5,K); r(ctx,15,13,1,5,D);
    r(ctx,0,18,3,2,M); r(ctx,13,18,3,2,M);
    r(ctx,4,20,3,4,D); r(ctx,9,20,3,4,D);
    r(ctx,4,20,1,4,M); r(ctx,9,20,1,4,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  guard:(ctx)=>{
    // Helmet — full coverage
    r(ctx,2,0,12,6,D); r(ctx,2,0,12,1,M); r(ctx,2,0,1,6,M);
    r(ctx,1,3,1,4,D); r(ctx,14,3,1,4,D);
    // Visor — dark with eye slits glowing
    r(ctx,3,2,10,3,K); r(ctx,4,2,8,1,M);
    p(ctx,5,3,L); p(ctx,6,3,W); p(ctx,9,3,L); p(ctx,10,3,W);
    // Face below visor
    r(ctx,4,6,8,4,W); r(ctx,4,9,8,1,L);
    r(ctx,6,8,4,1,M);
    // Neck guard
    r(ctx,5,10,6,2,D); r(ctx,5,10,6,1,M);
    // Chest plate
    r(ctx,1,12,14,8,D); r(ctx,2,12,12,1,M); r(ctx,1,12,1,8,M);
    r(ctx,3,14,10,1,M); r(ctx,3,16,10,1,M); r(ctx,7,12,2,8,D);
    // Pauldrons
    r(ctx,0,12,2,5,M); r(ctx,14,12,2,5,M);
    // Gauntlets
    r(ctx,0,17,2,4,D); r(ctx,14,17,2,4,D);
    r(ctx,0,17,1,4,M); r(ctx,15,17,1,4,M);
    // Greaves
    r(ctx,4,20,3,3,D); r(ctx,9,20,3,3,D);
    r(ctx,4,20,1,3,M); r(ctx,9,20,1,3,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  merchant:(ctx)=>{
    r(ctx,4,0,8,1,D); r(ctx,3,0,10,1,M); // brim
    r(ctx,5,1,6,4,D); r(ctx,5,1,6,1,M); p(ctx,5,1,L); p(ctx,10,1,L); // hat
    r(ctx,3,5,10,5,W); r(ctx,3,5,1,5,L); r(ctx,12,5,1,5,L);
    r(ctx,3,5,10,1,L); r(ctx,3,9,10,1,L);
    r(ctx,5,7,2,1,D); r(ctx,9,7,2,1,D);
    r(ctx,7,8,2,1,K); p(ctx,6,9,D); p(ctx,9,9,D);
    r(ctx,6,10,4,2,W); r(ctx,6,11,4,1,L);
    r(ctx,2,12,12,8,D); r(ctx,5,12,6,8,W); r(ctx,7,12,2,8,M);
    r(ctx,4,12,1,8,D); r(ctx,11,12,1,8,D);
    r(ctx,3,12,8,1,M); r(ctx,2,12,1,8,M);
    r(ctx,0,13,3,6,D); r(ctx,0,13,1,6,M); r(ctx,13,13,3,6,D); r(ctx,15,13,1,6,M);
    r(ctx,0,18,3,2,K); r(ctx,13,18,3,2,K); r(ctx,0,18,2,2,D); r(ctx,13,18,2,2,D);
    r(ctx,4,20,3,4,D); r(ctx,9,20,3,4,D);
    r(ctx,4,20,1,4,M); r(ctx,9,20,1,4,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  oracle:(ctx)=>{
    r(ctx,1,0,14,5,D); r(ctx,1,0,14,1,M);
    p(ctx,0,1,D); p(ctx,15,1,D); p(ctx,0,0,K); p(ctx,15,0,K);
    p(ctx,3,0,K); p(ctx,6,0,K); p(ctx,9,0,K); p(ctx,12,0,K);
    r(ctx,3,5,10,5,W); r(ctx,3,5,1,5,L); r(ctx,12,5,1,5,L);
    r(ctx,3,5,10,1,L); r(ctx,3,9,10,1,L);
    // Glowing eyes
    r(ctx,4,7,3,2,M); r(ctx,9,7,3,2,M);
    p(ctx,5,7,W); p(ctx,6,7,L); p(ctx,10,7,W); p(ctx,11,7,L);
    p(ctx,5,8,L); p(ctx,10,8,L);
    r(ctx,7,9,2,1,D);
    r(ctx,1,11,14,9,D); r(ctx,2,11,12,1,M); r(ctx,1,11,1,9,M);
    // Star pattern
    [[4,13],[8,14],[12,13],[3,16],[7,15],[11,16],[5,18],[10,17]].forEach(([sx,sy])=>{
      p(ctx,sx,sy,W); p(ctx,sx-1,sy,L); p(ctx,sx+1,sy,L);
      p(ctx,sx,sy-1,L); p(ctx,sx,sy+1,L);
    });
    r(ctx,0,12,2,7,D); r(ctx,0,12,1,7,M);
    r(ctx,14,12,2,7,D); r(ctx,15,12,1,7,M);
    r(ctx,4,20,3,4,M); r(ctx,9,20,3,4,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  innkeeper:(ctx)=>{
    r(ctx,3,1,10,4,M); r(ctx,3,1,10,1,L); p(ctx,2,2,M); p(ctx,13,2,M);
    r(ctx,3,5,10,5,W); r(ctx,3,5,1,5,L); r(ctx,12,5,1,5,L);
    r(ctx,3,5,10,1,L); r(ctx,3,9,10,1,L);
    // Big friendly eyes
    r(ctx,5,7,2,2,D); r(ctx,9,7,2,2,D);
    p(ctx,5,7,M); p(ctx,9,7,M); p(ctx,6,7,W); p(ctx,10,7,W);
    p(ctx,5,9,D); p(ctx,10,9,D); r(ctx,6,9,4,1,M);
    r(ctx,6,10,4,2,W); r(ctx,6,11,4,1,L);
    r(ctx,2,12,12,8,M); r(ctx,3,12,10,1,L); r(ctx,2,12,1,8,L);
    r(ctx,4,12,8,8,W); r(ctx,4,12,8,1,L); r(ctx,4,12,1,8,L);
    r(ctx,3,13,2,1,M); r(ctx,11,13,2,1,M);
    r(ctx,0,13,3,6,M); r(ctx,0,13,1,6,L);
    r(ctx,13,13,3,6,M); r(ctx,15,13,1,6,L);
    r(ctx,0,18,3,2,W); r(ctx,13,18,3,2,W);
    r(ctx,4,20,3,4,M); r(ctx,9,20,3,4,M);
    r(ctx,4,20,1,4,L); r(ctx,9,20,1,4,L);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  scholar:(ctx)=>{
    r(ctx,3,1,10,4,D); r(ctx,3,1,10,1,M); p(ctx,3,1,L); p(ctx,12,1,L);
    r(ctx,3,5,10,5,W); r(ctx,3,5,1,5,L); r(ctx,12,5,1,5,L);
    r(ctx,3,5,10,1,L); r(ctx,3,9,10,1,L);
    // Glasses — two lenses + bridge
    r(ctx,4,7,3,2,K); r(ctx,9,7,3,2,K);
    r(ctx,4,7,3,1,D); r(ctx,9,7,3,1,D);
    p(ctx,7,7,D); p(ctx,5,7,W); p(ctx,10,7,W);
    r(ctx,7,9,2,1,M);
    r(ctx,2,12,12,8,M); r(ctx,3,12,10,1,L); r(ctx,2,12,1,8,L);
    r(ctx,7,12,2,8,D);
    // Book
    r(ctx,0,14,3,7,D); r(ctx,0,14,3,1,M); r(ctx,0,15,1,6,L);
    r(ctx,1,16,2,1,M); r(ctx,1,18,2,1,M);
    r(ctx,13,13,3,7,M); r(ctx,15,13,1,7,L); r(ctx,13,19,3,1,W);
    r(ctx,4,20,3,4,M); r(ctx,9,20,3,4,M);
    r(ctx,4,20,1,4,L); r(ctx,9,20,1,4,L);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  blacksmith:(ctx)=>{
    r(ctx,3,1,10,4,D); r(ctx,3,1,10,1,M);
    r(ctx,3,5,10,5,W); r(ctx,3,5,1,5,L); r(ctx,12,5,1,5,L);
    r(ctx,3,5,10,1,L); r(ctx,3,9,10,1,L);
    // Strong jaw + beard
    r(ctx,3,9,10,2,W); r(ctx,3,10,10,1,L);
    r(ctx,5,7,2,1,D); r(ctx,9,7,2,1,D);
    r(ctx,5,9,6,2,D); r(ctx,6,9,4,1,M);
    r(ctx,5,11,6,2,W); r(ctx,5,12,6,1,L);
    // Wide body
    r(ctx,1,13,14,7,D); r(ctx,2,13,12,1,M); r(ctx,1,13,1,7,M);
    r(ctx,4,13,8,7,M); r(ctx,4,13,8,1,L);
    r(ctx,0,13,2,7,D); r(ctx,0,13,1,7,M);
    r(ctx,14,13,2,7,D); r(ctx,15,13,1,7,M);
    // Hammer
    r(ctx,14,17,2,5,M); r(ctx,13,15,4,3,D); r(ctx,13,15,4,1,L);
    r(ctx,4,20,3,4,D); r(ctx,9,20,3,4,D);
    r(ctx,4,20,1,4,M); r(ctx,9,20,1,4,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },

  spirit:(ctx)=>{
    dith(ctx,0,2,16,20,TR,M,0.3);
    r(ctx,4,2,8,7,W); p(ctx,3,3,L); p(ctx,12,3,L); p(ctx,3,8,L); p(ctx,12,8,L);
    r(ctx,4,2,8,1,W);
    // Hollow glowing eyes
    r(ctx,4,4,3,3,D); r(ctx,9,4,3,3,D);
    r(ctx,5,5,1,1,W); r(ctx,10,5,1,1,W);
    p(ctx,5,4,M); p(ctx,10,4,M);
    p(ctx,6,8,M); p(ctx,7,8,L); p(ctx,8,8,L); p(ctx,9,8,M);
    // Flowing wispy body
    r(ctx,3,9,10,3,W); r(ctx,3,9,10,1,L);
    r(ctx,2,12,12,5,L);
    r(ctx,1,17,14,3,M);
    dith(ctx,0,20,16,4,TR,M,0.4);
    r(ctx,0,11,2,5,M); r(ctx,14,11,2,5,M);
    p(ctx,0,16,L); p(ctx,15,16,L);
    r(ctx,0,13,3,4,L); r(ctx,13,13,3,4,L);
    dith(ctx,0,16,3,3,TR,L,0.5); dith(ctx,13,16,3,3,TR,L,0.5);
  },

  survivor:(ctx)=>{
    r(ctx,3,1,10,4,D); p(ctx,2,2,D); p(ctx,13,1,D);
    r(ctx,3,1,10,1,M); p(ctx,4,0,D); p(ctx,9,0,D); p(ctx,12,0,D);
    r(ctx,3,5,10,5,W); r(ctx,3,5,1,5,L); r(ctx,12,5,1,5,L);
    r(ctx,3,5,10,1,L); r(ctx,3,9,10,1,L);
    r(ctx,5,7,2,1,D); r(ctx,9,7,2,1,D);
    p(ctx,4,8,D); p(ctx,7,8,D); // under-eye shadows
    p(ctx,7,9,D); p(ctx,8,9,D); p(ctx,6,9,M); p(ctx,9,9,M);
    r(ctx,6,10,4,2,W); r(ctx,6,11,4,1,L);
    r(ctx,2,12,12,8,D); r(ctx,3,12,10,1,M); r(ctx,2,12,1,8,M);
    // Tears in clothes
    p(ctx,4,14,L); p(ctx,11,16,L); p(ctx,3,17,L); p(ctx,12,13,L); p(ctx,5,19,L);
    r(ctx,0,13,3,6,D); r(ctx,0,13,1,6,M);
    r(ctx,13,13,3,6,D); r(ctx,15,13,1,6,M);
    // Bandage
    r(ctx,0,15,3,2,W); r(ctx,0,15,3,1,L);
    r(ctx,0,18,3,2,M); r(ctx,13,18,3,2,M);
    r(ctx,4,20,3,4,D); r(ctx,9,20,3,4,D);
    r(ctx,4,20,1,4,M); r(ctx,9,20,1,4,M);
    r(ctx,3,23,5,1,K); r(ctx,8,23,5,1,K);
  },
};

export function buildNpcSprite(type){
  const W=16,H=24,SC=2;
  const tmp=mkCanvas(W,H); const tctx=tmp.getContext('2d');
  tctx.imageSmoothingEnabled=false; tctx.clearRect(0,0,W,H);
  (NPC[type]||NPC.neighbor)(tctx);
  const out=mkCanvas(W*SC,H*SC); const octx=out.getContext('2d');
  octx.imageSmoothingEnabled=false;
  octx.drawImage(tmp,0,0,W*SC,H*SC);
  return out;
}

// ─── ENEMY SPRITES (32×32 native → 2× = 64×64) ─────────────────────────────
export function buildEnemySprite(type,seed){
  const W=32,H=32,SC=2;
  const tmp=mkCanvas(W,H); const ctx=tmp.getContext('2d');
  ctx.imageSmoothingEnabled=false;

  // Seeded LCG RNG
  let _s=(seed*2654435761)>>>0;
  function rr(){ _s=(_s^(_s<<13))>>>0; _s=(_s^(_s>>17))>>>0; _s=(_s^(_s<<5))>>>0; return _s/0xffffffff; }

  const enemies={
    void_scout:(ctx)=>{
      // Lithe shadowy humanoid
      r(ctx,11,4,10,12,D); r(ctx,12,4,8,1,M); r(ctx,11,4,1,12,M); r(ctx,20,4,1,12,K);
      // Head
      r(ctx,12,0,8,5,D); r(ctx,12,0,8,1,M); r(ctx,12,0,1,5,M); r(ctx,19,0,1,5,K);
      // Hollow glowing eyes
      r(ctx,13,1,3,2,K); r(ctx,18,1,3,2,K);
      p(ctx,14,1,W); p(ctx,19,1,W); p(ctx,14,2,L); p(ctx,19,2,L);
      // Rictus grin
      r(ctx,14,3,4,1,K);
      p(ctx,14,3,D); p(ctx,15,3,W); p(ctx,16,3,D); p(ctx,17,3,W);
      // Long reaching arms
      r(ctx,7,6,5,2,D); r(ctx,7,6,5,1,M);
      r(ctx,20,6,5,2,D); r(ctx,24,6,1,2,M);
      r(ctx,5,7,4,2,D); r(ctx,22,7,4,2,D);
      p(ctx,5,9,K); p(ctx,6,9,K); p(ctx,23,9,K); p(ctx,25,8,K);
      // Legs
      r(ctx,13,16,3,8,D); r(ctx,13,16,1,8,M);
      r(ctx,17,16,3,8,D); r(ctx,19,16,1,8,M);
      r(ctx,11,23,5,2,K); r(ctx,17,23,5,2,K);
      r(ctx,11,23,3,2,D); r(ctx,17,23,3,2,D);
      // Void static
      for(let i=0;i<14;i++) p(ctx,Math.floor(rr()*28)+2,Math.floor(rr()*28)+2,rr()<0.5?M:L);
    },

    glitch:(ctx)=>{
      // Corrupted data entity — rectangular with glitch scanlines
      r(ctx,8,2,16,24,D);
      r(ctx,8,2,16,1,L); r(ctx,8,2,1,24,M); r(ctx,23,2,1,24,K);
      // Glitch bars
      for(let y=3;y<26;y+=3){
        const off=Math.floor(rr()*4)-2;
        r(ctx,8+Math.max(0,off),y,16-Math.abs(off),2,M);
        if(rr()<0.4) r(ctx,8+Math.floor(rr()*12),y,Math.floor(rr()*4)+1,1,W);
      }
      // Eyes
      r(ctx,11,6,4,3,K); r(ctx,17,6,4,3,K);
      p(ctx,12,7,W); p(ctx,13,7,L); p(ctx,18,7,W); p(ctx,19,7,L);
      // Corrupted mouth
      r(ctx,12,11,8,2,K);
      for(let x=12;x<20;x+=2) p(ctx,x,11,x%4===0?W:M);
      // Arms
      r(ctx,2,8,7,3,D); r(ctx,2,8,7,1,M);
      r(ctx,23,8,7,3,D); r(ctx,28,8,1,3,M);
      // Dissolving legs
      r(ctx,11,26,4,4,D); r(ctx,17,26,4,4,D);
      dith(ctx,11,29,4,3,D,K,0.6); dith(ctx,17,29,4,3,D,K,0.6);
    },

    void_heavy:(ctx)=>{
      // Armored tank — wide, imposing
      r(ctx,7,0,18,9,D); r(ctx,7,0,18,1,M); r(ctx,7,0,1,9,M); r(ctx,24,0,1,9,K);
      r(ctx,6,3,3,7,D); r(ctx,6,3,1,7,M); r(ctx,23,3,3,7,D); r(ctx,25,3,1,7,M);
      // Menacing visor
      r(ctx,9,3,14,3,K); r(ctx,10,3,12,1,M);
      p(ctx,10,4,W); p(ctx,11,4,W); p(ctx,13,4,L);
      p(ctx,17,4,W); p(ctx,18,4,W); p(ctx,20,4,L);
      // Wide body with armor plating
      r(ctx,5,9,22,14,D); r(ctx,5,9,22,1,M); r(ctx,5,9,1,14,M); r(ctx,26,9,1,14,K);
      r(ctx,9,11,14,3,M); r(ctx,14,9,4,14,M);
      r(ctx,9,11,14,1,L); r(ctx,14,9,4,1,L);
      // Massive shoulder plates
      r(ctx,1,8,6,7,D); r(ctx,1,8,1,7,M); r(ctx,1,8,6,1,M);
      r(ctx,25,8,6,7,D); r(ctx,30,8,1,7,M); r(ctx,25,8,6,1,M);
      // Arms
      r(ctx,2,15,4,8,D); r(ctx,2,15,1,8,M); r(ctx,26,15,4,8,D); r(ctx,29,15,1,8,M);
      r(ctx,1,23,5,3,D); r(ctx,1,23,2,3,M); r(ctx,26,23,5,3,D); r(ctx,29,23,2,3,M);
      r(ctx,9,23,6,9,D); r(ctx,9,23,2,9,M); r(ctx,17,23,6,9,D); r(ctx,21,23,2,9,M);
      r(ctx,8,30,8,2,K); r(ctx,16,30,8,2,K);
    },

    wraith:(ctx)=>{
      // Tall ethereal — trailing wisps
      r(ctx,10,0,12,22,M);
      dith(ctx,9,0,1,22,M,K,0.4); dith(ctx,22,0,1,22,M,K,0.4);
      r(ctx,11,0,10,1,W); r(ctx,10,0,1,22,L);
      // Head
      r(ctx,11,1,10,8,L); r(ctx,11,1,10,1,W); r(ctx,11,1,1,8,W);
      // Deep hollow eyes
      r(ctx,12,3,4,3,K); r(ctx,18,3,4,3,K);
      p(ctx,13,4,W); p(ctx,14,4,L); p(ctx,19,4,W); p(ctx,20,4,L);
      p(ctx,13,5,L); p(ctx,19,5,L);
      // Gaping mouth
      r(ctx,14,7,6,2,K);
      p(ctx,14,7,D); p(ctx,16,7,W); p(ctx,18,7,D);
      p(ctx,15,8,M); p(ctx,17,8,M);
      // Body fades
      vgrad(ctx,10,9,12,13,M,D);
      // Wispy arms
      r(ctx,4,8,7,2,M); dith(ctx,4,9,7,2,M,K,0.5);
      r(ctx,21,8,7,2,M); dith(ctx,21,9,7,2,M,K,0.5);
      // Tail wisps
      r(ctx,12,22,3,6,M); r(ctx,17,22,3,6,M);
      dith(ctx,12,26,3,4,M,K,0.6); dith(ctx,17,26,3,4,M,K,0.6);
      r(ctx,14,28,1,4,L); r(ctx,17,28,1,4,L);
      r(ctx,8,15,4,3,M); dith(ctx,8,17,4,2,M,K,0.6);
      r(ctx,20,15,4,3,M); dith(ctx,20,17,4,2,M,K,0.6);
    },

    guardian:(ctx)=>{
      // Massive stone golem — ancient markings, flame core
      r(ctx,3,6,26,22,D); r(ctx,3,6,26,1,M); r(ctx,3,6,1,22,M); r(ctx,28,6,1,22,K);
      // Head
      r(ctx,5,0,22,7,D); r(ctx,5,0,22,1,M); r(ctx,5,0,1,7,M); r(ctx,26,0,1,7,K);
      // Deep eye sockets
      r(ctx,7,1,5,4,K); r(ctx,20,1,5,4,K);
      r(ctx,8,2,3,2,D); r(ctx,21,2,3,2,D);
      p(ctx,9,2,W); p(ctx,10,2,W); p(ctx,22,2,W); p(ctx,23,2,W);
      p(ctx,9,3,L); p(ctx,22,3,L);
      // Mouth grate
      r(ctx,10,5,12,3,K); for(let x=11;x<22;x+=2) p(ctx,x,6,M); r(ctx,10,5,12,1,D);
      // Ancient rune marks
      r(ctx,6,9,4,1,M); r(ctx,22,9,4,1,M);
      r(ctx,6,10,1,3,M); r(ctx,25,10,1,3,M);
      r(ctx,7,12,3,1,M); r(ctx,22,12,3,1,M);
      // Flame chest core
      r(ctx,11,10,10,8,K); r(ctx,12,11,8,6,D); r(ctx,13,12,6,4,M);
      r(ctx,14,13,4,2,L); r(ctx,15,13,2,2,W);
      // Massive arms
      r(ctx,0,7,5,14,D); r(ctx,0,7,2,14,M); r(ctx,0,7,5,1,M);
      r(ctx,27,7,5,14,D); r(ctx,30,7,2,14,M); r(ctx,27,7,5,1,M);
      r(ctx,0,21,6,5,D); r(ctx,0,21,3,5,M); r(ctx,26,21,6,5,D); r(ctx,29,21,3,5,M);
      r(ctx,7,28,7,4,D); r(ctx,7,28,3,4,M); r(ctx,18,28,7,4,D); r(ctx,22,28,3,4,M);
    },

    golem:(ctx)=>{
      // Pure pixel block construction
      r(ctx,8,0,16,10,D); r(ctx,8,0,16,2,M); r(ctx,8,0,2,10,M); r(ctx,23,0,1,10,K);
      r(ctx,10,2,4,4,K); r(ctx,18,2,4,4,K);
      r(ctx,11,3,2,2,M); r(ctx,19,3,2,2,M);
      p(ctx,11,3,L); p(ctx,19,3,L);
      for(let x=11;x<21;x+=2) r(ctx,x,7,1,2,K);
      r(ctx,5,10,22,16,D); r(ctx,5,10,22,2,M); r(ctx,5,10,2,16,M); r(ctx,26,10,1,16,K);
      // Pixel texture
      for(let by=12;by<24;by+=3) for(let bx=7;bx<25;bx+=3){
        if(rr()<0.5) r(ctx,bx,by,2,2,M); if(rr()<0.2) r(ctx,bx,by,2,2,L);
      }
      r(ctx,0,11,6,12,D); r(ctx,0,11,3,12,M); r(ctx,0,11,6,2,M);
      r(ctx,26,11,6,12,D); r(ctx,29,11,3,12,M); r(ctx,26,11,6,2,M);
      r(ctx,0,23,7,5,D); r(ctx,0,23,4,5,M); r(ctx,25,23,7,5,D); r(ctx,28,23,4,5,M);
      r(ctx,8,26,6,6,D); r(ctx,8,26,3,6,M); r(ctx,18,26,6,6,D); r(ctx,21,26,3,6,M);
    },

    commander:(ctx)=>{
      // Crown spikes
      for(let i=0;i<5;i++){const cx=8+i*4,cy=4-i%2*3;r(ctx,cx,cy,2,6-cy,D);p(ctx,cx,cy,L);p(ctx,cx+1,cy,M);}
      r(ctx,8,6,16,8,D); r(ctx,8,6,16,1,M); r(ctx,8,6,1,8,M); r(ctx,23,6,1,8,K);
      // Cold eyes
      r(ctx,10,8,4,3,K); r(ctx,18,8,4,3,K);
      p(ctx,11,9,W); p(ctx,12,9,W); p(ctx,19,9,W); p(ctx,20,9,W);
      p(ctx,11,10,L); p(ctx,12,10,L); p(ctx,19,10,L); p(ctx,20,10,L);
      r(ctx,12,12,8,2,K); r(ctx,12,12,8,1,D);
      r(ctx,6,14,20,14,D); r(ctx,6,14,20,1,M); r(ctx,6,14,1,14,M); r(ctx,25,14,1,14,K);
      // Chest armor
      r(ctx,9,15,14,8,M); r(ctx,9,15,14,1,L); r(ctx,9,15,1,8,L);
      r(ctx,12,17,8,4,D); r(ctx,13,17,6,1,L);
      for(let i=0;i<3;i++) p(ctx,13+i*3,18,W);
      // Shoulder armor
      r(ctx,3,14,5,5,D); r(ctx,3,14,2,5,M); r(ctx,3,14,5,1,M);
      r(ctx,24,14,5,5,D); r(ctx,29,14,2,5,M); r(ctx,24,14,5,1,M);
      // Flowing cape
      r(ctx,1,15,4,17,M); dith(ctx,0,18,4,12,M,D,0.5);
      r(ctx,27,15,4,17,M); dith(ctx,28,18,4,12,M,D,0.5);
      r(ctx,2,19,5,8,D); r(ctx,2,19,2,8,M); r(ctx,25,19,5,8,D); r(ctx,28,19,2,8,M);
      r(ctx,9,28,6,4,D); r(ctx,9,28,2,4,M); r(ctx,17,28,6,4,D); r(ctx,21,28,2,4,M);
    },

    nullbyte:(ctx)=>{
      // Cosmic void entity — overwhelming, multi-eyed
      dith(ctx,0,0,32,32,K,D,0.6);
      r(ctx,4,3,24,26,D); r(ctx,4,3,24,2,M); r(ctx,4,3,2,26,M); r(ctx,27,3,1,26,K);
      // Corruption noise
      for(let i=0;i<20;i++) p(ctx,Math.floor(rr()*24)+4,Math.floor(rr()*24)+3,rr()<0.6?M:L);
      // Three compound eyes
      r(ctx,6,6,6,5,K); r(ctx,14,5,5,6,K); r(ctx,21,6,6,5,K);
      r(ctx,7,7,4,3,D); r(ctx,8,7,2,3,M); p(ctx,8,8,W); p(ctx,9,8,W);
      r(ctx,15,6,3,4,D); r(ctx,15,7,2,2,M); p(ctx,16,7,W);
      r(ctx,22,7,4,3,D); r(ctx,23,7,2,3,M); p(ctx,23,8,W); p(ctx,24,8,W);
      // Gaping void mouth
      r(ctx,7,14,18,8,K); r(ctx,8,15,16,1,D);
      for(let x=8;x<24;x+=3){ r(ctx,x,14,2,3,M); r(ctx,x+1,18,2,3,M); p(ctx,x,14,L); }
      // Tendrils
      r(ctx,0,8,5,3,D); dith(ctx,0,10,5,3,D,K,0.5);
      r(ctx,27,8,5,3,D); dith(ctx,27,10,5,3,D,K,0.5);
      r(ctx,0,16,4,3,D); dith(ctx,0,18,4,3,D,K,0.6);
      r(ctx,28,16,4,3,D); dith(ctx,28,18,4,3,D,K,0.6);
      // NULL text pixels
      r(ctx,8,22,16,4,K);
      [[9,23],[9,24],[9,25],[10,24],[11,23],[11,24],[11,25],
       [13,23],[13,25],[14,25],[15,23],[15,25],
       [17,23],[17,24],[17,25],[18,25],
       [20,23],[20,24],[20,25],[21,25]].forEach(([nx,ny])=>p(ctx,nx,ny,W));
      dith(ctx,0,28,32,4,K,D,0.3);
    },
  };

  (enemies[type]||enemies.void_scout)(ctx);
  const out=mkCanvas(W*SC,H*SC); const octx=out.getContext('2d');
  octx.imageSmoothingEnabled=false; octx.drawImage(tmp,0,0,W*SC,H*SC);
  return out;
}

// ─── PLAYER SPRITE ──────────────────────────────────────────────────────────
export function buildPlayerSprite(normiePixels){
  const HS=14, SC=2;  // head size, scale
  const BODY_H=10, TOTAL_H=HS+BODY_H;

  // Head — from normie pixels or fallback
  const headC=mkCanvas(HS,HS);
  {
    const ctx=headC.getContext('2d'); ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=W; ctx.fillRect(0,0,HS,HS);
    if(normiePixels&&normiePixels.length>=1600){
      const S=40,scX=S/HS,scY=S/HS;
      for(let ty=0;ty<HS;ty++) for(let tx=0;tx<HS;tx++){
        let ones=0,tot=0;
        for(let sy=0;sy<scY;sy++) for(let sx=0;sx<scX;sx++){
          const idx=Math.floor(ty*scY+sy)*S+Math.floor(tx*scX+sx);
          if(idx<1600){tot++;if(normiePixels[idx]==='1')ones++;}
        }
        const lum=ones/tot;
        ctx.fillStyle=lum>0.6?K:lum>0.4?D:lum>0.2?M:lum>0.08?L:W;
        ctx.fillRect(tx,ty,1,1);
      }
    } else {
      r(headC.getContext('2d'),0,0,HS,HS,W);
      const ctx=headC.getContext('2d');
      r(ctx,2,0,10,2,D); r(ctx,1,2,12,8,W);
      r(ctx,1,2,12,1,L); r(ctx,1,9,12,1,L);
      r(ctx,3,4,3,2,D); r(ctx,8,4,3,2,D);
      p(ctx,4,4,M); p(ctx,9,4,M); p(ctx,4,5,L); p(ctx,9,5,L);
      r(ctx,5,7,4,1,D); p(ctx,4,7,M); p(ctx,9,7,M);
    }
  }

  const bodyFrames=buildBodyFrames(HS);
  const spriteC=mkCanvas(HS*SC,TOTAL_H*SC);

  function render(frame){
    const sctx=spriteC.getContext('2d'); sctx.imageSmoothingEnabled=false;
    sctx.clearRect(0,0,HS*SC,TOTAL_H*SC);
    sctx.drawImage(headC,0,0,HS*SC,HS*SC);
    sctx.drawImage(bodyFrames[frame%bodyFrames.length],0,HS*SC,HS*SC,BODY_H*SC);
  }
  render(0);
  return {canvas:spriteC,render,width:HS*SC,height:TOTAL_H*SC};
}

// ─── BATTLE PORTRAIT (40×40) ────────────────────────────────────────────────
export function buildPartyBattleSprite(normiePixels){
  const W=40,H=40;
  const c=mkCanvas(W,H); const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle=W; ctx.fillRect(0,0,W,H);
  if(normiePixels&&normiePixels.length>=1600){
    const S=40;
    for(let i=0;i<1600;i++){
      if(normiePixels[i]==='1'){ctx.fillStyle=K;ctx.fillRect(i%S,Math.floor(i/S),1,1);}
    }
    // Subtle top-left highlight dither for depth
    for(let y=0;y<20;y++) for(let x=0;x<20;x++){
      if((x+y)%3===0){const idx=y*S+x;if(idx<1600&&normiePixels[idx]!=='1'){ctx.fillStyle=L;ctx.fillRect(x,y,1,1);}}
    }
  } else {
    // Detailed fallback portrait
    ctx.fillStyle=D; ctx.fillRect(8,2,24,8);
    ctx.fillStyle=W; ctx.fillRect(6,10,28,20);
    ctx.fillStyle=L; ctx.fillRect(6,10,28,2);
    ctx.fillStyle=D; ctx.fillRect(10,14,8,5); ctx.fillRect(22,14,8,5);
    ctx.fillStyle=W; ctx.fillRect(11,14,3,3); ctx.fillRect(23,14,3,3);
    ctx.fillStyle=K; ctx.fillRect(12,15,2,2); ctx.fillRect(24,15,2,2);
    ctx.fillStyle=D; ctx.fillRect(14,25,12,3);
    ctx.fillStyle=M; ctx.fillRect(6,30,28,10);
  }
  // Portrait frame
  ctx.fillStyle=K; ctx.fillRect(0,0,W,1); ctx.fillRect(0,H-1,W,1);
  ctx.fillRect(0,0,1,H); ctx.fillRect(W-1,0,1,H);
  ctx.fillStyle=M; ctx.fillRect(1,1,W-2,1); ctx.fillRect(1,1,1,H-2);
  return c;
}
