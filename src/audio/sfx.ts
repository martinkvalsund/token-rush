import type { AudioEngine } from './engine';
import { midiToHz } from './engine';
import type { PowerupType } from '../sim/entities';

type Wave = OscillatorType;

/** Short synthesised sound effects. Every function is a no-op until audio is unlocked. */
export class Sfx {
  private jet: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null;
  private rumble: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  constructor(private readonly a: AudioEngine) {}

  private tone(
    freq: number,
    dur: number,
    wave: Wave = 'square',
    vol = 0.2,
    slideTo?: number,
    delay = 0,
  ): void {
    const ctx = this.a.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.a.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(
    dur: number,
    vol: number,
    type: BiquadFilterType,
    freq: number,
    q = 1,
    slideTo?: number,
    delay = 0,
  ): void {
    const ctx = this.a.ctx;
    const buf = this.a.noiseBuffer();
    if (!ctx || !buf) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.a.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /** Token pickup: pitch climbs with the streak (pentatonic steps). */
  token(streak: number): void {
    const steps = [0, 2, 4, 7, 9];
    const n = Math.min(streak - 1, 14);
    const midi = 76 + Math.floor(n / 5) * 12 + (steps[n % 5] ?? 0);
    this.tone(midiToHz(midi), 0.12, 'triangle', 0.16);
    this.tone(midiToHz(midi + 12), 0.08, 'sine', 0.06, undefined, 0.03);
  }

  jump(superJump: boolean): void {
    this.tone(
      superJump ? 260 : 330,
      superJump ? 0.32 : 0.18,
      'square',
      0.08,
      superJump ? 1200 : 760,
    );
  }

  land(): void {
    this.noise(0.09, 0.18, 'lowpass', 600, 1, 120);
  }

  slide(): void {
    this.noise(0.32, 0.14, 'bandpass', 2200, 1.2, 500);
  }

  lane(): void {
    this.noise(0.1, 0.07, 'bandpass', 1800, 2, 3600);
  }

  stumble(): void {
    this.tone(140, 0.22, 'sawtooth', 0.18, 60);
    this.noise(0.18, 0.25, 'lowpass', 900, 1, 200);
  }

  crash(): void {
    this.noise(0.9, 0.5, 'lowpass', 3000, 0.8, 80);
    this.tone(110, 0.6, 'sawtooth', 0.2, 35);
    this.tone(70, 0.8, 'square', 0.12, 30, 0.05);
  }

  shieldBreak(): void {
    for (let i = 0; i < 5; i++)
      this.tone(1800 + Math.random() * 1600, 0.18, 'triangle', 0.06, 600, i * 0.03);
    this.noise(0.25, 0.15, 'highpass', 3000);
  }

  warning(): void {
    for (let i = 0; i < 3; i++) this.tone(988, 0.07, 'square', 0.07, undefined, i * 0.14);
  }

  powerup(t: PowerupType): void {
    const tunes: Record<PowerupType, number[]> = {
      magnet: [72, 76, 79, 84],
      jetpack: [60, 67, 72, 79, 84],
      shield: [67, 71, 74, 79],
      double: [76, 79, 83, 88],
      boots: [64, 69, 72, 76],
      mystery: [72, 73, 72, 73, 72],
    };
    tunes[t].forEach((m, i) => this.tone(midiToHz(m), 0.14, 'square', 0.09, undefined, i * 0.06));
  }

  mysteryReveal(): void {
    [79, 84, 88, 91].forEach((m, i) =>
      this.tone(midiToHz(m), 0.18, 'triangle', 0.12, undefined, i * 0.07),
    );
  }

  click(): void {
    this.tone(880, 0.04, 'square', 0.05);
  }

  countdown(go: boolean): void {
    this.tone(go ? 1046 : 523, go ? 0.35 : 0.15, 'square', 0.1);
  }

  fanfare(): void {
    [72, 76, 79, 84, 79, 84].forEach((m, i) =>
      this.tone(midiToHz(m), 0.22, 'square', 0.1, undefined, i * 0.11),
    );
  }

  zone(): void {
    [67, 74, 79].forEach((m, i) =>
      this.tone(midiToHz(m), 0.3, 'triangle', 0.08, undefined, i * 0.09),
    );
  }

  /** Continuous loops, driven every frame. */
  loops(jetpack: boolean, magnet: boolean, boulderCloseness: number): void {
    const ctx = this.a.ctx;
    const buf = this.a.noiseBuffer();
    if (!ctx || !buf) return;
    const t = ctx.currentTime;
    if (!this.jet) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(f).connect(gain).connect(this.a.sfx);
      src.start();
      this.jet = { src, gain };
    }
    if (!this.hum) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 110;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain).connect(osc.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(this.a.sfx);
      osc.start();
      lfo.start();
      this.hum = { osc, gain };
    }
    if (!this.rumble) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 140;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(f).connect(gain).connect(this.a.sfx);
      src.start();
      this.rumble = { src, gain };
    }
    this.jet.gain.gain.setTargetAtTime(jetpack ? 0.12 : 0, t, 0.08);
    this.hum.gain.gain.setTargetAtTime(magnet ? 0.05 : 0, t, 0.1);
    this.rumble.gain.gain.setTargetAtTime(boulderCloseness * 0.9, t, 0.15);
  }
}
