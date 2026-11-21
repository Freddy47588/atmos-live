<div align="center">

<img src="./assets/banner.svg" alt="ATMOS — Interactive Real-Time Weather Observatory" width="100%" />

<br />

# ⛅ ATMOS — Interactive Real-Time Weather Observatory

**A modern, zero-dependency interactive weather web app powered by a 60fps HTML5 Canvas sky engine, procedural Web Audio weather ambience, automatic user geolocation, bilingual `ID / EN` support, and 100% live meteorological & air-quality data — no API keys or build step required.**

<p>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111827" alt="JavaScript ES6+" />
  <img src="https://img.shields.io/badge/Canvas_60fps-0EA5E9?style=for-the-badge&logo=canvas&logoColor=white" alt="HTML5 Canvas" />
  <img src="https://img.shields.io/badge/Web_Audio_API-8B5CF6?style=for-the-badge&logo=soundcloud&logoColor=white" alt="Web Audio API" />
  <img src="https://img.shields.io/badge/i18n-EN_%7C_ID-EC4899?style=for-the-badge" alt="Bilingual EN / ID" />
  <img src="https://img.shields.io/badge/Data-Open--Meteo_Live-10B981?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Open-Meteo Live API" />
  <img src="https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge" alt="MIT License" />
</p>

<p>
  <a href="#-key-features">✨ Features</a> •
  <a href="#-sky-animation-engine">🎬 Sky FX</a> •
  <a href="#-real-time-data-sources">🛰️ Live Data</a> •
  <a href="#-getting-started">🚀 Quick Start</a> •
  <a href="./docs/ARCHITECTURE.md">🏗️ Architecture</a>
</p>

</div>

---

## ✨ Key Features

| Icon | Feature | Description |
| :---: | :--- | :--- |
| 📍 | **Automatic Location Detection** | Automatically adapts to the visitor's real location on load via **Browser GPS** with a seamless **IP geolocation fallback**, plus a quick GPS target button (`⌖`) to snap back anytime. |
| 🎨 | **60fps Dynamic Sky Engine** | Full-viewport HTML5 Canvas that smoothly morphs to match both real-time weather conditions and local solar phases (**Dawn, Daylight, Golden Hour, Night**) with pointer parallax. |
| ⛈️ | **Interactive Sky FX Playground** | Test every atmospheric effect live on screen (**Clear, Dusk, Night, Overcast, Rain, Storm, Snow, Fog**) from the floating FX dock, then return to **● Live Real** with one click. |
| 🌐 | **Bilingual Language Toggle (`ID / EN`)** | Instant one-click switching between **English** and **Indonesian** across all labels, WMO weather descriptions, wind cardinals, AQI/UV guidance, dates, and search results, persisted in `localStorage`. |
| 📈 | **Scrubbable 24-Hour Forecast Chart** | Smooth cubic-Bezier SVG curve supporting mouse hover & touch drag scrubbing across **Temperature**, **Rain Probability**, **Wind Speed**, and **UV Index**, bidirectionally synced with hourly cards. |
| 📅 | **Expandable 7-Day Forecast** | Proportional weekly min–max temperature range bars; click any day to reveal full details including sunrise/sunset, max UV, max wind, and total precipitation. |
| 🧭 | **Visual Atmospheric Telemetry** | Animated **Wind Compass**, live parabolic **Sun Trajectory (Sun Arc)**, real-time **Air Quality (US AQI, PM2.5, PM10, O₃)**, **UV Meter**, **Humidity & Dew Point**, and **Barometer & Visibility**. |
| 🔊 | **Procedural Weather Ambience** | Real-time rain, gentle breeze, and synchronized lightning thunder synthesized directly with the **Web Audio API** — zero external audio files. |
| 🔎 | **Global City Search & Favorites** | Instant worldwide city autocomplete with keyboard navigation, pinned favorite cities in `localStorage`, live ticking local city clock, and **`°C / °F`** unit switching. |

---

## 🎬 Sky Animation Engine

`SkyEngine` (`js/skyEngine.js`) renders responsive, DPR-aware atmospheric scenes at 60fps:

- ☀️ **Clear Daylight** — Radiant sunlit gradient, multi-layered solar halo, slowly rotating sunbeams, and drifting light motes.
- 🌇 **Dawn & Golden Hour** — Warm amber-coral twilight skies calculated dynamically from each city's real `sunrise` and `sunset` timestamps.
- 🌙 **Clear Starry Night** — Deep nocturnal indigo sky, depth-layered twinkling stars, softly glowing cratered moon, and occasional shooting stars.
- ☁️ **Partly Cloudy & Overcast** — Volumetric 3-layer drifting clouds whose velocity scales with actual wind speed.
- 🌧️ **Rain & Drizzle** — Wind-angled diagonal rain streaks with animated horizon splash ripples.
- ⛈️ **Thunderstorm** — Heavy storm rain, dense dark rolling clouds, and procedural branching lightning bolts synced with Web Audio thunder. *(Tip: click **Storm** again while active to trigger an instant manual lightning strike!)*
- ❄️ **Snow & 🌫️ Fog** — Sinusoidally swaying snowflakes and undulating translucent mist layers.

---

## 🛰️ Real-Time Data Sources

All weather and air-quality telemetry is **100% live**, CORS-enabled, and requires **zero API keys**:

| Provider | Data & Purpose |
| :--- | :--- |
| ☁️ **Open-Meteo Forecast API** | Current temperature, feels-like, WMO weather codes, humidity, dew point, wind speed/direction/gusts, UV index, visibility, barometric pressure, 24-hour & 7-day forecasts |
| 🍃 **Open-Meteo Air Quality API** | Live US AQI, European AQI, PM2.5, PM10, Ozone (O₃), and NO₂ |
| 🔎 **Open-Meteo Geocoding API** | Worldwide city search with region, country code, and coordinates |
| 📍 **BigDataCloud + GeoJS / ipwho.is** | GPS reverse geocoding & automatic IP-based location fallback |

---

## 🚀 Getting Started

Because ATMOS uses native **ES Modules** (`<script type="module">`), serve it via any local HTTP server (rather than opening via `file://`):

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Freddy47588/atmos-live.git
cd atmos-live
```

### 2️⃣ Start a Local Server
Choose any static server you have installed:

```bash
# Using Node.js (npx)
npx serve .

# Or using Python 3
python -m http.server 8080
```

### 3️⃣ Open in Browser
Visit `http://localhost:3000` (with `npx serve`) or `http://localhost:8080` (with Python).

---

## ⌨️ Controls & Interactions

| Action / Control | Behavior |
| :--- | :--- |
| `↓` / `↑` in search input | Navigate city search results |
| `Enter` / `Esc` | Select highlighted city / close search dropdown |
| 🌐 **`ID / EN` Button** | Toggle UI language between English and Indonesian |
| 🌡️ **`°C / °F` Button** | Switch temperature (`°C` / `°F`) and wind (`km/h` / `m/s`) units |
| 🎯 **Hover / Drag 24h Chart** | Scrub hour-by-hour weather metrics in real time |
| ⭐ **Star Button** | Pin or unpin the current city in the quick-access bar |
| 📍 **GPS Button (`⌖`)** | Re-detect and return to your current location |
| 🔊 **Sound Button** | Toggle procedural Web Audio atmospheric soundscape |
| ⛈️ **Click Storm Again** | Trigger an immediate manual lightning strike + thunder |

---

## 🌐 Free Static Deployment

With zero build step or backend dependencies, **ATMOS** deploys effortlessly to:
- **GitHub Pages** — *Settings → Pages → Deploy from `main` branch (`/root`)*.
- **Netlify / Vercel / Cloudflare Pages** — Connect the repository with no build command and publish directory `.`.

---

## 📚 Technical Documentation

Want a deep dive into the module dependency graph, `SkyEngine` rendering pipeline, `i18n` localization layer, and Web Audio synthesis?
👉 Read **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**

---

## 📄 License

Released under the **[MIT License](./LICENSE)**. Feel free to use, modify, and build upon it.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Freddy47588">Freddy47588</a> · Weather data by <a href="https://open-meteo.com/">Open-Meteo</a></sub>
</div>
