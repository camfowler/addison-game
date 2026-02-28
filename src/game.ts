import { Input } from "./input";
import { Audio } from "./audio";
import { Balloon } from "./balloon";
import { Arrow } from "./arrow";
import { Particle, spawnPopParticles, spawnSplashParticles, FlamePoint, WaterDrop, SmokeTrail } from "./particles";
import { Spawner } from "./spawner";
import { SoftToy, renderPumpStation } from "./softToy";
import { Candy, spawnCandies } from "./candy";
import { renderBackdrop } from "./backdrop";
import { Powers } from "./powers";
import { HUD } from "./hud";
import { Bomb, LavaDrop } from "./bomb";

export const WIDTH = 800;
export const HEIGHT = 600;

const TURRET_X = WIDTH - 100;
const TURRET_Y = HEIGHT * 0.8;
const CURSOR_SPEED = 400;
const FLAME_DROP_INTERVAL = 8;

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

type GamePhase = "start" | "playing" | "paused" | "gameover" | "won";
const GAME_DURATION = 60; // 60 seconds

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  audio: Audio;

  private lastTime = 0;
  private phase: GamePhase = "start";

  private balloons: Balloon[] = [];
  private arrows: Arrow[] = [];
  private particles: Particle[] = [];
  private flamePoints: FlamePoint[] = [];
  private waterDrops: WaterDrop[] = [];
  private smokeTrails: SmokeTrail[] = [];
  private arrowTrailMap = new Map<Arrow, SmokeTrail>();
  private softToys: SoftToy[] = [];
  private candies: Candy[] = [];
  private spawner = new Spawner();
  private powers = new Powers();
  private hud = new HUD();
  private bombs: Bomb[] = [];
  private lavaDrops: LavaDrop[] = [];
  private bombTimer = 5; // first bomb after 5s

  private score = 0;
  private missed = 0;
  private rapidReloadTimer = 0;

  private cursorX = WIDTH / 2;
  private cursorY = HEIGHT / 2;
  private gameTimer = GAME_DURATION;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    this.ctx = canvas.getContext("2d")!;
    this.input = new Input(canvas);
    this.audio = new Audio();
    this.candies = spawnCandies();

    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    this.canvas.addEventListener("touchend", (e) => {
      // Synthesize a click from touch for overlay buttons and power slots
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const { mx, my } = this.scaleClickPos(touch);
        this.handleClickAt(mx, my);
      }
    });
  }

  private resetGame(): void {
    this.balloons = [];
    this.arrows = [];
    this.particles = [];
    this.flamePoints = [];
    this.waterDrops = [];
    this.smokeTrails = [];
    this.arrowTrailMap.clear();
    this.softToys = [];
    this.candies = spawnCandies();
    this.spawner = new Spawner();
    this.powers = new Powers();
    this.score = 0;
    this.missed = 0;
    this.rapidReloadTimer = 0;
    this.turretAngle = -Math.PI / 2;
    this.gameTimer = GAME_DURATION;
    this.bombs = [];
    this.lavaDrops = [];
    this.bombTimer = 5;
  }

  private scaleClickPos(e: MouseEvent | Touch): { mx: number; my: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    return {
      mx: (("clientX" in e ? e.clientX : 0) - rect.left) * scaleX,
      my: (("clientY" in e ? e.clientY : 0) - rect.top) * scaleY,
    };
  }

  private handleClick(e: MouseEvent): void {
    const { mx, my } = this.scaleClickPos(e);
    this.handleClickAt(mx, my);
  }

  private handleClickAt(mx: number, my: number): void {
    if (this.phase === "start") {
      if (this.isInsideButton(mx, my, WIDTH / 2, 370, 180, 50)) {
        this.phase = "playing";
        if (!this.input.isTouch) this.canvas.style.cursor = "none";
      }
    } else if (this.phase === "paused") {
      if (this.isInsideButton(mx, my, WIDTH / 2, 320, 180, 50)) {
        this.phase = "playing";
        if (!this.input.isTouch) this.canvas.style.cursor = "none";
      }
      if (this.isInsideButton(mx, my, WIDTH / 2, 390, 180, 50)) {
        this.resetGame();
        this.phase = "playing";
        if (!this.input.isTouch) this.canvas.style.cursor = "none";
      }
    } else if (this.phase === "gameover" || this.phase === "won") {
      if (this.isInsideButton(mx, my, WIDTH / 2, 370, 200, 50)) {
        this.resetGame();
        this.phase = "playing";
        if (!this.input.isTouch) this.canvas.style.cursor = "none";
      }
    } else if (this.phase === "playing") {
      // Pause button
      const px = WIDTH / 2 + 50, py = 12, pw = 28, ph = 24;
      if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) {
        this.phase = "paused";
        this.canvas.style.cursor = "default";
        return;
      }
      this.checkPowerSlotTap(mx, my);
    }
  }

  private checkPowerSlotTap(mx: number, my: number): void {
    const slotSize = 44;
    const padding = 8;
    const startX = WIDTH - slotSize - 16;
    const startY = 16;

    for (let i = 0; i < this.powers.slots.length; i++) {
      const sx = startX;
      const sy = startY + i * (slotSize + padding);
      if (mx >= sx && mx <= sx + slotSize && my >= sy && my <= sy + slotSize) {
        const slot = this.powers.slots[i];
        if (slot.cooldownRemaining <= 0) {
          this.powers.tryActivate(slot.key, this.audio);
        }
        return; // consumed the tap, don't shoot
      }
    }
  }

  private isInsideButton(mx: number, my: number, cx: number, cy: number, w: number, h: number): boolean {
    return mx >= cx - w / 2 && mx <= cx + w / 2 && my >= cy - h / 2 && my <= cy + h / 2;
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    // Escape toggles pause
    if (this.phase === "playing" && this.input.isKeyJustPressed("Escape")) {
      this.phase = "paused";
      this.canvas.style.cursor = "default";
    } else if (this.phase === "paused" && this.input.isKeyJustPressed("Escape")) {
      this.phase = "playing";
      this.canvas.style.cursor = "none";
    }

    if (this.phase === "playing") {
      this.update(dt);

      // Count down timer
      this.gameTimer -= dt;
      if (this.gameTimer <= 0) {
        this.gameTimer = 0;
        this.phase = "won";
        this.canvas.style.cursor = "default";
      }

      // Check game over — all candy stolen
      const candiesRemaining = this.candies.filter(c => !c.stolen).length;
      if (candiesRemaining === 0) {
        this.phase = "gameover";
        this.canvas.style.cursor = "default";
      }
    }

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

    // --- Spawner (creates soft toys) ---
    this.spawner.update(dt, this.softToys);

    // --- Soft Toys ---
    for (const toy of this.softToys) {
      const released = toy.update(dt, this.candies);
      if (released) {
        this.balloons.push(released);
      }
    }

    // --- Balloons ---
    for (const b of this.balloons) b.update(dt);

    // Handle balloons that died from burning
    for (const b of this.balloons) {
      if (!b.alive && !b.escaped) {
        // Burned to death — treat as a pop
        this.score += 10;
        this.audio.playPop();
        if (b.attachedCandy) {
          const candy = b.attachedCandy;
          b.attachedCandy = null;
          const otherHolder = this.balloons.find(o => o !== b && o.alive && o.attachedCandy === candy);
          if (!otherHolder) {
            candy.dropFrom(b.x, b.y);
          }
        }
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
        if (b.attachedCandy) {
          const candy = b.attachedCandy;
          b.attachedCandy = null;
          // Only mark stolen if no other balloon still holds this candy
          const otherHolder = this.balloons.find(o => o !== b && o.alive && o.attachedCandy === candy);
          if (!otherHolder) {
            candy.stolen = true;
            candy.attached = false;
          }
        }
        return false;
      }
      return b.alive;
    });

    // --- Candies ---
    for (const c of this.candies) c.update(dt);

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
    // Spawn cluster children from exploded cluster arrows
    const clusterChildren: Arrow[] = [];
    for (const a of this.arrows) {
      if (a.isCluster && a.clusterExploded) {
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
          const speed = 200 + Math.random() * 100;
          const child = new Arrow(a.x, a.y, a.x + Math.cos(angle) * 100, a.y + Math.sin(angle) * 100, {
            clusterChild: true,
            speedy: a.isSpeedy,
            flaming: a.isFlaming,
            seeker: a.isSeeker || a.seekerPending,
          });
          child.vx = Math.cos(angle) * speed;
          child.vy = Math.sin(angle) * speed;
          clusterChildren.push(child);
        }
        this.audio.playPop(); // explosion sound
      }
    }
    this.arrows.push(...clusterChildren);

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
        if (balloon.immuneTimer > 0) continue;
        const dx = arrow.tipX - balloon.x;
        const dy = arrow.tipY - balloon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < balloon.radius + 6) {
          arrow.hitSet.add(balloon);

          // Frozen balloon: start falling instead of popping
          if (balloon.frozen && !balloon.falling) {
            balloon.falling = true;
            balloon.fallVy = 0;
            this.audio.playPop();
            arrow.alive = false;
            break;
          }

          // Splitter: mark children immune to this arrow
          const wasSplitter = balloon.balloonType === "splitter" && balloon.hp === 1;

          this.hitBalloon(balloon, arrow);

          // Big balloon ricochet: if it survived the hit, bounce the arrow off
          if (balloon.alive && balloon.balloonType === "big") {
            const nx = dx / dist;
            const ny = dy / dist;
            const dot = arrow.vx * nx + arrow.vy * ny;
            arrow.vx -= 2 * dot * nx;
            arrow.vy -= 2 * dot * ny;
            arrow.vx *= 0.7;
            arrow.vy *= 0.7;
            // Push arrow out of balloon
            arrow.x = balloon.x + nx * (balloon.radius + 10);
            arrow.y = balloon.y + ny * (balloon.radius + 10);
            break;
          }

          // Splitter children get 2s immunity
          if (wasSplitter) {
            for (const b of this.balloons) {
              if (b.immuneTimer > 0) continue;
              // Newly spawned children near the explosion
              if (b.alive && Math.abs(b.x - balloon.x) < 40 && Math.abs(b.y - balloon.y) < 40 && b !== balloon) {
                b.immuneTimer = 2;
                arrow.hitSet.add(b);
              }
            }
          }

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

    // --- Bombs ---
    this.bombTimer -= dt;
    if (this.bombTimer <= 0) {
      this.bombs.push(new Bomb());
      this.bombTimer = 8 + Math.random() * 4; // 8-12s interval
    }
    for (const bomb of this.bombs) bomb.update(dt);
    // Handle exploded bombs
    for (const bomb of this.bombs) {
      if (bomb.exploded) {
        this.lavaDrops.push(...bomb.spawnLava());
        this.audio.playPop();
      }
    }
    this.bombs = this.bombs.filter(b => b.alive);

    // Arrow vs bomb collision
    for (const arrow of this.arrows) {
      if (!arrow.alive) continue;
      for (const bomb of this.bombs) {
        if (!bomb.alive) continue;
        const dx = arrow.tipX - bomb.x;
        const dy = arrow.tipY - bomb.y;
        if (Math.sqrt(dx * dx + dy * dy) < bomb.radius + 6) {
          bomb.explode();
          arrow.alive = false;
          break;
        }
      }
    }

    // Lava drops update + pop balloons
    for (const lava of this.lavaDrops) {
      lava.update(dt);
      if (!lava.alive) continue;
      for (const balloon of this.balloons) {
        if (!balloon.alive) continue;
        const dx = lava.x - balloon.x;
        const dy = lava.y - balloon.y;
        if (Math.sqrt(dx * dx + dy * dy) < lava.radius + balloon.radius) {
          this.hitBalloon(balloon);
          lava.alive = false;
          break;
        }
      }
    }
    this.lavaDrops = this.lavaDrops.filter(l => l.alive);

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

    // Freeze: instantly freeze all airborne balloons
    if (ps.freezeActive) {
      ps.freezeActive = false;
      for (const b of this.balloons) {
        if (b.alive && !b.falling) {
          b.frozen = true;
        }
      }
    }

    // Falling frozen balloons collide with other balloons
    for (const fb of this.balloons) {
      if (!fb.alive || !fb.falling) continue;
      for (const b of this.balloons) {
        if (b === fb || !b.alive || b.falling) continue;
        const dx = fb.x - b.x;
        const dy = fb.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < fb.radius + b.radius) {
          this.hitBalloon(b);
        }
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

      const isCluster = ps.clusterReady;
      if (isCluster) {
        ps.clusterReady = false;
      }

      this.arrows.push(new Arrow(TURRET_X, TURRET_Y, tx, ty, { speedy: isSpeedy, flaming: isFlaming, seeker: isSeeker, cluster: isCluster }));
      this.audio.playShoot();
      if (isFlaming) {
        this.audio.playFlame();
      }
      if (isRapid) {
        this.rapidReloadTimer = 0.05;
      }
    }
  }

  private hitBalloon(balloon: Balloon, arrow?: Arrow): void {
    const color = balloon.hit();
    if (!color) {
      // Damaged but not popped — bounce effect
      this.audio.playPop();
      this.particles.push(...spawnPopParticles(balloon.x, balloon.y, balloon.color).slice(0, 4));
      return;
    }

    this.score += 10;
    this.audio.playPop();

    // Splitter: spawn two child balloons sharing the candy
    if (balloon.balloonType === "splitter" && balloon.attachedCandy) {
      const candy = balloon.attachedCandy;
      balloon.attachedCandy = null;
      const offset = 25;
      const childA = new Balloon(balloon.x - offset, balloon.y, false, balloon.color);
      const childB = new Balloon(balloon.x + offset, balloon.y, false, balloon.color);
      childA.attachedCandy = candy;
      childB.attachedCandy = candy;
      childA.speed = balloon.speed * (0.9 + Math.random() * 0.3);
      childB.speed = balloon.speed * (0.9 + Math.random() * 0.3);
      this.balloons.push(childA, childB);
      this.particles.push(...spawnPopParticles(balloon.x, balloon.y, color));
      return;
    }

    // Drop candy — but only if no other alive balloon also holds this candy (splitter children)
    if (balloon.attachedCandy) {
      const candy = balloon.attachedCandy;
      balloon.attachedCandy = null;
      const otherHolder = this.balloons.find(b => b.alive && b.attachedCandy === candy);
      if (!otherHolder) {
        candy.dropFrom(balloon.x, balloon.y);
      }
    }

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

  private turretAngle = -Math.PI / 2; // current turret aim angle

  private renderTurret(ctx: CanvasRenderingContext2D): void {
    const tx = TURRET_X;
    const ty = TURRET_Y;

    // Calculate aim angle toward cursor
    const aimAngle = Math.atan2(this.cursorY - ty, this.cursorX - tx);
    // Smooth turret rotation with proper angle wrapping
    let diff = aimAngle - this.turretAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.turretAngle += diff * 0.15;

    // --- Platform ---
    ctx.fillStyle = "#5a4a3a";
    roundRect(ctx, tx - 18, ty + 8, 36, 8, 3);
    ctx.fill();
    // Platform legs
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(tx - 14, ty + 14, 5, 10);
    ctx.fillRect(tx + 9, ty + 14, 5, 10);

    // --- Turret barrel ---
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(this.turretAngle);
    // Barrel
    const barrelGrad = ctx.createLinearGradient(0, -4, 0, 4);
    barrelGrad.addColorStop(0, "#888");
    barrelGrad.addColorStop(0.5, "#aaa");
    barrelGrad.addColorStop(1, "#777");
    ctx.fillStyle = barrelGrad;
    roundRect(ctx, 0, -3.5, 28, 7, 2);
    ctx.fill();
    // Barrel tip
    ctx.fillStyle = "#666";
    ctx.fillRect(24, -4.5, 6, 9);
    ctx.restore();

    // --- Turret base (dome) ---
    const domeGrad = ctx.createRadialGradient(tx - 2, ty - 3, 2, tx, ty, 14);
    domeGrad.addColorStop(0, "#999");
    domeGrad.addColorStop(0.6, "#777");
    domeGrad.addColorStop(1, "#555");
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(tx - 3, ty - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // --- Operator toy (sitting behind turret) ---
    const opX = tx + 2;
    const opY = ty - 2;

    // Body — round, military green
    ctx.fillStyle = "#6b8e5a";
    ctx.beginPath();
    ctx.ellipse(opX, opY, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly
    ctx.fillStyle = "#8ab878";
    ctx.beginPath();
    ctx.ellipse(opX, opY + 2, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#6b8e5a";
    ctx.beginPath();
    ctx.arc(opX, opY - 12, 8, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#556b44";
    ctx.beginPath();
    ctx.ellipse(opX, opY - 15, 9, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(opX, opY - 14, 9, Math.PI + 0.3, -0.3);
    ctx.fill();

    // Eyes — determined look
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(opX - 3, opY - 13, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(opX + 3, opY - 13, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(opX - 2.5, opY - 13, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(opX + 3.5, opY - 13, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(opX - 2, opY - 13.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(opX + 4, opY - 13.5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#5a7a4a";
    ctx.beginPath();
    ctx.arc(opX, opY - 11, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Determined mouth
    ctx.strokeStyle = "#4a6a3a";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(opX - 2.5, opY - 9);
    ctx.lineTo(opX + 2.5, opY - 9);
    ctx.stroke();

    // Round ears
    ctx.fillStyle = "#6b8e5a";
    ctx.beginPath();
    ctx.arc(opX - 7, opY - 15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(opX + 7, opY - 15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8ab878";
    ctx.beginPath();
    ctx.arc(opX - 7, opY - 15, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(opX + 7, opY - 15, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Arms reaching toward turret
    ctx.fillStyle = "#6b8e5a";
    ctx.beginPath();
    ctx.ellipse(opX - 8, opY - 2, 3, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(opX - 12, opY - 4, 3, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private render(): void {
    const { ctx } = this;

    // Backdrop (cached)
    renderBackdrop(ctx);

    // Pump station (background)
    renderPumpStation(ctx);

    // Soft toys
    for (const toy of this.softToys) toy.render(ctx);

    // Smoke trails (behind everything)
    for (const st of this.smokeTrails) st.render(ctx);

    // Flame points
    for (const fp of this.flamePoints) fp.render(ctx);

    // Candies on ground
    for (const c of this.candies) {
      if (c.onGround || c.falling) c.render(ctx);
    }

    // Balloons (and their attached candy)
    for (const b of this.balloons) {
      b.render(ctx);
      if (b.attachedCandy) {
        const stringLen = b.radius * 1.25 + 40;
        b.attachedCandy.renderOnString(ctx, b.x + Math.sin(b.wobblePhase) * 6, b.y, stringLen);
      }
    }

    // Water drops
    for (const wd of this.waterDrops) wd.render(ctx);

    // Arrows
    for (const a of this.arrows) a.render(ctx);

    // Particles
    for (const p of this.particles) p.render(ctx);

    // Bombs + lava
    for (const bomb of this.bombs) bomb.render(ctx);
    for (const lava of this.lavaDrops) lava.render(ctx);

    // Turret + operator toy
    this.renderTurret(ctx);

    // Crosshair at cursor (only when playing, hidden on touch)
    if (this.phase === "playing" && !this.input.isTouch) {
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
    }

    // HUD (only during play and gameover)
    if (this.phase === "playing" || this.phase === "paused" || this.phase === "gameover" || this.phase === "won") {
      const candiesRemaining = this.candies.filter(c => !c.stolen).length;
      const candiesStolen = this.candies.filter(c => c.stolen).length;
      this.hud.render(ctx, this.score, candiesRemaining, candiesStolen, this.powers.slots, this.powers.state);

      // Timer display — top center
      const mins = Math.floor(this.gameTimer / 60);
      const secs = Math.floor(this.gameTimer % 60);
      const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
      ctx.textAlign = "center";
      ctx.font = "bold 24px monospace";
      // Pulse red when under 30s
      if (this.gameTimer < 30) {
        const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
        ctx.fillStyle = `rgba(233,69,96,${pulse})`;
      } else {
        ctx.fillStyle = "#fff";
      }
      ctx.fillText(timeStr, WIDTH / 2, 30);
      ctx.textAlign = "left";

      // Pause button (top-center-right)
      if (this.phase === "playing") {
        const px = WIDTH / 2 + 50, py = 12, pw = 28, ph = 24;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(px + 8, py + 5, 4, 14);
        ctx.fillRect(px + 16, py + 5, 4, 14);
      }
    }

    // Phase overlays
    if (this.phase === "start") {
      this.renderStartScreen(ctx);
    } else if (this.phase === "paused") {
      this.renderPauseScreen(ctx);
    } else if (this.phase === "gameover") {
      this.renderGameOverScreen(ctx);
    } else if (this.phase === "won") {
      this.renderWinScreen(ctx);
    }
  }

  private renderStartScreen(ctx: CanvasRenderingContext2D): void {
    // Dim backdrop
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";

    // Title
    ctx.fillStyle = "#f5a623";
    ctx.font = "bold 42px monospace";
    ctx.fillText("Candy Defense!", WIDTH / 2, 180);

    // Subtitle
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "16px monospace";
    ctx.fillText("Defend your candy for 60 seconds!", WIDTH / 2, 230);
    if (this.input.isTouch) {
      ctx.fillText("Tap to shoot. Tap power slots to activate.", WIDTH / 2, 260);
    } else {
      ctx.fillText("Click or press Space to shoot. Arrow keys to aim.", WIDTH / 2, 260);
      ctx.fillText("Press Escape to pause. Keys 1-6 for powers.", WIDTH / 2, 285);
    }
    ctx.fillText("If the toys steal all 10 candies, you lose!", WIDTH / 2, 310);

    // Play button
    this.renderButton(ctx, WIDTH / 2, 370, 180, 50, "Play", "#50e3c2");

    ctx.textAlign = "left";
  }

  private renderPauseScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px monospace";
    ctx.fillText("Paused", WIDTH / 2, 250);

    // Resume button
    this.renderButton(ctx, WIDTH / 2, 320, 180, 50, "Resume", "#50e3c2");
    // Restart button
    this.renderButton(ctx, WIDTH / 2, 390, 180, 50, "Restart", "#e94560");

    ctx.textAlign = "left";
  }

  private renderGameOverScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";

    ctx.fillStyle = "#e94560";
    ctx.font = "bold 36px monospace";
    ctx.fillText("The toys stole all the candy!", WIDTH / 2, 220);

    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.fillText(`Final Score: ${this.score}`, WIDTH / 2, 280);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px monospace";
    ctx.fillText(`Balloons popped: ${Math.floor(this.score / 10)}`, WIDTH / 2, 320);

    // Play Again button
    this.renderButton(ctx, WIDTH / 2, 370, 200, 50, "Play Again", "#50e3c2");

    ctx.textAlign = "left";
  }

  private renderWinScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";

    ctx.fillStyle = "#50e3c2";
    ctx.font = "bold 40px monospace";
    ctx.fillText("You saved the candy!", WIDTH / 2, 200);

    const candiesLeft = this.candies.filter(c => !c.stolen).length;

    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.fillText(`Candy saved: ${candiesLeft}/10`, WIDTH / 2, 260);
    ctx.fillText(`Score: ${this.score}`, WIDTH / 2, 295);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px monospace";
    ctx.fillText(`Balloons popped: ${Math.floor(this.score / 10)}`, WIDTH / 2, 330);

    // Play Again button
    this.renderButton(ctx, WIDTH / 2, 370, 200, 50, "Play Again", "#50e3c2");

    ctx.textAlign = "left";
  }

  private renderButton(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, label: string, color: string): void {
    const x = cx - w / 2;
    const y = cy - h / 2;

    // Button bg
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, x, y, w, h / 2, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, cx, cy + 7);
  }
}
