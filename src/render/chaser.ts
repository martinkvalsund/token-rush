import * as THREE from 'three';
import type { ModelLibrary } from './models/library';

/** Canvas texture covered in merge-conflict markers for the Tech Debt boulder. */
export function conflictTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  g.fillStyle = '#5b5148';
  g.fillRect(0, 0, c.width, c.height);
  // Rocky blotches.
  for (let i = 0; i < 260; i++) {
    const v = 60 + Math.floor(Math.random() * 50);
    g.fillStyle = `rgb(${v + 12},${v + 4},${v - 6})`;
    g.beginPath();
    g.arc(
      Math.random() * c.width,
      Math.random() * c.height,
      6 + Math.random() * 26,
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  const lines = [
    '<<<<<<< HEAD',
    '=======',
    '>>>>>>> legacy',
    '// TODO',
    'goto fail;',
    '<<<<<<< main',
  ];
  g.font = 'bold 34px monospace';
  for (let i = 0; i < 26; i++) {
    const text = lines[i % lines.length] ?? '';
    g.fillStyle = i % 3 === 0 ? '#ff8a65' : i % 3 === 1 ? '#ffd54f' : '#e0e0e0';
    g.save();
    g.translate((i * 197) % c.width, 30 + ((i * 89) % (c.height - 40)));
    g.rotate((((i * 37) % 30) - 15) * (Math.PI / 180));
    g.fillText(text, 0, 0);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export class Chaser {
  readonly group = new THREE.Group();
  private readonly spinner = new THREE.Group();
  private readonly radius = 1.6;

  constructor(lib: ModelLibrary) {
    const mat = new THREE.MeshStandardMaterial({
      map: conflictTexture(),
      roughness: 0.9,
      flatShading: true,
    });
    this.spinner.position.y = this.radius;
    this.group.add(this.spinner);
    if (lib.has('boulder')) {
      const model = lib.get('boulder').scene.clone(true);
      const ball = model.getObjectByName('boulder_ball');
      const rubble = model.getObjectByName('boulder_rubble');
      if (ball instanceof THREE.Mesh) {
        ball.material = mat;
        ball.position.y -= this.radius;
        this.spinner.add(ball);
      }
      if (rubble) this.group.add(rubble);
    } else {
      this.spinner.add(new THREE.Mesh(new THREE.IcosahedronGeometry(this.radius, 2), mat));
    }
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }

  update(gap: number, playerX: number, speed: number, dt: number, visible: boolean): void {
    this.group.visible = visible && gap < 13.5;
    this.group.position.set(playerX * 0.8, 0, gap + this.radius * 0.6);
    this.spinner.rotation.x -= (speed / this.radius) * dt;
  }
}
