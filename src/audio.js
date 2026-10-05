// Tiny synthesized sound set; no audio files needed. Effects, music and fanfares run on
// separate buses so each can be turned down on its own, and each course has a quiet
// ambient bed (wind, birds, surf).
import { Music } from './music.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicLevel = 0.42;
    this.sfxOn = true;
    this.music = new Music(this);
    this.amb = null;
    this.whooshSrc = null;
  }

  // Browsers only allow audio after a user gesture, so this runs on the first click or key.
  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // a gentle limiter on the master so stacked sounds never clip
    this.master = this.ctx.createDynamicsCompressor();
    this.master.threshold.value = -10; this.master.ratio.value = 6;
    this.master.connect(this.ctx.destination);
    const bus = (level) => {
      const g = this.ctx.createGain();
      g.gain.value = level;
      g.connect(this.master);
      return g;
    };
    this.sfxBus = bus(this.sfxOn ? 0.9 : 0);
    this.ambBus = bus(this.sfxOn ? 0.5 : 0);
    this.musicBus = bus(this.music.enabled ? this.musicLevel : 0);
    this.jingleBus = bus(0.55);
    // pause everything while the tab is hidden, so the music doesn't stutter
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
    this.music.resume();
    if (this.pendingAmbience !== undefined) this.ambience(this.pendingAmbience);
  }

  setEffects(on) {
    this.sfxOn = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.05);
    this.ambBus.gain.setTargetAtTime(on ? 0.5 : 0, t, 0.3);
  }

  setMusic(on) {
    this.music.setEnabled(on);
  }

  toggleMusic() {
    this.setMusic(!this.music.enabled);
    this.onChange?.();
  }

  // ------------------------------------------------------------ primitives
  burst({ dur = 0.2, gain = 0.3, type = 'lowpass', from = 800, to = 200, q = 1, delay = 0, out = this.sfxBus }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type; filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  ping(freq, dur, gain, delay = 0, type = 'triangle', { to = null, out = this.sfxBus } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------- effects
  play(name, strength = 1, ev = {}) {
    if (!this.ctx) return;
    const k = Math.max(0.25, Math.min(1, strength));
    switch (name) {
      case 'throw':
        this.burst({ dur: 0.28, gain: 0.25 * k, type: 'bandpass', from: 500, to: 2600, q: 1.2 });
        this.ping(180, 0.08, 0.12 * k, 0, 'sine', { to: 90 }); // the snap of the release
        break;
      case 'chains':
        for (let i = 0; i < 9; i++) this.ping(1700 + Math.random() * 2600, 0.5 + Math.random() * 0.5, 0.06, i * 0.03, 'square');
        this.burst({ dur: 0.45, gain: 0.18, type: 'highpass', from: 3000, to: 5000 });
        break;
      case 'spit':
        for (let i = 0; i < 4; i++) this.ping(1500 + Math.random() * 2000, 0.3, 0.06, i * 0.04, 'square');
        this.ping(700, 0.25, 0.12, 0.05, 'square', { to: 500 });
        break;
      case 'cage': case 'pole': case 'mailbox':
        this.ping(900 + Math.random() * 500, 0.3, 0.14 * k, 0, 'square');
        this.ping(2300 + Math.random() * 400, 0.18, 0.05 * k, 0.005, 'sine');
        break;
      case 'trunk':
        this.burst({ dur: 0.16, gain: 0.5 * k, from: 500, to: 90 });
        this.ping(260, 0.12, 0.15 * k, 0, 'triangle', { to: 140 }); // woody knock
        break;
      case 'house': case 'roof':
        this.burst({ dur: 0.18, gain: 0.5 * k, from: 600, to: 90 });
        break;
      case 'deck': case 'rail':
        this.ping(320, 0.12, 0.25 * k, 0, 'triangle', { to: 210 });
        this.burst({ dur: 0.08, gain: 0.2 * k, type: 'bandpass', from: 1200, to: 700 });
        break;
      case 'rock':
        this.ping(1400, 0.06, 0.2 * k, 0, 'square', { to: 900 });
        this.burst({ dur: 0.1, gain: 0.3 * k, type: 'bandpass', from: 2500, to: 1200, q: 2 });
        break;
      case 'car':
        this.burst({ dur: 0.2, gain: 0.4 * k, from: 900, to: 150 });
        this.ping(210, 0.25, 0.1 * k, 0, 'sine');
        if (Math.random() < 0.35) this.carAlarm();
        break;
      case 'tree': case 'hedge': case 'snowman': case 'leaves':
        this.burst({ dur: 0.3, gain: 0.3 * k, type: 'bandpass', from: 3500, to: 900, q: 0.7 });
        break;
      case 'land': case 'skip':
        if (ev.road) {
          // a plasticky clack on pavement and ice
          this.ping(1100, 0.05, 0.22 * k, 0, 'square', { to: 700 });
          this.burst({ dur: 0.07, gain: 0.25 * k, type: 'bandpass', from: 2600, to: 1600, q: 1.5 });
        } else if (ev.deck) {
          this.ping(300, 0.14, 0.3 * k, 0, 'triangle', { to: 200 });
        } else if (ev.sand) {
          this.burst({ dur: 0.22, gain: 0.25 * k, type: 'highpass', from: 1800, to: 3500 });
        } else {
          this.burst({ dur: 0.12, gain: 0.3 * k, from: 420, to: 110 });
        }
        break;
      case 'roll':
        this.burst({ dur: 0.5, gain: 0.08, type: 'bandpass', from: 600, to: 300, q: 0.8 });
        break;
      case 'splash': case 'pool':
        this.burst({ dur: 0.6, gain: 0.4, type: 'bandpass', from: 1400, to: 300, q: 0.6 });
        for (let i = 0; i < 4; i++) this.ping(700 + Math.random() * 900, 0.08, 0.05, 0.1 + i * 0.06, 'sine', { to: 1800 }); // bloops
        break;
      case 'tick': this.ping(880, 0.05, 0.05); break;
      case 'click': this.ping(1250, 0.04, 0.06, 0, 'triangle', { to: 1600 }); break;
      case 'select':
        this.ping(660, 0.07, 0.07, 0, 'triangle');
        this.ping(990, 0.1, 0.07, 0.06, 'triangle');
        break;
      case 'start':
        [523, 659, 784, 1047].forEach((f, i) => this.ping(f, 0.18, 0.08, i * 0.06, 'square'));
        break;
      default: break;
    }
  }

  // Rising beeps as the swing winds up: one per tenth of power.
  charge(step) {
    if (!this.ctx) return;
    this.ping(420 * 2 ** (step / 12 * 1.4), 0.06, 0.05 + step * 0.004, 0, 'square');
  }

  carAlarm() {
    for (let i = 0; i < 6; i++) {
      this.ping(i % 2 ? 750 : 1050, 0.17, 0.06, 0.35 + i * 0.2, 'square');
    }
  }

  applause(seconds = 2) {
    if (!this.ctx || !this.sfxOn) return;
    const claps = Math.round(seconds * 40);
    for (let i = 0; i < claps; i++) {
      const d = Math.random() * seconds, fade = 1 - d / seconds;
      this.burst({ dur: 0.05, gain: 0.16 * fade, type: 'bandpass', from: 1000 + Math.random() * 1800, to: 900, q: 1.5, delay: d });
    }
    // a couple of whoops from the gallery
    for (let i = 0; i < Math.min(3, Math.floor(seconds)); i++) {
      const f = 500 + Math.random() * 250;
      this.ping(f, 0.4, 0.03, 0.2 + i * 0.5, 'sine', { to: f * 1.8 });
    }
  }

  // --------------------------------------------------------- disc in flight
  // A breathy whoosh whose pitch and level follow the disc's speed.
  whoosh(speed) {
    if (!this.ctx) return;
    if (!this.whooshSrc) {
      const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      src.buffer = this.noise; src.loop = true;
      f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.value = 600;
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.sfxBus);
      src.start();
      this.whooshSrc = { src, f, g };
    }
    const t = this.ctx.currentTime, w = this.whooshSrc;
    const s = Math.max(0, Math.min(1, speed / 30));
    w.g.gain.setTargetAtTime(0.11 * s * s, t, 0.05);
    w.f.frequency.setTargetAtTime(380 + 1300 * s, t, 0.05);
  }

  stopWhoosh() {
    if (!this.whooshSrc) return;
    const w = this.whooshSrc, t = this.ctx.currentTime;
    w.g.gain.setTargetAtTime(0, t, 0.08);
    w.src.stop(t + 0.5);
    this.whooshSrc = null;
  }

  // ---------------------------------------------------------------- ambience
  // kind: 'park', 'woods', 'shore', 'surf', 'desert', 'winter', or null for silence.
  ambience(kind) {
    if (!this.ctx) { this.pendingAmbience = kind; return; }
    if (this.amb) {
      const { nodes, gain, timer } = this.amb, t = this.ctx.currentTime;
      clearInterval(timer);
      gain.gain.setTargetAtTime(0, t, 0.4);
      setTimeout(() => { for (const n of nodes) n.stop(); gain.disconnect(); }, 2000);
      this.amb = null;
    }
    if (!kind) return;
    const ctx = this.ctx, gain = ctx.createGain(), nodes = [];
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    gain.connect(this.ambBus);
    const bed = (type, freq, level, swell) => {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.noise; src.loop = true;
      f.type = type; f.frequency.value = freq;
      g.gain.value = level;
      if (swell) {
        // slow swell, like waves rolling in
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = swell; lg.gain.value = level * 0.8;
        lfo.connect(lg).connect(g.gain);
        lfo.start(); nodes.push(lfo);
      }
      src.connect(f).connect(g).connect(gain);
      src.start(0, Math.random() * 1.5);
      nodes.push(src);
    };
    const wind = { winter: 0.09, desert: 0.08, surf: 0.05 }[kind] ?? 0.035;
    bed('lowpass', 420, wind, 0.07);
    if (kind === 'surf') bed('lowpass', 900, 0.12, 0.11);
    if (kind === 'shore') bed('lowpass', 700, 0.035, 0.16);
    const birds = { city: 0.3, park: 0.55, woods: 0.7, shore: 0.45, surf: 0.25, desert: 0.12, winter: 0.06 }[kind] ?? 0;
    const timer = setInterval(() => {
      if (Math.random() < birds) this.chirp(gain, kind);
    }, 1400);
    this.amb = { nodes, gain, timer };
  }

  chirp(out, kind) {
    const t0 = Math.random() * 0.6;
    if (kind === 'surf' && Math.random() < 0.5) {
      // a gull
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.ping(1500, 0.22, 0.02, t0 + i * 0.26, 'sawtooth', { to: 900, out });
      return;
    }
    const base = 2600 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const f = base * (1 + (Math.random() - 0.3) * 0.25);
      this.ping(f, 0.07, 0.018, t0 + i * (0.09 + Math.random() * 0.05), 'sine', { to: f * (1.2 + Math.random() * 0.3), out });
    }
  }
}
