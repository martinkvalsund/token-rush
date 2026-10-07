import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { TUNING, type Lane } from '../src/data/tuning';
import type { ObstacleId } from '../src/data/obstacles';

const dt = 1 / 60;

/** A sim with an empty track and a single obstacle placed ahead. */
function arena(id: ObstacleId, lane: Lane, ahead = 20): Sim {
  const sim = new Sim(1);
  sim.world.obstacles.clear();
  sim.world.tokens.clear();
  sim.world.pickups.clear();
  sim.generator.cursor = 1e9; // stop generating
  sim.generator.addObstacle(id, lane, sim.distance + ahead, 0);
  return sim;
}

function run(sim: Sim, seconds: number): void {
  for (let t = 0; t < seconds; t += dt) {
    sim.step(dt);
    sim.events.clear();
  }
}

describe('collisions', () => {
  it('running into a low obstacle stumbles and brings the boulder closer', () => {
    const sim = arena('jersey_barrier', 1);
    run(sim, 2);
    expect(sim.alive).toBe(true);
    expect(sim.gap).toBeLessThan(TUNING.lives.gapFar);
    expect(sim.lives).toBe(1);
  });

  it('jumping clears a low obstacle', () => {
    const sim = arena('jersey_barrier', 1, 6);
    sim.command('jump');
    run(sim, 2);
    expect(sim.gap).toBe(TUNING.lives.gapFar);
  });

  it('sliding clears an overhead obstacle', () => {
    const sim = arena('height_gantry', 1, 5);
    sim.command('slide');
    run(sim, 2);
    expect(sim.gap).toBe(TUNING.lives.gapFar);
  });

  it('a head-on block hit ends the run', () => {
    const sim = arena('excavator', 1);
    run(sim, 3);
    expect(sim.alive).toBe(false);
    expect(sim.cause).toBe('crash');
  });

  it('changing lane into the side of a block bounces back and stumbles', () => {
    const sim = arena('container', 0, 0);
    run(sim, dt * 2);
    sim.command('left');
    run(sim, 0.4);
    expect(sim.alive).toBe(true);
    expect(sim.player.lane).toBe(1);
    expect(sim.gap).toBeLessThan(TUNING.lives.gapFar);
  });

  it('a second stumble while the boulder is close is caught', () => {
    const sim = arena('jersey_barrier', 1);
    sim.generator.addObstacle('jersey_barrier', 1, 50, 0);
    run(sim, 4);
    expect(sim.alive).toBe(false);
    expect(sim.cause).toBe('caught');
  });

  it('recovers the gap while running clean', () => {
    const sim = arena('jersey_barrier', 1);
    run(sim, 1.5);
    const after = sim.gap;
    run(sim, 6);
    expect(sim.gap).toBeGreaterThan(after);
  });

  it('runs up a ramp onto a platform and drops off the end', () => {
    const sim = arena('ramp', 1, 10);
    sim.generator.addObstacle('container_platform', 1, 14, 0);
    sim.generator.addObstacle('container_platform', 1, 18, 0);
    let maxY = 0;
    for (let t = 0; t < 1.1; t += dt) {
      sim.step(dt);
      maxY = Math.max(maxY, sim.player.y);
    }
    expect(sim.alive).toBe(true);
    expect(maxY).toBeGreaterThan(2.4);
    run(sim, 2);
    expect(sim.player.y).toBe(0);
    expect(sim.gap).toBe(TUNING.lives.gapFar);
  });
});
