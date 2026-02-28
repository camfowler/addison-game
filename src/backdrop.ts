import { WIDTH, HEIGHT } from "./game";

/** Cached backdrop canvas — drawn once, then blitted each frame */
let cached: HTMLCanvasElement | null = null;

export function invalidateBackdrop(): void {
  cached = null;
}

export function renderBackdrop(ctx: CanvasRenderingContext2D): void {
  if (!cached) {
    cached = document.createElement("canvas");
    cached.width = WIDTH;
    cached.height = HEIGHT;
    const c = cached.getContext("2d")!;
    drawBackdrop(c);
  }
  ctx.drawImage(cached, 0, 0);
}

function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  // Deep sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#0b0a1a");
  sky.addColorStop(0.25, "#1a1440");
  sky.addColorStop(0.55, "#2d2660");
  sky.addColorStop(0.8, "#3d3575");
  sky.addColorStop(1, "#2a2050");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Stars — multiple layers
  drawStars(ctx, 80, 0.4, 1.0);   // dim small
  drawStars(ctx, 30, 0.7, 1.5);   // medium
  drawStars(ctx, 8, 1.0, 2.5);    // bright large

  // Soft nebula glow patches
  drawNebula(ctx, 150, 100, 120, "rgba(100,50,180,0.06)");
  drawNebula(ctx, 600, 80, 150, "rgba(50,80,180,0.05)");
  drawNebula(ctx, 400, 200, 100, "rgba(180,50,100,0.04)");

  // Moon
  drawMoon(ctx, 680, 75, 35);

  // Distant clouds — wispy layers
  drawCloudLayer(ctx, HEIGHT * 0.35, 0.04, 3);
  drawCloudLayer(ctx, HEIGHT * 0.55, 0.06, 4);

  // Distant hills silhouette
  drawHills(ctx, HEIGHT * 0.78, 60, "#1a1535", 0.3);
  drawHills(ctx, HEIGHT * 0.83, 45, "#1e1840", 0.5);

  // Treeline silhouette on hills
  drawTreeline(ctx, HEIGHT * 0.80, "#161230");

  // Grass area at bottom
  const grass = ctx.createLinearGradient(0, HEIGHT - 60, 0, HEIGHT);
  grass.addColorStop(0, "#1a2a18");
  grass.addColorStop(0.4, "#1d2d1b");
  grass.addColorStop(1, "#151f14");
  ctx.fillStyle = grass;
  ctx.fillRect(0, HEIGHT - 60, WIDTH, 60);

  // Grass texture — little blade tufts
  drawGrassBlades(ctx);

  // Path/walkway for toys
  const path = ctx.createLinearGradient(0, HEIGHT - 20, 0, HEIGHT);
  path.addColorStop(0, "#3a3530");
  path.addColorStop(0.5, "#2e2a26");
  path.addColorStop(1, "#252220");
  ctx.fillStyle = path;
  ctx.fillRect(0, HEIGHT - 18, WIDTH, 18);

  // Path edge detail
  ctx.strokeStyle = "rgba(80,70,60,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT - 18);
  ctx.lineTo(WIDTH, HEIGHT - 18);
  ctx.stroke();

  // Tiny pebbles on path
  drawPebbles(ctx);
}

function drawStars(ctx: CanvasRenderingContext2D, count: number, alpha: number, maxR: number): void {
  for (let i = 0; i < count; i++) {
    const x = seededRandom(i * 7 + 1) * WIDTH;
    const y = seededRandom(i * 13 + 3) * HEIGHT * 0.7;
    const r = 0.5 + seededRandom(i * 19 + 7) * maxR;
    const a = alpha * (0.5 + seededRandom(i * 23 + 11) * 0.5);

    ctx.fillStyle = `rgba(255,255,240,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Cross sparkle on bright stars
    if (r > 1.8) {
      ctx.strokeStyle = `rgba(255,255,240,${a * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 2, y);
      ctx.lineTo(x + r * 2, y);
      ctx.moveTo(x, y - r * 2);
      ctx.lineTo(x, y + r * 2);
      ctx.stroke();
    }
  }
}

function drawNebula(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  // Glow
  const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
  glow.addColorStop(0, "rgba(200,200,240,0.08)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);

  // Moon body
  ctx.fillStyle = "#e8e4d8";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Crescent shadow
  ctx.fillStyle = "#1a1440";
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Subtle craters on visible part
  ctx.fillStyle = "rgba(180,175,160,0.3)";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r * 0.5, y + r * 0.3, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudLayer(ctx: CanvasRenderingContext2D, y: number, alpha: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const cx = seededRandom(i * 37 + y) * WIDTH;
    const w = 80 + seededRandom(i * 41 + y) * 160;
    const h = 15 + seededRandom(i * 43 + y) * 20;

    ctx.fillStyle = `rgba(150,140,180,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills(ctx: CanvasRenderingContext2D, baseY: number, amplitude: number, color: string, freq: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = 0; x <= WIDTH; x += 4) {
    const y = baseY - Math.sin(x * freq * 0.01) * amplitude * 0.5
                     - Math.sin(x * freq * 0.023 + 2) * amplitude * 0.3
                     - Math.sin(x * freq * 0.007 + 5) * amplitude * 0.2;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawTreeline(ctx: CanvasRenderingContext2D, baseY: number, color: string): void {
  ctx.fillStyle = color;
  for (let x = 0; x < WIDTH; x += 12) {
    const h = 8 + seededRandom(x * 7) * 18;
    const w = 4 + seededRandom(x * 11) * 6;
    // Triangle tree
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w / 2, baseY - h);
    ctx.lineTo(x + w, baseY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGrassBlades(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < 120; i++) {
    const x = seededRandom(i * 17 + 100) * WIDTH;
    const y = HEIGHT - 60 + seededRandom(i * 23 + 200) * 42;
    const h = 4 + seededRandom(i * 31 + 300) * 8;
    const lean = (seededRandom(i * 37 + 400) - 0.5) * 4;
    const green = 30 + Math.floor(seededRandom(i * 41 + 500) * 30);

    ctx.strokeStyle = `rgba(${green + 20},${green + 50},${green},0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - h);
    ctx.stroke();
  }
}

function drawPebbles(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < 40; i++) {
    const x = seededRandom(i * 53 + 600) * WIDTH;
    const y = HEIGHT - 14 + seededRandom(i * 59 + 700) * 10;
    const r = 1 + seededRandom(i * 61 + 800) * 1.5;
    const g = 50 + Math.floor(seededRandom(i * 67 + 900) * 30);

    ctx.fillStyle = `rgba(${g + 10},${g},${g - 10},0.3)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Deterministic pseudo-random for consistent backdrop */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
