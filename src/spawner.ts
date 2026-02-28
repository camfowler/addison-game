import { SoftToy } from "./softToy";

export class Spawner {
  private timer = 0;
  private interval = 2.0;
  private initialized = false;

  update(dt: number, toys: SoftToy[]): void {
    // Initial batch
    if (!this.initialized) {
      this.initialized = true;
      const count = Math.min(SoftToy.maxToys(), 8);
      for (let i = 0; i < count; i++) {
        toys.push(new SoftToy());
      }
      this.timer = this.interval;
      return;
    }

    this.timer -= dt;

    if (this.timer <= 0 && toys.length < SoftToy.maxToys()) {
      toys.push(new SoftToy());
      this.interval = 3.0 + Math.random() * 2;
      this.timer = this.interval;
    }
  }
}
