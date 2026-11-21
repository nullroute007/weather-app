"use strict";

/* =========================================================
   UFUQ — Progressive Web App Service Worker
   ========================================================= */

const CACHE_VERSION = "ufuq-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const ALERT_CACHE = `${CACHE_VERSION}-alerts`;
const ALERT_META_URL = "./__ufuq_alert_location__";
const PERIODIC_SYNC_TAG = "ufuq-hourly-weather-alert";
const HOURLY_ALERT_MS = 60 * 60 * 1000;

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

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-512.png"
];

const EXTERNAL_ASSETS = [
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

/* ---------------------------------------------------------
   Install
   --------------------------------------------------------- */

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await cache.addAll(ASSETS);

      await Promise.allSettled(
        EXTERNAL_ASSETS.map(async url => {
          try {
            const response = await fetch(url, {
              mode: "no-cors"
            });

            if (response && response.type !== "opaque") {
              await cache.put(url, response);
            }
          } catch (error) {
            console.warn("Optional asset was not cached:", url);
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

/* ---------------------------------------------------------
   Activate
   --------------------------------------------------------- */

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key !== STATIC_CACHE &&
            key !== RUNTIME_CACHE &&
            key !== ALERT_CACHE
          )
          .map(key => caches.delete(key))
      );

      if ("periodicSync" in self.registration) {
        try {
          await self.registration.periodicSync.register(PERIODIC_SYNC_TAG, {
            minInterval: HOURLY_ALERT_MS
          });
        } catch (error) {
          console.warn("Periodic background sync registration skipped:", error);
        }
      }

      await self.clients.claim();
    })()
  );
});

/* ---------------------------------------------------------
   Request strategies
   --------------------------------------------------------- */

function isWeatherApi(url) {
  return (
    url.hostname === "api.open-meteo.com" ||
    url.hostname === "air-quality-api.open-meteo.com"
  );
}

function isImageRequest(request) {
  return request.destination === "image";
}

function isStaticRequest(request, url) {
  return (
    url.origin === self.location.origin &&
    ["style", "script", "document", "font"].includes(request.destination)
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response && (response.ok || response.type === "opaque")) {
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && (response.ok || response.type === "opaque")) {
    cache.put(request, response.clone()).catch(() => {});
  }

  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkRequest = fetch(request)
    .then(response => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone()).catch(() => {});
      }

      return response;
    })
    .catch(() => null);

  if (cached) {
    networkRequest.catch(() => {});
    return cached;
  }

  const response = await networkRequest;

  if (response) return response;

  throw new Error("No cached or network response available.");
}

/* ---------------------------------------------------------
   Fetch
   --------------------------------------------------------- */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.endsWith("/__ufuq_alert_location__")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ALERT_CACHE);
        const cached = await cache.match(ALERT_META_URL);
        return cached || new Response("null", {
          headers: { "Content-Type": "application/json" }
        });
      })()
    );
    return;
  }

  // Live weather data should not be served from a stale cache.
  if (isWeatherApi(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Avoid caching search, GPS reverse-geocoding and map queries.
  if (
    url.hostname === "geocoding-api.open-meteo.com" ||
    url.hostname === "nominatim.openstreetmap.org"
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache static files while refreshing them from the network.
  if (isStaticRequest(request, url)) {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(async () => {
        const cached = await caches.match("./index.html");
        return cached || Response.error();
      })
    );
    return;
  }

  // Cache wallpaper photography and map tiles when available.
  if (isImageRequest(request)) {
    event.respondWith(
      staleWhileRevalidate(request, RUNTIME_CACHE).catch(() => Response.error())
    );
    return;
  }

  // Other external resources use a network-first strategy.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      staleWhileRevalidate(request, RUNTIME_CACHE).catch(() => Response.error())
    );
    return;
  }

  event.respondWith(
    cacheFirst(request, STATIC_CACHE).catch(() => caches.match("./index.html"))
  );
});

/* ---------------------------------------------------------
   Hourly Weather Alert Sync & Notification
   --------------------------------------------------------- */

async function readAlertLocation() {
  try {
    const cache = await caches.open(ALERT_CACHE);
    const response = await cache.match(ALERT_META_URL);
    if (!response) return null;
    const data = await response.json();
    if (!data || !Number.isFinite(Number(data.latitude)) || !Number.isFinite(Number(data.longitude))) {
      return null;
    }
    return data;
  } catch (error) {
    console.warn("Unable to read stored alert location:", error);
    return null;
  }
}

function formatAlertTemperature(celsius, unit = "C") {
  const num = Number(celsius);
  if (!Number.isFinite(num)) return "--";
  return unit === "F" ? Math.round((num * 9) / 5 + 32) : Math.round(num);
}

async function dispatchHourlyWeatherNotification(overrideLocation = null) {
  if (Notification.permission !== "granted") return;

  const location = overrideLocation || (await readAlertLocation());
  if (!location) return;

  const params = new URLSearchParams({
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code"
    ].join(","),
    timezone: "auto",
    temperature_unit: "celsius"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }

  const data = await response.json();
  const current = data.current || {};
  const unit = location.unit === "F" ? "F" : "C";
  const temp = formatAlertTemperature(current.temperature_2m, unit);
  const feelsLike = formatAlertTemperature(current.apparent_temperature, unit);
  const humidity = Number.isFinite(Number(current.relative_humidity_2m))
    ? Math.round(Number(current.relative_humidity_2m))
    : "--";
  const condition = WEATHER_CODES[current.weather_code] || "Variable conditions";
  const cityName = location.name || "Chunian";

  await self.registration.showNotification(`UFUQ • ${cityName} (${temp}°${unit})`, {
    body: `${condition} • Feels like ${feelsLike}°${unit} • Humidity ${humidity}%`,
    icon: "./icon-512.png",
    badge: "./icon-512.png",
    tag: "ufuq-hourly-weather",
    renotify: true,
    data: {
      url: "./index.html"
    }
  });
}

self.addEventListener("periodicsync", event => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(dispatchHourlyWeatherNotification());
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./index.html";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener("message", event => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "REGISTER_PERIODIC_WEATHER_SYNC") {
    event.waitUntil(
      (async () => {
        if ("periodicSync" in self.registration) {
          try {
            await self.registration.periodicSync.register(PERIODIC_SYNC_TAG, {
              minInterval: HOURLY_ALERT_MS
            });
          } catch (error) {
            console.warn("Periodic sync request rejected by browser:", error);
          }
        }
      })()
    );
    return;
  }

  if (data.type === "TRIGGER_HOURLY_WEATHER_NOTIFICATION") {
    event.waitUntil(dispatchHourlyWeatherNotification(data.location || null));
  }
});