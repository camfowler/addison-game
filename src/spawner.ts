import { SoftToy } from "./softToy";

export class Spawner {
  private timer = 0;
  private interval = 2.0;
  private initialized = false;
  private initialCount: number;
  private minInterval: number;
  private maxInterval: number;

  constructor(initialCount = 8, minInterval = 3.0, maxInterval = 5.0) {
    this.initialCount = initialCount;
    this.minInterval = minInterval;
    this.maxInterval = maxInterval;
  }

  update(dt: number, toys: SoftToy[]): void {
    // Initial batch
    if (!this.initialized) {
      this.initialized = true;
      const count = Math.min(SoftToy.maxToys(), this.initialCount);
      for (let i = 0; i < count; i++) {
        toys.push(new SoftToy());
      }
      this.timer = this.interval;
      return;
    }

    this.timer -= dt;

    if (this.timer <= 0 && toys.length < SoftToy.maxToys()) {
      toys.push(new SoftToy());
      this.interval = this.minInterval + Math.random() * (this.maxInterval - this.minInterval);
      this.timer = this.interval;
    }
  }
}
