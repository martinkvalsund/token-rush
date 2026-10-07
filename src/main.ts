import * as THREE from 'three';
import { GAME_TITLE } from './data/tuning';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('canvas #game missing');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141a);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300);
camera.position.set(0, 4.2, 7.5);
camera.lookAt(0, 1.2, -8);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.5));
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffc72c, flatShading: true }),
);
cube.position.y = 0.5;
scene.add(cube);
document.title = GAME_TITLE;

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
});
