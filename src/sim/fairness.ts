import { TUNING, type Lane } from '../data/tuning';
import type { Cell, Pattern, Row } from './pattern';
import { tierSpeedRange } from './difficulty';

/**
 * Row-level reachability search used by the generator, the tests and the bot.
 * A state describes what the player is doing as they reach the next row.
 */
export type Mode = 'run' | 'air' | 'slide' | 'shift' | 'roof';

export interface PlanState {
  lane: Lane;
  mode: Mode;
  /** air/slide: timing variant; shift: target lane. */
  v: number;
  /** air/slide/shift: rows already spent in the mode. */
  k: number;
  /** Rows before a new jump/slide is allowed. */
  cool: number;
}

type Kind = 'free' | 'low' | 'over' | 'block' | 'ramp' | 'plat';

export function cellKind(c: Cell): Kind {
  switch (c) {
    case 'b':
    case 'j':
      return 'low';
    case 'o':
      return 'over';
    case 'X':
    case 'm':
      return 'block';
    case 'r':
      return 'ramp';
    case 'R':
      return 'plat';
    default:
      return 'free';
  }
}

/** Precomputed per-speed timing in rows. */
export interface Timing {
  speed: number;
  /** For each take-off variant: per row offset, 'clear' (above low) or 'air' (airborne but low). */
  air: ('clear' | 'air')[][];
  /** For each slide variant: per row offset, whether an overhead may pass at that row. */
  slide: boolean[][];
  shift1: number;
  shift2: number;
  recover: number;
  dropRows: number;
}

const F = TUNING.fairness;
const P = TUNING.player;
const VARIANTS = [0.25, 0.5, 0.75, 1];
const timingCache = new Map<number, Timing>();

export function timingFor(speed: number): Timing {
  const key = Math.round(speed * 100);
  const hit = timingCache.get(key);
  if (hit) return hit;
  const dt = TUNING.world.rowSpacing / speed;
  const airtime = (2 * P.jumpVelocity) / P.gravity;
  const air = VARIANTS.map((f) => {
    const tau = f * dt;
    const rows: ('clear' | 'air')[] = [];
    for (let k = 0; tau + k * dt < airtime; k++) {
      const t = tau + k * dt;
      rows.push(t >= F.jumpClearFrom && t <= F.jumpClearTo ? 'clear' : 'air');
    }
    return rows;
  });
  const slide = VARIANTS.map((f) => {
    const tau = f * dt;
    const rows: boolean[] = [];
    for (let k = 0; tau + k * dt < P.slideDuration; k++) rows.push(tau + k * dt >= F.slideLead);
    return rows;
  });
  const t: Timing = {
    speed,
    air,
    slide,
    shift1: Math.ceil(F.laneChange1 / dt),
    shift2: Math.ceil(F.laneChange2 / dt),
    recover: Math.ceil(F.actionRecovery / dt),
    dropRows: Math.ceil(Math.sqrt((2 * 2.6) / P.gravity) / dt),
  };
  timingCache.set(key, t);
  return t;
}

const key = (s: PlanState) => `${s.lane}${s.mode}${s.v}.${s.k}.${s.cool}`;

export function startStates(): PlanState[] {
  return ([0, 1, 2] as Lane[]).map((lane) => ({ lane, mode: 'run', v: 0, k: 0, cool: 0 }));
}

function nextRow(rows: readonly Row[], i: number, lane: Lane): Cell {
  const r = rows[i + 1];
  return r ? r[lane] : '.';
}

/**
 * Advance a set of states across one row. Calls `emit` for each surviving successor.
 * `rows`/`i` are passed so ramp handling can look one row ahead.
 */
export function stepRow(
  s: PlanState,
  rows: readonly Row[],
  i: number,
  tm: Timing,
  emit: (s: PlanState, action: string) => void,
): void {
  const row = rows[i];
  if (!row) return;
  const at = (l: Lane) => cellKind(row[l]);
  const cool = Math.max(0, s.cool - 1);

  switch (s.mode) {
    case 'run': {
      const here = at(s.lane);
      // Keep running.
      if (here === 'free') emit({ ...s, cool }, 'run');
      if (here === 'ramp')
        emit(
          { ...s, mode: cellKind(nextRow(rows, i, s.lane)) === 'plat' ? 'roof' : 'run', cool },
          'run',
        );
      if (s.cool === 0) {
        // Jump, starting with this row as the first airborne row.
        tm.air.forEach((sched, v) =>
          airStep({ ...s, mode: 'air', v, k: 0 }, sched, here, tm.recover, emit),
        );
        // Slide.
        tm.slide.forEach((sched, v) =>
          slideStep({ ...s, mode: 'slide', v, k: 0 }, sched, here, tm.recover, emit),
        );
      }
      // Lane shifts.
      for (const target of [0, 1, 2] as Lane[]) {
        if (target === s.lane) continue;
        shiftStep({ ...s, mode: 'shift', v: target, k: 0, cool }, row, tm, emit);
      }
      return;
    }
    case 'air': {
      const sched = tm.air[s.v];
      if (sched) airStep(s, sched, at(s.lane), tm.recover, emit);
      return;
    }
    case 'slide': {
      const sched = tm.slide[s.v];
      if (sched) slideStep(s, sched, at(s.lane), tm.recover, emit);
      return;
    }
    case 'shift':
      shiftStep({ ...s, cool }, row, tm, emit);
      return;
    case 'roof': {
      const here = at(s.lane);
      if (here === 'plat') emit({ ...s, cool }, 'run');
      else if (here === 'free') emit({ ...s, mode: 'run', cool: tm.dropRows }, 'run');
      // Hop sideways off the roof.
      for (const target of [0, 1, 2] as Lane[]) {
        if (Math.abs(target - s.lane) !== 1) continue;
        if (at(target) === 'free')
          emit({ lane: s.lane, mode: 'shift', v: target, k: 1, cool: tm.dropRows }, 'shift');
      }
      return;
    }
  }
}

function airStep(
  s: PlanState,
  sched: readonly ('clear' | 'air')[],
  here: Kind,
  recover: number,
  emit: (s: PlanState, a: string) => void,
): void {
  const st = sched[s.k];
  if (st === undefined) return;
  if (here === 'over' || here === 'block' || here === 'plat') return;
  if (here === 'low' && st !== 'clear') return;
  const k = s.k + 1;
  if (k >= sched.length)
    emit({ lane: s.lane, mode: 'run', v: 0, k: 0, cool: recover }, s.k === 0 ? 'jump' : 'air');
  else emit({ ...s, k }, s.k === 0 ? 'jump' : 'air');
}

function slideStep(
  s: PlanState,
  sched: readonly boolean[],
  here: Kind,
  recover: number,
  emit: (s: PlanState, a: string) => void,
): void {
  const ok = sched[s.k];
  if (ok === undefined) return;
  if (here === 'low' || here === 'block' || here === 'plat' || here === 'ramp') return;
  if (here === 'over' && !ok) return;
  const k = s.k + 1;
  if (k >= sched.length)
    emit({ lane: s.lane, mode: 'run', v: 0, k: 0, cool: recover }, s.k === 0 ? 'slide' : 'sliding');
  else emit({ ...s, k }, s.k === 0 ? 'slide' : 'sliding');
}

function shiftStep(
  s: PlanState,
  row: Row,
  tm: Timing,
  emit: (s: PlanState, a: string) => void,
): void {
  const target = s.v as Lane;
  const lo = Math.min(s.lane, target);
  const hi = Math.max(s.lane, target);
  const fromRoof = s.k > 0 && s.mode === 'shift' && s.cool > 0 && cellKind(row[s.lane]) === 'plat';
  for (let l = lo; l <= hi; l++) {
    const kind = cellKind(row[l as Lane]);
    if (kind !== 'free' && !(fromRoof && l === s.lane)) return;
  }
  const need = Math.abs(target - s.lane) === 2 ? tm.shift2 : tm.shift1;
  const k = s.k + 1;
  if (k >= need) emit({ lane: target, mode: 'run', v: 0, k: 0, cool: s.cool }, 'shift');
  else emit({ ...s, k }, s.k === 0 ? 'shift' : 'shifting');
}

/** Run the search over all rows. Returns the surviving end states (empty = unfair). */
export function propagate(
  rows: readonly Row[],
  from: readonly PlanState[],
  tm: Timing,
): PlanState[] {
  let cur = new Map<string, PlanState>();
  for (const s of from) cur.set(key(s), s);
  for (let i = 0; i < rows.length; i++) {
    const next = new Map<string, PlanState>();
    for (const s of cur.values())
      stepRow(s, rows, i, tm, (n) => {
        next.set(key(n), n);
      });
    if (next.size === 0) return [];
    cur = next;
  }
  return [...cur.values()];
}

export interface Validation {
  ok: boolean;
  reason?: string;
}

function speedsFor(tier: number): number[] {
  const r = tierSpeedRange(tier);
  return [r.min, (r.min + r.max) / 2, r.max];
}

export function validatePattern(p: Pattern, tier: number): Validation {
  // Static rules.
  for (let i = 0; i < p.rows.length; i++) {
    const row = p.rows[i];
    if (!row) continue;
    for (const l of [0, 1, 2] as Lane[]) {
      if (row[l] === 'R') {
        const prev = p.rows[i - 1];
        if (!prev || (prev[l] !== 'r' && prev[l] !== 'R'))
          return { ok: false, reason: `row ${i}: platform in lane ${l} without a ramp before it` };
      }
    }
    // Rule 1: some lane can be passed by running, jumping or sliding.
    if (!row.some((c) => cellKind(c) !== 'block' && c !== 'R'))
      if (!row.some((c, l) => c === 'R' && p.rows[i - 1]?.[l as Lane] !== undefined))
        return { ok: false, reason: `row ${i}: no passable lane` };
  }
  for (const speed of speedsFor(tier)) {
    const end = propagate(p.rows, startStates(), timingFor(speed));
    if (end.length === 0) return { ok: false, reason: `unreachable at ${speed.toFixed(1)} m/s` };
  }
  return { ok: true };
}

export function validateJunction(a: Pattern, b: Pattern, tier: number): Validation {
  for (const speed of speedsFor(tier)) {
    const tm = timingFor(speed);
    const mid = propagate(a.rows, startStates(), tm);
    if (propagate(b.rows, mid, tm).length === 0)
      return { ok: false, reason: `${a.id} -> ${b.id} unreachable at ${speed.toFixed(1)} m/s` };
  }
  return { ok: true };
}
