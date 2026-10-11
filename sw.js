// Offline cache dla Aestheticbook. Dane pacjentek są w IndexedDB, nie tutaj.
// Stale-while-revalidate: start z cache (szybko, także przy słabym Wi-Fi), w tle aktualizacja.
// Po każdym deployu: podbić CACHE i uruchomić aplikację 2x online (1. start = stara wersja, 2. start = nowa).
// Między startami zamknąć aplikację w przełączniku aplikacji (przesunąć w górę), samo wyjście na ekran główny nie wystarcza.
// Pliki aplikacji pobierane z pominięciem cache HTTP (GitHub Pages: max-age=600), więc nie trzeba czekać 10 min po deployu.
var CACHE = "aestheticbook-v5";
var FILES = ["./", "index.html", "content.js", "content-en.js", "content-pl.js", "i18n.js", "app.js", "logo.png", "logo-white.png", "mono.png", "icon-180.png", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
// Gesichtsanalyse: face.js einzeln (fehlt die Datei, installiert sich die App trotzdem, nur ohne Analyse).
var OPTIONAL = ["face.js"];
// MediaPipe (ca. 22 MB, ändert sich nie): eigener Cache pro Version, wird beim Aufräumen nicht gelöscht, "Cache zuerst".
// Bei neuer MediaPipe-Version: MP_CACHE umbenennen (der alte wird dann gelöscht).
var MP_CACHE = "ab-mediapipe-0.10.14";
var MP_FILES = ["vendor/mediapipe/vision_bundle.mjs", "vendor/mediapipe/wasm/vision_wasm_internal.js", "vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js", "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm", "vendor/mediapipe/face_landmarker.task"];

function abs(f) { return new URL(f, self.registration.scope).href; }
// Anfrage am HTTP-Cache vorbei (reload) bzw. mit Nachfrage beim Server (no-cache); ohne Unterstützung die normale Anfrage
function fresh(url, mode) { try { return new Request(url, { cache: mode }); } catch (e) { return url; } }
function isMP(url) { var p = new URL(url).pathname; return MP_FILES.some(function (f) { return p.slice(-f.length - 1) === "/" + f; }); }
// Einzeln und nacheinander holen; ein Fehler bricht weder die Installation noch die App ab.
function fill(cacheName, files) {
  return caches.open(cacheName).then(function (c) {
    return files.reduce(function (p, f) {
      return p.then(function () {
        var url = abs(f);
        return c.match(url).then(function (hit) {
          if (hit && cacheName === MP_CACHE) return;
          return fetch(cacheName === MP_CACHE ? url : fresh(url, "reload")).then(function (r) { if (r && r.ok) return c.put(url, r); });
        }).catch(function () { /* später erneut */ });
      });
    }, Promise.resolve());
  }).catch(function () { /* Cache nicht verfügbar */ });
}
function withLimit(p, ms) { return Promise.race([p, new Promise(function (res) { setTimeout(res, ms); })]); }
// Nur ein Nachladen von MediaPipe gleichzeitig (Installation und Nachricht der App teilen sich denselben Lauf)
var mpBusy = null;
function fillMP() {
  if (!mpBusy) mpBusy = fill(MP_CACHE, MP_FILES).then(function () { mpBusy = null; }, function () { mpBusy = null; });
  return mpBusy;
}

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES.map(function (f) { return fresh(f, "reload"); })); }).then(function () {
    // MediaPipe nur 5 s abwarten, damit die neue Version schnell aktiv wird; der Lauf geht im Hintergrund weiter,
    // den Rest holt die App nach dem Start (Nachricht ab-precache-mp) bzw. die erste Analyse.
    return Promise.all([fill(CACHE, OPTIONAL), withLimit(fillMP(), 5000)]);
  }));
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== MP_CACHE; }).map(function (k) { return caches.delete(k); })); }));
  self.clients.claim();
});
// Von app.js nach dem Start: fehlende MediaPipe-Dateien nachladen (schnell, wenn schon alles da ist).
self.addEventListener("message", function (e) {
  if (e.data !== "ab-precache-mp") return;
  var p = fillMP();
  if (e.waitUntil) e.waitUntil(p);
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (isMP(req.url)) {
    e.respondWith(caches.open(MP_CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (r) {
          // ohne ?a=… speichern (Wiederholungsversuch von face.js), damit fill() die Datei findet
          if (r && r.ok && r.type === "basic") { var cp = r.clone(); c.put(req.url.split("?")[0], cp).catch(function () { /* ignore */ }); }
          return r;
        });
      });
    }, function () { return fetch(req); }));
    return;
  }
  // Aktualisierung im Hintergrund mit Nachfrage beim Server (nicht aus dem HTTP-Cache); Navigation ohne Weiterleitung folgen wie bisher
  var nreq = req;
  try {
    nreq = req.mode === "navigate" ? new Request(req.url, { cache: "no-cache", credentials: "same-origin", redirect: "manual" }) : new Request(req, { cache: "no-cache" });
  } catch (er) { nreq = req; }
  var net = fetch(nreq).then(function (r) {
    if (!r || !r.ok || r.type !== "basic") return r;
    var cp = r.clone();
    return caches.open(CACHE).then(function (c) { return c.put(req, cp); }).then(function () { return r; }, function () { return r; });
  });
  e.waitUntil(net.then(function () {}, function () {}));
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || net.catch(function () { return req.mode === "navigate" ? caches.match("index.html") : Response.error(); });
  }));
});
