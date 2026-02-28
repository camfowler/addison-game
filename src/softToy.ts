import { WIDTH, HEIGHT } from "./game";
import { Balloon, BalloonType } from "./balloon";
import { Candy } from "./candy";

const PUMP_DURATION = 1.5;
const TOY_H = 32;
const MAX_TOYS = 12;

type ToyState = "filling" | "walking_to_candy" | "picking_up" | "walking_to_launch" | "launching" | "watching" | "celebrating" | "surprised" | "returning";
type AnimalType = "bear" | "bunny" | "cat" | "penguin" | "frog" | "elephant";
type MoveStyle = "walk" | "scamper" | "amble";

const ANIMAL_TYPES: AnimalType[] = ["bear", "bunny", "cat", "penguin", "frog", "elephant"];

const MOVE_SPEEDS: Record<MoveStyle, number> = {
  walk: 45,
  scamper: 85,
  amble: 28,
};

interface ToyPalette {
  body: string;
  belly: string;
  accent: string;
  dark: string;
}

const PALETTES: Record<AnimalType, ToyPalette[]> = {
  bear: [
    { body: "#c8926e", belly: "#e8cdb5", accent: "#a07050", dark: "#6e4830" },
    { body: "#f0c8a8", belly: "#fce8d8", accent: "#d4a080", dark: "#8a6040" },
    { body: "#8b7060", belly: "#b8a090", accent: "#6a5040", dark: "#4a3020" },
  ],
  bunny: [
    { body: "#f0d0e0", belly: "#fff0f5", accent: "#e8a0b8", dark: "#b07080" },
    { body: "#d8d0f0", belly: "#f0ecff", accent: "#b0a0d8", dark: "#7060a0" },
    { body: "#e8e8e8", belly: "#ffffff", accent: "#d0c8c0", dark: "#888080" },
  ],
  cat: [
    { body: "#f5a840", belly: "#fde8c0", accent: "#e08020", dark: "#905010" },
    { body: "#505050", belly: "#808080", accent: "#383838", dark: "#202020" },
    { body: "#e0e0e0", belly: "#ffffff", accent: "#c0b8b0", dark: "#808080" },
  ],
  penguin: [
    { body: "#2a2a3a", belly: "#f0f0f0", accent: "#f0a020", dark: "#151520" },
  ],
  frog: [
    { body: "#60b850", belly: "#c8e8a0", accent: "#408030", dark: "#285020" },
    { body: "#50a880", belly: "#a0e0c0", accent: "#308860", dark: "#186040" },
  ],
  elephant: [
    { body: "#9898b0", belly: "#c0c0d0", accent: "#e8a0a0", dark: "#606078" },
    { body: "#a0b0c0", belly: "#c8d0d8", accent: "#d898a0", dark: "#607080" },
  ],
};

export function getStationX(): number { return 60; }
export function getStationY(): number { return HEIGHT - 22; }

export class SoftToy {
  x: number;
  y: number;
  state: ToyState = "filling";

  readonly animalType: AnimalType;
  readonly palette: ToyPalette;
  readonly moveStyle: MoveStyle;
  readonly speed: number;

  private pumpTimer = 0;
  private walkPhase = Math.random() * Math.PI * 2;
  private balloon: Balloon | null = null;
  private launchedBalloon: Balloon | null = null;
  private targetCandy: Candy | null = null;
  private heldCandy: Candy | null = null;
  private balloonScale = 0;
  private squish = 0;
  private stateTimer = 0;
  private facingRight = true;
  private launchX = 0; // where to release the balloon

  constructor() {
    this.x = getStationX();
    this.y = getStationY();
    this.animalType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
    const palettes = PALETTES[this.animalType];
    this.palette = palettes[Math.floor(Math.random() * palettes.length)];

    const styles: MoveStyle[] = ["walk", "scamper", "amble"];
    this.moveStyle = styles[Math.floor(Math.random() * styles.length)];
    this.speed = MOVE_SPEEDS[this.moveStyle] * (0.85 + Math.random() * 0.3);

    this.facingRight = true;
    this.launchX = 200 + Math.random() * (WIDTH - 400);
  }

  static maxToys(): number { return MAX_TOYS; }

  private dt = 0;

  /** Main update — returns a balloon when launched, or null */
  update(dt: number, candies: Candy[]): Balloon | null {
    this.dt = dt;
    const phaseSpeed = this.moveStyle === "scamper" ? 14 : this.moveStyle === "amble" ? 5 : 8;
    this.walkPhase += dt * phaseSpeed;
    this.squish *= 0.9;
    this.stateTimer += dt;

    switch (this.state) {
      case "filling": return this.updateFilling(dt, candies);
      case "walking_to_candy": return this.updateWalkingToCandy(dt);
      case "picking_up": return this.updatePickingUp(dt);
      case "walking_to_launch": return this.updateWalkingToLaunch(dt);
      case "launching": return this.updateLaunching();
      case "watching": return this.updateWatching();
      case "celebrating": return this.updateCelebrating();
      case "surprised": return this.updateSurprised();
      case "returning": return this.updateReturning(candies);
    }
  }

  private updateFilling(dt: number, candies: Candy[]): null {
    this.pumpTimer += dt;
    this.balloonScale = Math.min(1, this.pumpTimer / PUMP_DURATION);
    this.squish = Math.sin(this.pumpTimer * 6) * 0.08;
    this.facingRight = true;

    if (this.pumpTimer >= PUMP_DURATION) {
      // Find nearest available candy
      const candy = this.findRandomCandy(candies);
      if (candy) {
        candy.onGround = false; // reserve it
        this.targetCandy = candy;
        this.state = "walking_to_candy";
        this.stateTimer = 0;

        // Create balloon — pick a random type
        const isWater = Math.random() < 0.1;
        const roll = Math.random();
        const balloonType: BalloonType = roll < 0.25 ? "big" : roll < 0.45 ? "splitter" : "normal";
        const colors = ["#e94560", "#f5a623", "#50e3c2", "#b8e986", "#bd10e0", "#4a90d9"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.balloon = new Balloon(this.x, this.y - TOY_H - 10, isWater, isWater ? undefined : color, balloonType);
        this.balloon.speed = 0;
        this.squish = -0.15;
      }
      // If no candy available, just wait
    }
    return null;
  }

  private updateWalkingToCandy(dt: number): null {
    if (!this.targetCandy) { this.goReturn(); return null; }

    const tx = this.targetCandy.x;
    this.facingRight = tx > this.x;
    const dir = this.facingRight ? 1 : -1;
    this.x += this.speed * dir * dt;

    // Update balloon position
    if (this.balloon) {
      this.balloon.x = this.x;
      this.balloon.y = this.y - TOY_H - 15;
      this.balloon.wobblePhase = this.walkPhase * 0.3;
    }

    // Arrived at candy?
    if (Math.abs(this.x - tx) < 8) {
      this.x = tx;
      this.state = "picking_up";
      this.stateTimer = 0;
      this.squish = -0.12;
    }
    return null;
  }

  private updatePickingUp(dt: number): null {
    // Bend down animation for 0.6s
    this.squish = -0.1 + Math.sin(this.stateTimer * 5) * 0.05;

    if (this.stateTimer >= 0.6 && this.targetCandy) {
      this.heldCandy = this.targetCandy;
      this.heldCandy.carried = true;
      this.targetCandy = null;
      this.state = "walking_to_launch";
      this.stateTimer = 0;
      this.squish = 0.1;
      // Pick a launch point ahead
      this.launchX = this.x + 50 + Math.random() * 100;
      this.launchX = Math.min(this.launchX, WIDTH - 120);
    }
    return null;
  }

  private updateWalkingToLaunch(dt: number): null {
    this.facingRight = this.launchX > this.x;
    const dir = this.facingRight ? 1 : -1;
    this.x += this.speed * dir * dt;

    if (this.balloon) {
      this.balloon.x = this.x;
      this.balloon.y = this.y - TOY_H - 15;
      this.balloon.wobblePhase = this.walkPhase * 0.3;
    }
    if (this.heldCandy) {
      this.heldCandy.x = this.x;
      this.heldCandy.y = this.y - 4;
    }

    if (Math.abs(this.x - this.launchX) < 8) {
      this.state = "launching";
      this.stateTimer = 0;
    }
    return null;
  }

  private updateLaunching(): Balloon | null {
    this.facingRight = true;

    if (this.stateTimer >= 0.5 && this.balloon) {
      const released = this.balloon;
      this.balloon = null;
      released.speed = 40 + Math.random() * 30;

      // Attach candy to balloon
      if (this.heldCandy) {
        this.heldCandy.carried = false;
        this.heldCandy.attached = true;
        released.attachedCandy = this.heldCandy;
        this.heldCandy = null;
      }

      this.launchedBalloon = released;
      this.squish = 0.15;
      this.state = "watching";
      this.stateTimer = 0;
      return released;
    }
    return null;
  }

  private updateWatching(): null {
    // Check if our balloon was popped
    if (this.launchedBalloon && !this.launchedBalloon.alive) {
      if (this.launchedBalloon.escaped) {
        // Candy stolen! Celebrate!
        this.state = "celebrating";
        this.stateTimer = 0;
        this.squish = 0.2;
      } else {
        // Popped! Surprised!
        this.state = "surprised";
        this.stateTimer = 0;
        this.squish = -0.2;
      }
      return null;
    }

    // Timeout watching after 8 seconds
    if (this.stateTimer > 8) {
      this.state = "returning";
      this.stateTimer = 0;
    }
    return null;
  }

  private updateCelebrating(): null {
    // Happy bounce
    this.squish = Math.sin(this.stateTimer * 8) * 0.1;
    if (this.stateTimer > 1.5) {
      this.goReturn();
    }
    return null;
  }

  private updateSurprised(): null {
    if (this.stateTimer < 0.1) {
      this.squish = -0.2;
    }
    if (this.stateTimer > 1.2) {
      this.goReturn();
    }
    return null;
  }

  private updateReturning(candies: Candy[]): null {
    this.facingRight = false;
    this.x -= this.speed * 0.8 * this.dt;

    if (this.x <= getStationX()) {
      this.x = getStationX();
      // Check if there are candies to steal
      const hasCandy = candies.some(c => c.onGround && !c.carried && !c.attached && !c.stolen && !c.falling);
      if (hasCandy) {
        this.state = "filling";
        this.stateTimer = 0;
        this.pumpTimer = 0;
        this.balloonScale = 0;
        this.launchedBalloon = null;
        this.facingRight = true;
      }
      // else just stand at station
    }
    return null;
  }

  private goReturn(): void {
    this.launchedBalloon = null;
    this.state = "returning";
    this.stateTimer = 0;
  }

  private findRandomCandy(candies: Candy[]): Candy | null {
    const available = candies.filter(c => c.onGround && !c.carried && !c.attached && !c.stolen && !c.falling);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Draw held balloon
    if ((this.state === "filling") && this.balloonScale > 0.05) {
      this.renderPumpingBalloon(ctx);
    }
    if ((this.state === "walking_to_candy" || this.state === "picking_up" || this.state === "walking_to_launch") && this.balloon) {
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(this.x - 2, this.y - TOY_H * 0.6);
      ctx.quadraticCurveTo(this.x - 4, this.y - TOY_H - 5, this.balloon.x, this.balloon.y + this.balloon.radius * 1.25 + 5);
      ctx.stroke();
      this.balloon.render(ctx);
    }
    if (this.state === "launching" && this.balloon) {
      const liftAmount = this.stateTimer * 20;
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - TOY_H * 0.8);
      ctx.lineTo(this.balloon.x, this.balloon.y + this.balloon.radius * 1.25 + 5 - liftAmount);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, -liftAmount);
      this.balloon.render(ctx);
      ctx.restore();
    }

    // Draw held candy
    if (this.heldCandy && (this.state === "walking_to_launch" || this.state === "launching")) {
      this.heldCandy.render(ctx);
    }

    const isMoving = this.state === "walking_to_candy" || this.state === "walking_to_launch" || this.state === "returning";
    const walkBob = isMoving ? Math.sin(this.walkPhase) * 1.5 : 0;
    const walkTilt = isMoving ? Math.sin(this.walkPhase) * 0.04 : 0;

    ctx.save();
    ctx.translate(this.x, this.y + walkBob);
    ctx.rotate(walkTilt);

    if (!this.facingRight) {
      ctx.scale(-1, 1);
    }

    const sy = 1 + this.squish;
    const sx = 1 - this.squish * 0.5;
    ctx.scale(sx, sy);

    switch (this.animalType) {
      case "bear": this.drawBear(ctx); break;
      case "bunny": this.drawBunny(ctx); break;
      case "cat": this.drawCat(ctx); break;
      case "penguin": this.drawPenguin(ctx); break;
      case "frog": this.drawFrog(ctx); break;
      case "elephant": this.drawElephant(ctx); break;
    }

    if (this.state === "surprised") this.drawSurprisedFace(ctx);
    if (this.state === "watching") this.drawWatchingEyes(ctx);
    if (this.state === "celebrating") this.drawCelebratingFace(ctx);

    ctx.restore();
  }

  // ─── Animal renderers ──────────────────────────────────────────
  // (identical to previous version — all the draw methods)

  private drawBear(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const legSwing = this.isMoving() ? Math.sin(this.walkPhase) * 4 : 0;
    this.drawLeg(ctx, -6, 0, legSwing, p.body, p.dark);
    this.drawLeg(ctx, 6, 0, -legSwing, p.body, p.dark);
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -8, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -6, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -22, 10, 0, Math.PI * 2); ctx.fill();
    this.drawRoundEar(ctx, -8, -30, 5, p.body, p.accent);
    this.drawRoundEar(ctx, 8, -30, 5, p.body, p.accent);
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -19, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (this.state !== "surprised" && this.state !== "watching" && this.state !== "celebrating") {
      this.drawButtonEyes(ctx, -4, -24, 1.8);
    }
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.ellipse(0, -20, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.dark; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, -18.5, 2, 0.2, Math.PI - 0.2); ctx.stroke();
    this.drawArms(ctx, p.body);
    this.drawStitch(ctx, 0, -6, 6, p.dark);
  }

  private drawBunny(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const legSwing = this.isMoving() ? Math.sin(this.walkPhase) * 4 : 0;
    this.drawLeg(ctx, -5, 0, legSwing, p.body, p.dark);
    this.drawLeg(ctx, 5, 0, -legSwing, p.body, p.dark);
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -8, 10, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -6, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -21, 9, 0, Math.PI * 2); ctx.fill();
    const earTilt = Math.sin(this.walkPhase * 0.5) * 0.1;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 5, -29);
      ctx.rotate(side * 0.15 + earTilt * side);
      ctx.fillStyle = p.body;
      ctx.beginPath(); ctx.ellipse(0, -10, 4, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.ellipse(0, -10, 2.5, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -18, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    if (this.state !== "surprised" && this.state !== "watching" && this.state !== "celebrating") {
      this.drawCuteEyes(ctx, -4, -23, 2.2);
    }
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.moveTo(0, -19.5); ctx.lineTo(-1.5, -18); ctx.lineTo(1.5, -18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(0,0,0,0.15)`; ctx.lineWidth = 0.5;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 3, -18); ctx.lineTo(side * 9, -19); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * 3, -17); ctx.lineTo(side * 9, -17); ctx.stroke();
    }
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.arc(-8, -2, 4, 0, Math.PI * 2); ctx.fill();
    this.drawArms(ctx, p.body);
  }

  private drawCat(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const legSwing = this.isMoving() ? Math.sin(this.walkPhase) * 4 : 0;
    this.drawLeg(ctx, -5, 0, legSwing, p.body, p.dark);
    this.drawLeg(ctx, 5, 0, -legSwing, p.body, p.dark);
    ctx.strokeStyle = p.body; ctx.lineWidth = 3; ctx.lineCap = "round";
    const tailWag = Math.sin(this.walkPhase * 0.7) * 0.3;
    ctx.beginPath(); ctx.moveTo(8, -4);
    ctx.quadraticCurveTo(16 + Math.sin(tailWag) * 5, -10, 14, -20 + Math.sin(tailWag) * 3); ctx.stroke();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -8, 10, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -6, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -21, 9, 0, Math.PI * 2); ctx.fill();
    for (const side of [-1, 1]) {
      ctx.fillStyle = p.body;
      ctx.beginPath(); ctx.moveTo(side * 9, -24); ctx.lineTo(side * 6, -34); ctx.lineTo(side * 2, -26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.moveTo(side * 8, -25); ctx.lineTo(side * 6, -32); ctx.lineTo(side * 3, -26); ctx.closePath(); ctx.fill();
    }
    if (this.state !== "surprised" && this.state !== "watching" && this.state !== "celebrating") {
      this.drawCatEyes(ctx, -4, -23, p.body === "#505050" ? "#44dd44" : "#44bb88");
    }
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.moveTo(0, -19.5); ctx.lineTo(-1.5, -18); ctx.lineTo(1.5, -18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(0,0,0,0.2)`; ctx.lineWidth = 0.6;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 3, -18.5); ctx.lineTo(side * 10, -20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * 3, -17.5); ctx.lineTo(side * 10, -16); ctx.stroke();
    }
    this.drawArms(ctx, p.body);
  }

  private drawPenguin(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const legSwing = this.isMoving() ? Math.sin(this.walkPhase) * 3 : 0;
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(-5 + legSwing, 2, 5, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 - legSwing, 2, 5, 2.5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -10, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -7, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -24, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -22, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (this.state !== "surprised" && this.state !== "watching" && this.state !== "celebrating") {
      this.drawButtonEyes(ctx, -3, -24, 1.5);
    }
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.moveTo(-2, -21); ctx.lineTo(0, -18); ctx.lineTo(2, -21); ctx.closePath(); ctx.fill();
    const flapAngle = this.isMoving() ? Math.sin(this.walkPhase) * 0.2 : 0;
    ctx.fillStyle = p.body;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * 11, -12); ctx.rotate(side * (0.3 - flapAngle));
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = "rgba(255,150,150,0.2)";
    ctx.beginPath(); ctx.arc(-5, -21, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -21, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  private drawFrog(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const legSwing = this.isMoving() ? Math.sin(this.walkPhase) * 4 : 0;
    this.drawLeg(ctx, -6, 0, legSwing, p.body, p.dark);
    this.drawLeg(ctx, 6, 0, -legSwing, p.body, p.dark);
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -8, 12, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -5, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -20, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (this.state !== "surprised" && this.state !== "watching" && this.state !== "celebrating") {
      for (const side of [-1, 1]) {
        ctx.fillStyle = p.belly; ctx.beginPath(); ctx.arc(side * 5, -27, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.body; ctx.beginPath(); ctx.arc(side * 5, -27, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(side * 5, -27, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(side * 5 + 0.5 * side, -28, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = p.dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -18, 6, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.fillStyle = "rgba(255,150,150,0.15)";
    ctx.beginPath(); ctx.arc(-7, -18, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -18, 3, 0, Math.PI * 2); ctx.fill();
    this.drawArms(ctx, p.body);
  }

  private drawElephant(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const legSwing = this.isMoving() ? Math.sin(this.walkPhase) * 3 : 0;
    this.drawThickLeg(ctx, -6, 0, legSwing, p.body, p.dark);
    this.drawThickLeg(ctx, 6, 0, -legSwing, p.body, p.dark);
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.ellipse(0, -9, 12, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, -6, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(0, -23, 10, 0, Math.PI * 2); ctx.fill();
    const earFlap = Math.sin(this.walkPhase * 0.6) * 0.1;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * 10, -22); ctx.rotate(side * (0.3 - earFlap));
      ctx.fillStyle = p.body; ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, side * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.accent; ctx.beginPath(); ctx.ellipse(0, 0, 4, 6, side * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const trunkSwing = Math.sin(this.walkPhase * 0.4) * 2;
    ctx.strokeStyle = p.body; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(0, -15, trunkSwing + 3, -12); ctx.stroke();
    if (this.state !== "surprised" && this.state !== "watching" && this.state !== "celebrating") {
      this.drawCuteEyes(ctx, -4, -25, 1.8);
    }
    ctx.fillStyle = "rgba(255,150,150,0.15)";
    ctx.beginPath(); ctx.arc(-7, -21, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -21, 2.5, 0, Math.PI * 2); ctx.fill();
    this.drawArms(ctx, p.body);
    this.drawStitch(ctx, 0, -6, 5, p.dark);
  }

  // ─── State face overlays ───────────────────────────────────────

  private drawSurprisedFace(ctx: CanvasRenderingContext2D): void {
    const hy = this.getHeadY();
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(side * 4, hy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(side * 4, hy, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(side * 4 + 0.4, hy - 0.4, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.ellipse(0, hy + 4, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    const bounce = Math.sin(this.stateTimer * 10) * 2;
    ctx.fillStyle = "#ff6666"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("!", 0, hy - 14 + bounce);
  }

  private drawWatchingEyes(ctx: CanvasRenderingContext2D): void {
    const hy = this.getHeadY();
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(side * 4, hy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a2e"; ctx.beginPath(); ctx.arc(side * 4, hy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(side * 4 + 0.3, hy - 1.5, 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawCelebratingFace(ctx: CanvasRenderingContext2D): void {
    const hy = this.getHeadY();
    // Happy closed eyes (^ ^)
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 4, hy, 2, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }
    // Big smile
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, hy + 2, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    // Stars/sparkles
    const sp = Math.sin(this.stateTimer * 6);
    ctx.fillStyle = "#ffdd44"; ctx.font = "8px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("*", -6 + sp, hy - 14);
    ctx.fillText("*", 6 - sp, hy - 12);
  }

  private getHeadY(): number {
    switch (this.animalType) {
      case "bear": return -24;
      case "bunny": return -23;
      case "cat": return -23;
      case "penguin": return -24;
      case "frog": return -22;
      case "elephant": return -25;
    }
  }

  // ─── Shared helpers ────────────────────────────────────────────

  private isMoving(): boolean {
    return this.state === "walking_to_candy" || this.state === "walking_to_launch" || this.state === "returning";
  }

  private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, swing: number, color: string, dark: string): void {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x + swing * 0.5, y + 4, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x + swing * 0.5, y + 6, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  private drawThickLeg(ctx: CanvasRenderingContext2D, x: number, y: number, swing: number, color: string, dark: string): void {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x + swing * 0.4, y + 4, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x + swing * 0.4, y + 7, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  private drawRoundEar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, inner: string): void {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  private drawButtonEyes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x * side * -1, y, r + 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(x * side * -1, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x * side * -1 + 0.5, y - 0.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }
  private drawCuteEyes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    for (const side of [-1, 1]) {
      const ex = x * side * -1;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, y, r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a2e"; ctx.beginPath(); ctx.arc(ex, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + 0.6, y - 0.6, r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - 0.3, y + 0.4, r * 0.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  private drawCatEyes(ctx: CanvasRenderingContext2D, x: number, y: number, irisColor: string): void {
    for (const side of [-1, 1]) {
      const ex = x * side * -1;
      ctx.fillStyle = irisColor; ctx.beginPath(); ctx.ellipse(ex, y, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(ex, y, 0.8, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(ex + 0.5, y - 0.5, 0.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  private drawArms(ctx: CanvasRenderingContext2D, color: string): void {
    const armSwing = this.isMoving() ? Math.sin(this.walkPhase + 1) * 0.3 : 0;
    ctx.fillStyle = color; ctx.lineCap = "round";
    if (this.state === "walking_to_candy" || this.state === "walking_to_launch") {
      ctx.beginPath(); ctx.ellipse(-10, -14, 3.5, 5, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(10, -10); ctx.rotate(0.3 + armSwing);
      ctx.beginPath(); ctx.ellipse(0, 3, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (this.state === "filling") {
      const pumpY = Math.sin(this.pumpTimer * 6) * 2;
      ctx.beginPath(); ctx.ellipse(-10, -8 + pumpY, 3.5, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(10, -8 + pumpY, 3.5, 5, 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === "launching") {
      ctx.beginPath(); ctx.ellipse(-6, -18, 3.5, 5, -0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -18, 3.5, 5, 0.8, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === "surprised") {
      ctx.beginPath(); ctx.ellipse(-12, -10, 3.5, 5, -0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12, -10, 3.5, 5, 0.8, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === "celebrating") {
      const wave = Math.sin(this.stateTimer * 8) * 0.3;
      ctx.beginPath(); ctx.ellipse(-8, -20 + Math.sin(wave) * 3, 3.5, 5, -0.8 + wave, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -20 + Math.sin(-wave) * 3, 3.5, 5, 0.8 - wave, 0, Math.PI * 2); ctx.fill();
    } else if (this.state === "watching") {
      ctx.beginPath(); ctx.ellipse(-6, -20, 4, 3, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(10, -10); ctx.rotate(0.2);
      ctx.beginPath(); ctx.ellipse(0, 3, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (this.state === "picking_up") {
      ctx.beginPath(); ctx.ellipse(-6, -2, 3.5, 4, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -2, 3.5, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.save(); ctx.translate(-10, -10); ctx.rotate(-0.3 + armSwing);
      ctx.beginPath(); ctx.ellipse(0, 3, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(10, -10); ctx.rotate(0.3 - armSwing);
      ctx.beginPath(); ctx.ellipse(0, 3, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  private drawStitch(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, color: string): void {
    ctx.strokeStyle = color; ctx.lineWidth = 0.6; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(x, y - len / 2); ctx.lineTo(x, y + len / 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  private renderPumpingBalloon(ctx: CanvasRenderingContext2D): void {
    const bx = this.x;
    const by = this.y - TOY_H - 10;
    const scale = this.balloonScale;
    const r = 22 * scale;
    ctx.save(); ctx.globalAlpha = 0.4 + scale * 0.6;
    ctx.fillStyle = "#e94560"; // pumping balloon — just a preview color
    ctx.beginPath(); ctx.ellipse(bx, by, r, r * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    if (scale > 0.3) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath(); ctx.ellipse(bx - 3 * scale, by - 5 * scale, 3 * scale, 5 * scale, -0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
}

/** Render the pump station */
export function renderPumpStation(ctx: CanvasRenderingContext2D): void {
  const sx = getStationX();
  const sy = getStationY();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(sx, sy + 6, 28, 5, 0, 0, Math.PI * 2); ctx.fill();
  const woodGrad = ctx.createLinearGradient(sx - 25, sy, sx - 25, sy + 10);
  woodGrad.addColorStop(0, "#7a6548"); woodGrad.addColorStop(0.5, "#6a5538"); woodGrad.addColorStop(1, "#5a4528");
  ctx.fillStyle = woodGrad;
  roundRect(ctx, sx - 25, sy + 1, 50, 9, 2); ctx.fill();
  const pumpGrad = ctx.createLinearGradient(sx - 7, sy - 18, sx + 9, sy - 18);
  pumpGrad.addColorStop(0, "#888"); pumpGrad.addColorStop(0.3, "#aaa"); pumpGrad.addColorStop(0.7, "#999"); pumpGrad.addColorStop(1, "#777");
  ctx.fillStyle = pumpGrad;
  roundRect(ctx, sx - 7, sy - 18, 14, 19, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(sx - 4, sy - 16, 3, 15);
  ctx.strokeStyle = "#cc4444"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx, sy - 26); ctx.lineTo(sx + 10, sy - 26); ctx.stroke();
  ctx.fillStyle = "#cc4444"; ctx.beginPath(); ctx.arc(sx + 10, sy - 26, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#666"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(sx + 7, sy - 8); ctx.quadraticCurveTo(sx + 14, sy - 14, sx + 18, sy - 18); ctx.stroke();
  ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(sx + 18, sy - 18, 2, 0, Math.PI * 2); ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
