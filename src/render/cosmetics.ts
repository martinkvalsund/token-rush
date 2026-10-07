import * as THREE from 'three';
import type { Recolor, ShopItem, TrailStyle } from '../data/shop';
import type { Loadout } from '../core/storage';
import type { CharacterRig } from './character';
import type { ModelLibrary } from './models/library';
import type { Particles } from './vfx';
import { disposeRecolored, paletteMaterial, recoloredMaterial } from './palette';

export type LoadoutItems = Record<keyof Loadout, ShopItem>;

const TRAIL_COLORS: Record<TrailStyle, number[]> = {
  none: [],
  sparkle: [0xffd54f, 0xfff3c4, 0xffc83d],
  neon: [0xc6ff00, 0x2ef2ff],
  fire: [0xff8a1a, 0xffd54f, 0xe8412c],
  code: [0x39ff14, 0x7dff5a, 0x1fbf10],
  rainbow: [0xff3b3b, 0xff9f1a, 0xffd21f, 0x39ff14, 0x2e86de, 0x9b5de5],
};

/**
 * The shop's cosmetics on the 3D character: outfit/skin/hair recolour, headgear on the head
 * joint, a companion that floats beside the runner, and a particle trail.
 */
export class Cosmetics {
  private material: THREE.MeshStandardMaterial | null = null;
  private hat: THREE.Object3D | null = null;
  private readonly hardhat: THREE.Object3D | undefined;
  private pet: THREE.Object3D | null = null;
  private readonly spinners: THREE.Object3D[] = [];
  private readonly petPos = new THREE.Vector3(0.75, 1.8, 0.4);
  private readonly want = new THREE.Vector3();
  private trail: TrailStyle = 'none';
  private trailTimer = 0;
  private time = 0;
  private hue = 0;
  private key = '';

  constructor(
    private readonly lib: ModelLibrary,
    private readonly rig: CharacterRig,
    private readonly particles: Particles,
    private readonly scene: THREE.Object3D,
  ) {
    this.hardhat = rig.head.getObjectByName('hardhat');
  }

  /** Dress the character. Cheap to call repeatedly: unchanged loadouts are skipped. */
  apply(items: LoadoutItems): void {
    const key = Object.values(items)
      .map((i) => i.id)
      .join('|');
    if (key === this.key) return;
    this.key = key;

    const recolor: Recolor = {
      ...items.outfit.recolor,
      ...items.skin.recolor,
      ...items.hair.recolor,
    };
    const old = this.material;
    this.material = Object.keys(recolor).length ? recoloredMaterial(recolor) : null;

    if (this.hat) this.hat.removeFromParent();
    this.hat = null;
    const hatModel = items.hat.model;
    if (hatModel && this.lib.has(hatModel)) {
      this.hat = this.lib.get(hatModel).scene.clone(true);
      this.rig.head.add(this.hat);
    }
    if (this.hardhat) this.hardhat.visible = !this.hat;

    // Recolour every palette-drawn mesh of the character (body and headgear).
    const mat = this.material ?? paletteMaterial();
    this.rig.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        if (o.material === old || o.material === paletteMaterial()) {
          o.material = mat;
          o.castShadow = true;
        }
      }
    });
    if (old) disposeRecolored(old);

    if (this.pet) this.pet.removeFromParent();
    this.pet = null;
    const petModel = items.pet.model;
    if (petModel && this.lib.has(petModel)) {
      this.pet = this.lib.get(petModel).scene.clone(true);
      this.pet.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
      this.scene.add(this.pet);
      this.pet.position.copy(this.rig.root.position).add(new THREE.Vector3(0.75, 1.8, 0.4));
      this.petPos.copy(this.pet.position);
    }

    this.spinners.length = 0;
    for (const root of [this.hat, this.pet])
      root?.traverse((o) => {
        if (o.name.startsWith('rotor') || o.name === 'propeller') this.spinners.push(o);
      });
    this.trail = items.trail.trail ?? 'none';
  }

  /**
   * Per frame. `x`/`y` are the runner's feet; `running` emits the trail behind the runner,
   * otherwise (menu and shop) the trail swirls around the idle character as a preview.
   */
  update(dt: number, x: number, y: number, running: boolean, flying: boolean, speed: number): void {
    this.time += dt;
    for (const s of this.spinners) s.rotation.y += dt * (flying || running ? 30 : 14);

    if (this.pet) {
      // The companion trails the runner's shoulder with a soft lag and a hover bob.
      const bob = Math.sin(this.time * 2.6) * 0.08;
      const want = this.want;
      // Float on the inside of the outer lanes so the companion stays on screen.
      if (running) want.set(x + (x > 1 ? -0.8 : 0.8), y + 1.75 + bob, 0.5);
      else want.set(x + 0.8, y + 1.55 + bob, 0.1);
      this.petPos.lerp(want, Math.min(1, dt * 5));
      this.pet.position.copy(this.petPos);
      this.pet.rotation.y = running
        ? Math.sin(this.time * 1.3) * 0.15
        : Math.sin(this.time * 0.8) * 0.5;
      this.pet.rotation.z = (want.x - this.petPos.x) * -0.6;
    }

    if (this.trail === 'none' || dt === 0) return;
    // Emit by elapsed time (not once per frame) so the trail stays dense at low frame rates;
    // particles from one frame are spread over the distance run during it.
    const interval = running ? 0.016 : 0.05;
    this.trailTimer -= dt;
    let n = 0;
    while (this.trailTimer <= 0 && n < 8) {
      this.trailTimer += interval;
      n++;
    }
    if (this.trailTimer <= 0) this.trailTimer = interval;
    for (let i = 0; i < n; i++)
      this.emitTrail(x, y, 0.25 + (running ? (speed * dt * i) / n : 0), running);
  }

  private color(): number {
    const colors = TRAIL_COLORS[this.trail];
    if (this.trail === 'rainbow') {
      this.hue = (this.hue + 1) % colors.length;
      return colors[this.hue] ?? 0xffffff;
    }
    return colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;
  }

  private emitTrail(x: number, y: number, z: number, running: boolean): void {
    const p = this.particles;
    const r = (s: number) => (Math.random() - 0.5) * s;
    if (!running) {
      // Showcase: a slow spiral of trail particles around the idle character.
      const a = this.time * 3;
      const h = (this.time * 0.8) % 1.8;
      p.emit(
        x + Math.cos(a) * 0.6,
        y + 0.1 + h,
        Math.sin(a) * 0.6,
        0,
        0.4,
        0,
        this.color(),
        0.9,
        0.05,
        0,
        0,
      );
      return;
    }
    switch (this.trail) {
      case 'sparkle':
        p.emit(
          x + r(0.6),
          y + 0.4 + Math.random(),
          z,
          r(0.5),
          r(0.5),
          0,
          this.color(),
          0.6,
          0.05,
          0,
          1,
          1,
        );
        break;
      case 'neon':
        p.emit(x - 0.32, y + 0.9, z, 0, 0, 0, this.color(), 0.45, 0.06, 0, 1);
        p.emit(x + 0.32, y + 0.9, z, 0, 0, 0, this.color(), 0.45, 0.06, 0, 1);
        break;
      case 'fire':
        p.emit(
          x + r(0.4),
          y + 0.15,
          z,
          r(0.6),
          1.5 + Math.random(),
          0,
          this.color(),
          0.5,
          0.09,
          -3,
          1,
          1,
        );
        break;
      case 'code':
        p.emit(x + r(0.8), y + 1.2 + r(0.8), z, 0, 0.3, 0, this.color(), 0.8, 0.045, 4, 1);
        break;
      case 'rainbow':
        p.emit(x + r(0.15), y + 0.7, z, 0, 0, 0, this.color(), 0.6, 0.07, 0, 1);
        p.emit(x + r(0.15), y + 0.82, z, 0, 0, 0, this.color(), 0.6, 0.07, 0, 1);
        break;
      default:
        break;
    }
  }
}
