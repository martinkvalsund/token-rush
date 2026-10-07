import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/data/tuning';
import { EventQueue } from '../src/sim/events';
import { createPlayer, playerHeight, queueCommand, stepPlayer } from '../src/sim/player';

const dt = 1 / 60;
const flat = { superJump: false, groundAt: () => 0 };

function run(p: ReturnType<typeof createPlayer>, seconds: number, ctx = flat): number {
  const ev = new EventQueue();
  let maxY = 0;
  for (let t = 0; t < seconds; t += dt) {
    stepPlayer(p, dt, ctx, ev);
    ev.clear();
    maxY = Math.max(maxY, p.y);
  }
  return maxY;
}

describe('player', () => {
  it('changes lane within the lane change time', () => {
    const p = createPlayer();
    queueCommand(p, 'left');
    run(p, TUNING.player.laneChangeTime + 2 * dt);
    expect(p.x).toBeCloseTo(-2.4);
  });

  it('ignores moves past the outer lane', () => {
    const p = createPlayer();
    queueCommand(p, 'right');
    queueCommand(p, 'right');
    run(p, 0.5);
    expect(p.lane).toBe(2);
  });

  it('jumps to about 1.7 m and lands in about 0.7 s', () => {
    const p = createPlayer();
    queueCommand(p, 'jump');
    const apex = run(p, 0.3);
    run(p, 0.45);
    expect(apex).toBeGreaterThan(1.5);
    expect(apex).toBeLessThan(1.9);
    expect(p.grounded).toBe(true);
  });

  it('super jump reaches about 3.4 m', () => {
    const p = createPlayer();
    queueCommand(p, 'jump');
    const apex = run(p, 1.2, { superJump: true, groundAt: () => 0 });
    expect(apex).toBeGreaterThan(3.1);
    expect(apex).toBeLessThan(3.6);
  });

  it('slides with a low hitbox and recovers', () => {
    const p = createPlayer();
    queueCommand(p, 'slide');
    run(p, 0.1);
    expect(playerHeight(p)).toBe(TUNING.player.slideHeight);
    run(p, TUNING.player.slideDuration);
    expect(p.sliding).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const p = createPlayer();
    queueCommand(p, 'jump');
    run(p, 0.65);
    expect(p.grounded).toBe(false);
    queueCommand(p, 'jump'); // early press
    run(p, 0.15);
    expect(p.grounded).toBe(false);
    expect(p.vy).toBeGreaterThan(0);
  });

  it('fast-falls and rolls when slide is pressed mid-air', () => {
    const p = createPlayer();
    queueCommand(p, 'jump');
    run(p, 0.2);
    queueCommand(p, 'slide');
    run(p, 0.25);
    expect(p.grounded).toBe(true);
    expect(p.sliding).toBe(true);
  });

  it('allows a coyote jump after walking off a platform', () => {
    const p = createPlayer();
    let h = 2;
    const ctx = { superJump: false, groundAt: () => h };
    run(p, 0.05, ctx); // climbs onto platform
    h = 0;
    const ev = new EventQueue();
    stepPlayer(p, dt, ctx, ev);
    queueCommand(p, 'jump');
    stepPlayer(p, dt, ctx, ev);
    expect(p.vy).toBeGreaterThan(5);
  });
});
