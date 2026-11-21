/**
 * app.js
 * Main controller for ATMOS — Interactive Real-Time Weather Observatory
 */

import {
  PRESET_CITIES,
  fetchWeatherBundle,
  fetchQuickWeather,
  searchCities,
  reverseGeocode,
  detectLocationByIp,
  interpretWmoCode,
  getBeaufortLabel,
  getAqiInfo,
  getUvInfo,
  getSmartInsight,
  countryCodeToFlag,
} from './weatherApi.js';
import { SkyEngine } from './skyEngine.js';
import { getWeatherIconSvg } from './icons.js';
import { renderHourlyChart, renderSunArc, renderWindCompass } from './charts.js';
import { SoundEngine } from './soundEngine.js';
import { loadSavedLang, saveLang, t } from './i18n.js';

const STORAGE_FAVS = 'atmos_fav_cities_v1';
const STORAGE_LAST = 'atmos_last_city_v1';
const STORAGE_MODE = 'atmos_loc_mode_v2';

const FX_PRESETS = {
  'clear-day': { scene: 'clear', phase: 'day', intensity: 0.1, windSpeed: 10 },
  'clear-golden': { scene: 'clear', phase: 'golden', intensity: 0.15, windSpeed: 12 },
  'clear-night': { scene: 'clear', phase: 'night', intensity: 0.1, windSpeed: 8 },
  'overcast-day': { scene: 'overcast', phase: 'day', intensity: 0.9, windSpeed: 16 },
  'rain-day': { scene: 'rain', phase: 'day', intensity: 0.85, windSpeed: 22 },
  'storm-night': { scene: 'storm', phase: 'night', intensity: 1.0, windSpeed: 38 },
  'snow-day': { scene: 'snow', phase: 'day', intensity: 0.85, windSpeed: 14 },
  'fog-day': { scene: 'fog', phase: 'day', intensity: 0.9, windSpeed: 6 },
};

const state = {
  lang: loadSavedLang(),
  city: loadSavedCity() || PRESET_CITIES[0],
  favorites: loadFavorites(),
  weather: null,
  unit: 'C',
  windUnit: 'kmh',
  activeMetric: 'temp',
  activeHourIdx: 0,
  expandedDayIdx: null,
  fxMode: 'live',
  quickCache: new Map(),
  searchResults: [],
  searchFocusIdx: -1,
  displayedTemp: null,
};

// Initialize sound synthesis & 60fps sky canvas
const soundEngine = new SoundEngine();
const skyEngine = new SkyEngine(document.getElementById('weather-canvas'), () => {
  soundEngine.playThunder();
});

// DOM references
const els = {
  dashboard: document.getElementById('dashboard'),
  toast: document.getElementById('toast-banner'),
  statusPill: document.getElementById('live-status-pill'),
  statusText: document.getElementById('live-status-text'),

  searchInput: document.getElementById('city-search'),
  searchResults: document.getElementById('search-results'),
  geoBtn: document.getElementById('geo-btn'),
  langToggle: document.getElementById('lang-toggle'),
  langLabel: document.getElementById('lang-label'),
  unitToggle: document.getElementById('unit-toggle'),
  unitLabel: document.getElementById('unit-label'),
  soundToggle: document.getElementById('sound-toggle'),
  soundIconOff: document.getElementById('sound-icon-off'),
  soundEq: document.getElementById('sound-eq'),
  refreshBtn: document.getElementById('refresh-btn'),

  quickCities: document.getElementById('quick-cities'),
  fxPills: document.getElementById('fx-pills'),

  cityName: document.getElementById('city-name'),
  citySub: document.getElementById('city-sub'),
  favBtn: document.getElementById('fav-btn'),
  localTime: document.getElementById('local-time'),
  localDate: document.getElementById('local-date'),

  heroIcon: document.getElementById('hero-icon'),
  heroTemp: document.getElementById('hero-temp'),
  heroUnit: document.getElementById('hero-unit'),
  heroCondition: document.getElementById('hero-condition'),
  heroHiLo: document.getElementById('hero-hilo'),
  pillRain: document.getElementById('pill-rain'),
  pillHum: document.getElementById('pill-hum'),
  pillWind: document.getElementById('pill-wind'),
  pillUv: document.getElementById('pill-uv'),
  smartInsightText: document.getElementById('smart-insight-text'),

  hourlyChart: document.getElementById('hourly-chart-container'),
  hourlyStrip: document.getElementById('hourly-strip'),
  metricTabs: document.querySelectorAll('.tab-btn'),

  windBeaufort: document.getElementById('wind-beaufort'),
  windCompassBox: document.getElementById('wind-compass-box'),
  sunPhaseBadge: document.getElementById('sun-phase-badge'),
  sunArcBox: document.getElementById('sun-arc-box'),

  aqiBadge: document.getElementById('aqi-badge'),
  aqiValue: document.getElementById('aqi-value'),
  aqiMarker: document.getElementById('aqi-marker'),
  pm25Val: document.getElementById('pm25-val'),
  pm10Val: document.getElementById('pm10-val'),
  o3Val: document.getElementById('o3-val'),
  aqiTip: document.getElementById('aqi-tip'),

  uvBadge: document.getElementById('uv-badge'),
  uvValue: document.getElementById('uv-value'),
  uvMaxLabel: document.getElementById('uv-max-label'),
  uvMarker: document.getElementById('uv-marker'),
  uvTip: document.getElementById('uv-tip'),

  humBadge: document.getElementById('hum-badge'),
  humValue: document.getElementById('hum-value'),
  dewLabel: document.getElementById('dew-label'),
  humFill: document.getElementById('hum-fill'),
  humTip: document.getElementById('hum-tip'),

  pressureBadge: document.getElementById('pressure-badge'),
  pressureVal: document.getElementById('pressure-val'),
  visibilityVal: document.getElementById('visibility-val'),
  cloudVal: document.getElementById('cloud-val'),

  dailyList: document.getElementById('daily-list'),
  metaCoords: document.getElementById('meta-coords'),
  metaElev: document.getElementById('meta-elev'),
  metaTz: document.getElementById('meta-tz'),
  metaUpdated: document.getElementById('meta-updated'),
};

/* ==========================================================================
   i18n Static UI Sync
   ========================================================================== */
function applyLanguageStaticUI() {
  const dict = t(state.lang);
  document.documentElement.lang = state.lang;
  document.title = dict.pageTitle;

  els.langLabel.textContent = state.lang.toUpperCase();
  els.langToggle.title = dict.langTitle;
  els.searchInput.placeholder = dict.searchPlaceholder;
  els.geoBtn.title = dict.geoTitle;
  els.unitToggle.title = dict.unitTitle;
  els.soundToggle.title = dict.soundTitle;
  els.refreshBtn.title = dict.refreshTitle;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (typeof dict[key] === 'string') {
      el.textContent = dict[key];
    }
  });

  els.fxPills.querySelectorAll('.fx-pill').forEach((pill) => {
    const fxKey = pill.dataset.fx;
    if (dict.fx[fxKey]) pill.textContent = dict.fx[fxKey];
  });

  els.statusText.textContent = state.fxMode === 'live' ? dict.statusLive : dict.statusSim;

  if (!state.weather) {
    els.cityName.textContent = dict.loadingCity;
    els.citySub.textContent = dict.loadingSub;
    els.heroCondition.textContent = dict.loadingCond;
    els.smartInsightText.textContent = dict.loadingInsight;
  }
}

/* ==========================================================================
   Utilities & Local Storage
   ========================================================================== */
function cityKey(c) {
  return `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_FAVS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_FAVS, JSON.stringify(state.favorites));
  } catch {
    // ignore
  }
}

function loadSavedCity() {
  try {
    const raw = localStorage.getItem(STORAGE_LAST);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCurrentCity(city, mode = 'manual') {
  try {
    localStorage.setItem(STORAGE_LAST, JSON.stringify(city));
    localStorage.setItem(STORAGE_MODE, mode);
  } catch {
    // ignore
  }
}

function loadLocationMode() {
  try {
    return localStorage.getItem(STORAGE_MODE) || 'auto';
  } catch {
    return 'auto';
  }
}

function toDisplayTemp(tempC) {
  if (tempC == null || Number.isNaN(tempC)) return '--';
  return Math.round(state.unit === 'F' ? (tempC * 9) / 5 + 32 : tempC);
}

function formatWind(kmh) {
  const dict = t(state.lang);
  if (state.windUnit === 'ms') return `${(kmh / 3.6).toFixed(1)} ${dict.windUnitMs}`;
  return `${Math.round(kmh)} ${dict.windUnitKmh}`;
}

let toastTimer = null;
function showToast(msg, duration = 4200) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, duration);
}

function animateNumber(el, fromVal, toVal, duration = 520) {
  if (fromVal == null || Number.isNaN(fromVal)) {
    el.textContent = `${toVal}`;
    return;
  }
  const start = performance.now();
  const diff = toVal - fromVal;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(fromVal + diff * eased)}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ==========================================================================
   Fetch Real-Time Weather from Open-Meteo
   ========================================================================== */
async function loadCityWeather(city, { silent = false, mode = 'manual' } = {}) {
  state.city = city;
  state.activeHourIdx = 0;
  state.expandedDayIdx = null;
  saveCurrentCity(city, mode);
  els.geoBtn.classList.toggle('loc-active', mode === 'auto');

  els.dashboard.setAttribute('aria-busy', 'true');
  els.refreshBtn.classList.add('spinning');
  renderQuickCities();
  updateFavButton();

  try {
    const data = await fetchWeatherBundle(city.latitude, city.longitude);
    state.weather = data;

    state.quickCache.set(cityKey(city), {
      temp: data.current.temp,
      code: data.current.code,
      isDay: data.current.isDay,
    });

    renderAll();
    applySkyAndSound();
    renderQuickCities();
  } catch (err) {
    console.error(err);
    if (!silent) {
      showToast(t(state.lang).toastFetchErr(err.message));
    }
  } finally {
    els.dashboard.setAttribute('aria-busy', 'false');
    els.refreshBtn.classList.remove('spinning');
  }
}

async function refreshQuickCityTemps() {
  const list = getQuickCityList();
  try {
    const res = await fetchQuickWeather(list);
    for (const item of res) {
      if (item.city && item.temp != null) {
        state.quickCache.set(cityKey(item.city), {
          temp: item.temp,
          code: item.code,
          isDay: item.isDay,
        });
      }
    }
    renderQuickCities();
  } catch {
    // non-fatal
  }
}

function getQuickCityList() {
  const map = new Map();
  for (const fav of state.favorites) map.set(cityKey(fav), { ...fav, isFav: true });
  for (const preset of PRESET_CITIES) {
    const k = cityKey(preset);
    if (!map.has(k)) map.set(k, { ...preset, isFav: false });
  }
  const curKey = cityKey(state.city);
  if (!map.has(curKey)) {
    map.set(curKey, { ...state.city, isFav: false });
  }
  return Array.from(map.values());
}

/* ==========================================================================
   Sky Canvas & Ambient Audio Sync
   ========================================================================== */
function applySkyAndSound() {
  const dict = t(state.lang);

  if (state.fxMode !== 'live' && FX_PRESETS[state.fxMode]) {
    const p = FX_PRESETS[state.fxMode];
    skyEngine.setWeather(p);
    soundEngine.setScene(p.scene, p.intensity);
    els.statusPill.classList.add('sim-mode');
    els.statusText.textContent = dict.statusSim;
    return;
  }

  els.statusPill.classList.remove('sim-mode');
  els.statusText.textContent = dict.statusLive;

  if (!state.weather) return;
  const cur = state.weather.current;
  const meta = interpretWmoCode(cur.code, cur.isDay, state.lang);
  skyEngine.setWeather({
    scene: meta.scene,
    phase: state.weather.timePhase,
    intensity: meta.intensity,
    windSpeed: cur.windSpeed,
  });
  soundEngine.setScene(meta.scene, meta.intensity);
}

/* ==========================================================================
   Full UI Renderer
   ========================================================================== */
function renderAll() {
  if (!state.weather) return;
  const dict = t(state.lang);
  const w = state.weather;
  const cur = w.current;
  const today = w.daily[0];
  const curMeta = interpretWmoCode(cur.code, cur.isDay, state.lang);

  // Location header
  const flag = countryCodeToFlag(state.city.country_code);
  els.cityName.textContent = state.city.name;
  const parts = [state.city.admin1, state.city.country].filter(Boolean);
  const autoTag =
    state.city.source === 'gps'
      ? ` · ${dict.tagGps}`
      : state.city.source === 'ip'
      ? ` · ${dict.tagIp}`
      : '';
  els.citySub.textContent = `${flag} ${parts.join(', ') || dict.localStation} · ${w.timezoneAbbrev}${autoTag}`;
  updateFavButton();

  // Hero temperature + rolling animation
  const targetTemp = toDisplayTemp(cur.temp);
  animateNumber(els.heroTemp, state.displayedTemp, targetTemp);
  state.displayedTemp = targetTemp;
  els.heroUnit.textContent = `°${state.unit}`;

  els.heroIcon.innerHTML = getWeatherIconSvg(curMeta.icon, 90);
  els.heroCondition.textContent = curMeta.label;

  const feels = toDisplayTemp(cur.feelsLike);
  const hi = today ? toDisplayTemp(today.tempMax) : '--';
  const lo = today ? toDisplayTemp(today.tempMin) : '--';
  els.heroHiLo.textContent = `${dict.feelsLike} ${feels}° · ${dict.high} ${hi}° · ${dict.low} ${lo}°`;

  els.pillRain.textContent = `${cur.precipProb}%`;
  els.pillHum.textContent = `${Math.round(cur.humidity)}%`;
  els.pillWind.textContent = formatWind(cur.windSpeed);
  els.pillUv.textContent = cur.uv.toFixed(1);

  els.smartInsightText.textContent = getSmartInsight({ ...cur, meta: curMeta }, w.aqi, state.lang);

  // 24h chart & strip
  renderHourlySection();

  // 6 telemetry cards
  renderTelemetry(w);

  // 7-day forecast
  renderDailyList(w.daily);

  // Station metadata
  els.metaCoords.textContent = `${state.city.latitude.toFixed(3)}°, ${state.city.longitude.toFixed(3)}°`;
  els.metaElev.textContent = `${Math.round(w.elevation || 0)} ${dict.elevUnit}`;
  els.metaTz.textContent = w.timezone;
  els.metaUpdated.textContent = w.fetchedAt.toLocaleTimeString(dict.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  updateLocalCityClock();
}

function renderHourlySection() {
  if (!state.weather) return;
  const dict = t(state.lang);
  const hourly = state.weather.hourly;

  renderHourlyChart(els.hourlyChart, hourly, {
    metric: state.activeMetric,
    unit: state.unit,
    windUnit: state.windUnit,
    lang: state.lang,
    activeIdx: state.activeHourIdx,
    onSelect: (idx) => {
      state.activeHourIdx = idx;
      highlightHourlyPill(idx);
    },
  });

  els.hourlyStrip.innerHTML = hourly
    .map((h, idx) => {
      const meta = interpretWmoCode(h.code, h.isDay, state.lang);
      const tVal = toDisplayTemp(h.temp);
      const label = idx === 0 ? dict.nowLabel : h.time.slice(11, 16);
      return `
        <button type="button" class="hour-pill ${idx === state.activeHourIdx ? 'active' : ''}" data-hour-idx="${idx}">
          <span class="hour-pill-time">${label}</span>
          <span>${getWeatherIconSvg(meta.icon, 30)}</span>
          <span class="hour-pill-temp">${tVal}°</span>
          <span class="hour-pill-rain">${h.precipProb >= 15 ? `💧${h.precipProb}%` : ''}</span>
        </button>
      `;
    })
    .join('');

  els.hourlyStrip.querySelectorAll('.hour-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeHourIdx = Number(btn.dataset.hourIdx);
      renderHourlySection();
    });
  });
}

function highlightHourlyPill(idx) {
  const pills = els.hourlyStrip.querySelectorAll('.hour-pill');
  pills.forEach((p, i) => p.classList.toggle('active', i === idx));
  const active = pills[idx];
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }
}

function renderTelemetry(w) {
  const dict = t(state.lang);
  const cur = w.current;
  const today = w.daily[0];

  // 1. Wind
  els.windBeaufort.textContent = getBeaufortLabel(cur.windSpeed, state.lang);
  renderWindCompass(els.windCompassBox, cur.windSpeed, cur.windDir, cur.windGusts, state.windUnit, state.lang);

  // 2. Sun Trajectory
  els.sunPhaseBadge.textContent = dict.phases[w.timePhase] || dict.phases.day;
  renderSunArc(els.sunArcBox, cur.time, today?.sunrise, today?.sunset, state.lang);

  // 3. AQI
  if (w.aqi) {
    const info = getAqiInfo(w.aqi.usAqi, state.lang);
    els.aqiValue.textContent = Math.round(w.aqi.usAqi);
    els.aqiBadge.textContent = info.label;
    els.aqiBadge.style.color = info.color;
    els.aqiMarker.style.left = `${Math.min(97, Math.max(3, (w.aqi.usAqi / 220) * 100))}%`;
    els.pm25Val.textContent = `${w.aqi.pm25.toFixed(1)}`;
    els.pm10Val.textContent = `${w.aqi.pm10.toFixed(1)}`;
    els.o3Val.textContent = `${Math.round(w.aqi.ozone)}`;
    els.aqiTip.textContent = info.tip;
  } else {
    els.aqiValue.textContent = '--';
    els.aqiBadge.textContent = 'N/A';
    els.aqiBadge.style.color = '';
    els.aqiTip.textContent = dict.aqiUnavailable;
  }

  // 4. UV Index
  const uvInfo = getUvInfo(cur.uv, state.lang);
  els.uvValue.textContent = cur.uv.toFixed(1);
  els.uvBadge.textContent = uvInfo.label;
  els.uvBadge.style.color = uvInfo.color;
  els.uvMaxLabel.textContent = `${dict.uvMaxToday} ${today ? today.uvMax.toFixed(1) : '--'}`;
  els.uvMarker.style.left = `${Math.min(97, Math.max(3, (cur.uv / 12) * 100))}%`;
  els.uvTip.textContent = uvInfo.tip;

  // 5. Humidity
  const hum = Math.round(cur.humidity);
  els.humValue.textContent = `${hum}%`;
  els.dewLabel.textContent = `${dict.dewPoint} ${toDisplayTemp(cur.dewPoint)}°`;
  els.humFill.style.width = `${Math.min(100, Math.max(0, hum))}%`;
  if (hum < 35) {
    els.humBadge.textContent = dict.humDry;
    els.humTip.textContent = dict.humDryTip;
  } else if (hum <= 68) {
    els.humBadge.textContent = dict.humComfort;
    els.humTip.textContent = dict.humComfortTip;
  } else {
    els.humBadge.textContent = dict.humHumid;
    els.humTip.textContent = dict.humHumidTip;
  }

  // 6. Pressure & Visibility
  const pressure = Math.round(cur.pressure);
  els.pressureVal.textContent = `${pressure} hPa`;
  els.pressureBadge.textContent =
    pressure >= 1016 ? dict.pressureHigh : pressure <= 1006 ? dict.pressureLow : dict.pressureNormal;
  const visKm = (cur.visibility / 1000).toFixed(1);
  els.visibilityVal.textContent = `${visKm} km`;
  els.cloudVal.textContent = `${Math.round(cur.cloudCover)}%`;
}

function renderDailyList(days) {
  if (!days || !days.length) return;
  const dict = t(state.lang);
  const weekMin = Math.min(...days.map((d) => d.tempMin));
  const weekMax = Math.max(...days.map((d) => d.tempMax));
  const span = Math.max(1, weekMax - weekMin);

  const dayFormatter = new Intl.DateTimeFormat(dict.locale, { weekday: 'short' });

  els.dailyList.innerHTML = days
    .map((d, idx) => {
      const dateObj = new Date(`${d.date}T12:00:00`);
      const label = idx === 0 ? dict.today : idx === 1 ? dict.tomorrow : dayFormatter.format(dateObj);
      const meta = interpretWmoCode(d.code, 1, state.lang);

      const leftPct = ((d.tempMin - weekMin) / span) * 100;
      const widthPct = Math.max(12, ((d.tempMax - d.tempMin) / span) * 100);
      const isExpanded = state.expandedDayIdx === idx;

      return `
        <div class="day-row ${isExpanded ? 'expanded' : ''}">
          <button type="button" class="day-trigger" data-day-idx="${idx}" aria-expanded="${isExpanded}">
            <span class="day-name">${label}</span>
            <span>${getWeatherIconSvg(meta.icon, 30)}</span>
            <span class="day-rain">${d.precipProbMax >= 15 ? `${d.precipProbMax}%` : ''}</span>
            <div class="day-range">
              <span class="day-min">${toDisplayTemp(d.tempMin)}°</span>
              <div class="range-track">
                <div class="range-bar" style="left:${leftPct.toFixed(1)}%; width:${Math.min(100 - leftPct, widthPct).toFixed(1)}%"></div>
              </div>
              <span class="day-max">${toDisplayTemp(d.tempMax)}°</span>
            </div>
          </button>
          <div class="day-details" ${isExpanded ? '' : 'hidden'}>
            <span>${dict.detailCondition}: <strong>${meta.label}</strong></span>
            <span>${dict.detailPrecip}: <strong>${d.precipSum.toFixed(1)} mm</strong></span>
            <span>${dict.detailUvMax}: <strong>${d.uvMax.toFixed(1)}</strong></span>
            <span>${dict.detailWindMax}: <strong>${formatWind(d.windMax)}</strong></span>
            <span>${dict.detailSunrise}: <strong>${d.sunrise.slice(11, 16)}</strong></span>
            <span>${dict.detailSunset}: <strong>${d.sunset.slice(11, 16)}</strong></span>
          </div>
        </div>
      `;
    })
    .join('');

  els.dailyList.querySelectorAll('.day-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.dayIdx);
      state.expandedDayIdx = state.expandedDayIdx === idx ? null : idx;
      renderDailyList(days);
    });
  });
}

function renderQuickCities() {
  const list = getQuickCityList();
  const activeKey = cityKey(state.city);

  els.quickCities.innerHTML = list
    .map((c, idx) => {
      const k = cityKey(c);
      const cached = state.quickCache.get(k);
      const tempTxt = cached ? `${toDisplayTemp(cached.temp)}°` : '';
      const isFav = state.favorites.some((f) => cityKey(f) === k);

      return `
        <button type="button" class="city-chip ${k === activeKey ? 'active' : ''}" data-qidx="${idx}">
          ${isFav ? '<span class="city-chip-star" aria-hidden="true">★</span>' : ''}
          <span>${c.name}</span>
          ${tempTxt ? `<span class="city-chip-temp">${tempTxt}</span>` : ''}
        </button>
      `;
    })
    .join('');

  els.quickCities.querySelectorAll('.city-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chosen = list[Number(btn.dataset.qidx)];
      if (chosen) {
        if (state.fxMode !== 'live') setFxMode('live');
        loadCityWeather(chosen, { mode: 'manual' });
      }
    });
  });
}

function updateFavButton() {
  const dict = t(state.lang);
  const curK = cityKey(state.city);
  const isFav = state.favorites.some((f) => cityKey(f) === curK);
  els.favBtn.setAttribute('aria-pressed', String(isFav));
  els.favBtn.title = isFav ? dict.favRemove : dict.favAdd;
}

/* ==========================================================================
   Live Local City Clock
   ========================================================================== */
function updateLocalCityClock() {
  if (!state.weather) return;
  const dict = t(state.lang);
  const nowUtcMs = Date.now();
  const shifted = new Date(nowUtcMs + state.weather.utcOffsetSeconds * 1000);

  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
  els.localTime.textContent = `${hh}:${mm}:${ss}`;

  const dateFmt = new Intl.DateTimeFormat(dict.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  els.localDate.textContent = dateFmt.format(shifted);
}

/* ==========================================================================
   City Search, GPS, Language, Units, Audio & FX Playground
   ========================================================================== */
let searchDebounce = null;
let searchAbort = null;

function closeSearchDropdown() {
  els.searchResults.hidden = true;
  els.searchInput.setAttribute('aria-expanded', 'false');
  state.searchFocusIdx = -1;
}

function renderSearchDropdown(items) {
  const dict = t(state.lang);
  state.searchResults = items;
  state.searchFocusIdx = -1;

  if (!items.length) {
    els.searchResults.innerHTML = `<div class="search-empty">${dict.searchEmpty}</div>`;
  } else {
    els.searchResults.innerHTML = items
      .map(
        (c, idx) => `
        <button type="button" class="search-item" role="option" data-sidx="${idx}">
          <div class="search-item-main">
            <span class="search-flag">${countryCodeToFlag(c.country_code)}</span>
            <div>
              <div class="search-city">${c.name}</div>
              <div class="search-region">${[c.admin1, c.country].filter(Boolean).join(', ')}</div>
            </div>
          </div>
          <span class="search-coords">${c.latitude.toFixed(2)}, ${c.longitude.toFixed(2)}</span>
        </button>
      `
      )
      .join('');

    els.searchResults.querySelectorAll('.search-item').forEach((btn) => {
      btn.addEventListener('click', () => selectSearchItem(Number(btn.dataset.sidx)));
    });
  }

  els.searchResults.hidden = false;
  els.searchInput.setAttribute('aria-expanded', 'true');
}

function selectSearchItem(idx) {
  const chosen = state.searchResults[idx];
  if (!chosen) return;
  els.searchInput.value = '';
  closeSearchDropdown();
  if (state.fxMode !== 'live') setFxMode('live');
  loadCityWeather(chosen, { mode: 'manual' });
}

els.searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  clearTimeout(searchDebounce);
  if (q.length < 2) {
    closeSearchDropdown();
    return;
  }

  searchDebounce = setTimeout(async () => {
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    try {
      const results = await searchCities(q, searchAbort.signal, state.lang);
      renderSearchDropdown(results);
    } catch (err) {
      if (err.name !== 'AbortError') {
        els.searchResults.innerHTML = `<div class="search-empty">${t(state.lang).searchErr}</div>`;
        els.searchResults.hidden = false;
      }
    }
  }, 260);
});

els.searchInput.addEventListener('keydown', (e) => {
  if (els.searchResults.hidden || !state.searchResults.length) return;
  const items = els.searchResults.querySelectorAll('.search-item');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.searchFocusIdx = (state.searchFocusIdx + 1) % items.length;
    items.forEach((el, i) => el.classList.toggle('active', i === state.searchFocusIdx));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.searchFocusIdx = (state.searchFocusIdx - 1 + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('active', i === state.searchFocusIdx));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    selectSearchItem(state.searchFocusIdx >= 0 ? state.searchFocusIdx : 0);
  } else if (e.key === 'Escape') {
    closeSearchDropdown();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) closeSearchDropdown();
});

// Auto-Location Detection (Browser GPS -> IP Fallback -> Default City)
function getBrowserPosition(timeoutMs = 5500) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('No geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

async function detectAndLoadUserLocation({ userInitiated = false } = {}) {
  const dict = t(state.lang);
  els.geoBtn.classList.add('spinning');
  try {
    const pos = await getBrowserPosition(userInitiated ? 9000 : 5000);
    const { latitude, longitude } = pos.coords;
    const cityObj = await reverseGeocode(latitude, longitude, state.lang);
    if (state.fxMode !== 'live') setFxMode('live');
    await loadCityWeather(cityObj, { mode: 'auto' });
    showToast(dict.toastGpsOk(cityObj.name));
    return true;
  } catch {
    const ipCity = await detectLocationByIp();
    if (ipCity) {
      if (state.fxMode !== 'live') setFxMode('live');
      await loadCityWeather(ipCity, { mode: 'auto' });
      showToast(userInitiated ? dict.toastIpUser(ipCity.name) : dict.toastIpAuto(ipCity.name));
      return true;
    }
    if (userInitiated) {
      showToast(dict.toastGeoFail);
    }
    return false;
  } finally {
    els.geoBtn.classList.remove('spinning');
  }
}

els.geoBtn.addEventListener('click', () => {
  detectAndLoadUserLocation({ userInitiated: true });
});

// Language Toggle (ID / EN)
els.langToggle.addEventListener('click', () => {
  state.lang = state.lang === 'id' ? 'en' : 'id';
  saveLang(state.lang);
  applyLanguageStaticUI();
  renderAll();
  renderQuickCities();
});

// Temperature Unit Toggle (°C / °F)
els.unitToggle.addEventListener('click', () => {
  state.unit = state.unit === 'C' ? 'F' : 'C';
  state.windUnit = state.unit === 'C' ? 'kmh' : 'ms';
  els.unitLabel.textContent = `°${state.unit}`;
  state.displayedTemp = null;
  renderAll();
  renderQuickCities();
});

// Ambient Audio Toggle
els.soundToggle.addEventListener('click', () => {
  const on = soundEngine.toggle();
  els.soundToggle.setAttribute('aria-pressed', String(on));
  els.soundIconOff.hidden = on;
  els.soundEq.hidden = !on;
  if (on) {
    applySkyAndSound();
    showToast(t(state.lang).toastSoundOn);
  }
});

// Manual Refresh
els.refreshBtn.addEventListener('click', () => {
  loadCityWeather(state.city, { mode: loadLocationMode() });
});

// Favorite City Toggle
els.favBtn.addEventListener('click', () => {
  const dict = t(state.lang);
  const k = cityKey(state.city);
  const idx = state.favorites.findIndex((f) => cityKey(f) === k);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
    showToast(dict.toastFavRemoved(state.city.name));
  } else {
    state.favorites.unshift({ ...state.city });
    showToast(dict.toastFavAdded(state.city.name));
  }
  saveFavorites();
  updateFavButton();
  renderQuickCities();
});

// 24-Hour Chart Metric Tabs
els.metricTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    state.activeMetric = tab.dataset.metric;
    els.metricTabs.forEach((tBtn) => {
      const active = tBtn === tab;
      tBtn.classList.toggle('active', active);
      tBtn.setAttribute('aria-selected', String(active));
    });
    renderHourlySection();
  });
});

// Interactive Sky FX Playground Dock
function setFxMode(mode) {
  const dict = t(state.lang);
  const prev = state.fxMode;
  state.fxMode = mode;
  els.fxPills.querySelectorAll('.fx-pill').forEach((p) => {
    p.classList.toggle('active', p.dataset.fx === mode);
  });
  applySkyAndSound();

  if (mode === 'storm-night' && prev === 'storm-night') {
    skyEngine.triggerManualLightning();
  } else if (mode === 'storm-night') {
    showToast(dict.toastStormSim);
  } else if (mode === 'live') {
    showToast(dict.toastBackLive);
  }
}

els.fxPills.querySelectorAll('.fx-pill').forEach((pill) => {
  pill.addEventListener('click', () => setFxMode(pill.dataset.fx));
});

/* ==========================================================================
   Bootstrapping
   ========================================================================== */
async function bootstrap() {
  applyLanguageStaticUI();
  const mode = loadLocationMode();
  if (mode === 'auto') {
    const detected = await detectAndLoadUserLocation({ userInitiated: false });
    if (!detected) {
      await loadCityWeather(PRESET_CITIES[0], { mode: 'manual' });
    }
  } else {
    await loadCityWeather(state.city, { mode: 'manual' });
  }
  refreshQuickCityTemps();
}

bootstrap();

setInterval(updateLocalCityClock, 1000);
setInterval(() => loadCityWeather(state.city, { silent: true, mode: loadLocationMode() }), 10 * 60 * 1000);
