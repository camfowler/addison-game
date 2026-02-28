import { WIDTH, HEIGHT } from "./game";

type CandyType = "wrapped" | "lollipop" | "star" | "heart" | "swirl";
const CANDY_TYPES: CandyType[] = ["wrapped", "lollipop", "star", "heart", "swirl"];
const CANDY_COLORS = ["#e94560", "#f5a623", "#50e3c2", "#bd10e0", "#4a90d9", "#b8e986", "#ff6b9d"];
const GRAVITY = 400;

export class Candy {
  x: number;
  y: number;
  groundY: number; // original resting Y
  readonly type: CandyType;
  readonly color: string;
  readonly wrapColor: string;

  onGround = true;
  carried = false;   // held by a toy
  attached = false;   // attached to a balloon in flight
  stolen = false;     // escaped off the top
  falling = false;    // falling after balloon popped
  private vy = 0;
  private vx = 0;
  private rotation = 0;
  private rotSpeed = 0;
  private bounceCount = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.groundY = y;
    this.type = CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
    this.color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
    this.wrapColor = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
  }

  /** Start falling from a popped balloon position */
  dropFrom(bx: number, by: number): void {
    this.x = bx;
    this.y = by;
    this.falling = true;
    this.attached = false;
    this.vy = -50 + Math.random() * 30; // slight upward from pop
    this.vx = (Math.random() - 0.5) * 60;
    this.rotSpeed = (Math.random() - 0.5) * 8;
  }

  update(dt: number): void {
    if (!this.falling) return;

    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;

    // Bounce on ground
    const floorY = HEIGHT - 28;
    if (this.y >= floorY) {
      this.y = floorY;
      this.vy = -this.vy * 0.4;
      this.vx *= 0.7;
      this.rotSpeed *= 0.5;
      this.bounceCount++;

      if (this.bounceCount >= 3 || Math.abs(this.vy) < 20) {
        this.falling = false;
        this.onGround = true;
        this.groundY = floorY;
        this.vy = 0;
        this.vx = 0;
        this.rotation = 0;
      }
    }

    // Clamp to screen bounds
    this.x = Math.max(20, Math.min(WIDTH - 20, this.x));
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.stolen) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.falling) {
      ctx.rotate(this.rotation);
    }

    switch (this.type) {
      case "wrapped": this.drawWrapped(ctx); break;
      case "lollipop": this.drawLollipop(ctx); break;
      case "star": this.drawStar(ctx); break;
      case "heart": this.drawHeart(ctx); break;
      case "swirl": this.drawSwirl(ctx); break;
    }

    ctx.restore();
  }

  /** Render when attached to a balloon string at a given offset below balloon */
  renderOnString(ctx: CanvasRenderingContext2D, bx: number, by: number, stringLen: number): void {
    ctx.save();
    const cy = by + stringLen;
    ctx.translate(bx, cy);

    // Gentle swing
    const swing = Math.sin(Date.now() * 0.003 + this.x) * 0.15;
    ctx.rotate(swing);

    switch (this.type) {
      case "wrapped": this.drawWrapped(ctx); break;
      case "lollipop": this.drawLollipop(ctx); break;
      case "star": this.drawStar(ctx); break;
      case "heart": this.drawHeart(ctx); break;
      case "swirl": this.drawSwirl(ctx); break;
    }

    ctx.restore();
  }

  private drawWrapped(ctx: CanvasRenderingContext2D): void {
    // Wrapped candy — rectangle with twisted ends
    ctx.fillStyle = this.color;
    roundRect(ctx, -6, -4, 12, 8, 2);
    ctx.fill();

    // Stripe
    ctx.fillStyle = this.wrapColor;
    ctx.fillRect(-2, -4, 4, 8);

    // Twisted ends
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(-10, -4);
    ctx.lineTo(-10, 4);
    ctx.lineTo(-6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.lineTo(10, -4);
    ctx.lineTo(10, 4);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(-2, -2, 3, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLollipop(ctx: CanvasRenderingContext2D): void {
    // Stick
    ctx.strokeStyle = "#d4c4a0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // Circle head
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, -2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Swirl pattern
    ctx.strokeStyle = this.wrapColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -2, 3, 0, Math.PI * 1.5);
    ctx.stroke();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(-1.5, -3.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const innerAngle = angle + Math.PI / 5;
      const ox = Math.cos(angle) * 7;
      const oy = Math.sin(angle) * 7;
      const ix = Math.cos(innerAngle) * 3;
      const iy = Math.sin(innerAngle) * 3;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(-1, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-7, -2, -7, -7, 0, -4);
    ctx.bezierCurveTo(7, -7, 7, -2, 0, 3);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(-2.5, -3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSwirl(ctx: CanvasRenderingContext2D): void {
    // Round candy with swirl
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Swirl lines
    ctx.strokeStyle = this.wrapColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.1) {
      const r = a * 1.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (r > 6) break;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Wrapper crinkle at top
    ctx.fillStyle = "rgba(255,255,200,0.4)";
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(0, -9);
    ctx.lineTo(2, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(-1.5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Spawn candies scattered across the ground area */
export function spawnCandies(): Candy[] {
  const candies: Candy[] = [];
  const groundY = HEIGHT - 28;
  const margin = 80;
  const count = 10;
  const spacing = (WIDTH - margin * 2) / (count - 1);

  for (let i = 0; i < count; i++) {
    // Spread evenly with some jitter
    const x = margin + i * spacing + (Math.random() - 0.5) * spacing * 0.6;
    const y = groundY - Math.random() * 5;
    candies.push(new Candy(x, y));
  }
  return candies;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
