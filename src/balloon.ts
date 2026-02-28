const COLORS = ["#e94560", "#f5a623", "#50e3c2", "#b8e986", "#bd10e0", "#4a90d9"];
const WATER_COLOR = "#4a90d9";

export class Balloon {
  x: number;
  y: number;
  radius = 22;
  color: string;
  speed: number;
  wobblePhase: number;
  alive = true;
  escaped = false;
  isWater: boolean;
  burning = 0; // seconds remaining on fire (0 = not burning)

  constructor(x: number, y: number, isWater = false) {
    this.x = x;
    this.y = y;
    this.isWater = isWater;
    this.speed = 40 + Math.random() * 30;
    this.color = isWater ? WATER_COLOR : COLORS[Math.floor(Math.random() * COLORS.length)];
    this.wobblePhase = Math.random() * Math.PI * 2;
  }

  update(dt: number): void {
    this.y -= this.speed * dt;
    this.wobblePhase += dt * 2.5;

    // Burning countdown
    if (this.burning > 0) {
      this.burning -= dt;
      if (this.burning <= 0) {
        this.burning = 0;
        this.alive = false; // popped by fire
      }
    }

    if (this.y + this.radius < 0) {
      this.alive = false;
      this.escaped = true;
    }
  }

  ignite(): void {
    if (this.burning <= 0) {
      this.burning = 2.0;
    }
  }

  pop(): string {
    this.alive = false;
    return this.color;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const wobbleX = Math.sin(this.wobblePhase) * 6;
    const bx = this.x + wobbleX;

    ctx.save();

    if (this.isWater) {
      this.drawWaterBalloon(ctx, bx, this.y);
    } else {
      this.drawSingleBalloon(ctx, bx, this.y, this.color);
    }
    this.drawString(ctx, bx, this.y);

    // Fire overlay when burning
    if (this.burning > 0) {
      const flicker = 0.6 + Math.sin(this.wobblePhase * 6) * 0.4;
      ctx.globalAlpha = 0.5 * flicker;
      ctx.fillStyle = "#ff4500";
      ctx.beginPath();
      ctx.ellipse(bx, this.y - 5, this.radius * 0.8, this.radius * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4 * flicker;
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.ellipse(bx, this.y - 8, this.radius * 0.4, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawSingleBalloon(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, this.radius, this.radius * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 8, 5, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Knot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + this.radius * 1.25);
    ctx.lineTo(cx + 3, cy + this.radius * 1.25);
    ctx.lineTo(cx, cy + this.radius * 1.25 + 5);
    ctx.closePath();
    ctx.fill();
  }

  private drawWaterBalloon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    // Translucent blue body
    ctx.fillStyle = "rgba(74,144,217,0.6)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, this.radius, this.radius * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water surface shine
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 6, 7, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner ripple
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Knot
    ctx.fillStyle = "rgba(74,144,217,0.8)";
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + this.radius * 1.25);
    ctx.lineTo(cx + 3, cy + this.radius * 1.25);
    ctx.lineTo(cx, cy + this.radius * 1.25 + 5);
    ctx.closePath();
    ctx.fill();
  }

  private drawString(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const knotY = cy + this.radius * 1.25 + 5;
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, knotY);
    for (let i = 1; i <= 4; i++) {
      const sx = cx + Math.sin(this.wobblePhase + i * 0.8) * 4;
      ctx.lineTo(sx, knotY + i * 10);
    }
    ctx.stroke();
  }
}
