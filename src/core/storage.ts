export type ControlScheme = 'keys' | 'trackpad';
export type Quality = 'auto' | 'high' | 'medium' | 'low';

export interface Settings {
  controls: ControlScheme;
  swipeSensitivity: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  quality: Quality;
  reduceMotion: boolean;
  showFps: boolean;
}

/** Equipped cosmetic per shop category (item ids from data/shop.ts). */
export type Loadout = Record<'outfit' | 'hat' | 'pet' | 'trail' | 'skin' | 'hair', string>;

export interface SaveData {
  version: 1;
  highScore: number;
  bestDistance: number;
  /** Lifetime tokens collected (a stat; never goes down). */
  totalTokens: number;
  runs: number;
  /** Spendable tokens for the shop. */
  wallet: number;
  /** Bought shop item ids (free items are always owned). */
  owned: string[];
  loadout: Loadout;
  /** Local date (YYYY-MM-DD) the daily crate was last opened. */
  lastDaily: string;
  settings: Settings;
}

export const STORAGE_KEY = 'tokenrush:v1';

export const DEFAULT_SETTINGS: Settings = {
  controls: 'keys',
  swipeSensitivity: 1,
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  quality: 'auto',
  reduceMotion: false,
  showFps: false,
};

export const DEFAULT_LOADOUT: Loadout = {
  outfit: 'outfit_classic',
  hat: 'hat_hardhat',
  pet: 'pet_none',
  trail: 'trail_none',
  skin: 'skin_3',
  hair: 'hair_brown',
};

export function defaultSave(): SaveData {
  return {
    version: 1,
    highScore: 0,
    bestDistance: 0,
    totalTokens: 0,
    runs: 0,
    wallet: 0,
    owned: [],
    loadout: { ...DEFAULT_LOADOUT },
    lastDaily: '',
    settings: { ...DEFAULT_SETTINGS },
  };
}

const num = (v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Parse stored JSON defensively: any missing or corrupt field falls back to its default. */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (typeof data !== 'object' || data === null) return base;
  const d = migrate(data as Record<string, unknown>);
  const s = (typeof d.settings === 'object' && d.settings !== null ? d.settings : {}) as Record<
    string,
    unknown
  >;
  const def = DEFAULT_SETTINGS;
  const totalTokens = num(d.totalTokens, 0);
  const lo = (typeof d.loadout === 'object' && d.loadout !== null ? d.loadout : {}) as Record<
    string,
    unknown
  >;
  const loadout = { ...DEFAULT_LOADOUT };
  for (const k of Object.keys(loadout) as (keyof Loadout)[])
    if (typeof lo[k] === 'string') loadout[k] = lo[k];
  return {
    version: 1,
    highScore: num(d.highScore, 0),
    bestDistance: num(d.bestDistance, 0),
    totalTokens,
    runs: num(d.runs, 0),
    // Saves from before the shop: every token collected so far is spendable.
    wallet: Math.floor(num(d.wallet, totalTokens)),
    owned: Array.isArray(d.owned)
      ? [...new Set(d.owned.filter((x): x is string => typeof x === 'string'))]
      : [],
    loadout,
    lastDaily: typeof d.lastDaily === 'string' ? d.lastDaily : '',
    settings: {
      controls: pick(s.controls, ['keys', 'trackpad'], def.controls),
      swipeSensitivity: num(s.swipeSensitivity, def.swipeSensitivity, 0.25, 3),
      masterVolume: num(s.masterVolume, def.masterVolume, 0, 1),
      musicVolume: num(s.musicVolume, def.musicVolume, 0, 1),
      sfxVolume: num(s.sfxVolume, def.sfxVolume, 0, 1),
      muted: bool(s.muted, def.muted),
      quality: pick(s.quality, ['auto', 'high', 'medium', 'low'], def.quality),
      reduceMotion: bool(s.reduceMotion, def.reduceMotion),
      showFps: bool(s.showFps, def.showFps),
    },
  };
}

/** Migration stub: upgrade older save shapes here as the version number grows. */
function migrate(d: Record<string, unknown>): Record<string, unknown> {
  return d;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage with a memory-only fallback (private mode, blocked storage). */
export class Storage {
  private memory: string | null = null;
  data: SaveData;

  constructor(private readonly store: KeyValueStore | null = safeLocalStorage()) {
    this.data = parseSave(this.read());
  }

  private read(): string | null {
    try {
      return this.store ? this.store.getItem(STORAGE_KEY) : null;
    } catch {
      return null;
    }
  }

  save(): void {
    const json = JSON.stringify(this.data);
    this.memory = json;
    try {
      this.store?.setItem(STORAGE_KEY, json);
    } catch {
      // Memory-only: keep going.
    }
  }

  /** Record a finished run. Returns true if it set a new highscore. */
  recordRun(score: number, distance: number, tokens: number): boolean {
    const best = score > this.data.highScore;
    this.data.highScore = Math.max(this.data.highScore, Math.floor(score));
    this.data.bestDistance = Math.max(this.data.bestDistance, Math.floor(distance));
    this.data.totalTokens += tokens;
    this.data.wallet += tokens;
    this.data.runs += 1;
    this.save();
    return best;
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = { ...defaultSave(), settings };
    try {
      this.store?.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.save();
  }

  get raw(): string | null {
    return this.memory;
  }
}

function safeLocalStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
