import * as THREE from 'three';
import { TUNING } from './data/tuning';
import { FixedLoop } from './core/loop';
import { Input, type Command } from './core/input';
import { StateMachine } from './core/stateMachine';
import { seedFromUrl } from './core/rng';
import { Sim } from './sim/sim';
import { CameraRig } from './render/cameraRig';
import { Road } from './render/world';
import { CharacterAnimator, buildGreyboxRig, type Pose } from './render/character';
import { EntityRenderer } from './render/entities';
import { ModelLibrary } from './render/models/library';
import { Chaser } from './render/chaser';
import { DebugOverlay } from './ui/debugOverlay';

const GAME_OVER_LINES = [
  'Merge conflict unresolved.',
  'Production is down.',
  'Tech debt wins this time.',
];

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly road = new Road();
  private readonly params: URLSearchParams;
  private readonly sim: Sim;
  private readonly library = new ModelLibrary((m) => m);
  private readonly entities = new EntityRenderer(this.library);
  private readonly chaser = new Chaser(this.library);
  private readonly machine = new StateMachine();
  private readonly input = new Input();
  private readonly loop: FixedLoop;
  private readonly debug: DebugOverlay;
  private readonly character = buildGreyboxRig();
  private readonly animator = new CharacterAnimator(this.character);
  private readonly overlay = document.createElement('div');
  private prevX = 0;
  private prevY = 0;
  private prevDistance = 0;
  private prevGap = 0;
  private lastDistance = 0;
  private stumbleAge = 99;
  private runCount = 0;

  constructor(canvas: HTMLCanvasElement, params: URLSearchParams) {
    this.params = params;
    this.sim = new Sim(seedFromUrl(window.location.search));
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
    this.scene.add(
      sun,
      this.road.group,
      this.character.root,
      this.entities.group,
      this.chaser.group,
    );

    this.overlay.style.cssText =
      'position:fixed;inset:0;display:none;place-items:center;text-align:center;color:#fff;font:600 28px system-ui;background:#0008;white-space:pre-line';
    document.body.appendChild(this.overlay);

    this.input.onCommand((cmd) => this.onCommand(cmd));
    this.machine.onChange((next) => this.onState(next));
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

  private onState(next: string): void {
    this.loop.paused = next === 'Paused';
    if (next === 'Paused') this.showOverlay('Paused\nEsc to resume');
    else if (next === 'GameOver') {
      const line = GAME_OVER_LINES[this.sim.rng.int(0, GAME_OVER_LINES.length - 1)] ?? '';
      this.showOverlay(`${line}\n${Math.floor(this.sim.distance)} m\nEnter to try again`);
    } else this.showOverlay('');
  }

  private showOverlay(text: string): void {
    this.overlay.textContent = text;
    this.overlay.style.display = text ? 'grid' : 'none';
  }

  private onCommand(cmd: Command): void {
    const state = this.machine.state;
    if (cmd === 'pause') {
      if (state === 'Playing') this.machine.go('Paused');
      else if (state === 'Paused') this.machine.go('Playing');
      return;
    }
    if (state === 'GameOver' && (cmd === 'confirm' || cmd === 'jump')) {
      this.restart();
      return;
    }
    if (state !== 'Playing') return;
    if (cmd === 'left' || cmd === 'right' || cmd === 'jump' || cmd === 'slide')
      this.sim.command(cmd);
  }

  private restart(): void {
    this.runCount++;
    const fixed = this.params.get('seed');
    this.sim.reset(fixed ? this.sim.seed : (this.sim.seed + this.runCount * 7919) >>> 0);
    this.prevDistance = this.lastDistance = 0;
    this.machine.go('Playing');
  }

  private update(dt: number): void {
    this.prevX = this.sim.player.x;
    this.prevY = this.sim.player.y;
    this.prevDistance = this.sim.distance;
    this.prevGap = this.sim.gap;
    const state = this.machine.state;
    if (state === 'Playing' || state === 'Crashing') this.sim.step(dt);
    if (state === 'Playing' && !this.sim.alive) this.machine.go('Crashing');
    if (state === 'Crashing' && this.sim.deadTime > 1.6) this.machine.go('GameOver');
  }

  private consumeEvents(): void {
    const ev = this.sim.events;
    for (let i = 0; i < ev.count; i++) {
      const e = ev.get(i);
      if (!e) continue;
      if (e.type === 'stumble') {
        this.rig.shake(TUNING.camera.shakeStumble);
        this.stumbleAge = 0;
      } else if (e.type === 'crash' || e.type === 'caught') {
        this.rig.shake(TUNING.camera.shakeCrash);
      }
    }
    ev.clear();
  }

  private render(alpha: number, frameDt: number): void {
    this.consumeEvents();
    const p = this.sim.player;
    const x = this.prevX + (p.x - this.prevX) * alpha;
    const y = this.prevY + (p.y - this.prevY) * alpha;
    this.character.root.position.set(x, y, 0);
    this.stumbleAge += frameDt;
    const state = this.machine.state;
    let pose: Pose = 'run';
    let poseTime = 0;
    if (state === 'Crashing' || state === 'GameOver') {
      pose = 'crash';
      poseTime = this.sim.deadTime;
    } else if (this.stumbleAge < 0.6) {
      pose = 'stumble';
      poseTime = this.stumbleAge;
    }
    this.animator.update(p, this.sim.speed, frameDt, pose, poseTime, this.sim.iframes > 0);

    const renderDistance = this.prevDistance + (this.sim.distance - this.prevDistance) * alpha;
    this.road.scroll(renderDistance - this.lastDistance);
    this.lastDistance = renderDistance;
    this.entities.update(this.sim, renderDistance, frameDt);
    const gap = this.prevGap + (this.sim.gap - this.prevGap) * alpha;
    this.chaser.update(
      gap,
      x,
      Math.max(this.sim.speed, state === 'Crashing' ? 8 : 0),
      frameDt,
      true,
    );

    const { start, max } = TUNING.speed;
    this.rig.update((this.sim.speed - start) / (max - start), x, frameDt, y);
    this.renderer.render(this.scene, this.rig.camera);
    this.debug.update(frameDt, {
      speed: this.sim.speed,
      distance: this.sim.distance,
      state,
      tier: this.sim.tier,
      zone: this.sim.zone,
      gap: this.sim.gap,
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
