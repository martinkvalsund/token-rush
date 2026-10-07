import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ShopItem } from '../data/shop';
import type { ModelLibrary } from './models/library';
import { disposeRecolored, recoloredMaterial } from './palette';

const SIZE = 224;

/**
 * Renders shop card pictures of the Blender models (outfits on the full character, headgear,
 * companions) with a small throwaway renderer, so the main canvas is never disturbed.
 */
export function renderThumbnails(
  lib: ModelLibrary,
  items: readonly ShopItem[],
): Map<string, string> {
  const out = new Map<string, string>();
  const wanted = items.filter((i) => i.category === 'outfit' || i.category === 'hat' || i.model);
  if (wanted.length === 0 || !lib.has('developer')) return out;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: document.createElement('canvas'),
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
  } catch {
    return out;
  }
  renderer.setSize(SIZE, SIZE, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.5);
  sun.position.set(2, 4, -3);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 0.5), sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const box = new THREE.Box3();
  const sphere = new THREE.Sphere();
  const dir = new THREE.Vector3(0.55, 0.25, -1).normalize();

  const shoot = (obj: THREE.Object3D, id: string) => {
    scene.add(obj);
    obj.updateMatrixWorld(true);
    box.setFromObject(obj).getBoundingSphere(sphere);
    const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02;
    camera.position.copy(sphere.center).addScaledVector(dir, dist);
    camera.lookAt(sphere.center);
    renderer.render(scene, camera);
    out.set(id, renderer.domElement.toDataURL('image/png'));
    scene.remove(obj);
  };

  for (const item of wanted) {
    if (item.category === 'outfit') {
      const dev = lib.get('developer').scene.clone(true);
      const mat =
        item.recolor && Object.keys(item.recolor).length ? recoloredMaterial(item.recolor) : null;
      if (mat)
        dev.traverse((o) => {
          if (o instanceof THREE.Mesh) o.material = mat;
        });
      shoot(dev, item.id);
      if (mat) disposeRecolored(mat);
    } else if (item.model && lib.has(item.model)) {
      shoot(lib.get(item.model).scene.clone(true), item.id);
    } else if (item.category === 'hat') {
      const hat = lib.get('developer').scene.getObjectByName('hardhat')?.clone(true);
      if (hat) {
        hat.position.set(0, 0, 0);
        shoot(hat, item.id);
      }
    }
  }
  scene.environment?.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
