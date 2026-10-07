import type { LeaderboardResponse, ScoreSubmission, SubmitResponse } from './scoreRules';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Talks to the leaderboard API served by the Cloudflare Worker on the same origin (worker/).
 * In local Vite dev there is no API; calls fail fast and the UI shows "offline".
 */
export class LeaderboardClient {
  constructor(
    private readonly base = '/api',
    private readonly timeoutMs = 6000,
  ) {}

  private async call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.base}${path}`, {
        ...init,
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
      });
      const type = res.headers.get('content-type') ?? '';
      if (!type.includes('application/json')) return { ok: false, error: 'offline' };
      const body = (await res.json()) as T & { error?: string };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, data: body };
    } catch {
      return { ok: false, error: 'offline' };
    } finally {
      clearTimeout(timer);
    }
  }

  top(id: string): Promise<ApiResult<LeaderboardResponse>> {
    return this.call(`/leaderboard?id=${encodeURIComponent(id)}`);
  }

  submit(run: ScoreSubmission): Promise<ApiResult<SubmitResponse>> {
    return this.call('/score', { method: 'POST', body: JSON.stringify(run) });
  }

  rename(id: string, name: string): Promise<ApiResult<{ ok: true; name: string }>> {
    return this.call('/name', { method: 'POST', body: JSON.stringify({ id, name }) });
  }
}
