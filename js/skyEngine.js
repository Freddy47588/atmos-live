/**
 * skyEngine.js
 * Mesin animasi langit & partikel cuaca real-time berbasis HTML5 Canvas (60fps)
 * Mendukung: clear (day/dawn/golden/night), partly-cloudy, overcast, rain, storm (+petir), snow, fog
 */

const PALETTES = {
  'clear-day': ['#0c4a6e', '#0284c7', '#38bdf8'],
  'clear-dawn': ['#1e1b4b', '#9d174d', '#fb923c'],
  'clear-golden': ['#1e1b4b', '#c2410c', '#f59e0b'],
  'clear-night': ['#030712', '#0b1530', '#172554'],

  'partly-cloudy-day': ['#0f3d63', '#1d6fa3', '#60a5fa'],
  'partly-cloudy-dawn': ['#1f1c47', '#7c2d5e', '#ea8c55'],
  'partly-cloudy-golden': ['#1e1b3a', '#9a3412', '#d97706'],
  'partly-cloudy-night': ['#040814', '#101d3b', '#1e2f56'],

  'overcast-day': ['#1e293b', '#334155', '#64748b'],
  'overcast-dawn': ['#1e2235', '#473d57', '#7c6a7d'],
  'overcast-golden': ['#1f2436', '#52414c', '#856258'],
  'overcast-night': ['#070b14', '#131c2e', '#1e293b'],

  'rain-day': ['#0f172a', '#1e3a52', '#335c75'],
  'rain-dawn': ['#111827', '#273147', '#475569'],
  'rain-golden': ['#111827', '#2c3044', '#4b5563'],
  'rain-night': ['#030712', '#0d192b', '#172a42'],

  'storm-day': ['#090d16', '#172133', '#24344d'],
  'storm-dawn': ['#090d16', '#1a2035', '#2b314a'],
  'storm-golden': ['#090d16', '#1c2033', '#2e3148'],
  'storm-night': ['#02040a', '#0a1120', '#131f33'],

  'snow-day': ['#1e3a5f', '#3b648c', '#7fa6c9'],
  'snow-dawn': ['#1e2942', '#475577', '#899ab8'],
  'snow-golden': ['#1e2942', '#4f556e', '#948d9e'],
  'snow-night': ['#070d1a', '#13223b', '#233a5c'],

  'fog-day': ['#263242', '#475569', '#7b8a9e'],
  'fog-dawn': ['#25283d', '#4c4f69', '#837f94'],
  'fog-golden': ['#28293b', '#524b5c', '#8b7b82'],
  'fog-night': ['#0b101b', '#192233', '#2b384e'],
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

export class SkyEngine {
  constructor(canvas, onLightningCallback = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onLightning = onLightningCallback;
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rafId = null;
    this.lastTs = 0;
    this.elapsed = 0;

    // State cuaca & interpolasi warna halus
    this.state = {
      scene: 'clear',
      phase: 'day',
      intensity: 0.4,
      windSpeed: 12,
    };

    this.currentColors = PALETTES['clear-night'].map(hexToRgb);
    this.targetColors = PALETTES['clear-night'].map(hexToRgb);

    // Parallax pointer halus
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // Kumpulan entitas partikel
    this.stars = [];
    this.shootingStars = [];
    this.clouds = [];
    this.raindrops = [];
    this.splashes = [];
    this.snowflakes = [];
    this.motes = [];
    this.fogLayers = [];

    // State petir
    this.lightningFlash = 0;
    this.lightningBolt = null;
    this.nextLightningIn = 2.8;

    this.handleResize = this.resize.bind(this);
    this.handlePointer = (e) => {
      this.pointer.tx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      this.pointer.ty = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointer, { passive: true });

    this.resize();
    this.initEntities();
    this.start();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.stars.length) this.initEntities();
  }

  setWeather({ scene = 'clear', phase = 'day', intensity = 0.5, windSpeed = 10 }) {
    const prevScene = this.state.scene;
    this.state = { scene, phase, intensity, windSpeed };

    const key = `${scene}-${phase}`;
    const palette = PALETTES[key] || PALETTES[`${scene}-day`] || PALETTES['clear-day'];
    this.targetColors = palette.map(hexToRgb);

    if (scene === 'storm' && prevScene !== 'storm') {
      this.nextLightningIn = 0.9;
    }
    this.syncParticleCounts();
  }

  initEntities() {
    const w = this.width;
    const h = this.height;

    // Bintang (malam)
    const starCount = Math.min(180, Math.floor((w * h) / 7500));
    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.72,
      r: Math.random() * 1.6 + 0.4,
      twinkleSpeed: Math.random() * 2.2 + 0.8,
      twinkleOffset: Math.random() * Math.PI * 2,
      depth: Math.random() * 0.8 + 0.2,
    }));

    // Partikel cahaya hangat (siang cerah)
    this.motes = Array.from({ length: 28 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.4 + 0.8,
      vy: -(Math.random() * 8 + 4),
      vx: (Math.random() - 0.5) * 10,
      alpha: Math.random() * 0.32 + 0.08,
      phase: Math.random() * Math.PI * 2,
    }));

    // Awan volumetrik
    this.clouds = Array.from({ length: 11 }, (_, i) => this.makeCloud(i, true));

    // Lapisan kabut
    this.fogLayers = Array.from({ length: 5 }, (_, i) => ({
      y: h * (0.25 + i * 0.16),
      amp: 20 + i * 10,
      speed: (i % 2 === 0 ? 1 : -1) * (10 + i * 5),
      offset: Math.random() * 1000,
      alpha: 0.09 + i * 0.025,
    }));

    this.syncParticleCounts();
  }

  makeCloud(idx, randomX = false) {
    const layer = idx % 3; // 0 = jauh, 2 = dekat
    const scale = 0.65 + layer * 0.35;
    const puffs = Array.from({ length: 5 + (idx % 3) }, (_, p) => ({
      ox: (p - 2.5) * 46 * scale + (Math.random() - 0.5) * 20,
      oy: (Math.random() - 0.5) * 22 * scale,
      r: (42 + Math.random() * 34) * scale,
    }));
    return {
      x: randomX ? Math.random() * (this.width + 400) - 200 : -280,
      y: this.height * (0.08 + layer * 0.12 + Math.random() * 0.14),
      speed: (8 + layer * 9 + Math.random() * 6),
      layer,
      puffs,
    };
  }

  syncParticleCounts() {
    const { scene, intensity } = this.state;
    const w = this.width;
    const h = this.height;

    const targetRain =
      scene === 'storm'
        ? Math.floor(180 + intensity * 140)
        : scene === 'rain'
        ? Math.floor(85 + intensity * 150)
        : 0;

    while (this.raindrops.length < targetRain) {
      const depth = Math.random();
      this.raindrops.push({
        x: Math.random() * (w + 260) - 130,
        y: Math.random() * h,
        len: 14 + depth * 22,
        speed: 520 + depth * 460,
        alpha: 0.14 + depth * 0.35,
        width: 0.7 + depth * 0.9,
      });
    }
    if (this.raindrops.length > targetRain) {
      this.raindrops.length = targetRain;
    }

    const targetSnow = scene === 'snow' ? Math.floor(70 + intensity * 110) : 0;
    while (this.snowflakes.length < targetSnow) {
      const depth = Math.random();
      this.snowflakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.3 + depth * 3.4,
        speedY: 28 + depth * 56,
        swayAmp: 12 + depth * 24,
        swayFreq: 0.6 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.3 + depth * 0.6,
      });
    }
    if (this.snowflakes.length > targetSnow) {
      this.snowflakes.length = targetSnow;
    }
  }

  spawnLightning() {
    const startX = this.width * (0.18 + Math.random() * 0.64);
    const segments = [];
    let cx = startX;
    let cy = 0;
    const targetY = this.height * (0.45 + Math.random() * 0.25);
    const steps = 11;

    for (let i = 0; i < steps; i++) {
      const nx = cx + (Math.random() - 0.5) * 70;
      const ny = cy + (targetY / steps) * (0.8 + Math.random() * 0.4);
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, main: true });

      // Cabang kecil petir
      if (i > 1 && i < steps - 2 && Math.random() < 0.48) {
        const bx = nx + (Math.random() > 0.5 ? 1 : -1) * (35 + Math.random() * 55);
        const by = ny + 35 + Math.random() * 45;
        segments.push({ x1: nx, y1: ny, x2: bx, y2: by, main: false });
      }
      cx = nx;
      cy = ny;
    }

    this.lightningBolt = { segments, life: 0.28, maxLife: 0.28 };
    this.lightningFlash = 0.52;
    this.nextLightningIn = 3.2 + Math.random() * 5.5;
    if (this.onLightning) this.onLightning();
  }

  triggerManualLightning() {
    this.spawnLightning();
  }

  start() {
    const loop = (ts) => {
      if (!this.lastTs) this.lastTs = ts;
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      if (!this.reducedMotion) {
        this.elapsed += dt;
      }
      this.update(this.reducedMotion ? 0.008 : dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  update(dt) {
    // Interpolasi halus warna langit
    const colorStep = Math.min(1, dt * 2.2);
    for (let i = 0; i < 3; i++) {
      this.currentColors[i] = lerpRgb(this.currentColors[i], this.targetColors[i], colorStep);
    }

    // Parallax halus
    this.pointer.x = lerp(this.pointer.x, this.pointer.tx, Math.min(1, dt * 3));
    this.pointer.y = lerp(this.pointer.y, this.pointer.ty, Math.min(1, dt * 3));

    const windFactor = Math.max(0.4, Math.min(3.5, (this.state.windSpeed || 10) / 14));
    const w = this.width;
    const h = this.height;

    // Awan
    for (const c of this.clouds) {
      c.x += c.speed * windFactor * dt;
      if (c.x > w + 320) {
        c.x = -320;
        c.y = h * (0.06 + c.layer * 0.12 + Math.random() * 0.12);
      }
    }

    // Bintang jatuh (jarang, saat malam cerah)
    if (this.state.phase === 'night' && (this.state.scene === 'clear' || this.state.scene === 'partly-cloudy')) {
      if (Math.random() < dt * 0.16 && this.shootingStars.length < 2) {
        this.shootingStars.push({
          x: Math.random() * w * 0.75 + w * 0.15,
          y: Math.random() * h * 0.3,
          vx: -(360 + Math.random() * 220),
          vy: 140 + Math.random() * 110,
          life: 0.75,
          maxLife: 0.75,
        });
      }
    }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) this.shootingStars.splice(i, 1);
    }

    // Partikel cahaya siang
    if (this.state.scene === 'clear' && this.state.phase !== 'night') {
      for (const m of this.motes) {
        m.x += (m.vx + Math.sin(this.elapsed + m.phase) * 8) * dt;
        m.y += m.vy * dt;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = Math.random() * w;
        }
      }
    }

    // Hujan + percikan
    const slant = (this.state.windSpeed || 10) * 4.5 + (this.state.scene === 'storm' ? 95 : 25);
    for (const r of this.raindrops) {
      r.y += r.speed * dt;
      r.x -= slant * dt;
      if (r.y > h + 20) {
        if (Math.random() < 0.18 && this.splashes.length < 36) {
          this.splashes.push({
            x: r.x,
            y: h - 4 - Math.random() * 18,
            radius: 1,
            maxRadius: 10 + Math.random() * 14,
            alpha: 0.32,
          });
        }
        r.y = -30 - Math.random() * 60;
        r.x = Math.random() * (w + 320);
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const sp = this.splashes[i];
      sp.radius += 42 * dt;
      sp.alpha -= 0.9 * dt;
      if (sp.alpha <= 0 || sp.radius >= sp.maxRadius) this.splashes.splice(i, 1);
    }

    // Salju
    for (const sf of this.snowflakes) {
      sf.y += sf.speedY * dt;
      sf.x += (Math.sin(this.elapsed * sf.swayFreq + sf.phase) * sf.swayAmp + windFactor * 14) * dt;
      if (sf.y > h + 10) {
        sf.y = -10;
        sf.x = Math.random() * w;
      }
      if (sf.x > w + 10) sf.x = -10;
      if (sf.x < -10) sf.x = w + 10;
    }

    // Petir saat badai
    if (this.state.scene === 'storm') {
      this.nextLightningIn -= dt;
      if (this.nextLightningIn <= 0) {
        this.spawnLightning();
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 1.9);
    }
    if (this.lightningBolt) {
      this.lightningBolt.life -= dt;
      if (this.lightningBolt.life <= 0) this.lightningBolt = null;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const { scene, phase, intensity } = this.state;

    // 1. Gradien langit utama
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${this.currentColors[0].join(',')})`);
    grad.addColorStop(0.55, `rgb(${this.currentColors[1].join(',')})`);
    grad.addColorStop(1, `rgb(${this.currentColors[2].join(',')})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Bintang & Bulan (malam) atau Matahari (siang/senja/fajar)
    if (phase === 'night') {
      this.drawNightSky(ctx, scene);
    } else {
      this.drawSunAndGlow(ctx, scene, phase);
    }

    // 3. Partikel cahaya melayang saat cerah siang
    if (scene === 'clear' && phase !== 'night') {
      for (const m of this.motes) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 250, 225, ${m.alpha})`;
        ctx.fill();
      }
    }

    // 4. Awan volumetrik
    const cloudOpacity = this.getCloudOpacity(scene, intensity);
    if (cloudOpacity > 0.01) {
      this.drawClouds(ctx, cloudOpacity, scene, phase);
    }

    // 5. Kabut
    if (scene === 'fog' || scene === 'rain' || scene === 'storm') {
      const fogStrength = scene === 'fog' ? 1.0 : 0.25;
      this.drawFog(ctx, fogStrength, phase);
    }

    // 6. Hujan & Percikan
    if (this.raindrops.length) {
      this.drawRain(ctx);
    }

    // 7. Salju
    if (this.snowflakes.length) {
      this.drawSnow(ctx);
    }

    // 8. Petir & Kilat atmosfer
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(219, 234, 254, ${this.lightningFlash * 0.42})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.lightningBolt) {
      const ratio = this.lightningBolt.life / this.lightningBolt.maxLife;
      ctx.save();
      ctx.lineCap = 'round';
      for (const seg of this.lightningBolt.segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.strokeStyle = `rgba(186, 230, 253, ${ratio * 0.45})`;
        ctx.lineWidth = seg.main ? 8 : 4;
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${ratio * 0.95})`;
        ctx.lineWidth = seg.main ? 2.2 : 1.1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9. Vignette lembut agar teks UI selalu super kontras & terbaca
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(2, 6, 23, 0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  drawSunAndGlow(ctx, scene, phase) {
    const w = this.width;
    const h = this.height;
    const visibility =
      scene === 'clear' ? 1 : scene === 'partly-cloudy' ? 0.72 : scene === 'overcast' ? 0.22 : 0.12;
    if (visibility <= 0.05) return;

    const sunX = w * (phase === 'golden' ? 0.78 : phase === 'dawn' ? 0.24 : 0.76) - this.pointer.x * 26;
    const sunY = h * (phase === 'golden' || phase === 'dawn' ? 0.38 : 0.19) - this.pointer.y * 18;

    const warmColor =
      phase === 'golden'
        ? '251, 146, 60'
        : phase === 'dawn'
        ? '253, 186, 116'
        : '254, 240, 138';

    // Halo atmosfer besar
    const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, Math.min(w, h) * 0.48);
    halo.addColorStop(0, `rgba(255, 252, 235, ${0.58 * visibility})`);
    halo.addColorStop(0.22, `rgba(${warmColor}, ${0.34 * visibility})`);
    halo.addColorStop(0.6, `rgba(${warmColor}, ${0.09 * visibility})`);
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.min(w, h) * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // Sinar matahari berputar lembut
    if (scene === 'clear' || scene === 'partly-cloudy') {
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(this.elapsed * 0.045);
      const rayCount = 10;
      for (let i = 0; i < rayCount; i++) {
        ctx.rotate((Math.PI * 2) / rayCount);
        const rayGrad = ctx.createLinearGradient(0, 0, 260, 0);
        rayGrad.addColorStop(0, `rgba(255, 250, 220, ${0.14 * visibility})`);
        rayGrad.addColorStop(1, 'rgba(255, 250, 220, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(20, -6);
        ctx.lineTo(260, -28);
        ctx.lineTo(260, 28);
        ctx.lineTo(20, 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Inti matahari
    const coreR = phase === 'golden' || phase === 'dawn' ? 42 : 34;
    const core = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, coreR);
    core.addColorStop(0, `rgba(255, 255, 255, ${0.95 * visibility})`);
    core.addColorStop(0.7, `rgba(${warmColor}, ${0.75 * visibility})`);
    core.addColorStop(1, `rgba(${warmColor}, 0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sunX, sunY, coreR, 0, Math.PI * 2);
    ctx.fill();
  }

  drawNightSky(ctx, scene) {
    const w = this.width;
    const h = this.height;
    const starVis =
      scene === 'clear' ? 1 : scene === 'partly-cloudy' ? 0.65 : scene === 'snow' ? 0.3 : 0.08;

    if (starVis > 0.05) {
      for (const s of this.stars) {
        const twinkle = 0.45 + 0.55 * Math.sin(this.elapsed * s.twinkleSpeed + s.twinkleOffset);
        const px = s.x - this.pointer.x * 14 * s.depth;
        const py = s.y - this.pointer.y * 10 * s.depth;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 238, 255, ${twinkle * starVis * 0.88})`;
        ctx.fill();
      }

      // Bintang jatuh
      for (const ss of this.shootingStars) {
        const a = ss.life / ss.maxLife;
        const tailX = ss.x - ss.vx * 0.14;
        const tailY = ss.y - ss.vy * 0.14;
        const lg = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        lg.addColorStop(0, `rgba(255, 255, 255, ${a})`);
        lg.addColorStop(1, 'rgba(147, 197, 253, 0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }

      // Bulan + halo
      const moonX = w * 0.78 - this.pointer.x * 20;
      const moonY = h * 0.19 - this.pointer.y * 14;
      const halo = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 175);
      halo.addColorStop(0, `rgba(224, 242, 254, ${0.32 * starVis})`);
      halo.addColorStop(0.4, `rgba(147, 197, 253, ${0.12 * starVis})`);
      halo.addColorStop(1, 'rgba(147, 197, 253, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 175, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.92 * starVis;
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
      ctx.fill();

      // Kawah halus bulan
      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.beginPath();
      ctx.arc(moonX - 7, moonY - 5, 5.5, 0, Math.PI * 2);
      ctx.arc(moonX + 8, moonY + 6, 4.2, 0, Math.PI * 2);
      ctx.arc(moonX + 3, moonY - 9, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getCloudOpacity(scene, intensity) {
    if (scene === 'clear') return 0.1;
    if (scene === 'partly-cloudy') return 0.26 + intensity * 0.2;
    if (scene === 'overcast') return 0.56;
    if (scene === 'rain') return 0.52;
    if (scene === 'storm') return 0.65;
    if (scene === 'snow') return 0.42;
    if (scene === 'fog') return 0.35;
    return 0.25;
  }

  drawClouds(ctx, baseAlpha, scene, phase) {
    let rgb = '248, 250, 252';
    if (scene === 'storm') rgb = '30, 41, 59';
    else if (scene === 'rain' || scene === 'overcast') rgb = phase === 'night' ? '30, 41, 59' : '148, 163, 184';
    else if (phase === 'night') rgb = '51, 65, 85';
    else if (phase === 'golden' || phase === 'dawn') rgb = '254, 215, 170';

    const activeCount = scene === 'clear' ? 4 : scene === 'partly-cloudy' ? 7 : this.clouds.length;

    for (let i = 0; i < activeCount; i++) {
      const c = this.clouds[i];
      const px = c.x - this.pointer.x * (12 + c.layer * 14);
      const py = c.y - this.pointer.y * (8 + c.layer * 8);
      const alpha = baseAlpha * (0.45 + c.layer * 0.25);

      for (const p of c.puffs) {
        const g = ctx.createRadialGradient(px + p.ox, py + p.oy, p.r * 0.15, px + p.ox, py + p.oy, p.r);
        g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
        g.addColorStop(0.6, `rgba(${rgb}, ${alpha * 0.55})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px + p.ox, py + p.oy, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawFog(ctx, strength, phase) {
    const w = this.width;
    const h = this.height;
    const rgb = phase === 'night' ? '148, 163, 184' : '226, 232, 240';

    for (const layer of this.fogLayers) {
      const yShift = Math.sin(this.elapsed * 0.4 + layer.offset) * 18;
      const g = ctx.createLinearGradient(0, layer.y + yShift - 110, 0, layer.y + yShift + 130);
      g.addColorStop(0, `rgba(${rgb}, 0)`);
      g.addColorStop(0.5, `rgba(${rgb}, ${layer.alpha * strength})`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, layer.y + yShift - 110, w, 240);
    }

    // Lapisan kabut bawah ekstra saat mode fog
    if (strength > 0.5) {
      const lowFog = ctx.createLinearGradient(0, h * 0.55, 0, h);
      lowFog.addColorStop(0, `rgba(${rgb}, 0)`);
      lowFog.addColorStop(1, `rgba(${rgb}, 0.28)`);
      ctx.fillStyle = lowFog;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    }
  }

  drawRain(ctx) {
    const slantDx = -((this.state.windSpeed || 10) * 0.16 + (this.state.scene === 'storm' ? 4.5 : 1.5));
    ctx.lineCap = 'round';

    for (const r of this.raindrops) {
      ctx.strokeStyle = `rgba(203, 229, 255, ${r.alpha})`;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + slantDx, r.y + r.len);
      ctx.stroke();
    }

    // Percikan halus di tepi bawah
    for (const sp of this.splashes) {
      ctx.strokeStyle = `rgba(203, 229, 255, ${sp.alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.radius, sp.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawSnow(ctx) {
    for (const sf of this.snowflakes) {
      const g = ctx.createRadialGradient(sf.x, sf.y, 0, sf.x, sf.y, sf.r * 1.4);
      g.addColorStop(0, `rgba(255, 255, 255, ${sf.alpha})`);
      g.addColorStop(1, 'rgba(226, 240, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.r * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointer);
  }
}
