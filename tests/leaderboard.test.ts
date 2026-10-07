import { describe, expect, it } from 'vitest';
import { cleanName, plausible, validateSubmission } from '../src/core/scoreRules';
import { MemoryStore, SUBMIT_COOLDOWN_MS, handleApi } from '../worker/api';
import { Sim } from '../src/sim/sim';
import { Bot, HUMAN, PERFECT } from '../src/sim/bot';
import { Rng } from '../src/core/rng';

const ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const run = (over: Record<string, unknown> = {}) => ({
  id: ID,
  name: 'Ada',
  score: 3000,
  distance: 1500,
  tokens: 40,
  seconds: 70,
  hat: 'hat_crown',
  outfit: 'outfit_gold',
  ...over,
});

const post = (path: string, body: unknown) =>
  new Request(`https://x.test${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
const get = (path: string) => new Request(`https://x.test${path}`);

describe('score rules', () => {
  it('cleans names and rejects bad ones', () => {
    expect(cleanName('  Ada   Lovelace ')).toBe('Ada Lovelace');
    expect(cleanName('Ærlig Øystein')).toBe('Ærlig Øystein');
    expect(cleanName('Fagerlund')).toBe('Fagerlund');
    expect(cleanName('Thore')).toBe('Thore');
    expect(cleanName('a')).toBeNull();
    expect(cleanName('x'.repeat(17))).toBeNull();
    expect(cleanName('<script>')).toBeNull();
    expect(cleanName('sh1t head')).toBeNull();
    expect(cleanName('kuk')).toBeNull();
    expect(cleanName(42)).toBeNull();
  });

  it('accepts real bot runs (human and perfect) as plausible', { timeout: 120_000 }, () => {
    for (let seed = 1; seed <= 5; seed++) {
      const sim = new Sim(seed * 13);
      const bot = new Bot(seed > 3 ? PERFECT : HUMAN, new Rng(seed));
      let t = 0;
      for (; t < 240 && sim.alive; t += 1 / 60) {
        bot.update(sim, 1 / 60);
        sim.step(1 / 60);
        sim.events.clear();
      }
      const ok = plausible({
        score: Math.floor(sim.score),
        distance: Math.floor(sim.distance),
        tokens: sim.tokens,
        seconds: Math.ceil(sim.elapsed),
      });
      expect(ok).toBe(true);
    }
  });

  it('rejects impossible runs', () => {
    expect(validateSubmission(run({ score: 10_000_000 })).ok).toBe(false);
    expect(validateSubmission(run({ distance: 50_000, seconds: 10 })).ok).toBe(false);
    expect(validateSubmission(run({ score: -1 })).ok).toBe(false);
    expect(validateSubmission(run({ id: 'short' })).ok).toBe(false);
    expect(validateSubmission(run()).ok).toBe(true);
  });
});

describe('leaderboard api', () => {
  it('keeps each player best, ranks, and returns the caller row', async () => {
    const store = new MemoryStore();
    let now = 1_000_000;
    const submit = async (body: unknown) => {
      now += SUBMIT_COOLDOWN_MS + 1;
      const res = await handleApi(post('/api/score', body), store, now);
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    };
    expect((await submit(run())).body).toMatchObject({ rank: 1, improved: true, best: 3000 });
    const other = 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    expect((await submit(run({ id: other, name: 'Bob', score: 5000 }))).body).toMatchObject({
      rank: 1,
    });
    // A worse run does not replace the stored best.
    expect((await submit(run({ score: 100 }))).body).toMatchObject({
      rank: 2,
      improved: false,
      best: 3000,
    });
    const res = await handleApi(get(`/api/leaderboard?id=${ID}`), store, now);
    const lb = (await res.json()) as {
      entries: { name: string; you?: boolean }[];
      me: { rank: number };
      total: number;
    };
    expect(lb.entries.map((e) => e.name)).toEqual(['Bob', 'Ada']);
    expect(lb.entries[1]?.you).toBe(true);
    expect(lb.me.rank).toBe(2);
    expect(lb.total).toBe(2);
  });

  it('rejects bad input, spam and unknown routes', async () => {
    const store = new MemoryStore();
    expect((await handleApi(post('/api/score', run({ name: 'f' })), store, 1)).status).toBe(400);
    expect((await handleApi(post('/api/score', 'nonsense'), store, 1)).status).toBe(400);
    expect((await handleApi(post('/api/score', run()), store, 10_000)).status).toBe(200);
    expect((await handleApi(post('/api/score', run({ score: 4000 })), store, 10_500)).status).toBe(
      429,
    );
    expect((await handleApi(get('/api/nope'), store, 1)).status).toBe(404);
  });

  it('renames a player', async () => {
    const store = new MemoryStore();
    await handleApi(post('/api/score', run()), store, 10_000);
    const res = await handleApi(post('/api/name', { id: ID, name: 'Grace' }), store, 20_000);
    expect(res.status).toBe(200);
    expect((await store.get(ID))?.name).toBe('Grace');
    expect((await handleApi(post('/api/name', { id: ID, name: '' }), store, 1)).status).toBe(400);
  });
});
