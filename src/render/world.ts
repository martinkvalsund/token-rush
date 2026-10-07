import * as THREE from 'three';
import { TUNING } from '../data/tuning';

/** Treadmill road: a long plane whose texture scrolls; the player stays at z = 0. */
export class Road {
  readonly group = new THREE.Group();
  private readonly texture: THREE.CanvasTexture;
  private readonly length = 200;

  constructor() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    if (!g) throw new Error('2d canvas unavailable');
    g.fillStyle = '#3b3f46';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#e8e8e8';
    const laneW = 256 / 3;
    for (const x of [laneW, laneW * 2]) g.fillRect(x - 3, 16, 6, 96);
    this.texture = new THREE.CanvasTexture(c);
    this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.repeat.set(1, this.length / 8);

    const roadWidth = (TUNING.world.laneX[2] - TUNING.world.laneX[0]) * 1.5;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, this.length),
      new THREE.MeshLambertMaterial({ map: this.texture }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -this.length / 2 + 20;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, this.length),
      new THREE.MeshLambertMaterial({ color: 0x8a7b5c }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -this.length / 2 + 20);
    this.group.add(ground, road);
  }

  /** Scroll by distance travelled (metres). */
  scroll(distance: number): void {
    this.texture.offset.y -= distance / 8;
  }
}
