// Tiny synthesized sound set; no audio files needed.
export class Audio {
  constructor() { this.ctx = null; }

  // Browsers only allow audio after a user gesture, so this is called from the Tee off click.
  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, len);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  burst({ dur = 0.2, gain = 0.3, type = 'lowpass', from = 800, to = 200, q = 1 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type; filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  ping(freq, dur, gain, delay = 0, type = 'triangle') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type; osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  play(name, strength = 1) {
    const k = Math.max(0.25, Math.min(1, strength));
    switch (name) {
      case 'throw': this.burst({ dur: 0.28, gain: 0.25 * k, type: 'bandpass', from: 500, to: 2600, q: 1.2 }); break;
      case 'chains':
        for (let i = 0; i < 7; i++) this.ping(1700 + Math.random() * 2600, 0.5 + Math.random() * 0.4, 0.07, i * 0.035, 'square');
        this.burst({ dur: 0.35, gain: 0.18, type: 'highpass', from: 3000, to: 5000 });
        break;
      case 'cage': case 'pole': case 'mailbox':
        this.ping(900 + Math.random() * 500, 0.3, 0.14 * k, 0, 'square'); break;
      case 'trunk': case 'house': case 'roof':
        this.burst({ dur: 0.16, gain: 0.5 * k, from: 500, to: 90 }); break;
      case 'car':
        this.burst({ dur: 0.2, gain: 0.4 * k, from: 900, to: 150 }); this.ping(210, 0.25, 0.1 * k, 0, 'sine'); break;
      case 'tree': case 'hedge': case 'snowman':
        this.burst({ dur: 0.3, gain: 0.3 * k, type: 'bandpass', from: 3500, to: 900, q: 0.7 }); break;
      case 'land': case 'skip':
        this.burst({ dur: 0.12, gain: 0.3 * k, from: 420, to: 110 }); break;
      case 'splash': case 'pool':
        this.burst({ dur: 0.6, gain: 0.4, type: 'bandpass', from: 1400, to: 300, q: 0.6 }); break;
      case 'good':
        [523, 659, 784, 1047].forEach((f, i) => this.ping(f, 0.3, 0.1, i * 0.09)); break;
      case 'bad':
        [330, 262].forEach((f, i) => this.ping(f, 0.35, 0.1, i * 0.16, 'sine')); break;
      case 'tick': this.ping(880, 0.05, 0.05); break;
      default: break;
    }
  }
}
