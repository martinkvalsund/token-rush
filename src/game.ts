import * as THREE from 'three';
import { TUNING } from './data/tuning';
import { ZONES } from './data/zones';
import { FixedLoop } from './core/loop';
import { Input, type Command } from './core/input';
import { StateMachine, type GameState } from './core/stateMachine';
import { seedFromUrl } from './core/rng';
import { Storage } from './core/storage';
import { Sim } from './sim/sim';
import { TIMED, type TimedPowerup } from './sim/powerups';
import { POWERUP_TYPES, type PowerupType } from './sim/entities';
import { ModelLibrary } from './render/models/library';
import { MODEL_NAMES } from './render/models/manifest';
import { paletteMaterial } from './render/palette';
import { View } from './render/view';
import { Post } from './render/post';
import { AdaptiveQuality, type Level } from './render/quality';
import { installGestures, setPointerCapture } from './core/gestures';
import { Bot, PERFECT } from './sim/bot';
import { buildSettings } from './ui/settings';
import { buildHelp } from './ui/help';
import type { Pose } from './render/character';
import { DebugOverlay } from './ui/debugOverlay';
import { UI, type UiAction } from './ui/ui';
import { POWERUP_NAMES } from './ui/icons';
import { AudioEngine } from './audio/engine';
import { Sfx } from './audio/sfx';
import { Music } from './audio/music';

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
  readonly renderer: THREE.WebGLRenderer;
  private readonly params: URLSearchParams;
  private readonly library = new ModelLibrary(() => paletteMaterial());
  private view: View | null = null;
  private canvas!: HTMLCanvasElement;
  private lockPausedAt = -1e9;
  /** Autoplay (?bot=1): plays the game for demos, soak tests and screenshots. */
  private readonly bot: Bot | null;
  private post: Post | null = null;
  private readonly quality = new AdaptiveQuality((l) => this.applyQuality(l));
  private fpsAcc = 0;
  private fpsFrames = 0;
  private popupTokens = 0;
  private popupTimer = 0;
  private readonly input = new Input();
  private readonly loop: FixedLoop;
  private readonly debug: DebugOverlay;
  private readonly ui = new UI();
  private readonly audio = new AudioEngine();
  private readonly sfx = new Sfx(this.audio);
  private readonly music = new Music(this.audio);
  private prevX = 0;
  private prevY = 0;
  private prevDistance = 0;
  private prevGap = 0;
  private stumbleAge = 99;
  private runCount = 0;
  private countdownLeft = 0;
  private settingsReturn: GameState = 'Menu';
  private readonly puLeft: Record<TimedPowerup, number> = {
    magnet: 0,
    jetpack: 0,
    shield: 0,
    double: 0,
    boots: 0,
  };
  private readonly puBlink: Partial<Record<TimedPowerup, boolean>> = {};

  constructor(canvas: HTMLCanvasElement, params: URLSearchParams) {
    this.params = params;
    this.sim = new Sim(seedFromUrl(window.location.search));
    this.bot = params.get('bot') === '1' ? new Bot(PERFECT) : null;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Count draw calls across all passes (shadow + scene + post) per frame.
    this.renderer.info.autoReset = false;
    this.debug = new DebugOverlay(this.renderer, params.get('debug') === '1');
    if (params.get('debug') === '1') this.debugKeys();
    this.konami();

    this.ui.onAction((a) => {
      this.sfx.click();
      this.onUi(a);
    });
    this.ui.setSave(this.storage.data);
    this.applyAudioSettings();
    this.ui.addScreen(
      'settings',
      buildSettings(
        this.storage.data.settings,
        () => this.onSettingsChanged(),
        () => {
          this.storage.reset();
          this.ui.setSave(this.storage.data);
        },
        () => this.onUi('back'),
      ),
    );
    this.ui.addScreen(
      'help',
      buildHelp(() => this.onUi('back')),
    );
    installGestures(
      canvas,
      (cmd) => this.onCommand(cmd),
      () => ({
        trackpad: this.storage.data.settings.controls === 'trackpad',
        sensitivity: this.storage.data.settings.swipeSensitivity,
        flicking: this.machine.state === 'Playing',
      }),
    );
    // Losing the pointer capture mid-run (Esc releases it in the browser) pauses the game.
    document.addEventListener('pointerlockchange', () => {
      const s = this.machine.state;
      if (!document.pointerLockElement && (s === 'Playing' || s === 'Countdown')) {
        this.lockPausedAt = performance.now();
        this.machine.go('Paused');
      }
    });
    this.canvas = canvas;
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
  }

  /** Load the Blender models, build the 3D view, then show the menu. */
  async start(): Promise<void> {
    await this.library.loadAll(MODEL_NAMES);
    this.view = new View(this.library);
    this.post = new Post(this.renderer, this.view.scene, this.view.rig.camera);
    this.onSettingsChanged();
    this.resize();
    this.machine.go('Menu');
    this.loop.start();
  }

  /** Debug hotkeys (?debug=1): G god mode, 1-6 power-ups, T slow motion, N next zone, K faster. */
  private debugKeys(): void {
    window.addEventListener('keydown', (e) => {
      const sim = this.sim;
      if (e.code === 'KeyG') {
        sim.god = !sim.god;
        this.ui.toast(`God mode ${sim.god ? 'on' : 'off'}`);
      } else if (e.code === 'KeyT') {
        this.loop.timeScale = this.loop.timeScale === 1 ? 0.3 : 1;
      } else if (e.code === 'KeyN') {
        this.skipToNextZone();
      } else if (e.code === 'KeyK') {
        sim.elapsed += 30;
      } else if (/^Digit[1-6]$/.test(e.code)) {
        const t = POWERUP_TYPES[Number(e.code.slice(5)) - 1];
        if (t) sim.activate(t);
      }
    });
  }

  /** Debug/screenshot helper: jump to just before the next zone boundary. */
  skipToNextZone(): void {
    const sim = this.sim;
    const len = TUNING.world.zoneLength;
    sim.distance = (Math.floor(sim.distance / len) + 1) * len - 20;
    for (const pool of Object.values(sim.world)) pool.clear();
    sim.generator.cursor = sim.distance + 20;
    this.prevDistance = sim.distance;
  }

  private onSettingsChanged(): void {
    const s = this.storage.data.settings;
    this.storage.save();
    this.applyAudioSettings();
    this.quality.setMode(s.quality);
    this.view?.setReduceMotion(s.reduceMotion);
    if (!s.showFps) this.ui.setFps(null);
  }

  private applyQuality(level: Level): void {
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(
      level === 'high' ? Math.min(dpr, 2) : level === 'medium' ? Math.min(dpr, 1.5) : 1,
    );
    this.renderer.shadowMap.enabled = level !== 'low';
    if (this.post) this.post.enabled = level !== 'low';
    this.view?.applyQuality(level);
    this.resize();
  }

  private applyAudioSettings(): void {
    const s = this.storage.data.settings;
    this.audio.setVolumes(s.masterVolume, s.musicVolume, s.sfxVolume, s.muted);
  }

  /** Easter egg: the Konami code on the menu. */
  private konami(): void {
    const seq = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];
    let i = 0;
    window.addEventListener('keydown', (e) => {
      if (this.machine.state !== 'Menu') {
        i = 0;
        return;
      }
      i = e.code === seq[i] ? i + 1 : e.code === seq[0] ? 1 : 0;
      if (i === seq.length) {
        i = 0;
        this.ui.toast('Achievement unlocked: Senior Developer 🦆', 3);
        this.sfx.fanfare();
        this.ui.confetti();
      }
    });
  }

  private autoPause(): void {
    const s = this.machine.state;
    if (s === 'Playing' || s === 'Countdown') this.machine.go('Paused');
  }

  private onState(next: GameState, prev: GameState): void {
    this.loop.paused = next === 'Paused';
    // Trackpad scheme: capture the pointer during runs so one-finger flicks need no click.
    const running = next === 'Playing' || next === 'Countdown';
    setPointerCapture(this.canvas, running && this.storage.data.settings.controls === 'trackpad');
    this.music.intensity = next === 'Playing' || next === 'Countdown' ? 1 : 0;
    if (this.view) this.view.rig.menu = next === 'Menu';
    this.audio.muffle(next === 'Crashing' || next === 'GameOver' || next === 'Paused');
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
        if (newBest && s.score > 0) {
          this.sfx.fanfare();
          if (!this.storage.data.settings.reduceMotion) this.ui.confetti();
        }
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
        this.ui.show(a);
        break;
      case 'back':
        this.ui.show(this.settingsReturn === 'Paused' ? 'pause' : 'menu');
        break;
    }
  }

  private onCommand(cmd: Command): void {
    const state = this.machine.state;
    if (cmd === 'mute') {
      const st = this.storage.data.settings;
      st.muted = !st.muted;
      this.storage.save();
      this.applyAudioSettings();
      this.ui.toast(st.muted ? 'Sound off' : 'Sound on', 1);
      return;
    }
    if (cmd === 'pause') {
      // The Esc that released the pointer already paused; don't let it also resume.
      if (performance.now() - this.lockPausedAt < 400) return;
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
    this.prevDistance = 0;
    this.prevGap = this.sim.gap;
    this.stumbleAge = 99;
    this.view?.resetScroll();
    this.bot?.reset();
    this.ui.clearWarnings();
    this.music.zone = 0;
    this.music.tier = 0;
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
      if (after !== before) {
        this.ui.countdown(after);
        this.sfx.countdown(after === 0);
      }
      if (this.countdownLeft <= 0) this.machine.go('Playing');
      return;
    }
    if (state === 'Playing' && this.bot) this.bot.update(this.sim, dt);
    if (state === 'Playing' || state === 'Crashing') this.sim.step(dt);
    if (state === 'Playing' && !this.sim.alive) this.machine.go('Crashing');
    if (state === 'Crashing' && this.sim.deadTime > 1.6) this.machine.go('GameOver');
  }

  private consumeEvents(view: View): void {
    const ev = this.sim.events;
    for (let i = 0; i < ev.count; i++) {
      const e = ev.get(i);
      if (!e) continue;
      view.onEvent(e, this.sim);
      if (e.type === 'token') {
        this.sfx.token(e.value);
        this.popupTokens++;
      } else if (e.type === 'jump') this.sfx.jump(e.value === 1);
      else if (e.type === 'land') this.sfx.land();
      else if (e.type === 'slide') this.sfx.slide();
      else if (e.type === 'lane') this.sfx.lane();
      else if (e.type === 'tier') this.music.tier = e.value;
      else if (e.type === 'stumble') {
        view.rig.shake(TUNING.camera.shakeStumble);
        this.stumbleAge = 0;
        this.sfx.stumble();
      } else if (e.type === 'crash' || e.type === 'caught') {
        view.rig.shake(TUNING.camera.shakeCrash);
        this.sfx.crash();
        this.audio.muffle(true);
      } else if (e.type === 'powerup') {
        const t = e.label as PowerupType;
        this.sfx.powerup(t);
        if (t === 'mystery') this.ui.toast('Mystery box…', 1.2);
        else this.ui.toast(POWERUP_NAMES[t]);
      } else if (e.type === 'mystery') {
        this.sfx.mysteryReveal();
        if (e.label === 'tokens') this.ui.toast('Token shower!');
        else if (e.label === 'score') this.ui.toast(`+${TUNING.powerups.mysteryScore} score`);
      } else if (e.type === 'shieldBreak') {
        this.sfx.shieldBreak();
        view.rig.shake(TUNING.camera.shakeStumble);
        this.ui.toast('Coffee saved you!');
      } else if (e.type === 'warning') {
        this.ui.warn(e.value);
        this.sfx.warning();
      } else if (e.type === 'zone') {
        this.ui.toast(ZONES[e.value]?.name ?? '', 2);
        this.music.zone = e.value;
        this.sfx.zone();
      }
    }
    ev.clear();
  }

  private render(alpha: number, frameDt: number): void {
    const view = this.view;
    if (!view) return;
    this.renderer.info.reset();
    this.consumeEvents(view);
    const sim = this.sim;
    const p = sim.player;
    const state = this.machine.state;
    const dt = state === 'Paused' ? 0 : frameDt;
    this.stumbleAge += dt;

    let pose: Pose = 'run';
    let poseTime = 0;
    if (state === 'Menu' || state === 'Countdown') pose = 'idle';
    else if (p.flying) pose = 'jetpack';
    else if (state === 'Crashing' || state === 'GameOver') {
      pose = 'crash';
      poseTime = sim.deadTime;
    } else if (this.stumbleAge < 0.6) {
      pose = 'stumble';
      poseTime = this.stumbleAge;
    }
    const pu = sim.powerups;
    const jetEnding = pu.active('jetpack') && pu.left.jetpack < TUNING.powerups.jetpackBlink;

    view.update(sim, {
      x: this.prevX + (p.x - this.prevX) * alpha,
      y: this.prevY + (p.y - this.prevY) * alpha,
      renderDistance: this.prevDistance + (sim.distance - this.prevDistance) * alpha,
      gap: this.prevGap + (sim.gap - this.prevGap) * alpha,
      pose,
      poseTime,
      blink: sim.iframes > 0 || jetEnding,
      dt,
      showChaser: state !== 'Menu',
    });
    this.post?.render(view.scene, view.rig.camera);
    this.quality.sample(
      frameDt,
      this.storage.data.settings.quality === 'auto' && state === 'Playing',
    );
    this.popupTimer -= frameDt;
    if (this.popupTokens > 0 && this.popupTimer <= 0) {
      this.ui.popup(`+${this.popupTokens * TUNING.tokens.score * sim.multiplier}`);
      this.popupTokens = 0;
      this.popupTimer = 0.25;
    }
    if (this.storage.data.settings.showFps) {
      this.fpsAcc += frameDt;
      this.fpsFrames++;
      if (this.fpsAcc > 0.5) {
        this.ui.setFps(this.fpsFrames / this.fpsAcc);
        this.fpsAcc = 0;
        this.fpsFrames = 0;
      }
    }
    const active = state === 'Playing';
    const L = TUNING.lives;
    this.sfx.loops(
      active && pu.active('jetpack'),
      active && pu.active('magnet'),
      active || state === 'Crashing'
        ? Math.max(0, 1 - (sim.gap - L.gapNear) / (L.gapFar - L.gapNear))
        : 0,
    );

    if (state === 'Playing' || state === 'Countdown' || state === 'Crashing') {
      this.ui.updateHud({
        score: sim.score,
        distance: sim.distance,
        tokens: sim.tokens,
        lives: sim.lives,
        multiplier: sim.multiplier,
      });
      for (const t of TIMED) this.puLeft[t] = pu.fraction(t);
      this.puBlink.jetpack = jetEnding;
      this.ui.updatePowerups(this.puLeft, this.puBlink);
    }
    this.debug.update(frameDt, {
      speed: sim.speed,
      distance: sim.distance,
      state,
      tier: sim.tier,
      zone: sim.zone,
      gap: sim.gap,
      pattern: sim.generator.currentPatternId,
      obstacles: sim.world.obstacles.countActive(),
      tokens: sim.world.tokens.countActive(),
    });
  }

  private resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.view?.rig.resize(window.innerWidth, window.innerHeight);
    this.post?.setSize(window.innerWidth, window.innerHeight);
  }
}
