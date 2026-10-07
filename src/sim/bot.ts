import { TUNING, type Lane } from '../data/tuning';
import type { Rng } from '../core/rng';
import type { Row } from './pattern';
import { VARIANTS, kindAt, planPath, timingFor, type PlanState, type PlanStep } from './fairness';
import type { PlayerCommand } from './player';
import type { Sim } from './sim';

export interface BotOptions {
  /** Seconds between deciding and the command reaching the game (human reaction lag). */
  reaction: number;
  /** Chance per action of pressing late (a "human" mistake). */
  mistakeRate: number;
  /** How late a mistaken press is, in seconds (uniform between the two values). */
  mistakeDelay: readonly [number, number];
  /** Chance per action of not reacting at all (the player simply misses it). */
  missRate: number;
  /** Seconds of track ahead the player takes into account (Infinity = everything generated). */
  lookahead: number;
}

export const PERFECT: BotOptions = {
  reaction: 0,
  mistakeRate: 0,
  mistakeDelay: [0, 0],
  missRate: 0,
  lookahead: Infinity,
};
/** A decent but non-perfect player: now and then reacts noticeably late. */
export const HUMAN: BotOptions = {
  reaction: 0.03,
  mistakeRate: 0.03,
  mistakeDelay: [0.1, 0.25],
  missRate: 0.006,
  lookahead: Infinity,
};

const ROW = TUNING.world.rowSpacing;

function laneSpanFree(rows: readonly Row[], i: number, lo: number, hi: number): boolean {
  for (let l = lo; l <= hi; l++) if (kindAt(rows, i, l as Lane) !== 'free') return false;
  return true;
}
const EMPTY: Row = ['.', '.', '.'];

/**
 * Autoplay: plans a path through the upcoming rows with the same search the fairness
 * validator uses, then times jumps, slides and lane changes against the real track.
 */
export class Bot {
  private steps: PlanStep[] = [];
  private rowsAt: number[] = [];
  /** Track position of the last row already reached (its obstacles may still be alongside). */
  private passedAt = -Infinity;
  private readonly rows: Row[] = [];
  private readonly pending: { cmd: PlayerCommand; at: number }[] = [];
  private time = 0;
  private committedRow = -1;
  /** Track position of a row whose action this (non-perfect) bot decided to miss. */
  private missedAt = -1;
  failedPlans = 0;
  /** Stats for balancing runs. */
  misses = 0;
  latePresses = 0;
  presses = 0;

  constructor(
    private readonly opts: BotOptions = PERFECT,
    private readonly rng?: Rng,
  ) {}

  reset(): void {
    this.steps = [];
    this.pending.length = 0;
    this.time = 0;
    this.committedRow = -1;
  }

  /** Decide this tick; sends commands to the sim (after the reaction delay). */
  update(sim: Sim, dt: number): void {
    this.time += dt;
    let delivered = false;
    for (let i = 0; i < this.pending.length;) {
      const p = this.pending[i];
      if (p && p.at <= this.time) {
        sim.command(p.cmd);
        this.pending.splice(i, 1);
        delivered = true;
      } else i++;
    }
    // Let the sim apply what was just sent before deciding again.
    if (delivered || !sim.alive || this.pending.length > 0) return;
    const p = sim.player;
    if (p.flying || p.bufferCount > 0 || this.time < this.frozenUntil) return;
    const { start, max } = TUNING.speed;
    this.pressure = 0.4 + 1.6 * Math.max(0, (sim.speed - start) / (max - start));
    const free = p.grounded && !p.sliding && p.laneT >= 1;
    if (free) this.replan(sim);
    this.act(sim);
  }

  private replan(sim: Sim): void {
    const d = sim.distance;
    this.rows.length = 0;
    this.rowsAt = [];
    this.passedAt = -Infinity;
    const seen = d + this.opts.lookahead * Math.max(1, sim.speed);
    for (const h of sim.generator.history) {
      if (h.at <= d + 0.3) {
        this.passedAt = Math.max(this.passedAt, h.at);
        continue;
      }
      this.rows.push(h.at <= seen ? h.row : EMPTY);
      this.rowsAt.push(h.at);
    }
    // Empty road before the first generated row (start of a run) counts as free rows.
    const first = this.rowsAt[0];
    if (first !== undefined) {
      const gap = Math.floor((first - d - 0.3) / ROW);
      for (let i = 1; i <= gap; i++) {
        this.rows.unshift(EMPTY);
        this.rowsAt.unshift(first - i * ROW);
      }
    }
    const onRoof = sim.player.y > 1.5;
    const start: PlanState = {
      lane: sim.player.lane,
      mode: onRoof ? 'roof' : 'run',
      v: 0,
      k: 0,
      cool: 0,
    };
    const plan = planPath(
      this.rows,
      start,
      timingFor(Math.max(1, sim.speed), sim.powerups.active('boots'), true),
    );
    if (plan) this.steps = plan;
    else {
      this.failedPlans++;
      this.steps = [];
    }
    this.committedRow = -1;
  }

  /** Decide once per initiating action whether the player misses it entirely. */
  private shouldMiss(st: PlanStep, at: number): boolean {
    if (!this.rng || this.opts.missRate <= 0) return false;
    const initiating =
      st.action.startsWith('jump') ||
      st.action.startsWith('slide') ||
      st.action === 'dive' ||
      st.to.mode === 'shift' ||
      st.to.lane !== st.from.lane;
    if (!initiating || this.decided.has(at)) return false;
    this.decided.add(at);
    if (this.decided.size > 64) this.decided.clear();
    if (this.rng.next() >= this.opts.missRate * this.pressure) return false;
    this.missedAt = at;
    this.misses++;
    // A miss is a lapse of attention: no reaction at all for a moment.
    this.frozenUntil = this.time + 0.4;
    return true;
  }

  private readonly decided = new Set<number>();
  /** Mistakes get likelier as the game speeds up (0.4x at start speed, 2x at max). */
  private pressure = 1;
  private frozenUntil = 0;

  private send(cmd: PlayerCommand, mistakeAllowed = true): void {
    this.presses++;
    let delay = this.opts.reaction;
    if (mistakeAllowed && this.rng && this.rng.next() < this.opts.mistakeRate * this.pressure) {
      this.latePresses++;
      const [lo, hi] = this.opts.mistakeDelay;
      delay += lo + (hi - lo) * this.rng.next();
    }
    if (delay <= 0) {
      this.pending.push({ cmd, at: this.time });
      return;
    }
    this.pending.push({ cmd, at: this.time + delay });
  }

  private act(sim: Sim): void {
    const d = sim.distance;
    const speed = Math.max(1, sim.speed);
    const dtRow = ROW / speed;
    for (const st of this.steps) {
      if (st.row <= this.committedRow) continue;
      const at = this.rowsAt[st.row];
      if (at === undefined) continue;
      if (at === this.missedAt) continue;
      if (this.shouldMiss(st, at)) return;
      if (st.action === 'dive') {
        // Fast-fall once the row cleared in the air is behind us.
        if (d >= at + 1.0) {
          this.send('slide', false);
          this.committedRow = st.row;
        }
        return;
      }
      if (at <= d) continue;
      const startsShift =
        st.to.mode === 'shift' || (st.to.mode === 'run' && st.to.lane !== st.from.lane);
      if (startsShift && st.from.mode !== 'shift') {
        const target = (st.to.mode === 'shift' ? st.to.v : st.to.lane) as Lane;
        // Change lanes as early as the rows allow rather than at the last moment the plan
        // found: the plan's timing is brittle as speed creeps up.
        let first = st.row;
        const lo = Math.min(st.from.lane, target);
        const hi = Math.max(st.from.lane, target);
        while (first > 0 && laneSpanFree(this.rows, first - 1, lo, hi)) first--;
        const prevAt = first > 0 ? this.rowsAt[first - 1] : this.passedAt;
        if (prevAt !== undefined && d < prevAt + 2.0) return;
        const lane = sim.player.lane;
        if (target === lane) return;
        const cmd: PlayerCommand = target < lane ? 'left' : 'right';
        this.send(cmd);
        if (Math.abs(target - lane) === 2) this.send(cmd, false);
        this.committedRow = st.row;
        return;
      }
      const isJump = st.action.startsWith('jump');
      if (isJump || st.action.startsWith('slide')) {
        const variant = Number(st.action.slice(isJump ? 4 : 5));
        const lead = (VARIANTS[variant] ?? 0.5) * dtRow;
        const tta = (at - d) / speed;
        // Commands reach the sim one tick after they are sent.
        if (tta <= lead + 2 / 60) {
          this.send(isJump ? 'jump' : 'slide');
          this.committedRow = st.row;
        }
        return;
      }
    }
  }
}
