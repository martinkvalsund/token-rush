import * as THREE from 'three';
import { TUNING } from '../data/tuning';

/**
 * Third-person camera: follows the player's lane and height, widens the FOV with speed,
 * shakes on hits (scaled by reduce-motion), and orbits the idle player on the menu.
 */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(TUNING.camera.fovStart, 1, 0.1, 400);
  private readonly base = new THREE.Vector3(...TUNING.camera.position);
  private readonly look = new THREE.Vector3(...TUNING.camera.lookAt);
  private readonly orbitPos = new THREE.Vector3();
  private readonly orbitLook = new THREE.Vector3(0, 1.1, 0);
  private readonly pos = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private trauma = 0;
  private time = 0;
  /** 0 = gameplay camera, 1 = menu orbit. */
  private menuBlend = 1;
  /** 0..1 multiplier from the reduce-motion setting. */
  shakeScale = 1;
  menu = true;
  /** Highest the camera may go (under a tunnel roof); Infinity outdoors. */
  maxY = Infinity;

  constructor() {
    this.camera.position.copy(this.base);
    this.camera.lookAt(this.look);
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeScale);
  }

  /** speedRatio 0..1 widens the FOV as the game speeds up. */
  update(speedRatio: number, playerX: number, dt: number, playerY = 0): void {
    const { fovStart, fovMax, position, lookAt } = TUNING.camera;
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.menuBlend += ((this.menu ? 1 : 0) - this.menuBlend) * Math.min(1, dt * 2.2);

    const fov = fovStart + (fovMax - fovStart) * speedRatio;
    this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3);

    this.base.x += (position[0] + playerX * 0.6 - this.base.x) * Math.min(1, dt * 8);
    // Follow the player up ramps, roofs and jetpack flights, but not every jump bob.
    const wantY = Math.min(position[1] + playerY * 0.75, this.maxY);
    this.base.y += (wantY - this.base.y) * Math.min(1, dt * 4);
    this.base.z = position[2];
    this.look.set(this.base.x * 0.5, lookAt[1] + (this.base.y - position[1]), lookAt[2]);

    // Menu: slow orbit in front of the player.
    const a = Math.sin(this.time * 0.25) * 0.7 + 0.35;
    this.orbitPos.set(playerX + Math.sin(a) * 5.2, 2.0, -Math.cos(a) * 5.2);
    this.orbitLook.set(playerX, 1.1, 0);

    const b = this.menuBlend * this.menuBlend * (3 - 2 * this.menuBlend);
    this.pos.lerpVectors(this.base, this.orbitPos, b);
    this.target.lerpVectors(this.look, this.orbitLook, b);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.target);
    // On the menu, slide the camera right so the runner sits left of the title panel.
    if (b > 0.001) this.camera.translateX(1.7 * b);
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma;
      this.camera.position.x += Math.sin(this.time * 47) * s * 0.4;
      this.camera.position.y += Math.sin(this.time * 61 + 1) * s * 0.3;
      this.camera.rotation.z += Math.sin(this.time * 33 + 2) * s * 0.04;
    }
    this.camera.updateProjectionMatrix();
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
