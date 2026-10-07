import * as THREE from 'three';
import { OBSTACLES } from '../data/obstacles';
import type { Sim } from '../sim/sim';
import { POWERUP_TYPES, type PowerupType } from '../sim/entities';
import { InstancedModel, type ModelLibrary } from './models/library';

export const PICKUP_MODELS: Record<PowerupType, string> = {
  magnet: 'laptop',
  jetpack: 'energy_can',
  shield: 'coffee_cup',
  double: 'ai_spark',
  boots: 'boots',
  mystery: 'mystery_box',
};
const PICKUP_COLOR: Record<PowerupType, number> = {
  magnet: 0x5ad1ff,
  jetpack: 0xc6ff00,
  shield: 0xe0c9a6,
  double: 0xff7a59,
  boots: 0xffc72c,
  mystery: 0xff6b1a,
};

const CLASS_COLOR: Record<string, number> = {
  low: 0xffc72c,
  overhead: 0xe53935,
  block: 0x546e7a,
  moving: 0xff6b1a,
  ramp: 0x8d6e63,
  platform: 0x1e88e5,
};

/** Syncs sim entities to instanced meshes every frame. */
export class EntityRenderer {
  readonly group = new THREE.Group();
  private readonly obstacleModels = new Map<string, InstancedModel>();
  private readonly obstacleModelOf: InstancedModel[] = [];
  private readonly token: InstancedModel;
  private readonly pickups = new Map<PowerupType, InstancedModel>();
  private time = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private spin = 0;

  constructor(lib: ModelLibrary) {
    for (const k of OBSTACLES) {
      let model = this.obstacleModels.get(k.model);
      if (!model) {
        const t = lib.get(k.model, [k.w, k.h, k.d], CLASS_COLOR[k.cls]);
        model = new InstancedModel(t, k.cls === 'block' || k.cls === 'platform' ? 24 : 32);
        this.obstacleModels.set(k.model, model);
        this.group.add(model.group);
      }
      this.obstacleModelOf.push(model);
    }
    this.token = new InstancedModel(lib.get('token', [0.6, 0.6, 0.12], 0xffd54f), 640, false);
    this.group.add(this.token.group);
    for (const t of POWERUP_TYPES) {
      const model = new InstancedModel(
        lib.get(PICKUP_MODELS[t], [0.8, 0.8, 0.8], PICKUP_COLOR[t]),
        4,
      );
      this.pickups.set(t, model);
      this.group.add(model.group);
    }
  }

  update(sim: Sim, renderDistance: number, dt: number): void {
    const dz = renderDistance - sim.distance;
    for (const model of this.obstacleModels.values()) model.begin();
    for (const o of sim.world.obstacles.items) {
      if (!o.active || o.z + dz < -140) continue;
      const model = this.obstacleModelOf[o.kind];
      if (!model) continue;
      const k = OBSTACLES[o.kind];
      this.p.set(o.x, o.bottom, o.z + dz);
      // Stretch platforms that cover several rows.
      this.s.set(1, 1, k && k.cls === 'platform' ? o.d / k.d : 1);
      this.q.identity();
      this.m.compose(this.p, this.q, this.s);
      model.add(this.m);
    }
    for (const model of this.obstacleModels.values()) model.end();

    this.spin += dt * 3;
    this.e.set(0, this.spin, 0);
    this.q.setFromEuler(this.e);
    this.s.set(1, 1, 1);
    this.token.begin();
    for (const t of sim.world.tokens.items) {
      if (!t.active) continue;
      this.p.set(t.x, t.y, t.z + dz);
      this.m.compose(this.p, this.q, this.s);
      this.token.add(this.m);
    }
    this.token.end();

    this.time += dt;
    for (const model of this.pickups.values()) model.begin();
    this.e.set(0.25, this.time * 2.2, 0);
    this.q.setFromEuler(this.e);
    this.s.set(1.1, 1.1, 1.1);
    for (const u of sim.world.pickups.items) {
      if (!u.active) continue;
      const model = this.pickups.get(u.type);
      if (!model) continue;
      this.p.set(u.x, u.y - 0.4 + Math.sin(this.time * 3 + u.at) * 0.15, u.z + dz);
      this.m.compose(this.p, this.q, this.s);
      model.add(this.m);
    }
    for (const model of this.pickups.values()) model.end();
  }
}
