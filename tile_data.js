// tile_data.js — SNES/GB-quality procedural tile art
// All tiles drawn on canvas with 5-tone monochrome palette + Bayer dithering
// No base64 PNGs — pure canvas drawing for crisp pixel art at any scale

export const TILE_SIZE = 16;

const K='#0e0e0f', D='#383838', M='#707070', L='#aaaaaa', W='#e4e4e0';

function mk(){ const c=document.createElement('canvas');c.width=16;c.height=16;return c; }
function p(ctx,x,y,col){ if(x<0||y<0||x>=16||y>=16)return;ctx.fillStyle=col;ctx.fillRect(x,y,1,1); }
function r(ctx,x,y,w,h,col){ ctx.fillStyle=col;ctx.fillRect(x,y,w,h); }
function fill(ctx,col){ r(ctx,0,0,16,16,col); }
function row(ctx,y,col){ r(ctx,0,y,16,1,col); }
function col(ctx,x,col2){ r(ctx,x,0,1,16,col2); }
function dith(ctx,x,y,w,h,ca,cb,pct){
  const t=[[0,0.5],[0.75,0.25]];
  for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++)
    p(ctx,x+dx,y+dy,pct>t[dy%2][dx%2]?cb:ca);
}
function hgrad(ctx,x,y,w,h,ca,cb){
  for(let dx=0;dx<w;dx++) dith(ctx,x+dx,y,1,h,ca,cb,dx/Math.max(1,w-1));
}
function vgrad(ctx,x,y,w,h,ca,cb){
  for(let dy=0;dy<h;dy++) dith(ctx,x,y+dy,w,1,ca,cb,dy/Math.max(1,h-1));
}
// Deterministic noise — makes organic textures without Math.random
function noise(ctx,ca,cb,dens,seed){
  let s=(seed*2654435761+1)>>>0;
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){
    s=(s^(x*1234567+y*7654321+99999))>>>0; s=(s*2246822519)>>>0;
    if(s/0xffffffff<dens) p(ctx,x,y,cb); else p(ctx,x,y,ca);
  }
}

// ─── TILE DRAW FUNCTIONS ─────────────────────────────────────────────────────

function drawGrass0(ctx){
  fill(ctx,M);
  // Base green mid-tone with blade variation
  noise(ctx,M,D,0.18,0);
  // Bright blades — suggests light catching tips
  const blades=[[2,1,L],[5,3,W],[9,1,L],[12,4,W],[1,8,L],[6,7,W],[10,9,L],
    [14,2,W],[3,12,L],[8,11,W],[13,13,L],[4,14,W],[11,14,L],[0,5,W],[15,10,L]];
  blades.forEach(([bx,by,bc])=>p(ctx,bx,by,bc));
  // Ground shadow at bottom
  dith(ctx,0,14,16,2,M,D,0.5);
}

function drawGrass1(ctx){
  fill(ctx,M);
  noise(ctx,M,D,0.12,1);
  // Small flower — pure pixel art icon
  p(ctx,5,4,L); p(ctx,6,3,W); p(ctx,7,4,L); p(ctx,8,3,L);
  p(ctx,6,5,L); p(ctx,6,4,W);  // center
  p(ctx,6,6,D); p(ctx,6,7,D);  // stem
  // Extra bright blades
  p(ctx,11,2,W); p(ctx,12,1,W); p(ctx,13,9,L); p(ctx,2,11,L);
  p(ctx,1,3,W); p(ctx,14,12,L);
  dith(ctx,0,14,16,2,M,D,0.5);
}

function drawGrass2(ctx){
  fill(ctx,M);
  noise(ctx,M,D,0.1,2);
  // Small stone — classic SNES rock detail
  r(ctx,9,8,3,2,M); dith(ctx,9,8,3,1,M,L,0.7);
  p(ctx,8,9,D); p(ctx,12,8,D); p(ctx,10,7,D);
  p(ctx,9,10,D); p(ctx,11,10,D);
  // More blade variety
  p(ctx,2,3,W); p(ctx,3,2,W); p(ctx,13,12,L); p(ctx,14,11,L);
  p(ctx,0,6,W); p(ctx,15,4,L);
  dith(ctx,0,14,16,2,M,D,0.5);
}

function drawDarkGrass(ctx){
  fill(ctx,D);
  noise(ctx,D,K,0.2,3);
  // Ominous blade tips — lighter than base
  [[2,1,M],[7,3,D],[3,8,M],[10,5,D],[13,11,M],[5,13,D],
   [1,14,M],[9,2,M],[15,7,D],[6,15,M]].forEach(([bx,by,bc])=>p(ctx,bx,by,bc));
  // Warning dither — darker at bottom suggesting depth
  dith(ctx,0,12,16,4,D,K,0.6);
}

function drawPath(ctx){
  fill(ctx,L);
  noise(ctx,L,M,0.12,4);
  // Cobble stones — classic SNES RPG road
  const stones=[[1,1,4,3],[7,1,4,3],[12,1,3,3],[0,5,4,3],[5,5,5,3],[11,5,4,3],
    [1,9,4,3],[6,9,5,3],[12,9,3,3],[0,13,4,2],[5,13,5,2],[11,13,4,2]];
  stones.forEach(([sx,sy,sw,sh])=>{
    r(ctx,sx+1,sy+1,sw-1,sh-1,M);
    p(ctx,sx+1,sy+1,L);  // top-left highlight
    r(ctx,sx+1,sy+sh-1,sw-1,1,D); // bottom shadow
    r(ctx,sx+sw-1,sy+1,1,sh-1,D); // right shadow
  });
}

function drawTree(ctx){
  fill(ctx,M);
  // Trunk with bark texture
  r(ctx,6,10,4,6,D);
  dith(ctx,6,10,2,6,D,K,0.4); // dark left side of trunk
  p(ctx,6,10,K); p(ctx,9,10,K);
  r(ctx,7,11,2,5,M); // lighter right side
  // Canopy — layered for depth, lighter towards top-right (light source)
  r(ctx,2,6,12,6,D);   // canopy base / shadow
  r(ctx,3,4,10,4,D);
  r(ctx,4,2,8,4,M);    // mid canopy
  r(ctx,5,1,6,2,L);    // top — lightest, closest to light
  // Highlight cluster
  dith(ctx,5,1,6,3,L,W,0.5);
  // Shadow underside of canopy
  dith(ctx,2,10,12,2,D,K,0.6);
  // Leaf texture dots
  p(ctx,4,5,L); p(ctx,6,3,W); p(ctx,9,4,L); p(ctx,11,6,M);
  p(ctx,5,7,M); p(ctx,12,5,D); p(ctx,3,8,D);
}

function drawHouseWall(ctx){
  fill(ctx,M);
  // Brick pattern — SNES style 2×1 bricks with mortar
  for(let by=0;by<16;by+=4){
    const offset=(by/4)%2===0?0:4;
    // Mortar line
    r(ctx,0,by+3,16,1,D);
    for(let bx=offset-4;bx<16;bx+=8){
      // Brick face
      r(ctx,bx+1,by,6,3,L);
      p(ctx,bx+1,by,M); // top-left dimmer
      r(ctx,bx+1,by+2,6,1,M); // bottom shadow
      r(ctx,bx+7,by,1,3,D); // right mortar
    }
  }
}

function drawRoof(ctx){
  // Classic SNES red-slate roof — in monochrome = dark tiles with clear grid
  fill(ctx,D);
  for(let ty=0;ty<16;ty+=4){
    for(let tx=0;tx<16;tx+=4){
      r(ctx,tx,ty,4,4,M);
      p(ctx,tx,ty,L); p(ctx,tx+1,ty,L); // top highlight
      p(ctx,tx,ty+1,L); // left highlight
      r(ctx,tx,ty+3,4,1,D); // bottom shadow row
      r(ctx,tx+3,ty,1,4,D); // right shadow col
    }
  }
  // Ridge line at top
  r(ctx,0,0,16,2,L); p(ctx,0,0,W); p(ctx,1,0,W);
  row(ctx,1,M);
}

function drawTownFloor(ctx){
  fill(ctx,L);
  noise(ctx,L,M,0.08,5);
  // Cobblestone grid — larger stones
  const stones=[[0,0,5,4],[6,0,5,4],[12,0,4,4],[0,5,4,4],[5,5,6,4],[12,5,4,4],
    [0,10,6,5],[7,10,4,5],[12,10,4,5]];
  stones.forEach(([sx,sy,sw,sh])=>{
    r(ctx,sx+1,sy+1,sw-1,sh-1,M);
    p(ctx,sx+1,sy+1,W); // corner highlight
    r(ctx,sx+1,sy+sh-1,sw-1,1,D);
    r(ctx,sx+sw-1,sy+1,1,sh-1,D);
  });
}

function drawSign(ctx){
  fill(ctx,M);
  // Wooden post
  r(ctx,7,8,2,8,D); p(ctx,7,8,M); // post with left highlight
  // Sign board
  r(ctx,2,2,12,7,D); // shadow/border
  r(ctx,3,2,10,6,L); // face of sign
  p(ctx,3,2,W); // top-left shine
  r(ctx,3,7,10,1,D); // bottom shadow
  r(ctx,13,2,1,7,D); // right shadow
  // Lines on sign — writing
  r(ctx,5,4,6,1,M); r(ctx,5,6,6,1,M);
}

function drawBedFloor(ctx){
  fill(ctx,L);
  // Wood plank floor — horizontal boards
  for(let by=0;by<16;by+=4){
    r(ctx,0,by,16,3,M);
    p(ctx,0,by,L); r(ctx,1,by,15,1,L); // highlight top of plank
    r(ctx,0,by+3,16,1,D); // shadow between planks
    // Grain lines
    for(let gx=0;gx<16;gx+=5) p(ctx,gx,by+1,D);
  }
}

function drawBedWall(ctx){
  fill(ctx,D);
  // Wallpaper pattern — subtle
  for(let wy=0;wy<16;wy+=4) for(let wx=((wy/4)%2===0?0:2);wx<16;wx+=4){
    p(ctx,wx,wy,M); p(ctx,wx+1,wy,M);
    p(ctx,wx,wy+1,M);
  }
  row(ctx,0,M); // top highlight
  col(ctx,0,M); // left highlight
}

function drawBed(ctx){
  // Full bed — headboard + mattress + pillow
  // Headboard
  r(ctx,1,1,14,4,D); r(ctx,1,1,14,1,M); r(ctx,1,1,1,4,M);
  r(ctx,2,2,12,2,M); // headboard face
  p(ctx,2,2,L); r(ctx,3,2,11,1,L);
  // Mattress
  r(ctx,1,5,14,9,M);
  r(ctx,1,5,14,1,L); // top edge highlight
  r(ctx,1,5,1,9,L);  // left edge
  r(ctx,14,5,1,9,D); // right shadow
  r(ctx,1,13,14,1,D); // bottom shadow
  // Pillow
  r(ctx,3,6,6,4,W); r(ctx,3,6,6,1,W); r(ctx,3,6,1,4,W);
  dith(ctx,3,9,6,1,W,L,0.5); // pillow bottom shadow
  r(ctx,10,6,4,3,L); // second pillow
  // Blanket fold
  dith(ctx,1,10,14,3,M,L,0.4);
}

function drawBookshelf(ctx){
  // Shelves + colorful book spines (in monochrome = value variation)
  r(ctx,0,0,16,16,D); // case
  r(ctx,0,0,16,1,M); r(ctx,0,0,1,16,M); // edge highlight
  r(ctx,15,0,1,16,K); r(ctx,0,15,16,1,K); // outer shadow
  // Shelf lines
  r(ctx,1,5,14,1,M); r(ctx,1,10,14,1,M);
  // Books row 1 (y 1-4)
  const booksRow1=[[1,3,W],[2,4,L],[4,4,M],[6,3,W],[8,4,L],[10,3,M],[12,4,W],[14,3,L]];
  booksRow1.forEach(([bx,bw,bc])=>r(ctx,bx,1,bw,4,bc));
  for(let bx=1;bx<15;bx+=2){ r(ctx,bx,1,1,4,D); } // spine dividers
  // Books row 2 (y 6-9)
  const booksRow2=[[1,2,L],[3,3,M],[6,2,W],[8,3,L],[11,2,M],[13,2,W]];
  booksRow2.forEach(([bx,bw,bc])=>r(ctx,bx,6,bw,4,bc));
  for(let bx=1;bx<15;bx+=2){ r(ctx,bx,6,1,4,D); }
  // Books row 3 (y 11-14)
  const booksRow3=[[1,4,M],[5,3,L],[8,4,W],[12,3,M]];
  booksRow3.forEach(([bx,bw,bc])=>r(ctx,bx,11,bw,3,bc));
  for(let bx=1;bx<15;bx+=3){ r(ctx,bx,11,1,3,D); }
}

function drawDoor(ctx){
  // Wooden door with frame and knob
  r(ctx,1,0,14,16,D); // door frame
  r(ctx,1,0,1,16,M); r(ctx,1,0,14,1,M); // frame highlight
  // Door panels
  r(ctx,2,1,12,14,M);
  r(ctx,2,1,12,1,L); r(ctx,2,1,1,14,L); // door face highlight
  // Panel recesses
  r(ctx,3,3,5,4,D); r(ctx,3,3,5,1,M); r(ctx,3,3,1,4,M);
  r(ctx,9,3,5,4,D); r(ctx,9,3,5,1,M); r(ctx,9,3,1,4,M);
  r(ctx,3,9,5,4,D); r(ctx,3,9,5,1,M); r(ctx,3,9,1,4,M);
  r(ctx,9,9,5,4,D); r(ctx,9,9,5,1,M); r(ctx,9,9,1,4,M);
  // Doorknob
  r(ctx,12,7,2,2,L); p(ctx,12,7,W); p(ctx,13,8,M);
}

function drawStairsDn(ctx){
  // Descending staircase — classic top-down RPG view
  fill(ctx,D);
  const steps=[[0,12,16,4],[2,8,14,4],[4,4,12,4],[6,0,10,4]];
  steps.forEach(([sx,sy,sw,sh],i)=>{
    r(ctx,sx,sy,sw,sh,M);
    r(ctx,sx,sy,sw,1,L); // step top highlight
    r(ctx,sx,sy,1,sh,L); // left edge
    r(ctx,sx+sw-1,sy,1,sh,D); // right shadow
    r(ctx,sx,sy+sh-1,sw,1,D); // step front shadow
    p(ctx,sx,sy,W); // corner sparkle
  });
  // Darkness at bottom
  dith(ctx,0,12,16,4,D,K,0.4);
}

function drawWater(ctx,frame){
  // Animated water — ripple pattern shifts each frame
  fill(ctx,D);
  // Deep water base
  vgrad(ctx,0,0,16,16,D,K);
  // Ripple lines — shift by frame offset
  const off=frame*3;
  for(let y=0;y<16;y+=4){
    const ry=(y+off)%16;
    // Sinusoidal ripple
    for(let x=0;x<16;x++){
      const wave=Math.sin((x+off*2)/3)*1.5;
      const py2=Math.round(ry+wave);
      if(py2>=0&&py2<16){
        p(ctx,x,py2%16,y===0?L:M);
      }
    }
  }
  // Surface glints
  const glints=[[3,2,W],[8,6,L],[13,1,W],[1,10,L],[11,14,W],[6,12,L]];
  glints.forEach(([gx,gy,gc])=>{if((gx+frame*2)%4<2)p(ctx,gx,gy,gc);});
  // Edge foam
  r(ctx,0,0,16,1,M); dith(ctx,0,0,16,1,M,L,0.4);
}

function drawCaveFloor(ctx){
  fill(ctx,D);
  noise(ctx,D,K,0.15,6);
  // Cracks
  [[2,3,4,1,K],[8,1,3,1,K],[1,7,2,1,K],[10,9,4,1,K],[5,12,3,1,K],[12,14,3,1,K]].forEach(([cx,cy,cw,ch,cc])=>r(ctx,cx,cy,cw,ch,cc));
  // Pebbles
  [[4,6,M],[9,4,M],[7,10,M],[13,8,D],[2,14,M]].forEach(([px2,py2,pc])=>{p(ctx,px2,py2,pc);p(ctx,px2+1,py2,pc);p(ctx,px2,py2+1,pc);});
  p(ctx,4,6,L); p(ctx,9,4,L); p(ctx,7,10,L);
  dith(ctx,0,14,16,2,D,K,0.5);
}

function drawCaveWall(ctx){
  fill(ctx,K);
  noise(ctx,K,D,0.2,7);
  // Rocky surface — irregular blocks
  r(ctx,0,0,6,5,D); r(ctx,0,0,6,1,M); r(ctx,0,0,1,5,M);
  r(ctx,7,0,5,4,D); r(ctx,7,0,5,1,M);
  r(ctx,13,0,3,6,D); r(ctx,13,0,3,1,M);
  r(ctx,0,6,4,5,D); r(ctx,0,6,1,5,M);
  r(ctx,5,5,6,5,D); r(ctx,5,5,6,1,M); r(ctx,5,5,1,5,M);
  r(ctx,12,7,4,4,D); r(ctx,12,7,4,1,M);
  r(ctx,0,12,7,4,D); r(ctx,0,12,1,4,M); r(ctx,0,12,7,1,M);
  r(ctx,8,12,8,4,D); r(ctx,8,12,8,1,M);
  // Stalactite drip
  p(ctx,3,4,K); p(ctx,3,5,D); p(ctx,10,5,K); p(ctx,10,6,D);
}

function drawVoid(ctx,frame){
  // Animated void — pulsing darkness
  fill(ctx,K);
  noise(ctx,K,D,0.2+Math.sin(frame)*0.05,8+frame);
  // Void particles — shift with frame
  const pts=[[3,2],[7,5],[11,1],[1,9],[14,7],[5,13],[9,11],[13,14],[2,6],[8,15]];
  pts.forEach(([vx,vy],i)=>{
    const on=(vx*3+vy*7+frame*4)%8<3;
    if(on){p(ctx,vx,vy,M);p(ctx,vx,(vy+1)%16,D);}
  });
  // Occasional bright corruption
  if(frame%3===0){ p(ctx,5,5,M); p(ctx,10,10,M); }
  if(frame%3===1){ p(ctx,11,3,L); p(ctx,4,12,L); }
  dith(ctx,0,0,16,4,K,D,0.3);
}

function drawWall(ctx){
  fill(ctx,D);
  // Interior wall — smooth plaster with subtle texture
  noise(ctx,D,M,0.06,9);
  // Baseboards
  r(ctx,0,14,16,2,K); r(ctx,0,14,16,1,D);
  // Wall edge shadows
  col(ctx,0,M); col(ctx,15,K);
  row(ctx,0,M);
}

function drawInnFloor(ctx){
  fill(ctx,M);
  // Wooden floor — warm planks
  for(let by=0;by<16;by+=4){
    r(ctx,0,by,16,3,L);
    r(ctx,1,by,15,1,W);  // top highlight
    r(ctx,0,by+3,16,1,D); // shadow gap
    // Grain knots
    const kx=(by*3)%12+2;
    p(ctx,kx,by+1,M); p(ctx,kx+1,by+2,M);
    // Plank joins
    r(ctx,(by*4)%16,by,1,3,M);
  }
}

// ─── ASSEMBLE TILE_DATA ──────────────────────────────────────────────────────
// All tiles are drawn at init time and stored as data URLs.
// Animated tiles (water, void) are stored as arrays of 4 frame data URLs.

function makeTile(drawFn){
  const c=mk(); const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false;
  drawFn(ctx); return c.toDataURL();
}

function makeAnimTile(drawFn,frames=4){
  return Array.from({length:frames},(_,f)=>{
    const c=mk(); const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false;
    drawFn(ctx,f); return c.toDataURL();
  });
}

export const TILE_DATA = {
  bed_floor:   makeTile(drawBedFloor),
  bed_wall:    makeTile(drawBedWall),
  stairs_dn:   makeTile(drawStairsDn),
  bed:         makeTile(drawBed),
  bookshelf:   makeTile(drawBookshelf),
  door:        makeTile(drawDoor),
  grass0:      makeTile(drawGrass0),
  grass1:      makeTile(drawGrass1),
  grass2:      makeTile(drawGrass2),
  dark_grass:  makeTile(drawDarkGrass),
  path:        makeTile(drawPath),
  tree:        makeTile(drawTree),
  house_wall:  makeTile(drawHouseWall),
  roof:        makeTile(drawRoof),
  town_floor:  makeTile(drawTownFloor),
  sign:        makeTile(drawSign),
  // Animated — arrays of 4 frames
  water0: makeAnimTile(drawWater)[0],
  water1: makeAnimTile(drawWater)[1],
  water2: makeAnimTile(drawWater)[2],
  water3: makeAnimTile(drawWater)[3],
  cave_floor:  makeTile(drawCaveFloor),
  cave_wall:   makeTile(drawCaveWall),
  void0: makeAnimTile(drawVoid)[0],
  void1: makeAnimTile(drawVoid)[1],
  void2: makeAnimTile(drawVoid)[2],
  void3: makeAnimTile(drawVoid)[3],
  wall:        makeTile(drawWall),
  inn_floor:   makeTile(drawInnFloor),
};
