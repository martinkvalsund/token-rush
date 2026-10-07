import { TUNING } from '../data/tuning';
import { Rng } from '../core/rng';
import { EventQueue } from './events';
import {
  createPlayer,
  queueCommand,
  stepPlayer,
  type PlayerCommand,
  type PlayerState,
} from './player';
import { speedAt } from './speed';
import { Generator, type World } from './generator';
import { Pool } from './pool';
import { newObstacle, newPickup, newScenery, newToken } from './entities';
import { tierAt, zoneAt } from './difficulty';

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
  private readonly ctx = { superJump: false, groundAt: (_x: number) => 0 };

  constructor(readonly seed: number) {
    this.rng = new Rng(seed);
    this.generator = new Generator(this.world, this.rng);
    this.reset();
  }

  reset(): void {
    this.player = createPlayer();
    this.elapsed = 0;
    this.distance = 0;
    this.speed = TUNING.speed.start;
    this.tier = 0;
    this.zone = 0;
    this.events.clear();
    for (const pool of Object.values(this.world)) pool.clear();
    this.generator.reset();
    this.generator.update(0);
  }

  command(cmd: PlayerCommand): void {
    queueCommand(this.player, cmd);
  }

  step(dt: number): void {
    this.elapsed += dt;
    this.speed = speedAt(this.elapsed);
    this.distance += this.speed * dt;
    const tier = tierAt(this.distance);
    if (tier !== this.tier) this.events.push('tier', tier);
    this.tier = tier;
    const zone = zoneAt(this.distance);
    if (zone !== this.zone) this.events.push('zone', zone);
    this.zone = zone;

    this.generator.update(this.distance);
    this.updateEntities();
    stepPlayer(this.player, dt, this.ctx, this.events);
  }

  /** Treadmill: derive z from track position and recycle what is behind the camera. */
  private updateEntities(): void {
    const d = this.distance;
    const behind = TUNING.world.despawnBehind;
    for (const o of this.world.obstacles.items) {
      if (!o.active) continue;
      o.z = d - o.at;
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
