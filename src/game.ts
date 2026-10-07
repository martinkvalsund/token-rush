import * as THREE from 'three';
import { TUNING } from './data/tuning';
import { FixedLoop } from './core/loop';
import { Input, type Command } from './core/input';
import { StateMachine } from './core/stateMachine';
import { Sim } from './sim/sim';
import { CameraRig } from './render/cameraRig';
import { Road } from './render/world';
import { CharacterAnimator, buildGreyboxRig } from './render/character';
import { DebugOverlay } from './ui/debugOverlay';
import { seedFromUrl } from './core/rng';
import { EntityRenderer } from './render/entities';
import { ModelLibrary } from './render/models/library';

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly road = new Road();
  private readonly sim = new Sim(seedFromUrl(window.location.search));
  private readonly library = new ModelLibrary((m) => m);
  private readonly entities = new EntityRenderer(this.library);
  private prevDistance = 0;
  private readonly machine = new StateMachine();
  private readonly input = new Input();
  private readonly loop: FixedLoop;
  private readonly debug: DebugOverlay;
  private readonly character = buildGreyboxRig();
  private readonly animator = new CharacterAnimator(this.character);
  private prevX = 0;
  private prevY = 0;
  private lastDistance = 0;

  constructor(canvas: HTMLCanvasElement, params: URLSearchParams) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.debug = new DebugOverlay(this.renderer, params.get('debug') === '1');

    this.scene.background = new THREE.Color(0x9ec9e8);
    this.scene.fog = new THREE.Fog(0x9ec9e8, 40, 110);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.6));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
    sun.position.set(-8, 14, 6);
    this.scene.add(sun, this.road.group, this.character.root, this.entities.group);

    this.input.onCommand((cmd) => this.onCommand(cmd));
    this.machine.onChange((next) => {
      this.loop.paused = next === 'Paused';
    });
    this.loop = new FixedLoop(
      (dt) => this.update(dt),
      (alpha, frameDt) => this.render(alpha, frameDt),
    );

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.machine.state === 'Playing') this.machine.go('Paused');
      this.loop.resetClock();
    });
    this.resize();
  }

  start(): void {
    this.machine.go('Playing');
    this.loop.start();
  }

  private onCommand(cmd: Command): void {
    if (cmd === 'pause') {
      if (this.machine.state === 'Playing') this.machine.go('Paused');
      else if (this.machine.state === 'Paused') this.machine.go('Playing');
      return;
    }
    if (this.machine.state !== 'Playing') return;
    if (cmd === 'left' || cmd === 'right' || cmd === 'jump' || cmd === 'slide')
      this.sim.command(cmd);
  }

  private update(dt: number): void {
    this.prevX = this.sim.player.x;
    this.prevY = this.sim.player.y;
    this.prevDistance = this.sim.distance;
    this.sim.step(dt);
    this.sim.events.clear();
  }

  private render(alpha: number, frameDt: number): void {
    const p = this.sim.player;
    const x = this.prevX + (p.x - this.prevX) * alpha;
    const y = this.prevY + (p.y - this.prevY) * alpha;
    this.character.root.position.set(x, y, 0);
    this.animator.update(
      p,
      this.sim.speed,
      frameDt,
      this.machine.state === 'Playing' ? 'run' : 'idle',
      0,
      false,
    );
    const renderDistance = this.prevDistance + (this.sim.distance - this.prevDistance) * alpha;
    this.road.scroll(renderDistance - this.lastDistance);
    this.lastDistance = renderDistance;
    this.entities.update(this.sim, renderDistance, frameDt);
    const { start, max } = TUNING.speed;
    this.rig.update((this.sim.speed - start) / (max - start), x, frameDt);
    this.renderer.render(this.scene, this.rig.camera);
    this.debug.update(frameDt, {
      speed: this.sim.speed,
      distance: this.sim.distance,
      state: this.machine.state,
      tier: this.sim.tier,
      zone: this.sim.zone,
      pattern: this.sim.generator.currentPatternId,
      obstacles: this.sim.world.obstacles.countActive(),
      tokens: this.sim.world.tokens.countActive(),
    });
  }

  private resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.rig.resize(window.innerWidth, window.innerHeight);
  }
}
