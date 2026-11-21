/**
 * charts.js
 * Visualisasi SVG interaktif:
 * - Grafik Prakiraan 24 Jam (hover/scrub interaktif untuk Suhu, Hujan, Angin, UV)
 * - Lintasan Matahari (Sun Arc) real-time
 * - Kompas Angin beranimasi
 */

import { interpretWmoCode, getWindDirectionLabel } from './weatherApi.js';
import { getWeatherIconSvg } from './icons.js';
import { t } from './i18n.js';

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Render grafik 24 jam dengan interaksi pointer scrub/hover
 */
export function renderHourlyChart(container, hourly, { metric = 'temp', unit = 'C', windUnit = 'kmh', lang = 'id', activeIdx = 0, onSelect }) {
  const dict = t(lang);
  if (!hourly || !hourly.length) {
    container.innerHTML = `<div class="chart-empty">${dict.chartEmpty}</div>`;
    return;
  }

  const W = 760;
  const H = 205;
  const padL = 22;
  const padR = 22;
  const padT = 32;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const windUnitTxt = windUnit === 'ms' ? dict.windUnitMs : dict.windUnitKmh;
  const getHourLabel = (item, idx) => (idx === 0 ? dict.nowLabel : item.time.slice(11, 16));

  const getValue = (item) => {
    if (metric === 'temp') return unit === 'F' ? (item.temp * 9) / 5 + 32 : item.temp;
    if (metric === 'precip') return item.precipProb;
    if (metric === 'wind') return windUnit === 'ms' ? item.windSpeed / 3.6 : item.windSpeed;
    if (metric === 'uv') return item.uv;
    return item.temp;
  };

  const formatVal = (val) => {
    if (metric === 'temp') return `${Math.round(val)}°`;
    if (metric === 'precip') return `${Math.round(val)}%`;
    if (metric === 'wind') return `${val.toFixed(windUnit === 'ms' ? 1 : 0)} ${windUnitTxt}`;
    if (metric === 'uv') return `UV ${val.toFixed(1)}`;
    return `${val}`;
  };

  const theme = {
    temp: { stroke: '#fbbf24', stop1: 'rgba(251, 191, 36, 0.36)', stop2: 'rgba(251, 191, 36, 0.0)' },
    precip: { stroke: '#38bdf8', stop1: 'rgba(56, 189, 248, 0.38)', stop2: 'rgba(56, 189, 248, 0.0)' },
    wind: { stroke: '#34d399', stop1: 'rgba(52, 211, 153, 0.34)', stop2: 'rgba(52, 211, 153, 0.0)' },
    uv: { stroke: '#f472b6', stop1: 'rgba(244, 114, 182, 0.36)', stop2: 'rgba(244, 114, 182, 0.0)' },
  }[metric];

  const vals = hourly.map(getValue);
  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);

  if (metric === 'precip') {
    minV = 0;
    maxV = Math.max(100, maxV);
  } else if (metric === 'uv') {
    minV = 0;
    maxV = Math.max(11, maxV + 1);
  } else if (maxV - minV < 3) {
    minV -= 2;
    maxV += 2;
  } else {
    const pad = (maxV - minV) * 0.16;
    minV -= pad;
    maxV += pad;
  }

  const points = hourly.map((item, idx) => {
    const x = padL + (idx / Math.max(1, hourly.length - 1)) * plotW;
    const norm = (getValue(item) - minV) / Math.max(0.001, maxV - minV);
    const y = padT + (1 - norm) * plotH;
    return { x, y, val: getValue(item), item, idx };
  });

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(H - padB).toFixed(1)} L ${points[0].x.toFixed(1)} ${(H - padB).toFixed(1)} Z`;

  // Garis grid horizontal tipis
  const gridLines = [0.2, 0.5, 0.8].map((r) => {
    const gy = padT + r * plotH;
    return `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="4 6"/>`;
  });

  // Label jam setiap 3 jam + nilai mini
  const xLabels = points
    .filter((_, i) => i % 3 === 0 || i === points.length - 1)
    .map(
      (p) => `
      <text x="${p.x.toFixed(1)}" y="${H - 12}" text-anchor="middle" class="chart-axis-label">${getHourLabel(p.item, p.idx)}</text>
      <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="middle" class="chart-point-label">${metric === 'wind' ? Math.round(p.val) : formatVal(p.val)}</text>
    `
    )
    .join('');

  // Batang tipis peluang hujan di latar saat melihat tab suhu
  const rainBars =
    metric === 'temp'
      ? points
          .map((p) => {
            const prob = p.item.precipProb || 0;
            if (prob <= 5) return '';
            const bh = (prob / 100) * 34;
            return `<rect x="${(p.x - 4).toFixed(1)}" y="${(H - padB - bh).toFixed(1)}" width="8" height="${bh.toFixed(1)}" rx="3" fill="rgba(56, 189, 248, 0.22)"/>`;
          })
          .join('')
      : '';

  const sel = points[Math.min(activeIdx, points.length - 1)];

  container.innerHTML = `
    <div class="hourly-chart-wrap">
      <svg class="hourly-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Grafik prakiraan cuaca 24 jam">
        <defs>
          <linearGradient id="areaGrad_${metric}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${theme.stop1}"/>
            <stop offset="100%" stop-color="${theme.stop2}"/>
          </linearGradient>
        </defs>
        ${gridLines.join('')}
        ${rainBars}
        <path d="${areaPath}" fill="url(#areaGrad_${metric})"/>
        <path d="${linePath}" fill="none" stroke="${theme.stroke}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" class="chart-line-path"/>
        <line id="scrub-line" x1="${sel.x.toFixed(1)}" y1="${padT - 8}" x2="${sel.x.toFixed(1)}" y2="${H - padB}" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-dasharray="3 3"/>
        <circle id="scrub-halo" cx="${sel.x.toFixed(1)}" cy="${sel.y.toFixed(1)}" r="10" fill="${theme.stroke}" opacity="0.25"/>
        <circle id="scrub-dot" cx="${sel.x.toFixed(1)}" cy="${sel.y.toFixed(1)}" r="4.8" fill="#ffffff" stroke="${theme.stroke}" stroke-width="2.6"/>
        ${xLabels}
      </svg>
      <div class="hourly-scrub-hint" id="scrub-readout"></div>
    </div>
  `;

  const svg = container.querySelector('.hourly-svg');
  const scrubLine = container.querySelector('#scrub-line');
  const scrubHalo = container.querySelector('#scrub-halo');
  const scrubDot = container.querySelector('#scrub-dot');
  const readout = container.querySelector('#scrub-readout');

  const updateActive = (idx, notify = true) => {
    const p = points[Math.max(0, Math.min(points.length - 1, idx))];
    scrubLine.setAttribute('x1', p.x.toFixed(1));
    scrubLine.setAttribute('x2', p.x.toFixed(1));
    scrubHalo.setAttribute('cx', p.x.toFixed(1));
    scrubHalo.setAttribute('cy', p.y.toFixed(1));
    scrubDot.setAttribute('cx', p.x.toFixed(1));
    scrubDot.setAttribute('cy', p.y.toFixed(1));

    const meta = interpretWmoCode(p.item.code, p.item.isDay, lang);
    const tempTxt = `${Math.round(unit === 'F' ? (p.item.temp * 9) / 5 + 32 : p.item.temp)}°${unit}`;
    const windTxt = `${(windUnit === 'ms' ? p.item.windSpeed / 3.6 : p.item.windSpeed).toFixed(windUnit === 'ms' ? 1 : 0)} ${windUnitTxt}`;

    readout.innerHTML = `
      <div class="scrub-chip">
        <span class="scrub-icon">${getWeatherIconSvg(meta.icon, 26)}</span>
        <span class="scrub-time">${getHourLabel(p.item, p.idx)}</span>
        <strong class="scrub-main">${formatVal(p.val)}</strong>
        <span class="scrub-meta">${meta.short} · ${dict.tabTemp} ${tempTxt} · ${dict.tabPrecip} ${p.item.precipProb}% · ${dict.tabWind} ${windTxt}</span>
      </div>
    `;

    if (notify && onSelect) onSelect(p.idx, p.item);
  };

  updateActive(activeIdx, false);

  const pickIndexFromClientX = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const rel = (clientX - rect.left) / Math.max(1, rect.width);
    const svgX = rel * W;
    const ratio = (svgX - padL) / plotW;
    return Math.round(Math.max(0, Math.min(1, ratio)) * (points.length - 1));
  };

  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    svg.setPointerCapture?.(e.pointerId);
    updateActive(pickIndexFromClientX(e.clientX), true);
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragging || e.pointerType === 'mouse') {
      updateActive(pickIndexFromClientX(e.clientX), true);
    }
  });
  window.addEventListener(
    'pointerup',
    () => {
      dragging = false;
    },
    { passive: true }
  );
}

/**
 * Render lintasan matahari (Sun Arc) berdasarkan sunrise & sunset lokal real-time
 */
export function renderSunArc(container, currentIso, sunriseIso, sunsetIso, lang = 'id') {
  const dict = t(lang);
  const toMin = (iso) => {
    if (!iso || iso.length < 16) return 0;
    return parseInt(iso.slice(11, 13), 10) * 60 + parseInt(iso.slice(14, 16), 10);
  };

  const nowM = toMin(currentIso);
  const riseM = toMin(sunriseIso);
  const setM = toMin(sunsetIso);
  const span = Math.max(1, setM - riseM);
  const rawProgress = (nowM - riseM) / span;
  const clamped = Math.max(0, Math.min(1, rawProgress));
  const isDaylight = rawProgress >= 0 && rawProgress <= 1;

  // Kurva kuadratik Bezier: P0(20, 96), P1(140, -10), P2(260, 96)
  const tt = clamped;
  const x = (1 - tt) * (1 - tt) * 20 + 2 * (1 - tt) * tt * 140 + tt * tt * 260;
  const y = (1 - tt) * (1 - tt) * 96 + 2 * (1 - tt) * tt * -10 + tt * tt * 96;

  const riseLabel = sunriseIso ? sunriseIso.slice(11, 16) : '--:--';
  const setLabel = sunsetIso ? sunsetIso.slice(11, 16) : '--:--';

  const daylightHrs = Math.floor(span / 60);
  const daylightMins = span % 60;

  let statusText = '';
  if (rawProgress < 0) {
    const diff = riseM - nowM;
    statusText = dict.risesIn(Math.floor(diff / 60), diff % 60);
  } else if (rawProgress <= 1) {
    const rem = setM - nowM;
    statusText = dict.setsIn(Math.floor(rem / 60), rem % 60);
  } else {
    statusText = dict.sunHasSet;
  }

  container.innerHTML = `
    <svg viewBox="0 0 280 118" class="sun-arc-svg" role="img" aria-label="${dict.cardSun}">
      <defs>
        <linearGradient id="sunArcStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fb923c"/>
          <stop offset="50%" stop-color="#fde047"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
        <linearGradient id="sunArcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(253, 224, 71, 0.28)"/>
          <stop offset="100%" stop-color="rgba(253, 224, 71, 0)"/>
        </linearGradient>
      </defs>
      <line x1="12" y1="96" x2="268" y2="96" stroke="rgba(255,255,255,0.16)" stroke-dasharray="3 4"/>
      <path d="M 20 96 Q 140 -10 260 96" fill="url(#sunArcFill)" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="4 4"/>
      <path d="M 20 96 Q 140 -10 260 96" fill="none" stroke="url(#sunArcStroke)" stroke-width="2.8" stroke-linecap="round" pathLength="100" stroke-dasharray="${(clamped * 100).toFixed(1)} 100"/>
      ${
        isDaylight
          ? `
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="rgba(253, 224, 71, 0.25)"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#fef08a" stroke="#ffffff" stroke-width="2"/>
      `
          : `
        <circle cx="${rawProgress < 0 ? 20 : 260}" cy="96" r="5" fill="#94a3b8"/>
      `
      }
      <text x="20" y="113" text-anchor="start" class="arc-time-label">↑ ${riseLabel}</text>
      <text x="140" y="113" text-anchor="middle" class="arc-dur-label">${dict.daylightFmt(daylightHrs, daylightMins)}</text>
      <text x="260" y="113" text-anchor="end" class="arc-time-label">↓ ${setLabel}</text>
    </svg>
    <div class="sun-arc-caption">${statusText}</div>
  `;
}

/**
 * Render Kompas Angin SVG interaktif
 */
export function renderWindCompass(container, speedKmh, dirDeg, gustsKmh, windUnit = 'kmh', lang = 'id') {
  const dict = t(lang);
  const val = windUnit === 'ms' ? (speedKmh / 3.6).toFixed(1) : Math.round(speedKmh);
  const gustVal = windUnit === 'ms' ? (gustsKmh / 3.6).toFixed(1) : Math.round(gustsKmh);
  const unitLabel = windUnit === 'ms' ? dict.windUnitMs : dict.windUnitKmh;
  const dirLabel = getWindDirectionLabel(dirDeg, lang);
  const [cN, cE, cS, cW] = dict.cardinals4;

  container.innerHTML = `
    <div class="compass-layout">
      <svg viewBox="0 0 120 120" class="compass-svg" role="img" aria-label="${dict.cardWind} ${dirDeg}°">
        <circle cx="60" cy="60" r="52" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>
        <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2 6" stroke-width="3"/>
        <text x="60" y="19" text-anchor="middle" class="compass-cardinal">${cN}</text>
        <text x="103" y="64" text-anchor="middle" class="compass-cardinal">${cE}</text>
        <text x="60" y="109" text-anchor="middle" class="compass-cardinal">${cS}</text>
        <text x="17" y="64" text-anchor="middle" class="compass-cardinal">${cW}</text>
        <g class="compass-needle" style="transform: rotate(${Math.round(dirDeg)}deg); transform-origin: 60px 60px;">
          <polygon points="60,24 65,60 60,54 55,60" fill="#38bdf8"/>
          <polygon points="60,94 64,60 60,65 56,60" fill="rgba(255,255,255,0.35)"/>
          <circle cx="60" cy="60" r="4" fill="#ffffff"/>
        </g>
      </svg>
      <div class="compass-stats">
        <div class="compass-big">${val} <small>${unitLabel}</small></div>
        <div class="compass-sub">${dict.windDirLabel} <strong>${dirLabel}</strong> (${Math.round(dirDeg)}°)</div>
        <div class="compass-sub">${dict.windGustsLabel} <strong>${gustVal} ${unitLabel}</strong></div>
      </div>
    </div>
  `;
}
