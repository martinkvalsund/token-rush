import { TUNING } from '../data/tuning';
import type { Quality } from '../core/storage';

export type Level = Exclude<Quality, 'auto'>;
const ORDER: Level[] = ['high', 'medium', 'low'];

/**
 * Tracks frame time and steps quality down when the average stays above budget
 * (bloom → shadows → pixel ratio). Only active in Auto mode.
 */
export class AdaptiveQuality {
  level: Level = 'high';
  private acc = 0;
  private frames = 0;
  private slowFor = 0;
  private cooldown = 0;

  constructor(private readonly apply: (level: Level) => void) {}

  setMode(mode: Quality): void {
    this.level = mode === 'auto' ? 'high' : mode;
    this.slowFor = 0;
    this.apply(this.level);
  }

  /** Feed the real frame time (seconds). */
  sample(frameDt: number, auto: boolean): void {
    if (!auto) return;
    this.acc += frameDt;
    this.frames++;
    this.cooldown = Math.max(0, this.cooldown - frameDt);
    if (this.acc < 0.5) return;
    const avgMs = (this.acc / this.frames) * 1000;
    this.acc = 0;
    this.frames = 0;
    if (avgMs > TUNING.render.adaptiveFrameMs) this.slowFor += 0.5;
    else this.slowFor = 0;
    if (this.slowFor >= TUNING.render.adaptiveSeconds && this.cooldown === 0) {
      const i = ORDER.indexOf(this.level);
      const next = ORDER[i + 1];
      if (next) {
        this.level = next;
        this.apply(next);
        this.cooldown = 4;
      }
      this.slowFor = 0;
    }
  }
}
