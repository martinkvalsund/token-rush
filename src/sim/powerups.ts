import { TUNING } from '../data/tuning';
import type { PowerupType } from './entities';

export type TimedPowerup = Exclude<PowerupType, 'mystery'>;
export const TIMED: readonly TimedPowerup[] = ['magnet', 'jetpack', 'shield', 'double', 'boots'];

const PU = TUNING.powerups;

export const DURATION: Record<TimedPowerup, number> = {
  magnet: PU.magnet,
  jetpack: PU.jetpack,
  shield: PU.shieldMax,
  double: PU.double,
  boots: PU.boots,
};

export type MysteryOutcome = 'powerup' | 'tokens' | 'score';

/** Timers for active power-ups. Pure data + rules; the Sim applies the effects. */
export class Powerups {
  readonly left: Record<TimedPowerup, number> = {
    magnet: 0,
    jetpack: 0,
    shield: 0,
    double: 0,
    boots: 0,
  };
  /** Seconds until a picked-up mystery box resolves (0 = none pending). */
  mysteryTimer = 0;

  reset(): void {
    for (const t of TIMED) this.left[t] = 0;
    this.mysteryTimer = 0;
  }

  active(t: TimedPowerup): boolean {
    return this.left[t] > 0;
  }

  /** Activate or refresh. Jetpack and boots do not stack: the jetpack wins. */
  activate(t: TimedPowerup): void {
    if (t === 'boots' && this.active('jetpack')) return;
    if (t === 'jetpack') this.left.boots = 0;
    this.left[t] = DURATION[t];
  }

  /** Advance timers; returns the power-ups that ran out this step via the callback. */
  tick(dt: number, ended: (t: TimedPowerup) => void): void {
    for (const t of TIMED) {
      if (this.left[t] <= 0) continue;
      this.left[t] = Math.max(0, this.left[t] - dt);
      if (this.left[t] === 0) ended(t);
    }
  }

  /** Fraction of time left (for HUD rings). */
  fraction(t: TimedPowerup): number {
    return this.left[t] / DURATION[t];
  }
}

/** Mystery box roll: 55% power-up, 30% token shower, 15% score. */
export function rollMystery(r: number): MysteryOutcome {
  if (r < 0.55) return 'powerup';
  if (r < 0.85) return 'tokens';
  return 'score';
}
