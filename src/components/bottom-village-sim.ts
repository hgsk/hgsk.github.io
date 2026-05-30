const COMPONENT_TAG = "bottom-village-sim";
const BASE_HEIGHT = 176;
const TILE_SIZE = 8;
const SKY_ROWS = 8;
const SURFACE_MIN = SKY_ROWS + 2;
const SURFACE_MAX = SKY_ROWS + 5;
const VILLAGER_SPEED = 0.7;

// 採掘設定
const SCROLL_PER_MINE = 300;       // スクロール何pxで1回抽選
const PROB_IRON    = 0.28;         // 鉄鉱石確率
const PROB_DIAMOND = 0.04;         // ダイヤ確率
const STORAGE_KEY  = "hytlog-mine-storage";

type TileType = "sky" | "grass" | "dirt" | "stone";
type OreKind  = "iron" | "diamond" | "miss";

interface Villager {
  x: number; y: number;
  vx: number; vy: number;
  height: number; width: number;
  wanderAt: number;
}

interface OrePopup {
  kind: OreKind;
  x: number; y: number;
  alpha: number; vy: number;
}

interface Storage { iron: number; diamond: number; }

interface SimState {
  initialized: boolean;
  columns: number; rows: number;
  map: TileType[][];
  heights: number[];
  villagers: Villager[];
  lastTime: number;
  // 採掘
  scrollAccum: number;
  storage: Storage;
  popups: OrePopup[];
  mineFlash: number;   // ms remaining for flash
}

declare global {
  interface Window { __bottomVillageSimState?: SimState; }
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function loadStorage(): Storage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { iron: 0, diamond: 0 };
}
function saveStorage(s: Storage) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

const getState = (): SimState => {
  if (!window.__bottomVillageSimState) {
    window.__bottomVillageSimState = {
      initialized: false,
      columns: 0, rows: 0,
      map: [], heights: [], villagers: [],
      lastTime: 0,
      scrollAccum: 0,
      storage: loadStorage(),
      popups: [],
      mineFlash: 0,
    };
  }
  return window.__bottomVillageSimState;
};

class BottomVillageSim extends HTMLElement {
  private readonly state = getState();
  private readonly root = this.attachShadow({ mode: "open" });
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d");
  private raf = 0;
  private resizeObserver?: ResizeObserver;
  private dpr = 1;
  private width = 0;
  private height = BASE_HEIGHT;
  private lastScrollY = 0;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = `
      :host {
        position: fixed;
        inset: auto 0 0 0;
        height: ${BASE_HEIGHT}px;
        z-index: 100;
        pointer-events: none;
        display: block;
      }
      canvas {
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        display: block;
      }
    `;
    this.canvas.setAttribute("aria-hidden", "true");
    this.root.append(style, this.canvas);
  }

  connectedCallback() {
    if (!this.context) return;
    document.documentElement.style.setProperty("--bottom-sim-height", `${BASE_HEIGHT}px`);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(document.documentElement);
    this.lastScrollY = window.scrollY;
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.resize();
    this.tick();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    window.removeEventListener("scroll", this.onScroll);
  }

  private onScroll = () => {
    const current = window.scrollY;
    const delta = Math.abs(current - this.lastScrollY);
    this.lastScrollY = current;
    this.state.scrollAccum += delta;

    while (this.state.scrollAccum >= SCROLL_PER_MINE) {
      this.state.scrollAccum -= SCROLL_PER_MINE;
      this.tryMine();
    }
  };

  private tryMine() {
    const r = Math.random();
    let found: OreKind | null = null;
    if (r < PROB_DIAMOND)      found = "diamond";
    else if (r < PROB_DIAMOND + PROB_IRON) found = "iron";

    const px = randomRange(this.width * 0.2, this.width * 0.8);
    const groundRow = this.state.heights[clamp(Math.floor(px / TILE_SIZE), 0, this.state.columns - 1)];
    const py = groundRow * TILE_SIZE - 20;

    if (!found) {
      this.state.popups.push({ kind: "miss", x: px, y: py, alpha: 0.7, vy: -0.3 });
      return;
    }

    this.state.storage[found]++;
    saveStorage(this.state.storage);
    this.state.mineFlash = 400;
    this.state.popups.push({ kind: found, x: px, y: py, alpha: 1, vy: -0.6 });
  }

  private resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = Math.max(320, Math.floor(window.innerWidth));
    this.height = BASE_HEIGHT;
    this.canvas.width  = Math.floor(this.width  * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    if (!this.context) return;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.imageSmoothingEnabled = false;

    const columns = Math.ceil(this.width  / TILE_SIZE);
    const rows    = Math.ceil(this.height / TILE_SIZE);
    if (!this.state.initialized || this.state.columns !== columns || this.state.rows !== rows) {
      this.initializeWorld(columns, rows);
    }
  }

  private initializeWorld(columns: number, rows: number) {
    this.state.columns = columns;
    this.state.rows    = rows;
    this.state.map     = Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => "sky" as TileType)
    );
    this.state.heights = Array.from({ length: columns }, () => SURFACE_MIN);

    let cur = Math.floor((SURFACE_MIN + SURFACE_MAX) / 2);
    for (let x = 0; x < columns; x++) {
      if (Math.random() < 0.4) cur += Math.random() < 0.5 ? -1 : 1;
      cur = clamp(cur, SURFACE_MIN, SURFACE_MAX);
      this.state.heights[x] = cur;
      for (let y = cur; y < rows; y++) {
        const d = y - cur;
        this.state.map[y][x] = d === 0 ? "grass" : d < 3 ? "dirt" : Math.random() < 0.25 ? "dirt" : "stone";
      }
    }

    const n = Math.max(4, Math.floor(columns / 16));
    this.state.villagers = Array.from({ length: n }, (_, i) => {
      const x = ((i + 1) * columns * TILE_SIZE) / (n + 1);
      const ground = this.getGroundY(x);
      return { x, y: ground - 11, vx: Math.random() < 0.5 ? -VILLAGER_SPEED : VILLAGER_SPEED, vy: 0, width: 6, height: 11, wanderAt: performance.now() + randomRange(800, 2600) };
    });
    this.state.initialized = true;
  }

  private getGroundY(x: number) {
    const col = clamp(Math.floor(x / TILE_SIZE), 0, this.state.columns - 1);
    return this.state.heights[col] * TILE_SIZE;
  }

  private tick = () => {
    if (!this.context) return;
    const now = performance.now();
    const dt  = Math.min(32, now - (this.state.lastTime || now));
    this.state.lastTime = now;

    this.updateVillagers(dt, now);
    this.updatePopups(dt);
    if (this.state.mineFlash > 0) this.state.mineFlash -= dt;
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private updateVillagers(dt: number, now: number) {
    for (const v of this.state.villagers) {
      if (now > v.wanderAt) {
        v.vx = Math.random() < 0.5 ? -VILLAGER_SPEED : VILLAGER_SPEED;
        v.wanderAt = now + randomRange(1000, 4000);
      }
      v.vy += 0.01 * dt;
      v.x  += v.vx * dt * 0.08;
      v.y  += v.vy * dt * 0.08;
      if (v.x < 4 || v.x > this.width - 4) { v.vx *= -1; v.x = clamp(v.x, 4, this.width - 4); }
      const groundY = this.getGroundY(v.x);
      if (v.y + v.height >= groundY) { v.y = groundY - v.height; v.vy = 0; }
    }
  }

  private updatePopups(dt: number) {
    for (const p of this.state.popups) {
      p.y     += p.vy * dt * 0.08;
      p.alpha -= dt * 0.0018;
    }
    this.state.popups = this.state.popups.filter(p => p.alpha > 0);
  }

  private draw() {
    if (!this.context) return;
    this.drawSky();
    this.drawTerrain();
    this.drawVillagers();
    this.drawPopups();
    this.drawHUD();
  }

  private drawSky() {
    if (!this.context) return;
    const g = this.context.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, "#7ad5ff");
    g.addColorStop(1, "#9ce7ff");
    this.context.fillStyle = g;
    this.context.fillRect(0, 0, this.width, this.height);
  }

  private drawTerrain() {
    if (!this.context) return;
    const palette: Record<TileType, string> = { sky: "#9ce7ff", grass: "#4eb34f", dirt: "#8c5733", stone: "#5d6d74" };
    // フラッシュ: stone を明るくする
    const stoneColor = this.state.mineFlash > 0
      ? `hsl(0,0%,${60 + Math.floor((this.state.mineFlash / 400) * 30)}%)`
      : palette.stone;

    for (let y = 0; y < this.state.rows; y++) {
      for (let x = 0; x < this.state.columns; x++) {
        const tile = this.state.map[y][x];
        if (tile === "sky") continue;
        this.context.fillStyle = tile === "stone" ? stoneColor : palette[tile];
        this.context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawVillagers() {
    if (!this.context) return;
    for (const v of this.state.villagers) {
      this.context.fillStyle = "#6b3f1f";
      this.context.fillRect(v.x - 1, v.y + 7, v.width + 2, 4);
      this.context.fillStyle = "#f3d5b5";
      this.context.fillRect(v.x, v.y, v.width, v.height - 3);
      this.context.fillStyle = "#3d2f2b";
      this.context.fillRect(v.x + 1, v.y + 2, v.width - 2, 2);
    }
  }

  private drawPopups() {
    if (!this.context) return;
    for (const p of this.state.popups) {
      this.context.globalAlpha = Math.max(0, p.alpha);
      const emoji = p.kind === "diamond" ? "💎" : p.kind === "iron" ? "🪨" : "💨";
      this.context.font = "14px system-ui";
      this.context.textAlign = "center";
      const label = p.kind === "miss" ? `${emoji} ハズレ` : `+1 ${emoji}`;
      this.context.fillText(label, p.x, p.y);
    }
    this.context.globalAlpha = 1;
  }

  private drawHUD() {
    if (!this.context) return;
    const { iron, diamond } = this.state.storage;
    const text = `🪨 ${iron}  💎 ${diamond}`;
    const pad = 8;
    this.context.font = "bold 11px system-ui";
    this.context.textAlign = "left";
    const w = this.context.measureText(text).width + pad * 2;
    const h = 20;
    const x = this.width - w - 8;
    const y = 6;

    // 背景
    this.context.globalAlpha = 0.55;
    this.context.fillStyle = "#000";
    this.context.beginPath();
    (this.context as any).roundRect?.(x, y, w, h, 4) ?? this.context.rect(x, y, w, h);
    this.context.fill();

    // テキスト
    this.context.globalAlpha = 1;
    this.context.fillStyle = "#fff";
    this.context.fillText(text, x + pad, y + h - 6);

    // スクロール進捗バー
    const prog = this.state.scrollAccum / SCROLL_PER_MINE;
    this.context.globalAlpha = 0.4;
    this.context.fillStyle = "#888";
    this.context.fillRect(x, y + h + 2, w, 3);
    this.context.globalAlpha = 0.9;
    this.context.fillStyle = "#f0b429";
    this.context.fillRect(x, y + h + 2, w * prog, 3);
    this.context.globalAlpha = 1;
  }
}

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, BottomVillageSim);
}
