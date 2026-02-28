import { Balloon } from "./balloon";
import { WIDTH, HEIGHT } from "./game";

export class Spawner {
  private timer = 0;
  private interval = 2.0;
  private elapsed = 0;

  update(dt: number, balloons: Balloon[]): void {
    this.elapsed += dt;
    this.timer -= dt;

    if (this.timer <= 0) {
      this.spawn(balloons);
      const ramp = Math.max(0.6, 1.0 - this.elapsed * 0.005);
      this.interval = (1.5 + Math.random()) * ramp;
      this.timer = this.interval;
    }
  }

  private spawn(balloons: Balloon[]): void {
    const margin = 40;
    const y = HEIGHT + 30;

    // 20% chance of triple (3 nearby individual balloons)
    if (Math.random() < 0.2) {
      const cx = margin + Math.random() * (WIDTH - margin * 2);
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * 30;
        const oy = (Math.random() - 0.5) * 20;
        const isWater = Math.random() < 0.15;
        balloons.push(new Balloon(cx + ox, y + oy, isWater));
      }
    } else {
      const x = margin + Math.random() * (WIDTH - margin * 2);
      const isWater = Math.random() < 0.15;
      balloons.push(new Balloon(x, y, isWater));
    }
  }
}
