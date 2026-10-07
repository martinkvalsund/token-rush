import * as THREE from 'three';

const CAPACITY = 900;

/**
 * One pooled, instanced particle system for every effect (dust, sparkles, sparks, flames,
 * shards, streaks). Particles can be attached to the treadmill so they drift with the world.
 */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private readonly pos = new Float32Array(CAPACITY * 3);
  private readonly vel = new Float32Array(CAPACITY * 3);
  private readonly life = new Float32Array(CAPACITY);
  private readonly maxLife = new Float32Array(CAPACITY);
  private readonly size = new Float32Array(CAPACITY);
  private readonly gravity = new Float32Array(CAPACITY);
  private readonly drag = new Float32Array(CAPACITY);
  private readonly world = new Float32Array(CAPACITY);
  private next = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  private spin = 0;
  enabled = true;

  constructor() {
    const geo = new THREE.OctahedronGeometry(1, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      fog: true,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, CAPACITY);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < CAPACITY; i++) {
      this.mesh.setMatrixAt(i, this.hidden);
      this.mesh.setColorAt(i, this.c.set(0xffffff));
    }
  }

  /** Spawn one particle. `world` = 1 makes it drift with the track (+Z at game speed). */
  emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    color: number,
    life: number,
    size: number,
    gravity = 0,
    world = 1,
    drag = 0,
  ): void {
    if (!this.enabled) return;
    const i = this.next;
    this.next = (this.next + 1) % CAPACITY;
    const k = i * 3;
    this.pos[k] = x;
    this.pos[k + 1] = y;
    this.pos[k + 2] = z;
    this.vel[k] = vx;
    this.vel[k + 1] = vy;
    this.vel[k + 2] = vz;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.gravity[i] = gravity;
    this.world[i] = world;
    this.drag[i] = drag;
    this.mesh.setColorAt(i, this.c.setHex(color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  burst(
    x: number,
    y: number,
    z: number,
    count: number,
    colors: readonly number[],
    speed: number,
    life: number,
    size: number,
    gravity = 0,
    up = 0,
  ): void {
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      this.emit(
        x,
        y,
        z,
        Math.cos(a) * Math.cos(b) * sp,
        Math.sin(b) * sp + up,
        Math.sin(a) * Math.cos(b) * sp,
        colors[n % colors.length] ?? 0xffffff,
        life * (0.6 + Math.random() * 0.4),
        size * (0.6 + Math.random() * 0.6),
        gravity,
        1,
        1.5,
      );
    }
  }

  update(dt: number, worldSpeed: number): void {
    this.spin += dt * 4;
    this.e.set(this.spin, this.spin * 0.7, 0);
    this.q.setFromEuler(this.e);
    for (let i = 0; i < CAPACITY; i++) {
      const l = this.life[i] ?? 0;
      if (l <= 0) continue;
      const nl = l - dt;
      this.life[i] = nl;
      if (nl <= 0) {
        this.mesh.setMatrixAt(i, this.hidden);
        continue;
      }
      const k = i * 3;
      const drag = Math.max(0, 1 - (this.drag[i] ?? 0) * dt);
      const vx = (this.vel[k] ?? 0) * drag;
      const vy = ((this.vel[k + 1] ?? 0) - (this.gravity[i] ?? 0) * dt) * drag;
      const vz = (this.vel[k + 2] ?? 0) * drag;
      this.vel[k] = vx;
      this.vel[k + 1] = vy;
      this.vel[k + 2] = vz;
      const px = (this.pos[k] ?? 0) + vx * dt;
      const py = Math.max(0.02, (this.pos[k + 1] ?? 0) + vy * dt);
      const pz = (this.pos[k + 2] ?? 0) + (vz + worldSpeed * (this.world[i] ?? 0)) * dt;
      this.pos[k] = px;
      this.pos[k + 1] = py;
      this.pos[k + 2] = pz;
      const s = (this.size[i] ?? 0) * Math.min(1, (nl / (this.maxLife[i] ?? 1)) * 1.6);
      this.p.set(px, py, pz);
      this.s.set(s, s, s);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    for (let i = 0; i < CAPACITY; i++) this.mesh.setMatrixAt(i, this.hidden);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Thin streaks rushing past the camera at high speed. */
export class SpeedLines {
  readonly mesh: THREE.InstancedMesh;
  private readonly count = 40;
  private readonly data: { x: number; y: number; z: number; len: number }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly mat: THREE.MeshBasicMaterial;
  enabled = true;

  constructor() {
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.025, 0.025, 1),
      this.mat,
      this.count,
    );
    this.mesh.frustumCulled = false;
    for (let i = 0; i < this.count; i++) this.data.push(this.spawn(-Math.random() * 60));
  }

  private spawn(z: number): { x: number; y: number; z: number; len: number } {
    const side = Math.random() < 0.5 ? -1 : 1;
    return {
      x: side * (3 + Math.random() * 6),
      y: 0.5 + Math.random() * 6,
      z,
      len: 2 + Math.random() * 4,
    };
  }

  update(dt: number, speed: number, ratio: number, cameraX: number): void {
    const target = this.enabled ? Math.max(0, (ratio - 0.45) / 0.55) * 0.35 : 0;
    this.mat.opacity += (target - this.mat.opacity) * Math.min(1, dt * 3);
    this.mesh.visible = this.mat.opacity > 0.01;
    if (!this.mesh.visible) return;
    for (let i = 0; i < this.count; i++) {
      const d = this.data[i];
      if (!d) continue;
      d.z += speed * 2.2 * dt;
      if (d.z > 10) this.data[i] = this.spawn(-60 - Math.random() * 20);
      const cur = this.data[i];
      if (!cur) continue;
      this.m.makeScale(1, 1, cur.len);
      this.m.setPosition(cur.x + cameraX, cur.y, cur.z);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
