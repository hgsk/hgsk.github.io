const COMPONENT_TAG = "bottom-village-sim";
const BASE_HEIGHT = 176;
const TILE_SIZE = 8;
const SKY_ROWS = 8;
const SURFACE_MIN = SKY_ROWS + 2;
const SURFACE_MAX = SKY_ROWS + 5;
const VILLAGER_SPEED = 0.7;

type TileType = "sky" | "grass" | "dirt" | "stone";

interface Villager {
  x: number;
  y: number;
  vx: number;
  vy: number;
  height: number;
  width: number;
  wanderAt: number;
}

interface NavEntity {
  label: string;
  href: string;
  x: number;
  y: number;
}

interface SimState {
  initialized: boolean;
  columns: number;
  rows: number;
  map: TileType[][];
  heights: number[];
  villagers: Villager[];
  navEntities: NavEntity[];
  lastTime: number;
}

declare global {
  interface Window {
    __bottomVillageSimState?: SimState;
  }
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getEvenSpacingRatio = (index: number, count: number) =>
  count <= 1 ? 0.5 : (index + 1) / (count + 1);

const getState = (): SimState => {
  if (!window.__bottomVillageSimState) {
    window.__bottomVillageSimState = {
      initialized: false,
      columns: 0,
      rows: 0,
      map: [],
      heights: [],
      villagers: [],
      navEntities: [],
      lastTime: 0,
    };
  }
  return window.__bottomVillageSimState;
};

class BottomVillageSim extends HTMLElement {
  private readonly state = getState();
  private readonly root = this.attachShadow({ mode: "open" });
  private readonly canvas = document.createElement("canvas");
  private readonly navLayer = document.createElement("div");
  private readonly context = this.canvas.getContext("2d");
  private raf = 0;
  private resizeObserver?: ResizeObserver;
  private dpr = 1;
  private width = 0;
  private height = BASE_HEIGHT;

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
        pointer-events: none;
      }
      .nav-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .nav-entity {
        position: absolute;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 6px;
        border: 2px solid #4d321c;
        background: #c58b5f;
        color: #2f1d10;
        text-decoration: none;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        transform: translate(-50%, -100%);
        image-rendering: pixelated;
        box-shadow: 0 2px 0 #4d321c;
        pointer-events: auto;
      }
      .nav-entity:hover,
      .nav-entity:focus-visible {
        background: #ddb08b;
        outline: none;
      }
    `;

    this.navLayer.className = "nav-layer";
    this.root.append(style, this.canvas, this.navLayer);
  }

  connectedCallback() {
    if (!this.context) return;
    document.documentElement.style.setProperty("--bottom-sim-height", `${BASE_HEIGHT}px`);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(document.documentElement);
    this.resize();
    this.tick();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
  }

  private resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = Math.max(320, Math.floor(window.innerWidth));
    this.height = BASE_HEIGHT;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    if (!this.context) return;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.imageSmoothingEnabled = false;

    const columns = Math.ceil(this.width / TILE_SIZE);
    const rows = Math.ceil(this.height / TILE_SIZE);

    if (
      !this.state.initialized ||
      this.state.columns !== columns ||
      this.state.rows !== rows
    ) {
      this.initializeWorld(columns, rows);
    } else {
      this.state.navEntities = this.createNavEntities();
      this.renderNavEntities();
    }
  }

  private initializeWorld(columns: number, rows: number) {
    this.state.columns = columns;
    this.state.rows = rows;
    this.state.map = Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => "sky" as TileType)
    );
    this.state.heights = Array.from({ length: columns }, () => SURFACE_MIN);

    let currentHeight = Math.floor((SURFACE_MIN + SURFACE_MAX) / 2);
    for (let x = 0; x < columns; x++) {
      if (Math.random() < 0.4) {
        currentHeight += Math.random() < 0.5 ? -1 : 1;
      }
      currentHeight = clamp(currentHeight, SURFACE_MIN, SURFACE_MAX);
      this.state.heights[x] = currentHeight;

      for (let y = currentHeight; y < rows; y++) {
        const depth = y - currentHeight;
        this.state.map[y][x] =
          depth === 0 ? "grass" : depth < 3 ? "dirt" : Math.random() < 0.25 ? "dirt" : "stone";
      }
    }

    const villagers = Math.max(4, Math.floor(columns / 16));
    this.state.villagers = Array.from({ length: villagers }, (_, index) => {
      const x = ((index + 1) * columns * TILE_SIZE) / (villagers + 1);
      const ground = this.getGroundY(x);
      return {
        x,
        y: ground - 11,
        vx: Math.random() < 0.5 ? -VILLAGER_SPEED : VILLAGER_SPEED,
        vy: 0,
        width: 6,
        height: 11,
        wanderAt: performance.now() + randomRange(800, 2600),
      };
    });
    this.state.navEntities = this.createNavEntities();
    this.renderNavEntities();
    this.state.initialized = true;
  }

  private createNavEntities(): NavEntity[] {
    const entities = [{ label: "BLOG", href: "/" }];

    return entities.map((entity, index) => {
      const ratio = getEvenSpacingRatio(index, entities.length);
      const x = Math.floor(this.width * ratio);
      const y = this.getGroundY(x) - 2;
      return { ...entity, x, y };
    });
  }

  private renderNavEntities() {
    this.navLayer.textContent = "";
    for (const entity of this.state.navEntities) {
      const link = document.createElement("a");
      link.className = "nav-entity";
      link.href = entity.href;
      link.textContent = entity.label;
      link.style.left = `${entity.x}px`;
      link.style.top = `${entity.y}px`;
      this.navLayer.append(link);
    }
  }

  private getGroundY(x: number) {
    const col = clamp(Math.floor(x / TILE_SIZE), 0, this.state.columns - 1);
    return this.state.heights[col] * TILE_SIZE;
  }

  private tick = () => {
    if (!this.context) return;
    const now = performance.now();
    const dt = Math.min(32, now - (this.state.lastTime || now));
    this.state.lastTime = now;

    this.updateVillagers(dt, now);
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private updateVillagers(dt: number, now: number) {
    for (const villager of this.state.villagers) {
      if (now > villager.wanderAt) {
        villager.vx = Math.random() < 0.5 ? -VILLAGER_SPEED : VILLAGER_SPEED;
        villager.wanderAt = now + randomRange(1000, 4000);
      }

      villager.vy += 0.01 * dt;
      villager.x += villager.vx * dt * 0.08;
      villager.y += villager.vy * dt * 0.08;

      if (villager.x < 4 || villager.x > this.width - 4) {
        villager.vx *= -1;
        villager.x = clamp(villager.x, 4, this.width - 4);
      }

      const groundY = this.getGroundY(villager.x);
      const feet = villager.y + villager.height;
      if (feet >= groundY) {
        villager.y = groundY - villager.height;
        villager.vy = 0;
      }
    }
  }

  private draw() {
    if (!this.context) return;
    this.drawSky();
    this.drawTerrain();
    this.drawVillagers();
  }

  private drawSky() {
    if (!this.context) return;
    const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#7ad5ff");
    gradient.addColorStop(1, "#9ce7ff");
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);
  }

  private drawTerrain() {
    if (!this.context) return;
    const palette: Record<TileType, string> = {
      sky: "#9ce7ff",
      grass: "#4eb34f",
      dirt: "#8c5733",
      stone: "#5d6d74",
    };

    for (let y = 0; y < this.state.rows; y++) {
      for (let x = 0; x < this.state.columns; x++) {
        const tile = this.state.map[y][x];
        if (tile === "sky") continue;
        this.context.fillStyle = palette[tile];
        this.context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawVillagers() {
    if (!this.context) return;
    for (const villager of this.state.villagers) {
      this.context.fillStyle = "#6b3f1f";
      this.context.fillRect(villager.x - 1, villager.y + 7, villager.width + 2, 4);
      this.context.fillStyle = "#f3d5b5";
      this.context.fillRect(villager.x, villager.y, villager.width, villager.height - 3);
      this.context.fillStyle = "#3d2f2b";
      this.context.fillRect(villager.x + 1, villager.y + 2, villager.width - 2, 2);
    }
  }
}

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, BottomVillageSim);
}
