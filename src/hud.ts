import { WIDTH } from "./game";
import { PowerSlot, PowerState } from "./powers";

export class HUD {
  render(
    ctx: CanvasRenderingContext2D,
    score: number,
    missed: number,
    powers: PowerSlot[],
    powerState: PowerState,
  ): void {
    // Score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 16, 32);

    // Missed
    ctx.fillStyle = "#e94560";
    ctx.font = "16px monospace";
    ctx.fillText(`Missed: ${missed}`, 16, 56);

    // Active power indicators
    if (powerState.speedyRemaining > 0) {
      ctx.fillStyle = "#aad4ff";
      ctx.font = "14px monospace";
      ctx.fillText(`Speedy: ${powerState.speedyRemaining} arrows`, 16, 78);
    }
    if (powerState.flameArrowReady) {
      ctx.fillStyle = "#ff8c00";
      ctx.font = "14px monospace";
      ctx.fillText(`Flame arrow ready!`, 16, 96);
    }
    if (powerState.rapidFireTimer > 0) {
      ctx.fillStyle = "#ff5555";
      ctx.font = "14px monospace";
      ctx.fillText(`Rapid: ${powerState.rapidFireTimer.toFixed(1)}s`, 16, 114);
    }
    if (powerState.seekerRemaining > 0) {
      ctx.fillStyle = "#88ddff";
      ctx.font = "14px monospace";
      ctx.fillText(`Seeker: ${powerState.seekerRemaining} arrows`, 16, 132);
    }

    // Power slots — top-right column
    const slotSize = 44;
    const padding = 8;
    const startX = WIDTH - slotSize - 16;
    const startY = 16;

    for (let i = 0; i < powers.length; i++) {
      const slot = powers[i];
      const sx = startX;
      const sy = startY + i * (slotSize + padding);

      ctx.fillStyle = slot.cooldownRemaining > 0 ? "#333" : "#555";
      ctx.fillRect(sx, sy, slotSize, slotSize);

      if (slot.cooldownRemaining > 0) {
        const frac = slot.cooldownRemaining / slot.cooldown;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(sx, sy, slotSize, slotSize * frac);
      }

      ctx.strokeStyle = slot.cooldownRemaining > 0 ? "#666" : "#aaa";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, slotSize, slotSize);

      ctx.fillStyle = slot.cooldownRemaining > 0 ? "#777" : "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, sx + slotSize / 2, sy + 16);

      ctx.font = "10px monospace";
      ctx.fillText(slot.name, sx + slotSize / 2, sy + 32);
    }

    ctx.textAlign = "left";
  }
}
