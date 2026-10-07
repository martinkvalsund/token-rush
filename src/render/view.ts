import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { ZONES } from '../data/zones';
import { zoneAt } from '../sim/difficulty';
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
import { Particles, SpeedLines } from './vfx';
import { Cosmetics } from './cosmetics';
import type { SimEvent } from '../sim/events';
import type { Level } from './quality';

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
  readonly cosmetics: Cosmetics;
  readonly zones: ZoneLook;
  readonly shield: THREE.Mesh;
  readonly particles = new Particles();
  readonly speedLines = new SpeedLines();
  private readonly blob: THREE.Mesh;
  private lastDistance = 0;
  private shieldPhase = 0;
  private squash = 1;
  private squashVel = 0;
  private dustTimer = 0;
  private boulderDust = 0;

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

    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.visible = false;

    this.scene.add(
      this.blob,
      this.particles.mesh,
      this.speedLines.mesh,
      this.road.group,
      this.character.root,
      this.entities.group,
      this.scenery.group,
      this.chaser.group,
    );
    this.cosmetics = new Cosmetics(lib, this.character, this.particles, this.scene);
  }

  resetScroll(): void {
    this.lastDistance = 0;
    this.particles.clear();
  }

  applyQuality(level: Level): void {
    const shadows = level !== 'low';
    this.sun.castShadow = shadows;
    this.blob.visible = !shadows;
    const size = level === 'high' ? TUNING.render.shadowMapSize : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  setReduceMotion(on: boolean): void {
    this.rig.shakeScale = on ? 0 : 1;
    this.speedLines.enabled = !on;
  }

  /** Visual reactions to sim events (particles, squash and stretch). */
  onEvent(e: SimEvent, sim: Sim): void {
    const p = sim.player;
    const px = p.x;
    const py = p.y;
    switch (e.type) {
      case 'token':
        this.particles.burst(px, py + 1.1, -0.6, 6, [0xffd54f, 0xfff3c4, 0xffc83d], 4, 0.35, 0.06);
        this.squash = Math.max(this.squash, 1.06);
        break;
      case 'land':
        this.squashVel = -3.5;
        this.particles.burst(px, py + 0.05, 0.1, 8, [0xb8a88a, 0x9c8b66], 3, 0.45, 0.1, 4, 1);
        break;
      case 'stumble':
        this.particles.burst(
          px,
          py + 0.6,
          -0.4,
          16,
          [0xff8a1a, 0xffd54f, 0x8c877e],
          7,
          0.5,
          0.08,
          14,
          2,
        );
        break;
      case 'crash':
      case 'caught':
        this.particles.burst(
          px,
          py + 1,
          -0.6,
          40,
          [0xff8a1a, 0xffd54f, 0x6b717a, 0x3a3f47],
          10,
          0.9,
          0.14,
          16,
          4,
        );
        break;
      case 'shieldBreak':
        this.particles.burst(px, py + 1, 0, 30, [0xffe0b2, 0xffb74d, 0xffffff], 8, 0.6, 0.1, 6, 1);
        break;
      case 'powerup':
        this.particles.burst(
          px,
          py + 1.2,
          -0.8,
          24,
          [0xffffff, 0xc6ff00, 0x5ad1ff, 0xff7a59],
          6,
          0.6,
          0.08,
          0,
          1,
        );
        break;
      default:
        break;
    }
  }

  update(sim: Sim, f: FrameInfo): void {
    const p = sim.player;
    this.character.root.position.set(f.x, f.y, 0);
    this.animator.update(p, sim.speed, f.dt, f.pose, f.poseTime, f.blink);
    this.cosmetics.update(f.dt, f.x, f.y, f.pose !== 'idle' && sim.alive, p.flying, sim.speed);
    // Squash and stretch: a damped spring back to 1.
    this.squashVel += (1 - this.squash) * 180 * f.dt;
    this.squashVel *= Math.max(0, 1 - 14 * f.dt);
    this.squash += this.squashVel * f.dt;
    const sq = Math.max(0.7, Math.min(1.25, this.squash));
    this.character.root.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.blob.position.set(f.x, 0.02 + p.y * 0, 0);
    this.blob.scale.setScalar(Math.max(0.3, 1 - f.y * 0.15));
    this.emitContinuous(sim, f);
    this.particles.update(f.dt, sim.alive ? sim.speed : 0);

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
    const ratio = (sim.speed - start) / (max - start);
    const ceiling = ZONES[zoneAt(f.renderDistance)]?.ceiling;
    this.rig.maxY = ceiling === undefined ? Infinity : ceiling - 1.4;
    this.rig.update(ratio, f.x, f.dt, f.y);
    this.speedLines.update(
      f.dt,
      sim.alive && f.pose !== 'idle' ? sim.speed : 0,
      f.pose === 'idle' ? 0 : ratio,
      f.x,
    );
    this.zones.update(f.renderDistance, this.rig.camera.position);

    // Keep the shadow frustum tight around the player.
    const d = this.zones.sunDir;
    this.sun.target.position.set(f.x * 0.5, 0, -8);
    this.sun.position.set(f.x * 0.5 + d.x * 40, d.y * 40, -8 + d.z * 40);
  }

  private emitContinuous(sim: Sim, f: FrameInfo): void {
    const p = sim.player;
    if (f.dt === 0 || f.pose === 'idle' || !sim.alive) return;
    // Dust kicked up while running on the ground.
    this.dustTimer -= f.dt;
    if (this.dustTimer <= 0 && p.grounded && !p.sliding) {
      this.dustTimer = 0.05;
      this.particles.emit(
        f.x + (Math.random() - 0.5) * 0.4,
        f.y + 0.05,
        0.3,
        Math.random() - 0.5,
        0.8,
        1.5,
        0xb8a88a,
        0.4,
        0.08,
        1,
      );
    }
    if (p.sliding && p.grounded && Math.random() < 0.6)
      this.particles.emit(
        f.x,
        f.y + 0.05,
        0.2,
        (Math.random() - 0.5) * 2,
        1.4,
        1,
        0xd8c08a,
        0.35,
        0.09,
        2,
      );
    // Energy-drink jet: flames and puffs below the player.
    if (p.flying) {
      for (let i = 0; i < 2; i++) {
        this.particles.emit(
          f.x + (Math.random() - 0.5) * 0.2,
          f.y + 0.2,
          0.25,
          (Math.random() - 0.5) * 0.6,
          -5,
          1,
          i ? 0xffd54f : 0xff8a1a,
          0.25,
          0.1,
          -2,
          0.5,
        );
      }
      if (Math.random() < 0.3)
        this.particles.emit(f.x, f.y, 0.3, 0, -1.5, 0, 0xdddddd, 0.7, 0.16, 0, 1, 1);
    }
    // Magnet streaks from attracted tokens.
    if (sim.powerups.active('magnet')) {
      for (const t of sim.world.tokens.items) {
        if (!t.active || !t.magnet || Math.random() > 0.3) continue;
        this.particles.emit(
          t.x,
          t.y,
          t.z,
          (p.x - t.x) * 3,
          (p.y + 1 - t.y) * 3,
          -t.z * 3,
          0x5ad1ff,
          0.18,
          0.05,
          0,
          0,
        );
      }
    }
    // Boulder dust when it is on screen.
    if (f.showChaser && f.gap < 13) {
      this.boulderDust -= f.dt;
      if (this.boulderDust <= 0) {
        this.boulderDust = 0.04;
        this.particles.emit(
          f.x * 0.8 + (Math.random() - 0.5) * 3,
          0.2,
          f.gap + 1.5,
          (Math.random() - 0.5) * 3,
          2.5,
          2,
          0x8c6e4e,
          0.6,
          0.22,
          3,
          0.5,
          1,
        );
      }
    }
  }
}
