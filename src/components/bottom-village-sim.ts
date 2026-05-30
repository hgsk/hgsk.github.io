const COMPONENT_TAG = "bottom-village-sim";
const VIEWPORT_H   = 176;
const TILE         = 8;
const SKY_ROWS     = 8;
const SURFACE_MIN  = SKY_ROWS + 2;
const SURFACE_MAX  = SKY_ROWS + 5;
const VILLAGER_SPD = 0.7;

// ワールドサイズ (ビューポートの10倍 × 高さ5倍)
const WORLD_W_MULT = 10;
const WORLD_H_MULT = 5;

// 採掘
const SCROLL_PER_MINE = 300;
const PROB_IRON       = 0.28;
const PROB_DIAMOND    = 0.04;
const STORAGE_KEY     = "hytlog…rage";

type Tile     = "sky" | "grass" | "dirt" | "stone" | "iron_ore" | "diamond_ore";
type OreKind  = "iron" | "diamond" | "miss";

interface Villager  { x:number; y:number; vx:number; vy:number; w:number; h:number; wanderAt:number; }
interface OrePopup  { kind:OreKind; x:number; y:number; alpha:number; vy:number; }
interface Storage   { iron:number; diamond:number; }

interface SimState {
  init: boolean;
  worldCols: number; worldRows: number;
  map: Tile[][];
  heights: number[];
  villagers: Villager[];
  lastTime: number;
  camX: number; camY: number;       // world pixel offset
  viewW: number;                    // visible pixel width
  scrollAccum: number;
  storage: Storage;
  popups: OrePopup[];
  mineFlash: number;
  drag: { active:boolean; lastX:number; lastY:number; } ;
}

declare global { interface Window { __bvs?: SimState; } }

const rng = (a:number,b:number) => Math.random()*(b-a)+a;
const clamp = (v:number,a:number,b:number) => Math.max(a,Math.min(b,v));

function loadStorage(): Storage {
  try { const r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); } catch{}
  return {iron:0,diamond:0};
}
function saveStorage(s:Storage){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}catch{}
}

const getState = (): SimState => {
  if (!window.__bvs) {
    window.__bvs = {
      init:false, worldCols:0, worldRows:0, map:[], heights:[], villagers:[],
      lastTime:0, camX:0, camY:0, viewW:0,
      scrollAccum:0, storage:loadStorage(), popups:[], mineFlash:0,
      drag:{active:false,lastX:0,lastY:0},
    };
  }
  return window.__bvs;
};

class BottomVillageSim extends HTMLElement {
  private st  = getState();
  private root = this.attachShadow({mode:"open"});
  private cv   = document.createElement("canvas");
  private ctx  = this.cv.getContext("2d");
  private raf  = 0;
  private ro?: ResizeObserver;
  private dpr  = 1;
  private vw   = 0;
  private lastScrollY = 0;

  constructor(){
    super();
    const style = document.createElement("style");
    style.textContent = `
      :host{position:fixed;inset:auto 0 0 0;height:${VIEWPORT_H}px;z-index:100;display:block;}
      canvas{width:100%;height:100%;image-rendering:pixelated;display:block;cursor:grab;}
      canvas.dragging{cursor:grabbing;}
    `;
    this.cv.setAttribute("aria-hidden","true");
    this.root.append(style,this.cv);
  }

  connectedCallback(){
    if(!this.ctx) return;
    document.documentElement.style.setProperty("--bottom-sim-height",`${VIEWPORT_H}px`);
    this.ro = new ResizeObserver(()=>this.resize());
    this.ro.observe(document.documentElement);
    this.lastScrollY = window.scrollY;
    window.addEventListener("scroll",this.onScroll,{passive:true});
    // ドラッグ
    this.cv.addEventListener("mousedown",  this.onDown);
    this.cv.addEventListener("touchstart", this.onTouchStart, {passive:true});
    window.addEventListener("mousemove",   this.onMove);
    window.addEventListener("mouseup",     this.onUp);
    window.addEventListener("touchmove",   this.onTouchMove, {passive:false});
    window.addEventListener("touchend",    this.onUp);
    this.resize();
    this.tick();
  }

  disconnectedCallback(){
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener("scroll",    this.onScroll);
    window.removeEventListener("mousemove", this.onMove);
    window.removeEventListener("mouseup",   this.onUp);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend",  this.onUp);
  }

  // ─── スクロール → 採掘 ───────────────────────────────────
  private onScroll = () => {
    const cur = window.scrollY;
    this.st.scrollAccum += Math.abs(cur - this.lastScrollY);
    this.lastScrollY = cur;
    while(this.st.scrollAccum >= SCROLL_PER_MINE){
      this.st.scrollAccum -= SCROLL_PER_MINE;
      this.tryMine();
    }
  };

  private tryMine(){
    const r = Math.random();
    let found: OreKind | null = null;
    if(r < PROB_DIAMOND)              found = "diamond";
    else if(r < PROB_DIAMOND+PROB_IRON) found = "iron";

    // カメラ中心付近でポップアップ
    const px = this.st.camX + this.vw/2 + rng(-60,60);
    const col = clamp(Math.floor(px/TILE),0,this.st.worldCols-1);
    const py  = (this.st.heights[col]??SURFACE_MIN)*TILE - 20;
    const screenX = px - this.st.camX;
    const screenY = py - this.st.camY;

    if(!found){
      this.st.popups.push({kind:"miss",x:screenX,y:screenY,alpha:0.65,vy:-0.3});
      return;
    }
    this.st.storage[found]++;
    saveStorage(this.st.storage);
    this.st.mineFlash = 400;
    this.st.popups.push({kind:found,x:screenX,y:screenY,alpha:1,vy:-0.7});
  }

  // ─── ドラッグ ────────────────────────────────────────────
  private onDown = (e:MouseEvent) => {
    this.st.drag = {active:true,lastX:e.clientX,lastY:e.clientY};
    this.cv.classList.add("dragging");
  };
  private onTouchStart = (e:TouchEvent) => {
    const t = e.touches[0];
    this.st.drag = {active:true,lastX:t.clientX,lastY:t.clientY};
  };
  private onMove = (e:MouseEvent) => {
    if(!this.st.drag.active) return;
    this.pan(e.clientX - this.st.drag.lastX, e.clientY - this.st.drag.lastY);
    this.st.drag.lastX = e.clientX;
    this.st.drag.lastY = e.clientY;
  };
  private onTouchMove = (e:TouchEvent) => {
    if(!this.st.drag.active) return;
    e.preventDefault();
    const t = e.touches[0];
    this.pan(t.clientX - this.st.drag.lastX, t.clientY - this.st.drag.lastY);
    this.st.drag.lastX = t.clientX;
    this.st.drag.lastY = t.clientY;
  };
  private onUp = () => {
    this.st.drag.active = false;
    this.cv.classList.remove("dragging");
  };

  private pan(dx:number, dy:number){
    const worldPixW = this.st.worldCols * TILE;
    const worldPixH = this.st.worldRows * TILE;
    this.st.camX = clamp(this.st.camX - dx, 0, Math.max(0, worldPixW - this.vw));
    this.st.camY = clamp(this.st.camY - dy, 0, Math.max(0, worldPixH - VIEWPORT_H));
  }

  // ─── リサイズ ────────────────────────────────────────────
  private resize(){
    this.dpr = window.devicePixelRatio||1;
    this.vw  = Math.max(320, Math.floor(window.innerWidth));
    this.cv.width  = Math.floor(this.vw*this.dpr);
    this.cv.height = Math.floor(VIEWPORT_H*this.dpr);
    this.ctx?.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.ctx) this.ctx.imageSmoothingEnabled=false;

    const wc = Math.ceil(this.vw/TILE) * WORLD_W_MULT;
    const wr = Math.ceil(VIEWPORT_H/TILE) * WORLD_H_MULT;
    if(!this.st.init || this.st.worldCols!==wc || this.st.worldRows!==wr){
      this.buildWorld(wc,wr);
    }
    this.st.viewW = this.vw;
    // カメラを初期地上付近にクランプ
    this.pan(0,0);
  }

  private buildWorld(wc:number, wr:number){
    this.st.worldCols = wc;
    this.st.worldRows = wr;
    this.st.map     = Array.from({length:wr},()=>Array(wc).fill("sky" as Tile));
    this.st.heights = [];

    let cur = Math.floor((SURFACE_MIN+SURFACE_MAX)/2);
    for(let x=0;x<wc;x++){
      if(Math.random()<0.4) cur += Math.random()<0.5?-1:1;
      cur = clamp(cur, SURFACE_MIN, SURFACE_MAX);
      this.st.heights[x] = cur;
      for(let y=cur;y<wr;y++){
        const d = y-cur;
        let tile: Tile;
        if(d===0)       tile = "grass";
        else if(d<3)    tile = "dirt";
        else {
          const ironDepth    = wr * 0.25;
          const diamondDepth = wr * 0.55;
          if(y>diamondDepth && Math.random()<0.018)     tile = "diamond_ore";
          else if(y>ironDepth && Math.random()<0.055)   tile = "iron_ore";
          else if(Math.random()<0.22)                   tile = "dirt";
          else                                          tile = "stone";
        }
        this.st.map[y][x] = tile;
      }
    }

    // 村人配置（地表、ワールド全体にばらす）
    const n = Math.max(6, Math.floor(wc/20));
    this.st.villagers = Array.from({length:n},(_,i)=>{
      const x = ((i+1)*wc*TILE)/(n+1);
      const col = clamp(Math.floor(x/TILE),0,wc-1);
      const groundY = this.st.heights[col]*TILE;
      return {x,y:groundY-11,vx:Math.random()<0.5?-VILLAGER_SPD:VILLAGER_SPD,vy:0,w:6,h:11,wanderAt:performance.now()+rng(800,2600)};
    });
    this.st.init = true;
  }

  // ─── ゲームループ ────────────────────────────────────────
  private tick = () => {
    if(!this.ctx) return;
    const now = performance.now();
    const dt  = Math.min(32, now-(this.st.lastTime||now));
    this.st.lastTime = now;
    this.updateVillagers(dt,now);
    this.updatePopups(dt);
    if(this.st.mineFlash>0) this.st.mineFlash-=dt;
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private updateVillagers(dt:number,now:number){
    for(const v of this.st.villagers){
      if(now>v.wanderAt){
        v.vx = Math.random()<0.5?-VILLAGER_SPD:VILLAGER_SPD;
        v.wanderAt = now+rng(1000,4000);
      }
      v.vy += 0.01*dt;
      v.x  += v.vx*dt*0.08;
      v.y  += v.vy*dt*0.08;
      const maxX = this.st.worldCols*TILE-4;
      if(v.x<4||v.x>maxX){v.vx*=-1;v.x=clamp(v.x,4,maxX);}
      const col = clamp(Math.floor(v.x/TILE),0,this.st.worldCols-1);
      const gy  = this.st.heights[col]*TILE;
      if(v.y+v.h>=gy){v.y=gy-v.h;v.vy=0;}
    }
  }

  private updatePopups(dt:number){
    for(const p of this.st.popups){p.y+=p.vy*dt*0.08;p.alpha-=dt*0.0018;}
    this.st.popups = this.st.popups.filter(p=>p.alpha>0);
  }

  // ─── 描画 ────────────────────────────────────────────────
  private draw(){
    if(!this.ctx) return;
    const cx = this.st.camX, cy = this.st.camY;
    this.drawSky(cy);
    this.drawTerrain(cx,cy);
    this.drawVillagers(cx,cy);
    this.drawPopups();
    this.drawHUD();
    this.drawMinimap();
  }

  private drawSky(cy:number){
    if(!this.ctx) return;
    // 下にスクロールするほど暗くなる
    const depth = cy / (this.st.worldRows * TILE);
    const bright = Math.floor(160 - depth*120);
    const g = this.ctx.createLinearGradient(0,0,0,VIEWPORT_H);
    g.addColorStop(0, `rgb(${bright+62},${bright+53},255)`);
    g.addColorStop(1, `rgb(${bright+40},${bright+30},220)`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0,0,this.vw,VIEWPORT_H);
  }

  private drawTerrain(cx:number,cy:number){
    if(!this.ctx) return;
    const palette: Record<Tile,string> = {
      sky:"transparent", grass:"#4eb34f", dirt:"#8c5733", stone:"#5d6d74",
      iron_ore:"#c0844a", diamond_ore:"#5de8f0",
    };
    const flash = this.st.mineFlash>0;
    const col0 = Math.max(0,Math.floor(cx/TILE));
    const col1 = Math.min(this.st.worldCols-1, col0+Math.ceil(this.vw/TILE)+1);
    const row0 = Math.max(0,Math.floor(cy/TILE));
    const row1 = Math.min(this.st.worldRows-1, row0+Math.ceil(VIEWPORT_H/TILE)+1);

    for(let y=row0;y<=row1;y++){
      for(let x=col0;x<=col1;x++){
        const tile = this.st.map[y][x];
        if(tile==="sky") continue;
        let color = palette[tile];
        if(flash && tile==="stone") color=`hsl(0,0%,${55+Math.floor((this.st.mineFlash/400)*30)}%)`;
        if(tile==="iron_ore")    color = flash?`#ffaa66`:`#c0844a`;
        if(tile==="diamond_ore") color = flash?`#aaffff`:`#5de8f0`;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x*TILE-cx, y*TILE-cy, TILE, TILE);
      }
    }
  }

  private drawVillagers(cx:number,cy:number){
    if(!this.ctx) return;
    for(const v of this.st.villagers){
      const sx = v.x-cx, sy = v.y-cy;
      if(sx<-10||sx>this.vw+10) continue;
      this.ctx.fillStyle="#6b3f1f";
      this.ctx.fillRect(sx-1,sy+7,v.w+2,4);
      this.ctx.fillStyle="#f3d5b5";
      this.ctx.fillRect(sx,sy,v.w,v.h-3);
      this.ctx.fillStyle="#3d2f2b";
      this.ctx.fillRect(sx+1,sy+2,v.w-2,2);
    }
  }

  private drawPopups(){
    if(!this.ctx) return;
    for(const p of this.st.popups){
      this.ctx.globalAlpha = Math.max(0,p.alpha);
      const emoji = p.kind==="diamond"?"💎":p.kind==="iron"?"🪨":"💨";
      const label = p.kind==="miss"?`${emoji} ハズレ`:`+1 ${emoji}`;
      this.ctx.font="bold 13px system-ui";
      this.ctx.textAlign="center";
      this.ctx.fillStyle="#fff";
      this.ctx.fillText(label,p.x,p.y);
    }
    this.ctx.globalAlpha=1;
  }

  private drawHUD(){
    if(!this.ctx) return;
    const {iron,diamond} = this.st.storage;
    const text = `🪨 ${iron}  💎 ${diamond}`;
    const pad=8, h=20, x=this.vw-200, y=6;
    const w = this.ctx.measureText(text).width+pad*2;
    const rx = this.vw-w-8;

    this.ctx.globalAlpha=0.55;
    this.ctx.fillStyle="#000";
    this.ctx.beginPath();
    (this.ctx as any).roundRect?.(rx,y,w,h,4)??this.ctx.rect(rx,y,w,h);
    this.ctx.fill();

    this.ctx.globalAlpha=1;
    this.ctx.font="bold 11px system-ui";
    this.ctx.textAlign="left";
    this.ctx.fillStyle="#fff";
    this.ctx.fillText(text,rx+pad,y+h-6);

    // 進捗バー
    const prog = this.st.scrollAccum/SCROLL_PER_MINE;
    this.ctx.globalAlpha=0.4;
    this.ctx.fillStyle="#888";
    this.ctx.fillRect(rx,y+h+2,w,3);
    this.ctx.globalAlpha=0.9;
    this.ctx.fillStyle="#f0b429";
    this.ctx.fillRect(rx,y+h+2,w*prog,3);
    this.ctx.globalAlpha=1;
  }

  private drawMinimap(){
    if(!this.ctx||!this.st.init) return;
    const mw=120, mh=40, mx=8, my=6, pad=1;

    // 背景
    this.ctx.globalAlpha=0.6;
    this.ctx.fillStyle="#111";
    this.ctx.fillRect(mx,my,mw+pad*2,mh+pad*2);
    this.ctx.globalAlpha=1;

    // ワールド縮小描画
    const wc=this.st.worldCols, wr=this.st.worldRows;
    const scaleX=mw/wc, scaleY=mh/wr;
    const colors: Partial<Record<Tile,string>> = {
      grass:"#4eb34f", dirt:"#8c5733", stone:"#5d6d74",
      iron_ore:"#c0844a", diamond_ore:"#5de8f0",
    };

    // ミニマップはおおまかに列ごとに地表線と鉱脈を描く
    for(let x=0;x<wc;x++){
      const sx = mx+pad+x*scaleX;
      // 地表
      const surf = this.st.heights[x];
      this.ctx.fillStyle="#4eb34f";
      this.ctx.fillRect(sx,my+pad+surf*scaleY,Math.max(1,scaleX),Math.max(1,scaleY));
      // 地下（全部石色）
      this.ctx.fillStyle="#5d6d74";
      this.ctx.fillRect(sx,my+pad+(surf+1)*scaleY,Math.max(1,scaleX),(wr-surf-1)*scaleY);
    }
    // 鉱脈スポット（間引いて描画）
    for(let y=0;y<wr;y+=3){
      for(let x=0;x<wc;x+=3){
        const t=this.st.map[y]?.[x];
        if(t==="iron_ore"||t==="diamond_ore"){
          this.ctx.fillStyle=t==="diamond_ore"?"#5de8f0":"#c0844a";
          this.ctx.fillRect(mx+pad+x*scaleX,my+pad+y*scaleY,Math.max(1,scaleX*2),Math.max(1,scaleY*2));
        }
      }
    }

    // カメラ枠
    const vfx = mx+pad+(this.st.camX/TILE)*scaleX;
    const vfy = my+pad+(this.st.camY/TILE)*scaleY;
    const vfw = (this.vw/TILE)*scaleX;
    const vfh = (VIEWPORT_H/TILE)*scaleY;
    this.ctx.strokeStyle="#fff";
    this.ctx.globalAlpha=0.8;
    this.ctx.lineWidth=1;
    this.ctx.strokeRect(vfx,vfy,vfw,vfh);
    this.ctx.globalAlpha=1;
  }
}

if(!customElements.get(COMPONENT_TAG)){
  customElements.define(COMPONENT_TAG, BottomVillageSim);
}
