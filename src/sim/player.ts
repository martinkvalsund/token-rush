import { TUNING, laneX, type Lane } from '../data/tuning';
import type { EventQueue } from './events';

export type PlayerCommand = 'left' | 'right' | 'jump' | 'slide';

interface Buffered {
  cmd: PlayerCommand;
  ttl: number;
}

export interface PlayerState {
  lane: Lane;
  prevLane: Lane;
  fromX: number;
  x: number;
  laneT: number;
  y: number;
  vy: number;
  grounded: boolean;
  coyote: number;
  sliding: boolean;
  slideTime: number;
  fastFall: boolean;
  rollPending: boolean;
  airTime: number;
  flying: boolean;
  softFall: boolean;
  /** Seconds since the last lane change started (for lean animation). */
  laneAge: number;
  laneDir: -1 | 0 | 1;
  buffer: Buffered[];
  bufferCount: number;
}

export interface PlayerContext {
  superJump: boolean;
  /** Support height at x for the player at z = 0 (0 = ground, else ramp/platform top). */
  groundAt: (x: number) => number;
}

const P = TUNING.player;

export function createPlayer(): PlayerState {
  return {
    lane: 1,
    prevLane: 1,
    fromX: 0,
    x: 0,
    laneT: 1,
    y: 0,
    vy: 0,
    grounded: true,
    coyote: 0,
    sliding: false,
    slideTime: 0,
    fastFall: false,
    rollPending: false,
    airTime: 0,
    flying: false,
    softFall: false,
    laneAge: 10,
    laneDir: 0,
    buffer: Array.from({ length: 4 }, () => ({ cmd: 'jump' as PlayerCommand, ttl: 0 })),
    bufferCount: 0,
  };
}

export function playerHeight(p: PlayerState): number {
  return p.sliding ? P.slideHeight : P.height;
}

export function queueCommand(p: PlayerState, cmd: PlayerCommand): void {
  if (p.bufferCount >= p.buffer.length) {
    // drop the oldest
    for (let i = 1; i < p.buffer.length; i++) {
      const a = p.buffer[i - 1];
      const b = p.buffer[i];
      if (a && b) {
        a.cmd = b.cmd;
        a.ttl = b.ttl;
      }
    }
    p.bufferCount--;
  }
  const slot = p.buffer[p.bufferCount];
  if (!slot) return;
  slot.cmd = cmd;
  slot.ttl = P.inputBuffer;
  p.bufferCount++;
}

/** Start moving toward a lane. Used by commands and by the side-hit bounce. */
export function changeLane(p: PlayerState, lane: Lane): void {
  if (lane === p.lane) return;
  p.laneDir = lane > p.lane ? 1 : -1;
  p.prevLane = p.lane;
  p.lane = lane;
  p.fromX = p.x;
  p.laneT = 0;
  p.laneAge = 0;
}

function tryCommand(
  p: PlayerState,
  cmd: PlayerCommand,
  ctx: PlayerContext,
  ev: EventQueue,
): boolean {
  switch (cmd) {
    case 'left':
    case 'right': {
      const target = p.lane + (cmd === 'left' ? -1 : 1);
      if (target < 0 || target > 2) return true; // consumed, nothing to do
      changeLane(p, target as Lane);
      ev.push('lane', target);
      return true;
    }
    case 'jump': {
      if (p.flying) return true;
      if (p.sliding && p.slideTime < P.slideCancelAfter) return false;
      if (!p.grounded && p.coyote <= 0) return false;
      p.vy = ctx.superJump ? P.superJumpVelocity : P.jumpVelocity;
      p.grounded = false;
      p.coyote = 0;
      p.sliding = false;
      p.airTime = 0;
      ev.push('jump', ctx.superJump ? 1 : 0);
      return true;
    }
    case 'slide': {
      if (p.flying) return true;
      if (p.grounded) {
        p.sliding = true;
        p.slideTime = 0;
        ev.push('slide');
        return true;
      }
      p.fastFall = true;
      p.rollPending = true;
      if (p.vy > 0) p.vy = 0;
      return true;
    }
  }
}

export function stepPlayer(p: PlayerState, dt: number, ctx: PlayerContext, ev: EventQueue): void {
  // Buffered input: execute what is legal, age the rest.
  let w = 0;
  for (let i = 0; i < p.bufferCount; i++) {
    const b = p.buffer[i];
    if (!b) continue;
    const done = tryCommand(p, b.cmd, ctx, ev);
    b.ttl -= dt;
    if (!done && b.ttl > 0) {
      const dst = p.buffer[w];
      if (dst && dst !== b) {
        dst.cmd = b.cmd;
        dst.ttl = b.ttl;
      }
      w++;
    }
  }
  p.bufferCount = w;

  // Lateral movement with ease-out.
  p.laneAge += dt;
  if (p.laneT < 1) {
    p.laneT = Math.min(1, p.laneT + dt / P.laneChangeTime);
    const e = 1 - (1 - p.laneT) * (1 - p.laneT);
    p.x = p.fromX + (laneX(p.lane) - p.fromX) * e;
  } else {
    p.x = laneX(p.lane);
  }

  // Slide timer.
  if (p.sliding) {
    p.slideTime += dt;
    if (p.slideTime >= P.slideDuration) p.sliding = false;
  }

  const ground = ctx.groundAt(p.x);

  if (p.flying) {
    const target = TUNING.powerups.jetpackHeight;
    p.y += (target - p.y) * Math.min(1, dt * 4);
    p.vy = 0;
    p.grounded = false;
    p.sliding = false;
    return;
  }

  if (p.grounded) {
    if (ground < p.y - 0.05) {
      // Walked off a platform: start falling, allow a late jump.
      p.grounded = false;
      p.coyote = P.coyoteTime;
      p.vy = 0;
      p.airTime = 0;
    } else {
      p.y = ground;
      return;
    }
  }

  p.coyote = Math.max(0, p.coyote - dt);
  p.airTime += dt;
  let g = P.gravity;
  if (p.fastFall) g *= P.fastFallMultiplier;
  if (p.softFall) g *= 0.35;
  p.vy -= g * dt;
  p.y += p.vy * dt;
  if (p.y <= ground && p.vy <= 0) {
    p.y = ground;
    p.vy = 0;
    p.grounded = true;
    p.softFall = false;
    p.fastFall = false;
    ev.push('land');
    if (p.rollPending) {
      p.rollPending = false;
      p.sliding = true;
      p.slideTime = 0;
      ev.push('slide', 1);
    }
  }
}
