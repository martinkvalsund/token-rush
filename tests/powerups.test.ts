import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { TUNING } from '../src/data/tuning';
import { ZONES } from '../src/data/zones';
import { Powerups, rollMystery } from '../src/sim/powerups';
import type { PowerupType } from '../src/sim/entities';

const dt = 1 / 60;

function empty(): Sim {
  const sim = new Sim(5);
  sim.world.obstacles.clear();
  sim.world.tokens.clear();
  sim.world.pickups.clear();
  sim.generator.cursor = 1e9;
  return sim;
}
function run(sim: Sim, seconds: number): void {
  for (let t = 0; t < seconds; t += dt) {
    sim.step(dt);
    sim.events.clear();
  }
}
function pickup(sim: Sim, type: PowerupType): void {
  sim.generator.addPickup(type, sim.distance + 5, 0);
  run(sim, 0.6);
}

describe('power-ups', () => {
  it('picking up a power-up activates it and it runs out', () => {
    const sim = empty();
    pickup(sim, 'double');
    expect(sim.multiplier).toBe(2);
    run(sim, TUNING.powerups.double);
    expect(sim.multiplier).toBe(1);
  });

  it('picking the same type again refreshes the timer', () => {
    const sim = empty();
    sim.activate('magnet');
    run(sim, 5);
    sim.activate('magnet');
    expect(sim.powerups.left.magnet).toBeCloseTo(TUNING.powerups.magnet);
  });

  it('jetpack flies above obstacles, is invulnerable, then lands softly', () => {
    const sim = empty();
    sim.activate('jetpack');
    run(sim, 1);
    expect(sim.player.y).toBeGreaterThan(4.5);
    sim.generator.addObstacle('excavator', 1, sim.distance + 20, 0);
    run(sim, 2);
    expect(sim.alive).toBe(true);
    run(sim, TUNING.powerups.jetpack);
    expect(sim.player.flying).toBe(false);
    run(sim, 3);
    expect(sim.player.grounded).toBe(true);
  });

  it('jetpack cancels boots; boots do not activate during a jetpack', () => {
    const p = new Powerups();
    p.activate('boots');
    p.activate('jetpack');
    expect(p.active('boots')).toBe(false);
    p.activate('boots');
    expect(p.active('boots')).toBe(false);
  });

  it('boots give a super jump', () => {
    const sim = empty();
    sim.activate('boots');
    sim.command('jump');
    let apex = 0;
    for (let t = 0; t < 1; t += dt) {
      sim.step(dt);
      apex = Math.max(apex, sim.player.y);
    }
    expect(apex).toBeGreaterThan(3);
  });

  it('the coffee shield absorbs a crash once', () => {
    const sim = empty();
    sim.activate('shield');
    sim.generator.addObstacle('excavator', 1, sim.distance + 10, 0);
    run(sim, 1.5);
    expect(sim.alive).toBe(true);
    expect(sim.powerups.active('shield')).toBe(false);
    sim.generator.addObstacle('excavator', 1, sim.distance + 20, 0);
    run(sim, 2.5);
    expect(sim.alive).toBe(false);
  });

  it('the laptop magnet pulls tokens from other lanes', () => {
    const sim = empty();
    sim.activate('magnet');
    for (const x of [-2.4, 2.4]) sim.generator.addToken(sim.distance + 8, x, 1);
    run(sim, 1);
    expect(sim.tokens).toBe(2);
  });

  it('mystery box resolves after a delay', () => {
    const sim = empty();
    sim.activate('mystery');
    const before = { score: sim.score, tokens: sim.world.tokens.countActive() };
    let resolved = false;
    for (let t = 0; t < TUNING.powerups.mysteryDelay + 0.2; t += dt) {
      sim.step(dt);
      for (let i = 0; i < sim.events.count; i++)
        if (sim.events.get(i)?.type === 'mystery') resolved = true;
      sim.events.clear();
    }
    expect(resolved).toBe(true);
    expect(
      sim.score > before.score + 400 ||
        sim.world.tokens.countActive() > before.tokens ||
        sim.powerups.left.magnet +
          sim.powerups.left.jetpack +
          sim.powerups.left.shield +
          sim.powerups.left.double +
          sim.powerups.left.boots >
          0,
    ).toBe(true);
  });

  it('mystery odds follow 55/30/15', () => {
    expect(rollMystery(0.1)).toBe('powerup');
    expect(rollMystery(0.6)).toBe('tokens');
    expect(rollMystery(0.9)).toBe('score');
  });

  it('power-ups spawn on schedule and never repeat back to back', () => {
    const sim = new Sim(99);
    sim.god = true;
    const seen: string[] = [];
    for (let i = 0; i < 60 * 240; i++) {
      sim.step(dt);
      for (let j = 0; j < sim.events.count; j++) {
        const e = sim.events.get(j);
        if (e?.type === 'powerup' && e.label !== 'mystery') seen.push(e.label);
      }
      sim.events.clear();
    }
    const spawned = sim.generator.spawnedPowerups;
    // ~6 km in 4 minutes with one every 350-600 m (+ up to 120 m slack).
    expect(spawned.length).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < spawned.length; i++) expect(spawned[i]).not.toBe(spawned[i - 1]);
    expect(seen.length).toBeGreaterThan(0);
  });
});

describe('jetpack in the tunnel', () => {
  it('flies under the tunnel roof and climbs again outdoors', () => {
    const sim = new Sim(8);
    sim.god = true;
    const tunnelStart = TUNING.world.zoneLength; // zone 1 is the tunnel
    sim.distance = tunnelStart + 50;
    for (const pool of Object.values(sim.world)) pool.clear();
    sim.generator.cursor = 1e9;
    sim.activate('jetpack');
    let maxHead = 0;
    for (let t = 0; t < 3; t += dt) {
      sim.step(dt);
      sim.events.clear();
      maxHead = Math.max(maxHead, sim.player.y + TUNING.player.height);
    }
    const ceiling = ZONES[1]?.ceiling ?? 0;
    expect(maxHead).toBeLessThan(ceiling - 1);
    expect(sim.player.y).toBeGreaterThan(3); // still above the tallest tunnel obstacles
  });

  it('drops before reaching a tunnel mouth', () => {
    const sim = new Sim(8);
    sim.god = true;
    sim.distance = TUNING.world.zoneLength - 60;
    for (const pool of Object.values(sim.world)) pool.clear();
    sim.generator.cursor = 1e9;
    sim.activate('jetpack');
    let headAtMouth = 99;
    while (sim.distance < TUNING.world.zoneLength + 5 && sim.powerups.active('jetpack')) {
      sim.step(dt);
      sim.events.clear();
      if (sim.distance >= TUNING.world.zoneLength)
        headAtMouth = sim.player.y + TUNING.player.height;
    }
    expect(headAtMouth).toBeLessThan((ZONES[1]?.ceiling ?? 0) - 1);
  });
});
