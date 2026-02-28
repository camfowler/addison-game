import { WIDTH } from "./game";
import { PowerSlot, PowerState } from "./powers";

export class HUD {
  render(
    ctx: CanvasRenderingContext2D,
    score: number,
    candiesRemaining: number,
    candiesStolen: number,
    powers: PowerSlot[],
    powerState: PowerState,
  ): void {
    // Candy counter — main objective display
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Candy: ${candiesRemaining}/10`, 16, 28);

    // Stolen indicator
    if (candiesStolen > 0) {
      ctx.fillStyle = "#e94560";
      ctx.font = "14px monospace";
      ctx.fillText(`Stolen: ${candiesStolen}`, 16, 48);
    }

    // Score (smaller)
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "13px monospace";
    ctx.fillText(`Score: ${score}`, 16, 68);

    // Active power indicators
    let iy = 88;
    if (powerState.speedyRemaining > 0) {
      ctx.fillStyle = "#aad4ff";
      ctx.font = "14px monospace";
      ctx.fillText(`Speedy: ${powerState.speedyRemaining} arrows`, 16, iy);
      iy += 18;
    }
    if (powerState.flameArrowReady) {
      ctx.fillStyle = "#ff8c00";
      ctx.font = "14px monospace";
      ctx.fillText(`Flame arrow ready!`, 16, iy);
      iy += 18;
    }
    if (powerState.rapidFireTimer > 0) {
      ctx.fillStyle = "#ff5555";
      ctx.font = "14px monospace";
      ctx.fillText(`Rapid: ${powerState.rapidFireTimer.toFixed(1)}s`, 16, iy);
      iy += 18;
    }
    if (powerState.seekerRemaining > 0) {
      ctx.fillStyle = "#88ddff";
      ctx.font = "14px monospace";
      ctx.fillText(`Seeker: ${powerState.seekerRemaining} arrows`, 16, iy);
      iy += 20;
    }
    if (powerState.clusterReady) {
      ctx.fillStyle = "#ffaa44";
      ctx.font = "14px monospace";
      ctx.fillText("Cluster: READY", 16, iy);
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
