import * as THREE from 'three';
import { SIGNS } from '../data/signs';

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** A sign face material with the text drawn on a canvas (cached per text and style). */
export function signMaterial(
  index: number,
  style: 'billboard' | 'road',
): THREE.MeshStandardMaterial {
  const key = `${style}:${index}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const text = SIGNS[index % SIGNS.length] ?? '';
  const c = document.createElement('canvas');
  c.width = style === 'billboard' ? 1024 : 512;
  c.height = style === 'billboard' ? 480 : 220;
  const g = c.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  if (style === 'billboard') {
    const grad = g.createLinearGradient(0, 0, c.width, c.height);
    const hues = ['#1f5fbf', '#2a9d8f', '#6a4fb3', '#d9302c', '#1c1e22'];
    grad.addColorStop(0, hues[index % hues.length] ?? '#1f5fbf');
    grad.addColorStop(1, '#10141a');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#ffc72c';
    g.fillRect(0, c.height - 36, c.width, 36);
    g.fillStyle = '#ffffff';
  } else {
    g.fillStyle = '#ffc72c';
    g.fillRect(0, 0, c.width, c.height);
    g.lineWidth = 14;
    g.strokeStyle = '#1c1e22';
    g.strokeRect(10, 10, c.width - 20, c.height - 20);
    g.fillStyle = '#1c1e22';
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  const size = style === 'billboard' ? 84 : 44;
  g.font = `700 ${size}px Rajdhani, system-ui, sans-serif`;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > c.width * 0.86 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const lh = size * 1.05;
  const top = c.height / 2 - ((lines.length - 1) * lh) / 2 - (style === 'billboard' ? 14 : 0);
  lines.forEach((l, i) => g.fillText(l, c.width / 2, top + i * lh));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // glTF UVs have V pointing down; match that instead of WebGL's default flip.
  tex.flipY = false;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: 0xffffff,
    emissiveIntensity: style === 'billboard' ? 0.45 : 0.15,
    roughness: 0.7,
  });
  cache.set(key, mat);
  return mat;
}
