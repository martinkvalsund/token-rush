import { handleApi, type ScoreRow, type ScoreStore } from './api';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Per-IP limit on writes (wrangler.jsonc ratelimits). */
  WRITE_LIMITER?: RateLimit;
}

interface DbRow {
  id: string;
  name: string;
  score: number;
  distance: number;
  hat: string;
  outfit: string;
  updated: number;
}

const toRow = (r: DbRow): ScoreRow => ({ ...r });

/** The leaderboard in D1 (schema in migrations/). One row per player: their best run. */
class D1Store implements ScoreStore {
  constructor(private readonly db: D1Database) {}

  async get(id: string) {
    const r = await this.db.prepare('SELECT * FROM players WHERE id = ?').bind(id).first<DbRow>();
    return r ? toRow(r) : null;
  }

  async put(row: ScoreRow) {
    await this.db
      .prepare(
        `INSERT INTO players (id, name, score, distance, hat, outfit, updated)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET name = ?2, score = ?3, distance = ?4, hat = ?5,
           outfit = ?6, updated = ?7`,
      )
      .bind(row.id, row.name, row.score, row.distance, row.hat, row.outfit, row.updated)
      .run();
  }

  async top(limit: number) {
    const { results } = await this.db
      .prepare('SELECT * FROM players ORDER BY score DESC, updated ASC LIMIT ?')
      .bind(limit)
      .all<DbRow>();
    return results.map(toRow);
  }

  async rank(row: ScoreRow) {
    const r = await this.db
      .prepare(
        'SELECT COUNT(*) AS n FROM players WHERE score > ?1 OR (score = ?1 AND updated < ?2)',
      )
      .bind(row.score, row.updated)
      .first<{ n: number }>();
    return 1 + (r?.n ?? 0);
  }

  async count() {
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM players').first<{ n: number }>();
    return r?.n ?? 0;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.method === 'POST' && env.WRITE_LIMITER) {
      const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
      const { success } = await env.WRITE_LIMITER.limit({ key: ip });
      if (!success)
        return new Response(JSON.stringify({ error: 'too many requests' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        });
    }
    try {
      return await handleApi(req, new D1Store(env.DB));
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: 'server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
