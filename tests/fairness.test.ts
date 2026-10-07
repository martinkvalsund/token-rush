import { describe, expect, it } from 'vitest';
import { PATTERN_DEFS } from '../src/data/patterns';
import { buildPatterns } from '../src/sim/pattern';
import { validateJunction, validatePattern } from '../src/sim/fairness';

const patterns = buildPatterns(PATTERN_DEFS);

describe('patterns', () => {
  it('has at least 60 patterns', () => {
    expect(patterns.length).toBeGreaterThanOrEqual(60);
  });

  for (const p of patterns) {
    it(`${p.id} is fair at every tier it can appear in`, () => {
      for (let tier = p.minTier; tier <= p.maxTier; tier++) {
        const r = validatePattern(p, tier);
        expect(r.reason ?? 'ok', `tier ${tier}`).toBe('ok');
      }
    });
  }

  it('every pattern can be followed by the rest pattern the generator falls back to', () => {
    const rest = patterns.find((p) => p.id === 'rest-line-c');
    if (!rest) throw new Error('rest-line-c missing');
    for (const a of patterns)
      for (let tier = a.minTier; tier <= a.maxTier; tier++)
        expect(validateJunction(a, rest, tier).reason ?? 'ok').toBe('ok');
  });

  it('most pattern pairs join fairly', () => {
    let total = 0;
    let bad = 0;
    for (const tier of [0, 4, 8]) {
      const live = patterns.filter((p) => p.minTier <= tier && tier <= p.maxTier);
      for (const a of live)
        for (const b of live) {
          if (!a.zones.some((z) => b.zones.includes(z))) continue;
          total++;
          if (!validateJunction(a, b, tier).ok) bad++;
        }
    }
    // Unfair joins are rejected at runtime; there must still be plenty of variety.
    expect(bad / total).toBeLessThan(0.1);
  });
});

describe('validator', () => {
  it('rejects a row with no way through', () => {
    const [p] = buildPatterns([
      { id: 'x', zones: [0], minTier: 0, maxTier: 0, weight: 1, rows: ['XXX'] },
    ]);
    expect(p && validatePattern(p, 0).ok).toBe(false);
  });
  it('rejects back-to-back forced lane switches at top speed', () => {
    const [p] = buildPatterns([
      {
        id: 'x',
        zones: [0],
        minTier: 0,
        maxTier: 8,
        weight: 1,
        rows: ['...', 'XX.', '.XX', '...'],
      },
    ]);
    expect(p && validatePattern(p, 8).ok).toBe(false);
  });
  it('rejects a platform without a ramp', () => {
    const [p] = buildPatterns([
      { id: 'x', zones: [0], minTier: 0, maxTier: 0, weight: 1, rows: ['...', 'R..', '...'] },
    ]);
    expect(p && validatePattern(p, 0).ok).toBe(false);
  });
  it('accepts a jump wall', () => {
    const [p] = buildPatterns([
      { id: 'x', zones: [0], minTier: 0, maxTier: 8, weight: 1, rows: ['...', 'bbb', '...'] },
    ]);
    for (let t = 0; t <= 8; t++) expect(p && validatePattern(p, t).ok).toBe(true);
  });
});
