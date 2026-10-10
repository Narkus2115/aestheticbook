// Offline cache dla Aestheticbook. Dane pacjentek są w IndexedDB, nie tutaj.
// Stale-while-revalidate: start z cache (szybko, także przy słabym Wi-Fi), w tle aktualizacja.
// Po każdym deployu: podbić CACHE i uruchomić aplikację 2x online (1. start = stara wersja, 2. start = nowa).
var CACHE = "aestheticbook-v2";
var FILES = ["./", "index.html", "content.js", "content-en.js", "content-pl.js", "i18n.js", "app.js", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })); self.clients.claim(); });
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  var net = fetch(req).then(function (r) {
    if (!r || !r.ok || r.type !== "basic") return r;
    var cp = r.clone();
    return caches.open(CACHE).then(function (c) { return c.put(req, cp); }).then(function () { return r; }, function () { return r; });
  });
  e.waitUntil(net.then(function () {}, function () {}));
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || net.catch(function () { return req.mode === "navigate" ? caches.match("index.html") : Response.error(); });
  }));
});
