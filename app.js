"use strict";

/* =========================================================
   UFUQ — Weather application
   Data: Open-Meteo Forecast, Geocoding and Air Quality APIs
   Map: Leaflet + Carto
   ========================================================= */

const CONFIG = {
  defaultLocation: {
    name: "Chunian",
    admin1: "Punjab",
    country: "Pakistan",
    latitude: 30.9636,
    longitude: 73.9803
  },
  forecastUrl: "https://api.open-meteo.com/v1/forecast",
  geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
  reverseUrl: "https://nominatim.openstreetmap.org/reverse",
  searchUrl: "https://nominatim.openstreetmap.org/search",
  airUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
  refreshInterval: 10 * 60 * 1000,
  hourlyAlertInterval: 60 * 60 * 1000
};

const ALERT_STORAGE_KEY = "ufuq-hourly-alert-location";
const ALERT_ENABLED_KEY = "ufuq-hourly-alerts-enabled";
const ALERT_CACHE_NAME = "ufuq-v2-alerts";
const ALERT_META_URL = "./__ufuq_alert_location__";
const ALERT_DB_NAME = "ufuq-alert-db";
const ALERT_DB_STORE = "alert-config";

const WALLPAPERS = {
  clearDay: [
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=90"
  ],
  clearNight: [
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2400&q=90"
  ],
  cloudy: [
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1483977399921-6cf94f6fdc3a?auto=format&fit=crop&w=2400&q=90"
  ],
  fog: [
    "https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=2400&q=90"
  ],
  rain: [
    "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1501691223387-dd0500403074?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1438449805896-28a666819a20?auto=format&fit=crop&w=2400&q=90"
  ],
  storm: [
    "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1527489377706-5bf97e608852?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=2400&q=90"
  ],
  snow: [
    "https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1457269449834-928af64c684d?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=2400&q=90",
    "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=2400&q=90"
  ]
};

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail"
};

const AQI_LEVELS = [
  { max: 50, label: "Good", color: "#65c98c", advice: "Air quality is satisfactory. Outdoor activities are generally suitable." },
  { max: 100, label: "Moderate", color: "#f5d45c", advice: "Air quality is acceptable. Unusually sensitive people may wish to take care." },
  { max: 150, label: "Unhealthy for sensitive groups", color: "#f3a65c", advice: "Sensitive groups should consider reducing prolonged outdoor exertion." },
  { max: 200, label: "Unhealthy", color: "#ec7777", advice: "Some people may experience health effects. Consider reducing outdoor exertion." },
  { max: 300, label: "Very unhealthy", color: "#b18ce8", advice: "Health alert: consider limiting prolonged outdoor activities." },
  { max: Infinity, label: "Hazardous", color: "#a75d6d", advice: "Health warning: avoid prolonged outdoor exertion and follow local guidance." }
];

const state = {
  location: null,
  weather: null,
  air: null,
  unit: "C",
  selectedDay: 0,
  selectedHour: null,
  hourlyDate: null,
  wallpaperCategory: null,
  wallpaperIndexes: {},
  wallpaperLayer: 0,
  map: null,
  mapMarker: null,
  mapSelection: null,
  installPrompt: null,
  alertsEnabled: false,
  hourlyAlertTimer: null,
  searchTimer: null,
  toastTimer: null,
  refreshTimer: null,
  requestId: 0,
  introFinished: false
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  wallpaperBack: $("#wallpaperBack"),
  wallpaperFront: $("#wallpaperFront"),
  atmosphereCanvas: $("#atmosphereCanvas"),
  introCanvas: $("#introCanvas"),
  introOverlay: $("#introOverlay"),
  introBrand: $("#introBrand"),
  introProgress: $("#introProgress"),
  locationSearch: $("#locationSearch"),
  searchForm: $("#searchForm"),
  suggestions: $("#suggestions"),
  alertBellButton: $("#alertBellButton"),
  locationName: $("#locationName"),
  locationDetails: $("#locationDetails"),
  heroTemperature: $("#heroTemperature"),
  heroUnit: $("#heroUnit"),
  heroFeels: $("#heroFeels"),
  heroCondition: $("#heroCondition"),
  heroWeatherIcon: $("#heroWeatherIcon"),
  heroWind: $("#heroWind"),
  heroHumidity: $("#heroHumidity"),
  heroVisibility: $("#heroVisibility"),
  weatherSummary: $("#weatherSummary"),
  updatedTime: $("#updatedTime"),
  localClock: $("#localClock"),
  hourlyStrip: $("#hourlyStrip"),
  selectedDayLabel: $("#selectedDayLabel"),
  weeklyList: $("#weeklyList"),
  sunriseTime: $("#sunriseTime"),
  sunsetTime: $("#sunsetTime"),
  daylightDuration: $("#daylightDuration"),
  uvIndex: $("#uvIndex"),
  dayVisibility: $("#dayVisibility"),
  pressureValue: $("#pressureValue"),
  precipitationValue: $("#precipitationValue"),
  cloudValue: $("#cloudValue"),
  windDirection: $("#windDirection"),
  aqiValue: $("#aqiValue"),
  aqiStatus: $("#aqiStatus"),
  aqiAdvice: $("#aqiAdvice"),
  aqiRing: $("#aqiRing"),
  aqiUpdated: $("#aqiUpdated"),
  pm25Value: $("#pm25Value"),
  pm10Value: $("#pm10Value"),
  airUvValue: $("#airUvValue"),
  footerCoordinates: $("#footerCoordinates"),
  savedMenu: $("#savedMenu"),
  savedList: $("#savedList"),
  toast: $("#toast"),
  mapModal: $("#mapModal"),
  installModal: $("#installModal"),
  mapSearchInput: $("#mapSearchInput"),
  installGuideText: $("#installGuideText"),
  installSteps: $("#installSteps"),
  installConfirmButton: $("#installConfirmButton")
};

/* ---------------------------------------------------------
   SVG weather icon system
   --------------------------------------------------------- */

function weatherIcon(code, isDay = true, size = 64) {
  const common = `viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;

  const sun = `
    <circle cx="32" cy="31" r="10"/>
    <path d="M32 5v8m0 36v8M6 31h8m36 0h8M13.6 12.6l5.7 5.7m25.4 25.4 5.7 5.7m0-36.8-5.7 5.7M19.3 43.7l-5.7 5.7"/>
  `;

  const moon = `
    <path d="M43 40.5A21 21 0 0 1 23.5 7.8 21 21 0 1 0 43 40.5Z"/>
    <path d="M47 11v7m-3.5-3.5h7"/>
  `;

  const cloud = `
    <path d="M17 45h29a11 11 0 0 0 .5-22A16 16 0 0 0 16 25a10 10 0 0 0 1 20Z"/>
  `;

  const rain = `
    <path d="M17 38h29a11 11 0 0 0 .5-22A16 16 0 0 0 16 18a10 10 0 0 0 1 20Z"/>
    <path d="m22 45-4 9m17-9-4 9m17-9-4 9"/>
  `;

  const snow = `
    <path d="M17 34h29a11 11 0 0 0 .5-22A16 16 0 0 0 16 14a10 10 0 0 0 1 20Z"/>
    <path d="M22 42v12m-5-9 10 6m0-6-10 6m24-9v12m-5-9 10 6m0-6-10 6"/>
  `;

  const storm = `
    <path d="M17 36h29a11 11 0 0 0 .5-22A16 16 0 0 0 16 16a10 10 0 0 0 1 20Z"/>
    <path d="m34 37-10 14h9l-3 10 14-17h-10l5-7"/>
  `;

  const fog = `
    <path d="M17 29h29a11 11 0 0 0 .5-22A16 16 0 0 0 16 9a10 10 0 0 0 1 20Z"/>
    <path d="M8 39h48M13 47h38M19 55h26"/>
  `;

  let artwork;

  if ([95, 96, 99].includes(code)) {
    artwork = storm;
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    artwork = snow;
  } else if ([45, 48].includes(code)) {
    artwork = fog;
  } else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    artwork = rain;
  } else if (code === 2) {
    artwork = `${sun}<path d="M17 48h29a10 10 0 0 0 0-20"/>`;
  } else if (code === 3) {
    artwork = cloud;
  } else if (code === 1) {
    artwork = isDay ? sun : moon;
  } else if (code === 0) {
    artwork = isDay ? sun : moon;
  } else {
    artwork = cloud;
  }

  return `<svg ${common} aria-hidden="true">${artwork}</svg>`;
}

/* ---------------------------------------------------------
   Date, number and formatting helpers
   --------------------------------------------------------- */

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function convertTemperature(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "--";
  }

  const celsius = Number(value);
  return state.unit === "F"
    ? Math.round((celsius * 9 / 5) + 32)
    : Math.round(celsius);
}

function temperatureText(value) {
  const converted = convertTemperature(value);
  return converted === "--" ? "--°" : `${converted}°`;
}

function formatTime(dateString) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatHour(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric"
  }).format(date);
}

function formatDay(dateString, index = 0) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatLongDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatWindDirection(degrees) {
  if (!Number.isFinite(Number(degrees))) return "--";

  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];

  return directions[Math.round(Number(degrees) / 22.5) % 16];
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return "--";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

function weatherDescription(code) {
  return WEATHER_CODES[code] || "Variable conditions";
}

function isDaylight(hour) {
  return Number(hour?.is_day ?? 1) === 1;
}

function getWeatherCategory(code, isDay) {
  if ([95, 96, 99].includes(code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if (code === 0 || code === 1) return isDay ? "clearDay" : "clearNight";
  if (code === 2 || code === 3) return "cloudy";
  return isDay ? "clearDay" : "clearNight";
}

function currentWeatherHour() {
  if (!state.weather?.hourly?.time?.length) return 0;

  const times = state.weather.hourly.time;
  const current = state.weather.current?.time;

  if (current) {
    let nearest = 0;
    let bestDistance = Infinity;

    times.forEach((time, index) => {
      const distance = Math.abs(new Date(time) - new Date(current));
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });

    return nearest;
  }

  return 0;
}

function hourlyIndexForDate(dateString) {
  const times = state.weather?.hourly?.time || [];

  return times
    .map((time, index) => ({ time, index }))
    .filter(item => item.time.startsWith(dateString))
    .map(item => item.index);
}

/* ---------------------------------------------------------
   Wallpaper system
   --------------------------------------------------------- */

function preloadImage(url) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function chooseWallpaper(category, forceDifferent = false) {
  const pool = WALLPAPERS[category] || WALLPAPERS.clearDay;
  let index = state.wallpaperIndexes[category] ?? -1;

  if (forceDifferent || state.wallpaperCategory !== category) {
    if (pool.length > 1) {
      let next = Math.floor(Math.random() * pool.length);

      if (next === index) {
        next = (next + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
      }

      index = next;
    } else {
      index = 0;
    }
  }

  state.wallpaperIndexes[category] = index;
  state.wallpaperCategory = category;

  return pool[index];
}

async function setWallpaper(category, forceDifferent = false) {
  const url = chooseWallpaper(category, forceDifferent);
  const loaded = await preloadImage(url);

  if (!loaded) {
    showToast("Scenery could not be loaded. Keeping the current view.");
    return;
  }

  const front = elements.wallpaperFront;
  const back = elements.wallpaperBack;

  const active = state.wallpaperLayer === 0 ? front : back;
  const inactive = state.wallpaperLayer === 0 ? back : front;

  inactive.style.backgroundImage = `url("${loaded}")`;
  inactive.style.opacity = "0";
  inactive.style.transform = "scale(1.025)";

  requestAnimationFrame(() => {
    inactive.style.opacity = "1";
    active.style.opacity = "0";
    inactive.style.animation = "kenBurns 20s ease-in-out infinite alternate";
    active.style.animation = "none";
  });

  state.wallpaperLayer = state.wallpaperLayer === 0 ? 1 : 0;
}

/* ---------------------------------------------------------
   Weather API
   --------------------------------------------------------- */

function forecastUrl(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m"
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "visibility",
      "uv_index",
      "is_day",
      "cloud_cover"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "sunshine_duration"
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    models: "best_match"
  });

  return `${CONFIG.forecastUrl}?${params.toString()}`;
}

async function fetchWeather(location) {
  const request = ++state.requestId;

  showToast(`Loading weather for ${location.name}...`);

  try {
    const response = await fetch(forecastUrl(location), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Weather service returned ${response.status}`);
    }

    const data = await response.json();

    if (request !== state.requestId) return;

    if (!data.current || !data.hourly || !data.daily) {
      throw new Error("Weather data is incomplete.");
    }

    state.location = location;
    state.weather = data;
    state.selectedDay = 0;
    state.selectedHour = null;
    state.hourlyDate = data.daily.time[0];

    renderWeather();
    await setWallpaper(
      getWeatherCategory(data.current.weather_code, data.current.is_day === 1),
      true
    );

    if (state.alertsEnabled) {
      await persistAlertLocation(location);
    }

    loadAirQuality(location);
    updateClock();
    showToast(`Weather updated for ${location.name}.`);
  } catch (error) {
    console.error("Weather request failed:", error);
    showToast("Unable to load weather. Check your connection and try again.");
  }
}

async function loadAirQuality(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    hourly: "us_aqi,pm2_5,pm10,uv_index",
    timezone: "auto",
    forecast_days: "2"
  });

  try {
    const response = await fetch(`${CONFIG.airUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Air quality service unavailable");
    }

    const data = await response.json();
    state.air = data;
    renderAirQuality();
  } catch (error) {
    console.warn("Air quality request failed:", error);
    elements.aqiStatus.textContent = "Air quality unavailable";
    elements.aqiAdvice.textContent = "Air quality data could not be retrieved right now.";
    elements.aqiValue.textContent = "--";
  }
}

/* ---------------------------------------------------------
   Main weather rendering
   --------------------------------------------------------- */

function getSelectedWeather() {
  if (!state.weather) return null;

  const hourly = state.weather.hourly;
  const day = state.selectedDay;
  const date = state.weather.daily.time[day];

  if (!date) return null;

  let index = state.selectedHour;

  if (index === null || !hourly.time[index] || !hourly.time[index].startsWith(date)) {
    const indexes = hourlyIndexForDate(date);

    if (!indexes.length) return null;

    index = indexes[0];

    if (day === 0) {
      const currentIndex = currentWeatherHour();
      if (hourly.time[currentIndex]?.startsWith(date)) {
        index = currentIndex;
      }
    }

    state.selectedHour = index;
  }

  const at = key => hourly[key]?.[index];

  return {
    time: hourly.time[index],
    temperature: at("temperature_2m"),
    feels: at("apparent_temperature"),
    humidity: at("relative_humidity_2m"),
    code: at("weather_code"),
    wind: at("wind_speed_10m"),
    windDirection: at("wind_direction_10m"),
    visibility: at("visibility"),
    precipitation: at("precipitation"),
    cloud: at("cloud_cover"),
    uv: at("uv_index"),
    isDay: at("is_day"),
    pressure: state.weather.current.pressure_msl
  };
}

function renderWeather() {
  if (!state.weather || !state.location) return;

  const current = state.weather.current;
  const selected = getSelectedWeather();

  if (!selected) return;

  const isCurrentHour = state.selectedDay === 0 &&
    Math.abs(new Date(selected.time) - new Date(current.time)) < 60 * 60 * 1000;

  const currentData = isCurrentHour ? current : selected;

  elements.locationName.textContent = state.location.name;
  elements.locationDetails.textContent = buildLocationDetails(state.location);

  elements.heroTemperature.classList.add("updating");

  requestAnimationFrame(() => {
    elements.heroTemperature.textContent = convertTemperature(currentData.temperature_2m ?? currentData.temperature);
    elements.heroUnit.textContent = `°${state.unit}`;
    elements.heroFeels.textContent = temperatureText(currentData.apparent_temperature ?? currentData.feels);
    elements.heroCondition.textContent = weatherDescription(currentData.weather_code ?? currentData.code);

    elements.heroTemperature.classList.remove("updating");
  });

  const code = currentData.weather_code ?? currentData.code;
  const day = Number(currentData.is_day ?? 1) === 1;

  elements.heroWeatherIcon.innerHTML = weatherIcon(code, day, 76);
  elements.heroWind.textContent = `${Math.round(currentData.wind_speed_10m ?? currentData.wind ?? 0)} km/h`;
  elements.heroHumidity.textContent = `${Math.round(currentData.relative_humidity_2m ?? currentData.humidity ?? 0)}%`;

  const visibility = currentData.visibility ?? selected.visibility;
  elements.heroVisibility.textContent = Number.isFinite(Number(visibility))
    ? `${(Number(visibility) / 1000).toFixed(1)} km`
    : "-- km";

  elements.weatherSummary.textContent = createWeatherSummary(currentData);
  elements.updatedTime.textContent = `OBSERVATION ${formatTime(current.time).toUpperCase()}`;

  elements.selectedDayLabel.textContent = formatLongDate(state.weather.daily.time[state.selectedDay]);

  renderHourly();
  renderWeekly();
  renderSunDetails();
  renderExtraDetails(currentData);

  const category = getWeatherCategory(code, day);
  if (category !== state.wallpaperCategory) {
    setWallpaper(category, true);
  }

  updateAtmosphere(category);
  updateClock();
}

function createWeatherSummary(data) {
  const code = data.weather_code ?? data.code;
  const temperature = convertTemperature(data.temperature_2m ?? data.temperature);
  const rain = Number(data.precipitation ?? 0);

  if (rain > 0) {
    return `Rainfall of ${rain.toFixed(1)} mm is expected around this hour.`;
  }

  if ([95, 96, 99].includes(code)) {
    return "Thunderstorm conditions are reported in this forecast period.";
  }

  if ([45, 48].includes(code)) {
    return "Mist and reduced visibility may affect the local landscape.";
  }

  if (code === 0 || code === 1) {
    return `Clear conditions with a temperature near ${temperature}°${state.unit}.`;
  }

  return `${weatherDescription(code)} with a temperature near ${temperature}°${state.unit}.`;
}

function buildLocationDetails(location) {
  return [
    location.admin2,
    location.admin1,
    location.country
  ].filter(Boolean).join(", ");
}

function renderHourly() {
  const data = state.weather.hourly;
  const date = state.weather.daily.time[state.selectedDay];
  const indexes = hourlyIndexForDate(date);

  if (!indexes.length) {
    elements.hourlyStrip.innerHTML = '<div class="loading-line">No hourly data available.</div>';
    return;
  }

  const visibleIndexes = indexes.filter(index => {
    const hour = Number(data.time[index].slice(11, 13));
    return hour >= 0 && hour <= 23;
  });

  elements.hourlyStrip.innerHTML = visibleIndexes.map(index => {
    const active = index === state.selectedHour;
    const code = data.weather_code[index];
    const day = data.is_day[index] === 1;
    const temperature = temperatureText(data.temperature_2m[index]);
    const feels = temperatureText(data.apparent_temperature[index]);

    return `
      <button class="hour-card ${active ? "active" : ""}" type="button" data-hour-index="${index}" aria-pressed="${active}">
        <span class="hour-time">${formatHour(data.time[index])}</span>
        <span class="hour-icon">${weatherIcon(code, day, 28)}</span>
        <strong class="hour-temperature">${temperature}</strong>
        <span class="hour-feels">Feels ${feels}</span>
      </button>
    `;
  }).join("");

  elements.hourlyStrip.querySelectorAll("[data-hour-index]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedHour = Number(button.dataset.hourIndex);
      renderWeather();
      setWallpaperForSelectedHour();
    });
  });

  const activeCard = elements.hourlyStrip.querySelector(".hour-card.active");

  if (activeCard && state.selectedDay === 0) {
    activeCard.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }
}

function renderWeekly() {
  const daily = state.weather.daily;
  const currentDate = daily.time[state.selectedDay];

  elements.weeklyList.innerHTML = daily.time.map((date, index) => {
    const code = daily.weather_code[index];
    const isSelected = date === currentDate;
    const dayMax = temperatureText(daily.temperature_2m_max[index]);
    const dayMin = temperatureText(daily.temperature_2m_min[index]);

    return `
      <div class="weekly-row ${isSelected ? "selected" : ""}" data-day-index="${index}" role="button" tabindex="0" aria-label="Show forecast for ${formatDay(date, index)}">
        <strong class="weekly-day">${formatDay(date, index)}</strong>
        <span class="weekly-weather-icon">${weatherIcon(code, true, 27)}</span>
        <span class="weekly-condition">${weatherDescription(code)}</span>
        <span class="weekly-temperatures"><span>${dayMax}</span><span>${dayMin}</span></span>
      </div>
    `;
  }).join("");

  elements.weeklyList.querySelectorAll("[data-day-index]").forEach(row => {
    const selectDay = () => {
      state.selectedDay = Number(row.dataset.dayIndex);
      state.selectedHour = null;
      renderWeather();
      setWallpaperForSelectedHour();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    row.addEventListener("click", selectDay);
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectDay();
      }
    });
  });
}

function renderSunDetails() {
  const daily = state.weather.daily;
  const index = state.selectedDay;

  const sunrise = daily.sunrise[index];
  const sunset = daily.sunset[index];

  elements.sunriseTime.textContent = formatTime(sunrise);
  elements.sunsetTime.textContent = formatTime(sunset);
  elements.uvIndex.textContent = Number(daily.uv_index_max[index] ?? 0).toFixed(1);

  const sunriseDate = new Date(sunrise);
  const sunsetDate = new Date(sunset);

  if (!Number.isNaN(sunriseDate.getTime()) && !Number.isNaN(sunsetDate.getTime())) {
    const duration = (sunsetDate - sunriseDate) / 1000;
    elements.daylightDuration.textContent = formatDuration(duration);
  }

  const dailyHours = hourlyIndexForDate(daily.time[index]);
  const visibilityValues = dailyHours
    .map(hour => state.weather.hourly.visibility[hour])
    .filter(value => Number.isFinite(Number(value)));

  if (visibilityValues.length) {
    const average = visibilityValues.reduce((sum, value) => sum + Number(value), 0) / visibilityValues.length;
    elements.dayVisibility.textContent = `${(average / 1000).toFixed(1)} km`;
  }

  updateSunArc(sunrise, sunset);
}

function updateSunArc(sunrise, sunset) {
  const orb = $("#sunArcOrb");
  const progress = $("#sunArcProgress");

  const start = new Date(sunrise).getTime();
  const end = new Date(sunset).getTime();
  const now = state.selectedDay === 0
    ? Date.now()
    : new Date(`${state.weather.daily.time[state.selectedDay]}T12:00:00`).getTime();

  const fraction = Math.max(0, Math.min(1, (now - start) / (end - start || 1)));
  const angle = Math.PI + fraction * Math.PI;
  const x = 160 + 138 * Math.cos(angle);
  const y = 108 + 92 * Math.sin(angle);

  orb.setAttribute("cx", x.toFixed(2));
  orb.setAttribute("cy", y.toFixed(2));

  const length = 434 * fraction;
  progress.style.strokeDasharray = `${length} 500`;
}

function renderExtraDetails(data) {
  elements.pressureValue.textContent = `${Math.round(data.pressure ?? 0)} hPa`;
  elements.precipitationValue.textContent = `${Number(data.precipitation ?? 0).toFixed(1)} mm`;
  elements.cloudValue.textContent = `${Math.round(data.cloud ?? 0)}%`;
  elements.windDirection.textContent = formatWindDirection(data.windDirection);
}

function setWallpaperForSelectedHour() {
  const selected = getSelectedWeather();
  if (!selected) return;

  const category = getWeatherCategory(selected.code, Number(selected.isDay) === 1);

  setWallpaper(category, true);
  updateAtmosphere(category);
}

/* ---------------------------------------------------------
   Air quality rendering
   --------------------------------------------------------- */

function renderAirQuality() {
  if (!state.air?.hourly?.time?.length) return;

  const hourly = state.air.hourly;
  const now = state.weather?.current?.time || new Date().toISOString();

  let nearestIndex = 0;
  let nearestDistance = Infinity;

  hourly.time.forEach((time, index) => {
    const distance = Math.abs(new Date(time) - new Date(now));

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  const aqi = Number(hourly.us_aqi?.[nearestIndex]);
  const pm25 = Number(hourly.pm2_5?.[nearestIndex]);
  const pm10 = Number(hourly.pm10?.[nearestIndex]);
  const uv = Number(hourly.uv_index?.[nearestIndex]);

  if (!Number.isFinite(aqi)) {
    elements.aqiStatus.textContent = "AQI unavailable";
    elements.aqiValue.textContent = "--";
    return;
  }

  const level = AQI_LEVELS.find(item => aqi <= item.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
  const angle = Math.min(360, Math.max(0, aqi / 300 * 360));

  elements.aqiValue.textContent = Math.round(aqi);
  elements.aqiStatus.textContent = level.label;
  elements.aqiAdvice.textContent = level.advice;
  elements.aqiRing.style.background = `conic-gradient(${level.color} ${angle}deg, rgba(255,255,255,.13) ${angle}deg)`;

  elements.pm25Value.textContent = Number.isFinite(pm25) ? `${pm25.toFixed(1)} µg/m³` : "-- µg/m³";
  elements.pm10Value.textContent = Number.isFinite(pm10) ? `${pm10.toFixed(1)} µg/m³` : "-- µg/m³";
  elements.airUvValue.textContent = Number.isFinite(uv) ? uv.toFixed(1) : "--";
  elements.aqiUpdated.textContent = `UPDATED ${formatTime(hourly.time[nearestIndex])}`;
}

/* ---------------------------------------------------------
   Location search and reverse geocoding
   --------------------------------------------------------- */

function searchLocations(query) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    elements.suggestions.classList.remove("visible");
    return;
  }

  clearTimeout(state.searchTimer);

  state.searchTimer = setTimeout(async () => {
    try {
      const params = new URLSearchParams({
        name: cleanQuery,
        count: "8",
        language: "en",
        format: "json"
      });

      const [geoResponse, nominatimResponse] = await Promise.allSettled([
        fetch(`${CONFIG.geocodingUrl}?${params.toString()}`),
        fetch(`${CONFIG.searchUrl}?${new URLSearchParams({
          q: cleanQuery,
          format: "jsonv2",
          addressdetails: "1",
          limit: "5"
        }).toString()}`, {
          headers: { "Accept": "application/json" }
        })
      ]);

      let results = [];

      if (geoResponse.status === "fulfilled" && geoResponse.value.ok) {
        const geo = await geoResponse.value.json();

        results = (geo.results || []).map(item => ({
          name: item.name,
          admin1: item.admin1 || "",
          admin2: item.admin2 || "",
          country: item.country || "",
          latitude: item.latitude,
          longitude: item.longitude,
          source: "open-meteo"
        }));
      }

      if (nominatimResponse.status === "fulfilled" && nominatimResponse.value.ok) {
        const nominatim = await nominatimResponse.value.json();

        const extra = nominatim.map(item => {
          const address = item.address || {};

          return {
            name: address.village || address.town || address.city || address.hamlet || address.suburb || item.name || cleanQuery,
            admin1: address.state || address.province || "",
            admin2: address.county || address.district || "",
            country: address.country || "",
            latitude: Number(item.lat),
            longitude: Number(item.lon),
            source: "nominatim"
          };
        });

        results = mergeLocations(results, extra);
      }

      renderSuggestions(results.slice(0, 9));
    } catch (error) {
      console.warn("Location search failed:", error);
      renderSuggestions([]);
    }
  }, 280);
}

function mergeLocations(primary, secondary) {
  const merged = [...primary];

  for (const item of secondary) {
    const exists = merged.some(existing =>
      existing.name.toLowerCase() === item.name.toLowerCase() &&
      Math.abs(existing.latitude - item.latitude) < .01 &&
      Math.abs(existing.longitude - item.longitude) < .01
    );

    if (!exists) merged.push(item);
  }

  return merged;
}

function renderSuggestions(results) {
  if (!results.length) {
    elements.suggestions.innerHTML = `
      <div class="suggestion-item">
        <div class="suggestion-copy"><strong>No matching locations found</strong><small>Try another village, town or city.</small></div>
      </div>
    `;
    elements.suggestions.classList.add("visible");
    return;
  }

  elements.suggestions.innerHTML = results.map((item, index) => `
    <button class="suggestion-item" type="button" data-suggestion-index="${index}">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>
        <circle cx="12" cy="10" r="2.5"/>
      </svg>
      <span class="suggestion-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(buildLocationDetails(item))}</small>
      </span>
    </button>
  `).join("");

  elements.suggestions.querySelectorAll("[data-suggestion-index]").forEach(button => {
    button.addEventListener("click", () => {
      const location = results[Number(button.dataset.suggestionIndex)];
      selectLocation(location);
      elements.suggestions.classList.remove("visible");
      elements.locationSearch.value = "";
    });
  });

  elements.suggestions.classList.add("visible");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

async function reverseGeocode(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      lat: latitude,
      lon: longitude,
      format: "jsonv2",
      zoom: "16",
      addressdetails: "1"
    });

    const response = await fetch(`${CONFIG.reverseUrl}?${params.toString()}`, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) throw new Error("Reverse geocoding failed");

    const data = await response.json();
    const address = data.address || {};

    return {
      name: address.village ||
        address.town ||
        address.city ||
        address.hamlet ||
        address.suburb ||
        address.neighbourhood ||
        address.county ||
        "Selected location",
      admin1: address.state || address.province || "",
      admin2: address.county || address.district || "",
      country: address.country || "",
      latitude,
      longitude
    };
  } catch (error) {
    console.warn("Reverse geocoding failed:", error);

    return {
      name: "Selected location",
      admin1: "",
      admin2: "",
      country: "",
      latitude,
      longitude
    };
  }
}

async function selectLocation(location) {
  if (!Number.isFinite(Number(location.latitude)) ||
      !Number.isFinite(Number(location.longitude))) {
    showToast("This location does not have valid coordinates.");
    return;
  }

  const normalized = {
    ...location,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude)
  };

  await fetchWeather(normalized);

  elements.locationSearch.value = "";
  elements.suggestions.classList.remove("visible");
  elements.savedMenu.classList.remove("visible");
}

/* ---------------------------------------------------------
   GPS location
   --------------------------------------------------------- */

function useGPS() {
  if (!navigator.geolocation) {
    showToast("Location detection is not supported by this browser.");
    return;
  }

  showToast("Requesting your location...");

  navigator.geolocation.getCurrentPosition(
    async position => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const location = await reverseGeocode(latitude, longitude);

      await selectLocation(location);
      showToast("Your current location has been detected.");
    },
    error => {
      let message = "Unable to detect your location.";

      if (error.code === error.PERMISSION_DENIED) {
        message = "Location permission was denied. Enable it in your browser settings.";
      } else if (error.code === error.TIMEOUT) {
        message = "Location request timed out. Try again.";
      }

      showToast(message);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    }
  );
}

/* ---------------------------------------------------------
   Leaflet map
   --------------------------------------------------------- */

function openMap() {
  elements.mapModal.classList.add("visible");
  elements.mapModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (!state.map) {
    initializeMap();
  } else {
    setTimeout(() => state.map.invalidateSize(), 150);
  }
}

function closeModal(modal) {
  modal.classList.remove("visible");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal-backdrop.visible")) {
    document.body.style.overflow = "";
  }
}

function initializeMap() {
  if (typeof L === "undefined") {
    showToast("Map library could not be loaded. Check your internet connection.");
    return;
  }

  const start = state.location || CONFIG.defaultLocation;

  state.map = L.map("leafletMap", {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([start.latitude, start.longitude], 10);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20
    }
  ).addTo(state.map);

  state.map.on("click", async event => {
    const { lat, lng } = event.latlng;

    state.mapSelection = {
      latitude: lat,
      longitude: lng
    };

    updateMapMarker(lat, lng);
    showToast("Map point selected. Confirm to load its weather.");
  });

  updateMapMarker(start.latitude, start.longitude);
  state.mapSelection = {
    latitude: start.latitude,
    longitude: start.longitude
  };

  setTimeout(() => state.map.invalidateSize(), 200);
}

function updateMapMarker(latitude, longitude) {
  if (!state.map) return;

  const pinIcon = L.divIcon({
    className: "ufuQ-map-pin",
    html: `
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" aria-hidden="true">
        <path d="M16 2C8.3 2 2 8.3 2 16c0 10 14 24 14 24s14-14 14-24C30 8.3 23.7 2 16 2Z" fill="#F5B94C" stroke="#FFF0C8" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="5" fill="#172333" stroke="#FFF0C8" stroke-width="1.5"/>
      </svg>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 40]
  });

  if (state.mapMarker) {
    state.map.removeLayer(state.mapMarker);
  }

  state.mapMarker = L.marker([latitude, longitude], {
    icon: pinIcon
  }).addTo(state.map);

  state.mapMarker.bindPopup(
    `<strong>${latitude.toFixed(5)}, ${longitude.toFixed(5)}</strong>`
  ).openPopup();
}

async function searchMapLocation() {
  const query = elements.mapSearchInput.value.trim();

  if (!query) return;

  try {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1"
    });

    const response = await fetch(`${CONFIG.searchUrl}?${params.toString()}`);
    if (!response.ok) throw new Error("Map search failed");

    const results = await response.json();

    if (!results.length) {
      showToast("No matching map location found.");
      return;
    }

    const result = results[0];
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    state.map.setView([latitude, longitude], 13);
    state.mapSelection = { latitude, longitude };
    updateMapMarker(latitude, longitude);
  } catch (error) {
    console.error(error);
    showToast("Could not search this map location.");
  }
}

async function confirmMapLocation() {
  if (!state.mapSelection) {
    showToast("Choose a point on the map first.");
    return;
  }

  const location = await reverseGeocode(
    state.mapSelection.latitude,
    state.mapSelection.longitude
  );

  closeModal(elements.mapModal);
  await selectLocation(location);
}

/* ---------------------------------------------------------
   Saved locations
   --------------------------------------------------------- */

function getSavedLocations() {
  try {
    return JSON.parse(localStorage.getItem("ufuq-saved-locations") || "[]");
  } catch {
    return [];
  }
}

function saveLocations(locations) {
  try {
    localStorage.setItem("ufuq-saved-locations", JSON.stringify(locations));
  } catch {
    showToast("Your browser could not save this location.");
  }
}

function renderSavedLocations() {
  const saved = getSavedLocations();

  if (!saved.length) {
    elements.savedList.innerHTML = '<p class="empty-state">No saved locations yet.</p>';
    return;
  }

  elements.savedList.innerHTML = saved.map((location, index) => `
    <div class="saved-location">
      <button type="button" data-load-saved="${index}">${escapeHtml(location.name)}</button>
      <button type="button" data-remove-saved="${index}" aria-label="Remove saved location">×</button>
    </div>
  `).join("");

  elements.savedList.querySelectorAll("[data-load-saved]").forEach(button => {
    button.addEventListener("click", () => {
      const location = saved[Number(button.dataset.loadSaved)];
      selectLocation(location);
    });
  });

  elements.savedList.querySelectorAll("[data-remove-saved]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeSaved);
      saved.splice(index, 1);
      saveLocations(saved);
      renderSavedLocations();
    });
  });
}

function saveCurrentLocation() {
  if (!state.location) return;

  const saved = getSavedLocations();

  const exists = saved.some(item =>
    Math.abs(item.latitude - state.location.latitude) < .001 &&
    Math.abs(item.longitude - state.location.longitude) < .001
  );

  if (exists) {
    showToast("This location is already saved.");
    return;
  }

  saved.push({
    name: state.location.name,
    admin1: state.location.admin1 || "",
    admin2: state.location.admin2 || "",
    country: state.location.country || "",
    latitude: state.location.latitude,
    longitude: state.location.longitude
  });

  saveLocations(saved);
  renderSavedLocations();
  showToast("Location saved.");
}

/* ---------------------------------------------------------
   Hourly weather alerts & storage sync
   --------------------------------------------------------- */

function openAlertDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(ALERT_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ALERT_DB_STORE)) {
        db.createObjectStore(ALERT_DB_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeAlertLocationToIndexedDb(payload) {
  try {
    const db = await openAlertDb();
    const tx = db.transaction(ALERT_DB_STORE, "readwrite");
    tx.objectStore(ALERT_DB_STORE).put({ id: "active-location", ...payload });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.warn("IndexedDB alert location write skipped:", error);
  }
}

async function writeAlertLocationToCache(payload) {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(ALERT_CACHE_NAME);
    await cache.put(
      ALERT_META_URL,
      new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" }
      })
    );
  } catch (error) {
    console.warn("Cache alert location write skipped:", error);
  }
}

async function persistAlertLocation(location = state.location) {
  const target = location || CONFIG.defaultLocation;
  const payload = {
    name: target.name,
    admin1: target.admin1 || "",
    admin2: target.admin2 || "",
    country: target.country || "",
    latitude: Number(target.latitude),
    longitude: Number(target.longitude),
    unit: state.unit,
    updatedAt: Date.now()
  };

  try {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("localStorage alert location write skipped:", error);
  }

  await Promise.allSettled([
    writeAlertLocationToIndexedDb(payload),
    writeAlertLocationToCache(payload)
  ]);

  return payload;
}

function updateAlertBellUi() {
  if (!elements.alertBellButton) return;
  elements.alertBellButton.classList.toggle("active", state.alertsEnabled);
  elements.alertBellButton.setAttribute("aria-pressed", String(state.alertsEnabled));
  elements.alertBellButton.title = state.alertsEnabled
    ? "Hourly weather alerts enabled (click to disable)"
    : "Enable hourly weather alerts";
}

async function showConfirmationNotification(cityName) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const title = "UFUQ Weather Alerts";
  const options = {
    body: `Hourly weather alerts enabled for ${cityName}`,
    icon: "./icon-512.png",
    badge: "./icon-512.png",
    tag: "ufuq-alert-confirmation"
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch (error) {
    console.warn("Confirmation notification failed:", error);
  }
}

async function triggerHourlyWeatherAlertNow() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const payload = await persistAlertLocation(state.location || CONFIG.defaultLocation);

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.active) {
        registration.active.postMessage({
          type: "TRIGGER_HOURLY_WEATHER_NOTIFICATION",
          location: payload
        });
        return;
      }
    }
  } catch (error) {
    console.warn("Service worker hourly alert message failed:", error);
  }

  try {
    const params = new URLSearchParams({
      latitude: payload.latitude,
      longitude: payload.longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code"
      ].join(","),
      timezone: "auto",
      temperature_unit: "celsius"
    });

    const response = await fetch(`${CONFIG.forecastUrl}?${params.toString()}`, {
      cache: "no-store"
    });
    if (!response.ok) return;

    const data = await response.json();
    const current = data.current || {};
    const temp = convertTemperature(current.temperature_2m);
    const feelsLike = convertTemperature(current.apparent_temperature);
    const humidity = Number.isFinite(Number(current.relative_humidity_2m))
      ? Math.round(Number(current.relative_humidity_2m))
      : "--";
    const condition = weatherDescription(current.weather_code);
    const title = `UFUQ • ${payload.name} (${temp}°${state.unit})`;
    const body = `${condition} • Feels like ${feelsLike}°${state.unit} • Humidity ${humidity}%`;

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: "./icon-512.png",
          badge: "./icon-512.png",
          tag: "ufuq-hourly-weather",
          renotify: true
        });
        return;
      }
    }

    new Notification(title, {
      body,
      icon: "./icon-512.png"
    });
  } catch (error) {
    console.warn("Hourly weather notification dispatch failed:", error);
  }
}

function startHourlyAlertTimer() {
  clearInterval(state.hourlyAlertTimer);
  if (!state.alertsEnabled) return;

  state.hourlyAlertTimer = setInterval(() => {
    triggerHourlyWeatherAlertNow();
  }, CONFIG.hourlyAlertInterval);
}

async function requestPeriodicBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ("periodicSync" in registration) {
      await registration.periodicSync.register("ufuq-hourly-weather-alert", {
        minInterval: CONFIG.hourlyAlertInterval
      });
    } else if (registration?.active) {
      registration.active.postMessage({
        type: "REGISTER_PERIODIC_WEATHER_SYNC"
      });
    }
  } catch (error) {
    console.warn("Periodic sync registration unavailable:", error);
  }
}

async function enableHourlyAlerts(sendConfirmation = true) {
  if (!("Notification" in window)) {
    showToast("Notifications are not supported by this browser.");
    return false;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    state.alertsEnabled = false;
    try {
      localStorage.setItem(ALERT_ENABLED_KEY, "false");
    } catch {}
    updateAlertBellUi();
    showToast("Notification permission was not granted.");
    return false;
  }

  const activeLocation = state.location || CONFIG.defaultLocation;
  await persistAlertLocation(activeLocation);

  state.alertsEnabled = true;
  try {
    localStorage.setItem(ALERT_ENABLED_KEY, "true");
  } catch {}
  updateAlertBellUi();
  startHourlyAlertTimer();
  await requestPeriodicBackgroundSync();

  if (sendConfirmation) {
    await showConfirmationNotification(activeLocation.name);
    showToast(`Hourly weather alerts enabled for ${activeLocation.name}.`);
  }

  return true;
}

function disableHourlyAlerts() {
  state.alertsEnabled = false;
  clearInterval(state.hourlyAlertTimer);
  try {
    localStorage.setItem(ALERT_ENABLED_KEY, "false");
  } catch {}
  updateAlertBellUi();
  showToast("Hourly weather alerts disabled.");
}

async function toggleHourlyAlerts() {
  if (state.alertsEnabled) {
    disableHourlyAlerts();
  } else {
    await enableHourlyAlerts(true);
  }
}

function restoreAlertState() {
  let savedPref = false;
  try {
    savedPref = localStorage.getItem(ALERT_ENABLED_KEY) === "true";
  } catch {}

  if (savedPref && "Notification" in window && Notification.permission === "granted") {
    state.alertsEnabled = true;
    updateAlertBellUi();
    persistAlertLocation(state.location || CONFIG.defaultLocation);
    startHourlyAlertTimer();
    requestPeriodicBackgroundSync();
  } else {
    state.alertsEnabled = false;
    updateAlertBellUi();
  }
}

/* ---------------------------------------------------------
   Temperature unit
   --------------------------------------------------------- */

function setUnit(unit) {
  if (unit !== "C" && unit !== "F") return;

  state.unit = unit;

  $("#celsiusButton").classList.toggle("active", unit === "C");
  $("#fahrenheitButton").classList.toggle("active", unit === "F");

  if (state.alertsEnabled && state.location) {
    persistAlertLocation(state.location);
  }

  renderWeather();
  renderAirQuality();
}

/* ---------------------------------------------------------
   Day selection and hourly navigation
   --------------------------------------------------------- */

function changeDay(direction) {
  if (!state.weather) return;

  const next = state.selectedDay + direction;
  const max = state.weather.daily.time.length - 1;

  if (next < 0 || next > max) {
    showToast(next < 0 ? "This is the earliest available forecast day." : "You have reached the end of the forecast.");
    return;
  }

  state.selectedDay = next;
  state.selectedHour = null;

  renderWeather();
  setWallpaperForSelectedHour();
}

function scrollHourly(direction) {
  elements.hourlyStrip.scrollBy({
    left: direction * 360,
    behavior: "smooth"
  });
}

/* ---------------------------------------------------------
   Clock and coordinate display
   --------------------------------------------------------- */

function updateClock() {
  const timezone = state.weather?.timezone || undefined;

  try {
    elements.localClock.textContent = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone
    }).format(new Date()) + " LOCAL TIME";
  } catch {
    elements.localClock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }) + " LOCAL TIME";
  }

  if (state.location) {
    elements.footerCoordinates.textContent =
      `${state.location.latitude.toFixed(4)}, ${state.location.longitude.toFixed(4)}`;
  }
}

/* ---------------------------------------------------------
   Atmospheric canvas physics
   --------------------------------------------------------- */

const atmosphere = {
  context: null,
  width: 0,
  height: 0,
  particles: [],
  category: "clearDay",
  lastFrame: 0
};

function resizeAtmosphere() {
  const canvas = elements.atmosphereCanvas;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  atmosphere.width = window.innerWidth;
  atmosphere.height = window.innerHeight;

  canvas.width = Math.floor(atmosphere.width * ratio);
  canvas.height = Math.floor(atmosphere.height * ratio);

  atmosphere.context = canvas.getContext("2d");
  atmosphere.context.setTransform(ratio, 0, 0, ratio, 0, 0);

  createAtmosphereParticles();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createAtmosphereParticles() {
  const category = atmosphere.category;
  const count = category === "storm" || category === "rain"
    ? 125
    : category === "snow"
      ? 90
      : category === "clearNight"
        ? 95
        : 55;

  atmosphere.particles = Array.from({ length: count }, () => ({
    x: randomBetween(0, atmosphere.width),
    y: randomBetween(0, atmosphere.height),
    radius: randomBetween(0.7, category === "fog" ? 3.5 : 2.2),
    speed: randomBetween(.15, category === "rain" || category === "storm" ? 6 : 1),
    drift: randomBetween(-.6, .6),
    alpha: randomBetween(.12, .6),
    phase: randomBetween(0, Math.PI * 2),
    length: randomBetween(8, 24)
  }));
}

function updateAtmosphere(category) {
  atmosphere.category = category;
  createAtmosphereParticles();
}

function drawAtmosphere(timestamp) {
  requestAnimationFrame(drawAtmosphere);

  if (!atmosphere.context) return;

  const ctx = atmosphere.context;
  const width = atmosphere.width;
  const height = atmosphere.height;
  const delta = Math.min((timestamp - atmosphere.lastFrame) / 16.67 || 1, 2);

  atmosphere.lastFrame = timestamp;
  ctx.clearRect(0, 0, width, height);

  const category = atmosphere.category;

  if (category === "clearNight") {
    drawStars(ctx, width, height, delta);
  } else if (category === "clearDay") {
    drawSunMotes(ctx, width, height, delta);
  } else if (category === "fog" || category === "cloudy") {
    drawMist(ctx, width, height, timestamp);
  } else if (category === "rain" || category === "storm") {
    drawRain(ctx, width, height, delta, category === "storm");
  } else if (category === "snow") {
    drawSnow(ctx, width, height, delta);
  }
}

function drawStars(ctx, width, height, delta) {
  for (const particle of atmosphere.particles) {
    particle.phase += .018 * delta;

    const alpha = .15 + (Math.sin(particle.phase) + 1) * .25;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,235,255,${alpha})`;
    ctx.fill();
  }

  if (Math.random() < .003) {
    const x = randomBetween(0, width * .7);
    const y = randomBetween(0, height * .4);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 75, y - 34);
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#fff";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawSunMotes(ctx, width, height, delta) {
  for (const particle of atmosphere.particles) {
    particle.y -= particle.speed * .2 * delta;
    particle.x += particle.drift * .25 * delta;

    if (particle.y < -5) {
      particle.y = height + 5;
      particle.x = randomBetween(0, width);
    }

    const glow = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.radius * 5
    );

    glow.addColorStop(0, `rgba(255,218,150,${particle.alpha * .5})`);
    glow.addColorStop(1, "rgba(255,218,150,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMist(ctx, width, height, timestamp) {
  const time = timestamp * .00015;

  for (let layer = 0; layer < 4; layer++) {
    const y = height * (.48 + layer * .12);
    const wave = Math.sin(time + layer) * 25;

    const gradient = ctx.createLinearGradient(0, y - 45, 0, y + 70);
    gradient.addColorStop(0, "rgba(220,230,240,0)");
    gradient.addColorStop(.5, `rgba(220,230,240,${.035 + layer * .008})`);
    gradient.addColorStop(1, "rgba(220,230,240,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, y + wave);

    for (let x = 0; x <= width; x += 35) {
      const offset = Math.sin(x * .004 + time * 3 + layer) * 15;
      ctx.lineTo(x, y + offset + wave);
    }

    ctx.lineTo(width, y + 85);
    ctx.lineTo(0, y + 85);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRain(ctx, width, height, delta, heavy) {
  ctx.strokeStyle = heavy
    ? "rgba(205,224,245,.24)"
    : "rgba(205,224,245,.18)";
  ctx.lineWidth = heavy ? 1.2 : .8;

  for (const particle of atmosphere.particles) {
    particle.y += particle.speed * delta * (heavy ? 1.5 : 1);
    particle.x += particle.drift * delta + (heavy ? 1.5 : .8);

    if (particle.y > height + 30) {
      particle.y = -30;
      particle.x = randomBetween(0, width);
    }

    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x - 5, particle.y + particle.length);
    ctx.stroke();
  }
}

function drawSnow(ctx, width, height, delta) {
  for (const particle of atmosphere.particles) {
    particle.y += particle.speed * delta * .45;
    particle.x += Math.sin(particle.phase) * .45 * delta;
    particle.phase += .01;

    if (particle.y > height + 5) {
      particle.y = -5;
      particle.x = randomBetween(0, width);
    }

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${particle.alpha})`;
    ctx.fill();
  }
}

/* ---------------------------------------------------------
   Cinema intro canvas
   --------------------------------------------------------- */

function startIntro() {
  const canvas = elements.introCanvas;
  const ctx = canvas.getContext("2d");

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const start = performance.now();
  const duration = 5000;

  const rain = Array.from({ length: 240 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    length: randomBetween(10, 40),
    speed: randomBetween(7, 19),
    opacity: randomBetween(.08, .35)
  }));

  const dust = Array.from({ length: 100 }, () => ({
    x: randomBetween(0, width),
    y: randomBetween(height * .3, height),
    radius: randomBetween(.5, 2.5),
    speed: randomBetween(.2, 1.2),
    phase: randomBetween(0, 6)
  }));

  const clouds = Array.from({ length: 14 }, (_, index) => ({
    x: (index / 14) * width,
    y: randomBetween(height * .15, height * .65),
    radius: randomBetween(90, 220),
    speed: randomBetween(.05, .3),
    opacity: randomBetween(.04, .13)
  }));

  function draw(now) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    const seconds = elapsed / 1000;

    ctx.clearRect(0, 0, width, height);

    let skyTop = "#08111e";
    let skyBottom = "#101d2d";

    if (seconds > 1.8 && seconds < 3.5) {
      const transition = (seconds - 1.8) / 1.7;
      skyTop = blendColor("#08111e", "#27303b", transition);
      skyBottom = blendColor("#101d2d", "#8b5632", transition);
    }

    if (seconds >= 3.5) {
      const transition = Math.min(1, (seconds - 3.5) / 1.5);
      skyTop = blendColor("#27303b", "#5a493b", transition);
      skyBottom = blendColor("#8b5632", "#f4b75c", transition);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(1, skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const clearing = seconds > 1.8
      ? Math.min(1, (seconds - 1.8) / 1.7)
      : 0;

    clouds.forEach((cloud, index) => {
      const center = width / 2;
      const direction = cloud.x < center ? -1 : 1;
      const movement = clearing * direction * (Math.abs(cloud.x - center) + 90);

      ctx.beginPath();
      ctx.arc(cloud.x + movement + Math.sin(seconds + index) * 8, cloud.y, cloud.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(8,15,25,${cloud.opacity * (1 - clearing * .7)})`;
      ctx.fill();
    });

    const horizonY = height * .73;

    const horizonGlow = ctx.createRadialGradient(
      width / 2, horizonY, 0,
      width / 2, horizonY, width * .55
    );

    horizonGlow.addColorStop(0, `rgba(255,190,102,${.04 + clearing * .2})`);
    horizonGlow.addColorStop(1, "rgba(255,190,102,0)");

    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 200, width, 400);

    if (seconds < 1.8) {
      rain.forEach(drop => {
        drop.y += drop.speed;
        drop.x -= 1.8;

        if (drop.y > height) {
          drop.y = -30;
          drop.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 5, drop.y + drop.length);
        ctx.strokeStyle = `rgba(196,218,239,${drop.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    } else if (seconds < 3.5) {
      const sweep = (seconds - 1.8) / 1.7;

      rain.forEach(drop => {
        drop.y += drop.speed * (1 - sweep);
        drop.x += (drop.x < width / 2 ? -1 : 1) * sweep * 9;

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 5, drop.y + drop.length * (1 - sweep));
        ctx.strokeStyle = `rgba(196,218,239,${drop.opacity * (1 - sweep)})`;
        ctx.stroke();
      });
    }

    if (seconds < 1.8 && Math.random() < .008) {
      const flash = ctx.createRadialGradient(
        width * .7, height * .25, 0,
        width * .7, height * .25, width * .45
      );

      flash.addColorStop(0, "rgba(205,225,255,.23)");
      flash.addColorStop(1, "rgba(205,225,255,0)");

      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, width, height);
    }

    if (seconds >= 3.5) {
      const sunrise = Math.min(1, (seconds - 3.5) / 1.5);

      for (let i = 0; i < 8; i++) {
        const angle = -Math.PI + (i / 7) * Math.PI;
        const length = height * .9;

        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(
          width / 2 + Math.cos(angle) * length,
          horizonY + Math.sin(angle) * length
        );

        ctx.strokeStyle = `rgba(255,220,159,${.025 * sunrise})`;
        ctx.lineWidth = 25;
        ctx.stroke();
      }

      dust.forEach(particle => {
        particle.y -= particle.speed;
        particle.phase += .02;

        if (particle.y < height * .2) {
          particle.y = height + 10;
        }

        ctx.beginPath();
        ctx.arc(
          particle.x + Math.sin(particle.phase) * 5,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = `rgba(255,226,164,${.35 * sunrise})`;
        ctx.fill();
      });

      const ringRadius = 42 + sunrise * 15;

      ctx.beginPath();
      ctx.ellipse(width / 2, height * .48, ringRadius, ringRadius * 1.25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,220,153,${.25 + sunrise * .5})`;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = "#f9bd68";
      ctx.shadowBlur = 25;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    elements.introProgress.style.width = `${progress * 100}%`;

    if (seconds >= 3.5 && !elements.introBrand.classList.contains("revealed")) {
      elements.introBrand.classList.add("revealed");
    }

    if (elapsed < duration) {
      requestAnimationFrame(draw);
    } else {
      finishIntro();
    }
  }

  requestAnimationFrame(draw);
}

function blendColor(first, second, amount) {
  const a = first.match(/\w\w/g).map(value => parseInt(value, 16));
  const b = second.match(/\w\w/g).map(value => parseInt(value, 16));

  const values = a.map((value, index) =>
    Math.round(value + (b[index] - value) * amount)
  );

  return `rgb(${values[0]},${values[1]},${values[2]})`;
}

function finishIntro() {
  if (state.introFinished) return;

  state.introFinished = true;
  elements.introOverlay.classList.add("finished");

  setTimeout(() => {
    elements.introOverlay.style.display = "none";
  }, 900);
}

/* ---------------------------------------------------------
   Installable PWA
   --------------------------------------------------------- */

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.installPrompt = event;
    elements.installConfirmButton.textContent = "Install UFUQ";
    elements.installGuideText.textContent = "UFUQ is ready to install on your device.";
  });

  window.addEventListener("appinstalled", async () => {
    state.installPrompt = null;
    closeModal(elements.installModal);
    const activeLocation = state.location || CONFIG.defaultLocation;
    await persistAlertLocation(activeLocation);
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        await enableHourlyAlerts(true);
      } else if (Notification.permission === "default") {
        await enableHourlyAlerts(true);
      }
    }
    showToast("UFUQ has been installed.");
  });
}

function openInstallGuide() {
  if (state.installPrompt) {
    elements.installGuideText.textContent = "Your browser supports direct installation. Select Install UFUQ to continue.";
    elements.installSteps.innerHTML = `
      <li>Choose Install UFUQ below.</li>
      <li>Confirm the installation prompt from your browser.</li>
      <li>Open UFUQ from your device home screen.</li>
    `;
    elements.installConfirmButton.style.display = "block";
  } else {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIOS) {
      elements.installGuideText.textContent = "On iPhone or iPad, add UFUQ to your Home Screen using Safari.";
      elements.installSteps.innerHTML = `
        <li>Open UFUQ in Safari.</li>
        <li>Tap the Share button in the browser toolbar.</li>
        <li>Choose Add to Home Screen.</li>
        <li>Tap Add to finish.</li>
      `;
    } else {
      elements.installGuideText.textContent = "Use your browser menu to install UFUQ or add it to your home screen.";
      elements.installSteps.innerHTML = `
        <li>Open this page in Chrome or another supported browser.</li>
        <li>Open the browser menu.</li>
        <li>Select Install App or Add to Home Screen.</li>
        <li>Confirm to finish.</li>
      `;
    }

    elements.installConfirmButton.style.display = "none";
  }

  elements.installModal.classList.add("visible");
  elements.installModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

async function installApp() {
  if (!state.installPrompt) {
    openInstallGuide();
    return;
  }

  state.installPrompt.prompt();

  try {
    const choice = await state.installPrompt.userChoice;

    if (choice?.outcome === "accepted") {
      await persistAlertLocation(state.location || CONFIG.defaultLocation);
      if ("Notification" in window && Notification.permission === "default") {
        await enableHourlyAlerts(true);
      }
      showToast("UFUQ installation started.");
    } else {
      showToast("Installation was cancelled.");
    }
  } catch (error) {
    console.warn("Installation prompt failed:", error);
    showToast("Could not start installation.");
  }

  state.installPrompt = null;
  closeModal(elements.installModal);
}

/* ---------------------------------------------------------
   UI notifications and events
   --------------------------------------------------------- */

function showToast(message) {
  clearTimeout(state.toastTimer);

  elements.toast.textContent = message;
  elements.toast.classList.add("visible");

  state.toastTimer = setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 3000);
}

function setupEvents() {
  elements.locationSearch.addEventListener("input", event => {
    searchLocations(event.target.value);
  });

  elements.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchLocations(elements.locationSearch.value);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) {
      elements.suggestions.classList.remove("visible");
    }

    if (!event.target.closest(".saved-wrap")) {
      elements.savedMenu.classList.remove("visible");
    }
  });

  $("#gpsButton").addEventListener("click", useGPS);
  $("#footerGpsButton").addEventListener("click", useGPS);

  $("#mapButton").addEventListener("click", openMap);
  $("#footerMapButton").addEventListener("click", openMap);

  elements.alertBellButton.addEventListener("click", toggleHourlyAlerts);

  $("#savedButton").addEventListener("click", () => {
    elements.savedMenu.classList.toggle("visible");
    renderSavedLocations();
  });

  $("#saveCurrentButton").addEventListener("click", saveCurrentLocation);

  $("#celsiusButton").addEventListener("click", () => setUnit("C"));
  $("#fahrenheitButton").addEventListener("click", () => setUnit("F"));

  $("#previousDay").addEventListener("click", () => changeDay(-1));
  $("#nextDay").addEventListener("click", () => changeDay(1));

  $("#scrollHoursLeft").addEventListener("click", () => scrollHourly(-1));
  $("#scrollHoursRight").addEventListener("click", () => scrollHourly(1));

  $("#mapSearchButton").addEventListener("click", searchMapLocation);
  elements.mapSearchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") searchMapLocation();
  });

  $("#useMapLocation").addEventListener("click", confirmMapLocation);

  $("#installButton").addEventListener("click", () => {
    if (state.installPrompt) {
      installApp();
    } else {
      openInstallGuide();
    }
  });
  elements.installConfirmButton.addEventListener("click", installApp);

  $("#footerRefreshButton").addEventListener("click", () => {
    if (state.location) fetchWeather(state.location);
  });

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => {
      const modal = button.closest(".modal-backdrop");
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeModal(backdrop);
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.visible").forEach(closeModal);
      elements.savedMenu.classList.remove("visible");
      elements.suggestions.classList.remove("visible");
    }
  });

  window.addEventListener("resize", resizeAtmosphere);
}

/* ---------------------------------------------------------
   Service worker registration
   --------------------------------------------------------- */

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("./sw.js", {
      scope: "./"
    });
  } catch (error) {
    console.warn("Service worker registration failed:", error);
  }
}

/* ---------------------------------------------------------
   Application startup
   --------------------------------------------------------- */

async function initializeApp() {
  $("#copyrightYear").textContent = new Date().getFullYear();

  setupEvents();
  setupInstallPrompt();
  renderSavedLocations();

  resizeAtmosphere();
  requestAnimationFrame(drawAtmosphere);

  startIntro();

  const initialLocation = {
    ...CONFIG.defaultLocation
  };

  await fetchWeather(initialLocation);

  registerServiceWorker();
  restoreAlertState();

  state.refreshTimer = setInterval(() => {
    if (state.location) {
      fetchWeather(state.location);
    }
  }, CONFIG.refreshInterval);

  setInterval(updateClock, 30000);

  // Try GPS only after the visitor explicitly asks for it.
}

document.addEventListener("DOMContentLoaded", initializeApp);