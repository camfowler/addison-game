import { WIDTH, HEIGHT } from "./game";

const BOMB_RADIUS = 18;
const LAVA_GRAVITY = 200;
const LAVA_LIFETIME = 3.0;
const LAVA_COUNT = 12;

export class LavaDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life = LAVA_LIFETIME;
  alive = true;
  radius = 6;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 150;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 60;
  }

  update(dt: number): void {
    this.vy += LAVA_GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || this.y > HEIGHT + 20 || this.x < -20 || this.x > WIDTH + 20) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.min(1, this.life / LAVA_LIFETIME) * 0.9;
    ctx.globalAlpha = alpha;

    // Outer glow
    ctx.fillStyle = "#ff4500";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

export class Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = BOMB_RADIUS;
  alive = true;
  exploded = false;
  private fuseTimer: number;
  private wobblePhase = Math.random() * Math.PI * 2;
  private sparkPhase = 0;

  constructor() {
    // Drift in from left or right
    const fromLeft = Math.random() < 0.5;
    this.x = fromLeft ? -BOMB_RADIUS : WIDTH + BOMB_RADIUS;
    this.y = 80 + Math.random() * (HEIGHT * 0.5);
    this.vx = (fromLeft ? 1 : -1) * (30 + Math.random() * 40);
    this.vy = (Math.random() - 0.5) * 20;
    // Random fuse: explode after 4-8 seconds
    this.fuseTimer = 4 + Math.random() * 4;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt + Math.sin(this.wobblePhase) * 0.3;
    this.wobblePhase += dt * 2;
    this.sparkPhase += dt;

    this.fuseTimer -= dt;
    if (this.fuseTimer <= 0) {
      this.explode();
    }

    // Off-screen cleanup
    if (this.x < -60 || this.x > WIDTH + 60 || this.y < -60 || this.y > HEIGHT + 60) {
      this.alive = false;
    }
  }

  explode(): void {
    this.alive = false;
    this.exploded = true;
  }

  spawnLava(): LavaDrop[] {
    const drops: LavaDrop[] = [];
    for (let i = 0; i < LAVA_COUNT; i++) {
      drops.push(new LavaDrop(this.x, this.y));
    }
    return drops;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Body — dark sphere
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Metallic sheen
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(-4, -5, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Rivet band
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 0.9, this.radius * 0.3, 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // Fuse stem
    ctx.strokeStyle = "#8B6914";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.quadraticCurveTo(4, -this.radius - 8, 2, -this.radius - 14);
    ctx.stroke();

    // Fuse spark
    const sparkFlicker = 0.5 + Math.sin(this.sparkPhase * 15) * 0.5;
    ctx.globalAlpha = sparkFlicker;
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(2, -this.radius - 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff6600";
    ctx.beginPath();
    ctx.arc(2, -this.radius - 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Warning glow when fuse is short
    if (this.fuseTimer < 2) {
      ctx.globalAlpha = (1 - this.fuseTimer / 2) * 0.3;
      ctx.fillStyle = "#ff4500";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
