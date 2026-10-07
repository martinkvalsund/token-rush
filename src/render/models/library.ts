import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** One drawable part of a model: geometry + material + its transform inside the model. */
export interface ModelPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrix: THREE.Matrix4;
  name: string;
}

export interface ModelTemplate {
  name: string;
  parts: ModelPart[];
  /** The loaded scene graph (used for the jointed character). */
  scene: THREE.Object3D;
  fallback: boolean;
}

export type MaterialFactory = (source: THREE.Material, meshName: string) => THREE.Material;

/**
 * Loads GLB models from public/models and flattens them into parts for instancing.
 * Missing files fall back to a labelled box so the game always runs.
 */
export class ModelLibrary {
  private readonly loader = new GLTFLoader();
  private readonly templates = new Map<string, ModelTemplate>();

  constructor(private readonly materialFor: MaterialFactory) {}

  async loadAll(
    names: readonly string[],
    onProgress: (fraction: number) => void = () => undefined,
    base = `${import.meta.env.BASE_URL}models/`,
  ): Promise<void> {
    let done = 0;
    await Promise.all(
      names.map(async (name) => {
        try {
          const gltf = await this.loader.loadAsync(`${base}${name}.glb`);
          this.templates.set(name, this.flatten(name, gltf.scene));
        } catch {
          // Missing model: a fallback is created on first use.
        }
        onProgress(++done / names.length);
      }),
    );
  }

  has(name: string): boolean {
    const t = this.templates.get(name);
    return !!t && !t.fallback;
  }

  /** The model, or a coloured box of the given size (bottom = height of its underside). */
  get(
    name: string,
    fallbackSize: [number, number, number] = [1, 1, 1],
    color = 0xff00ff,
    bottom = 0,
  ): ModelTemplate {
    const t = this.templates.get(name);
    if (t) return t;
    const [w, h, d] = fallbackSize;
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(0, bottom + h / 2, 0);
    const material = new THREE.MeshStandardMaterial({ color, flatShading: true });
    const scene = new THREE.Mesh(geometry, material);
    const fb: ModelTemplate = {
      name,
      parts: [{ geometry, material, matrix: new THREE.Matrix4(), name }],
      scene,
      fallback: true,
    };
    this.templates.set(name, fb);
    return fb;
  }

  private flatten(name: string, root: THREE.Object3D): ModelTemplate {
    root.updateMatrixWorld(true);
    const parts: ModelPart[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        const material = this.materialFor(mats[0] ?? new THREE.MeshStandardMaterial(), o.name);
        o.material = material;
        o.castShadow = true;
        o.receiveShadow = true;
        parts.push({ geometry: o.geometry, material, matrix: o.matrixWorld.clone(), name: o.name });
      }
    });
    return { name, parts, scene: root, fallback: false };
  }
}

/** Many copies of one model drawn with one InstancedMesh per part. */
export class InstancedModel {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly offsets: THREE.Matrix4[] = [];
  private readonly tmp = new THREE.Matrix4();
  count = 0;

  constructor(
    template: ModelTemplate,
    readonly capacity: number,
    shadows = true,
  ) {
    for (const part of template.parts) {
      const m = new THREE.InstancedMesh(part.geometry, part.material, capacity);
      m.count = 0;
      m.castShadow = shadows;
      m.receiveShadow = true;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.meshes.push(m);
      this.offsets.push(part.matrix);
      this.group.add(m);
    }
  }

  begin(): void {
    this.count = 0;
  }

  add(matrix: THREE.Matrix4): number {
    if (this.count >= this.capacity) return -1;
    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      const off = this.offsets[i];
      if (!mesh || !off) continue;
      this.tmp.multiplyMatrices(matrix, off);
      mesh.setMatrixAt(this.count, this.tmp);
    }
    return this.count++;
  }

  end(): void {
    for (const m of this.meshes) {
      m.count = this.count;
      m.instanceMatrix.needsUpdate = true;
    }
  }

  setShadows(on: boolean): void {
    for (const m of this.meshes) m.castShadow = on;
  }
}
