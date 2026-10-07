import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';

describe('generator', () => {
  it('fills the horizon and recycles entities over a 10 minute seeded run', () => {
    const sim = new Sim(1234);
    let maxObstacles = 0;
    for (let i = 0; i < 60 * 600; i++) {
      sim.step(1 / 60);
      sim.events.clear();
      maxObstacles = Math.max(maxObstacles, sim.world.obstacles.countActive());
    }
    expect(sim.distance).toBeGreaterThan(15000);
    expect(maxObstacles).toBeLessThan(sim.world.obstacles.items.length);
    expect(sim.world.tokens.countActive()).toBeLessThan(sim.world.tokens.items.length);
    expect(sim.generator.cursor).toBeGreaterThan(sim.distance + 80);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const s = new Sim(seed);
      for (let i = 0; i < 60 * 60; i++) s.step(1 / 60);
      return s.generator.history.map((h) => h.patternId + h.row.join('')).join('|');
    };
    expect(run(7)).toBe(run(7));
    expect(run(7)).not.toBe(run(8));
  });
});
