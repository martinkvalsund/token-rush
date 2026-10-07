import { TUNING, laneX, type Lane } from '../data/tuning';
import { OBSTACLE_INDEX, obstacleKind, type ObstacleId } from '../data/obstacles';
import { ADVANCED_PATTERN_DEFS, PATTERN_DEFS } from '../data/patterns';
import { ZONES, flightHeight } from '../data/zones';
import { SIGNS } from '../data/signs';
import type { Rng } from '../core/rng';
import { buildPatterns, type Pattern, type Row } from './pattern';
import { propagate, startStates, timingFor, type PlanState, type Timing } from './fairness';
import { tierAt, tierSpeedRange, zoneAt } from './difficulty';
import { Pool } from './pool';
import {
  POWERUP_TYPES,
  type Obstacle,
  type Pickup,
  type PowerupType,
  type Scenery,
  type Token,
} from './entities';

export const PATTERNS: readonly Pattern[] = buildPatterns([
  ...PATTERN_DEFS,
  ...ADVANCED_PATTERN_DEFS,
]);
const REST = PATTERNS.find((p) => p.id === 'rest-line-c');
const EMPTY_ROW: Row = ['.', '.', '.'];
/** How far past its due distance a power-up may wait for a 'P' spot before being placed anyway. */
const POWERUP_SLACK = 120;
const ANY_LANE: readonly PlanState[] = startStates();
const GATE_ROWS: readonly Row[] = [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW];

export interface EmittedRow {
  at: number;
  row: Row;
  patternId: string;
}

export interface World {
  obstacles: Pool<Obstacle>;
  tokens: Pool<Token>;
  pickups: Pool<Pickup>;
  scenery: Pool<Scenery>;
}

/** Turns patterns into entities ahead of the player, validating every join. */
export class Generator {
  /** Track distance of the next row to emit. */
  cursor = 0;
  private queue: Row[] = [];
  private queueId = '';
  private lastId = '';
  private zone = -1;
  private rowIndex = 0;
  /** Reachable states at each sample speed (see sampleSpeeds). */
  private states: PlanState[][] = SAMPLES.map(() => startStates());
  private nextPowerupAt = 0;
  private lastPowerup: PowerupType | null = null;
  /** Recently emitted rows (for the bot and debug overlay). */
  readonly history: EmittedRow[] = [];
  currentPatternId = '';
  /** Power-up types placed this run (for tests and debug). */
  readonly spawnedPowerups: PowerupType[] = [];
  /** Distance at which the jetpack sky trail ends; tokens are laid at height until then. */
  skyTrailUntil = 0;
  /**
   * Until this track position the player may come down from a jetpack in any lane, so new
   * patterns must be passable from every lane rather than from the tracked states.
   */
  anyLaneUntil = 0;

  constructor(
    private readonly world: World,
    private readonly rng: Rng,
  ) {
    this.reset();
  }

  reset(): void {
    this.cursor = 30;
    this.queue = [];
    this.lastId = '';
    this.zone = -1;
    this.rowIndex = 0;
    this.states = SAMPLES.map(() => startStates());
    const [a, b] = TUNING.powerups.firstAt;
    this.nextPowerupAt = this.rng.range(a, b);
    this.lastPowerup = null;
    this.history.length = 0;
    this.spawnedPowerups.length = 0;
    this.skyTrailUntil = 0;
    this.anyLaneUntil = 0;
  }

  /** Emit rows until the spawn horizon is filled. */
  update(distance: number): void {
    const horizon = distance + TUNING.world.spawnDistance;
    while (this.cursor < horizon) {
      if (this.queue.length === 0) {
        // Zones only change between patterns, so every pattern is emitted whole.
        const zone = zoneAt(this.cursor);
        if (zone !== this.zone) {
          if (this.zone !== -1) this.emitTransition(zone);
          this.zone = zone;
        }
        this.choosePattern();
      }
      const row = this.queue.shift() ?? EMPTY_ROW;
      this.emitRow(row, this.cursor, this.zone);
      this.cursor += TUNING.world.rowSpacing;
      this.rowIndex++;
    }
  }

  private choosePattern(): void {
    const tier = tierAt(this.cursor);
    const range = tierSpeedRange(tier);
    const candidates = PATTERNS.filter(
      (p) =>
        p.zones.includes(this.zone) &&
        p.minTier <= tier &&
        tier <= p.maxTier &&
        p.id !== this.lastId,
    );
    let total = 0;
    for (const p of candidates) total += weightOf(p, tier);
    for (let attempt = 0; attempt < 8 && candidates.length > 0; attempt++) {
      let r = this.rng.next() * total;
      let pick = candidates[0];
      for (const p of candidates) {
        r -= weightOf(p, tier);
        if (r <= 0) {
          pick = p;
          break;
        }
      }
      if (!pick) break;
      if (this.tryAccept(pick, tier, range.min, range.max)) return;
    }
    if (!REST) throw new Error('rest pattern missing');
    // The rest pattern has no obstacles, so it is passable from any state.
    this.accept(
      REST,
      sampleSpeeds(range).map((v, i) =>
        propagate(REST.rows, this.states[i] ?? startStates(), timingFor(v)),
      ),
    );
  }

  /**
   * Patterns are stored with their empty padding trimmed. Put back only as many empty rows
   * as the join needs (plus breathing room at low tiers), so the track stays dense but fair.
   */
  private tryAccept(pick: Pattern, tier: number, vMin: number, vMax: number): boolean {
    const core = trimmed(pick);
    const timings = sampleSpeeds({ min: vMin, max: vMax }).map((v) => timingFor(v));
    const minGap = Math.max(2, 4 - Math.floor(tier / 2));
    // The last emitted row goes in front as context (a moving hazard there also blocks
    // the next row), and the search starts after it.
    const prev = this.history[this.history.length - 1]?.row ?? EMPTY_ROW;
    for (let gap = minGap; gap <= 7; gap++) {
      const rows = withGap(core, gap);
      const ctx = [prev, ...rows];
      const next: PlanState[][] = [];
      let ok = true;
      for (let i = 0; i < timings.length && ok; i++) {
        const tm = timings[i];
        const from = this.cursor < this.anyLaneUntil ? ANY_LANE : (this.states[i] ?? startStates());
        if (!tm) continue;
        const end = propagate(ctx, from, tm, 1);
        ok = end.length > 0 && fromEveryCalmLane(ctx, from, tm);
        next.push(end);
      }
      if (!ok) continue;
      this.accept(pick, next, rows);
      return true;
    }
    return false;
  }

  private accept(p: Pattern, states: PlanState[][], rows: readonly Row[] = p.rows): void {
    this.queue = [...rows];
    this.queueId = p.id;
    this.lastId = p.id;
    this.states = states.map((st) => (st.length > 0 ? st : startStates()));
  }

  private emitTransition(zone: number): void {
    const gate = ZONES[zone]?.id === 'tunnel' ? 'tunnel_portal' : 'site_gate';
    this.addScenery(gate, this.cursor, 0, 0, 1, -1, zone);
    this.queueId = 'zone-gate';
    for (let i = 0; i < GATE_ROWS.length; i++) {
      this.emitRow(EMPTY_ROW, this.cursor, zone);
      this.cursor += TUNING.world.rowSpacing;
    }
    // Carry the reachable states through the empty gate rows (do not assume any lane).
    const range = tierSpeedRange(tierAt(this.cursor));
    this.states = sampleSpeeds(range).map((v, i) =>
      propagate(GATE_ROWS, this.states[i] ?? startStates(), timingFor(v)),
    );
  }

  private emitRow(row: Row, at: number, zone: number): void {
    this.history.push({ at, row, patternId: this.queueId });
    if (this.history.length > 64) this.history.shift();
    this.currentPatternId = this.queueId;
    const zd = ZONES[zone];
    if (!zd) return;

    for (const lane of [0, 1, 2] as Lane[]) {
      const c = row[lane];
      const x = laneX(lane);
      switch (c) {
        case 'b':
        case 'j':
          this.addObstacle(this.rng.pick(zd.props.low), lane, at, zone);
          if (c === 'j')
            for (const o of [-4, -2, 0, 2, 4])
              this.addToken(at + o, x, 1.0 + 1.6 * (1 - (o / 5) ** 2));
          break;
        case 'o':
          this.addObstacle(this.rng.pick(zd.props.overhead), lane, at, zone);
          break;
        case 'X':
          this.emitBlock(lane, at, zone);
          break;
        case 'm':
          this.addObstacle(this.rng.pick(zd.props.moving), lane, at, zone);
          break;
        case 'r':
          this.addObstacle('ramp', lane, at, zone);
          break;
        case 'R':
          this.addObstacle('container_platform', lane, at, zone);
          this.addToken(at - 1, x, obstacleKind(OBSTACLE_INDEX.container_platform ?? 0).h + 1);
          this.addToken(at + 1, x, obstacleKind(OBSTACLE_INDEX.container_platform ?? 0).h + 1);
          break;
        case 'T':
          this.addToken(at - 1, x, 1);
          this.addToken(at + 1, x, 1);
          break;
        case 'P':
          if (at >= this.nextPowerupAt) this.placePowerup(at, x);
          else this.addToken(at, x, 1);
          break;
        case '?':
          this.addPickup('mystery', at, x);
          break;
        default:
          break;
      }
    }

    // Overdue power-up (no 'P' spot came along): put it on an empty cell of a quiet row.
    if (at >= this.nextPowerupAt + POWERUP_SLACK && row.every((c) => c === '.' || c === 'T')) {
      const lane = row.indexOf('.') >= 0 ? (row.indexOf('.') as Lane) : 1;
      this.placePowerup(at, laneX(lane));
    }

    // Jetpack sky trail: a line of tokens high above the track.
    if (at < this.skyTrailUntil) {
      const lane = (Math.floor(at / 24) % 3) as Lane;
      this.addToken(at - 1, laneX(lane), flightHeight(zone) + 0.9);
      this.addToken(at + 1, laneX(lane), flightHeight(zone) + 0.9);
    }

    this.emitScenery(at, zone);
  }

  /** Merge runs of X in a lane into long or short blocks. Only the first X of a run emits. */
  private emitBlock(lane: Lane, at: number, zone: number): void {
    const hist = this.history;
    const prev = hist[hist.length - 2];
    if (
      prev &&
      prev.row[lane] === 'X' &&
      prev.at === at - TUNING.world.rowSpacing &&
      this.pendingLong[lane]
    ) {
      this.pendingLong[lane] = false;
      return;
    }
    const zd = ZONES[zone];
    if (!zd) return;
    const next = this.queue[0];
    const longOk = next?.[lane] === 'X';
    const longs = zd.props.block.filter((id) => obstacleKind(OBSTACLE_INDEX[id] ?? 0).rows === 2);
    const shorts = zd.props.block.filter((id) => obstacleKind(OBSTACLE_INDEX[id] ?? 0).rows === 1);
    if (longOk && longs.length > 0 && this.rng.next() < 0.6) {
      this.addObstacle(this.rng.pick(longs), lane, at + TUNING.world.rowSpacing / 2, zone);
      this.pendingLong[lane] = true;
    } else {
      this.addObstacle(this.rng.pick(shorts.length > 0 ? shorts : zd.props.block), lane, at, zone);
      this.pendingLong[lane] = false;
    }
  }

  private readonly pendingLong: [boolean, boolean, boolean] = [false, false, false];

  private emitScenery(at: number, zone: number): void {
    const zd = ZONES[zone];
    if (!zd) return;
    if (zd.frame && this.rowIndex % zd.frame.everyRows === 0)
      this.addScenery(zd.frame.model, at, 0, 0, 1, -1, zone);
    for (const side of [-1, 1]) {
      for (const s of zd.scenery) {
        if (this.rng.next() >= s.chance) continue;
        const x = side * this.rng.range(s.minX, s.maxX);
        const isSign = s.model === 'billboard' || s.model === 'sign_post';
        const rot = s.model === 'billboard' ? (side < 0 ? 0.35 : -0.35) : this.rng.range(-0.4, 0.4);
        this.addScenery(
          s.model,
          at + this.rng.range(-1.5, 1.5),
          x,
          rot + (side > 0 && !isSign ? Math.PI : 0),
          s.scale ?? 1,
          isSign ? this.rng.int(0, SIGNS.length - 1) : -1,
          zone,
        );
        break;
      }
    }
  }

  private placePowerup(at: number, x: number): void {
    const type = this.pickPowerup();
    this.spawnedPowerups.push(type);
    this.addPickup(type, at, x);
    const [a, b] = TUNING.powerups.every;
    this.nextPowerupAt = at + this.rng.range(a, b);
  }

  private pickPowerup(): PowerupType {
    const w = TUNING.powerups.weights;
    const options = POWERUP_TYPES.filter((t) => t !== this.lastPowerup);
    let total = 0;
    for (const t of options) total += w[t];
    let r = this.rng.next() * total;
    for (const t of options) {
      r -= w[t];
      if (r <= 0) {
        this.lastPowerup = t;
        return t;
      }
    }
    return 'magnet';
  }

  addObstacle(id: ObstacleId, lane: Lane, at: number, zone: number): Obstacle | undefined {
    const index = OBSTACLE_INDEX[id];
    if (index === undefined) return undefined;
    const k = obstacleKind(index);
    const o = this.world.obstacles.spawn();
    if (!o) return undefined;
    o.kind = index;
    o.cls = k.cls;
    o.severity = k.severity;
    o.move = k.move;
    o.lane = lane;
    o.at = at;
    o.x = laneX(lane);
    o.z = -1000;
    o.bottom = k.bottom;
    o.w = k.w;
    o.h = k.h;
    o.d = k.d;
    o.hit = false;
    o.warned = false;
    o.ox = false;
    o.oz = false;
    o.zone = zone;
    return o;
  }

  addToken(at: number, x: number, y: number): void {
    const t = this.world.tokens.spawn();
    if (!t) return;
    t.at = at;
    t.x = x;
    t.y = y;
    t.z = -1000;
    t.magnet = false;
  }

  addPickup(type: PowerupType, at: number, x: number): void {
    const p = this.world.pickups.spawn();
    if (!p) return;
    p.type = type;
    p.at = at;
    p.x = x;
    p.y = 1.1;
    p.z = -1000;
  }

  private addScenery(
    model: string,
    at: number,
    x: number,
    rotY: number,
    scale: number,
    label: number,
    zone: number,
  ): void {
    const s = this.world.scenery.spawn();
    if (!s) return;
    s.model = model;
    s.at = at;
    s.x = x;
    s.z = -1000;
    s.rotY = rotY;
    s.scale = scale;
    s.label = label;
    s.zone = zone;
  }
}

/** Joins are validated as if the game ran this much faster than the tier's top speed. */
const JOIN_SPEED_MARGIN = 1.12;
/**
 * Feasibility is not monotonic in speed (one long slide can cover two bars at top speed,
 * two short slides fit at low speed, neither in between), so joins are checked at several
 * speeds across the tier's range.
 */
const SAMPLES = [0, 0.25, 0.5, 0.75, 1, 1.12] as const;
function sampleSpeeds(range: { min: number; max: number }): number[] {
  return SAMPLES.map((f) =>
    f <= 1 ? range.min + (range.max - range.min) * f : range.max * JOIN_SPEED_MARGIN,
  );
}
const trimCache = new Map<string, readonly Row[]>();
const isEmpty = (r: Row) => r[0] === '.' && r[1] === '.' && r[2] === '.';

/** A pattern's rows without leading and trailing all-empty rows. */
function trimmed(p: Pattern): readonly Row[] {
  let t = trimCache.get(p.id);
  if (!t) {
    let a = 0;
    let b = p.rows.length;
    while (a < b && p.rows[a] && isEmpty(p.rows[a] as Row)) a++;
    while (b > a && p.rows[b - 1] && isEmpty(p.rows[b - 1] as Row)) b--;
    t = p.rows.slice(a, b);
    trimCache.set(p.id, t);
  }
  return t;
}

function withGap(core: readonly Row[], gap: number): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < gap; i++) out.push(EMPTY_ROW);
  for (const r of core) out.push(r);
  return out;
}

/**
 * Stronger join rule: whichever lane the player ends the previous pattern in (while
 * running), the new pattern must still be passable. Otherwise a choice made before the
 * new rows were visible could become a dead end.
 */
function fromEveryCalmLane(
  rows: readonly Row[],
  states: readonly PlanState[],
  tm: Timing,
): boolean {
  for (const lane of [0, 1, 2] as Lane[]) {
    let worst: PlanState | undefined;
    for (const st of states)
      if (st.mode === 'run' && st.lane === lane && (!worst || st.cool > worst.cool)) worst = st;
    if (worst && propagate(rows, [worst], tm, 1).length === 0) return false;
  }
  return true;
}

/** Harder patterns become more likely as the tier rises. */
function weightOf(p: Pattern, tier: number): number {
  const hard = p.minTier >= 2 || p.tags?.includes('moving');
  // Ramps are a breather (no input needed), so they never get the hard-pattern boost.
  if (p.tags?.includes('ramp')) return p.weight * 0.7;
  const rest = p.tags?.includes('rest');
  let w = p.weight;
  if (hard) w *= 1 + tier * 0.3;
  if (rest) w *= Math.max(0.3, 1 - tier * 0.1);
  // Patterns that never touch the centre let a player sit there; fade them out as tiers rise.
  if (!rest && !touchesCentre(p)) w *= Math.max(0.25, 1 - tier * 0.1);
  return w;
}

const centreCache = new Map<string, boolean>();
function touchesCentre(p: Pattern): boolean {
  let hit = centreCache.get(p.id);
  if (hit === undefined) {
    hit = p.rows.some((r) => !['.', 'T', 'P', '?'].includes(r[1]));
    centreCache.set(p.id, hit);
  }
  return hit;
}
