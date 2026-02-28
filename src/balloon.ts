const COLORS = ["#e94560", "#f5a623", "#50e3c2", "#b8e986", "#bd10e0", "#4a90d9"];
const WATER_COLOR = "#4a90d9";

export type BalloonType = "normal" | "big" | "splitter";

export class Balloon {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  wobblePhase: number;
  alive = true;
  escaped = false;
  isWater: boolean;
  burning = 0; // seconds remaining on fire (0 = not burning)
  attachedCandy: import("./candy").Candy | null = null;
  balloonType: BalloonType;
  hp: number;
  maxHp: number;
  immuneTimer = 0; // seconds of immunity remaining (used after split)
  frozen = false;
  falling = false; // frozen balloon falling after being shot
  fallVy = 0;

  constructor(x: number, y: number, isWater = false, color?: string, balloonType: BalloonType = "normal") {
    this.x = x;
    this.y = y;
    this.isWater = isWater;
    this.balloonType = balloonType;
    this.color = color ?? (isWater ? WATER_COLOR : COLORS[Math.floor(Math.random() * COLORS.length)]);
    this.wobblePhase = Math.random() * Math.PI * 2;

    if (balloonType === "big") {
      this.radius = 38;
      this.hp = 3;
      this.speed = 25 + Math.random() * 15;
    } else if (balloonType === "splitter") {
      this.radius = 28;
      this.hp = 1;
      this.speed = 35 + Math.random() * 25;
    } else {
      this.radius = 22;
      this.hp = 1;
      this.speed = 40 + Math.random() * 30;
    }
    this.maxHp = this.hp;
  }

  update(dt: number): void {
    if (this.falling) {
      // Frozen balloon falling down
      this.fallVy += 400 * dt;
      this.y += this.fallVy * dt;
      this.wobblePhase += dt * 8; // spin fast
      if (this.y > 650) {
        this.alive = false;
      }
      return;
    }

    if (!this.frozen) {
      this.y -= this.speed * dt;
      this.wobblePhase += dt * 2.5;
    }
    if (this.immuneTimer > 0) this.immuneTimer -= dt;

    // Burning countdown (fire thaws and burns)
    if (this.burning > 0) {
      this.frozen = false;
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

  /** Returns color if popped, null if just damaged */
  hit(): string | null {
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      return this.color;
    }
    return null;
  }

  pop(): string {
    this.hp = 0;
    this.alive = false;
    return this.color;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const wobbleX = Math.sin(this.wobblePhase) * 6;
    const bx = this.x + wobbleX;

    ctx.save();

    if (this.isWater) {
      this.drawWaterBalloon(ctx, bx, this.y);
    } else if (this.balloonType === "splitter") {
      this.drawSplitterBalloon(ctx, bx, this.y);
    } else {
      this.drawSingleBalloon(ctx, bx, this.y, this.color);
    }
    this.drawString(ctx, bx, this.y);

    // HP pips for big balloons
    if (this.balloonType === "big" && this.hp > 0 && this.hp < this.maxHp) {
      for (let i = 0; i < this.maxHp; i++) {
        const px = bx - ((this.maxHp - 1) * 6) / 2 + i * 6;
        ctx.fillStyle = i < this.hp ? "#fff" : "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.arc(px, this.y + this.radius * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Immunity shimmer
    if (this.immuneTimer > 0) {
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.01) * 0.15;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Frozen overlay
    if (this.frozen || this.falling) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#b0e0ff";
      ctx.beginPath();
      ctx.ellipse(bx, this.y, this.radius * 1.1, this.radius * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ice crystal highlights
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      const cx = bx, cy = this.y;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + this.wobblePhase * 0.2;
        const len = this.radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

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

  private drawSplitterBalloon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const r = this.radius;
    const sep = r * 0.35;

    // Two overlapping lobes
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(cx - sep, cy, r * 0.7, r * 1.1, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + sep, cy, r * 0.7, r * 1.1, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Highlights on each lobe
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx - sep - 4, cy - 6, 4, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + sep - 2, cy - 6, 4, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Dividing line
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.8);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r * 1.1);
    ctx.stroke();

    // Knot
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + r * 1.1);
    ctx.lineTo(cx + 3, cy + r * 1.1);
    ctx.lineTo(cx, cy + r * 1.1 + 5);
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
