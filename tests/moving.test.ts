import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { TUNING, laneX } from '../src/data/tuning';
import type { ObstacleId } from '../src/data/obstacles';
import type { Lane } from '../src/data/tuning';

const dt = 1 / 60;

function arena(id: ObstacleId, lane: Lane, ahead: number): Sim {
  const sim = new Sim(2);
  for (const pool of Object.values(sim.world)) pool.clear();
  sim.generator.cursor = 1e9;
  sim.generator.addObstacle(id, lane, sim.distance + ahead, 0);
  return sim;
}

describe('moving hazards', () => {
  for (const id of ['oncoming_truck', 'rolling_pipe', 'crane_load', 'sweep_arm'] as ObstacleId[]) {
    it(`${id} arrives in its authored lane at its authored row`, () => {
      const sim = arena(id, 0, 60);
      sim.god = true;
      const o = sim.world.obstacles.items.find((x) => x.active);
      if (!o) throw new Error('no obstacle');
      while (sim.distance < o.at) {
        sim.step(dt);
        sim.events.clear();
      }
      expect(Math.abs(o.z)).toBeLessThan(1.2);
      expect(Math.abs(o.x - laneX(0))).toBeLessThan(0.6);
    });
  }

  it('oncoming vehicles close faster than the track scrolls', () => {
    const sim = arena('oncoming_truck', 1, 60);
    sim.god = true;
    sim.step(dt);
    const o = sim.world.obstacles.items.find((x) => x.active);
    expect(o && o.z).toBeLessThan(-60);
  });

  it('warns at least 1.2 s before arrival', () => {
    const sim = arena('oncoming_truck', 2, 120);
    sim.god = true;
    let warnedAt = -1;
    for (let t = 0; t < 10 && warnedAt < 0; t += dt) {
      sim.step(dt);
      for (let i = 0; i < sim.events.count; i++)
        if (sim.events.get(i)?.type === 'warning') warnedAt = sim.distance;
      sim.events.clear();
    }
    const o = sim.world.obstacles.items.find((x) => x.active);
    if (!o) throw new Error('no obstacle');
    expect((o.at - warnedAt) / sim.speed).toBeGreaterThanOrEqual(TUNING.moving.telegraph);
  });

  it('staying out of the hazard lane is safe; standing in it crashes', () => {
    const safe = arena('oncoming_truck', 0, 60);
    for (let t = 0; t < 5; t += dt) safe.step(dt);
    expect(safe.alive).toBe(true);
    const hit = arena('oncoming_truck', 1, 60);
    for (let t = 0; t < 5; t += dt) hit.step(dt);
    expect(hit.alive).toBe(false);
  });

  it('the swinging load does not clip the neighbouring lanes', () => {
    for (const lane of [0, 1, 2] as Lane[]) {
      for (const playerLane of [0, 1, 2] as Lane[]) {
        if (playerLane === lane) continue;
        const sim = arena('crane_load', lane, 40);
        sim.elapsed = 0;
        sim.player.lane = playerLane;
        sim.player.x = laneX(playerLane);
        for (let t = 0; t < 4; t += dt) sim.step(dt);
        expect(sim.gap, `load ${lane} player ${playerLane}`).toBe(TUNING.lives.gapFar);
      }
    }
  });
});
