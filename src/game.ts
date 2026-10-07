import * as THREE from 'three';
import { TUNING } from './data/tuning';
import { FixedLoop } from './core/loop';
import { Input, type Command } from './core/input';
import { StateMachine, type GameState } from './core/stateMachine';
import { seedFromUrl } from './core/rng';
import { Storage } from './core/storage';
import { Sim } from './sim/sim';
import { CameraRig } from './render/cameraRig';
import { Road } from './render/world';
import { CharacterAnimator, buildGreyboxRig, type Pose } from './render/character';
import { EntityRenderer } from './render/entities';
import { ModelLibrary } from './render/models/library';
import { Chaser } from './render/chaser';
import { DebugOverlay } from './ui/debugOverlay';
import { UI, type UiAction } from './ui/ui';

const GAME_OVER_LINES = [
  'Merge conflict unresolved.',
  'Production is down.',
  'Tech debt wins this time.',
];

const COUNTDOWN_SECONDS = 3;

export class Game {
  readonly sim: Sim;
  readonly machine = new StateMachine();
  readonly storage = new Storage();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig = new CameraRig();
  private readonly road = new Road();
  private readonly params: URLSearchParams;
  private readonly library = new ModelLibrary((m) => m);
  private readonly entities = new EntityRenderer(this.library);
  private readonly chaser = new Chaser(this.library);
  private readonly input = new Input();
  private readonly loop: FixedLoop;
  private readonly debug: DebugOverlay;
  private readonly character = buildGreyboxRig();
  private readonly animator = new CharacterAnimator(this.character);
  private readonly ui = new UI();
  private prevX = 0;
  private prevY = 0;
  private prevDistance = 0;
  private prevGap = 0;
  private lastDistance = 0;
  private stumbleAge = 99;
  private runCount = 0;
  private countdownLeft = 0;
  private settingsReturn: GameState = 'Menu';

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

    this.ui.onAction((a) => this.onUi(a));
    this.ui.setSave(this.storage.data);
    this.input.onCommand((cmd) => this.onCommand(cmd));
    this.machine.onChange((next, prev) => this.onState(next, prev));
    this.loop = new FixedLoop(
      (dt) => this.update(dt),
      (alpha, frameDt) => this.render(alpha, frameDt),
    );

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('blur', () => this.autoPause());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
      this.loop.resetClock();
    });
    this.resize();
  }

  start(): void {
    this.machine.go('Menu');
    this.loop.start();
  }

  private autoPause(): void {
    const s = this.machine.state;
    if (s === 'Playing' || s === 'Countdown') this.machine.go('Paused');
  }

  private onState(next: GameState, prev: GameState): void {
    this.loop.paused = next === 'Paused';
    switch (next) {
      case 'Menu':
        this.ui.setSave(this.storage.data);
        this.ui.countdown(-1);
        if (prev !== 'Boot') this.newRun();
        this.ui.show('menu');
        break;
      case 'Countdown':
        this.countdownLeft = COUNTDOWN_SECONDS;
        this.ui.show('hud');
        this.ui.countdown(COUNTDOWN_SECONDS);
        break;
      case 'Playing':
        this.ui.countdown(-1);
        this.ui.show('hud');
        break;
      case 'Paused':
        this.ui.countdown(-1);
        this.ui.show('pause');
        break;
      case 'GameOver': {
        const s = this.sim;
        const newBest = this.storage.recordRun(s.score, s.distance, s.tokens);
        this.ui.showGameOver({
          score: s.score,
          distance: s.distance,
          tokens: s.tokens,
          newBest,
          highScore: this.storage.data.highScore,
          message: GAME_OVER_LINES[s.rng.int(0, GAME_OVER_LINES.length - 1)] ?? '',
        });
        break;
      }
      default:
        break;
    }
  }

  private onUi(a: UiAction): void {
    const state = this.machine.state;
    switch (a) {
      case 'play':
        this.machine.go('Countdown');
        break;
      case 'retry':
        this.newRun();
        this.machine.go('Countdown');
        break;
      case 'resume':
        this.machine.go('Playing');
        break;
      case 'quit':
      case 'menu':
        this.machine.go('Menu');
        break;
      case 'stats':
        this.ui.setSave(this.storage.data);
        this.ui.show('stats');
        break;
      case 'settings':
      case 'help':
        this.settingsReturn = state;
        this.ui.toast('Coming soon');
        break;
      case 'back':
        this.ui.show(this.settingsReturn === 'Paused' ? 'pause' : 'menu');
        break;
    }
  }

  private onCommand(cmd: Command): void {
    const state = this.machine.state;
    if (cmd === 'pause') {
      if (state === 'Playing' || state === 'Countdown') this.machine.go('Paused');
      else if (state === 'Paused') this.machine.go('Playing');
      else if (state === 'GameOver') this.machine.go('Menu');
      else if (this.ui.screen !== 'menu' && state === 'Menu') this.ui.show('menu');
      return;
    }
    if (state === 'Menu' && cmd === 'confirm' && this.ui.screen === 'menu') {
      this.onUi('play');
      return;
    }
    if (state === 'GameOver' && (cmd === 'confirm' || cmd === 'jump')) {
      this.onUi('retry');
      return;
    }
    if (state !== 'Playing') return;
    if (cmd === 'left' || cmd === 'right' || cmd === 'jump' || cmd === 'slide')
      this.sim.command(cmd);
  }

  private newRun(): void {
    this.runCount++;
    const fixed = this.params.get('seed');
    this.sim.reset(fixed ? this.sim.seed : (this.sim.seed + this.runCount * 7919) >>> 0);
    this.prevDistance = this.lastDistance = 0;
    this.prevGap = this.sim.gap;
    this.stumbleAge = 99;
  }

  private update(dt: number): void {
    this.prevX = this.sim.player.x;
    this.prevY = this.sim.player.y;
    this.prevDistance = this.sim.distance;
    this.prevGap = this.sim.gap;
    const state = this.machine.state;
    if (state === 'Countdown') {
      const before = Math.ceil(this.countdownLeft);
      this.countdownLeft -= dt;
      const after = Math.ceil(this.countdownLeft);
      if (after !== before) this.ui.countdown(after);
      if (this.countdownLeft <= 0) this.machine.go('Playing');
      return;
    }
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
    if (state === 'Menu' || state === 'Countdown') pose = 'idle';
    else if (state === 'Crashing' || state === 'GameOver') {
      pose = 'crash';
      poseTime = this.sim.deadTime;
    } else if (this.stumbleAge < 0.6) {
      pose = 'stumble';
      poseTime = this.stumbleAge;
    }
    const animDt = state === 'Paused' ? 0 : frameDt;
    this.animator.update(p, this.sim.speed, animDt, pose, poseTime, this.sim.iframes > 0);

    const renderDistance = this.prevDistance + (this.sim.distance - this.prevDistance) * alpha;
    this.road.scroll(renderDistance - this.lastDistance);
    this.lastDistance = renderDistance;
    this.entities.update(this.sim, renderDistance, animDt);
    const gap = this.prevGap + (this.sim.gap - this.prevGap) * alpha;
    this.chaser.update(
      gap,
      x,
      Math.max(this.sim.speed, state === 'Crashing' ? 8 : 0),
      animDt,
      state !== 'Menu',
    );

    const { start, max } = TUNING.speed;
    this.rig.update((this.sim.speed - start) / (max - start), x, frameDt, y);
    this.renderer.render(this.scene, this.rig.camera);

    if (state === 'Playing' || state === 'Countdown' || state === 'Crashing') {
      const s = this.sim;
      this.ui.updateHud({
        score: s.score,
        distance: s.distance,
        tokens: s.tokens,
        lives: s.lives,
        multiplier: s.multiplier,
      });
    }
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
