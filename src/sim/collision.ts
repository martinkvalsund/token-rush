import { TUNING } from '../data/tuning';
import type { Obstacle } from './entities';
import { playerHeight, type PlayerState } from './player';

export type HitKind = 'none' | 'front' | 'side';

const P = TUNING.player;
const HALF_W = P.width / 2 - P.hitboxShrink;
const HALF_D = P.depth / 2 - P.hitboxShrink;

/** Height of the walkable top of an obstacle at the player's z (ramps slope). */
export function topAt(o: Obstacle): number {
  if (o.cls === 'ramp') {
    const u = (o.z + o.d / 2) / o.d;
    return o.h * Math.min(1, Math.max(0, u));
  }
  return o.bottom + o.h;
}

/** Things the player can stand on: ramps, platforms, and the tops of low obstacles and blocks. */
export function canStandOn(o: Obstacle): boolean {
  return o.cls === 'ramp' || o.cls === 'platform' || o.cls === 'block' || o.cls === 'low';
}

/** Support height under the player at x (z = 0). Only counts tops the feet are already near. */
export function groundAt(obstacles: readonly Obstacle[], x: number, feetY: number): number {
  let g = 0;
  for (const o of obstacles) {
    if (!o.active || !canStandOn(o)) continue;
    if (Math.abs(o.z) > o.d / 2 || Math.abs(x - o.x) > o.w / 2) continue;
    const top = topAt(o);
    const tolerance = o.cls === 'ramp' ? P.stepUp : P.landTolerance;
    if (feetY >= top - tolerance && top > g) g = top;
  }
  return g;
}

/**
 * Overlap test and classification for one obstacle. Updates the obstacle's overlap memory.
 * Front hit: the z-overlap began while x already overlapped. Side hit: x-overlap began
 * (a lane change) while z already overlapped.
 */
export function classify(p: PlayerState, o: Obstacle): HitKind {
  const ox = Math.abs(p.x - o.x) < HALF_W + o.w / 2;
  const oz = Math.abs(o.z) < HALF_D + o.d / 2;
  const prevX = o.ox;
  const prevZ = o.oz;
  o.ox = ox;
  o.oz = oz;
  if (!ox || !oz || o.hit || o.cls === 'ramp') return 'none';
  const feet = p.y;
  const head = p.y + playerHeight(p) - P.hitboxShrink;
  const top = topAt(o);
  if (head <= o.bottom || feet >= top - 0.02) return 'none';
  // Standing on it (platform/block/low top) is not a hit.
  if (canStandOn(o) && feet >= top - P.landTolerance) return 'none';
  if (prevZ && !prevX) return 'side';
  return 'front';
}
