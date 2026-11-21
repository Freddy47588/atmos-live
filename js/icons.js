/**
 * icons.js
 * Ikon cuaca SVG animasi kustom untuk Hero maupun daftar prakiraan
 */

export function getWeatherIconSvg(iconName, size = 64) {
  const uid = `ic_${iconName}_${Math.random().toString(36).slice(2, 6)}`;

  switch (iconName) {
    case 'clear-day':
      return `
        <svg class="w-icon w-icon-sun" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="${uid}_s" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="65%" stop-color="#facc15"/>
              <stop offset="100%" stop-color="#f97316"/>
            </radialGradient>
          </defs>
          <g class="anim-spin-slow" style="transform-origin:32px 32px">
            <line x1="32" y1="6" x2="32" y2="13" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="32" y1="51" x2="32" y2="58" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="6" y1="32" x2="13" y2="32" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="51" y1="32" x2="58" y2="32" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="13.6" y1="13.6" x2="18.6" y2="18.6" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="45.4" y1="45.4" x2="50.4" y2="50.4" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="50.4" y1="13.6" x2="45.4" y2="18.6" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
            <line x1="18.6" y1="45.4" x2="13.6" y2="50.4" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
          </g>
          <circle cx="32" cy="32" r="13.5" fill="url(#${uid}_s)"/>
        </svg>`;

    case 'clear-night':
      return `
        <svg class="w-icon w-icon-moon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_m" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#93c5fd"/>
            </linearGradient>
          </defs>
          <g class="anim-float-slow">
            <path d="M44.5 39.2A16.5 16.5 0 0 1 24.8 19.5a16.5 16.5 0 1 0 19.7 19.7Z" fill="url(#${uid}_m)"/>
          </g>
          <circle class="anim-twinkle" cx="46" cy="18" r="2.1" fill="#e0f2fe"/>
          <circle class="anim-twinkle-delay" cx="52" cy="28" r="1.4" fill="#bae6fd"/>
          <circle class="anim-twinkle" cx="38" cy="13" r="1.3" fill="#ffffff"/>
        </svg>`;

    case 'partly-cloudy-day':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_sd" x1="26" y1="10" x2="50" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="100%" stop-color="#f97316"/>
            </linearGradient>
            <linearGradient id="${uid}_cd" x1="12" y1="28" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#cbd5e1"/>
            </linearGradient>
          </defs>
          <circle class="anim-pulse-soft" cx="40" cy="23" r="11" fill="url(#${uid}_sd)"/>
          <path class="anim-drift" d="M21 50h24a9.5 9.5 0 0 0 1.4-18.9A13 13 0 0 0 21.5 29a9.5 9.5 0 0 0-.5 21Z" fill="url(#${uid}_cd)"/>
        </svg>`;

    case 'partly-cloudy-night':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_mn" x1="28" y1="10" x2="50" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#93c5fd"/>
            </linearGradient>
            <linearGradient id="${uid}_cn" x1="12" y1="28" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#e2e8f0"/>
              <stop offset="100%" stop-color="#94a3b8"/>
            </linearGradient>
          </defs>
          <path d="M47 28.8A11 11 0 0 1 34.2 16a11 11 0 1 0 12.8 12.8Z" fill="url(#${uid}_mn)"/>
          <path class="anim-drift" d="M21 50h24a9.5 9.5 0 0 0 1.4-18.9A13 13 0 0 0 21.5 29a9.5 9.5 0 0 0-.5 21Z" fill="url(#${uid}_cn)"/>
        </svg>`;

    case 'cloudy':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_c1" x1="12" y1="18" x2="52" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f1f5f9"/>
              <stop offset="100%" stop-color="#94a3b8"/>
            </linearGradient>
          </defs>
          <path d="M26 36h22a7.5 7.5 0 0 0 1.2-14.9A10 10 0 0 0 30 19a7.5 7.5 0 0 0-4 17Z" fill="#cbd5e1" opacity="0.55"/>
          <path class="anim-drift" d="M18 49h27a10 10 0 0 0 1.5-19.8A13.5 13.5 0 0 0 20.4 27.5 10 10 0 0 0 18 49Z" fill="url(#${uid}_c1)"/>
        </svg>`;

    case 'fog':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path class="anim-drift" d="M19 36h26a8.5 8.5 0 0 0 1.2-16.9A11.5 11.5 0 0 0 23.8 18a8.5 8.5 0 0 0-4.8 18Z" fill="#cbd5e1"/>
          <line class="anim-fog-1" x1="14" y1="43" x2="50" y2="43" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
          <line class="anim-fog-2" x1="18" y1="50" x2="46" y2="50" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
        </svg>`;

    case 'drizzle':
    case 'rain':
    case 'heavy-rain':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_rc" x1="14" y1="14" x2="50" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#e2e8f0"/>
              <stop offset="100%" stop-color="#64748b"/>
            </linearGradient>
          </defs>
          <path class="anim-drift" d="M19 39h26a9 9 0 0 0 1.4-17.9A12.5 12.5 0 0 0 22 19.6 9 9 0 0 0 19 39Z" fill="url(#${uid}_rc)"/>
          <line class="anim-drop-1" x1="23" y1="43" x2="20" y2="53" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
          <line class="anim-drop-2" x1="33" y1="43" x2="30" y2="55" stroke="#7dd3fc" stroke-width="2.6" stroke-linecap="round"/>
          <line class="anim-drop-3" x1="43" y1="43" x2="40" y2="53" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
        </svg>`;

    case 'storm':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_sc" x1="14" y1="12" x2="50" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#94a3b8"/>
              <stop offset="100%" stop-color="#334155"/>
            </linearGradient>
          </defs>
          <path class="anim-drift" d="M18 38h28a9 9 0 0 0 1.4-17.9A12.5 12.5 0 0 0 22 18.6 9 9 0 0 0 18 38Z" fill="url(#${uid}_sc)"/>
          <polygon class="anim-flash" points="33,35 24,48 31,48 28,59 41,44 34,44" fill="#fde047"/>
          <line class="anim-drop-1" x1="21" y1="42" x2="18" y2="51" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round"/>
          <line class="anim-drop-3" x1="45" y1="42" x2="42" y2="51" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round"/>
        </svg>`;

    case 'snow':
      return `
        <svg class="w-icon" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${uid}_sn" x1="14" y1="14" x2="50" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#94a3b8"/>
            </linearGradient>
          </defs>
          <path class="anim-drift" d="M19 38h26a9 9 0 0 0 1.4-17.9A12.5 12.5 0 0 0 22 18.6 9 9 0 0 0 19 38Z" fill="url(#${uid}_sn)"/>
          <circle class="anim-snow-1" cx="23" cy="46" r="2.6" fill="#e0f2fe"/>
          <circle class="anim-snow-2" cx="33" cy="51" r="2.8" fill="#ffffff"/>
          <circle class="anim-snow-3" cx="43" cy="46" r="2.5" fill="#bae6fd"/>
        </svg>`;

    default:
      return getWeatherIconSvg('cloudy', size);
  }
}
