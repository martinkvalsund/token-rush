import { describe, expect, it } from 'vitest';
import { CATEGORIES, DAILY_GIFT, ITEMS_BY_ID, SHOP_ITEMS } from '../src/data/shop';
import { MODEL_NAMES } from '../src/render/models/manifest';
import {
  buy,
  claimDaily,
  dailyReady,
  equip,
  loadoutItems,
  owns,
  sanitizeLoadout,
} from '../src/core/shop';
import { DEFAULT_LOADOUT, defaultSave, parseSave } from '../src/core/storage';
import palette from '../art/palette.json';

describe('shop catalogue', () => {
  it('has unique ids, a free default per category and known models and swatches', () => {
    expect(ITEMS_BY_ID.size).toBe(SHOP_ITEMS.length);
    const swatches = new Set(palette.colors.map((c) => c.name));
    for (const c of CATEGORIES) {
      const def = ITEMS_BY_ID.get(c.defaultId);
      expect(def?.category).toBe(c.id);
      expect(def?.price).toBe(0);
      expect(DEFAULT_LOADOUT[c.id]).toBe(c.defaultId);
    }
    for (const item of SHOP_ITEMS) {
      if (item.model) expect(MODEL_NAMES).toContain(item.model);
      for (const k of Object.keys(item.recolor ?? {})) expect(swatches.has(k)).toBe(true);
      expect(item.swatch.length).toBeGreaterThan(0);
    }
  });
});

describe('shop logic', () => {
  it('buys with enough tokens, equips, and refuses twice or when poor', () => {
    const s = defaultSave();
    s.wallet = 500;
    expect(buy(s, 'hat_headlamp')).toBe('bought');
    expect(s.wallet).toBe(100);
    expect(s.loadout.hat).toBe('hat_headlamp');
    expect(buy(s, 'hat_headlamp')).toBe('owned');
    expect(buy(s, 'hat_crown')).toBe('poor');
    expect(s.wallet).toBe(100);
    expect(buy(s, 'nope')).toBe('unknown');
  });

  it('equips only owned or free items', () => {
    const s = defaultSave();
    expect(equip(s, 'hat_crown')).toBe(false);
    expect(equip(s, 'skin_5')).toBe(true);
    expect(s.loadout.skin).toBe('skin_5');
    expect(owns(s, 'pet_none')).toBe(true);
  });

  it('sanitizes tampered loadouts back to defaults', () => {
    const s = defaultSave();
    s.loadout.hat = 'hat_crown';
    s.loadout.pet = 'trail_fire';
    s.loadout.trail = 'whatever';
    sanitizeLoadout(s);
    expect(s.loadout).toEqual(DEFAULT_LOADOUT);
    expect(loadoutItems(s.loadout).hat.id).toBe('hat_hardhat');
  });

  it('gives the daily crate once per day', () => {
    const s = defaultSave();
    const day = new Date(2026, 9, 7, 9);
    expect(dailyReady(s, day)).toBe(true);
    expect(claimDaily(s, day)).toBe(DAILY_GIFT);
    expect(claimDaily(s, new Date(2026, 9, 7, 23))).toBe(0);
    expect(claimDaily(s, new Date(2026, 9, 8, 0, 5))).toBe(DAILY_GIFT);
    expect(s.wallet).toBe(2 * DAILY_GIFT);
  });

  it('turns pre-shop saves into a wallet of every token collected', () => {
    const old = parseSave(JSON.stringify({ version: 1, totalTokens: 1234, highScore: 5 }));
    expect(old.wallet).toBe(1234);
    expect(old.owned).toEqual([]);
    expect(old.loadout).toEqual(DEFAULT_LOADOUT);
    const kept = parseSave(JSON.stringify({ wallet: 10, totalTokens: 1234, owned: ['a', 'a', 3] }));
    expect(kept.wallet).toBe(10);
    expect(kept.owned).toEqual(['a']);
  });
});
