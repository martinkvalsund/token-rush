import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  Storage,
  parseSave,
  type KeyValueStore,
} from '../src/core/storage';

class MemStore implements KeyValueStore {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('storage', () => {
  it('round-trips data', () => {
    const mem = new MemStore();
    const a = new Storage(mem);
    expect(a.recordRun(1234.7, 900, 42)).toBe(true);
    a.data.settings.controls = 'trackpad';
    a.save();
    const b = new Storage(mem);
    expect(b.data.highScore).toBe(1234);
    expect(b.data.totalTokens).toBe(42);
    expect(b.data.runs).toBe(1);
    expect(b.data.settings.controls).toBe('trackpad');
  });

  it('only reports a highscore when beaten', () => {
    const s = new Storage(new MemStore());
    s.recordRun(500, 1, 1);
    expect(s.recordRun(400, 1, 1)).toBe(false);
    expect(s.data.highScore).toBe(500);
  });

  it('survives corrupt JSON and wrong types', () => {
    expect(parseSave('{not json')).toMatchObject({ highScore: 0 });
    const d = parseSave(
      JSON.stringify({
        highScore: 'lots',
        runs: -5,
        settings: { quality: 'ultra', musicVolume: 9 },
      }),
    );
    expect(d.highScore).toBe(0);
    expect(d.runs).toBe(0);
    expect(d.settings.quality).toBe(DEFAULT_SETTINGS.quality);
    expect(d.settings.musicVolume).toBe(1);
  });

  it('falls back to memory when storage throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => undefined,
    };
    const s = new Storage(broken);
    s.recordRun(10, 10, 1);
    expect(s.data.highScore).toBe(10);
    expect(s.raw).toContain('"highScore":10');
  });

  it('uses a versioned key', () => {
    expect(STORAGE_KEY).toBe('tokenrush:v1');
  });
});
