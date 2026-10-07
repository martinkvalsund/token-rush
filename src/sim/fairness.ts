import { TUNING, type Lane } from '../data/tuning';
import type { Cell, Pattern, Row } from './pattern';
import { tierSpeedRange } from './difficulty';

/**
 * Row-level reachability search used by the generator, the tests and the bot.
 * A state describes what the player is doing as they reach the next row.
 */
export type Mode = 'run' | 'air' | 'slide' | 'shift' | 'roof' | 'dive';

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
  /**
   * For each take-off variant and air row: rows still passed in the air if the player
   * fast-falls (presses slide) right after that row. Landing turns into a roll (a slide).
   */
  dive: number[][];
  /** For each slide variant: per row offset, whether an overhead may pass at that row. */
  slide: boolean[][];
  /**
   * Allow expert moves (fast-fall dives, lane changes mid-air or mid-slide). The generator
   * validates without them so fairness never depends on tricks; the bot may use them.
   */
  advanced: boolean;
  shift1: number;
  shift2: number;
  recover: number;
  dropRows: number;
}

const F = TUNING.fairness;
const P = TUNING.player;
/** Take-off (or slide start) lead before the first row of the action, in rows. */
export const VARIANTS = [0.25, 0.5, 0.75, 1];
const timingCache = new Map<number, Timing>();

/** Whole rows needed to cover a duration (tolerant of float noise like 3.0000000000000004). */
const rowsFor = (seconds: number, dt: number): number => Math.ceil(seconds / dt - 1e-6);

export function timingFor(speed: number, superJump = false, advanced = false): Timing {
  const key = Math.round(speed * 100) * 4 + (superJump ? 1 : 0) + (advanced ? 2 : 0);
  const hit = timingCache.get(key);
  if (hit) return hit;
  const dt = TUNING.world.rowSpacing / speed;
  // Half the time an obstacle overlaps the player (deepest low/overhead obstacle + hitbox).
  const halfLow = (1.4 / 2 + P.depth / 2) / speed;
  const halfOver = (1.2 / 2 + P.depth / 2) / speed;
  const jv = superJump ? P.superJumpVelocity : P.jumpVelocity;
  const airtime = (2 * jv) / P.gravity;
  // Window where the feet are above a 0.9 m obstacle.
  const disc = Math.sqrt(Math.max(0, jv * jv - 2 * P.gravity * 0.95));
  const clearFrom = superJump ? (jv - disc) / P.gravity : F.jumpClearFrom;
  const clearTo = superJump ? (jv + disc) / P.gravity : F.jumpClearTo;
  const air = VARIANTS.map((f) => {
    const tau = f * dt;
    const rows: ('clear' | 'air')[] = [];
    for (let k = 0; tau + k * dt < airtime; k++) {
      const t = tau + k * dt;
      // Obstacles have depth: the feet must be high for the whole overlap, not just its centre.
      rows.push(t - halfLow >= clearFrom && t + halfLow <= clearTo ? 'clear' : 'air');
    }
    return rows;
  });
  const g2 = P.gravity * P.fastFallMultiplier;
  const dive = VARIANTS.map((f) => {
    const tau = f * dt;
    const rows: number[] = [];
    for (let k = 0; tau + k * dt < airtime; k++) {
      const t = tau + k * dt + 0.02;
      const y = Math.max(0, jv * t - (P.gravity * t * t) / 2);
      const u = Math.max(0, -(jv - P.gravity * t));
      const fall = (-u + Math.sqrt(u * u + 2 * g2 * y)) / g2;
      rows.push(Math.floor(fall / dt));
    }
    return rows;
  });
  const slide = VARIANTS.map((f) => {
    const tau = f * dt;
    const rows: boolean[] = [];
    for (let k = 0; tau + k * dt < P.slideDuration; k++) {
      const t = tau + k * dt;
      rows.push(t - halfOver >= F.slideLead && t + halfOver <= P.slideDuration);
    }
    return rows;
  });
  const t: Timing = {
    speed,
    air,
    dive,
    slide,
    advanced,
    shift1: rowsFor(F.laneChange1, dt),
    shift2: rowsFor(F.laneChange2, dt),
    recover: rowsFor(F.actionRecovery, dt),
    dropRows: rowsFor(Math.sqrt((2 * 2.6) / P.gravity), dt),
  };
  timingCache.set(key, t);
  return t;
}

/**
 * Kind of a cell for planning. Moving hazards are long (a 7 m truck) and close fast, so they
 * also block the rows directly before and after their own row in that lane.
 */
export function kindAt(rows: readonly Row[], i: number, lane: Lane): Kind {
  const here = rows[i]?.[lane];
  const k = here === undefined ? 'free' : cellKind(here);
  if (k !== 'free') return k;
  if (rows[i - 1]?.[lane] === 'm' || rows[i + 1]?.[lane] === 'm') return 'block';
  return k;
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
  const at = (l: Lane) => kindAt(rows, i, l);
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
          airStep(
            { ...s, mode: 'air', v, k: 0 },
            sched,
            here,
            tm.recover,
            emit,
            tm.advanced ? tm.dive[v] : undefined,
          ),
        );
        // Slide.
        tm.slide.forEach((sched, v) =>
          slideStep({ ...s, mode: 'slide', v, k: 0 }, sched, here, tm.recover, emit),
        );
      }
      // Lane shifts.
      for (const target of [0, 1, 2] as Lane[]) {
        if (target === s.lane) continue;
        shiftStep({ ...s, mode: 'shift', v: target, k: 0, cool }, rows, i, tm, emit);
      }
      return;
    }
    case 'air': {
      const sched = tm.air[s.v];
      if (sched)
        airStep(s, sched, at(s.lane), tm.recover, emit, tm.advanced ? tm.dive[s.v] : undefined);
      // Lane changes work in the air too; the rest of the jump becomes cooldown.
      if (tm.advanced && sched && s.k > 0)
        shiftFromAction(s, sched.length - s.k, rows, i, tm, emit);
      return;
    }
    case 'dive': {
      // v = rows still to pass in the air; at 0 the player has landed and is rolling.
      const here = at(s.lane);
      if (s.v === 0) {
        const roll = tm.slide[1];
        if (roll)
          slideStep(
            { lane: s.lane, mode: 'slide', v: 1, k: 0, cool: 0 },
            roll,
            here,
            tm.recover,
            emit,
            'roll',
          );
        return;
      }
      if (here === 'free') emit({ ...s, v: s.v - 1 }, 'diving');
      return;
    }
    case 'slide': {
      const sched = tm.slide[s.v];
      if (sched) slideStep(s, sched, at(s.lane), tm.recover, emit);
      if (tm.advanced && sched && s.k > 0)
        shiftFromAction(s, sched.length - s.k, rows, i, tm, emit);
      return;
    }
    case 'shift':
      shiftStep({ ...s, cool }, rows, i, tm, emit);
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
  dive?: readonly number[],
): void {
  const st = sched[s.k];
  if (st === undefined) return;
  if (here === 'over' || here === 'block' || here === 'plat') return;
  if (here === 'low' && st !== 'clear') return;
  const label = s.k === 0 ? `jump${s.v}` : 'air';
  const k = s.k + 1;
  if (k >= sched.length) {
    emit({ lane: s.lane, mode: 'run', v: 0, k: 0, cool: recover }, label);
    return;
  }
  emit({ ...s, k }, label);
  // Fast-fall after this row: drop quickly and roll on landing.
  const rowsLeft = dive?.[s.k];
  if (s.k > 0 && rowsLeft !== undefined && rowsLeft < sched.length - k)
    emit({ lane: s.lane, mode: 'dive', v: rowsLeft, k: 0, cool: 0 }, 'dive');
}

function slideStep(
  s: PlanState,
  sched: readonly boolean[],
  here: Kind,
  recover: number,
  emit: (s: PlanState, a: string) => void,
  startLabel?: string,
): void {
  const ok = sched[s.k];
  if (ok === undefined) return;
  if (here === 'low' || here === 'block' || here === 'plat' || here === 'ramp') return;
  if (here === 'over' && !ok) return;
  const k = s.k + 1;
  const label = s.k === 0 ? (startLabel ?? `slide${s.v}`) : 'sliding';
  if (k >= sched.length) emit({ lane: s.lane, mode: 'run', v: 0, k: 0, cool: recover }, label);
  else emit({ ...s, k }, label);
}

function shiftFromAction(
  s: PlanState,
  rowsLeft: number,
  rows: readonly Row[],
  i: number,
  tm: Timing,
  emit: (s: PlanState, action: string) => void,
): void {
  for (const target of [0, 1, 2] as Lane[]) {
    if (target === s.lane) continue;
    shiftStep(
      { lane: s.lane, mode: 'shift', v: target, k: 0, cool: rowsLeft + tm.recover },
      rows,
      i,
      tm,
      emit,
    );
  }
}

function shiftStep(
  s: PlanState,
  rows: readonly Row[],
  i: number,
  tm: Timing,
  emit: (s: PlanState, action: string) => void,
): void {
  const target = s.v as Lane;
  const lo = Math.min(s.lane, target);
  const hi = Math.max(s.lane, target);
  const row = rows[i];
  if (!row) return;
  const fromRoof = s.k > 0 && s.mode === 'shift' && s.cool > 0 && cellKind(row[s.lane]) === 'plat';
  for (let l = lo; l <= hi; l++) {
    const kind = kindAt(rows, i, l as Lane);
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
  start = 0,
): PlanState[] {
  let cur = new Map<string, PlanState>();
  for (const s of from) cur.set(key(s), s);
  for (let i = start; i < rows.length; i++) {
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

export interface PlanStep {
  /** Index into the rows array. */
  row: number;
  from: PlanState;
  to: PlanState;
  action: string;
}

/**
 * Like propagate, but remembers how each state was reached and returns one surviving path
 * (one step per row). Prefers the first-found transitions: staying in lane, then jumping,
 * sliding, and finally shifting lanes. Returns null if every path dies.
 */
export function planPath(rows: readonly Row[], start: PlanState, tm: Timing): PlanStep[] | null {
  type Node = { s: PlanState; parent: Node | null; action: string; row: number };
  let cur = new Map<string, Node>([
    [key(start), { s: start, parent: null, action: 'start', row: -1 }],
  ]);
  for (let i = 0; i < rows.length; i++) {
    const next = new Map<string, Node>();
    for (const node of cur.values())
      stepRow(node.s, rows, i, tm, (n, action) => {
        const k = key(n);
        if (!next.has(k)) next.set(k, { s: n, parent: node, action, row: i });
      });
    if (next.size === 0) return null;
    cur = next;
  }
  // Prefer ending in a flexible state (running, no cooldown, centre lane): the rows after
  // the planning horizon are unknown, and the centre reaches every lane fastest.
  const score = (st: PlanState) =>
    (st.mode === 'run' ? 4 : 0) + (st.cool === 0 ? 1 : 0) + (st.lane === 1 ? 2 : 0);
  let best: Node | undefined;
  for (const n of cur.values()) if (!best || score(n.s) > score(best.s)) best = n;
  const steps: PlanStep[] = [];
  for (let n = best; n && n.parent; n = n.parent)
    steps.push({ row: n.row, from: n.parent.s, to: n.s, action: n.action });
  return steps.reverse();
}

export interface Validation {
  ok: boolean;
  reason?: string;
}

/** Feasibility is not monotonic in speed, so check several speeds across the tier. */
function speedsFor(tier: number): number[] {
  const r = tierSpeedRange(tier);
  return [0, 0.25, 0.5, 0.75, 1].map((f) => r.min + (r.max - r.min) * f);
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
