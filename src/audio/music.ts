import { ZONES } from '../data/zones';
import type { AudioEngine } from './engine';
import { midiToHz } from './engine';

const SCALES: Record<string, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
/** Chord roots as scale degrees for a 4-bar loop. */
const PROGRESSION = [0, 5, 3, 4];

/**
 * Small procedural tune: bass + arpeggio + drums, key and scale per zone, layers added as
 * the tier rises. Scheduled ahead of time with a look-ahead timer (no audio files).
 */
export class Music {
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  zone = 0;
  tier = 0;
  /** 0 = menu (soft), 1 = playing. */
  intensity = 0;
  private melodySeed = 1;

  constructor(private readonly a: AudioEngine) {
    a.onReady(() => this.start());
  }

  private start(): void {
    if (this.timer || !this.a.ctx) return;
    this.nextTime = this.a.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private get stepDur(): number {
    const bpm = 112 + Math.min(this.tier, 8) * 3 + (this.intensity > 0 ? 0 : -16);
    return 60 / bpm / 4;
  }

  private schedule(): void {
    const ctx = this.a.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  private note(
    freq: number,
    t: number,
    dur: number,
    wave: OscillatorType,
    vol: number,
    cutoff = 4000,
  ): void {
    const ctx = this.a.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.a.music);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private drum(t: number, kind: 'kick' | 'snare' | 'hat', vol: number): void {
    const ctx = this.a.ctx;
    if (!ctx) return;
    if (kind === 'kick') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(this.a.music);
      o.start(t);
      o.stop(t + 0.2);
      return;
    }
    const buf = this.a.noiseBuffer();
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = ctx.createGain();
    const dur = kind === 'hat' ? 0.04 : 0.14;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.a.music);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  private rand(): number {
    this.melodySeed = (this.melodySeed * 16807) % 2147483647;
    return this.melodySeed / 2147483647;
  }

  private playStep(t: number): void {
    const z = ZONES[this.zone] ?? ZONES[0];
    if (!z) return;
    const scale = SCALES[z.music.scale] ?? SCALES.major ?? [0];
    const deg = PROGRESSION[this.bar % PROGRESSION.length] ?? 0;
    const pitch = (d: number, octave = 0) => {
      const n = scale.length;
      const idx = ((d % n) + n) % n;
      return z.music.root + (scale[idx] ?? 0) + 12 * (Math.floor(d / n) + octave);
    };
    const s = this.step;
    const play = this.intensity > 0;
    const tier = play ? this.tier : 0;
    const dur = this.stepDur;

    // Bass on eighths.
    if (s % 2 === 0)
      this.note(midiToHz(pitch(deg, -2)), t, dur * 1.8, 'sawtooth', play ? 0.16 : 0.08, 700);
    // Arpeggio on sixteenths through the chord.
    if (play || s % 4 === 0) {
      const chord = [deg, deg + 2, deg + 4, deg + 7];
      const tone = chord[s % 4] ?? deg;
      this.note(
        midiToHz(pitch(tone, 0)),
        t,
        dur * 0.9,
        'square',
        play ? 0.035 + tier * 0.004 : 0.03,
        2400 + tier * 400,
      );
    }
    if (!play) return;
    if (s % 4 === 0) this.drum(t, 'kick', 0.5);
    if (s % 2 === 1) this.drum(t, 'hat', 0.06 + tier * 0.01);
    if (tier >= 2 && (s === 4 || s === 12)) this.drum(t, 'snare', 0.22);
    if (tier >= 4 && s % 2 === 0 && this.rand() < 0.45) {
      const d = deg + Math.floor(this.rand() * 7);
      this.note(midiToHz(pitch(d, 1)), t, dur * 2.2, 'triangle', 0.06, 5000);
    }
    if (tier >= 6 && s % 8 === 6) this.drum(t, 'kick', 0.35);
  }
}
