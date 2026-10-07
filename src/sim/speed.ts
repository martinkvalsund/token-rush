import { TUNING } from '../data/tuning';

/** v(t) = vMax - (vMax - v0) * exp(-t / tau) */
export function speedAt(seconds: number): number {
  const { start, max, timeConstant } = TUNING.speed;
  return max - (max - start) * Math.exp(-seconds / timeConstant);
}
