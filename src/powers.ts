import { Audio } from "./audio";

export interface PowerSlot {
  name: string;
  key: string;
  cooldown: number;
  cooldownRemaining: number;
}

export interface PowerState {
  speedyRemaining: number;
  flameArrowReady: boolean;
  rapidFireTimer: number;
  seekerRemaining: number;
}

export class Powers {
  slots: PowerSlot[];
  state: PowerState = {
    speedyRemaining: 0,
    flameArrowReady: false,
    rapidFireTimer: 0,
    seekerRemaining: 0,
  };

  constructor() {
    this.slots = [
      { name: "Speedy", key: "Digit1", cooldown: 0, cooldownRemaining: 0 },
      { name: "Flame", key: "Digit2", cooldown: 20, cooldownRemaining: 0 },
      { name: "Rapid", key: "Digit3", cooldown: 25, cooldownRemaining: 0 },
      { name: "Seeker", key: "Digit4", cooldown: 0, cooldownRemaining: 0 },
    ];
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (slot.cooldownRemaining > 0) {
        slot.cooldownRemaining = Math.max(0, slot.cooldownRemaining - dt);
      }
    }
    if (this.state.rapidFireTimer > 0) {
      this.state.rapidFireTimer = Math.max(0, this.state.rapidFireTimer - dt);
    }
  }

  tryActivate(keyCode: string, audio: Audio): boolean {
    for (const slot of this.slots) {
      if (slot.key !== keyCode || slot.cooldownRemaining > 0) continue;

      slot.cooldownRemaining = slot.cooldown;
      audio.playPowerUp();

      switch (slot.name) {
        case "Speedy":
          this.state.speedyRemaining = 5;
          break;
        case "Flame":
          this.state.flameArrowReady = true;
          break;
        case "Rapid":
          this.state.rapidFireTimer = 10.0;
          break;
        case "Seeker":
          this.state.seekerRemaining = 10;
          break;
      }
      return true;
    }
    return false;
  }
}
