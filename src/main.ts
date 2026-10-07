import * as THREE from 'three';
import { GAME_TITLE, TUNING } from './data/tuning';
import { FixedLoop } from './core/loop';
import { Input } from './core/input';
import { Rng, seedFromUrl } from './core/rng';
import { StateMachine } from './core/stateMachine';
import { speedAt } from './sim/speed';
import { CameraRig } from './render/cameraRig';
import { Road } from './render/world';
import { DebugOverlay } from './ui/debugOverlay';

const params = new URLSearchParams(window.location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('canvas #game missing');
document.title = GAME_TITLE;

const rng = new Rng(seedFromUrl(window.location.search));
void rng; // used by the generator from Phase 3

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ec9e8);
scene.fog = new THREE.Fog(0x9ec9e8, 40, 110);
scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.6));
const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
sun.position.set(-8, 14, 6);
scene.add(sun);

const road = new Road();
scene.add(road.group);

// Greybox player (replaced by the Blender character in Phase 7).
const player = new THREE.Mesh(
  new THREE.BoxGeometry(TUNING.player.width, TUNING.player.height, TUNING.player.depth),
  new THREE.MeshStandardMaterial({ color: 0xffc72c, flatShading: true }),
);
player.position.y = TUNING.player.height / 2;
scene.add(player);

const rig = new CameraRig();
const input = new Input();
const machine = new StateMachine();
const debug = new DebugOverlay(renderer, params.get('debug') === '1');

let elapsed = 0;
let distance = 0;
let speed = speedAt(0);

const loop = new FixedLoop(
  (dt) => {
    for (const cmd of input.drain()) {
      if (cmd === 'pause') {
        if (machine.state === 'Playing') machine.go('Paused');
        else if (machine.state === 'Paused') machine.go('Playing');
      }
    }
    elapsed += dt;
    speed = speedAt(elapsed);
    distance += speed * dt;
    road.scroll(speed * dt);
  },
  (_alpha, frameDt) => {
    rig.update((speed - TUNING.speed.start) / (TUNING.speed.max - TUNING.speed.start), 0, frameDt);
    renderer.render(scene, rig.camera);
    debug.update(frameDt, { speed, distance, state: machine.state });
  },
);

machine.onChange((next) => {
  loop.paused = next === 'Paused';
});
machine.go('Playing');

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  rig.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) machine.go('Paused');
  loop.resetClock();
});
resize();
loop.start();
