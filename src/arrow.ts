import { WIDTH, HEIGHT } from "./game";
import { Balloon } from "./balloon";

const GRAVITY = 300;
const SEEKER_SPEED = 180;
const SEEKER_TURN_RATE = 4.0; // radians/sec
const SEEKER_DECEL = 300; // px/s² deceleration toward seeker speed

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

  isCluster: boolean;
  isClusterChild = false;
  private clusterTargetX = 0;
  private clusterTargetY = 0;
  private clusterClosestDist = Infinity;
  clusterExploded = false;

  constructor(startX: number, startY: number, targetX: number, targetY: number, opts: { speedy?: boolean; flaming?: boolean; seeker?: boolean; cluster?: boolean; clusterChild?: boolean } = {}) {
    this.x = startX;
    this.y = startY;
    this.isSpeedy = opts.speedy ?? false;
    this.isFlaming = opts.flaming ?? false;
    this.isSeeker = false;
    this.seekerPending = opts.seeker ?? false;

    this.isCluster = opts.cluster ?? false;
    this.isClusterChild = opts.clusterChild ?? false;

    if (this.seekerPending) {
      this.seekerTargetX = targetX;
      this.seekerTargetY = targetY;
    }

    if (this.isCluster) {
      this.clusterTargetX = targetX;
      this.clusterTargetY = targetY;
    }

    // All arrows launch with normal arc physics
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let T = 0.8 + (dist / Math.max(WIDTH, HEIGHT)) * 0.4;

    if (this.isSpeedy) {
      T = 0.25; // fixed fast flight time regardless of distance
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
    // Check if cluster arrow has reached its detonation point
    if (this.isCluster && !this.clusterExploded) {
      const dx = this.clusterTargetX - this.x;
      const dy = this.clusterTargetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30 || dist > this.clusterClosestDist + 5) {
        this.clusterExploded = true;
        this.alive = false; // parent arrow dies, game.ts spawns children
      }
      this.clusterClosestDist = Math.min(this.clusterClosestDist, dist);
    }

    // Check if pending seeker has reached its activation point
    if (this.seekerPending) {
      const dx = this.seekerTargetX - this.x;
      const dy = this.seekerTargetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Activate if close enough or started moving away (passed the target)
      if (dist < 25 || dist > this.seekerClosestDist + 5) {
        this.seekerPending = false;
        this.isSeeker = true;
        // Keep current velocity — updateSeeker will gradually slow it down
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

    // Gradually decelerate to seeker speed
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const newSpeed = currentSpeed > SEEKER_SPEED
      ? Math.max(SEEKER_SPEED, currentSpeed - SEEKER_DECEL * dt)
      : SEEKER_SPEED;

    const currentAngle = Math.atan2(this.vy, this.vx);

    if (closest) {
      const desiredAngle = Math.atan2(closest.y - this.y, closest.x - this.x);

      let diff = desiredAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const maxTurn = SEEKER_TURN_RATE * dt;
      const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
      const newAngle = currentAngle + turn;

      this.vx = Math.cos(newAngle) * newSpeed;
      this.vy = Math.sin(newAngle) * newSpeed;
    } else {
      this.vx = Math.cos(currentAngle) * newSpeed;
      this.vy = Math.sin(currentAngle) * newSpeed;
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

    // Cluster glow
    if (this.isCluster) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#ffaa44";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    const scale = this.isCluster ? 1.6 : this.isClusterChild ? 0.7 : 1;
    ctx.scale(scale, scale);

    // Shaft — longer, brown, wooden (blue tint for seekers, orange for cluster)
    ctx.strokeStyle = (this.isSeeker || this.seekerPending || this.seekerSpent) ? "#5599bb"
      : this.isCluster ? "#cc6600"
      : this.isClusterChild ? "#dd8833"
      : "#8B6914";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Arrowhead — dark iron, sharper (orange-red for cluster)
    ctx.fillStyle = this.isCluster || this.isClusterChild ? "#e05020" : "#555";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-1, -3);
    ctx.lineTo(-1, 3);
    ctx.closePath();
    ctx.fill();

    // Fletching — 3 angled feathers at tail
    ctx.strokeStyle = this.isCluster || this.isClusterChild ? "#ffcc66" : "#c4a35a";
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
