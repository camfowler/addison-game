export class Input {
  private keys = new Set<string>();
  private keysJustPressed = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private mouseButtons = new Set<number>();
  private mouseButtonsJustPressed = new Set<number>();
  private mouseMoved = false;
  private canvas: HTMLCanvasElement;
  isTouch = false; // true once a touch event fires

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener("keydown", (e) => {
      if (!this.keys.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keys.add(e.code);
      e.preventDefault();
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    canvas.addEventListener("mousemove", (e) => {
      this.updateMouseFromEvent(e);
      this.mouseMoved = true;
    });

    canvas.addEventListener("mousedown", (e) => {
      this.mouseButtons.add(e.button);
      this.mouseButtonsJustPressed.add(e.button);
    });

    canvas.addEventListener("mouseup", (e) => {
      this.mouseButtons.delete(e.button);
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Touch support
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.isTouch = true;
      const touch = e.touches[0];
      this.updateMouseFromTouch(touch);
      this.mouseButtons.add(0);
      this.mouseButtonsJustPressed.add(0);
      this.mouseMoved = true;
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.updateMouseFromTouch(touch);
      this.mouseMoved = true;
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.mouseButtons.delete(0);
    }, { passive: false });
  }

  private updateMouseFromEvent(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mousePos.x = (e.clientX - rect.left) * scaleX;
    this.mousePos.y = (e.clientY - rect.top) * scaleY;
  }

  private updateMouseFromTouch(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mousePos.x = (touch.clientX - rect.left) * scaleX;
    this.mousePos.y = (touch.clientY - rect.top) * scaleY;
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isKeyJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  isMouseDown(button = 0): boolean {
    return this.mouseButtons.has(button);
  }

  isMouseJustPressed(button = 0): boolean {
    return this.mouseButtonsJustPressed.has(button);
  }

  isMouseMoved(): boolean {
    return this.mouseMoved;
  }

  getMousePos(): { x: number; y: number } {
    return { ...this.mousePos };
  }

  /** Simulate a key press for one frame (used by touch power buttons) */
  simulateKeyPress(code: string): void {
    this.keysJustPressed.add(code);
  }

  /** Call at the end of each frame to clear one-shot state. */
  endFrame(): void {
    this.keysJustPressed.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseMoved = false;
  }
}
