import {
  LEADERBOARD_SIZE,
  cleanName,
  validId,
  validateSubmission,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type SubmitResponse,
} from '../src/core/scoreRules';

/** One player's best run as stored. */
export interface ScoreRow {
  id: string;
  name: string;
  score: number;
  distance: number;
  hat: string;
  outfit: string;
  /** ms since epoch of the last accepted submission (ties rank earlier first). */
  updated: number;
}

/** Storage behind the API: D1 in production (worker/index.ts), memory in tests. */
export interface ScoreStore {
  get(id: string): Promise<ScoreRow | null>;
  put(row: ScoreRow): Promise<void>;
  top(limit: number): Promise<ScoreRow[]>;
  /** 1-based rank of a row: players with a higher score, or the same score set earlier. */
  rank(row: ScoreRow): Promise<number>;
  count(): Promise<number>;
}

/** Minimum time between accepted submissions per player. */
export const SUBMIT_COOLDOWN_MS = 4000;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const entry = (r: ScoreRow, rank: number, you = false): LeaderboardEntry => ({
  rank,
  name: r.name,
  score: r.score,
  distance: r.distance,
  hat: r.hat,
  outfit: r.outfit,
  ...(you ? { you } : {}),
});

async function readJson(req: Request): Promise<unknown> {
  if (Number(req.headers.get('content-length') ?? 0) > 2048) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * GET  /api/leaderboard?id=…   top list plus the caller's own row
 * POST /api/score              submit a finished run (kept only if it beats the stored best)
 * POST /api/name               change the caller's display name
 */
export async function handleApi(
  req: Request,
  store: ScoreStore,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === '/api/leaderboard' && req.method === 'GET') {
    const rows = await store.top(LEADERBOARD_SIZE);
    const id = url.searchParams.get('id');
    const entries = rows.map((r, i) => entry(r, i + 1, r.id === id));
    let me: LeaderboardEntry | null = entries.find((e) => e.you) ?? null;
    if (!me && validId(id)) {
      const row = await store.get(id);
      if (row) me = entry(row, await store.rank(row), true);
    }
    const body: LeaderboardResponse = { entries, me, total: await store.count() };
    return json(body);
  }

  if (path === '/api/score' && req.method === 'POST') {
    const v = validateSubmission(await readJson(req));
    if (!v.ok) return json({ error: v.error }, 400);
    const s = v.value;
    const old = await store.get(s.id);
    if (old && now - old.updated < SUBMIT_COOLDOWN_MS) return json({ error: 'too fast' }, 429);
    const improved = !old || s.score > old.score;
    const row: ScoreRow = improved
      ? {
          id: s.id,
          name: s.name,
          score: s.score,
          distance: s.distance,
          hat: s.hat,
          outfit: s.outfit,
          updated: now,
        }
      : { ...old, name: s.name, hat: s.hat, outfit: s.outfit };
    await store.put(row);
    const body: SubmitResponse = { rank: await store.rank(row), improved, best: row.score };
    return json(body);
  }

  if (path === '/api/name' && req.method === 'POST') {
    const b = (await readJson(req)) as { id?: unknown; name?: unknown } | null;
    if (!b || !validId(b.id)) return json({ error: 'bad id' }, 400);
    const name = cleanName(b.name);
    if (!name) return json({ error: 'bad name' }, 400);
    const old = await store.get(b.id);
    if (old) await store.put({ ...old, name });
    return json({ ok: true, name });
  }

  return json({ error: 'not found' }, 404);
}

/** In-memory store for tests and local fallbacks. */
export class MemoryStore implements ScoreStore {
  readonly rows = new Map<string, ScoreRow>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(row: ScoreRow) {
    this.rows.set(row.id, { ...row });
  }
  private sorted() {
    return [...this.rows.values()].sort((a, b) => b.score - a.score || a.updated - b.updated);
  }
  async top(limit: number) {
    return this.sorted().slice(0, limit);
  }
  async rank(row: ScoreRow) {
    return (
      1 +
      [...this.rows.values()].filter(
        (r) => r.score > row.score || (r.score === row.score && r.updated < row.updated),
      ).length
    );
  }
  async count() {
    return this.rows.size;
  }
}
