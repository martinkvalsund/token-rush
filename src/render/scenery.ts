import * as THREE from 'three';
import { ZONES } from '../data/zones';
import type { Sim } from '../sim/sim';
import { InstancedModel, type ModelLibrary } from './models/library';
import { signMaterial } from './signs';

const SIGN_MODELS = new Set(['billboard', 'sign_post']);
const POOL_PER_SIGN_MODEL = 6;

interface SignSlot {
  object: THREE.Object3D;
  face: THREE.Mesh | undefined;
  label: number;
}

/** Side props, zone frames (tunnel rings, bridge trusses), gates and signs. */
export class SceneryRenderer {
  readonly group = new THREE.Group();
  private readonly models = new Map<string, InstancedModel>();
  private readonly signs = new Map<string, SignSlot[]>();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();

  constructor(lib: ModelLibrary) {
    const names = new Set<string>(['site_gate', 'tunnel_portal']);
    for (const z of ZONES) {
      for (const s of z.scenery) names.add(s.model);
      if (z.frame) names.add(z.frame.model);
    }
    for (const name of names) {
      if (SIGN_MODELS.has(name)) {
        const slots: SignSlot[] = [];
        for (let i = 0; i < POOL_PER_SIGN_MODEL; i++) {
          const object = lib.get(name, [2, 3, 0.2], 0xffffff).scene.clone(true);
          let face: THREE.Mesh | undefined;
          object.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = true;
              if (o.name.endsWith('_face')) face = o;
            }
          });
          object.visible = false;
          this.group.add(object);
          slots.push({ object, face, label: -1 });
        }
        this.signs.set(name, slots);
        continue;
      }
      const frame = ZONES.some((z) => z.frame?.model === name);
      const capacity = frame ? 16 : name === 'site_gate' || name === 'tunnel_portal' ? 2 : 24;
      const big = name === 'tower_crane' || name === 'building_frame' || name === 'rock_wall';
      const model = new InstancedModel(
        lib.get(name, [2, 3, 2], 0x7d8590),
        capacity,
        !big && !frame,
      );
      this.models.set(name, model);
      this.group.add(model.group);
    }
  }

  update(sim: Sim, renderDistance: number): void {
    const dz = renderDistance - sim.distance;
    for (const model of this.models.values()) model.begin();
    for (const slots of this.signs.values()) for (const s of slots) s.object.visible = false;
    for (const sc of sim.world.scenery.items) {
      if (!sc.active) continue;
      const z = sc.z + dz;
      if (z < -160) continue;
      const slots = this.signs.get(sc.model);
      if (slots) {
        const slot = slots.find((s) => !s.object.visible);
        if (!slot) continue;
        slot.object.visible = true;
        slot.object.position.set(sc.x, 0, z);
        slot.object.rotation.set(0, sc.rotY, 0);
        if (slot.label !== sc.label && slot.face) {
          slot.face.material = signMaterial(
            sc.label,
            sc.model === 'billboard' ? 'billboard' : 'road',
          );
          slot.label = sc.label;
        }
        continue;
      }
      const model = this.models.get(sc.model);
      if (!model) continue;
      this.p.set(sc.x, 0, z);
      this.e.set(0, sc.rotY, 0);
      this.q.setFromEuler(this.e);
      this.s.setScalar(sc.scale);
      this.m.compose(this.p, this.q, this.s);
      model.add(this.m);
    }
    for (const model of this.models.values()) model.end();
  }
}
