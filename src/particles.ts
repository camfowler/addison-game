export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  radius: number;
  alive = true;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 0.4 + Math.random() * 0.2;
    this.maxLife = this.life;
    this.radius = 2 + Math.random() * 3;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 200 * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function spawnPopParticles(x: number, y: number, color: string): Particle[] {
  const count = 8 + Math.floor(Math.random() * 5);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}

/** Splash particles for water balloons — heavier, drip-like */
export function spawnSplashParticles(x: number, y: number): Particle[] {
  const count = 10 + Math.floor(Math.random() * 6);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const p = new Particle(x, y, "rgba(100,180,255,0.8)");
    // Override to make them drip downward
    p.vx = (Math.random() - 0.5) * 60;
    p.vy = 20 + Math.random() * 80; // mostly downward
    p.life = 0.5 + Math.random() * 0.3;
    p.maxLife = p.life;
    p.radius = 2 + Math.random() * 2;
    particles.push(p);
  }
  return particles;
}

/** Flame point left by a flaming arrow — lingers and pops balloons */
export class FlamePoint {
  x: number;
  y: number;
  life: number;
  maxLife = 5.0;
  alive = true;
  radius = 12;
  flickerPhase: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.life = this.maxLife;
    this.flickerPhase = Math.random() * Math.PI * 2;
  }

  update(dt: number): void {
    this.life -= dt;
    this.flickerPhase += dt * 12;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, Math.min(1, this.life / this.maxLife)) * 0.7;
    const flicker = 0.7 + Math.sin(this.flickerPhase) * 0.3;
    const r = this.radius * flicker;

    // Outer glow
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = "#ff4500";
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = "#ff8c00";
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

/** Smooth smoke trail left by an arrow — continuous fading curve */
export class SmokeTrail {
  points: { x: number; y: number; age: number }[] = [];
  alive = true;
  /** Once the arrow is gone, no new points are added */
  done = false;
  private maxAge = 1.5;

  addPoint(x: number, y: number): void {
    this.points.push({ x, y, age: 0 });
  }

  update(dt: number): void {
    for (const p of this.points) {
      p.age += dt;
    }
    // Remove fully faded points from the front
    while (this.points.length > 0 && this.points[0].age >= this.maxAge) {
      this.points.shift();
    }
    if (this.done && this.points.length === 0) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    // Draw segments with per-segment alpha based on age
    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      // Use the older point's age for this segment's fade
      const alpha = Math.max(0, 1 - p0.age / this.maxAge) * 0.3;
      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#b0b0b8";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Water drop from a popped water balloon — falls and extinguishes fire */
export class WaterDrop {
  x: number;
  y: number;
  vy: number;
  alive = true;
  radius = 4;

  constructor(x: number, y: number) {
    this.x = x + (Math.random() - 0.5) * 30;
    this.y = y;
    this.vy = 30 + Math.random() * 40;
  }

  update(dt: number): void {
    this.vy += 400 * dt; // heavy gravity
    this.y += this.vy * dt;
    if (this.y > 650) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(100,180,255,0.7)";
    ctx.beginPath();
    // Teardrop shape
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = "rgba(200,230,255,0.5)";
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
