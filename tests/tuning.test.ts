import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/data/tuning';

describe('tuning', () => {
  it('has three lanes centred on zero', () => {
    expect(TUNING.world.laneX).toHaveLength(3);
    expect(TUNING.world.laneX[1]).toBe(0);
  });
});
