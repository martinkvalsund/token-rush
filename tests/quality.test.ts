import { describe, expect, it } from 'vitest';
import { AdaptiveQuality, type Level } from '../src/render/quality';

describe('adaptive quality', () => {
  it('steps down after 3 s of slow frames and stops at low', () => {
    const applied: Level[] = [];
    const q = new AdaptiveQuality((l) => applied.push(l));
    q.setMode('auto');
    for (let i = 0; i < 60 * 30; i++) q.sample(1 / 30, true);
    expect(applied).toEqual(['high', 'medium', 'low']);
  });
  it('stays put on fast frames or when not in auto', () => {
    const applied: Level[] = [];
    const q = new AdaptiveQuality((l) => applied.push(l));
    q.setMode('auto');
    for (let i = 0; i < 600; i++) q.sample(1 / 60, true);
    for (let i = 0; i < 600; i++) q.sample(1 / 20, false);
    expect(applied).toEqual(['high']);
  });
});
