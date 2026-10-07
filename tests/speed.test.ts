import { describe, expect, it } from 'vitest';
import { speedAt } from '../src/sim/speed';
import { Rng } from '../src/core/rng';
import { StateMachine } from '../src/core/stateMachine';

describe('speed curve', () => {
  it('starts at the start speed and approaches max', () => {
    expect(speedAt(0)).toBeCloseTo(14);
    expect(speedAt(120)).toBeGreaterThan(30);
    expect(speedAt(10_000)).toBeLessThanOrEqual(32);
  });
  it('is monotonic', () => {
    expect(speedAt(60)).toBeGreaterThan(speedAt(30));
  });
});

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.next(), a.next(), a.int(0, 9)]).toEqual([b.next(), b.next(), b.int(0, 9)]);
  });
});

describe('StateMachine', () => {
  it('rejects illegal transitions', () => {
    const sm = new StateMachine();
    expect(sm.go('GameOver')).toBe(false);
    expect(sm.go('Playing')).toBe(true);
    expect(sm.go('Paused')).toBe(true);
  });
});
