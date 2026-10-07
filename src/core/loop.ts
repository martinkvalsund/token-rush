import { TUNING } from '../data/tuning';

/** Fixed-timestep loop: sim runs at 60 Hz, render gets an interpolation alpha. */
export class FixedLoop {
  private acc = 0;
  private last = 0;
  private running = false;
  paused = false;
  timeScale = 1;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number, frameDt: number) => void,
  ) {}

  start(): void {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  /** Drop accumulated time (e.g. after a tab switch) so there is no catch-up burst. */
  resetClock(): void {
    this.acc = 0;
    this.last = performance.now();
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const { fixedStep, maxStepsPerFrame } = TUNING.loop;
    const frameDt = Math.min((now - this.last) / 1000, fixedStep * maxStepsPerFrame);
    this.last = now;
    if (!this.paused) {
      this.acc += frameDt * this.timeScale;
      let steps = 0;
      while (this.acc >= fixedStep && steps < maxStepsPerFrame) {
        this.update(fixedStep);
        this.acc -= fixedStep;
        steps++;
      }
      if (steps === maxStepsPerFrame) this.acc = 0;
    }
    this.render(this.acc / fixedStep, frameDt);
    requestAnimationFrame(this.frame);
  };
}
