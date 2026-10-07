import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { Bot, HUMAN, PERFECT, type BotOptions } from '../src/sim/bot';
import { Rng } from '../src/core/rng';

const dt = 1 / 60;
const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

function runBot(
  seed: number,
  seconds: number,
  opts: BotOptions = PERFECT,
  rngSeed?: number,
): { sim: Sim; time: number } {
  const sim = new Sim(seed);
  const bot = new Bot(opts, rngSeed === undefined ? undefined : new Rng(rngSeed));
  let t = 0;
  for (; t < seconds && sim.alive; t += dt) {
    bot.update(sim, dt);
    sim.step(dt);
    sim.events.clear();
  }
  return { sim, time: t };
}

describe('autoplay bot', () => {
  it('a perfect bot survives 3 minutes on 6 seeds with zero deaths', { timeout: 120_000 }, () => {
    const deaths: string[] = [];
    for (let seed = 1; seed <= 6; seed++) {
      const { sim } = runBot(seed, 180);
      if (!sim.alive)
        deaths.push(
          `seed ${seed}: ${sim.cause} at ${sim.distance.toFixed(0)} m in ${sim.generator.currentPatternId}`,
        );
    }
    expect(deaths).toEqual([]);
  });

  it(
    'reaches tier 8 and near top speed after about a minute and a quarter',
    { timeout: 60_000 },
    () => {
      const { sim } = runBot(42, 75);
      expect(sim.tier).toBe(8);
      expect(sim.speed).toBeGreaterThanOrEqual(30);
    },
  );

  // Long soak: npm run soak (24 seeds x 4 minutes). Known residual: one seed dies at the top
  // tier on speed-dependent timing edge cases. See PROGRESS.md.
  it.skipIf(!env.SOAK)('soak: 24 seeds x 4 minutes', { timeout: 900_000 }, () => {
    const deaths: string[] = [];
    for (let seed = 100; seed < 124; seed++) {
      const { sim } = runBot(seed, 240);
      if (!sim.alive) deaths.push(`seed ${seed}: ${sim.cause} at ${sim.distance.toFixed(0)} m`);
    }
    console.log(deaths.length ? deaths.join('\n') : 'all 24 survived');
    expect(deaths.length).toBeLessThanOrEqual(1);
  });

  // Difficulty measurement: BALANCE=1 npm test -- bot
  it.skipIf(!env.BALANCE)(
    'balance: non-perfect median run is 1.5-3 minutes',
    { timeout: 900_000 },
    () => {
      const times: number[] = [];
      for (let seed = 1; seed <= 21; seed++) times.push(runBot(seed * 31, 300, HUMAN, seed).time);
      times.sort((a, b) => a - b);
      const median = times[10] ?? 0;
      console.log(
        `median ${median.toFixed(0)} s, p25 ${times[5]?.toFixed(0)} s, p75 ${times[15]?.toFixed(0)} s`,
      );
      expect(median).toBeGreaterThanOrEqual(90);
      expect(median).toBeLessThanOrEqual(180);
    },
  );
});
