import * as THREE from 'three';
import { JOINTS, buildGreyboxRig, type CharacterRig } from './character';
import type { ModelLibrary } from './models/library';

/** Build the character rig from the Blender model, falling back to the greybox. */
export function buildCharacterRig(lib: ModelLibrary): CharacterRig {
  if (!lib.has('developer')) return buildGreyboxRig();
  const model = lib.get('developer').scene.clone(true);
  const root = new THREE.Group();
  root.add(model);
  const find = (name: string): THREE.Object3D | undefined => model.getObjectByName(name);
  const joints: Partial<Record<(typeof JOINTS)[number], THREE.Object3D>> = {};
  for (const j of JOINTS) {
    const o = find(j);
    if (!o) return buildGreyboxRig();
    joints[j] = o;
  }
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return { root, ...(joints as Record<(typeof JOINTS)[number], THREE.Object3D>) };
}
