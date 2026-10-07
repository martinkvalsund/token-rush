import type * as THREE from 'three';

export class DebugOverlay {
  private readonly el: HTMLPreElement;
  private frames = 0;
  private acc = 0;
  private fps = 0;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    enabled: boolean,
  ) {
    this.el = document.createElement('pre');
    this.el.style.cssText =
      'position:fixed;top:8px;left:8px;margin:0;padding:6px 8px;background:#000a;color:#9f9;font:12px monospace;pointer-events:none;z-index:10';
    this.el.hidden = !enabled;
    document.body.appendChild(this.el);
  }

  update(frameDt: number, extra: Record<string, string | number>): void {
    if (this.el.hidden) return;
    this.frames++;
    this.acc += frameDt;
    if (this.acc >= 0.5) {
      this.fps = this.frames / this.acc;
      this.frames = 0;
      this.acc = 0;
    }
    const info = this.renderer.info;
    const lines = [
      `fps ${this.fps.toFixed(0)}  ${(frameDt * 1000).toFixed(1)} ms`,
      `calls ${info.render.calls}  tris ${info.render.triangles}`,
      ...Object.entries(extra).map(([k, v]) => `${k} ${typeof v === 'number' ? v.toFixed(1) : v}`),
    ];
    this.el.textContent = lines.join('\n');
  }
}
