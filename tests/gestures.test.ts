import { describe, expect, it } from 'vitest';
import { PointerSwipe, WheelSwipe } from '../src/core/gestures';

/** Simulate a trackpad swipe: a burst of deltas then a decaying inertia tail. */
function swipe(w: WheelSwipe, dx: number, dy: number, t0: number, out: string[]): number {
  let t = t0;
  const push = (x: number, y: number) => {
    const c = w.feed(x, y, t);
    if (c) out.push(c);
    t += 16;
  };
  for (let i = 0; i < 6; i++) push(dx, dy);
  let k = 1;
  for (let i = 0; i < 40; i++) {
    k *= 0.88;
    push(dx * k, dy * k);
  }
  return t;
}

describe('trackpad swipe recogniser', () => {
  it('fires exactly one command per swipe, ignoring the inertia tail', () => {
    const w = new WheelSwipe();
    const out: string[] = [];
    swipe(w, -25, 0, 0, out);
    expect(out).toEqual(['left']);
  });

  it('maps directions: right, up = jump, down = slide', () => {
    const w = new WheelSwipe();
    const out: string[] = [];
    let t = swipe(w, 30, 0, 0, out);
    t = swipe(w, 0, -30, t + 400, out);
    swipe(w, 0, 30, t + 400, out);
    expect(out).toEqual(['right', 'jump', 'slide']);
  });

  it('allows two quick separate swipes after the lock time', () => {
    const w = new WheelSwipe();
    const out: string[] = [];
    const t = swipe(w, -30, 0, 0, out);
    swipe(w, -30, 0, t + 150, out);
    expect(out).toEqual(['left', 'left']);
  });

  it('higher sensitivity needs less movement', () => {
    const lo = new WheelSwipe();
    const hi = new WheelSwipe();
    hi.sensitivity = 3;
    expect(lo.feed(20, 0, 0)).toBeNull();
    expect(hi.feed(20, 0, 0)).toBe('right');
  });
});

describe('pointer swipe', () => {
  it('fires once per drag', () => {
    const p = new PointerSwipe();
    p.down(100, 100);
    expect(p.move(110, 100)).toBeNull();
    expect(p.move(160, 105)).toBe('right');
    expect(p.move(220, 105)).toBeNull();
    p.up();
    p.down(100, 100);
    expect(p.move(100, 40)).toBe('jump');
  });
});
