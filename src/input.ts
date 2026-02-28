export class Input {
  private keys = new Set<string>();
  private keysJustPressed = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private mouseButtons = new Set<number>();
  private mouseButtonsJustPressed = new Set<number>();
  private mouseMoved = false;

  constructor(canvas: HTMLCanvasElement) {
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
      const rect = canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
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

  /** Call at the end of each frame to clear one-shot state. */
  endFrame(): void {
    this.keysJustPressed.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseMoved = false;
  }
}
