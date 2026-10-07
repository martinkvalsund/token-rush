import { TUNING } from '../data/tuning';

/**
 * Leaderboard rules shared by the game and the Cloudflare Worker (worker/): name cleaning,
 * request validation and a plausibility check that a score fits the run it came from.
 * Pure: no DOM, no Workers APIs.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 16;
export const LEADERBOARD_SIZE = 50;

export interface ScoreSubmission {
  /** Random per-device player id (crypto.randomUUID). */
  id: string;
  name: string;
  score: number;
  distance: number;
  tokens: number;
  /** Run length in seconds of play. */
  seconds: number;
  /** Equipped shop items, shown next to the name. */
  hat: string;
  outfit: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  distance: number;
  hat: string;
  outfit: string;
  /** True for the requesting player's own row. */
  you?: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  /** The requesting player's row, also when outside the top list. */
  me: LeaderboardEntry | null;
  total: number;
}

export interface SubmitResponse {
  rank: number;
  /** True if this run improved the player's stored best. */
  improved: boolean;
  best: number;
}

// A short blocklist, matched on a normalised form (lower case, common digit swaps). Long
// stems match anywhere ("B4d w0rd" too); short words only as whole words, so real names such as
// "Fagerlund" or "Thore" are not caught.
const BLOCKED_STEMS = [
  'fuck',
  'shit',
  'cunt',
  'nigg',
  'whore',
  'hitler',
  'retard',
  'pussy',
  'bitch',
  'penis',
  'vagina',
];
const BLOCKED_WORDS = [
  'fag',
  'kuk',
  'hore',
  'dick',
  'rape',
  'nazi',
  'slut',
  'faen',
  'fitte',
  'cock',
];
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

const ID_RE = /^[a-z0-9-]{16,64}$/;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;

/** Trim and validate a display name. Returns null if it is not allowed. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if ([...name].length < NAME_MIN || [...name].length > NAME_MAX) return null;
  if (!NAME_RE.test(name)) return null;
  const norm = [...name.toLowerCase()].map((c) => LEET[c] ?? c).join('');
  const flat = norm.replace(/[^\p{L}]/gu, '');
  if (BLOCKED_STEMS.some((w) => flat.includes(w))) return null;
  const words = norm.split(/[^\p{L}]+/u);
  if (words.some((w) => BLOCKED_WORDS.includes(w))) return null;
  return name;
}

export const validId = (id: unknown): id is string => typeof id === 'string' && ID_RE.test(id);

const int = (v: unknown, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.floor(v) : null;

const shortId = (v: unknown): string =>
  typeof v === 'string' && /^[a-z0-9_]{1,32}$/.test(v) ? v : '';

/**
 * Could a real run produce this? Score comes from distance (×2 under the AI spark), tokens
 * (×2 too) and mystery boxes; distance is bounded by top speed over the run time.
 */
export function plausible(
  s: Pick<ScoreSubmission, 'score' | 'distance' | 'tokens' | 'seconds'>,
): boolean {
  const { speed, tokens, powerups } = TUNING;
  if (s.distance > s.seconds * speed.max * 1.05 + 60) return false;
  if (s.tokens > s.distance / 2 + 100) return false;
  const mysteries = s.seconds / 8;
  const maxScore = s.distance * 2 + s.tokens * tokens.score * 2 + mysteries * powerups.mysteryScore;
  return s.score <= maxScore * 1.05 + 100;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validate a POST /api/score body. */
export function validateSubmission(body: unknown): Validated<ScoreSubmission> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'bad body' };
  const b = body as Record<string, unknown>;
  if (!validId(b.id)) return { ok: false, error: 'bad id' };
  const name = cleanName(b.name);
  if (!name) return { ok: false, error: 'bad name' };
  const score = int(b.score, 50_000_000);
  const distance = int(b.distance, 10_000_000);
  const tokens = int(b.tokens, 1_000_000);
  const seconds = int(b.seconds, 6 * 3600);
  if (score === null || distance === null || tokens === null || seconds === null)
    return { ok: false, error: 'bad numbers' };
  const value: ScoreSubmission = {
    id: b.id,
    name,
    score,
    distance,
    tokens,
    seconds,
    hat: shortId(b.hat),
    outfit: shortId(b.outfit),
  };
  if (!plausible(value)) return { ok: false, error: 'implausible run' };
  return { ok: true, value };
}
