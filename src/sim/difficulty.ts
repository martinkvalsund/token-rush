import { TUNING } from '../data/tuning';
import { speedAt } from './speed';

const { start, max, timeConstant: tau } = TUNING.speed;
const { tierLength, maxTier, zoneLength } = TUNING.world;

/** Distance travelled after t seconds on the speed curve (no stumbles). */
export function distanceAtTime(t: number): number {
  return max * t - (max - start) * tau * (1 - Math.exp(-t / tau));
}

/** Inverse of distanceAtTime by bisection. */
export function timeAtDistance(d: number): number {
  let lo = 0;
  let hi = 1;
  while (distanceAtTime(hi) < d) hi *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (distanceAtTime(mid) < d) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function tierAt(distance: number): number {
  return Math.min(maxTier, Math.floor(distance / tierLength));
}

/** Slowest and fastest speed a tier can be played at (slowest includes a stumble slowdown). */
export function tierSpeedRange(tier: number): { min: number; max: number } {
  const minSpeed = speedAt(timeAtDistance(tier * tierLength)) * (1 - TUNING.lives.stumbleSlowdown);
  const maxSpeed = tier >= maxTier ? max : speedAt(timeAtDistance((tier + 1) * tierLength));
  return { min: minSpeed, max: maxSpeed };
}

export const ZONE_COUNT = 5;

export function zoneAt(distance: number): number {
  return Math.floor(distance / zoneLength) % ZONE_COUNT;
}
