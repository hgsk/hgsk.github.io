// Full Stack Architecture Sim
// Terraria-style 2D sim visualising Frontend / Backend / Infrastructure layers.

const COMPONENT_TAG = "bottom-village-sim";

// World dimensions
const BASE_HEIGHT = 384;       // canvas height in CSS px
const TILE_SIZE = 32;          // px per tile
const ROWS = 12;               // BASE_HEIGHT / TILE_SIZE

// Entity dimensions
const ENTITY_W = 14;
const ENTITY_H = 22;

// Physics
const AI_SPEED = 0.65;
const JUMP_VY = -6.0;
const GRAVITY_ACCEL = 0.015;
const V_SCALE = 0.08;          // velocity → px  multiplier (applied with dt)
const MINE_COOLDOWN = 350;     // ms between mine actions

// Row layout
//  0-2  : sky / air  (Frontend walking space)
//  3    : grass      (FRONTEND_FLOOR – solid surface)
//  4    : dirt
//  5-6  : air        (Backend cavern)
//  7-8  : stone      (Backend floor)
//  9-10 : air        (Infra cavern)
//  11   : bedrock    (Infra floor – indestructible)
const FRONTEND_FLOOR = 3;
const BACKEND_CAVE_TOP = 5;
const BACKEND_FLOOR = 7;
const INFRA_CAVE_TOP = 9;
const BEDROCK_ROW = 11;

type TileType = "air" | "grass" | "dirt" | "stone" | "bedrock";

const TILE_SOLID: Record<TileType, boolean> = {
  air: false, grass: true, dirt: true, stone: true, bedrock: true,
};

const TILE_COLOR: Record<TileType, string | null> = {
  air: null,
  grass: "#10b981",
  dirt: "#78350f",
  stone: "#475569",
  bedrock: "#1e293b",
};

interface EntityDef {
  id: string;
  name: string;
  color: string;
  floorRow: number;
}

const ENTITY_DEFS: EntityDef[] = [
  { id: "react",      name: "React",      color: "#61dafb", floorRow: FRONTEND_FLOOR },
  { id: "vue",        name: "Vue.js",     color: "#42b883", floorRow: FRONTEND_FLOOR },
  { id: "typescript", name: "TypeScript", color: "#818cf8", floorRow: FRONTEND_FLOOR },
  { id: "nodejs",     name: "Node.js",    color: "#4ade80", floorRow: BACKEND_FLOOR  },
  { id: "postgresql", name: "PostgreSQL", color: "#60a5fa", floorRow: BACKEND_FLOOR  },
  { id: "docker",     name: "Docker",     color: "#38bdf8", floorRow: BEDROCK_ROW    },
  { id: "linux",      name: "Linux",      color: "#fbbf24", floorRow: BEDROCK_ROW    },
];

interface Entity {
  def: EntityDef;
  x: number;           // left edge in px
  y: number;           // top edge in px
  vx: number;
  vy: number;
  onGround: boolean;
  facingRight: boolean;
  wanderAt: number;    // ms timestamp – next AI direction change
  mineAt: number;      // ms timestamp – next mine action available
}

interface SimState {
  initialized: boolean;
  columns: number;
  tiles: TileType[][];
  entities: Entity[];
  lastTime: number;
  highlightedId: string | null;
  keys: Set<string>;
}

declare global {
  interface Window {
    __bottomVillageSim?: SimState;
    bottomSimHighlight?: (id: string | null) => void;
  }
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function getState(): SimState {
  if (!window.__bottomVillageSim) {
    window.__bottomVillageSim = {
      initialized: false,
      columns: 0,
      tiles: [],
      entities: [],
      lastTime: 0,
      highlightedId: null,
      keys: new Set(),
    };
  }
  return window.__bottomVillageSim;
}

class BottomVillageSim extends HTMLElement {
  private readonly state = getState();
  private readonly root = this.attachShadow({ mode: "open" });
  private readonly canvas = document.createElement("canvas");
  private readonly ctx = this.canvas.getContext("2d");
  private raf = 0;
  private resizeObs?: ResizeObserver;
  private dpr = 1;
  private width = 0;

  private readonly onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ("wasd".includes(k) && k.length === 1) {
      e.preventDefault();
      this.state.keys.add(k);
    }
  };
  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.state.keys.delete(e.key.toLowerCase());
  };

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
    if (!this.ctx) return;
    document.documentElement.style.setProperty("--bottom-sim-height", `${BASE_HEIGHT}px`);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(document.documentElement);
    this.resize();
    this.tick();
    document.addEventListener("keydown", this.onKeyDown, { passive: false });
    document.addEventListener("keyup", this.onKeyUp);
    window.bottomSimHighlight = (id) => { this.state.highlightedId = id; };
    this.wireKeywords();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }

  // Attach hover listeners to any [data-sim-npc] elements already in the DOM.
  private wireKeywords() {
    document.querySelectorAll<HTMLElement>("[data-sim-npc]").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        this.state.highlightedId = el.dataset.simNpc ?? null;
      });
      el.addEventListener("mouseleave", () => {
        this.state.highlightedId = null;
      });
    });
  }

  // ── World setup ──────────────────────────────────────────────────────────────

  private resize() {
    if (!this.ctx) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = Math.max(320, window.innerWidth);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(BASE_HEIGHT * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    const columns = Math.ceil(this.width / TILE_SIZE);
    if (!this.state.initialized || this.state.columns !== columns) {
      this.initWorld(columns);
    }
  }

  private baseTile(row: number): TileType {
    if (row === BEDROCK_ROW)                              return "bedrock";
    if (row === INFRA_CAVE_TOP || row === INFRA_CAVE_TOP + 1) return "air";
    if (row >= BACKEND_FLOOR)                             return "stone";
    if (row === BACKEND_CAVE_TOP || row === BACKEND_CAVE_TOP + 1) return "air";
    if (row === FRONTEND_FLOOR + 1)                       return "dirt";
    if (row === FRONTEND_FLOOR)                           return "grass";
    return "air"; // rows 0-2
  }

  private initWorld(columns: number) {
    this.state.columns = columns;
    this.state.tiles = Array.from({ length: ROWS }, (_, row) =>
      Array.from({ length: columns }, () => this.baseTile(row))
    );

    // Group defs by floorRow and distribute evenly across canvas width
    const groups = new Map<number, EntityDef[]>();
    for (const def of ENTITY_DEFS) {
      if (!groups.has(def.floorRow)) groups.set(def.floorRow, []);
      groups.get(def.floorRow)!.push(def);
    }

    this.state.entities = [];
    for (const [floorRow, defs] of groups) {
      const step = Math.floor(columns / (defs.length + 1));
      defs.forEach((def, i) => {
        const col = step * (i + 1);
        this.state.entities.push({
          def,
          x: col * TILE_SIZE,
          y: floorRow * TILE_SIZE - ENTITY_H,
          vx: Math.random() < 0.5 ? -AI_SPEED : AI_SPEED,
          vy: 0,
          onGround: true,
          facingRight: Math.random() < 0.5,
          wanderAt: performance.now() + randomRange(800, 3000),
          mineAt: 0,
        });
      });
    }
    this.state.initialized = true;
  }

  // ── Tile helpers ─────────────────────────────────────────────────────────────

  private getTile(col: number, row: number): TileType {
    if (col < 0 || col >= this.state.columns || row < 0 || row >= ROWS) return "bedrock";
    return this.state.tiles[row][col];
  }

  private isSolid(col: number, row: number): boolean {
    return TILE_SOLID[this.getTile(col, row)];
  }

  private dig(col: number, row: number): boolean {
    const t = this.getTile(col, row);
    if (t === "air" || t === "bedrock") return false;
    this.state.tiles[row][col] = "air";
    return true;
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  private tick = () => {
    if (!this.ctx) return;
    const now = performance.now();
    const dt = Math.min(32, now - (this.state.lastTime || now));
    this.state.lastTime = now;
    this.updateEntities(dt, now);
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private updateEntities(dt: number, now: number) {
    for (const e of this.state.entities) {
      const isPlayer = e.def.id === this.state.highlightedId;

      if (isPlayer) {
        this.applyPlayerControl(e, now);
      } else {
        this.applyAI(e, now);
      }

      // Gravity
      e.vy += GRAVITY_ACCEL * dt;

      // Move Y then resolve
      e.y += e.vy * dt * V_SCALE;
      this.resolveY(e);

      // Move X then resolve
      e.x += e.vx * dt * V_SCALE;
      const blockedH = this.resolveX(e);

      // Handle horizontal obstacle for AI
      if (blockedH && !isPlayer) {
        this.onAIBlocked(e, now);
      }

      // Mine in movement direction for player
      if (isPlayer && blockedH) {
        this.playerMineAhead(e, now);
      }

      // Canvas edge boundary
      e.x = clamp(e.x, 0, this.width - ENTITY_W);
      if (e.x <= 0 || e.x >= this.width - ENTITY_W) {
        e.vx *= -1;
        e.facingRight = e.vx > 0;
      }
    }
  }

  // ── Physics helpers ───────────────────────────────────────────────────────────

  private resolveY(e: Entity) {
    const colL = Math.floor(e.x / TILE_SIZE);
    const colR = Math.floor((e.x + ENTITY_W - 1) / TILE_SIZE);
    e.onGround = false;

    if (e.vy >= 0) {
      // Falling / standing
      const rowFeet = Math.floor((e.y + ENTITY_H) / TILE_SIZE);
      if (rowFeet < ROWS && (this.isSolid(colL, rowFeet) || this.isSolid(colR, rowFeet))) {
        e.y = rowFeet * TILE_SIZE - ENTITY_H;
        e.vy = 0;
        e.onGround = true;
      }
    } else {
      // Rising
      const rowHead = Math.floor(e.y / TILE_SIZE);
      if (rowHead >= 0 && (this.isSolid(colL, rowHead) || this.isSolid(colR, rowHead))) {
        e.y = (rowHead + 1) * TILE_SIZE;
        e.vy = 0;
      }
    }
  }

  /** Returns true when a horizontal solid was hit. */
  private resolveX(e: Entity): boolean {
    const rowT = Math.floor(e.y / TILE_SIZE);
    const rowB = Math.floor((e.y + ENTITY_H - 1) / TILE_SIZE);

    if (e.vx > 0) {
      const colR = Math.floor((e.x + ENTITY_W) / TILE_SIZE);
      if (this.isSolid(colR, rowT) || this.isSolid(colR, rowB)) {
        e.x = colR * TILE_SIZE - ENTITY_W;
        return true;
      }
    } else if (e.vx < 0) {
      const colL = Math.floor((e.x - 1) / TILE_SIZE);
      if (this.isSolid(colL, rowT) || this.isSolid(colL, rowB)) {
        e.x = (colL + 1) * TILE_SIZE;
        return true;
      }
    }
    return false;
  }

  // ── AI ────────────────────────────────────────────────────────────────────────

  private applyAI(e: Entity, now: number) {
    if (now > e.wanderAt) {
      e.vx = Math.random() < 0.5 ? -AI_SPEED : AI_SPEED;
      e.facingRight = e.vx > 0;
      e.wanderAt = now + randomRange(1000, 4000);
    }
    e.facingRight = e.vx > 0;
  }

  private onAIBlocked(e: Entity, now: number) {
    const dir = e.vx > 0 ? 1 : -1;
    const obstCol = dir > 0
      ? Math.floor((e.x + ENTITY_W) / TILE_SIZE)
      : Math.floor((e.x - 1) / TILE_SIZE);
    const rowHead = Math.floor(e.y / TILE_SIZE);
    const rowFeet = Math.floor((e.y + ENTITY_H - 1) / TILE_SIZE);

    // Try to jump if there's clear space above the obstacle
    if (e.onGround && !this.isSolid(obstCol, rowHead - 1)) {
      e.vy = JUMP_VY;
      return;
    }

    // Otherwise mine the blocking tiles
    if (now >= e.mineAt) {
      if (this.dig(obstCol, rowHead) || this.dig(obstCol, rowFeet)) {
        e.mineAt = now + MINE_COOLDOWN;
        return;
      }
    }

    // If nothing works (bedrock etc.) reverse direction
    e.vx *= -1;
    e.facingRight = e.vx > 0;
    e.wanderAt = now + randomRange(500, 2000);
  }

  // ── Player control ────────────────────────────────────────────────────────────

  private applyPlayerControl(e: Entity, now: number) {
    const keys = this.state.keys;
    const spd = AI_SPEED * 1.4;

    if (keys.has("a"))      { e.vx = -spd; e.facingRight = false; }
    else if (keys.has("d")) { e.vx = spd;  e.facingRight = true;  }
    else                    { e.vx = 0; }

    if (keys.has("w") && e.onGround) e.vy = JUMP_VY;

    // Mine downward
    if (keys.has("s") && now >= e.mineAt) {
      const col  = Math.floor((e.x + ENTITY_W / 2) / TILE_SIZE);
      const row  = Math.floor((e.y + ENTITY_H)     / TILE_SIZE);
      if (this.dig(col, row)) e.mineAt = now + MINE_COOLDOWN;
    }
  }

  private playerMineAhead(e: Entity, now: number) {
    if (now < e.mineAt) return;
    const dir    = e.vx >= 0 ? 1 : -1;
    const mineC  = dir > 0
      ? Math.floor((e.x + ENTITY_W) / TILE_SIZE)
      : Math.floor((e.x - 1)        / TILE_SIZE);
    const rowT = Math.floor(e.y / TILE_SIZE);
    const rowB = Math.floor((e.y + ENTITY_H - 1) / TILE_SIZE);
    if (this.dig(mineC, rowT) || this.dig(mineC, rowB)) {
      e.mineAt = now + MINE_COOLDOWN;
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  private draw() {
    if (!this.ctx) return;
    this.drawBackground();
    this.drawTiles();
    this.drawLayerLabels();
    this.drawEntities();
  }

  private drawBackground() {
    const ctx = this.ctx!;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, FRONTEND_FLOOR * TILE_SIZE);
    sky.addColorStop(0, "#0c1020");
    sky.addColorStop(1, "#1a2540");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, FRONTEND_FLOOR * TILE_SIZE);

    // Underground below surface
    ctx.fillStyle = "#0d0805";
    ctx.fillRect(0, FRONTEND_FLOOR * TILE_SIZE, this.width, BASE_HEIGHT - FRONTEND_FLOOR * TILE_SIZE);

    // Backend cavern ambient
    ctx.fillStyle = "#071220";
    ctx.fillRect(0, BACKEND_CAVE_TOP * TILE_SIZE, this.width, 2 * TILE_SIZE);

    // Infra cavern ambient (deeper, darker)
    ctx.fillStyle = "#03080f";
    ctx.fillRect(0, INFRA_CAVE_TOP * TILE_SIZE, this.width, 2 * TILE_SIZE);
  }

  private drawTiles() {
    const ctx = this.ctx!;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < this.state.columns; col++) {
        const tile  = this.state.tiles[row][col];
        const color = TILE_COLOR[tile];
        if (!color) continue;
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        ctx.fillStyle = color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Simple inner shadow (bottom + right edge)
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
      }
    }
  }

  private drawLayerLabels() {
    const ctx = this.ctx!;
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";

    const labels: [string, number, string][] = [
      ["Frontend",       4,                       "rgba(255,255,255,0.22)"],
      ["Backend",        BACKEND_CAVE_TOP * TILE_SIZE + 4,  "rgba(255,255,255,0.18)"],
      ["Infrastructure", INFRA_CAVE_TOP   * TILE_SIZE + 4,  "rgba(255,255,255,0.16)"],
    ];
    for (const [text, y, color] of labels) {
      ctx.fillStyle = color;
      ctx.fillText(text, 8, y);
    }
    ctx.textBaseline = "alphabetic";
  }

  private drawEntities() {
    const ctx = this.ctx!;
    const now = performance.now();
    const highlightedId = this.state.highlightedId;

    for (const e of this.state.entities) {
      const hl = e.def.id === highlightedId;
      const { x, y } = e;
      const cx = x + ENTITY_W / 2;
      const cy = y + ENTITY_H / 2;

      if (hl) {
        // Pulsing aura
        const r = 20 + Math.sin(now * 0.005) * 4;
        const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        aura.addColorStop(0, e.def.color + "66");
        aura.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Vertical guide line to canvas top
        ctx.save();
        ctx.strokeStyle = e.def.color + "55";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Body
      ctx.fillStyle = e.def.color;
      ctx.fillRect(x + 2, y + 9, ENTITY_W - 4, ENTITY_H - 9);
      // Head
      ctx.fillRect(x + 1, y, ENTITY_W - 2, 10);

      // Eye
      ctx.fillStyle = "#0a0a0a";
      const eyeX = e.facingRight ? x + ENTITY_W - 5 : x + 2;
      ctx.fillRect(eyeX, y + 2, 2, 2);

      // Name label
      ctx.font = hl ? "bold 9px Inter, system-ui" : "9px Inter, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = hl ? e.def.color : "rgba(255,255,255,0.65)";
      ctx.fillText(e.def.name, cx, y - 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }
}

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, BottomVillageSim);
}
