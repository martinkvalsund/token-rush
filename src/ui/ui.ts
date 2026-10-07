import { COMPANY_NAME, GAME_TITLE, TUNING } from '../data/tuning';
import type { SaveData } from '../core/storage';
import {
  ICON_GEAR,
  ICON_HAT,
  ICON_HELP,
  ICON_PAUSE,
  ICON_PLAY,
  ICON_SHOP,
  ICON_STATS,
  ICON_TOKEN,
  ICON_TROPHY,
  POWERUP_COLORS,
  POWERUP_ICONS,
  POWERUP_NAMES,
} from './icons';
import type { TimedPowerup } from '../sim/powerups';

export type UiAction =
  | 'play'
  | 'resume'
  | 'quit'
  | 'retry'
  | 'menu'
  | 'settings'
  | 'help'
  | 'stats'
  | 'shop'
  | 'leaderboard'
  | 'back';

export type ScreenName =
  | 'menu'
  | 'hud'
  | 'pause'
  | 'gameover'
  | 'stats'
  | 'settings'
  | 'help'
  | 'shop'
  | 'leaderboard'
  | 'none';

export interface RunResult {
  score: number;
  distance: number;
  tokens: number;
  newBest: boolean;
  highScore: number;
  /** Spendable tokens after this run was banked. */
  wallet: number;
  message: string;
}

export interface HudState {
  score: number;
  distance: number;
  tokens: number;
  lives: number;
  multiplier: number;
}

const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  html = '',
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

/** DOM overlays: menu, HUD, pause, game over, stats. Settings and help are attached later. */
export class UI {
  readonly root = h('div', 'ui-layer');
  private readonly screens = new Map<ScreenName, HTMLElement>();
  private listener: (a: UiAction) => void = () => undefined;
  private current: ScreenName = 'none';
  private readonly countdownEl = h('div', 'screen countdown');
  private readonly toastEl = h('div', 'toast');
  private toastTimer = 0;

  // HUD elements and last values (only touch the DOM on change).
  readonly hud = h('div', 'screen hud');
  private readonly scoreEl = h('div', 'score', '0');
  private readonly distEl = h('div', 'dist', '0 m');
  private readonly tokensEl = h('span', 'tokens', '0');
  private readonly multEl = h('span', 'mult');
  private readonly hats: HTMLElement[] = [];
  readonly powerupBar = h('div', 'powerups');
  readonly warnLeft = h('div', 'warn', '◀');
  readonly warnRight = h('div', 'warn', '▶');
  readonly warnCenter = h('div', 'warn', '▼');
  private last: HudState = { score: -1, distance: -1, tokens: -1, lives: -1, multiplier: -1 };

  private readonly puSlots = new Map<
    TimedPowerup,
    { el: HTMLElement; ring: SVGCircleElement; last: number }
  >();
  private readonly bestEl = h('div', 'best');
  private readonly gameOverEl = h('div', 'panel');
  private readonly statsEl = h('dl', 'stats');
  /** Game-over slot the game fills with the leaderboard prompt or posting status. */
  readonly runBoardEl = h('div', 'run-board');

  constructor(parent: HTMLElement = document.body) {
    parent.appendChild(this.root);
    this.buildMenu();
    this.buildHud();
    this.buildPause();
    this.buildGameOver();
    this.buildStats();
    this.root.append(this.countdownEl, this.toastEl);
  }

  onAction(fn: (a: UiAction) => void): void {
    this.listener = fn;
  }

  /** Let other modules (settings, help) register their own screens. */
  addScreen(name: ScreenName, el: HTMLElement): void {
    el.classList.add('screen');
    this.screens.set(name, el);
    this.root.appendChild(el);
  }

  show(name: ScreenName): void {
    this.current = name;
    for (const [n, el] of this.screens)
      el.classList.toggle('visible', n === name || (n === 'hud' && name === 'pause'));
    const first = this.screens.get(name)?.querySelector<HTMLButtonElement>('button');
    first?.focus({ preventScroll: true });
  }

  get screen(): ScreenName {
    return this.current;
  }

  private button(label: string, action: UiAction, secondary = false): HTMLButtonElement {
    const b = h('button', secondary ? 'btn secondary' : 'btn', label);
    b.type = 'button';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.listener(action);
    });
    return b;
  }

  private buildMenu(): void {
    const s = h('div', 'menu');
    const stack = h('div', 'stack');
    const words = GAME_TITLE.split(' ');
    const brand = h('div', 'brand');
    brand.append(
      h('div', 'logo-badge', ICON_TOKEN),
      h('h1', 'title', `${words[0] ?? ''}<span>${words.slice(1).join(' ')}</span>`),
    );
    const play = this.button(`${ICON_PLAY}<span>Play</span>`, 'play');
    play.classList.add('play');
    const grid = h('div', 'menu-grid');
    const feature = h('div', 'menu-feature');
    feature.append(
      this.button(`${ICON_SHOP}<span>Shop</span>`, 'shop', true),
      this.button(`${ICON_TROPHY}<span>Leaderboard</span>`, 'leaderboard', true),
    );
    grid.append(
      this.button(`${ICON_HELP}<span>How to play</span>`, 'help', true),
      this.button(`${ICON_GEAR}<span>Settings</span>`, 'settings', true),
      this.button(`${ICON_STATS}<span>Stats</span>`, 'stats', true),
    );
    stack.append(
      brand,
      h('div', 'hazard'),
      h('p', 'tagline', 'Collect tokens. Dodge tech debt. Ship it.'),
      play,
      feature,
      grid,
      this.bestEl,
      h(
        'div',
        'hint',
        `<span class="kbd">Enter</span> to start · <span class="kbd">WASD</span> or arrows · a game about ${COMPANY_NAME}`,
      ),
    );
    s.appendChild(stack);
    this.addScreen('menu', s);
  }

  private buildHud(): void {
    const left = h('div', 'left');
    const hats = h('div', 'hats');
    for (let i = 0; i < 2; i++) {
      const hat = h('span', '', ICON_HAT);
      const svg = hat.firstElementChild as HTMLElement;
      this.hats.push(svg);
      hats.appendChild(svg);
    }
    const scoreCard = h('div', 'card scorecard');
    const meta = h('div', 'meta');
    meta.append(this.distEl, hats);
    scoreCard.append(h('small', 'label', 'Score'), this.scoreEl, meta);
    left.append(scoreCard);
    const right = h('div', 'right');
    const tokenCard = h('div', 'card tokencard');
    tokenCard.append(h('span', 'token-icon', ICON_TOKEN), this.tokensEl);
    right.append(this.multEl, tokenCard);
    this.warnLeft.style.left = '30%';
    this.warnCenter.style.left = 'calc(50% - 16px)';
    this.warnRight.style.right = '30%';
    this.hud.append(
      left,
      h('div'),
      right,
      this.powerupBar,
      this.warnLeft,
      this.warnCenter,
      this.warnRight,
    );
    this.addScreen('hud', this.hud);
  }

  private buildPause(): void {
    const s = h('div', 'overlay');
    const p = h('div', 'panel');
    p.append(
      h('div', 'panel-icon', ICON_PAUSE),
      h('h2', '', 'Paused'),
      h('p', 'msg', 'Coffee break. The boulder waits.'),
      this.button('Resume', 'resume'),
      this.button('Settings', 'settings', true),
      this.button('Quit to menu', 'quit', true),
    );
    s.appendChild(p);
    this.addScreen('pause', s);
  }

  private buildGameOver(): void {
    const s = h('div', 'overlay');
    s.appendChild(this.gameOverEl);
    this.addScreen('gameover', s);
  }

  private buildStats(): void {
    const s = h('div', 'overlay');
    const p = h('div', 'panel');
    p.append(h('h2', '', 'Stats'), this.statsEl, this.button('Back', 'back', true));
    s.appendChild(p);
    this.addScreen('stats', s);
  }

  setSave(save: SaveData): void {
    this.bestEl.innerHTML =
      save.highScore > 0 || save.wallet > 0
        ? [
            ['Highscore', fmt(save.highScore)],
            ['Best run', `${fmt(save.bestDistance)} m`],
            ['Tokens to spend', fmt(save.wallet)],
          ]
            .map(([k, v]) => `<div class="chip"><small>${k}</small><b>${v}</b></div>`)
            .join('')
        : '';
    this.statsEl.innerHTML = [
      ['Highscore', fmt(save.highScore)],
      ['Best distance', `${fmt(save.bestDistance)} m`],
      ['Tokens collected', fmt(save.totalTokens)],
      ['Prompts affordable', fmt(save.totalTokens / TUNING.tokens.promptsPer)],
      ['Tokens to spend', fmt(save.wallet)],
      ['Shop items owned', fmt(save.owned.length)],
      ['Runs', fmt(save.runs)],
    ]
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join('');
  }

  showGameOver(r: RunResult): void {
    const prompts = Math.floor(r.tokens / TUNING.tokens.promptsPer);
    const p = this.gameOverEl;
    p.innerHTML = '';
    p.append(h('div', 'ribbon', 'Run over'), h('h2', '', r.message));
    if (r.newBest) p.appendChild(h('div', 'newbest', '★ New highscore! ★'));
    const stats = h('div', 'statcards');
    stats.innerHTML = [
      ['Score', fmt(r.score), r.newBest],
      ['Distance', `${fmt(r.distance)} m`, false],
      ['Tokens', fmt(r.tokens), false],
      ['Best', fmt(r.highScore), false],
    ]
      .map(
        ([k, v, hi]) =>
          `<div class="statcard${hi ? ' hi' : ''}"><small>${k}</small><b>${v}</b></div>`,
      )
      .join('');
    const joke = h(
      'p',
      'joke',
      `${ICON_TOKEN}<span>That's enough tokens for <b>${prompts}</b> prompt${prompts === 1 ? '' : 's'}.</span>`,
    );
    const bank = h(
      'p',
      'bank',
      `+${fmt(r.tokens)} banked · <b>${fmt(r.wallet)}</b> tokens to spend in the shop`,
    );
    const row = h('div', 'row');
    row.append(
      this.button('Play again', 'retry'),
      this.button(`${ICON_SHOP}<span>Shop</span>`, 'shop', true),
      this.button('Menu', 'menu', true),
    );
    this.runBoardEl.innerHTML = '';
    p.append(
      stats,
      joke,
      bank,
      this.runBoardEl,
      row,
      h(
        'div',
        'hint',
        '<span class="kbd">Enter</span> or <span class="kbd">Space</span> to play again',
      ),
    );
    this.show('gameover');
  }

  updateHud(s: HudState): void {
    const l = this.last;
    const score = Math.floor(s.score);
    if (score !== l.score) this.scoreEl.textContent = fmt(score);
    const dist = Math.floor(s.distance);
    if (dist !== l.distance) this.distEl.textContent = `${fmt(dist)} m`;
    if (s.tokens !== l.tokens) {
      this.tokensEl.textContent = fmt(s.tokens);
      if (s.tokens > l.tokens && l.tokens >= 0) {
        this.tokensEl.classList.remove('pop');
        void this.tokensEl.offsetWidth;
        this.tokensEl.classList.add('pop');
      }
    }
    if (s.lives !== l.lives)
      this.hats.forEach((hat, i) => hat.classList.toggle('lost', i >= s.lives));
    if (s.multiplier !== l.multiplier)
      this.multEl.textContent = s.multiplier > 1 ? `×${s.multiplier}` : '';
    l.score = score;
    l.distance = dist;
    l.tokens = s.tokens;
    l.lives = s.lives;
    l.multiplier = s.multiplier;
  }

  /** Show active power-ups with draining rings; `left` is a 0..1 fraction per type. */
  updatePowerups(
    left: Record<TimedPowerup, number>,
    blink: Partial<Record<TimedPowerup, boolean>>,
  ): void {
    for (const t of Object.keys(left) as TimedPowerup[]) {
      const f = left[t];
      let slot = this.puSlots.get(t);
      if (!slot) {
        const el = h('div', 'pu');
        el.title = POWERUP_NAMES[t];
        const c = 2 * Math.PI * 25;
        el.innerHTML = `<svg class="ring" viewBox="0 0 58 58"><circle cx="29" cy="29" r="25" fill="rgba(16,20,26,.75)" stroke="rgba(255,255,255,.15)" stroke-width="5"/><circle class="arc" cx="29" cy="29" r="25" fill="none" stroke="${POWERUP_COLORS[t]}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="0"/></svg><div class="icon">${POWERUP_ICONS[t]}</div>`;
        const ring = el.querySelector<SVGCircleElement>('circle.arc');
        if (!ring) continue;
        this.powerupBar.appendChild(el);
        slot = { el, ring, last: -1 };
        this.puSlots.set(t, slot);
      }
      const q = Math.round(f * 200) / 200;
      if (q === slot.last) continue;
      slot.last = q;
      slot.el.style.display = f > 0 ? 'grid' : 'none';
      slot.ring.style.strokeDashoffset = String(2 * Math.PI * 25 * (1 - f));
      slot.el.style.opacity = blink[t] && Math.floor(performance.now() / 120) % 2 ? '0.35' : '1';
    }
  }

  private loadingEl: HTMLElement | null = null;

  /** Loading screen while the 3D models download (progress 0..1, null hides it). */
  loading(progress: number | null): void {
    if (progress === null) {
      const el = this.loadingEl;
      if (el) {
        el.classList.add('done');
        window.setTimeout(() => el.remove(), 600);
      }
      this.loadingEl = null;
      return;
    }
    if (!this.loadingEl) {
      this.loadingEl = h(
        'div',
        'loading',
        `<div class="logo-badge">${ICON_TOKEN}</div><div class="loading-title">${GAME_TITLE}</div><div class="bar"><i></i></div><small>Pouring concrete…</small>`,
      );
      this.root.appendChild(this.loadingEl);
    }
    const bar = this.loadingEl.querySelector<HTMLElement>('.bar i');
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  }

  countdown(n: number): void {
    this.countdownEl.classList.toggle('visible', n >= 0);
    if (n < 0) return;
    this.countdownEl.innerHTML = '';
    this.countdownEl.appendChild(h('div', 'n', n === 0 ? 'GO!' : String(n)));
  }

  private readonly warnTimers = [0, 0, 0];

  /** Flash a lane arrow for an incoming moving hazard (lane 0 left, 1 centre, 2 right). */
  warn(lane: number, seconds = 1.4): void {
    const el = [this.warnLeft, this.warnCenter, this.warnRight][lane];
    if (!el) return;
    el.classList.add('on');
    window.clearTimeout(this.warnTimers[lane]);
    this.warnTimers[lane] = window.setTimeout(() => el.classList.remove('on'), seconds * 1000);
  }

  clearWarnings(): void {
    for (const el of [this.warnLeft, this.warnCenter, this.warnRight]) el.classList.remove('on');
  }

  private readonly fpsEl = h('div', 'fps');
  private readonly popups: HTMLElement[] = [];
  private popupIndex = 0;

  /** Show or hide the FPS counter (null hides). */
  setFps(fps: number | null): void {
    if (!this.fpsEl.isConnected) this.root.appendChild(this.fpsEl);
    this.fpsEl.style.display = fps === null ? 'none' : 'block';
    if (fps !== null) this.fpsEl.textContent = `${Math.round(fps)} fps`;
  }

  /** Floating "+10" style score popup above the runner. */
  popup(text: string): void {
    if (this.popups.length === 0)
      for (let i = 0; i < 6; i++) {
        const el = h('div', 'popup');
        this.hud.appendChild(el);
        this.popups.push(el);
      }
    const el = this.popups[this.popupIndex++ % this.popups.length];
    if (!el) return;
    el.textContent = text;
    el.style.left = `${46 + Math.random() * 8}%`;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }

  /** Celebrate a new highscore with falling confetti. */
  confetti(): void {
    const layer = h('div', 'confetti');
    const colors = ['#ffc72c', '#ff6b1a', '#c6ff00', '#5ad1ff', '#ff7a59', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      const c = h('i');
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = colors[i % colors.length] ?? '#fff';
      c.style.animationDelay = `${Math.random() * 0.8}s`;
      c.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      layer.appendChild(c);
    }
    this.root.appendChild(layer);
    window.setTimeout(() => layer.remove(), 4000);
  }

  toast(text: string, seconds = 1.6): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('on'), seconds * 1000);
  }
}
