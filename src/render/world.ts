import * as THREE from 'three';
import { TUNING } from '../data/tuning';

/** Treadmill road: a long plane whose texture scrolls; the player stays at z = 0. */
export class Road {
  readonly group = new THREE.Group();
  readonly roadMaterial: THREE.MeshLambertMaterial;
  readonly groundMaterial: THREE.MeshLambertMaterial;
  private readonly texture: THREE.CanvasTexture;
  private readonly length = 260;

  constructor() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    if (!g) throw new Error('2d canvas unavailable');
    g.fillStyle = '#a0a0a0';
    g.fillRect(0, 0, 256, 256);
    // Speckle so the surface reads as asphalt/concrete in motion.
    for (let i = 0; i < 900; i++) {
      const v = 140 + Math.floor(Math.random() * 40);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const roadWidth = TUNING.world.laneX[2] - TUNING.world.laneX[0] + 4.4;
    const px = 256 / roadWidth;
    g.fillStyle = '#ffffff';
    for (const x of [-1.2, 1.2]) g.fillRect(256 / 2 + x * px - 3, 16, 6, 110);
    g.fillStyle = '#ffd34d';
    for (const x of [-roadWidth / 2 + 0.25, roadWidth / 2 - 0.25])
      g.fillRect(256 / 2 + x * px - 3, 0, 6, 256);
    this.texture = new THREE.CanvasTexture(c);
    this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.repeat.set(1, this.length / 8);
    this.texture.anisotropy = 8;

    this.roadMaterial = new THREE.MeshLambertMaterial({ map: this.texture });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, this.length), this.roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -this.length / 2 + 25;
    road.receiveShadow = true;
    this.groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8a7b5c });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, this.length), this.groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -this.length / 2 + 25);
    ground.receiveShadow = true;
    this.group.add(ground, road);
  }

  /** Scroll by distance travelled (metres). */
  scroll(distance: number): void {
    this.texture.offset.y -= distance / 8;
  }
}
