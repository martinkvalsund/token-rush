import * as THREE from 'three';
import { TUNING } from '../data/tuning';

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(TUNING.camera.fovStart, 1, 0.1, 300);
  private readonly look = new THREE.Vector3(...TUNING.camera.lookAt);

  constructor() {
    this.camera.position.set(...TUNING.camera.position);
    this.camera.lookAt(this.look);
  }

  /** speedRatio 0..1 widens the FOV as the game speeds up. */
  update(speedRatio: number, playerX: number, dt: number): void {
    const { fovStart, fovMax, position } = TUNING.camera;
    const fov = fovStart + (fovMax - fovStart) * speedRatio;
    this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.position.x +=
      (position[0] + playerX * 0.6 - this.camera.position.x) * Math.min(1, dt * 8);
    this.look.x = this.camera.position.x * 0.5;
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
