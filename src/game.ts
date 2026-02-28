import { Input } from "./input";
import { Audio } from "./audio";
import { Balloon } from "./balloon";
import { Arrow } from "./arrow";
import { Particle, spawnPopParticles, spawnSplashParticles, FlamePoint, WaterDrop, SmokeTrail } from "./particles";
import { Spawner } from "./spawner";
import { Powers } from "./powers";
import { HUD } from "./hud";

export const WIDTH = 800;
export const HEIGHT = 600;

const BOW_X = WIDTH / 2;
const BOW_Y = HEIGHT - 30;
const CURSOR_SPEED = 400;
const FLAME_DROP_INTERVAL = 8;

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  audio: Audio;

  private lastTime = 0;

  private balloons: Balloon[] = [];
  private arrows: Arrow[] = [];
  private particles: Particle[] = [];
  private flamePoints: FlamePoint[] = [];
  private waterDrops: WaterDrop[] = [];
  private smokeTrails: SmokeTrail[] = [];
  private arrowTrailMap = new Map<Arrow, SmokeTrail>();
  private spawner = new Spawner();
  private powers = new Powers();
  private hud = new HUD();

  private score = 0;
  private missed = 0;
  private rapidReloadTimer = 0;

  private cursorX = WIDTH / 2;
  private cursorY = HEIGHT / 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    this.ctx = canvas.getContext("2d")!;
    this.canvas.style.cursor = "none";
    this.input = new Input(canvas);
    this.audio = new Audio();
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();
    this.input.endFrame();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    const ps = this.powers.state;

    // --- Cursor movement ---
    if (this.input.isKeyDown("ArrowLeft")) this.cursorX -= CURSOR_SPEED * dt;
    if (this.input.isKeyDown("ArrowRight")) this.cursorX += CURSOR_SPEED * dt;
    if (this.input.isKeyDown("ArrowUp")) this.cursorY -= CURSOR_SPEED * dt;
    if (this.input.isKeyDown("ArrowDown")) this.cursorY += CURSOR_SPEED * dt;
    this.cursorX = Math.max(0, Math.min(WIDTH, this.cursorX));
    this.cursorY = Math.max(0, Math.min(HEIGHT, this.cursorY));

    if (this.input.isMouseMoved()) {
      const mp = this.input.getMousePos();
      this.cursorX = mp.x;
      this.cursorY = mp.y;
    }

    // --- Spawner ---
    this.spawner.update(dt, this.balloons);

    // --- Balloons ---
    for (const b of this.balloons) b.update(dt);

    // Handle balloons that died from burning
    for (const b of this.balloons) {
      if (!b.alive && !b.escaped) {
        // Burned to death — treat as a pop
        this.score += 10;
        this.audio.playPop();
        if (b.isWater) {
          this.particles.push(...spawnSplashParticles(b.x, b.y));
          this.audio.playSplash();
          for (let i = 0; i < 5; i++) {
            this.waterDrops.push(new WaterDrop(b.x, b.y));
          }
        } else {
          this.particles.push(...spawnPopParticles(b.x, b.y, b.color));
        }
      }
    }

    this.balloons = this.balloons.filter((b) => {
      if (!b.alive && b.escaped) {
        this.missed++;
        this.audio.playEscape();
        return false;
      }
      return b.alive;
    });

    // --- Arrows ---
    for (const a of this.arrows) {
      const prevX = a.x;
      const prevY = a.y;
      const wasPending = a.seekerPending;
      a.update(dt, this.balloons);

      // Seeker just activated
      if (wasPending && !a.seekerPending && a.isSeeker) {
        this.audio.playSeekerLock();
      }

      if (!a.alive) continue;

      // Add point to this arrow's smoke trail
      let trail = this.arrowTrailMap.get(a);
      if (!trail) {
        trail = new SmokeTrail();
        this.arrowTrailMap.set(a, trail);
        this.smokeTrails.push(trail);
      }
      trail.addPoint(a.rearX, a.rearY);

      // Accumulate distance for flame points
      if (a.isFlaming) {
        const dx = a.x - prevX;
        const dy = a.y - prevY;
        const frameDist = Math.sqrt(dx * dx + dy * dy);
        a.flameAccum += frameDist;
        while (a.flameAccum >= FLAME_DROP_INTERVAL) {
          a.flameAccum -= FLAME_DROP_INTERVAL;
          this.flamePoints.push(new FlamePoint(a.x, a.y));
        }
      }
    }
    // Mark trails as done for dead arrows
    this.arrows = this.arrows.filter((a) => {
      if (!a.alive) {
        const trail = this.arrowTrailMap.get(a);
        if (trail) trail.done = true;
        this.arrowTrailMap.delete(a);
        return false;
      }
      return true;
    });

    // --- Collision: arrow vs balloons (pierce through) ---
    for (const arrow of this.arrows) {
      if (!arrow.alive) continue;
      for (const balloon of this.balloons) {
        if (!balloon.alive) continue;
        if (arrow.hitSet.has(balloon)) continue;
        const dx = arrow.tipX - balloon.x;
        const dy = arrow.tipY - balloon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < balloon.radius + 6) {
          arrow.hitSet.add(balloon);
          this.popBalloon(balloon);
          if (arrow.isSeeker) {
            arrow.deactivateSeeker();
        
            break;
          }
        }
      }
    }
    this.balloons = this.balloons.filter((b) => b.alive);

    // --- Flame points vs balloons (ignite, don't insta-pop) ---
    for (const fp of this.flamePoints) {
      if (!fp.alive) continue;
      for (const balloon of this.balloons) {
        if (!balloon.alive || balloon.burning > 0) continue;
        const dx = fp.x - balloon.x;
        const dy = fp.y - balloon.y;
        if (Math.sqrt(dx * dx + dy * dy) < fp.radius + balloon.radius) {
          balloon.ignite();
          this.audio.playIgnite();
        }
      }
    }

    // --- Flame points update ---
    for (const fp of this.flamePoints) fp.update(dt);
    this.flamePoints = this.flamePoints.filter((fp) => fp.alive);

    // --- Water drops update + extinguish fire ---
    for (const wd of this.waterDrops) {
      wd.update(dt);
      if (!wd.alive) continue;
      for (const fp of this.flamePoints) {
        if (!fp.alive) continue;
        const dx = wd.x - fp.x;
        const dy = wd.y - fp.y;
        if (Math.sqrt(dx * dx + dy * dy) < wd.radius + fp.radius) {
          fp.alive = false;
          wd.alive = false;
          this.audio.playSizzle();
          break;
        }
      }
    }
    this.waterDrops = this.waterDrops.filter((wd) => wd.alive);

    // --- Smoke trails ---
    for (const st of this.smokeTrails) st.update(dt);
    this.smokeTrails = this.smokeTrails.filter((st) => st.alive);

    // --- Particles ---
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.alive);

    // --- Powers ---
    this.powers.update(dt);
    for (const slot of this.powers.slots) {
      if (this.input.isKeyJustPressed(slot.key)) {
        this.powers.tryActivate(slot.key, this.audio);
      }
    }

    // --- Shoot ---
    const isRapid = ps.rapidFireTimer > 0;

    if (this.rapidReloadTimer > 0) {
      this.rapidReloadTimer = Math.max(0, this.rapidReloadTimer - dt);
    }

    const wantsToShoot = isRapid
      ? this.input.isMouseDown() || this.input.isKeyDown("Space")
      : this.input.isMouseJustPressed() || this.input.isKeyJustPressed("Space");

    const canShoot = isRapid ? this.rapidReloadTimer <= 0 : true;

    if (wantsToShoot && canShoot) {
      let tx = this.cursorX;
      let ty = this.cursorY;

      if (isRapid) {
        tx += (Math.random() - 0.5) * 60;
        ty += (Math.random() - 0.5) * 60;
      }

      const isSpeedy = ps.speedyRemaining > 0;
      if (isSpeedy) {
        ps.speedyRemaining--;
      }

      const isFlaming = ps.flameArrowReady;
      if (isFlaming) {
        ps.flameArrowReady = false;
      }

      const isSeeker = ps.seekerRemaining > 0;
      if (isSeeker) {
        ps.seekerRemaining--;
      }

      this.arrows.push(new Arrow(BOW_X, BOW_Y, tx, ty, { speedy: isSpeedy, flaming: isFlaming, seeker: isSeeker }));
      this.audio.playShoot();
      if (isFlaming) {
        this.audio.playFlame();
      }
      if (isRapid) {
        this.rapidReloadTimer = 0.05;
      }
    }
  }

  private popBalloon(balloon: Balloon): void {
    const color = balloon.pop();
    this.score += 10;
    this.audio.playPop();


    if (balloon.isWater) {
      this.particles.push(...spawnSplashParticles(balloon.x, balloon.y));
      this.audio.playSplash();
      for (let i = 0; i < 5; i++) {
        this.waterDrops.push(new WaterDrop(balloon.x, balloon.y));
      }
    } else {
      this.particles.push(...spawnPopParticles(balloon.x, balloon.y, color));
    }
  }

  private render(): void {
    const { ctx } = this;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, "#0f0c29");
    grad.addColorStop(0.5, "#302b63");
    grad.addColorStop(1, "#24243e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Smoke trails (behind everything)
    for (const st of this.smokeTrails) st.render(ctx);

    // Flame points
    for (const fp of this.flamePoints) fp.render(ctx);

    // Balloons
    for (const b of this.balloons) b.render(ctx);

    // Water drops
    for (const wd of this.waterDrops) wd.render(ctx);

    // Arrows
    for (const a of this.arrows) a.render(ctx);

    // Particles
    for (const p of this.particles) p.render(ctx);

    // Bow indicator
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(BOW_X, BOW_Y, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair at cursor
    ctx.strokeStyle = "rgba(233,69,96,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.cursorX, this.cursorY, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.cursorX - 18, this.cursorY);
    ctx.lineTo(this.cursorX + 18, this.cursorY);
    ctx.moveTo(this.cursorX, this.cursorY - 18);
    ctx.lineTo(this.cursorX, this.cursorY + 18);
    ctx.stroke();

    // HUD
    this.hud.render(ctx, this.score, this.missed, this.powers.slots, this.powers.state);
  }
}
