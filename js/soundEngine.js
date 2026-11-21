/**
 * soundEngine.js
 * Sintesis suara atmosfer cuaca real-time menggunakan Web Audio API (tanpa file audio eksternal).
 * Menghasilkan suara hujan lembut, hembusan angin, dan gemuruh petir saat mode audio diaktifkan.
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
    this.noiseSource = null;
    this.filter = null;
    this.lfo = null;
    this.lfoGain = null;
    this.scene = 'clear';
    this.intensity = 0.5;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Buat buffer pink noise 4 detik yang seamless
    const sr = this.ctx.sampleRate;
    const len = sr * 4;
    const buffer = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const out = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.032;
        b6 = white * 0.115926;
      }
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 600;
    this.filter.Q.value = 0.7;

    // LFO lembut untuk dinamika hembusan angin/hujan
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = 0.14;
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 180;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    this.noiseSource.connect(this.filter);
    this.filter.connect(this.masterGain);

    this.noiseSource.start();
    this.lfo.start();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      this.applyScene();
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
    return this.enabled;
  }

  setScene(scene, intensity = 0.5) {
    this.scene = scene;
    this.intensity = intensity;
    if (this.enabled) this.applyScene();
  }

  applyScene() {
    if (!this.ctx || !this.filter || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (this.scene === 'storm') {
      this.filter.type = 'lowpass';
      this.filter.frequency.setTargetAtTime(1700, now, 0.4);
      this.filter.Q.setTargetAtTime(0.6, now, 0.4);
      this.lfoGain.gain.setTargetAtTime(320, now, 0.4);
      this.masterGain.gain.setTargetAtTime(0.32, now, 0.4);
    } else if (this.scene === 'rain') {
      this.filter.type = 'lowpass';
      this.filter.frequency.setTargetAtTime(1100 + this.intensity * 700, now, 0.4);
      this.filter.Q.setTargetAtTime(0.5, now, 0.4);
      this.lfoGain.gain.setTargetAtTime(180, now, 0.4);
      this.masterGain.gain.setTargetAtTime(0.18 + this.intensity * 0.12, now, 0.4);
    } else if (this.scene === 'snow' || this.scene === 'fog') {
      this.filter.type = 'bandpass';
      this.filter.frequency.setTargetAtTime(360, now, 0.5);
      this.filter.Q.setTargetAtTime(1.8, now, 0.5);
      this.lfoGain.gain.setTargetAtTime(120, now, 0.5);
      this.masterGain.gain.setTargetAtTime(0.14, now, 0.5);
    } else {
      // Angin sepoi-sepoi halus
      this.filter.type = 'bandpass';
      this.filter.frequency.setTargetAtTime(480, now, 0.5);
      this.filter.Q.setTargetAtTime(1.4, now, 0.5);
      this.lfoGain.gain.setTargetAtTime(160, now, 0.5);
      this.masterGain.gain.setTargetAtTime(0.11, now, 0.5);
    }
  }

  playThunder() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + 0.18;
    const dur = 2.6;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.pow(1 - i / data.length, 2.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(190, now);
    lp.frequency.exponentialRampToValueAtTime(52, now + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.55, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(lp);
    lp.connect(g);
    g.connect(this.ctx.destination);
    src.start(now);
  }
}
