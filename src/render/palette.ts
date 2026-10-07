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

/** Surface response per swatch: [roughness, metalness]. Unlisted swatches are painted metal/plastic. */
const SURFACE: Record<string, [number, number]> = {
  silver: [0.28, 0.85],
  steel_blue: [0.38, 0.55],
  steel_blue_dark: [0.4, 0.55],
  night_steel: [0.42, 0.6],
  gold: [0.3, 0.8],
  gold_dark: [0.35, 0.75],
  grey: [0.5, 0.35],
  dark_grey: [0.55, 0.3],
  light_grey: [0.5, 0.3],
  glass: [0.08, 0.2],
  rubber: [0.9, 0],
  black: [0.6, 0.1],
  concrete: [0.92, 0],
  concrete_dark: [0.92, 0],
  rock: [0.95, 0],
  rock_dark: [0.95, 0],
  wood: [0.85, 0],
  tan: [0.9, 0],
  sand: [0.95, 0],
  dirt: [0.95, 0],
  brown: [0.8, 0],
  brown_dark: [0.8, 0],
  canvas: [0.9, 0],
  asphalt: [0.95, 0],
  denim: [0.85, 0],
  skin: [0.6, 0],
  hair: [0.7, 0],
  rust: [0.8, 0.2],
  water: [0.15, 0.1],
};
const PAINT: [number, number] = [0.42, 0.08];
const GLOW: [number, number] = [0.5, 0];

/** glTF-style ORM map: G = roughness, B = metalness. */
function surfaceTexture(): THREE.DataTexture {
  const n = palette.size;
  const data = new Uint8Array(n * n * 4);
  palette.colors.forEach((c, i) => {
    const [rough, metal] = SURFACE[c.name] ?? (c.emissive ? GLOW : PAINT);
    const o = (Math.floor(i / n) * n + (i % n)) * 4;
    data[o] = 255;
    data[o + 1] = Math.round(rough * 255);
    data[o + 2] = Math.round(metal * 255);
    data[o + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

let shared: THREE.MeshStandardMaterial | null = null;

export function paletteMaterial(): THREE.MeshStandardMaterial {
  if (shared) return shared;
  const surface = surfaceTexture();
  shared = new THREE.MeshStandardMaterial({
    map: paletteTexture(false),
    emissiveMap: paletteTexture(true),
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
    roughnessMap: surface,
    metalnessMap: surface,
    roughness: 1,
    metalness: 1,
    // Models are smooth-shaded with crisp creases (bevelled in Blender).
    flatShading: false,
  });
  return shared;
}

export function paletteHex(name: string): number {
  const c = palette.colors.find((p) => p.name === name);
  return c ? Number.parseInt(c.hex.slice(1), 16) : 0xff00ff;
}
