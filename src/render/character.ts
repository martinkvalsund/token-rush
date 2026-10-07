import * as THREE from 'three';
import type { PlayerState } from '../sim/player';

export const JOINTS = ['hips', 'torso', 'head', 'armL', 'armR', 'legL', 'legR'] as const;
export type JointName = (typeof JOINTS)[number];
export type CharacterRig = { root: THREE.Object3D } & Record<JointName, THREE.Object3D>;

export type Pose = 'idle' | 'run' | 'stumble' | 'crash' | 'jetpack';

/** Temporary greybox rig; replaced by the Blender model when it is available. */
export function buildGreyboxRig(): CharacterRig {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true });
  const box = (w: number, h: number, d: number, c: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.y = y;
    m.castShadow = true;
    return m;
  };
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  const torso = new THREE.Group();
  torso.add(box(0.55, 0.6, 0.32, 0xc6ff00, 0.3));
  const head = new THREE.Group();
  head.position.y = 0.62;
  head.add(box(0.3, 0.3, 0.3, 0xf1c27d, 0.15), box(0.4, 0.14, 0.4, 0xffc72c, 0.34));
  torso.add(head);
  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.36, 0.55, 0);
    g.add(box(0.14, 0.55, 0.14, 0xc6ff00, -0.27));
    return g;
  };
  const leg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.14, 0, 0);
    g.add(box(0.18, 0.8, 0.2, 0x2f3d5c, -0.4), box(0.2, 0.12, 0.32, 0x5a3a1a, -0.84));
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);
  const legL = leg(-1);
  const legR = leg(1);
  torso.add(armL, armR);
  hips.add(torso, legL, legR);
  root.add(hips);
  return { root, hips, torso, head, armL, armR, legL, legR };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Procedural animation driven by sim state. Called every rendered frame. */
export class CharacterAnimator {
  private phase = 0;
  private blink = 0;
  private readonly hipsRest: number;

  constructor(private readonly rig: CharacterRig) {
    this.hipsRest = rig.hips.position.y;
  }

  update(
    p: PlayerState,
    speed: number,
    dt: number,
    pose: Pose,
    poseTime: number,
    invuln: boolean,
  ): void {
    const r = this.rig;
    const k = Math.min(1, dt * 14);
    const rest = this.hipsRest;
    let hipsY = rest;
    let torsoX = 0;
    const torsoZ = 0;
    let rootX = 0;
    let rootZ = 0;
    let armL = 0;
    let armR = 0;
    let armLz = 0;
    let armRz = 0;
    let legL = 0;
    let legR = 0;
    let headY = 0;

    if (pose === 'idle') {
      this.phase += dt;
      const b = Math.sin(this.phase * 2) * 0.02;
      hipsY = rest + b;
      armLz = -0.1;
      armRz = 0.1;
      headY = Math.sin(this.phase * 0.6) * 0.5;
    } else if (pose === 'crash') {
      const t = Math.min(1, poseTime * 2.5);
      rootX = -t * 1.4;
      hipsY = lerp(rest, 0.35, t);
      armL = armR = -2.6 * t;
      legL = 0.6 * t;
      legR = -0.4 * t;
    } else if (pose === 'jetpack') {
      this.phase += dt * 6;
      torsoX = -0.25;
      armR = -2.9;
      armL = 0.3;
      legL = 0.2 + Math.sin(this.phase) * 0.1;
      legR = 0.4 + Math.cos(this.phase) * 0.1;
    } else if (p.sliding) {
      rootX = 1.15;
      hipsY = 0.35;
      armL = armR = -0.9;
      legL = legR = -0.6;
      if (p.slideTime < 0.25 && p.rollPending === false && p.airTime > 0.3)
        rootX += p.slideTime * 20;
    } else if (!p.grounded) {
      armL = armR = -2.4;
      armLz = -0.4;
      armRz = 0.4;
      legL = -1.2;
      legR = -0.4;
      torsoX = 0.2;
    } else {
      // Run: cadence scales with speed.
      const cadence = 1.6 + speed / 9;
      this.phase += dt * cadence * Math.PI * 2;
      const s = Math.sin(this.phase);
      legL = s * 0.85;
      legR = -s * 0.85;
      armL = -s * 0.8;
      armR = s * 0.8;
      torsoX = 0.14;
      hipsY = rest + Math.abs(Math.cos(this.phase)) * 0.08;
    }

    if (pose === 'stumble') {
      const t = Math.min(1, poseTime / 0.6);
      torsoX += Math.sin(t * Math.PI) * 0.6;
      armLz = -0.9 * Math.sin(t * Math.PI);
      armRz = 0.9 * Math.sin(t * Math.PI);
    }

    // Lean into lane changes.
    if (p.laneAge < 0.3) rootZ = -p.laneDir * 0.22 * (1 - p.laneAge / 0.3);

    r.hips.position.y = lerp(r.hips.position.y, hipsY, k);
    r.torso.rotation.x = lerp(r.torso.rotation.x, -torsoX, k);
    r.torso.rotation.z = lerp(r.torso.rotation.z, torsoZ, k);
    r.root.rotation.x = lerp(r.root.rotation.x, -rootX, k);
    r.root.rotation.z = lerp(r.root.rotation.z, rootZ, k);
    r.armL.rotation.x = lerp(r.armL.rotation.x, armL, k);
    r.armR.rotation.x = lerp(r.armR.rotation.x, armR, k);
    r.armL.rotation.z = lerp(r.armL.rotation.z, armLz, k);
    r.armR.rotation.z = lerp(r.armR.rotation.z, armRz, k);
    r.legL.rotation.x = lerp(r.legL.rotation.x, legL, k);
    r.legR.rotation.x = lerp(r.legR.rotation.x, legR, k);
    r.head.rotation.y = lerp(r.head.rotation.y, headY, k * 0.3);

    // Blink during invulnerability frames.
    this.blink += dt;
    r.root.visible = !invuln || Math.floor(this.blink * 14) % 2 === 0;
  }
}
