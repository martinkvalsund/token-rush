import { describe, expect, it } from 'vitest';
import { FlickSwipe, PointerSwipe, WheelSwipe } from '../src/core/gestures';

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

/** Simulate pointer movement: n events 16 ms apart with the given per-event delta. */
function move(f: FlickSwipe, dx: number, dy: number, n: number, t0: number, out: string[]): number {
  let t = t0;
  for (let i = 0; i < n; i++) {
    const c = f.feed(dx, dy, t);
    if (c) out.push(c);
    t += 16;
  }
  return t;
}

describe('one-finger trackpad flick (no click)', () => {
  it('a quick flick fires exactly one command', () => {
    const f = new FlickSwipe();
    const out: string[] = [];
    let t = move(f, 18, 1, 8, 0, out);
    t = move(f, 3, 0, 6, t, out);
    move(f, 0.5, 0, 10, t, out);
    expect(out).toEqual(['right']);
  });

  it('maps up to jump and down to slide', () => {
    const f = new FlickSwipe();
    const out: string[] = [];
    let t = move(f, 0, -20, 6, 0, out);
    t = move(f, 0, 0, 10, t + 150, out);
    move(f, 0, 20, 6, t + 150, out);
    expect(out).toEqual(['jump', 'slide']);
  });

  it('slow drifting never fires', () => {
    const f = new FlickSwipe();
    const out: string[] = [];
    move(f, 2, 1, 300, 0, out);
    expect(out).toEqual([]);
  });

  it('two flicks with a short pause fire twice', () => {
    const f = new FlickSwipe();
    const out: string[] = [];
    const t = move(f, -20, 0, 6, 0, out);
    move(f, -20, 0, 6, t + 300, out);
    expect(out).toEqual(['left', 'left']);
  });
});
