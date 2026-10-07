import { TUNING, laneX } from '../data/tuning';
import { Rng } from '../core/rng';
import { EventQueue } from './events';
import {
  changeLane,
  createPlayer,
  queueCommand,
  stepPlayer,
  type PlayerCommand,
  type PlayerState,
} from './player';
import { speedAt } from './speed';
import { Generator, type World } from './generator';
import { Pool } from './pool';
import { newObstacle, newPickup, newScenery, newToken, type Obstacle } from './entities';
import { tierAt, zoneAt } from './difficulty';
import { classify, groundAt } from './collision';
import { Powerups, TIMED, rollMystery, type TimedPowerup } from './powerups';
import { POWERUP_TYPES, type PowerupType } from './entities';

export type DeathCause = 'none' | 'crash' | 'caught';

const L = TUNING.lives;

/** The whole game simulation. Pure: no three.js, no DOM. */
export class Sim {
  readonly events = new EventQueue();
  readonly world: World = {
    obstacles: new Pool(160, newObstacle),
    tokens: new Pool(640, newToken),
    pickups: new Pool(16, newPickup),
    scenery: new Pool(320, newScenery),
  };
  readonly rng: Rng;
  readonly generator: Generator;
  player: PlayerState = createPlayer();
  elapsed = 0;
  distance = 0;
  speed: number = TUNING.speed.start;
  tier = 0;
  zone = 0;

  /** Distance between the Tech Debt boulder and the player. */
  gap: number = L.gapFar;
  iframes = 0;
  slowTimer = 0;
  stumbleTime = 99;
  alive = true;
  cause: DeathCause = 'none';
  /** Seconds since death (drives the crash/caught sequence). */
  deadTime = 0;
  /** Debug: ignore all hits. */
  god = false;

  readonly powerups = new Powerups();
  score = 0;
  tokens = 0;
  /** Tokens picked up in a row without a long gap (raises the pickup pitch). */
  streak = 0;
  private streakTimer = 0;

  private readonly ctx = {
    superJump: false,
    groundAt: (x: number) => groundAt(this.world.obstacles.items, x, this.player.y),
  };

  constructor(readonly seed: number) {
    this.rng = new Rng(seed);
    this.generator = new Generator(this.world, this.rng);
    this.reset();
  }

  reset(seed?: number): void {
    if (seed !== undefined) this.rng.reseed(seed);
    this.player = createPlayer();
    this.elapsed = 0;
    this.distance = 0;
    this.speed = TUNING.speed.start;
    this.tier = 0;
    this.zone = 0;
    this.gap = L.gapFar;
    this.iframes = 0;
    this.slowTimer = 0;
    this.stumbleTime = 99;
    this.alive = true;
    this.cause = 'none';
    this.deadTime = 0;
    this.powerups.reset();
    this.score = 0;
    this.tokens = 0;
    this.streak = 0;
    this.streakTimer = 0;
    this.events.clear();
    for (const pool of Object.values(this.world)) pool.clear();
    this.generator.reset();
    this.generator.update(0);
  }

  command(cmd: PlayerCommand): void {
    if (this.alive) queueCommand(this.player, cmd);
  }

  /** Lives shown as hard hats: 2 when clean, 1 while the boulder is closing in. */
  get lives(): number {
    return this.gap >= L.gapFar - 0.01 ? 2 : 1;
  }

  /** Score multiplier (power-ups raise it). */
  get multiplier(): number {
    return this.powerups.active('double') ? 2 : 1;
  }

  get invulnerable(): boolean {
    return this.iframes > 0 || this.god || this.powerups.active('jetpack');
  }

  step(dt: number): void {
    if (!this.alive) {
      this.deadTime += dt;
      // The boulder rolls up to (and over) the player.
      if (this.cause === 'caught') this.gap = Math.max(-1, this.gap - dt * 10);
      else this.gap = Math.max(1.5, this.gap - dt * 8);
      return;
    }
    this.elapsed += dt;
    this.stumbleTime += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.speed = speedAt(this.elapsed) * (this.slowTimer > 0 ? 1 - L.stumbleSlowdown : 1);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * this.multiplier;
    if (this.stumbleTime > L.stumbleIFrames)
      this.gap = Math.min(L.gapFar, this.gap + L.gapRecovery * dt);

    const tier = tierAt(this.distance);
    if (tier !== this.tier) this.events.push('tier', tier);
    this.tier = tier;
    const zone = zoneAt(this.distance);
    if (zone !== this.zone) this.events.push('zone', zone);
    this.zone = zone;

    this.tickPowerups(dt);
    this.generator.update(this.distance);
    this.updateEntities();
    this.ctx.superJump = this.powerups.active('boots');
    this.player.flying = this.powerups.active('jetpack');
    stepPlayer(this.player, dt, this.ctx, this.events);
    this.collide();
    if (!this.alive) return;
    this.magnet(dt);
    this.collectTokens(dt);
    this.collectPickups();
  }

  /** Activate a power-up (pickups, mystery boxes and debug hotkeys). */
  activate(type: PowerupType): void {
    if (type === 'mystery') {
      this.powerups.mysteryTimer = TUNING.powerups.mysteryDelay;
      this.events.push('powerup', POWERUP_TYPES.indexOf(type), type);
      return;
    }
    this.powerups.activate(type);
    if (type === 'jetpack') {
      this.player.flying = true;
      this.player.sliding = false;
      this.player.rollPending = false;
      this.player.fastFall = false;
      this.generator.skyTrailUntil = this.generator.cursor + this.speed * TUNING.powerups.jetpack;
    }
    this.events.push('powerup', POWERUP_TYPES.indexOf(type), type);
  }

  private tickPowerups(dt: number): void {
    this.powerups.tick(dt, (t: TimedPowerup) => {
      if (t === 'jetpack') {
        this.player.flying = false;
        this.player.softFall = true;
        this.player.vy = 0;
        this.player.grounded = false;
        this.iframes = Math.max(this.iframes, TUNING.powerups.jetpackLandIFrames);
      }
      this.events.push('powerupEnd', TIMED.indexOf(t), t);
    });
    const pu = this.powerups;
    if (pu.mysteryTimer > 0) {
      pu.mysteryTimer -= dt;
      if (pu.mysteryTimer <= 0) {
        pu.mysteryTimer = 0;
        this.resolveMystery();
      }
    }
  }

  private resolveMystery(): void {
    const outcome = rollMystery(this.rng.next());
    if (outcome === 'powerup') {
      const t = this.rng.pick(TIMED);
      this.events.push('mystery', 0, t);
      this.activate(t);
    } else if (outcome === 'tokens') {
      const n = TUNING.powerups.mysteryTokens;
      for (let i = 0; i < n; i++) {
        const lane = i % 3;
        const row = Math.floor(i / 3);
        const at = this.distance + 8 + row * 2.2;
        this.generator.addToken(
          at,
          TUNING.world.laneX[lane as 0 | 1 | 2],
          1 + Math.sin((row / 9) * Math.PI) * 1.2,
        );
      }
      this.events.push('mystery', 1, 'tokens');
    } else {
      this.score += TUNING.powerups.mysteryScore;
      this.events.push('mystery', 2, 'score');
    }
  }

  private magnet(dt: number): void {
    if (!this.powerups.active('magnet')) return;
    const p = this.player;
    const range = TUNING.tokens.magnetRange;
    const k = Math.min(1, dt * 12);
    for (const t of this.world.tokens.items) {
      if (!t.active) continue;
      if (!t.magnet && t.z > -range && t.z < 1) t.magnet = true;
      if (!t.magnet) continue;
      t.at += (this.distance - t.at) * k;
      t.x += (p.x - t.x) * k;
      t.y += (p.y + 0.9 - t.y) * k;
      t.z = this.distance - t.at;
    }
  }

  private collectPickups(): void {
    const p = this.player;
    for (const u of this.world.pickups.items) {
      if (!u.active || Math.abs(u.z) > 1.1) continue;
      if (Math.abs(u.x - p.x) > 1.1 || Math.abs(u.y - (p.y + 0.9)) > 1.6) continue;
      u.active = false;
      this.activate(u.type);
    }
  }

  private collectTokens(dt: number): void {
    const p = this.player;
    const r = TUNING.tokens.pickupRadius;
    const bodyY = p.y + 0.9;
    this.streakTimer -= dt;
    if (this.streakTimer <= 0) this.streak = 0;
    for (const t of this.world.tokens.items) {
      if (!t.active || Math.abs(t.z) > r) continue;
      if (Math.abs(t.x - p.x) > r || Math.abs(t.y - bodyY) > r + 0.5) continue;
      t.active = false;
      this.tokens++;
      this.streak++;
      this.streakTimer = 0.6;
      this.score += TUNING.tokens.score * this.multiplier;
      this.events.push('token', this.streak);
    }
  }

  private collide(): void {
    for (const o of this.world.obstacles.items) {
      if (!o.active || Math.abs(o.z) > o.d / 2 + 2) continue;
      const hit = classify(this.player, o);
      if (hit === 'none') continue;
      o.hit = true;
      if (hit === 'side') {
        changeLane(this.player, this.player.prevLane);
        this.stumble(o);
      } else if (o.severity === 'crash') {
        this.crash(o);
      } else {
        this.stumble(o);
      }
      if (!this.alive) return;
    }
  }

  /** Returns true if the hit was absorbed by i-frames, the jetpack or the coffee shield. */
  protected absorb(): boolean {
    if (this.invulnerable) return true;
    if (this.powerups.active('shield')) {
      this.powerups.left.shield = 0;
      this.iframes = TUNING.lives.shieldIFrames;
      this.events.push('shieldBreak');
      this.events.push('powerupEnd', TIMED.indexOf('shield'), 'shield');
      return true;
    }
    return false;
  }

  private stumble(o: Obstacle): void {
    if (this.absorb()) return;
    // Caught: a second stumble before the boulder has fallen back off-screen. (The spec's
    // "gap <= GAP_NEAR" rule leaves no window, because the gap starts recovering at once.)
    if (this.gap < L.gapFar - 0.01) {
      this.die('caught', o);
      return;
    }
    this.gap = Math.max(L.gapNear, this.gap - L.stumbleGapLoss);
    this.slowTimer = L.stumbleSlowTime;
    this.iframes = L.stumbleIFrames;
    this.stumbleTime = 0;
    this.events.push('stumble', o.kind);
  }

  private crash(o: Obstacle): void {
    if (this.absorb()) return;
    this.die('crash', o);
  }

  private die(cause: 'crash' | 'caught', o: Obstacle): void {
    this.alive = false;
    this.cause = cause;
    this.deadTime = 0;
    this.speed = 0;
    this.events.push(cause, o.kind);
  }

  /** Treadmill: derive z from track position and recycle what is behind the camera. */
  private updateEntities(): void {
    const d = this.distance;
    const behind = TUNING.world.despawnBehind;
    const M = TUNING.moving;
    const v = Math.max(1, this.speed);
    for (const o of this.world.obstacles.items) {
      if (!o.active) continue;
      const ahead = o.at - d;
      switch (o.move) {
        case 'oncoming':
        case 'roll':
          // Drives towards the player but still arrives exactly at its authored row.
          o.z = -ahead * (1 + (o.move === 'oncoming' ? M.oncomingSpeed : M.rollSpeed) / v);
          break;
        case 'swing':
        case 'sweep': {
          // Pendulum phased so it is over its authored lane at the moment of arrival.
          o.z = -ahead;
          const tta = ahead / v;
          const lane = laneX(o.lane);
          const phase = Math.asin(Math.max(-1, Math.min(1, lane / M.swingAmplitude)));
          o.x = M.swingAmplitude * Math.sin(((2 * Math.PI) / M.swingPeriod) * tta + phase);
          break;
        }
        default:
          o.z = -ahead;
      }
      if (o.move !== 'none' && !o.warned && ahead / v < M.warnAhead) {
        o.warned = true;
        this.events.push('warning', o.lane, o.move);
      }
      if (o.z - o.d / 2 > behind) o.active = false;
    }
    for (const t of this.world.tokens.items) {
      if (!t.active) continue;
      t.z = d - t.at;
      if (t.z > behind) t.active = false;
    }
    for (const p of this.world.pickups.items) {
      if (!p.active) continue;
      p.z = d - p.at;
      if (p.z > behind) p.active = false;
    }
    for (const s of this.world.scenery.items) {
      if (!s.active) continue;
      s.z = d - s.at;
      if (s.z > behind + 30) s.active = false;
    }
  }
}
