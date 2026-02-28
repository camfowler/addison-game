import { WIDTH, HEIGHT } from "./game";
import { Balloon } from "./balloon";

const GRAVITY = 300;
const SEEKER_SPEED = 180;
const SEEKER_TURN_RATE = 4.0; // radians/sec

export class Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive = true;
  hitSet = new Set<Balloon>();
  isSpeedy: boolean;
  isFlaming: boolean;
  isSeeker: boolean;
  seekerPending: boolean; // travelling to click point, not yet homing
  seekerSpent = false; // was a seeker, now falling
  private seekerTargetX = 0;
  private seekerTargetY = 0;
  private seekerClosestDist = Infinity;
  flameAccum = 0;

  constructor(startX: number, startY: number, targetX: number, targetY: number, opts: { speedy?: boolean; flaming?: boolean; seeker?: boolean } = {}) {
    this.x = startX;
    this.y = startY;
    this.isSpeedy = opts.speedy ?? false;
    this.isFlaming = opts.flaming ?? false;
    this.isSeeker = false;
    this.seekerPending = opts.seeker ?? false;

    if (this.seekerPending) {
      this.seekerTargetX = targetX;
      this.seekerTargetY = targetY;
    }

    // All arrows launch with normal arc physics
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let T = 0.8 + (dist / Math.max(WIDTH, HEIGHT)) * 0.4;

    if (this.isSpeedy) {
      T = T / 3;
    }

    this.vx = dx / T;
    this.vy = dy / T - 0.5 * GRAVITY * T;
  }

  /** Returns the rear position (for smoke/flame deposit) */
  get rearX(): number {
    const angle = Math.atan2(this.vy, this.vx);
    return this.x - Math.cos(angle) * 28;
  }

  get rearY(): number {
    const angle = Math.atan2(this.vy, this.vx);
    return this.y - Math.sin(angle) * 28;
  }

  update(dt: number, balloons?: Balloon[]): void {
    // Check if pending seeker has reached its activation point
    if (this.seekerPending) {
      const dx = this.seekerTargetX - this.x;
      const dy = this.seekerTargetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Activate if close enough or started moving away (passed the target)
      if (dist < 25 || dist > this.seekerClosestDist + 5) {
        this.seekerPending = false;
        this.isSeeker = true;
        // Set velocity to seeker speed in current direction
        const angle = Math.atan2(this.vy, this.vx);
        this.vx = Math.cos(angle) * SEEKER_SPEED;
        this.vy = Math.sin(angle) * SEEKER_SPEED;
      }
      this.seekerClosestDist = Math.min(this.seekerClosestDist, dist);
    }

    if (this.isSeeker && balloons) {
      this.updateSeeker(dt, balloons);
    } else if (this.seekerSpent) {
      // Spent seeker: gravity pulls it down, head-heavy rotation
      this.vy += GRAVITY * 1.2 * dt;
      // Rotate velocity toward pointing down (head is heavy)
      const angle = Math.atan2(this.vy, this.vx);
      const downAngle = Math.PI / 2; // straight down
      let diff = downAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const torque = Math.min(Math.abs(diff), 3.0 * dt) * Math.sign(diff);
      const newAngle = angle + torque;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += GRAVITY * dt;
    }

    if (this.y > HEIGHT + 50 || this.y < -100 || this.x < -50 || this.x > WIDTH + 50) {
      this.alive = false;
    }
  }

  /** Convert active seeker into a spent falling arrow */
  deactivateSeeker(): void {
    this.isSeeker = false;
    this.seekerSpent = true;
    // Slow it down on impact
    this.vx *= 0.3;
    this.vy *= 0.3;
  }

  private updateSeeker(dt: number, balloons: Balloon[]): void {
    // Find closest alive balloon
    let closest: Balloon | null = null;
    let closestDist = Infinity;
    for (const b of balloons) {
      if (!b.alive || this.hitSet.has(b)) continue;
      const dx = b.x - this.x;
      const dy = b.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) {
        closestDist = d;
        closest = b;
      }
    }

    if (closest) {
      // Current heading
      const currentAngle = Math.atan2(this.vy, this.vx);
      // Desired heading toward target
      const desiredAngle = Math.atan2(closest.y - this.y, closest.x - this.x);

      // Compute shortest angular difference
      let diff = desiredAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      // Clamp turn rate
      const maxTurn = SEEKER_TURN_RATE * dt;
      const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
      const newAngle = currentAngle + turn;

      this.vx = Math.cos(newAngle) * SEEKER_SPEED;
      this.vy = Math.sin(newAngle) * SEEKER_SPEED;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.vy, this.vx);

    // Seeker glow (active only)
    if (this.isSeeker) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#88ddff";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Shaft — longer, brown, wooden (blue tint only for active seekers)
    ctx.strokeStyle = (this.isSeeker || this.seekerPending || this.seekerSpent) ? "#5599bb" : "#8B6914";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Arrowhead — dark iron, sharper
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-1, -3);
    ctx.lineTo(-1, 3);
    ctx.closePath();
    ctx.fill();

    // Fletching — 3 angled feathers at tail
    ctx.strokeStyle = "#c4a35a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-28, -5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-28, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-26, -3);
    ctx.stroke();

    // Nock at end
    ctx.fillStyle = "#a08030";
    ctx.beginPath();
    ctx.arc(-28, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  get tipX(): number {
    const angle = Math.atan2(this.vy, this.vx);
    return this.x + Math.cos(angle) * 10;
  }

  get tipY(): number {
    const angle = Math.atan2(this.vy, this.vx);
    return this.y + Math.sin(angle) * 10;
  }
}
