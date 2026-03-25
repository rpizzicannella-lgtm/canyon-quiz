const CACHE_NAME = "canyon-quiz-v13";
const FILES = ["./","./index.html","./admin.html","./styles.css","./manifest.json","./js/config.js","./js/labels.js","./js/rules.js","./js/scenarios.js","./js/quiz-app.js","./js/admin-app.js","./data/manual-scenarios.json"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); });
self.addEventListener("fetch", event => { event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });