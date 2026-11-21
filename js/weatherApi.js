/**
 * weatherApi.js
 * Integrasi data cuaca real-time menggunakan Open-Meteo API (gratis, tanpa API key):
 * - Forecast API (cuaca saat ini, per jam 48 jam, harian 7 hari)
 * - Air Quality API (AQI, PM2.5, PM10, Ozon, NO2)
 * - Geocoding API (pencarian kota seluruh dunia)
 */

import { t } from './i18n.js';

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const AQI_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export const PRESET_CITIES = [
  { name: 'Jakarta', admin1: 'DKI Jakarta', country: 'Indonesia', country_code: 'ID', latitude: -6.2088, longitude: 106.8456 },
  { name: 'Malang', admin1: 'Jawa Timur', country: 'Indonesia', country_code: 'ID', latitude: -7.9797, longitude: 112.6304 },
  { name: 'Denpasar', admin1: 'Bali', country: 'Indonesia', country_code: 'ID', latitude: -8.65, longitude: 115.2167 },
  { name: 'Tokyo', admin1: 'Tokyo', country: 'Japan', country_code: 'JP', latitude: 35.6762, longitude: 139.6503 },
  { name: 'London', admin1: 'England', country: 'United Kingdom', country_code: 'GB', latitude: 51.5072, longitude: -0.1276 },
  { name: 'Reykjavik', admin1: 'Capital Region', country: 'Iceland', country_code: 'IS', latitude: 64.1466, longitude: -21.9426 },
];

/**
 * Mapping WMO Weather Interpretation Codes ke Bahasa Indonesia / English + kategori animasi
 */
export function interpretWmoCode(code, isDay = 1, lang = 'id') {
  const dict = t(lang);
  const textEntry = dict.wmo[code] || dict.wmo[2];
  const label = isDay ? textEntry.day : textEntry.night;
  const short = textEntry.short;

  const sceneMap = {
    0: { scene: 'clear', icon: isDay ? 'clear-day' : 'clear-night', intensity: 0 },
    1: { scene: 'partly-cloudy', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night', intensity: 0.25 },
    2: { scene: 'partly-cloudy', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night', intensity: 0.55 },
    3: { scene: 'overcast', icon: 'cloudy', intensity: 0.9 },
    45: { scene: 'fog', icon: 'fog', intensity: 0.7 },
    48: { scene: 'fog', icon: 'fog', intensity: 1.0 },
    51: { scene: 'rain', icon: 'drizzle', intensity: 0.3 },
    53: { scene: 'rain', icon: 'drizzle', intensity: 0.45 },
    55: { scene: 'rain', icon: 'rain', intensity: 0.6 },
    56: { scene: 'rain', icon: 'drizzle', intensity: 0.4 },
    57: { scene: 'rain', icon: 'rain', intensity: 0.65 },
    61: { scene: 'rain', icon: 'rain', intensity: 0.5 },
    63: { scene: 'rain', icon: 'rain', intensity: 0.75 },
    65: { scene: 'rain', icon: 'heavy-rain', intensity: 1.0 },
    66: { scene: 'rain', icon: 'rain', intensity: 0.6 },
    67: { scene: 'rain', icon: 'heavy-rain', intensity: 0.9 },
    71: { scene: 'snow', icon: 'snow', intensity: 0.45 },
    73: { scene: 'snow', icon: 'snow', intensity: 0.75 },
    75: { scene: 'snow', icon: 'snow', intensity: 1.0 },
    77: { scene: 'snow', icon: 'snow', intensity: 0.55 },
    80: { scene: 'rain', icon: 'rain', intensity: 0.55 },
    81: { scene: 'rain', icon: 'rain', intensity: 0.8 },
    82: { scene: 'rain', icon: 'heavy-rain', intensity: 1.0 },
    85: { scene: 'snow', icon: 'snow', intensity: 0.65 },
    86: { scene: 'snow', icon: 'snow', intensity: 0.95 },
    95: { scene: 'storm', icon: 'storm', intensity: 0.85 },
    96: { scene: 'storm', icon: 'storm', intensity: 0.95 },
    99: { scene: 'storm', icon: 'storm', intensity: 1.0 },
  };
  const base = sceneMap[code] || { scene: 'partly-cloudy', icon: 'cloudy', intensity: 0.5 };
  return { label, short, ...base };
}

/**
 * Cari kota menggunakan Open-Meteo Geocoding API
 */
export async function searchCities(query, signal, lang = 'id') {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(query.trim())}&count=7&language=${lang}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  return (data.results || []).map((item) => ({
    name: item.name,
    admin1: item.admin1 || '',
    country: item.country || '',
    country_code: item.country_code || '',
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}

/**
 * Reverse geocode ringan memakai BigDataCloud free client API untuk GPS user
 */
export async function reverseGeocode(lat, lon, lang = 'id') {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`
    );
    if (!res.ok) throw new Error('Reverse geocode failed');
    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision || (lang === 'en' ? 'Your Location' : 'Lokasi Anda');
    return {
      name: city,
      admin1: data.principalSubdivision || '',
      country: data.countryName || '',
      country_code: data.countryCode || '',
      latitude: lat,
      longitude: lon,
      source: 'gps',
    };
  } catch {
    return {
      name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      admin1: lang === 'en' ? 'GPS Coordinates' : 'Koordinat GPS',
      country: '',
      country_code: '',
      latitude: lat,
      longitude: lon,
      source: 'gps',
    };
  }
}

/**
 * Fallback deteksi lokasi otomatis berbasis IP (jika izin GPS ditolak/tidak tersedia)
 */
export async function detectLocationByIp() {
  const providers = [
    async () => {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (!res.ok) throw new Error('geojs failed');
      const d = await res.json();
      const lat = parseFloat(d.latitude);
      const lon = parseFloat(d.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('invalid coords');
      return {
        name: d.city || d.region || 'Lokasi Anda',
        admin1: d.region || '',
        country: d.country || '',
        country_code: d.country_code || '',
        latitude: lat,
        longitude: lon,
        source: 'ip',
      };
    },
    async () => {
      const res = await fetch('https://ipwho.is/');
      if (!res.ok) throw new Error('ipwho failed');
      const d = await res.json();
      if (!d.success || typeof d.latitude !== 'number') throw new Error('ipwho invalid');
      return {
        name: d.city || d.region || 'Lokasi Anda',
        admin1: d.region || '',
        country: d.country || '',
        country_code: d.country_code || '',
        latitude: d.latitude,
        longitude: d.longitude,
        source: 'ip',
      };
    },
  ];

  for (const run of providers) {
    try {
      return await run();
    } catch {
      // lanjut ke provider berikutnya
    }
  }
  return null;
}

/**
 * Fetch data cuaca lengkap + kualitas udara secara paralel
 */
export async function fetchWeatherBundle(lat, lon) {
  const forecastParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: 'auto',
    forecast_days: '7',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'dew_point_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',
      'uv_index',
      'is_day',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'daylight_duration',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),
  });

  const aqiParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: 'auto',
    current: ['us_aqi', 'european_aqi', 'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'ozone'].join(','),
  });

  const [forecastRes, aqiRes] = await Promise.all([
    fetch(`${FORECAST_ENDPOINT}?${forecastParams}`),
    fetch(`${AQI_ENDPOINT}?${aqiParams}`).catch(() => null),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`Open-Meteo error (${forecastRes.status})`);
  }

  const forecast = await forecastRes.json();
  let aqi = null;
  if (aqiRes && aqiRes.ok) {
    try {
      aqi = await aqiRes.json();
    } catch {
      aqi = null;
    }
  }

  return normalizeWeatherData(forecast, aqi);
}

/**
 * Fetch ringkas untuk bar kota-kota favorit
 */
export async function fetchQuickWeather(cities) {
  if (!cities.length) return [];
  const lats = cities.map((c) => c.latitude.toFixed(4)).join(',');
  const lons = cities.map((c) => c.longitude.toFixed(4)).join(',');
  const url = `${FORECAST_ENDPOINT}?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,is_day&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];
  return list.map((item, idx) => ({
    city: cities[idx],
    temp: item?.current?.temperature_2m ?? null,
    code: item?.current?.weather_code ?? 0,
    isDay: item?.current?.is_day ?? 1,
  }));
}

function normalizeWeatherData(forecast, aqi) {
  const cur = forecast.current;
  const hourly = forecast.hourly;
  const daily = forecast.daily;

  // Cari indeks jam saat ini berdasarkan cur.time (format "YYYY-MM-DDTHH:MM")
  const curHourPrefix = cur.time.slice(0, 13);
  let startIdx = hourly.time.findIndex((t) => t.startsWith(curHourPrefix));
  if (startIdx < 0) startIdx = 0;

  const next24h = [];
  for (let i = startIdx; i < Math.min(startIdx + 24, hourly.time.length); i++) {
    next24h.push({
      time: hourly.time[i],
      hourLabel: i === startIdx ? 'Skrg' : hourly.time[i].slice(11, 16),
      temp: hourly.temperature_2m[i],
      feelsLike: hourly.apparent_temperature[i],
      humidity: hourly.relative_humidity_2m[i],
      dewPoint: hourly.dew_point_2m[i],
      precipProb: hourly.precipitation_probability[i] ?? 0,
      precip: hourly.precipitation[i] ?? 0,
      code: hourly.weather_code[i],
      visibility: hourly.visibility[i] ?? 10000,
      windSpeed: hourly.wind_speed_10m[i],
      windDir: hourly.wind_direction_10m[i],
      uv: hourly.uv_index[i] ?? 0,
      isDay: hourly.is_day[i],
    });
  }

  const days = daily.time.map((dateStr, idx) => ({
    date: dateStr,
    code: daily.weather_code[idx],
    tempMax: daily.temperature_2m_max[idx],
    tempMin: daily.temperature_2m_min[idx],
    sunrise: daily.sunrise[idx],
    sunset: daily.sunset[idx],
    daylightSec: daily.daylight_duration[idx],
    uvMax: daily.uv_index_max[idx] ?? 0,
    precipSum: daily.precipitation_sum[idx] ?? 0,
    precipProbMax: daily.precipitation_probability_max[idx] ?? 0,
    windMax: daily.wind_speed_10m_max[idx] ?? 0,
  }));

  const currentHourMeta = next24h[0] || {};

  // Tentukan fase waktu lokal (dawn, day, golden, dusk, night) berdasarkan sunrise/sunset
  const timePhase = computeTimePhase(cur.time, days[0]?.sunrise, days[0]?.sunset, cur.is_day);

  return {
    fetchedAt: new Date(),
    timezone: forecast.timezone,
    timezoneAbbrev: forecast.timezone_abbreviation,
    utcOffsetSeconds: forecast.utc_offset_seconds,
    elevation: forecast.elevation,
    timePhase,
    current: {
      time: cur.time,
      temp: cur.temperature_2m,
      feelsLike: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      dewPoint: currentHourMeta.dewPoint ?? cur.temperature_2m - 4,
      isDay: cur.is_day,
      precipitation: cur.precipitation,
      code: cur.weather_code,
      cloudCover: cur.cloud_cover,
      pressure: cur.pressure_msl || cur.surface_pressure,
      windSpeed: cur.wind_speed_10m,
      windDir: cur.wind_direction_10m,
      windGusts: cur.wind_gusts_10m,
      uv: currentHourMeta.uv ?? 0,
      visibility: currentHourMeta.visibility ?? 10000,
      precipProb: currentHourMeta.precipProb ?? 0,
      meta: interpretWmoCode(cur.weather_code, cur.is_day),
    },
    hourly: next24h,
    daily: days,
    aqi: aqi?.current
      ? {
          usAqi: aqi.current.us_aqi ?? 0,
          euAqi: aqi.current.european_aqi ?? 0,
          pm25: aqi.current.pm2_5 ?? 0,
          pm10: aqi.current.pm10 ?? 0,
          ozone: aqi.current.ozone ?? 0,
          no2: aqi.current.nitrogen_dioxide ?? 0,
        }
      : null,
  };
}

function parseMinutesOfDay(isoLocal) {
  if (!isoLocal || isoLocal.length < 16) return 720;
  const h = parseInt(isoLocal.slice(11, 13), 10);
  const m = parseInt(isoLocal.slice(14, 16), 10);
  return h * 60 + m;
}

function computeTimePhase(curTime, sunrise, sunset, isDay) {
  const nowMin = parseMinutesOfDay(curTime);
  const riseMin = parseMinutesOfDay(sunrise);
  const setMin = parseMinutesOfDay(sunset);

  if (Math.abs(nowMin - riseMin) <= 45) return 'dawn';
  if (Math.abs(nowMin - setMin) <= 55) return 'golden';
  if (isDay === 0 || nowMin < riseMin - 45 || nowMin > setMin + 55) return 'night';
  return 'day';
}

export function getWindDirectionLabel(deg, lang = 'id') {
  const dirs = t(lang).cardinals8;
  return dirs[Math.round((deg % 360) / 45) % 8];
}

export function getBeaufortLabel(kmh, lang = 'id') {
  const b = t(lang).beaufort;
  if (kmh < 2) return b[0];
  if (kmh < 12) return b[1];
  if (kmh < 20) return b[2];
  if (kmh < 30) return b[3];
  if (kmh < 40) return b[4];
  if (kmh < 62) return b[5];
  return b[6];
}

export function getAqiInfo(usAqi, lang = 'id') {
  const levels = t(lang).aqiLevels;
  return levels.find((l) => usAqi <= l.max) || levels[levels.length - 1];
}

export function getUvInfo(uv, lang = 'id') {
  const levels = t(lang).uvLevels;
  return levels.find((l) => uv < l.max) || levels[levels.length - 1];
}

export function getSmartInsight(current, aqi, lang = 'id') {
  const ins = t(lang).insights;
  const { temp, meta, precipProb, uv, windSpeed, humidity } = current;
  if (meta.scene === 'storm') return ins.storm;
  if (meta.scene === 'rain' || precipProb >= 65) return ins.rain;
  if (meta.scene === 'snow') return ins.snow;
  if (meta.scene === 'fog') return ins.fog;
  if (aqi && aqi.usAqi > 130) return ins.aqi(Math.round(aqi.usAqi));
  if (uv >= 7) return ins.uv(uv.toFixed(1));
  if (temp >= 33) return ins.hot;
  if (temp <= 17) return ins.cold;
  if (windSpeed >= 30) return ins.windy;
  if (humidity >= 85) return ins.humid;
  return ins.good;
}

export function countryCodeToFlag(cc) {
  if (!cc || cc.length !== 2) return '🌍';
  return cc
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}
