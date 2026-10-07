import { TUNING, laneX, type Lane } from '../data/tuning';
import { OBSTACLE_INDEX, obstacleKind, type ObstacleId } from '../data/obstacles';
import { PATTERN_DEFS } from '../data/patterns';
import { ZONES } from '../data/zones';
import { SIGNS } from '../data/signs';
import type { Rng } from '../core/rng';
import { buildPatterns, type Pattern, type Row } from './pattern';
import { propagate, startStates, timingFor, type PlanState } from './fairness';
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

export const PATTERNS: readonly Pattern[] = buildPatterns(PATTERN_DEFS);
const REST = PATTERNS.find((p) => p.id === 'rest-line-c');
const EMPTY_ROW: Row = ['.', '.', '.'];

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
  private statesSlow: PlanState[] = startStates();
  private statesFast: PlanState[] = startStates();
  private nextPowerupAt = 0;
  private lastPowerup: PowerupType | null = null;
  /** Recently emitted rows (for the bot and debug overlay). */
  readonly history: EmittedRow[] = [];
  currentPatternId = '';
  /** Distance at which the jetpack sky trail ends; tokens are laid at height until then. */
  skyTrailUntil = 0;

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
    this.statesSlow = startStates();
    this.statesFast = startStates();
    const [a, b] = TUNING.powerups.firstAt;
    this.nextPowerupAt = this.rng.range(a, b);
    this.lastPowerup = null;
    this.history.length = 0;
    this.skyTrailUntil = 0;
  }

  /** Emit rows until the spawn horizon is filled. */
  update(distance: number): void {
    const horizon = distance + TUNING.world.spawnDistance;
    while (this.cursor < horizon) {
      const zone = zoneAt(this.cursor);
      if (zone !== this.zone) {
        if (this.zone !== -1) this.emitTransition(zone);
        this.zone = zone;
        // Discard a half-emitted pattern from the previous zone.
        this.queue = [];
      }
      if (this.queue.length === 0) this.choosePattern();
      const row = this.queue.shift() ?? EMPTY_ROW;
      this.emitRow(row, this.cursor, zone);
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
      const slow = propagate(pick.rows, this.statesSlow, timingFor(range.min));
      const fast = propagate(pick.rows, this.statesFast, timingFor(range.max));
      if (slow.length > 0 && fast.length > 0) {
        this.accept(pick, slow, fast);
        return;
      }
    }
    if (!REST) throw new Error('rest pattern missing');
    // The rest pattern has no obstacles, so it is passable from any state.
    this.accept(
      REST,
      propagate(REST.rows, this.statesSlow, timingFor(range.min)),
      propagate(REST.rows, this.statesFast, timingFor(range.max)),
    );
  }

  private accept(p: Pattern, slow: PlanState[], fast: PlanState[]): void {
    this.queue = [...p.rows];
    this.queueId = p.id;
    this.lastId = p.id;
    this.statesSlow = slow.length > 0 ? slow : startStates();
    this.statesFast = fast.length > 0 ? fast : startStates();
  }

  private emitTransition(zone: number): void {
    const gate = ZONES[zone]?.id === 'tunnel' ? 'tunnel_portal' : 'site_gate';
    this.addScenery(gate, this.cursor, 0, 0, 1, -1, zone);
    for (let i = 0; i < 3; i++) {
      this.emitRow(EMPTY_ROW, this.cursor, zone);
      this.cursor += TUNING.world.rowSpacing;
    }
    // Any state is fine after three empty rows.
    this.statesSlow = startStates();
    this.statesFast = startStates();
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
          if (at >= this.nextPowerupAt) {
            this.addPickup(this.pickPowerup(), at, x);
            const [a, b] = TUNING.powerups.every;
            this.nextPowerupAt = at + this.rng.range(a, b);
          } else {
            this.addToken(at, x, 1);
          }
          break;
        case '?':
          this.addPickup('mystery', at, x);
          break;
        default:
          break;
      }
    }

    // Jetpack sky trail: a line of tokens high above the track.
    if (at < this.skyTrailUntil) {
      const lane = (Math.floor(at / 24) % 3) as Lane;
      this.addToken(at - 1, laneX(lane), TUNING.powerups.jetpackHeight + 0.9);
      this.addToken(at + 1, laneX(lane), TUNING.powerups.jetpackHeight + 0.9);
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

/** Harder patterns become more likely as the tier rises. */
function weightOf(p: Pattern, tier: number): number {
  const hard = p.minTier >= 2 || p.tags?.includes('moving') || p.tags?.includes('ramp');
  const rest = p.tags?.includes('rest');
  let w = p.weight;
  if (hard) w *= 1 + tier * 0.25;
  if (rest) w *= Math.max(0.4, 1 - tier * 0.08);
  return w;
}
