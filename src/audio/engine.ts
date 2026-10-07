/**
 * WebAudio engine: master → (music, sfx) buses. Everything is synthesised; no audio files.
 * The context is created and resumed on the first user gesture (Safari requirement).
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  /** Low-pass on the music bus (muffled during crashes). */
  musicFilter!: BiquadFilterNode;
  private noise: AudioBuffer | null = null;
  private volumes = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };
  private readonly readyListeners: Array<() => void> = [];

  constructor() {
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart'])
      window.addEventListener(ev, unlock, { passive: true });
  }

  onReady(fn: () => void): void {
    if (this.ctx) fn();
    else this.readyListeners.push(fn);
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 18000;
    this.music.connect(this.musicFilter).connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(comp).connect(ctx.destination);
    this.applyVolumes();
    for (const fn of this.readyListeners.splice(0)) fn();
  }

  setVolumes(master: number, music: number, sfx: number, muted: boolean): void {
    this.volumes = { master, music, sfx, muted };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = this.volumes;
    this.master.gain.setTargetAtTime(v.muted ? 0 : v.master, t, 0.03);
    this.music.gain.setTargetAtTime(v.music * 0.55, t, 0.03);
    this.sfx.gain.setTargetAtTime(v.sfx, t, 0.03);
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noise) return this.noise;
    const len = this.ctx.sampleRate * 1.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return buf;
  }

  /** Muffle the music (crash/caught) or open it up again. */
  muffle(on: boolean): void {
    if (!this.ctx) return;
    this.musicFilter.frequency.setTargetAtTime(
      on ? 500 : 18000,
      this.ctx.currentTime,
      on ? 0.08 : 0.4,
    );
  }
}

export const midiToHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
