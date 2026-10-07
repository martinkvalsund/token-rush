import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import type { Sim } from '../sim/sim';
import { CameraRig } from './cameraRig';
import { Road } from './world';
import { CharacterAnimator, type CharacterRig, type Pose } from './character';
import { buildCharacterRig } from './characterModel';
import { EntityRenderer } from './entities';
import { SceneryRenderer } from './scenery';
import { Chaser } from './chaser';
import { ZoneLook } from './zones';
import type { ModelLibrary } from './models/library';

export interface FrameInfo {
  x: number;
  y: number;
  renderDistance: number;
  gap: number;
  pose: Pose;
  poseTime: number;
  blink: boolean;
  dt: number;
  showChaser: boolean;
}

/** Everything in the 3D scene, synced from the sim once per rendered frame. */
export class View {
  readonly scene = new THREE.Scene();
  readonly rig = new CameraRig();
  readonly road = new Road();
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x556677, 1.4);
  readonly sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
  readonly entities: EntityRenderer;
  readonly scenery: SceneryRenderer;
  readonly chaser: Chaser;
  readonly character: CharacterRig;
  readonly animator: CharacterAnimator;
  readonly zones: ZoneLook;
  readonly shield: THREE.Mesh;
  private lastDistance = 0;
  private shieldPhase = 0;

  constructor(lib: ModelLibrary) {
    this.road = new Road();
    this.entities = new EntityRenderer(lib);
    this.scenery = new SceneryRenderer(lib);
    this.chaser = new Chaser(lib);
    this.character = buildCharacterRig(lib);
    this.animator = new CharacterAnimator(this.character);

    this.sun.castShadow = true;
    const cam = this.sun.shadow.camera;
    cam.left = -16;
    cam.right = 16;
    cam.top = 24;
    cam.bottom = -16;
    cam.near = 1;
    cam.far = 80;
    this.sun.shadow.mapSize.set(TUNING.render.shadowMapSize, TUNING.render.shadowMapSize);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.zones = new ZoneLook(
      this.scene,
      this.hemi,
      this.sun,
      this.road.roadMaterial,
      this.road.groundMaterial,
      lib,
    );

    this.shield = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 2),
      new THREE.MeshStandardMaterial({
        color: 0xffe0b2,
        emissive: 0xffb74d,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        flatShading: true,
      }),
    );
    this.shield.position.y = 1;
    this.shield.visible = false;
    this.character.root.add(this.shield);

    this.scene.add(
      this.road.group,
      this.character.root,
      this.entities.group,
      this.scenery.group,
      this.chaser.group,
    );
  }

  resetScroll(): void {
    this.lastDistance = 0;
  }

  update(sim: Sim, f: FrameInfo): void {
    const p = sim.player;
    this.character.root.position.set(f.x, f.y, 0);
    this.animator.update(p, sim.speed, f.dt, f.pose, f.poseTime, f.blink);

    this.road.scroll(f.renderDistance - this.lastDistance);
    this.lastDistance = f.renderDistance;
    this.entities.update(sim, f.renderDistance, f.dt);
    this.scenery.update(sim, f.renderDistance);
    this.chaser.update(f.gap, f.x, Math.max(sim.speed, sim.alive ? 0 : 8), f.dt, f.showChaser);

    this.shield.visible = sim.powerups.active('shield');
    if (this.shield.visible) {
      this.shieldPhase += f.dt;
      this.shield.scale.setScalar(1 + Math.sin(this.shieldPhase * 5.5) * 0.03);
      this.shield.rotation.y += f.dt * 0.6;
    }

    const { start, max } = TUNING.speed;
    this.rig.update((sim.speed - start) / (max - start), f.x, f.dt, f.y);
    this.zones.update(f.renderDistance, this.rig.camera.position);

    // Keep the shadow frustum tight around the player.
    const d = this.zones.sunDir;
    this.sun.target.position.set(f.x * 0.5, 0, -8);
    this.sun.position.set(f.x * 0.5 + d.x * 40, d.y * 40, -8 + d.z * 40);
  }
}
