import * as THREE from 'three';
import palette from '../../art/palette.json';

/**
 * Every Blender model's UVs point at a swatch in this 8x8 palette, so one material draws
 * everything. Emissive swatches (names starting with glow_) also feed the emissive map.
 */
function paletteTexture(emissiveOnly: boolean): THREE.DataTexture {
  const n = palette.size;
  const data = new Uint8Array(n * n * 4);
  palette.colors.forEach((c, i) => {
    const x = i % n;
    // glTF flips V (v' = 1 - v), so the first palette row lives at the bottom of the data.
    const y = Math.floor(i / n);
    const o = (y * n + x) * 4;
    const v = Number.parseInt(c.hex.slice(1), 16);
    const on = !emissiveOnly || c.emissive;
    data[o] = on ? (v >> 16) & 255 : 0;
    data[o + 1] = on ? (v >> 8) & 255 : 0;
    data[o + 2] = on ? v & 255 : 0;
    data[o + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

let shared: THREE.MeshStandardMaterial | null = null;

export function paletteMaterial(): THREE.MeshStandardMaterial {
  if (shared) return shared;
  shared = new THREE.MeshStandardMaterial({
    map: paletteTexture(false),
    emissiveMap: paletteTexture(true),
    emissive: 0xffffff,
    emissiveIntensity: 1.6,
    roughness: 0.82,
    metalness: 0.05,
    flatShading: true,
  });
  return shared;
}

export function paletteHex(name: string): number {
  const c = palette.colors.find((p) => p.name === name);
  return c ? Number.parseInt(c.hex.slice(1), 16) : 0xff00ff;
}
