import * as THREE from 'three';
import { TUNING } from '../data/tuning';

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(TUNING.camera.fovStart, 1, 0.1, 300);
  private readonly look = new THREE.Vector3(...TUNING.camera.lookAt);
  private trauma = 0;
  private time = 0;
  /** 0..1 multiplier from the reduce-motion setting. */
  shakeScale = 1;

  constructor() {
    this.camera.position.set(...TUNING.camera.position);
    this.camera.lookAt(this.look);
  }

  /** speedRatio 0..1 widens the FOV as the game speeds up. */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeScale);
  }

  update(speedRatio: number, playerX: number, dt: number, playerY = 0): void {
    const { fovStart, fovMax, position, lookAt } = TUNING.camera;
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const fov = fovStart + (fovMax - fovStart) * speedRatio;
    this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.position.x +=
      (position[0] + playerX * 0.6 - this.camera.position.x) * Math.min(1, dt * 8);
    // Follow the player up ramps, roofs and jetpack flights, but not every jump bob.
    const targetY = position[1] + playerY * 0.75;
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, dt * 4);
    this.look.x = this.camera.position.x * 0.5;
    this.look.y = lookAt[1] + (this.camera.position.y - position[1]);
    this.camera.lookAt(this.look);
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
