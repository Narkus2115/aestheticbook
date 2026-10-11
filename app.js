/* Aestheticbook · wewnętrzna ewidencja pacjentek i zabiegów
   Dane tylko lokalnie na urządzeniu (IndexedDB). Bez serwera.
   Zgodność: Safari / iPadOS 15+ (bez nowszych API, bez ?. i ??). */
(function () {
  "use strict";
  var C = window.AB_CONTENT;
  var UI = window.AB_UI || {};
  var LANGS = ["de", "en", "pl"];
  var LANG_DE = { de: "Deutsch", en: "Englisch", pl: "Polnisch" };

  // ---------------------------------------------------------------- i18n (nur Patientenseite; Praxisbereich bleibt deutsch)
  function contentFor(lang) {
    if (lang === "en" && window.AB_CONTENT_EN) return window.AB_CONTENT_EN;
    if (lang === "pl" && window.AB_CONTENT_PL) return window.AB_CONTENT_PL;
    return C;
  }
  function TL(lang, key, vars) {
    var u = UI[lang] || UI.de || {}, v = u[key];
    if (v == null && UI.de) v = UI.de[key];
    if (v == null) return key;
    if (vars && typeof v === "string") Object.keys(vars).forEach(function (k) { v = v.split("{" + k + "}").join(vars[k]); });
    return v;
  }
  function T(key, vars) { return TL(S.lang, key, vars); }
  function PC() { return contentFor(S.lang); }
  function findQ(content, id) { return (content.questions || []).find(function (q) { return q.id === id; }); }

  // ---------------------------------------------------------------- utils
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDate(ts) { var d = new Date(ts); return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(); }
  function timeStr(ts) { var d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fmtDT(ts) { return fmtDate(ts) + ", " + timeStr(ts) + " Uhr"; }
  function fmtDTL(ts, lang) { return TL(lang || S.lang, "dateTime", { d: fmtDate(ts), t: timeStr(ts) }); }
  function isoDay(ts) { var d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function rel(ts) {
    var s = (Date.now() - ts) / 1000;
    if (s < 60) return "gerade eben";
    if (s < 3600) return "vor " + Math.floor(s / 60) + " Min.";
    if (s < 86400) return "vor " + Math.floor(s / 3600) + " Std.";
    if (s < 86400 * 7) { var d = Math.floor(s / 86400); return "vor " + d + (d === 1 ? " Tag" : " Tagen"); }
    return fmtDate(ts);
  }
  function whenTxt(ts) { return Date.now() - ts < 7 * 86400000 ? rel(ts) + " · " + timeStr(ts) + " Uhr" : fmtDT(ts); }
  function age(dob) {
    if (!dob) return null;
    var b = new Date(dob), n = new Date();
    var a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  function initials(p) { return ((p.first || "?").charAt(0) + (p.last || "").charAt(0)).toUpperCase(); }
  function fullName(p) { return (p.first || "") + " " + (p.last || ""); }
  function practitionerInitials() { var pr = (settings().practitioner || "").trim().split(/\s+/); return initials({ first: pr[0] || "", last: pr.length > 1 ? pr[pr.length - 1] : "" }); }
  function errMsg(er) { return (er && (er.message || er.name)) || String(er || ""); }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  function isStandalone() { return window.navigator.standalone === true || !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); }
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  var isTouch = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;

  // ---------------------------------------------------------------- icons
  var I = {
    home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7.5 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM9 13c-4 0-7 2-7 4.5V20h14v-2.5C16 15 13 13 9 13zm7.6.1c1.6.8 3.4 2.2 3.4 4.4V20h3v-2.4c0-2.3-3.2-4.1-6.4-4.5z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5h2v14h-2z"/><path d="M5 11h14v2H5z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h9l5 5v15H6zM14 3.5V8h4.5zM8 12h10v1.6H8zm0 3.5h10v1.6H8zm0 3.5h7v1.6H8z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9zm-8-2a3 3 0 0 1 6 0v2H9zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3 7.2 5H3v15h18V5h-4.2L15 3zm3 14a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v16H3zm2 2v9.6l4-4 3 3 4-5 3 3.6V6zm3.5 4A1.5 1.5 0 1 0 8.5 7a1.5 1.5 0 0 0 0 3z"/></svg>',
    syringe: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m17.7 2.3-1.4 1.4 1.3 1.3-1.4 1.4-2.8-2.8-1.4 1.4.7.7-7.8 7.8a2 2 0 0 0 0 2.8l.5.5L2 20.2 3.8 22l3.4-3.4.5.5a2 2 0 0 0 2.8 0l7.8-7.8.7.7 1.4-1.4-2.8-2.8L19 6.4l1.3 1.3 1.4-1.4zM9.1 17.7l-2.8-2.8 1.4-1.4 1.1 1.1 1-1-1.1-1.1 1.4-1.4 1.1 1.1 1-1-1.1-1.1 1.4-1.4 2.8 2.8z"/></svg>',
    sign: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12v5H6zM4 8h16a2 2 0 0 1 2 2v7h-4v5H6v-5H2v-7a2 2 0 0 1 2-2zm4 9v3h8v-5H8z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h11l5 5v13H3V3zm2 2v5h9V5zm5 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m19.4 13 .1-1-.1-1 2.1-1.6-2-3.5-2.5 1a7 7 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.7a7 7 0 0 0-1.7 1l-2.5-1-2 3.4L4.5 11l-.1 1 .1 1-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.7h4l.4-2.7c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#6e6468"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.6 5.6-1.4 1.4-5.6-5.6A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>',
    tablet: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 2h14v20H5zm2 2v14h10V4zm5 15.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
    compare: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h8v16H3zm10 0h8v16h-8zm-1-2h0v20h0z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    clip: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M8 3V2h8v1h3a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm2 0v2h4V3zM9.3 16.1 16.4 9l1.4 1.4-8.5 8.5-4-4 1.4-1.4z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 4l-1.4 1.4 5.6 5.6H4v2h12.2l-5.6 5.6L12 20l8-8z"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
    slide: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 6 3 12l6 6zm6 0v12l6-6z"/></svg>',
    face: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M3 3h5v2H5v3H3zm13 0h5v5h-2V5h-3zM3 16h2v3h3v2H3zm16 0h2v5h-5v-2h3zM12 6.5c2.5 0 4.3 2.4 4.3 5.4s-1.8 5.6-4.3 5.6-4.3-2.6-4.3-5.6 1.8-5.4 4.3-5.4zm0 1.9c-1.4 0-2.4 1.5-2.4 3.5s1 3.7 2.4 3.7 2.4-1.7 2.4-3.7-1-3.5-2.4-3.5z"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m10 2 1.8 4.7 4.7 1.8-4.7 1.8L10 15l-1.8-4.7-4.7-1.8 4.7-1.8zm8 11 .9 2.1 2.1.9-2.1.9L18 19l-.9-2.1-2.1-.9 2.1-.9z"/></svg>',
    wand: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 18.9 15.2 7.3l1.5 1.5L5.1 20.4zM17 2l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8zm3.5 7 .5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9z"/></svg>'
  };

  // ---------------------------------------------------------------- DB (IndexedDB, wszystkie rekordy w jednym store)
  var DB = { db: null, all: [] };
  DB.open = function () {
    return new Promise(function (res, rej) {
      var r = indexedDB.open("aestheticbook", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("docs", { keyPath: "id" }); };
      r.onsuccess = function () { DB.db = r.result; DB.db.onclose = function () { DB.db = null; }; res(); };
      r.onerror = function () { rej(r.error); };
    });
  };
  DB.load = function () {
    return new Promise(function (res, rej) {
      var out = [], tx = DB.db.transaction("docs", "readonly");
      tx.objectStore("docs").openCursor().onsuccess = function (e) {
        var c = e.target.result; if (c) { out.push(c.value); c.continue(); } else { DB.all = out; res(out); }
      };
      tx.onerror = function () { rej(tx.error); };
    });
  };
  // Eine Transaktion; ein throw (z. B. DB.db == null) wird zur Ablehnung.
  DB.tx = function (mode, fn) {
    return new Promise(function (res, rej) {
      var tx = DB.db.transaction("docs", mode);
      fn(tx.objectStore("docs"));
      tx.oncomplete = function () { res(); };
      tx.onerror = tx.onabort = function () { rej(tx.error || new Error("Transaktion abgebrochen")); };
    });
  };
  // WebKit verliert nach dem Hintergrund manchmal die IndexedDB-Verbindung: einmal neu öffnen und wiederholen.
  function dbWrite(fn) { return DB.tx("readwrite", fn).catch(function () { return DB.open().then(function () { return DB.tx("readwrite", fn); }); }); }
  DB.put = function (doc) {
    return dbWrite(function (s) { s.put(doc); }).then(function () {
      var i = DB.all.findIndex(function (d) { return d.id === doc.id; });
      if (i >= 0) DB.all[i] = doc; else DB.all.push(doc);
      return doc;
    });
  };
  DB.del = function (ids) {
    return dbWrite(function (s) { ids.forEach(function (id) { s.delete(id); }); }).then(function () {
      DB.all = DB.all.filter(function (d) { return ids.indexOf(d.id) < 0; });
    });
  };
  function kind(k) { return DB.all.filter(function (d) { return d.kind === k; }); }
  function byPatient(k, pid) { return kind(k).filter(function (d) { return d.patientId === pid; }).sort(function (a, b) { return b.createdAt - a.createdAt; }); }
  function patient(pid) { return DB.all.find(function (d) { return d.kind === "patient" && d.id === pid; }); }
  function docById(id) { return DB.all.find(function (d) { return d.id === id; }); }
  function latestAnamnesis(pid) { return byPatient("anamnesis", pid)[0]; }
  function photoConsent(pid) { return byPatient("consent", pid).filter(function (c) { return c.type === "fotos"; })[0]; }
  function photoDocOk(pid) { var fc = photoConsent(pid); return !!(fc && fc.doc); }
  function consentFor(pid, day) { return byPatient("treatconsent", pid).filter(function (c) { return !c.refused && isoDay(c.createdAt) === day; })[0]; }
  function settings() { return DB.all.find(function (d) { return d.id === "settings"; }) || { id: "settings", kind: "settings", pin: "", practitioner: "Samanta Wysocka" }; }
  // Wpisy są niezmienialne (§630f). Profil pacjentki (avatar, dane kontaktowe) może być aktualizowany, historia zostaje w "log".
  function logEvent(pid, text, type) { return DB.put({ id: uid(), kind: "log", type: type || "change", patientId: pid, createdAt: Date.now(), text: text }); }

  // Antworten: nur "Ja" trägt eine Beschreibung; Frauenfragen nur bei nicht männlich.
  function ansDetail(a) { return a && a.a === "j" ? (a.d || "") : ""; }
  function yesQs(an) {
    if (!an) return [];
    var women = an.sex !== "männlich";
    return C.questions.filter(function (q) { return (women || !q.women) && (an.answers[q.id] || {}).a === "j"; });
  }
  function qText(doc, q) { return (doc && doc.qTexts && doc.qTexts[q.id]) || q.t; }
  function answersDiffer(x, y) {
    return C.questions.some(function (q) { var a = x.answers[q.id] || {}, b = y.answers[q.id] || {}; return (a.a || "") !== (b.a || "") || ansDetail(a) !== ansDetail(b); });
  }
  function pubLabel(v) { return { nein: "nein", ohne: "ja, nur ohne erkennbares Gesicht", mit: "ja, auch mit erkennbarem Gesicht" }[v] || v || ""; }
  function fillerInfo(lang) {
    var ph = C.practice.phone;
    return contentFor(lang).fillerInfoHtml.split("{TEL}").join(ph ? "<b>" + esc(ph) + "</b>" : esc(TL(lang, "telFallback")));
  }
  function privacyText(lang) {
    var p = C.practice, bits = [];
    if (p.phone) bits.push("Tel. " + esc(p.phone));
    if (p.email) bits.push(esc(p.email));
    return contentFor(lang).privacyHtml.split("{CONTACT}").join(bits.length ? ", " + bits.join(", ") : "");
  }
  function practiceLine() { return esc(C.practice.name) + ", " + esc(C.practice.owner) + ", " + esc(C.practice.address) + (C.practice.phone ? ", Tel. " + esc(C.practice.phone) : ""); }

  // ---------------------------------------------------------------- image helpers
  function fileToDataUrl(file, max, q) {
    max = max || 1600; q = q || 0.82;
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          var out = c.toDataURL("image/jpeg", q);
          c.width = c.height = 0; URL.revokeObjectURL(url);
          res(out);
        } catch (e) { URL.revokeObjectURL(url); rej(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("Foto konnte nicht geladen werden")); };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------- Fotos: Format, Datum, Bereiche
  // Fotos waren früher reine Data-URLs (Strings). Neu: Objekte {src, kind, caption}. Alles, was Fotos liest, geht über diese Helfer.
  var PH_KINDS = ["vorher", "direkt", "kontrolle", "ergebnis"];
  var PH_KIND = { vorher: "Vorher", direkt: "Direkt nach", kontrolle: "Kontrolle", ergebnis: "Ergebnis" };
  var PH_KIND_LONG = { vorher: "Vorher", direkt: "Direkt nach der Behandlung", kontrolle: "Kontrolle", ergebnis: "Ergebnis" };
  function photoSrc(p) { if (typeof p === "string") return p; return (p && typeof p.src === "string") ? p.src : ""; }
  function photoKind(p) { return (p && typeof p === "object" && PH_KIND.hasOwnProperty(p.kind)) ? p.kind : ""; }
  function photoCaption(p) { return (p && typeof p === "object" && p.caption) ? String(p.caption) : ""; }
  function photoList(e) { return e && Array.isArray(e.photos) ? e.photos : []; }
  function photoLabel(p, long) { var k = photoKind(p); return [k ? (long ? PH_KIND_LONG : PH_KIND)[k] : "", photoCaption(p)].filter(Boolean).join(" · "); }

  var MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  var WDAYS = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
  function isoParts(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? [+m[1], +m[2], +m[3]] : null; }
  function dayNum(iso) { var p = isoParts(iso); return p ? Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000) : 0; }
  function isoFromUTC(d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function isoAddDays(iso, n) { var p = isoParts(iso); return p ? isoFromUTC(new Date(Date.UTC(p[0], p[1] - 1, p[2] + n))) : iso; }
  // Kalendermonate; der 31. wird auf das Monatsende gekürzt (31.05. minus 3 Monate = 28./29.02.).
  function isoAddMonths(iso, n) {
    var p = isoParts(iso); if (!p) return iso;
    var first = new Date(Date.UTC(p[0], p[1] - 1 + n, 1)), last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(p[2], last)); return isoFromUTC(first);
  }
  function monthsBetween(a, b) { var x = isoParts(a), y = isoParts(b); if (!x || !y) return 0; return (y[0] - x[0]) * 12 + (y[1] - x[1]) - (y[2] < x[2] ? 1 : 0); }
  function fmtIso(iso) { var p = isoParts(iso); return p ? pad(p[2]) + "." + pad(p[1]) + "." + p[0] : ""; }
  function wdIso(iso) { var p = isoParts(iso); return p ? WDAYS[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] : ""; }
  function monthLabel(iso) { var p = isoParts(iso); return p ? MONTHS[p[1] - 1] + " " + p[0] : ""; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  // „vor 3 Tagen“, „vor 2 Wochen“, „vor 3 Monaten“ (auf Kalendertage bezogen)
  function agoTxt(iso) {
    var today = isoDay(Date.now()), d = dayNum(today) - dayNum(iso);
    if (d < 0) return "in " + plural(-d, "Tag", "Tagen");
    if (d === 0) return "heute";
    if (d === 1) return "gestern";
    if (d < 7) return "vor " + d + " Tagen";
    var m = monthsBetween(iso, today);
    if (m < 1) return "vor " + plural(Math.floor(d / 7), "Woche", "Wochen");
    if (m < 12) return "vor " + plural(m, "Monat", "Monaten");
    return "vor " + plural(Math.floor(m / 12), "Jahr", "Jahren");
  }
  // Abstand zum ersten Bild im Vergleich: Tage unter 4 Wochen, Wochen unter 3 Monaten, danach Monate.
  function sinceTxt(fromIso, toIso, first) {
    if (first) return "Ausgangsbild";
    var d = dayNum(toIso) - dayNum(fromIso);
    if (d <= 0) return "am selben Tag";
    if (d < 28) return "nach " + plural(d, "Tag", "Tagen");
    var m = monthsBetween(fromIso, toIso);
    if (m < 3) return "nach " + plural(Math.max(4, Math.round(d / 7)), "Woche", "Wochen");
    if (m < 24) return "nach " + plural(m, "Monat", "Monaten");
    return "nach " + plural(Math.floor(m / 12), "Jahr", "Jahren");
  }
  function periodTxt(list) {
    var a = list[0].date, b = list[list.length - 1].date, d = dayNum(b) - dayNum(a);
    return "Zeitraum: " + (d > 0 ? fmtIso(a) + " bis " + fmtIso(b) + ", " + plural(d, "Tag", "Tage") : fmtIso(a) + ", gleicher Tag");
  }
  // Zeitpunkt eines Eintrags für die Chronik: Behandlungsdatum (mit Uhrzeit der Eintragung), sonst Eintragungszeit.
  function entryTs(e) {
    var p = isoParts(e.date), c = new Date(e.createdAt || 0);
    if (!p || e.date === isoDay(e.createdAt || 0)) return e.createdAt || 0;
    return new Date(p[0], p[1] - 1, p[2], c.getHours(), c.getMinutes(), c.getSeconds()).getTime();
  }
  function entryDay(d) { return d.kind === "treatment" && isoParts(d.date) ? d.date : isoDay(d.createdAt || 0); }
  // „Kontrolle“ ist kein Behandlungsbereich. Kontrollen ohne Bereich übernehmen den Bereich der letzten Behandlung davor.
  function realAreas(e) { return (e.areas || []).filter(function (a) { return a !== "Kontrolle"; }); }
  function isRealTreatment(e) { return !!(e.product || e.amount || (realAreas(e).length && (e.areas || []).indexOf("Kontrolle") < 0)); }
  function nameInitials(n) { var pr = String(n || "").trim().split(/\s+/); return initials({ first: pr[0] || "", last: pr.length > 1 ? pr[pr.length - 1] : "" }); }
  // Neue Funktionen dürfen die App nie lahmlegen: bei einem Fehler wird die einfache Ansicht gezeigt.
  function safeRender(fn, fallback) {
    try { return fn(); } catch (e) {
      if (window.console) console.error("Ansicht fehlgeschlagen", e);
      try { return fallback ? fallback() : ""; } catch (e2) { return '<div class="card"><p>Diese Ansicht konnte nicht geladen werden.</p></div>'; }
    }
  }
  function guard(fn) { try { fn(); } catch (e) { if (window.console) console.error(e); toast("Das hat nicht geklappt. Bitte noch einmal versuchen."); } }

  // ---------------------------------------------------------------- signature / drawing pad
  function Pad(canvas, opts) {
    opts = opts || {};
    var ctx = null, drawing = false, last = null, self = this, active = null, cssW = 0, cssH = 0, rzT = null;
    this.dirty = false; this.el = canvas;
    function size() {
      var r = canvas.getBoundingClientRect(), w = r.width || cssW, h = r.height || cssH, dpr = window.devicePixelRatio || 1;
      if (!w || !h) return;
      var old = self.dirty ? canvas.toDataURL() : null;
      cssW = w; cssH = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = opts.width || 2.4; ctx.strokeStyle = opts.color || "#1f1a1c";
      if (opts.bg) opts.bg(ctx, w, h);
      if (old) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, w, h); }; im.src = old; }
    }
    // Finger auf die Bitmap abbilden, auch wenn sich die CSS-Größe geändert hat (Drehen des iPads).
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (r.width ? cssW / r.width : 1), y: (e.clientY - r.top) * (r.height ? cssH / r.height : 1) }; }
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (active !== null || (e.pointerType === "mouse" && e.button !== 0)) return;   // nur ein Finger, Handballen ignorieren
      if (!ctx) { size(); if (!ctx) return; }
      var ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur();
      active = e.pointerId; drawing = true; last = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      ctx.beginPath(); ctx.arc(last.x, last.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      self.dirty = true; if (opts.onchange) opts.onchange();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing || e.pointerId !== active) return;
      e.preventDefault(); var p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p;
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { canvas.addEventListener(ev, function (e) { if (e.pointerId === active) { active = null; drawing = false; } }); });
    function onResize() {
      if (!document.body.contains(canvas)) { window.removeEventListener("resize", onResize); window.removeEventListener("orientationchange", onResize); return; }
      clearTimeout(rzT);
      rzT = setTimeout(function () { var w = canvas.getBoundingClientRect().width; if (w && Math.abs(w - cssW) > 1 && !self.dirty) size(); }, 200);
    }
    window.addEventListener("resize", onResize); window.addEventListener("orientationchange", onResize);
    this.clear = function () { self.dirty = false; size(); if (opts.onchange) opts.onchange(); };
    this.data = function () { return self.dirty ? canvas.toDataURL("image/png") : null; };
    size();
  }
  // Unterschriftsfeld: Rahmen wird mauve und der Hinweis verschwindet, sobald unterschrieben wurde.
  function sigPad(id) {
    var c = $("#" + id), pad = null;
    pad = new Pad(c, { onchange: function () { if (c.parentNode) c.parentNode.classList.toggle("signed", !!(pad && pad.dirty)); } });
    return pad;
  }

  function faceBg(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b9aab0"; ctx.lineWidth = 1.6;
    function face(cx, cy, s, profile) {
      ctx.beginPath();
      if (!profile) {
        ctx.ellipse(cx, cy, 0.36 * s, 0.48 * s, 0, 0, Math.PI * 2); ctx.stroke();
        [-1, 1].forEach(function (k) {
          ctx.beginPath(); ctx.moveTo(cx + k * 0.08 * s, cy - 0.16 * s); ctx.quadraticCurveTo(cx + k * 0.17 * s, cy - 0.21 * s, cx + k * 0.26 * s, cy - 0.15 * s); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(cx + k * 0.16 * s, cy - 0.08 * s, 0.065 * s, 0.028 * s, 0, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.beginPath(); ctx.moveTo(cx - 0.02 * s, cy - 0.06 * s); ctx.lineTo(cx - 0.05 * s, cy + 0.1 * s); ctx.quadraticCurveTo(cx, cy + 0.14 * s, cx + 0.05 * s, cy + 0.1 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 0.11 * s, cy + 0.24 * s); ctx.quadraticCurveTo(cx - 0.05 * s, cy + 0.19 * s, cx, cy + 0.215 * s); ctx.quadraticCurveTo(cx + 0.05 * s, cy + 0.19 * s, cx + 0.11 * s, cy + 0.24 * s); ctx.quadraticCurveTo(cx, cy + 0.3 * s, cx - 0.11 * s, cy + 0.24 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 0.11 * s, cy + 0.24 * s); ctx.lineTo(cx + 0.11 * s, cy + 0.24 * s); ctx.stroke();
      } else {
        var x = cx - 0.12 * s;
        ctx.moveTo(x + 0.05 * s, cy - 0.47 * s);
        ctx.bezierCurveTo(x + 0.32 * s, cy - 0.5 * s, x + 0.28 * s, cy - 0.25 * s, x + 0.27 * s, cy - 0.12 * s);
        ctx.lineTo(x + 0.36 * s, cy + 0.06 * s); ctx.lineTo(x + 0.28 * s, cy + 0.1 * s);
        ctx.quadraticCurveTo(x + 0.31 * s, cy + 0.17 * s, x + 0.29 * s, cy + 0.2 * s);
        ctx.quadraticCurveTo(x + 0.32 * s, cy + 0.24 * s, x + 0.28 * s, cy + 0.27 * s);
        ctx.quadraticCurveTo(x + 0.3 * s, cy + 0.38 * s, x + 0.2 * s, cy + 0.42 * s);
        ctx.quadraticCurveTo(x + 0.05 * s, cy + 0.45 * s, x - 0.08 * s, cy + 0.3 * s);
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x - 0.06 * s, cy + 0.02 * s, 0.05 * s, 0.09 * s, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 0.15 * s, cy - 0.15 * s); ctx.quadraticCurveTo(x + 0.21 * s, cy - 0.18 * s, x + 0.26 * s, cy - 0.15 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 0.18 * s, cy - 0.08 * s); ctx.lineTo(x + 0.25 * s, cy - 0.08 * s); ctx.stroke();
      }
    }
    var s = Math.min(h * 0.95, w * 0.47);
    face(w * 0.27, h * 0.5, s, false);
    face(w * 0.75, h * 0.5, s, true);
    ctx.restore();
  }

  // ---------------------------------------------------------------- state
  var S = {
    mode: "kiosk",       // kiosk | patient | panel
    view: "feed",        // feed | patients | profile | open | backup | settings
    pid: null, tab: "timeline", q: "", cmp: [],
    cmpOpen: false,      // Vergleich sichtbar (cmp = Schlüssel "eintragId:index" in Auswahlreihenfolge, max. 4)
    cmpRange: null,      // Schnellauswahl, aus der der Vergleich stammt (last, m1, m3, m6, y1, all)
    cmpMode: "side",     // side | slider
    phArea: "",          // Bereichsfilter im Fotos-Tab ("" = alle)
    slPos: 50,           // Position der Trennlinie im Schieberegler (%)
    faceCmp: false,      // Gesichtsproportionen im Vergleich anzeigen (face.js)
    fullEl: null, lbEl: null, lbPhoto: null,
    lang: "de",          // Sprache der Patientenseite
    resumePid: null,     // nach PIN zurück zu diesem Profil (nie direkt aus dem Patientenmodus)
    flow: null           // stan formularza pacjentki
  };

  function clearPrint() { $("#print").innerHTML = ""; document.body.classList.remove("printing"); }
  function resetCmp() { S.cmp = []; S.cmpOpen = false; S.cmpRange = null; S.faceCmp = false; if (FX) FX.queue = []; }   // wartende Analysen des Vergleichs verwerfen
  function render() {
    var app = $("#app");
    if (S.mode !== "panel") clearPrint();
    if (S.fullEl && !(S.mode === "panel" && S.view === "profile" && S.tab === "photos")) closeCmpFull();
    document.documentElement.lang = S.mode === "panel" ? "de" : T("htmlLang");
    if (S.mode === "kiosk") app.innerHTML = kioskView();
    else if (S.mode === "patient") app.innerHTML = patientFlowView();
    else app.innerHTML = panelView();
    afterRender();
    window.scrollTo(0, S._keepScroll ? window.scrollY : 0);
    S._keepScroll = false;
    saveDraft();
  }
  var afterHooks = [];
  function after(fn) { afterHooks.push(fn); }
  function afterRender() { var h = afterHooks; afterHooks = []; h.forEach(function (f) { f(); }); }

  // Patientenmodus -> Kiosk. Der Praxisbereich ist nur über die PIN erreichbar.
  function goKiosk() {
    S.mode = "kiosk"; S.pid = null; S.flow = null; S.returnPanel = false; S.lang = "de";
    closeModal(); clearDraft();
    closeLightbox(); closeCmpFull(); resetCmp(); S.phArea = ""; FX.queue = []; FX.lines = true;
    $all(".lightbox,.cmpFull").forEach(function (x) { x.remove(); });
    render();
  }
  function enterPanel() {
    S.mode = "panel"; S.lang = "de";
    if (S.resumePid && patient(S.resumePid)) { S.view = "profile"; S.pid = S.resumePid; S.tab = "info"; S.anVer = null; resetCmp(); S.phArea = ""; }
    else { S.view = "feed"; S.pid = null; }
    S.resumePid = null; lastAct = Date.now(); render();
  }

  // ---------------------------------------------------------------- Entwurf des Fragebogens (übersteht ein Neuladen, 20 Min.)
  function saveDraft() {
    try {
      if (S.mode === "patient" && S.flow && STEPS[S.flow.step] !== "done") sessionStorage.setItem("abDraft", JSON.stringify({ t: Date.now(), lang: S.lang, flow: S.flow }));
      else sessionStorage.removeItem("abDraft");
    } catch (e) { /* privater Modus o. ä. */ }
  }
  function clearDraft() { try { sessionStorage.removeItem("abDraft"); } catch (e) { /* ignore */ } }
  function loadDraft() {
    try {
      var d = JSON.parse(sessionStorage.getItem("abDraft") || "null");
      sessionStorage.removeItem("abDraft");
      if (!d || !d.flow || Date.now() - d.t > 20 * 60000) return false;
      var f = d.flow; f.step = Math.min(f.step, STEPS.indexOf("sign")); f.err = "";
      S.flow = f; S.lang = LANGS.indexOf(d.lang) >= 0 ? d.lang : "de"; S.returnPanel = false; S.mode = "patient";
      return true;
    } catch (e) { return false; }
  }
  var draftT = null;
  function draftSoon() { clearTimeout(draftT); draftT = setTimeout(function () { if (S.mode === "patient" && S.flow) { collectFlow(); saveDraft(); } }, 500); }

  // ---------------------------------------------------------------- KIOSK (ekran startowy na tablecie)
  function langPicker(mini) {
    return '<div class="langPick' + (mini ? " mini" : "") + '" role="group" aria-label="' + esc(T("chooseLanguage")) + '">' + LANGS.map(function (l) {
      return '<button class="' + (S.lang === l ? "on" : "") + '" data-a="setLang" data-v="' + l + '" lang="' + l + '">' + (mini ? l.toUpperCase() : esc(TL(l, "langName"))) + '</button>';
    }).join("") + '</div>';
  }
  function kioskView() {
    return '<div class="kiosk kioskHome"><div class="khero">' +
      '<div class="mark">a</div><div class="kname">' + esc(C.practice.name) + '</div>' +
      '<h1>' + esc(T("welcomeShort")) + '</h1>' +
      '<p class="klead">' + esc(T("welcomeLead")) + '</p>' +
      langPicker(false) + '<br>' +
      '<button class="btn primary big kstart" data-a="startPatient">' + esc(T("startQuestionnaire")) + ' ' + I.arrow + '</button>' +
      '<ul class="ktrust"><li>' + I.doc + esc(T("trustTime")) + '</li><li>' + I.lock + esc(T("trustPrivate")) + '</li><li>' + I.sign + esc(T("trustSign")) + '</li></ul></div>' +
      '<div class="kfoot"><span>' + esc(C.practice.address) + '</span><button class="kpanel" data-a="openPanel">' + I.lock + esc(T("practiceArea")) + '</button></div></div>';
  }

  // ---------------------------------------------------------------- PATIENT FLOW
  var STEPS = ["person", "health", "info", "photos", "privacy", "sign", "done"];

  function startFlow(pid) {
    var p = pid ? patient(pid) : null, an = pid ? latestAnamnesis(pid) : null, fc = pid ? photoConsent(pid) : null;
    if (p) S.lang = LANGS.indexOf(p.lang) >= 0 ? p.lang : "de";
    var person = p ? JSON.parse(JSON.stringify(p)) : { first: "", last: "", dob: "", sex: "", street: "", zip: "", city: "", phone: "", email: "", height: "", weight: "" };
    delete person.avatar;   // bleibt im Profil, wird beim Speichern übernommen
    S.flow = {
      step: 0, pid: pid || null, update: !!pid, person: person, dobRaw: null,
      answers: an ? JSON.parse(JSON.stringify(an.answers)) : {},
      questions: "", photoDoc: fc ? !!fc.doc : false, photoPub: fc ? (fc.pub || "nein") : "nein", privacy: false, confirm: [false, false], err: ""
    };
    if (FX) FX.queue = [];   // keine Gesichtsanalyse im Hintergrund, während die Patientin ausfüllt
    S.mode = "patient"; S._stepAt = 0; render();
  }

  function patientFlowView() {
    var f = S.flow, st = STEPS[f.step], body = "";
    if (st === "person") body = stepPerson(f);
    if (st === "health") body = stepHealth(f);
    if (st === "info") body = stepInfo(f);
    if (st === "photos") body = stepPhotos(f);
    if (st === "privacy") body = stepPrivacy(f);
    if (st === "sign") body = stepSign(f);
    if (st === "done") body = stepDone(f);
    var titles = T("stepTitles"), short = T("stepShort");
    var head = '<div class="kioskHead"><button class="logo" data-a="noop"><span class="mark">a</span><span class="word">' + esc(C.practice.name) + '</span></button><div class="headR">' +
      (st !== "sign" && st !== "done" ? langPicker(true) : "") +
      (st !== "done" ? '<button class="btn" data-a="abortFlow">' + esc(T("cancel")) + '</button>' : "") + '</div></div>';
    var prog = st !== "done" ? '<div class="stepper">' + STEPS.slice(0, -1).map(function (k, i) {
      var cls = i < f.step ? "done" : (i === f.step ? "cur" : "");
      return '<div class="st ' + cls + '"><span class="dot">' + (i < f.step ? I.check : (i + 1)) + '</span><span class="lbl">' + esc(short[k] || "") + '</span></div>';
    }).join("") + '</div>' : "";
    var foot = st !== "done" ? '<div class="kioskFoot"><div class="inner">' +
      (f.step > 0 ? '<button class="btn big" data-a="flowBack">' + esc(T("back")) + '</button>' : '<span></span>') +
      '<button class="btn primary big" data-a="flowNext">' + esc(st === "sign" ? T("submit") : T("next")) + '</button></div></div>' : "";
    return '<div class="kiosk">' + head + '<div class="kioskBody">' + prog +
      (st !== "done" ? '<div class="stepTitle">' + esc(titles[st]) + '</div>' : "") +
      (f.err ? '<div class="err">' + esc(f.err) + '</div>' : "") + body + '</div>' + foot + '</div>';
  }
  // Fehler im Unterschriftsschritt ohne Neuaufbau anzeigen (sonst wäre die Unterschrift weg).
  function showFlowErr(msg) {
    var e1 = $(".kioskBody > .err");
    if (!e1) { e1 = document.createElement("div"); e1.className = "err"; var t = $(".stepTitle"); if (t) t.insertAdjacentElement("afterend", e1); else $(".kioskBody").insertAdjacentElement("afterbegin", e1); }
    e1.textContent = msg; e1.scrollIntoView({ block: "center" });
  }

  var AC_NAME = 'autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false"';
  var AC_MAIL = 'autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"';
  function inp(name, label, val, type, req, extra) {
    return '<div class="fld"><label class="f ' + (req ? "req" : "") + '" for="f_' + name + '">' + esc(label) + '</label><input class="i" id="f_' + name + '" data-f="' + name + '" type="' + (type || "text") + '" value="' + esc(val) + '" ' + (extra || "") + '></div>';
  }
  function stepPerson(f) {
    var p = f.person, sx = T("sexOptions");
    return '<p class="stepSub">' + esc(f.update ? T("personSubUpdate") : T("personSubNew")) + '</p>' +
      '<div class="card">' +
      '<div class="row">' + inp("first", T("labelFirstName"), p.first, "text", 1, AC_NAME) + inp("last", T("labelLastName"), p.last, "text", 1, AC_NAME) + '</div>' +
      '<div class="row">' + inp("dobTxt", T("labelDob"), f.dobRaw != null ? f.dobRaw : (p.dob ? fmtDate(p.dob) : ""), "text", 1, 'inputmode="numeric" placeholder="' + esc(T("dobPlaceholder")) + '" maxlength="10" autocomplete="off" autocorrect="off" spellcheck="false"') +
      '<div class="fld"><label class="f" for="f_sex">' + esc(T("labelSex")) + '</label><select class="i" id="f_sex" data-f="sex"><option value=""></option>' +
      ["weiblich", "männlich", "divers"].map(function (o) { return '<option value="' + o + '"' + (p.sex === o ? " selected" : "") + '>' + esc(sx[o] || o) + '</option>'; }).join("") + '</select></div></div>' +
      inp("street", T("labelStreet"), p.street, "text", 1, AC_NAME) +
      '<div class="row rowZip">' + inp("zip", T("labelZip"), p.zip, "text", 1, 'inputmode="numeric" autocomplete="off" autocorrect="off"') + inp("city", T("labelCity"), p.city, "text", 1, AC_NAME) + '</div>' +
      '<div class="row">' + inp("phone", T("labelPhone"), p.phone, "tel", 1, 'autocomplete="off"') + inp("email", T("labelEmail"), p.email, "email", 1, AC_MAIL) + '</div>' +
      '<div class="row">' + inp("height", T("labelHeight"), p.height, "text", 0, 'inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off"') + inp("weight", T("labelWeight"), p.weight, "text", 0, 'inputmode="decimal" maxlength="5" autocomplete="off"') + '</div>' +
      '</div>';
  }
  function needsDesc(q, a) { return !!(q.d && a && a.a === "j" && !(a.d || "").trim()); }
  function stepHealth(f) {
    var women = f.person.sex !== "männlich", pc = PC(), n = 0;
    return '<p class="stepSub">' + esc(T("healthSub")) + '</p><div class="card">' +
      C.questions.filter(function (q) { return women || !q.women; }).map(function (q) {
        var pq = findQ(pc, q.id) || q, a = f.answers[q.id] || {};
        var miss = !!f.err && (!a.a || needsDesc(q, a));
        n++;
        return '<div class="q' + (miss ? " missing" : "") + '" id="' + q.id + '"><div class="qt">' + n + '. ' + esc(pq.t) + '</div>' + (pq.h ? '<div class="qh">' + esc(pq.h) + '</div>' : "") +
          '<div class="yn"><button class="n ' + (a.a === "n" ? "on" : "") + '" data-a="yn" data-q="' + q.id + '" data-v="n">' + esc(T("answerNo")) + '</button><button class="j ' + (a.a === "j" ? "on" : "") + '" data-a="yn" data-q="' + q.id + '" data-v="j">' + esc(T("answerYes")) + '</button></div>' +
          (a.a === "j" && q.d ? '<label class="f" for="d_' + q.id + '">' + esc(pq.d || q.d) + '</label><textarea class="i" id="d_' + q.id + '" data-ans="' + q.id + '" autocorrect="off" spellcheck="false">' + esc(a.d || "") + '</textarea>' : "") +
          '</div>';
      }).join("") + '</div>';
  }
  function stepInfo(f) {
    return '<div class="card prose">' + fillerInfo(S.lang) + '</div>' +
      '<div class="card"><h3>' + esc(T("infoQuestionsTitle")) + '</h3><textarea class="i" data-f2="questions" placeholder="' + esc(T("infoQuestionsPlaceholder")) + '">' + esc(f.questions) + '</textarea></div>';
  }
  function stepPhotos(f) {
    var pc = PC();
    return '<div class="card"><h3>' + esc(T("photosDocTitle")) + '</h3><p>' + esc(pc.photoDocText) + '</p>' +
      '<label class="check"><input type="checkbox" data-c="photoDoc" ' + (f.photoDoc ? "checked" : "") + '><span>' + esc(pc.photoDocCheck) + '</span></label></div>' +
      '<div class="card"><h3>' + esc(T("photosPubTitle")) + '</h3><p>' + esc(pc.photoPubIntro) + '</p>' +
      pc.photoPubOptions.map(function (o) { return '<label class="radio ' + (f.photoPub === o.v ? "on" : "") + '"><input type="radio" name="pub" data-r="photoPub" value="' + o.v + '" ' + (f.photoPub === o.v ? "checked" : "") + '><span>' + esc(o.t) + '</span></label>'; }).join("") + '</div>';
  }
  function stepPrivacy(f) {
    return '<div class="card prose">' + privacyText(S.lang) + '</div>' +
      '<div class="card"><label class="check"><input type="checkbox" data-c="privacy" ' + (f.privacy ? "checked" : "") + '><span>' + esc(T("privacyCheck")) + '</span></label></div>';
  }
  function stepSign(f) {
    after(function () { S.sigPad = sigPad("sigP"); });
    var women = f.person.sex !== "männlich", pc = PC(), pv = T("pubValues");
    var yes = C.questions.filter(function (q) { return (women || !q.women) && (f.answers[q.id] || {}).a === "j"; });
    return '<div class="card"><h3>' + esc(T("summaryTitle")) + '</h3><dl class="meta"><dt>' + esc(T("summaryName")) + '</dt><dd>' + esc(fullName(f.person)) + '</dd><dt>' + esc(T("summaryDob")) + '</dt><dd>' + (f.person.dob ? fmtDate(f.person.dob) : "") + '</dd>' +
      '<dt>' + esc(T("summaryHealth")) + '</dt><dd>' + esc(yes.length ? (yes.length === 1 ? T("summaryYesOne") : T("summaryYesCount", { n: yes.length })) : T("summaryAllNo")) + '</dd>' +
      '<dt>' + esc(T("summaryPhotos")) + '</dt><dd>' + esc(f.photoDoc ? T("summaryPhotoDocYes") : T("summaryPhotoDocNo")) + '<br>' + esc(T("summaryPhotoPub", { pub: (pv && pv[f.photoPub]) || f.photoPub })) + '</dd></dl></div>' +
      '<div class="card"><p>' + esc(T("signCovers")) + '</p>' +
      pc.anamnesisConfirm.map(function (t, i) { return '<label class="check"><input type="checkbox" data-ci="' + i + '" ' + (f.confirm[i] ? "checked" : "") + '><span>' + esc(t) + '</span></label>'; }).join("") +
      '<label class="f">' + esc(T("signatureLabel")) + '</label><div class="sigwrap line"><canvas class="sig" id="sigP"></canvas><button class="btn sigclear" data-a="sigClear">' + esc(T("clear")) + '</button><span class="sighint">' + esc(T("signatureHint")) + '</span></div>' +
      '<div class="stepSub">' + esc((C.practice.city ? C.practice.city + ", " : "") + fmtDTL(Date.now())) + '</div></div>';
  }
  function stepDone() {
    return '<div class="welcome"><div class="mark">' + I.check + '</div><h1>' + esc(T("doneTitle")) + '</h1><p class="stepSub">' + esc(T("doneText")) + '</p>' +
      (C.practice.phone ? '<p class="stepSub">' + esc(T("doneContact", { tel: C.practice.phone })) + '</p>' : "") +
      '<div class="startBtns"><button class="btn primary big" data-a="toKiosk">' + esc(T("finish")) + '</button></div></div>';
  }

  function collectFlow() {
    var f = S.flow; if (!f) return;
    $all("[data-f]").forEach(function (el) { f.person[el.getAttribute("data-f")] = el.value.trim(); });
    $all("[data-ans]").forEach(function (el) { var q = el.getAttribute("data-ans"); f.answers[q] = f.answers[q] || {}; f.answers[q].d = el.value; });
    $all("[data-f2]").forEach(function (el) { f[el.getAttribute("data-f2")] = el.value; });
    if ("dobTxt" in f.person) {
      var raw = f.person.dobTxt; delete f.person.dobTxt;
      if (/^\d{8}$/.test(raw)) raw = raw.slice(0, 2) + "." + raw.slice(2, 4) + "." + raw.slice(4);
      f.dobRaw = raw;
      var m = /^(\d{1,2})[.\/ -](\d{1,2})[.\/ -](\d{4})$/.exec(raw), iso = m ? m[3] + "-" + pad(+m[2]) + "-" + pad(+m[1]) : "", dt = iso ? new Date(iso) : null;
      f.person.dob = (dt && !isNaN(dt) && dt.getUTCDate() === +m[1] && dt.getUTCMonth() + 1 === +m[2]) ? iso : "";
    }
  }
  function scrollToQ(id) { setTimeout(function () { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50); }
  function validateStep() {
    var f = S.flow, st = STEPS[f.step], p = f.person;
    if (st === "person") {
      if (f.dobRaw && !p.dob) return T("errDobFormat");
      var miss = ["first", "last", "dob", "street", "zip", "city", "phone", "email"].filter(function (k) { return !p[k]; });
      if (miss.length) return T("errRequired");
      var a = age(p.dob);
      if (a === null || a < 0 || a > 120) return T("errDob");
      if (a < 18) return T("errUnder18");
      if (!/^\S+@\S+\.\S+$/.test(p.email)) return T("errEmail");
    }
    if (st === "health") {
      var women = p.sex !== "männlich";
      var open = C.questions.filter(function (q) { return (women || !q.women) && !(f.answers[q.id] && f.answers[q.id].a); });
      if (open.length) { scrollToQ(open[0].id); return T("errOpenQuestions", { n: open.length }); }
      var noDesc = C.questions.filter(function (q) { return (women || !q.women) && needsDesc(q, f.answers[q.id]); });
      if (noDesc.length) { scrollToQ(noDesc[0].id); return T("errDescribeYes", { n: noDesc.length }); }
    }
    if (st === "privacy" && !f.privacy) return T("errPrivacy");
    if (st === "sign") {
      if (!f.confirm[0] || !f.confirm[1]) return T("errConfirmBoth");
      if (!S.sigPad || !S.sigPad.dirty) return T("errSignature");
    }
    return "";
  }
  var FIELD_DE = { first: "Vorname", last: "Nachname", dob: "Geburtsdatum", street: "Straße", zip: "PLZ", city: "Ort", phone: "Telefon", email: "E-Mail", height: "Größe", weight: "Gewicht", sex: "Geschlecht" };
  function submitFlow() {
    var f = S.flow, now = Date.now(), pid = f.pid || uid(), sig = S.sigPad.data(), lang = S.lang, pc = contentFor(lang);
    var old = f.pid ? patient(f.pid) : null;
    // Nur gültige Antworten speichern: Beschreibung nur bei Ja, Frauenfragen nur bei nicht männlich.
    var women = f.person.sex !== "männlich", answers = {};
    C.questions.forEach(function (q) {
      var a = f.answers[q.id]; if (!a || !a.a || (q.women && !women)) return;
      answers[q.id] = (a.a === "j" && a.d && a.d.trim()) ? { a: "j", d: a.d.trim() } : { a: a.a };
    });
    var p = Object.assign({}, old || {}, f.person, { id: pid, kind: "patient", lang: lang, createdAt: old ? old.createdAt : now, updatedAt: now });
    var qTexts = {}; C.questions.forEach(function (q) { qTexts[q.id] = q.t; });
    var an = { id: uid(), kind: "anamnesis", patientId: pid, createdAt: now, contentVersion: C.version, lang: lang, answers: answers, sex: f.person.sex, confirm: f.confirm.slice(), signature: sig, questions: f.questions, qTexts: qTexts, confirmTexts: C.anamnesisConfirm.slice() };
    if (lang !== "de") {
      var shown = {}; pc.questions.forEach(function (q) { shown[q.id] = q.t; });
      an.qTextsShown = shown; an.confirmTextsShown = pc.anamnesisConfirm.slice();
    }
    var ps = [DB.put(p), DB.put(an)];
    ps.push(DB.put({ id: uid(), kind: "consent", type: "fotos", patientId: pid, createdAt: now, contentVersion: C.version, lang: lang, doc: f.photoDoc, pub: f.photoPub, signature: sig }));
    ps.push(DB.put({ id: uid(), kind: "consent", type: "datenschutz", patientId: pid, createdAt: now, contentVersion: C.version, lang: lang, read: true, signature: sig }));
    ps.push(DB.put({ id: uid(), kind: "consent", type: "info", patientId: pid, createdAt: now, contentVersion: C.version, lang: lang, read: true, questions: f.questions || "" }));
    if (old) {
      var changed = ["first", "last", "dob", "street", "zip", "city", "phone", "email", "height", "weight", "sex"].filter(function (k) { return (old[k] || "") !== (f.person[k] || ""); });
      if (changed.length) ps.push(logEvent(pid, "Persönliche Angaben geändert: " + changed.map(function (k) { return FIELD_DE[k]; }).join(", ") + ". Vorher: " + changed.map(function (k) { return FIELD_DE[k] + " = " + (old[k] || "leer"); }).join("; ")));
    }
    return Promise.all(ps).then(function () { f.pid = pid; });
  }

  // ---------------------------------------------------------------- PANEL (Aestheticbook)
  function openCount() { return kind("patient").filter(function (p) { return !byPatient("treatconsent", p.id).length; }).length; }
  var SEARCH_ATTR = 'type="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"';
  function panelView() {
    var oc = openCount();
    var top = '<div class="topbar">' +
      '<button class="logo" data-a="nav" data-v="feed" aria-label="Startseite"><span class="mark">a</span><span class="word">aestheticbook</span></button>' +
      '<button class="iconbtn searchBtn" title="Patientin suchen" aria-label="Patientin suchen" data-a="nav" data-v="patients">' + I.search + '</button>' +
      '<div class="search">' + I.search + '<input id="q" placeholder="Patientin suchen" value="' + esc(S.q) + '" ' + SEARCH_ATTR + '></div>' +
      '<div class="topnav">' + navBtn("feed", I.home, "Startseite") + navBtn("patients", I.people, "Patientinnen") + navBtn("open", I.clip, "Offene Einwilligungen", oc) + navBtn("backup", I.save, "Datensicherung") + '</div>' +
      '<div class="topright"><button class="iconbtn" title="Neue Patientin am Tablet" aria-label="Neue Patientin am Tablet" data-a="startPatient">' + I.plus + '</button>' +
      '<button class="iconbtn" title="Offene Einwilligungen" aria-label="Offene Einwilligungen" data-a="nav" data-v="open">' + I.bell + (oc ? '<span class="badge">' + oc + '</span>' : "") + '</button>' +
      '<button class="iconbtn" title="Sperren" aria-label="Sperren" data-a="lock">' + I.lock + '</button></div></div>';
    var mob = '<div class="mobileNav">' + ["feed", "patients", "open", "backup"].map(function (v) { var ic = { feed: I.home, patients: I.people, open: I.clip, backup: I.save }[v]; return '<button class="' + (S.view === v ? "active" : "") + '" data-a="nav" data-v="' + v + '">' + ic + '</button>'; }).join("") + '</div>';
    var main = "";
    if (S.view === "feed") main = feedView();
    if (S.view === "patients") main = patientsView();
    if (S.view === "profile") main = profileView();
    if (S.view === "open") main = openView();
    if (S.view === "backup") main = backupView();
    if (S.view === "settings") main = settingsView();
    var rec = recentPatients();
    var left = '<div class="leftcol">' +
      '<div class="navitem" style="cursor:default"><span class="avatar" style="width:36px;height:36px">' + esc(practitionerInitials()) + '</span><span class="nt">' + esc(settings().practitioner) + '</span></div>' +
      side("feed", I.home, "Startseite", "c1") + side("patients", I.people, "Patientinnen", "c2") + side("open", I.clip, "Offene Einwilligungen", "c3", oc) +
      '<button class="navitem" data-a="startPatient"><span class="ni c4">' + I.tablet + '</span><span class="nt">Fragebogen am Tablet</span></button>' +
      side("backup", I.save, "Datensicherung", "c5") + side("settings", I.gear, "Einstellungen", "c6") +
      (rec.length ? '<div class="sectiontitle">Zuletzt angesehen</div>' + rec.map(function (p) { return '<button class="navitem" data-a="profile" data-id="' + p.id + '">' + avatarHtml(p, "") + '<span class="nt">' + esc(fullName(p)) + '</span></button>'; }).join("") : "") +
      '</div>';
    var right = '<div class="rightcol">' + statsCard() + roadmapCard("rmSide") + '</div>';
    if (S.view === "profile") return top + mob + '<div class="layout" style="grid-template-columns:minmax(0,980px)">' + main + '</div>';
    return top + mob + '<div class="layout">' + left + '<div>' + main + '</div>' + right + '</div>';
  }
  function navBtn(v, ic, title, n) { return '<button title="' + title + '" aria-label="' + title + '" class="' + (S.view === v || (v === "patients" && S.view === "profile") ? "active" : "") + '" data-a="nav" data-v="' + v + '">' + ic + (n ? '<span class="badge">' + n + '</span>' : "") + '</button>'; }
  function side(v, ic, t, c, n) { return '<button class="navitem ' + (S.view === v ? "active" : "") + '" data-a="nav" data-v="' + v + '"><span class="ni ' + (c || "") + '">' + ic + '</span><span class="nt">' + t + '</span>' + (n ? '<span class="cnt">' + n + '</span>' : "") + '</button>'; }
  function avClass(p) { var s = (p.first || "") + (p.last || ""), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return "av" + (h % 6); }
  function avatarHtml(p, cls) {
    return p.avatar ? '<span class="avatar ' + cls + '" style="background-image:url(' + p.avatar + ')"></span>' : '<span class="avatar ' + avClass(p) + ' ' + cls + '">' + esc(initials(p)) + '</span>';
  }
  function chipRed(q) { return '<span class="chip red">' + esc(shortQ(q)) + '</span>'; }
  function emptyState(icon, title, text, btn, bare) { return '<div class="' + (bare ? "" : "card ") + 'emptyState"><div class="esIc">' + icon + '</div><h3>' + title + '</h3><p>' + text + '</p>' + (btn || "") + '</div>'; }
  function standaloneNote() { return (isIOS() && !isStandalone()) ? '<div class="warnbox">Bitte Aestheticbook über das Symbol auf dem Home-Bildschirm öffnen. Daten im Safari-Tab sind getrennt und können von Safari gelöscht werden.</div>' : ""; }
  var recent = [];
  function recentPatients() { return recent.map(patient).filter(Boolean).slice(0, 6); }

  function statsCard() {
    var today = isoDay(Date.now());
    var t = kind("treatment").filter(function (e) { return e.date === today; }).length;
    var a = kind("anamnesis").filter(function (e) { return isoDay(e.createdAt) === today; }).length;
    return '<div class="card"><h3>Heute</h3><dl class="meta"><dt>Fragebögen</dt><dd><b>' + a + '</b></dd><dt>Behandlungen</dt><dd><b>' + t + '</b></dd><dt>Patientinnen gesamt</dt><dd><b>' + kind("patient").length + '</b></dd></dl></div>' +
      '<div class="card"><h3>Hinweis</h3><p style="font-size:14px;color:var(--muted);margin:0">Alle Daten liegen nur auf diesem Gerät. Bitte regelmäßig unter <a href="#" data-a="nav" data-v="backup">Datensicherung</a> eine Sicherung speichern.</p></div>';
  }
  // „Demnächst“: geplante Funktionen ohne Funktion (für Besucher sichtbar). Rechte Spalte, auf dem iPad im Feed.
  function roadmapCard(cls) {
    var items = [[I.sparkle, "KI-Hautanalyse", "Pigmentflecken, Rötungen und feine Linien auf Fotos erkennen und im Verlauf vergleichen."],
      [I.wand, "Behandlungssimulation", "Ein mögliches Ergebnis schon vor der Behandlung am Foto zeigen."],
      [I.mic, "Assistent für Behandlungsnotizen", "Notizen diktieren, der Assistent schlägt einen fertigen Eintrag vor."]];
    return '<div class="card roadmap ' + cls + '" aria-label="Demnächst verfügbar"><div class="rmHead"><h3>Demnächst</h3><span class="rmTag">In Entwicklung</span></div>' +
      '<p class="rmSub">Geplante Funktionen, noch nicht verfügbar.</p><ul class="rmList">' + items.map(function (x) {
        return '<li><span class="rmIc">' + x[0] + '</span><span class="rmTx"><b>' + x[1] + '</b><span>' + x[2] + '</span></span></li>';
      }).join("") + '</ul></div>';
  }
  function todayStrip() {
    var today = isoDay(Date.now());
    var a = kind("anamnesis").filter(function (e) { return isoDay(e.createdAt) === today; }).length;
    var t = kind("treatment").filter(function (e) { return e.date === today; }).length;
    var tiles = [["Fragebögen heute", a, I.tablet, "s1", 'data-a="nav" data-v="patients"'], ["Behandlungen heute", t, I.syringe, "s2", ""], ["Offene Einwilligungen", openCount(), I.sign, "s3", 'data-a="nav" data-v="open"'], ["Patientinnen", kind("patient").length, I.people, "s4", 'data-a="nav" data-v="patients"']];
    return '<div class="stories">' + tiles.map(function (x) {
      var tag = x[4] ? "button" : "div";
      return '<' + tag + ' class="story ' + x[3] + '" ' + x[4] + '><span class="sic">' + x[2] + '</span><b>' + x[1] + '</b><span>' + x[0] + '</span></' + tag + '>';
    }).join("") + '</div>';
  }

  // ---------- feed
  function feedItems(pid) {
    var items = [];
    DB.all.forEach(function (d) {
      if (pid && d.patientId !== pid) return;
      if (d.kind === "anamnesis" || d.kind === "treatment" || d.kind === "treatconsent" || d.kind === "log") items.push(d);
    });
    return items.sort(function (a, b) { return b.createdAt - a.createdAt; });
  }
  function feedView() {
    var items = feedItems();
    var composer = '<div class="card"><div class="composer"><span class="avatar">' + esc(practitionerInitials()) + '</span>' +
      '<button class="fake" data-a="newTreatmentPick">Was wurde heute behandelt?</button></div>' +
      '<div class="composerActions"><button data-a="startPatient"><span class="ci" style="color:#7a4b5c">' + I.tablet + '</span>Fragebogen</button><button data-a="newTreatmentPick"><span class="ci" style="color:#2e7d4f">' + I.syringe + '</span>Behandlung</button><button data-a="newTreatmentPick"><span class="ci" style="color:#b8945a">' + I.camera + '</span>Foto</button></div></div>';
    var top = standaloneNote() + todayStrip() + composer + roadmapCard("rmFeed");   // rmFeed nur, wenn die rechte Spalte fehlt (iPad)
    if (!items.length) return top + emptyState(I.tablet, "Noch keine Einträge", "Lassen Sie die erste Patientin den Fragebogen am Tablet ausfüllen.", '<button class="btn primary" data-a="startPatient">' + I.tablet + 'Fragebogen starten</button>');
    return top + items.slice(0, 60).map(function (d) { return postHtml(d, true); }).join("");
  }
  function photosHtml(d) {
    var list = photoList(d).map(function (p, i) { return { p: p, i: i, src: photoSrc(p) }; }).filter(function (x) { return x.src; });
    var n = list.length; if (!n) return "";
    return '<div class="photos ' + (n === 1 ? "one" : "n" + Math.min(n, 4)) + '">' + list.map(function (x) {
      var k = photoKind(x.p), lb = photoLabel(x.p);
      return '<div class="ph"><img src="' + esc(x.src) + '" alt="' + esc(lb) + '" data-a="zoom" data-id="' + d.id + '" data-i="' + x.i + '">' +
        (lb ? '<span class="phB' + (k ? " k-" + k : "") + '">' + esc(lb) + '</span>' : "") + '</div>';
    }).join("") + '</div>';
  }
  function postHtml(d, showPatient) {
    var p = patient(d.patientId); if (!p) return "";
    var who = showPatient ? '<a href="#" data-a="profile" data-id="' + p.id + '" style="color:inherit;text-decoration:none">' + esc(fullName(p)) + '</a>' : esc(fullName(p));
    var KB = { anamnesis: ["kA", I.doc], treatment: ["kT", I.syringe], treatconsent: ["kC", I.sign], log: ["kL", I.gear] }[d.kind] || ["kL", I.gear];
    var head = '<div class="postHead"><span class="avwrap">' + avatarHtml(p, "") + '<span class="kb ' + KB[0] + '">' + KB[1] + '</span></span><div><div class="who">' + who + ' <span style="font-weight:400;color:var(--muted)">' + verb(d) + '</span></div><div class="when" title="' + fmtDT(d.createdAt) + '">' + whenTxt(d.createdAt) + '</div></div></div>';
    var body = "";
    if (d.kind === "anamnesis") {
      var yes = yesQs(d);
      body = '<div class="chips">' + (yes.length ? yes.map(chipRed).join("") : '<span class="chip green">Keine Auffälligkeiten</span>') + '</div>' +
        (d.lang && d.lang !== "de" ? '<div class="facts">Ausgefüllt auf ' + LANG_DE[d.lang] + '</div>' : "");
    }
    if (d.kind === "treatment") {
      var facts = [d.product, d.lot ? "Charge " + d.lot : "", d.amount ? d.amount + " ml" : "", d.behandler].filter(Boolean).map(esc);
      var o = d.correctsId ? docById(d.correctsId) : null;
      var cr = DB.all.filter(function (x) { return x.correctsId === d.id; })[0];
      var tcd = d.consentId ? docById(d.consentId) : null;
      body = (d.notes ? '<p class="ptext">' + esc(d.notes) + '</p>' : "") +
        '<div class="chips">' + (d.areas || []).map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join("") + (d.date !== isoDay(d.createdAt) ? '<span class="chip">Behandlung am ' + fmtDate(d.date) + '</span>' : "") + '</div>' +
        (facts.length ? '<div class="facts">' + facts.join("<i>·</i>") + '</div>' : "") +
        (tcd ? '<div class="facts">Einwilligung vom ' + fmtDT(tcd.createdAt) + '</div>' : (d.noConsentAck ? '<div class="facts">Ohne Einwilligung in der App (bestätigt)</div>' : "")) +
        (d.correctsId ? '<div class="note">Korrektur zum Eintrag vom ' + (o ? fmtDT(o.createdAt) : "") + '</div>' : "") +
        (cr ? '<div class="note">Später korrigiert am ' + fmtDT(cr.createdAt) + '</div>' : "") +
        photosHtml(d);
    }
    if (d.kind === "treatconsent") {
      body = d.refused ? '<div class="chips"><span class="chip red">Behandlung abgelehnt</span></div>' :
        '<div class="chips">' + (d.areas || []).map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join("") + '</div>' +
        '<div class="facts">' + [d.product, d.cost ? d.cost + " €" : "", d.behandler ? "Aufgeklärt von " + d.behandler : ""].filter(Boolean).map(esc).join("<i>·</i>") + '</div>';
    }
    if (d.kind === "log") body = '<p style="margin:4px 0;color:var(--muted);font-size:14px">' + esc(d.text) + '</p>';
    var acts = "";
    if (d.kind !== "log" || showPatient) {
      var b = [];
      if (showPatient) b.push('<button data-a="profile" data-id="' + p.id + '">' + I.people + 'Akte öffnen</button>');
      else if (d.kind === "anamnesis") b.push('<button data-a="tab" data-v="info" data-id="' + d.id + '">' + I.doc + 'Ansehen</button>');
      else if (d.kind === "treatment" && photoList(d).length) b.push('<button data-a="cmpFrom" data-id="' + d.id + '">' + I.compare + 'Vergleichen</button>');
      if (d.kind === "treatment") b.push('<button data-a="correct" data-id="' + d.id + '">' + I.sign + 'Nachtrag</button>');
      if (d.kind === "treatconsent") b.push('<button data-a="viewConsent" data-id="' + d.id + '">' + I.doc + 'Dokument</button>');
      b.push('<button data-a="printPatient" data-id="' + p.id + '">' + I.print + 'PDF</button>');
      acts = '<div class="postActions">' + b.join("") + '</div>';
    }
    return '<div class="card post">' + head + body + acts + '</div>';
  }
  function verb(d) {
    if (d.kind === "anamnesis") return "hat den Gesundheitsfragebogen ausgefüllt";
    if (d.kind === "treatment") return "· Behandlung dokumentiert";
    if (d.kind === "treatconsent") return d.refused ? "· Ablehnung unterschrieben" : "· Aufklärung und Einwilligung unterschrieben";
    if (d.kind === "log") return d.type === "copy" ? "· Abschrift erstellt" : "· Änderung";
    return "";
  }
  function shortQ(q) {
    var m = { q1: "Medikamente", q2: "Blutverdünner", q3: "Allergie", q4: "Blutungsneigung", q5: "Herz/Kreislauf", q6: "Stoffwechsel", q7: "Schilddrüse", q8: "Autoimmun", q9: "Immunschwäche", q10: "Infektion", q11: "Herpes", q12: "Entzündung Gesicht", q13: "Narben/Keloid", q14: "Impfung/Infekt/Zahn", q15: "Implantate", q16: "Frühere Behandlungen", q17: "Kompl. Betäubung", q18: "Psyche", q19: "Raucherin", q20: "Weitere Hinweise", q21: "Schwanger", q22: "Stillt" };
    return m[q.id] || q.t || q.id;
  }

  // ---------- patients
  function filteredPatients() {
    var q = S.q.toLowerCase();
    return kind("patient").filter(function (p) { return !q || fullName(p).toLowerCase().indexOf(q) >= 0 || (p.phone || "").indexOf(q) >= 0 || (p.email || "").toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
  }
  function patientRows(list) {
    if (!list.length) return emptyState(I.people, "Keine Patientinnen gefunden", S.q ? "Bitte Suchbegriff prüfen." : "Lassen Sie die erste Patientin den Fragebogen am Tablet ausfüllen.", S.q ? "" : '<button class="btn primary" data-a="startPatient">' + I.tablet + 'Fragebogen starten</button>', true);
    return '<div class="pgrid">' + list.map(function (p) {
      var yes = yesQs(latestAnamnesis(p.id)).length;
      return '<button class="pcard" data-a="profile" data-id="' + p.id + '">' +
        (p.avatar ? '<span class="pimg" style="background-image:url(' + p.avatar + ')"></span>' : '<span class="pimg ' + avClass(p) + '">' + esc(initials(p)) + '</span>') +
        '<b>' + esc(fullName(p)) + '</b><span class="psub">' + (age(p.dob) != null ? age(p.dob) + " Jahre · " : "") + byPatient("treatment", p.id).length + ' Behandlung(en)</span>' +
        (yes ? '<span class="chip red">' + yes + ' × Ja</span>' : '<span class="chip green">OK</span>') + '</button>';
    }).join("") + '</div>';
  }
  function patientsView() {
    var list = filteredPatients();
    return '<div class="card"><h3>Patientinnen (<span id="pcount">' + list.length + '</span>)</h3>' +
      '<div class="search" style="display:flex;max-width:none;margin-bottom:12px">' + I.search + '<input id="q2" placeholder="Name, Telefon oder E-Mail" value="' + esc(S.q) + '" ' + SEARCH_ATTR + '></div>' +
      '<div id="plist">' + patientRows(list) + '</div></div>';
  }

  function openView() {
    var list = kind("patient").filter(function (p) { return !byPatient("treatconsent", p.id).length; });
    if (!list.length) return emptyState(I.check, "Alles erledigt", "Für alle Patientinnen liegt eine unterschriebene Einwilligung vor.");
    return '<div class="card"><h3>Offene Einwilligungen</h3><p style="color:var(--muted);margin-top:0">Fragebogen ausgefüllt, aber noch keine Aufklärung und Einwilligung unterschrieben.</p>' +
      list.map(function (p) {
        var an = latestAnamnesis(p.id);
        return '<div class="ver">' + avatarHtml(p, "") + '<span style="flex:1"><b>' + esc(fullName(p)) + '</b><br><span style="color:var(--muted);font-size:13px">Fragebogen ' + rel(an ? an.createdAt : p.createdAt) + '</span></span>' +
          '<button class="btn primary" data-a="newConsent" data-id="' + p.id + '">' + I.sign + 'Aufklärung</button></div>';
      }).join("") + '</div>';
  }

  // ---------- profile
  function profileView() {
    var p = patient(S.pid); if (!p) { S.view = "patients"; return patientsView(); }
    if (recent.indexOf(p.id) < 0) recent.unshift(p.id);
    var an = latestAnamnesis(p.id), yes = yesQs(an), photos = safeRender(function () { return allPhotos(p.id); }, function () { return []; }), tab = S.tab, content = "";
    if (tab === "timeline") content = safeRender(function () { return timelineTab(p); }, function () { return timelineSimple(p); });
    if (tab === "info") content = infoTab(p, an);
    if (tab === "photos") content = safeRender(function () { return photosTab(p, photos); }, function () { return photosSimple(photos); });
    if (tab === "docs") content = docsTab(p);
    var lc = byPatient("treatconsent", p.id)[0], la = lc && lc.anamnesisId ? docById(lc.anamnesisId) : null;
    var changedSince = !!(an && lc && (!la || answersDiffer(la, an)));
    var av = photoDocOk(p.id)
      ? '<label class="avbox">' + avatarHtml(p, "lg") + '<span class="avEdit">' + I.camera + '</span><input type="file" accept="image/*" data-a-change="avatar" style="display:none"></label>'
      : '<span class="avbox">' + avatarHtml(p, "lg") + '</span>';
    return '<div><div class="profileHead"><div class="cover" data-name="' + esc(C.practice.name) + '"></div>' +
      '<div class="profileInfo">' + av +
      '<div class="pname"><h1>' + esc(fullName(p)) + '</h1><div class="sub">' + (age(p.dob) != null ? age(p.dob) + " Jahre · " : "") + 'Patientin seit ' + fmtDate(p.createdAt) + ' · ' + byPatient("treatment", p.id).length + ' Behandlung(en)' + (p.lang && p.lang !== "de" ? " · Sprache: " + LANG_DE[p.lang] : "") + '</div>' +
      '<div class="chips">' + (an ? (yes.length ? yes.map(chipRed).join("") : '<span class="chip green">Fragebogen ohne Auffälligkeiten</span>') : '<span class="chip red">Kein Fragebogen</span>') +
      (changedSince ? '<span class="chip red">Fragebogen seit letzter Einwilligung geändert</span>' : "") + '</div></div>' +
      '<div class="profileBtns"><button class="btn primary" data-a="newTreatment">' + I.plus + 'Behandlung</button><button class="btn" data-a="newConsent" data-id="' + p.id + '">' + I.sign + 'Aufklärung</button></div></div></div>' +
      '<div class="tabsBar"><div class="tabs">' + [["timeline", "Chronik"], ["info", "Info und Gesundheit"], ["photos", "Fotos und Verlauf (" + photos.length + ")"], ["docs", "Dokumente"]].map(function (t) { return '<button class="' + (tab === t[0] ? "active" : "") + '" data-a="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join("") + '</div>' +
      '<div class="tabsActions"><button class="btn" data-a="updateAnamnesis" aria-label="Fragebogen am Tablet">' + I.tablet + '<span class="bl">Fragebogen</span></button><button class="btn" data-a="printPatient" aria-label="Akte als PDF">' + I.print + '<span class="bl">PDF</span></button></div></div>' +
      // Fotos-Tab über die volle Breite (Vergleich braucht Platz), sonst Steckbrief links und Inhalt rechts.
      (tab === "photos"
        ? '<div class="profileGrid full"><div class="pMain">' + content + '</div></div></div>'
        : '<div class="profileGrid"><div class="stickyCol">' + introCard(p, an) + photoMiniCard(photos) + '</div><div class="pMain">' + content + '</div></div></div>');
  }
  function introCard(p, an) {
    var consentF = photoConsent(p.id);
    return '<div class="card"><h3>Steckbrief</h3><dl class="meta">' +
      '<dt>Geboren</dt><dd>' + (p.dob ? fmtDate(p.dob) : "") + '</dd>' + (p.sex ? '<dt>Geschlecht</dt><dd>' + esc(p.sex) + '</dd>' : "") +
      '<dt>Telefon</dt><dd><a href="tel:' + esc(p.phone) + '">' + esc(p.phone) + '</a></dd><dt>E-Mail</dt><dd style="word-break:break-all">' + esc(p.email) + '</dd>' +
      '<dt>Adresse</dt><dd>' + esc(p.street) + ', ' + esc(p.zip) + ' ' + esc(p.city) + '</dd>' +
      (p.height ? '<dt>Größe/Gewicht</dt><dd>' + esc(p.height) + ' cm / ' + esc(p.weight) + ' kg</dd>' : "") +
      (p.lang && p.lang !== "de" ? '<dt>Sprache</dt><dd>' + LANG_DE[p.lang] + '</dd>' : "") +
      '<dt>Fragebogen</dt><dd>' + (an ? fmtDate(an.createdAt) : "fehlt") + '</dd>' +
      '<dt>Fotos</dt><dd>' + (consentF ? (consentF.doc ? "Dokumentation: ja" : "<b style='color:var(--red)'>Dokumentation: nein</b>") + "<br>Website: " + esc(pubLabel(consentF.pub)) : "keine Angabe") + '</dd></dl></div>';
  }
  function photoMiniCard(photos) {
    if (!photos.length) return "";
    return '<div class="card photoMini"><h3 style="display:flex;justify-content:space-between">Fotos <a href="#" data-a="tab" data-v="photos" style="font-size:14px;font-weight:500">Alle ansehen</a></h3><div class="thumbs" style="grid-template-columns:repeat(3,1fr)">' +
      photos.slice(0, 9).map(function (ph) { return '<div class="t"><img src="' + esc(ph.src) + '" alt="" data-a="zoom" data-id="' + ph.eid + '" data-i="' + ph.i + '"></div>'; }).join("") + '</div></div>';
  }
  function timelineComposer(p) {
    return '<div class="card"><div class="composer">' + avatarHtml(p, "") + '<button class="fake" data-a="newTreatment">Was wurde heute bei ' + esc(p.first) + ' gemacht?</button></div>' +
      '<div class="composerActions"><button data-a="newTreatment"><span class="ci" style="color:#2e7d4f">' + I.syringe + '</span>Behandlung</button><button data-a="newTreatment"><span class="ci" style="color:#b8945a">' + I.camera + '</span>Foto</button><button data-a="newConsent" data-id="' + p.id + '"><span class="ci" style="color:#7a4b5c">' + I.sign + '</span>Aufklärung</button></div></div>';
  }
  var TL_EMPTY = ["Noch keine Einträge", "Behandlungen, Fragebögen und Einwilligungen erscheinen hier in der Chronik."];
  // Einfache Chronik (Rückfall, falls die neue Darstellung scheitert)
  function timelineSimple(p) {
    var items = feedItems(p.id);
    return timelineComposer(p) + (items.length ? items.map(function (d) { return postHtml(d, false); }).join("") : emptyState(I.syringe, TL_EMPTY[0], TL_EMPTY[1]));
  }
  // Chronik wie eine Facebook-Timeline: neueste zuerst, Monatstrenner, Behandlungen als Beiträge mit Fotos.
  function timelineTab(p) {
    var items = feedItems(p.id).sort(function (a, b) { return tlTs(b) - tlTs(a); });
    if (!items.length) return timelineComposer(p) + emptyState(I.syringe, TL_EMPTY[0], TL_EMPTY[1]);
    var out = [], lastM = "";
    items.forEach(function (d) {
      var day = entryDay(d), m = day.slice(0, 7);
      if (m !== lastM) { out.push('<div class="tlMonth"><span>' + esc(monthLabel(day)) + '</span></div>'); lastM = m; }
      var body = d.kind === "treatment" ? tlTreatmentHtml(d) : postHtml(d, false);
      if (!body) return;
      var KB = { anamnesis: ["kA", I.doc], treatment: ["kT", I.syringe], treatconsent: ["kC", I.sign], log: ["kL", I.gear] }[d.kind] || ["kL", I.gear];
      out.push('<div class="tlItem"><span class="tlDot ' + KB[0] + '">' + KB[1] + '</span>' + body + '</div>');
    });
    return timelineComposer(p) + '<div class="tl">' + out.join("") + '</div>';
  }
  function tlTs(d) { return d.kind === "treatment" ? entryTs(d) : (d.createdAt || 0); }
  function tlTreatmentHtml(d) {
    var p = patient(d.patientId); if (!p) return "";
    var day = entryDay(d), late = day !== isoDay(d.createdAt || 0), by = d.behandler || "";
    var o = d.correctsId ? docById(d.correctsId) : null;
    var cr = DB.all.filter(function (x) { return x.correctsId === d.id; })[0];
    var tcd = d.consentId ? docById(d.consentId) : null;
    var title = d.correctsId ? "Korrektur" : isRealTreatment(d) ? "Behandlung" : (d.areas || []).indexOf("Kontrolle") >= 0 ? "Kontrolle" : photoList(d).length ? "Fotos" : "Eintrag";
    var head = '<div class="postHead"><span class="avatar" title="' + esc(by) + '">' + esc(nameInitials(by)) + '</span><div>' +
      '<div class="who">' + title + ' <span class="tlDay">· ' + wdIso(day) + ' ' + fmtIso(day) + '</span></div>' +
      '<div class="when" title="Eingetragen ' + fmtDT(d.createdAt) + '">' + agoTxt(day) + (late ? " · nachgetragen am " + fmtDT(d.createdAt) : " · " + timeStr(d.createdAt) + " Uhr") + (by ? " · " + esc(by) : "") + '</div></div></div>';
    var prod = [d.product ? esc(d.product) : "", d.lot ? "Charge " + esc(d.lot) : "", d.amount ? esc(d.amount) + " ml" : ""].filter(Boolean);
    var areas = d.areas || [];
    var body = (areas.length ? '<div class="chips">' + areas.map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join("") + '</div>' : "") +
      (prod.length ? '<div class="facts tlProd">' + prod.join("<i>·</i>") + '</div>' : "") +
      (d.notes ? '<p class="ptext">' + esc(d.notes) + '</p>' : "") +
      (tcd ? '<div class="facts">Einwilligung vom ' + fmtDT(tcd.createdAt) + '</div>' : (d.noConsentAck ? '<div class="facts">Ohne Einwilligung in der App (bestätigt)</div>' : "")) +
      (d.correctsId ? '<div class="note">Korrektur zum Eintrag vom ' + (o ? fmtDT(o.createdAt) : "") + '</div>' : "") +
      (cr ? '<div class="note">Später korrigiert am ' + fmtDT(cr.createdAt) + '</div>' : "") +
      photosHtml(d);
    var b = [];
    if (photoList(d).some(photoSrc)) b.push('<button data-a="cmpFrom" data-id="' + d.id + '">' + I.compare + 'Vergleichen</button>');
    b.push('<button data-a="correct" data-id="' + d.id + '">' + I.sign + 'Nachtrag</button>');
    b.push('<button data-a="printPatient" data-id="' + p.id + '">' + I.print + 'PDF</button>');
    return '<div class="card post tlPost">' + head + body + '<div class="postActions">' + b.join("") + '</div></div>';
  }
  function infoTab(p, an) {
    var versions = byPatient("anamnesis", p.id);
    if (!an) return emptyState(I.doc, "Noch kein Fragebogen", "Die Patientin füllt den Gesundheitsfragebogen am Tablet aus.", '<button class="btn primary" data-a="updateAnamnesis">' + I.tablet + 'Fragebogen am Tablet</button>');
    var showId = S.anVer || an.id, cur = versions.find(function (v) { return v.id === showId; }) || an;
    var prev = versions[versions.indexOf(cur) + 1];
    var women = cur.sex !== "männlich";
    return '<div class="card"><h3>Gesundheitsfragebogen vom ' + fmtDT(cur.createdAt) + (cur === an ? ' <span class="chip green">aktuell</span>' : ' <span class="chip">ältere Version</span>') + '</h3>' +
      (cur.lang && cur.lang !== "de" ? '<div class="note">Von der Patientin auf ' + LANG_DE[cur.lang] + ' ausgefüllt. Angezeigt werden die deutschen Fragetexte.</div>' : "") +
      '<table class="ans">' + C.questions.filter(function (q) { return women || !q.women; }).map(function (q) {
        var a = cur.answers[q.id] || {}, pa = prev ? (prev.answers[q.id] || {}) : null;
        var ad = ansDetail(a), pd = pa ? ansDetail(pa) : "";
        var changed = pa && ((pa.a || "") !== (a.a || "") || pd !== ad);
        return '<tr' + (changed ? ' style="background:#fff7e0"' : "") + '><td>' + esc(qText(cur, q)) + (ad ? '<div style="color:var(--red);margin-top:3px">' + esc(ad) + '</div>' : "") +
          (changed ? '<div style="font-size:12px;color:#8a6d00">geändert, vorher: ' + (pa.a === "j" ? "Ja" : pa.a === "n" ? "Nein" : "keine Angabe") + (pd ? " (" + esc(pd) + ")" : "") + '</div>' : "") +
          '</td><td style="color:' + (a.a === "j" ? "var(--red)" : "var(--green)") + '">' + (a.a === "j" ? "Ja" : a.a === "n" ? "Nein" : "") + '</td></tr>';
      }).join("") + '</table>' +
      (cur.questions ? '<div class="note"><b>Fragen der Patientin:</b> ' + esc(cur.questions) + '</div>' : "") +
      (cur.signature ? '<div style="margin-top:10px"><img src="' + cur.signature + '" alt="" style="height:70px"><div class="stepSub">Unterschrift Patientin</div></div>' : "") + '</div>' +
      '<div class="card"><h3>Versionen</h3><p class="stepSub" style="margin-top:0">Ältere Versionen bleiben unverändert gespeichert (§ 630f BGB). Änderungen gegenüber der Vorversion sind gelb markiert.</p>' +
      versions.map(function (v, i) { return '<div class="ver"><span>' + fmtDT(v.createdAt) + (i === 0 ? " · aktuell" : "") + '</span><button class="btn" data-a="anVer" data-id="' + v.id + '">' + (v.id === cur.id ? "angezeigt" : "ansehen") + '</button></div>'; }).join("") + '</div>';
  }
  // Alle Fotos einer Patientin, neueste zuerst, ohne Duplikate (ältere Korrekturen enthielten Kopien der Originalfotos).
  // Jedes Foto: src, eid, i, key, date, ts, pts (Zeitpunkt für die Sortierung), kind, caption, areas (des Eintrags),
  // eff (Bereiche für Filter und Vergleich, bei Kontrollen ohne Bereich von der Behandlung davor), product, notes ...
  function allPhotos(pid) {
    var out = [], seen = {}, eff = {}, last = [];
    var entries = byPatient("treatment", pid).slice().reverse();   // älteste Eintragung zuerst: Original gewinnt gegen Kopie
    entries.slice().sort(function (a, b) { return entryTs(a) - entryTs(b); }).forEach(function (e) {
      var ra = realAreas(e); eff[e.id] = ra.length ? ra : last.slice(); if (ra.length) last = ra;
    });
    entries.forEach(function (e) {
      var ets = entryTs(e), real = isRealTreatment(e), day = isoParts(e.date) ? e.date : isoDay(e.createdAt || 0);
      photoList(e).forEach(function (p, i) {
        var src = photoSrc(p); if (!src || seen[src]) return; seen[src] = 1;
        out.push({ src: src, eid: e.id, i: i, key: e.id + ":" + i, date: day, label: (e.areas || []).join(", "), ts: e.createdAt || 0, pts: ets + i,
          kind: photoKind(p), caption: photoCaption(p), areas: (e.areas || []).slice(), eff: eff[e.id] || [], product: e.product || "", amount: e.amount || "",
          notes: e.notes || "", behandler: e.behandler || "", real: real });
      });
    });
    return out.sort(function (a, b) { return (b.pts - a.pts) || (b.ts - a.ts); });
  }
  function chrono(list) { return list.slice().sort(function (a, b) { return (a.pts - b.pts) || (a.ts - b.ts); }); }
  function sameArea(a, b) { if (!a.eff.length || !b.eff.length) return true; return a.eff.some(function (x) { return b.eff.indexOf(x) >= 0; }); }
  function phFiltered(photos) { return S.phArea ? photos.filter(function (ph) { return ph.eff.indexOf(S.phArea) >= 0; }) : photos; }
  function areaList(photos) {
    var cnt = {}, order = [];
    photos.forEach(function (ph) { ph.eff.forEach(function (a) { if (!cnt[a]) { cnt[a] = 0; order.push(a); } cnt[a]++; }); });
    order.sort(function (a, b) { var x = C.treatments.indexOf(a), y = C.treatments.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    return order.map(function (a) { return [a, cnt[a]]; });
  }
  var RANGES = [["last", "Vorher/Nachher letzte Behandlung"], ["m1", "1 Monat"], ["m3", "3 Monate"], ["m6", "6 Monate"], ["y1", "1 Jahr"], ["all", "Gesamt"]];
  var RANGE_MONTHS = { m1: 1, m3: 3, m6: 6, y1: 12 };
  // Schnellauswahl: frühestes und spätestes Foto im Zeitraum (Bereichsfilter beachtet; ohne Filter derselbe Bereich wie das Bezugsfoto).
  function rangePair(photos, key) {
    var list = chrono(phFiltered(photos)); if (list.length < 2) return null;
    if (key === "last") {
      var reals = list.filter(function (ph) { return ph.real; });
      var ref = reals.length ? reals[reals.length - 1] : list[list.length - 1];
      var pool = list.filter(function (ph) { return sameArea(ph, ref); });
      var day = pool.filter(function (ph) { return ph.date === ref.date; });
      var before = day.filter(function (ph) { return ph.kind === "vorher"; })[0] ||
        pool.filter(function (ph) { return ph.kind === "vorher" && ph.date <= ref.date; }).pop() || day[0];
      var after = pool.filter(function (ph) { return ph.pts > before.pts; }).pop();
      return after ? [before, after] : null;
    }
    var anchor = list[list.length - 1];
    var same = list.filter(function (ph) { return sameArea(ph, anchor); });
    if (RANGE_MONTHS[key]) { var start = isoAddMonths(anchor.date, -RANGE_MONTHS[key]); same = same.filter(function (ph) { return ph.date >= start; }); }
    return same.length >= 2 && same[0] !== anchor ? [same[0], anchor] : null;
  }
  function cmpList(photos) { var sel = S.cmp || []; return chrono(photos.filter(function (ph) { return sel.indexOf(ph.key) >= 0; })); }
  // Fotos des aktuellen Vergleichs (chronologisch). Nur im Praxisbereich, nie im Kiosk.
  function cmpPhotos() { if (S.mode !== "panel" || S.view !== "profile" || !S.pid) return []; return cmpList(allPhotos(S.pid)); }
  function selTxt(n) { return n ? plural(n, "Foto", "Fotos") + " ausgewählt" : ""; }

  // Rückfall: einfaches Raster ohne Vergleich
  function photosSimple(photos) {
    return '<div class="card"><h3>Fotos</h3><div class="thumbs">' + photos.map(function (ph) { return '<div class="t"><img src="' + esc(ph.src) + '" alt="" data-a="zoom" data-id="' + ph.eid + '" data-i="' + ph.i + '"><span>' + fmtIso(ph.date) + '</span></div>'; }).join("") + '</div></div>';
  }
  function photosTab(p, photos) {
    if (!photos.length) return emptyState(I.photo, "Noch keine Fotos", "Fotos werden zusammen mit einer Behandlung gespeichert.", photoDocOk(p.id) ? '<button class="btn primary" data-a="newTreatment">' + I.camera + 'Behandlung mit Foto</button>' : '<p class="stepSub">Keine Einwilligung für Dokumentationsfotos.</p>');
    var areas = areaList(photos);
    if (S.phArea && !areas.some(function (a) { return a[0] === S.phArea; })) S.phArea = "";
    var keys = {}; photos.forEach(function (ph) { keys[ph.key] = 1; });
    S.cmp = (S.cmp || []).filter(function (k) { return keys[k]; });
    var sel = S.cmp, list = cmpList(photos), open = S.cmpOpen && list.length >= 2;
    if (!open) S.cmpOpen = false;
    var first = chrono(photos)[0];
    var tools = '<div class="card phTools"><div class="phHead"><h3>Fotos und Verlauf</h3><span class="stepSub">' + plural(photos.length, "Foto", "Fotos") + ' seit ' + fmtIso(first.date) + '</span></div>' +
      (areas.length ? '<div class="chips phAreas" role="group" aria-label="Bereich">' + [["", photos.length]].concat(areas).map(function (a) {
        return '<button class="chip' + (S.phArea === a[0] ? " sel" : "") + '" data-a="phArea" data-v="' + esc(a[0]) + '">' + esc(a[0] || "Alle") + ' <span class="cnum">' + a[1] + '</span></button>';
      }).join("") + '</div>' : "") +
      '<div class="rangeBtns" role="group" aria-label="Zeitraum vergleichen">' + RANGES.map(function (r) {
        var ok = !!rangePair(photos, r[0]);
        return '<button class="rb' + (open && S.cmpRange === r[0] ? " on" : "") + '" data-a="cmpRange" data-v="' + r[0] + '"' + (ok ? "" : ' disabled title="Zu wenige Fotos in diesem Zeitraum"') + '>' + r[1] + '</button>';
      }).join("") + '</div></div>';
    var groups = [];
    chrono(phFiltered(photos)).forEach(function (ph) { var g = groups[groups.length - 1]; if (!g || g.date !== ph.date) groups.push(g = { date: ph.date, items: [] }); g.items.push(ph); });
    groups.reverse();
    var album = '<div class="card album"><h3>Album</h3><p class="stepSub">Tippen Sie auf bis zu 4 Fotos und dann auf „Vergleichen“. Die Zahl zeigt die Reihenfolge der Auswahl.</p>' + groups.map(function (g) {
      var ar = []; g.items.forEach(function (ph) { ph.areas.forEach(function (a) { if (ar.indexOf(a) < 0) ar.push(a); }); });
      return '<div class="alDay"><div class="alDate"><b>' + wdIso(g.date) + ' ' + fmtIso(g.date) + '</b><span>' + agoTxt(g.date) + (ar.length ? " · " + esc(ar.join(", ")) : "") + '</span></div><div class="alGrid">' +
        g.items.map(function (ph) {
          var n = sel.indexOf(ph.key) + 1, lb = photoLabel(ph);
          return '<button class="alT' + (n ? " sel" : "") + '" data-a="cmpPick" data-k="' + esc(ph.key) + '" aria-pressed="' + (n ? "true" : "false") + '" aria-label="Foto vom ' + fmtIso(ph.date) + (lb ? ", " + esc(lb) : "") + '"><img src="' + esc(ph.src) + '" alt=""><span class="alNum">' + (n || "") + '</span>' +
            (lb ? '<span class="phB' + (ph.kind ? " k-" + ph.kind : "") + '">' + esc(lb) + '</span>' : "") + '</button>';
        }).join("") + '</div></div>';
    }).join("") + '</div>';
    var bar = '<div class="selBar' + (sel.length && !open ? "" : " hidden") + '" id="selBar"><span id="selCount">' + selTxt(sel.length) + '</span><button class="btn" data-a="cmpReset">Aufheben</button><button class="btn primary" id="selGo" data-a="cmpGo"' + (sel.length < 2 ? " disabled" : "") + '>' + I.compare + 'Vergleichen</button></div>';
    if (open) after(function () {
      var c = document.getElementById("cmpCard"); if (!c) return;
      if (S.cmpMode === "slider" && list.length === 2) initSlider(c);
      // „Mehr anzeigen“ nur, wenn die Notiz wirklich abgeschnitten ist
      $all(".cmpNote.clamp", c).forEach(function (n) {
        if (n.scrollHeight && n.scrollHeight <= n.clientHeight + 2) { n.classList.remove("clamp"); var b = n.nextElementSibling; if (b && b.getAttribute("data-a") === "cmpNote") b.parentNode.removeChild(b); }
      });
      faceHook("comparison", c, hookPhotos(list));
    });
    return tools + (open ? cmpCardHtml(list) : "") + album + bar;
  }

  // ---------- Vergleich (nebeneinander, Schieberegler, Vollbild, Druck)
  function cmpModeSeg(list, dark) {
    var two = list.length === 2, sl = S.cmpMode === "slider" && two;
    return '<div class="seg' + (dark ? " dark" : "") + '" role="group" aria-label="Ansicht"><button class="' + (sl ? "" : "on") + '" data-a="cmpMode" data-v="side">Nebeneinander</button>' +
      '<button class="' + (sl ? "on" : "") + '" data-a="cmpMode" data-v="slider"' + (two ? "" : ' disabled title="Nur bei genau 2 Fotos"') + '>Schieberegler</button></div>';
  }
  function cmpCellsHtml(list, full) {
    return '<div class="cmpGrid' + (full ? " cfGrid" : "") + ' c' + list.length + '">' + list.map(function (ph, i) {
      var rel = sinceTxt(list[0].date, ph.date, i === 0), k = ph.kind;
      var prod = [ph.product, ph.amount ? ph.amount + " ml" : ""].filter(Boolean).join(", ");
      var note = ph.notes || "", long = note.length > 90;
      return '<figure class="cmpCell"><div class="cmpImg"><img src="' + esc(ph.src) + '" alt=""' + (full ? "" : ' data-a="zoom" data-id="' + ph.eid + '" data-i="' + ph.i + '" data-from="cmp"') + '><span class="cmpRel">' + esc(rel) + '</span></div>' +
        '<div class="faceSlot" data-src-index="' + i + '"></div>' +   // Platzhalter für die Gesichtsanalyse (window.ABFace)
        '<figcaption><div class="cmpDate"><b>' + fmtIso(ph.date) + '</b>' + (k ? '<span class="kTag k-' + k + '">' + PH_KIND_LONG[k] + '</span>' : "") + '</div>' +
        (ph.caption ? '<div class="cmpCap">' + esc(ph.caption) + '</div>' : "") +
        (ph.areas.length ? '<div class="cmpMeta">' + esc(ph.areas.join(", ")) + '</div>' : "") +
        (!full && prod ? '<div class="cmpMeta">' + esc(prod) + '</div>' : "") +
        (!full && note ? '<div class="cmpNote' + (long ? " clamp" : "") + '">' + esc(note) + '</div>' + (long ? '<button class="linkBtn" data-a="cmpNote">Mehr anzeigen</button>' : "") : "") +
        '</figcaption></figure>';
    }).join("") + '</div>';
  }
  function cmpSliderHtml(list, full) {
    var a = list[0], b = list[1], pos = Math.max(0, Math.min(100, +S.slPos || 50)), clip = "inset(0 " + (100 - pos) + "% 0 0)";
    return '<div class="sl' + (full ? " slFull" : "") + '" data-slider="1"><img class="slB" src="' + esc(b.src) + '" alt="" draggable="false">' +
      '<img class="slA" src="' + esc(a.src) + '" alt="" draggable="false" style="clip-path:' + clip + ';-webkit-clip-path:' + clip + '">' +
      '<div class="slLine" style="left:' + pos + '%"><span class="slHandle" role="slider" tabindex="0" aria-label="Trennlinie verschieben" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pos) + '">' + I.slide + '</span></div>' +
      '<span class="slLbl l"><b>Vorher</b>' + fmtIso(a.date) + '</span><span class="slLbl r"><b>Nachher</b>' + fmtIso(b.date) + '</span></div>' +
      '<div class="slCaps">' + [a, b].map(function (ph, i) {
        var lb = photoLabel(ph, true);
        return '<div><b>' + (i ? "Nachher" : "Vorher") + ': ' + fmtIso(ph.date) + '</b> · ' + esc(sinceTxt(a.date, ph.date, i === 0)) + (lb ? '<br>' + esc(lb) : "") +
          (ph.areas.length ? '<br><span>' + esc(ph.areas.join(", ")) + '</span>' : "") + '<div class="faceSlot" data-src-index="' + i + '"></div></div>';
      }).join("") + '</div>';
  }
  function cmpCardHtml(list) {
    var slider = S.cmpMode === "slider" && list.length === 2;
    return '<div class="card cmpCard" id="cmpCard"><div class="cmpTop"><div class="cmpTitle"><h3>Vergleich</h3><div class="cmpPeriod">' + esc(periodTxt(list)) + '</div></div>' + cmpModeSeg(list) + '</div>' +
      (slider ? cmpSliderHtml(list) : cmpCellsHtml(list)) +
      '<div class="faceCmpBox" aria-live="polite"></div>' +   // Proportionen im Vergleich (face.js), leer = unsichtbar
      '<div class="cmpBtns"><button class="btn primary" data-a="cmpFull">' + I.expand + 'Vollbild</button>' + faceCmpBtn() + '<button class="btn" data-a="cmpPrint">' + I.print + 'Vergleich drucken</button><button class="btn" data-a="cmpReset">Auswahl aufheben</button></div></div>';
  }
  // Schieberegler: Finger oder Maus zieht die Trennlinie (Pointer Events), Pfeiltasten am Griff.
  function initSlider(root) {
    var st = root && root.querySelector ? root.querySelector(".sl") : null; if (!st || !st.addEventListener) return;
    var a = st.querySelector(".slA"), line = st.querySelector(".slLine"), h = st.querySelector(".slHandle"), active = null;
    if (!a || !line) return;
    function set(p) {
      var v = Math.max(0, Math.min(100, p)); S.slPos = v;
      var r = "inset(0 " + (100 - v) + "% 0 0)"; a.style.clipPath = r; a.style.webkitClipPath = r; line.style.left = v + "%";
      if (h) h.setAttribute("aria-valuenow", Math.round(v));
    }
    function move(e) { var r = st.getBoundingClientRect(); if (r && r.width) set((e.clientX - r.left) / r.width * 100); }
    // Finger außerhalb des Griffs (nicht im Vollbild): erst bei klar waagerechter Bewegung ziehen, damit senkrechtes Scrollen die Linie nicht versetzt
    var sx = 0, sy = 0, armed = false;
    st.addEventListener("pointerdown", function (e) {
      if (active !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      active = e.pointerId; sx = e.clientX; sy = e.clientY;
      armed = e.pointerType !== "touch" || !!(e.target && e.target.closest && e.target.closest(".slHandle")) || st.classList.contains("slFull");
      try { st.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      if (armed) { move(e); if (e.preventDefault) e.preventDefault(); }
    });
    st.addEventListener("pointermove", function (e) {
      if (e.pointerId !== active) return;
      if (!armed) { var dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy); if (dx > 8 && dx > dy) armed = true; else return; }
      move(e); if (e.preventDefault) e.preventDefault();
    });
    st.addEventListener("pointerup", function (e) {   // kurzes Antippen ohne Bewegung setzt die Linie wie bisher an diese Stelle
      if (e.pointerId === active && !armed && Math.abs(e.clientX - sx) <= 8 && Math.abs(e.clientY - sy) <= 8) move(e);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { st.addEventListener(ev, function (e) { if (e.pointerId === active) { active = null; armed = false; } }); });
    if (h) h.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { set(S.slPos + (e.key === "ArrowLeft" ? -5 : 5)); if (e.preventDefault) e.preventDefault(); }
    });
    set(S.slPos);
  }
  function cmpFullHtml(list) {
    var p = patient(S.pid) || {}, slider = S.cmpMode === "slider" && list.length === 2;
    return '<div class="cfTop"><button class="cfClose" data-a="cmpFullClose" aria-label="Schließen">' + I.close + '</button>' +
      '<div class="cfTitle"><b>' + esc(fullName(p)) + '</b><span>' + esc(periodTxt(list)) + '</span></div>' + (S.faceCmp && !slider && faceApi() ? faceLinesBtn() : "") + cmpModeSeg(list, true) + '</div>' +
      '<div class="cfBody">' + (slider ? cmpSliderHtml(list, true) : cmpCellsHtml(list, true)) + '</div>';
  }
  function openCmpFull() {
    var list = cmpPhotos(); if (list.length < 2) { toast("Bitte mindestens 2 Fotos auswählen"); return; }
    closeCmpFull();
    var el = document.createElement("div"); el.className = "cmpFull"; el.id = "cmpFull";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Fotovergleich im Vollbild");
    document.body.appendChild(el); S.fullEl = el;
    document.body.classList.add("cmpFullOpen"); document.body.style.overflow = "hidden";
    fillCmpFull();
  }
  function fillCmpFull() {
    var el = S.fullEl; if (!el) return;
    var list = cmpPhotos(); if (list.length < 2) { closeCmpFull(); return; }
    el.innerHTML = cmpFullHtml(list);
    if (S.cmpMode === "slider" && list.length === 2) initSlider(el);
    faceHook("comparison", el, hookPhotos(list));
  }
  function closeCmpFull() {
    var el = S.fullEl; S.fullEl = null;
    if (el && el.remove) el.remove();
    document.body.classList.remove("cmpFullOpen");
    var m = $("#modal"); if (!m || !m.innerHTML) document.body.style.overflow = "";
  }
  function printComparison() {
    var list = cmpPhotos(); if (list.length < 2) { toast("Bitte mindestens 2 Fotos auswählen"); return; }
    var p = patient(S.pid) || {};
    var h = '<h1>Fotovergleich: ' + esc(fullName(p)) + '</h1><p>' + practiceLine() + '<br>' + (p.dob ? "Geboren am " + fmtDate(p.dob) + "<br>" : "") + 'Erstellt am ' + fmtDT(Date.now()) + '</p>' +
      '<p><b>' + esc(periodTxt(list)) + '</b></p><div class="cmpPrint n' + list.length + '">' + list.map(function (ph, i) {
        var prod = [ph.product, ph.amount ? ph.amount + " ml" : ""].filter(Boolean).join(", "), lb = photoLabel(ph, true);
        return '<div class="cpc"><img src="' + esc(ph.src) + '" alt=""><div><b>' + fmtIso(ph.date) + '</b> · ' + esc(sinceTxt(list[0].date, ph.date, i === 0)) + '</div>' +
          (lb ? '<div>' + esc(lb) + '</div>' : "") + (ph.areas.length ? '<div>' + esc(ph.areas.join(", ")) + '</div>' : "") + (prod ? '<div>' + esc(prod) + '</div>' : "") +
          (ph.notes ? '<div class="cpn">' + esc(ph.notes) + '</div>' : "") + '</div>';
      }).join("") + '</div>';
    doPrint(h);
  }
  function scrollToCmp() {
    try {
      var c = document.getElementById("cmpCard"); if (!c || !c.getBoundingClientRect) return;
      var y = c.getBoundingClientRect().top + (window.pageYOffset || 0) - 120;
      window.scrollTo(0, Math.max(0, y));
    } catch (e) { /* ignore */ }
  }
  // Auswahl im Album ohne Neuaufbau aktualisieren (kein Flackern der Bilder).
  function paintSelection() {
    var sel = S.cmp || [];
    $all(".alT").forEach(function (t) {
      var n = sel.indexOf(t.getAttribute("data-k")) + 1, b = t.querySelector(".alNum");
      t.classList.toggle("sel", n > 0); t.setAttribute("aria-pressed", n ? "true" : "false"); if (b) b.textContent = n ? String(n) : "";
    });
    var bar = $("#selBar"); if (bar) bar.classList.toggle("hidden", !sel.length);
    var c = $("#selCount"); if (c) c.textContent = selTxt(sel.length);
    var g = $("#selGo"); if (g) g.disabled = sel.length < 2;
    $all(".rb.on").forEach(function (b2) { b2.classList.remove("on"); });
  }
  // Vergleich ausblenden, ohne dass das Album unter dem Finger wegspringt.
  function dropCmpCard() {
    var c = $("#cmpCard"); if (!c || !c.parentNode || !c.parentNode.removeChild) return;
    var h = (c.offsetHeight || 0) + 16;
    c.parentNode.removeChild(c);
    if (window.scrollBy && h > 16) window.scrollBy(0, -Math.min(h, window.pageYOffset || 0));
  }
  // „Vergleichen“ an einem Beitrag oder im Großbild: dieses Foto und das früheste Foto desselben Bereichs.
  function compareFrom(eid, idx) {
    var e = docById(eid); if (!e) return;
    var photos = allPhotos(e.patientId), mine = chrono(photos.filter(function (ph) { return ph.eid === eid; }));
    if (!mine.length) {   // Foto war eine Kopie aus einer älteren Korrektur: über die Bildquelle suchen
      var srcs = photoList(e).map(photoSrc);
      mine = chrono(photos.filter(function (ph) { return srcs.indexOf(ph.src) >= 0; }));
    }
    if (!mine.length) { toast("Kein Foto gefunden"); return; }
    var ph = (idx != null && !isNaN(idx) ? mine.filter(function (x) { return x.i === idx; })[0] : null) || mine[mine.length - 1];
    var pool = chrono(photos.filter(function (x) { return x.key !== ph.key && sameArea(x, ph); }));
    var partner = pool.length ? (pool[0].pts < ph.pts ? pool[0] : pool[pool.length - 1]) : null;
    closeModal(); closeLightbox();
    S.mode = "panel"; S.view = "profile"; S.pid = e.patientId; S.tab = "photos"; S.anVer = null; S.phArea = ""; resetCmp();
    if (!partner) { S.cmp = [ph.key]; render(); toast("Kein weiteres Foto aus diesem Bereich vorhanden"); return; }
    S.cmp = partner.pts < ph.pts ? [partner.key, ph.key] : [ph.key, partner.key];
    S.cmpOpen = true; render(); scrollToCmp();
  }

  // ---------- Großbild (Lightbox)
  function openLightbox(en, i, fromCmp) {
    var ph = photoList(en)[i], src = photoSrc(ph); if (!src) return;
    closeLightbox();
    var pt = patient(en.patientId) || {}, day = entryDay(en), lbl = photoLabel(ph, true);
    var lb = document.createElement("div"); lb.className = "lightbox";
    lb.innerHTML = '<button class="lbClose" aria-label="Schließen">' + I.close + '</button><div class="lbFrame"><img src="' + esc(src) + '" alt=""></div>' +
      '<div class="lbCap"><b>' + esc(fullName(pt)) + '</b> · ' + fmtIso(day) + (en.areas && en.areas.length ? " · " + esc(en.areas.join(", ")) : "") +
      (lbl ? '<br><span class="lbKind">' + esc(lbl) + '</span>' : "") +
      '<div class="lbTools">' + (fromCmp ? "" : '<button class="btn lbBtn" data-a="lbCompare" data-id="' + en.id + '" data-i="' + i + '">' + I.compare + 'Vergleichen</button>') +
      '<div class="faceActions"></div></div></div>';   // Platzhalter für Aktionen der Gesichtsanalyse (window.ABFace)
    // Bei offener Gesichtsanalyse schließt ein Tippen auf das Foto (beim Erklären der Linien) das Großbild nicht
    lb.onclick = function (ev) { var t = ev && ev.target; if (t && t.closest && !t.closest(".lbClose") && (t.closest(".lbTools") || t.closest(".lbPanel") || (lb.classList.contains("lbFace") && t.closest(".lbFrame")))) return; closeLightbox(); };
    document.body.appendChild(lb);
    S.lbEl = lb; S.lbPhoto = { src: src, date: day, dateText: fmtIso(day), label: lbl, kind: photoKind(ph), caption: photoCaption(ph), areas: (en.areas || []).slice(), entryId: en.id, photoIndex: i, patientId: en.patientId };
    faceHook("lightbox", lb, S.lbPhoto);
  }
  function closeLightbox() {
    var lb = S.lbEl; S.lbEl = null; S.lbPhoto = null;
    if (lb && lb.remove) lb.remove();
  }

  // ---------- Schnittstelle für die Gesichtsanalyse (face.js). Fehlt window.ABFace, passiert nichts.
  // ABFace kann eine Funktion (type, root, data) sein oder ein Objekt mit onComparison(root, photos) / onLightbox(root, photo).
  // Zusätzlich wird ein DOM-Ereignis "ab:comparison" bzw. "ab:lightbox" mit detail {root, photos | photo} an document gesendet.
  var inFaceHook = false;
  function faceHook(type, root, data) {
    if (!root) return;
    inFaceHook = true;
    try { if (type === "comparison") faceOnComparison(root, data); else if (type === "lightbox") faceLbInit(root, data); }
    catch (e0) { if (window.console) console.warn("Gesichtsanalyse", e0); }
    try {
      var F = window.ABFace;
      if (typeof F === "function") F(type, root, data);
      else if (F && type === "comparison" && typeof F.onComparison === "function") F.onComparison(root, data);
      else if (F && type === "lightbox" && typeof F.onLightbox === "function") F.onLightbox(root, data);
    } catch (e) { if (window.console) console.warn("ABFace", e); }
    try {
      if (typeof window.CustomEvent === "function" && document.dispatchEvent) {
        var det = { root: root }; det[type === "comparison" ? "photos" : "photo"] = data;
        document.dispatchEvent(new CustomEvent("ab:" + type, { detail: det }));
      }
    } catch (e2) { if (window.console) console.warn("ab:" + type, e2); }
    inFaceHook = false;
  }
  function hookPhotos(list) {
    return list.map(function (ph, i) {
      return { index: i, src: ph.src, date: ph.date, dateText: fmtIso(ph.date), label: sinceTxt(list[0].date, ph.date, i === 0), kind: ph.kind, kindLabel: ph.kind ? PH_KIND_LONG[ph.kind] : "",
        caption: ph.caption, areas: ph.areas.slice(), entryId: ph.eid, photoIndex: ph.i, patientId: S.pid };
    });
  }
  // ---------- Gesichtsanalyse (face.js, MediaPipe, läuft nur auf diesem Gerät)
  // Fehlt face.js, wird es nicht unterstützt oder scheitert das Laden, bleiben die Knöpfe weg bzw. es erscheint ein Hinweis;
  // der Rest der App ist davon unabhängig. Ergebnisse: im Speicher je Foto (Hash der Bildquelle) und zusätzlich als eigener
  // Datensatz kind "faceanalysis" (Verweis auf Eintrag, Fotoindex, Hash, createdAt). Behandlungseinträge werden nie verändert.
  var FX = { mem: {}, pend: {}, hm: null, queue: [], running: null, lines: true, sup: false, supFor: null, rz: null };
  var FACE_SUB = "Berechnet auf diesem Gerät, ohne Upload";
  function faceApi() {
    var F = null;
    try {
      F = window.ABFace;
      if (!F || typeof F !== "object" || typeof F.analyze !== "function" || typeof F.drawOverlay !== "function") return null;
      if (FX.supFor !== F) { FX.supFor = F; FX.sup = false; FX.sup = typeof F.isSupported === "function" ? !!F.isSupported() : true; }   // einmal je Modul prüfen
      return FX.sup ? F : null;
    } catch (e) { FX.supFor = F; FX.sup = false; return null; }
  }
  // Schneller Fingerabdruck der Bildquelle (Länge + FNV-1a + djb2); gemerkt pro Zeichenkette.
  function srcHash(src) {
    src = String(src || "");
    try { if (!FX.hm && typeof Map === "function") FX.hm = new Map(); if (FX.hm && FX.hm.has(src)) return FX.hm.get(src); } catch (e) { FX.hm = null; }
    var h1 = 0x811c9dc5, h2 = 5381, n = src.length, c;
    for (var i = 0; i < n; i++) { c = src.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = (Math.imul(h2, 33) + c) | 0; }
    var h = n.toString(36) + "-" + (h1 >>> 0).toString(36) + "-" + (h2 >>> 0).toString(36);
    try { if (FX.hm) { if (FX.hm.size > 300) FX.hm.clear(); FX.hm.set(src, h); } } catch (e) { /* ohne Merker */ }
    return h;
  }
  // Zustand eines Fotos: {ok, res, metrics} | {ok:false, reason, noFace} | {run} | {wait} | null (noch nichts)
  function faceState(src) {
    var h = srcHash(src), st = FX.mem[h];
    if (st) return st;
    if (FX.pend[h]) return { run: true };
    for (var q = 0; q < FX.queue.length; q++) if (FX.queue[q].h === h) return { wait: true };
    var doc = null;
    DB.all.forEach(function (d) { if (d.kind === "faceanalysis" && d.srcHash === h && d.metrics && d.lm && (!doc || d.createdAt > doc.createdAt)) doc = d; });
    if (doc) return (FX.mem[h] = { ok: true, res: { v: 1, w: doc.w, h: doc.h, lm: doc.lm, metrics: doc.metrics }, metrics: doc.metrics, at: doc.createdAt });
    return null;
  }
  function faceReasonText(st) {
    var r = (st && st.reason) || "Foto konnte nicht analysiert werden";
    if (st && st.noFace) return "Kein Gesicht erkannt. Für die Analyse muss das ganze Gesicht möglichst frontal im Bild sein.";
    if (/nicht gestartet/.test(r)) return "Die Gesichtsanalyse konnte nicht gestartet werden. Bitte Aestheticbook einmal mit Internetverbindung öffnen und es dann erneut versuchen.";
    return r.replace(/\.?$/, ".");
  }
  function faceAnalyze(item) {
    var F = faceApi(), h = srcHash(item.src);
    if (!F) return Promise.resolve(null);
    if (FX.pend[h]) return FX.pend[h];
    var p = new Promise(function (resolve) {
      var done = false;
      function fin(r) { if (done) return; done = true; clearTimeout(safety); resolve(r); }
      var safety = setTimeout(function () { fin({ ok: false, reason: "Zeitüberschreitung bei der Analyse" }); }, 120000);
      try { Promise.resolve(F.analyze(item.src)).then(fin, function () { fin({ ok: false, reason: "Foto konnte nicht analysiert werden" }); }); }
      catch (e) { fin({ ok: false, reason: "Foto konnte nicht analysiert werden" }); }
    }).then(function (r) {
      delete FX.pend[h];
      if (r && r.ok && r.metrics) {
        var cp = null;
        try { cp = typeof F.compact === "function" ? F.compact(r) : null; } catch (e) { cp = null; }
        var res = cp && cp.lm ? cp : { w: r.width, h: r.height, landmarks: r.landmarks, metrics: r.metrics };
        FX.mem[h] = { ok: true, res: res, metrics: r.metrics, at: Date.now() };
        faceSave(item, h, cp, r.metrics, F);
      } else {
        var reason = (r && r.reason) || "Foto konnte nicht analysiert werden";
        FX.mem[h] = { ok: false, reason: reason, noFace: /Kein Gesicht/i.test(reason), unsupported: /nicht unterstützt/.test(reason) };
      }
      return FX.mem[h];
    });
    FX.pend[h] = p;
    return p;
  }
  // Zusätzlicher Datensatz; der Behandlungseintrag bleibt unverändert. Fehler beim Speichern: Ergebnis bleibt im Speicher.
  function faceSave(item, h, cp, metrics, F) {
    try {
      if (!cp || !cp.lm || !item.patientId) return;
      if (DB.all.some(function (d) { return d.kind === "faceanalysis" && d.srcHash === h; })) return;
      var p = patient(item.patientId);
      var doc = { id: uid(), kind: "faceanalysis", patientId: item.patientId, entryId: item.entryId || null, photoIndex: item.photoIndex != null ? +item.photoIndex : null,
        srcHash: h, createdAt: Date.now(), engine: "MediaPipe " + ((F.version && F.version.mediapipe) || ""), w: cp.w, h: cp.h, lm: cp.lm, metrics: metrics };
      if (p && p.demo) doc.demo = true;
      DB.put(doc).catch(function () { /* nur im Speicher */ });
    } catch (e) { /* nur im Speicher */ }
  }
  function faceItem(ph) { return { src: ph.src, entryId: ph.entryId, photoIndex: ph.photoIndex, patientId: ph.patientId }; }
  // Vergleich: Fotos nacheinander analysieren (schont den Speicher älterer iPads), Fortschritt anzeigen.
  function faceQueue(items) {
    var want = {};
    items.forEach(function (it) { want[srcHash(it.src)] = 1; });
    FX.queue = FX.queue.filter(function (q) { return want[q.h]; });   // abgewählte Vergleiche nicht weiterrechnen
    items.forEach(function (it) { if (!faceState(it.src)) FX.queue.push({ h: srcHash(it.src), item: it }); });
    facePump();
  }
  function facePump() {
    if (FX.running || !FX.queue.length) return;
    var next = FX.queue.shift();
    if (FX.mem[next.h]) { facePump(); return; }
    FX.running = next.h;
    var go = function (st) {
      FX.running = null;
      // Modul startet nicht: übrige Fotos nicht einzeln erneut laden lassen (offline jeweils bis zu 45 s), gleicher Hinweis
      if (st && !st.ok && /nicht gestartet|nicht unterstützt/.test(st.reason || "")) {
        FX.queue.forEach(function (q) { FX.mem[q.h] = { ok: false, reason: st.reason, unsupported: !!st.unsupported }; });
        FX.queue = [];
      }
      faceRefresh(); facePump();
    };
    faceAnalyze(next.item).then(go, function () { go(null); });
    faceRefresh();
  }
  function faceLinesInner() { return '<span class="fTogK"></span>Linien ' + (FX.lines ? "ein" : "aus"); }
  function faceLinesBtn() { return '<button class="fTog' + (FX.lines ? " on" : "") + '" data-a="faceLines" aria-pressed="' + (FX.lines ? "true" : "false") + '">' + faceLinesInner() + '</button>'; }
  function faceLinesToggle() {
    FX.lines = !FX.lines;
    $all('[data-a="faceLines"]').forEach(function (b) { b.classList.toggle("on", FX.lines); b.setAttribute("aria-pressed", FX.lines ? "true" : "false"); b.innerHTML = faceLinesInner(); });
    faceRedraw();
  }
  function faceBusyHtml(text, F) {
    var first = F && typeof F.status === "function" && F.status() !== "ready";
    return '<div class="fBusy"><span class="spin"></span>' + esc(text) + '</div>' +
      (first ? '<p class="fHint">Beim ersten Mal wird das Analysemodul geladen, das dauert einige Sekunden.</p>' : "");
  }
  function faceCmpBtn() {
    if (!faceApi()) return "";
    return '<button class="btn' + (S.faceCmp ? " on" : "") + '" data-a="faceCmp" aria-pressed="' + (S.faceCmp ? "true" : "false") + '">' + I.face + (S.faceCmp ? "Proportionen ausblenden" : "Proportionen vergleichen") + '</button>';
  }
  function faceShortWarn(w) { return String(w || "").split(",")[0]; }
  function faceNum(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(".", ","); }
  function faceSlotHtml(st) {
    if (!st || st.wait) return '<div class="fSlot fMuted">Wartet auf die Analyse</div>';
    if (st.run) return '<div class="fSlot"><span class="spin sm"></span>Analyse läuft …</div>';
    if (!st.ok) return '<div class="fSlot fBad">' + esc(st.noFace ? "Kein Gesicht erkannt" : "Nicht messbar") + '</div>';
    var m = st.metrics || {}, bits = [];
    if (m.lipRatio != null) bits.push("Lippen 1 : " + faceNum(m.lipRatio, 2));
    if (m.symmetry && m.symmetry.score != null) bits.push("Symmetrie " + Math.round(m.symmetry.score) + " %");
    var w = (m.warnings || []).map(faceShortWarn);
    return '<div class="fSlot"><span>' + esc(bits.join(" · ") || "Gemessen") + '</span>' + (w.length ? '<span class="fWarn">' + esc(w.join(", ")) + '</span>' : "") + '</div>';
  }
  function faceCmpBoxHtml(list, sts, slider) {
    var F = faceApi(); if (!F) return "";
    var n = list.length, done = 0, busy = false, anyOk = false, retry = false;
    sts.forEach(function (st) {
      if (st && (st.ok || st.reason)) done++;
      if (!st || st.run || st.wait) busy = true;
      if (st && st.ok) anyOk = true;
      if (st && !st.ok && st.reason && !st.noFace && !st.unsupported) retry = true;
    });
    var head = '<div class="fcHead"><div><h4>Proportionen im Vergleich</h4><span class="fcSub">' + FACE_SUB + '</span></div>' + (anyOk && !slider ? faceLinesBtn() : "") + '</div>';
    var prog = busy ? faceBusyHtml("Analyse " + Math.min(n, done + 1) + " von " + n + " läuft auf diesem Gerät …", F) : "";
    var retryBtn = retry && !busy ? '<button class="btn" data-a="faceRetry">Erneut versuchen</button>' : "";
    if (!anyOk) {
      if (busy) return head + prog;
      var first = sts.filter(function (st) { return st && !st.ok; })[0];
      var allNoFace = sts.every(function (st) { return st && st.noFace; });
      return head + '<div class="fErr">' + esc(allNoFace ? "Auf keinem der Fotos wurde ein Gesicht erkannt. Für die Analyse muss das ganze Gesicht möglichst frontal im Bild sein." : faceReasonText(first)) + '</div>' + retryBtn;
    }
    var cr = typeof F.compareRows === "function" ? F.compareRows(sts.map(function (st) { return st && st.ok ? st.metrics : null; })) : null;
    if (!cr || !cr.rows || !cr.rows.length) return head + prog;
    // Späteres Foto als Bezug erst, wenn alle früheren wirklich nicht messbar sind (nicht, solange sie noch analysiert werden)
    var refPending = cr.ref > 0 && sts.slice(0, cr.ref).some(function (s) { return !s || s.run || s.wait; });
    if (refPending) cr.rows.forEach(function (r) { r.deltas = (r.deltas || []).map(function () { return ""; }); });
    var refLater = cr.ref > 0 && !refPending;
    var warns = [];
    sts.forEach(function (st, i) {
      if (st && st.ok) (st.metrics.warnings || []).forEach(function (w) { warns.push("Foto vom " + list[i].dateText + ": " + w); });
      else if (st && st.reason) warns.push("Foto vom " + list[i].dateText + ": " + (st.noFace ? "kein Gesicht erkannt" : "nicht messbar"));
    });
    var hdr = '<div class="fcGrid fcH"><span class="fcK">Messwert</span>' + list.map(function (ph, i) {
      var st = sts[i], extra = !st || st.run || st.wait ? '<small>wird analysiert</small>' : (!st.ok ? '<small class="fBadT">' + (st.noFace ? "kein Gesicht" : "nicht messbar") + '</small>' : "");
      return '<span class="fcCol"><b>' + esc(ph.dateText) + '</b><small>' + esc(ph.label) + '</small>' + extra + '</span>';
    }).join("") + '</div>';
    var rows = cr.rows.map(function (r) {
      return '<details class="fcRow"><summary><span class="fcGrid"><span class="fcK">' + esc(r.label) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : "") + '</span>' +
        r.values.map(function (v, i) {
          var st = sts[i], txt = st && st.ok ? (v || "nicht messbar") : (st && st.reason ? "nicht messbar" : "…");
          return '<span class="fcV">' + esc(txt) + (r.deltas[i] ? '<small class="fcD">' + esc(r.deltas[i]) + '</small>' : "") + '</span>';
        }).join("") + '</span></summary><div class="fcI">' + esc(r.info) + '</div></details>';
    }).join("");
    var refTxt = refLater ? "Bezug ist das Foto vom " + list[cr.ref].dateText + ", weil das Ausgangsbild nicht messbar war. " : "";
    var info = F.METRIC_INFO || {}, sides = info.sides ? " " + info.sides.text : "", mm = info.mm ? " " + info.mm.text : "";
    return head + prog + (warns.length ? '<div class="fcWarn">' + warns.map(esc).join("<br>") + '</div>' : "") +
      '<div class="fcTable c' + n + '">' + hdr + rows + '</div>' +
      '<p class="fcLeg">' + esc(refTxt + "Kleine Zahl: Veränderung zum " + (refLater ? "Bezugsfoto" : "Ausgangsbild") + ", bei Prozentwerten in Prozentpunkten. Zeile antippen für eine Erklärung.") + '</p>' +
      '<p class="fcDisc">' + esc((F.DISCLAIMER || "Geometrische Messung aus dem Foto, keine medizinische Diagnose.") + sides + mm) + '</p>' + retryBtn;
  }
  // Messlinien über einem Vergleichsbild (object-fit: contain, daher fit "contain")
  function faceDrawCell(cell, st) {
    var box = cell && cell.querySelector ? cell.querySelector(".cmpImg") : null; if (!box) return;
    var cv = box.querySelector("canvas.faceOv"), F = faceApi();
    if (!F || !st || !st.ok || !FX.lines) { if (cv && cv.parentNode) cv.parentNode.removeChild(cv); return; }
    var r = box.getBoundingClientRect(); if (!r || !r.width || !r.height) return;
    if (!cv) { cv = document.createElement("canvas"); cv.className = "faceOv"; cv.setAttribute("aria-hidden", "true"); box.insertBefore(cv, box.querySelector(".cmpRel")); }
    var d = Math.min(2, window.devicePixelRatio || 1), W = Math.round(r.width * d), H = Math.round(r.height * d);
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    F.drawOverlay(cv, st.res, { fit: "contain", mesh: r.width >= 360, labels: r.width >= 230 });
  }
  function faceApplyCmp(root, list, cellsOnly) {
    if (!root || !root.querySelectorAll || !faceApi()) return;
    var on = !!S.faceCmp && list.length >= 2, slider = S.cmpMode === "slider" && list.length === 2;
    var sts = list.map(function (ph) { return on ? faceState(ph.src) : null; });
    if (!cellsOnly) {
      $all(".faceSlot", root).forEach(function (el) { var i = +el.getAttribute("data-src-index"); el.innerHTML = on && list[i] ? faceSlotHtml(sts[i]) : ""; });
      var box = root.querySelector(".faceCmpBox");
      if (box) {
        // geöffnete Erklärzeilen bleiben beim Aktualisieren offen (Zeilen haben immer dieselbe Reihenfolge)
        var wasOpen = []; try { wasOpen = $all(".fcRow", box).map(function (d) { return !!d.open; }); } catch (e) { wasOpen = []; }
        box.innerHTML = on ? faceCmpBoxHtml(list, sts, slider) : "";
        if (wasOpen.indexOf(true) >= 0) { try { $all(".fcRow", box).forEach(function (d, i) { if (wasOpen[i]) d.open = true; }); } catch (e2) { /* egal */ } }
      }
    }
    // erst nach den Texten messen: im Vollbild verkleinert die Kurzinfo unter dem Foto die Bildfläche
    $all(".cmpCell", root).forEach(function (cell, i) { faceDrawCell(cell, on && !slider ? sts[i] : null); });
  }
  function faceOnComparison(root, list) {
    if (!S.faceCmp || S.mode !== "panel" || !list || list.length < 2 || !faceApi()) return;
    faceQueue(list.map(faceItem));
    faceApplyCmp(root, list);
  }
  // Großbild: Knopf „Gesichtsanalyse“, Messlinien über dem Foto, Werte mit Erklärungen in einer Seitenleiste.
  function faceLbInit(lb, photo) {
    var box = lb && lb.querySelector ? lb.querySelector(".faceActions") : null;
    if (!box || !photo || S.mode !== "panel" || !faceApi()) return;
    box.innerHTML = '<button class="btn lbBtn" data-a="faceLb" aria-pressed="false">' + I.face + 'Gesichtsanalyse</button>';
  }
  function faceLbToggle() {
    var lb = S.lbEl, ph = S.lbPhoto; if (!lb || !ph || !faceApi()) return;
    var b = lb.querySelector('.faceActions [data-a="faceLb"]');
    if (lb.classList.contains("lbFace")) {
      lb.classList.remove("lbFace");
      var pn0 = lb.querySelector(".lbPanel"); if (pn0 && pn0.parentNode) pn0.parentNode.removeChild(pn0);
      if (b) b.setAttribute("aria-pressed", "false");
      faceDrawLb();
      return;
    }
    lb.classList.add("lbFace");
    if (b) b.setAttribute("aria-pressed", "true");
    var pn = document.createElement("div"); pn.className = "lbPanel"; pn.setAttribute("role", "region"); pn.setAttribute("aria-label", "Gesichtsanalyse");
    lb.appendChild(pn);
    var st = faceState(ph.src);
    if (st && !st.ok && st.reason && !st.noFace) { delete FX.mem[srcHash(ph.src)]; st = null; }   // früherer Fehler: neu versuchen
    if (!st || st.wait) faceLbRun();
    faceLbPaint();
  }
  function faceLbRun() {
    var lb = S.lbEl, ph = S.lbPhoto; if (!lb || !ph) return;
    faceAnalyze(faceItem(ph)).then(function () { if (S.lbEl === lb) faceLbPaint(); faceRefresh(); });
  }
  function faceLbPaint() {
    var lb = S.lbEl, ph = S.lbPhoto, F = faceApi(); if (!lb || !ph || !F) return;
    var pn = lb.querySelector(".lbPanel"); if (!pn) return;
    var st = faceState(ph.src), body;
    lb._fk = faceLbKey(st, F);
    if (!st || st.run || st.wait) body = faceBusyHtml("Analyse läuft auf diesem Gerät …", F);
    else if (!st.ok) body = '<div class="fErr">' + esc(faceReasonText(st)) + '</div>' + (st.noFace || st.unsupported ? "" : '<button class="btn" data-a="faceLbRetry">Erneut versuchen</button>');
    else {
      var mh = "";
      try { mh = typeof F.renderMetricsHtml === "function" ? F.renderMetricsHtml(st.metrics) : ""; } catch (e) { mh = ""; }
      body = '<div class="fBar">' + faceLinesBtn() + '</div>' + (mh || '<p class="fcDisc">' + esc(F.DISCLAIMER || "") + '</p>');
    }
    pn.innerHTML = '<div class="fpHead"><div><b>Gesichtsanalyse</b><span>' + FACE_SUB + '</span></div><button class="fpX" data-a="faceLb" aria-label="Analyse schließen">' + I.close + '</button></div>' + body;
    faceDrawLb();
  }
  // Zustand des Großbild-Fotos als Schlüssel: Seitenleiste nur neu aufbauen, wenn er sich ändert (offene Zeilen bleiben offen)
  function faceLbKey(st, F) {
    if (!st) return "n";
    if (st.ok) return "ok";
    if (st.reason) return "err";
    var ready = false; try { ready = !!(F && typeof F.status === "function" && F.status() === "ready"); } catch (e) { ready = false; }
    return ready ? "busy" : "busy-load";
  }
  function faceDrawLb() {
    var lb = S.lbEl, ph = S.lbPhoto, F = faceApi(); if (!lb || !ph) return;
    var fr = lb.querySelector(".lbFrame"), img = fr ? fr.querySelector("img") : null; if (!img) return;
    var cv = fr.querySelector("canvas.faceOv"), st = faceState(ph.src);
    if (!F || !lb.classList.contains("lbFace") || !st || !st.ok || !FX.lines) { if (cv && cv.parentNode) cv.parentNode.removeChild(cv); return; }
    var go = function () {
      if (S.lbEl !== lb || !lb.classList.contains("lbFace") || !FX.lines) return;
      var r = img.getBoundingClientRect(); if (!r || !r.width || !r.height) return;
      if (!cv || !cv.parentNode) { cv = document.createElement("canvas"); cv.className = "faceOv"; cv.setAttribute("aria-hidden", "true"); fr.appendChild(cv); }
      var d = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
      F.drawOverlay(cv, st.res, { fit: "fill" });
    };
    if (img.complete && img.naturalWidth) go(); else if (img.addEventListener) img.addEventListener("load", go);
  }
  // Nach neuen Ergebnissen: Vergleich und Großbild an Ort und Stelle aktualisieren (ohne Neuaufbau der Seite).
  function faceRefresh() {
    try {
      if (S.mode !== "panel") return;
      if (S.faceCmp && S.cmpOpen) {
        var list = hookPhotos(cmpPhotos());
        if (list.length >= 2) { var c = document.getElementById("cmpCard"); if (c) faceApplyCmp(c, list); if (S.fullEl) faceApplyCmp(S.fullEl, list); }
      }
      if (S.lbEl && S.lbPhoto && S.lbEl.classList.contains("lbFace") && S.lbEl._fk !== faceLbKey(faceState(S.lbPhoto.src), faceApi())) faceLbPaint();
    } catch (e) { if (window.console) console.warn("Gesichtsanalyse", e); }
  }
  // Nur die Linien neu zeichnen (Drehen des iPads, Linien ein/aus)
  function faceRedraw() {
    try {
      if (S.mode !== "panel") return;
      if (S.faceCmp && S.cmpOpen) {
        var list = hookPhotos(cmpPhotos());
        if (list.length >= 2) { var c = document.getElementById("cmpCard"); if (c) faceApplyCmp(c, list, true); if (S.fullEl) faceApplyCmp(S.fullEl, list, true); }
      }
      faceDrawLb();
    } catch (e) { if (window.console) console.warn("Gesichtsanalyse", e); }
  }
  function faceOnResize() { clearTimeout(FX.rz); FX.rz = setTimeout(faceRedraw, 200); }
  window.addEventListener("resize", faceOnResize);
  window.addEventListener("orientationchange", faceOnResize);
  window.AB_HOOKS = {
    version: 1,
    // Fotos im sichtbaren Vergleich, chronologisch; index entspricht data-src-index der .faceSlot-Elemente.
    getComparisonPhotos: function () { try { return S.cmpOpen ? hookPhotos(cmpPhotos()) : []; } catch (e) { return []; } },
    // Foto im offenen Großbild oder null
    getLightboxPhoto: function () { return S.lbPhoto ? Object.assign({}, S.lbPhoto) : null; },
    // Vergleich (und Vollbild) neu zeichnen; nicht aus onComparison heraus aufrufen (wird dort ignoriert).
    rerender: function () {
      if (inFaceHook) return;
      try { if (S.mode !== "panel") return; S._keepScroll = true; render(); if (S.fullEl) fillCmpFull(); } catch (e) { if (window.console) console.warn(e); }
    }
  };
  function docsTab(p) {
    var docs = [];
    byPatient("anamnesis", p.id).forEach(function (d) { docs.push({ t: "Gesundheitsfragebogen", d: d, a: "tab", v: "info" }); });
    byPatient("treatconsent", p.id).forEach(function (d) { docs.push({ t: d.refused ? "Ablehnung der Behandlung" : "Aufklärung und Einwilligung: Hyaluron-Filler", d: d, a: "viewConsent" }); });
    byPatient("consent", p.id).forEach(function (d) { docs.push({ t: { fotos: "Einwilligung Fotos", datenschutz: "Datenschutzhinweise gelesen", info: "Patienteninformation gelesen" }[d.type] || d.type, d: d }); });
    docs.sort(function (a, b) { return b.d.createdAt - a.d.createdAt; });
    if (!docs.length) return emptyState(I.doc, "Noch keine Dokumente", "Fragebögen und Einwilligungen erscheinen hier.");
    return '<div class="card"><h3>Dokumente</h3>' + docs.map(function (x) {
      return '<div class="ver"><span>' + I.doc.replace("<svg", '<svg width="20" height="20" style="vertical-align:middle;color:var(--brand)"') + ' <b>' + esc(x.t) + '</b><br><span class="stepSub">' + fmtDT(x.d.createdAt) + ' · Textversion ' + esc(x.d.contentVersion || "") + (x.d.lang && x.d.lang !== "de" ? " · " + LANG_DE[x.d.lang] : "") + '</span></span>' +
        (x.a ? '<button class="btn" data-a="' + x.a + '" data-id="' + x.d.id + '" data-v="' + (x.v || "") + '">Ansehen</button>' : "") + '</div>';
    }).join("") + '<div style="margin-top:12px"><button class="btn primary" data-a="printPatient">' + I.print + 'Komplette Akte als PDF</button></div></div>';
  }

  // ---------- backup / settings
  function backupView() {
    var n = DB.all.length;
    after(function () {
      if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (ok) { var e = $("#persist"); if (e) e.textContent = ok ? "Speicher dauerhaft" : "Speicher nicht dauerhaft"; }).catch(function () { /* ignore */ });
    });
    return standaloneNote() + '<div class="card"><h3>Datensicherung</h3><p>Alle Daten liegen nur auf diesem Gerät (' + kind("patient").length + ' Patientinnen, ' + n + ' Datensätze). Wenn das Gerät verloren geht oder die Daten der App gelöscht werden, sind die Daten weg. <span class="stepSub" id="persist"></span></p>' +
      '<div class="note">Bitte am Ende jedes Tages eine Sicherung speichern. In der Teilen-Ansicht „In Dateien sichern“ und dann „Auf meinem iPad“ wählen. Nicht per WhatsApp verschicken und nicht in iCloud Drive ablegen.</div>' +
      '<p><button class="btn primary" data-a="exportData">' + I.save + 'Sicherung speichern</button></p>' +
      '<h3 style="margin-top:22px">Sicherung wiederherstellen</h3><p class="stepSub">Fügt die Datensätze aus einer Sicherungsdatei hinzu. Vorhandene Einträge bleiben erhalten.</p>' +
      '<input type="file" accept="application/json,.json,text/plain" data-a-change="importData" class="i"></div>';
  }
  function settingsView() {
    var s = settings();
    return '<div class="card"><h3>Einstellungen</h3>' +
      '<label class="f" for="setName">Name der Behandlerin (Standard)</label><input class="i" id="setName" value="' + esc(s.practitioner) + '">' +
      '<label class="f" for="setPin">PIN für den Praxisbereich (4 Ziffern)</label><input class="i" id="setPin" inputmode="numeric" maxlength="4" placeholder="neue PIN" value="" autocomplete="off">' +
      '<p><button class="btn primary" data-a="saveSettings">Speichern</button></p>' +
      '<h3 style="margin-top:24px">Demo</h3><p class="stepSub">Für Vorführungen: zwei Beispiel-Patientinnen mit Behandlungen und Fotos anlegen.</p><button class="btn" data-a="demo">Beispieldaten anlegen</button>' +
      '<h3 style="margin-top:24px;color:var(--red)">Beispieldaten löschen</h3><p class="stepSub">Löscht nur die Beispiel-Patientinnen mit allen Einträgen. Echte Patientinnen bleiben erhalten (Aufbewahrung 10 Jahre).</p><button class="btn danger" data-a="wipe">Beispieldaten löschen</button></div>';
  }

  // ---------------------------------------------------------------- MODALS
  function modal(html, wide) {
    $("#modal").innerHTML = '<div class="modalBg"><div class="modal ' + (wide ? "wide" : "") + '">' + html + '</div></div>';
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    $("#modal").innerHTML = ""; document.body.style.overflow = ""; document.body.classList.remove("handover");
    S.pads = null; S.photoTok = null; S._pinKey = null;
  }
  function mHead(t) { return '<div class="modalHead"><span style="width:44px"></span><h2>' + t + '</h2><button class="iconbtn" data-a="closeModal" aria-label="Schließen">' + I.close + '</button></div>'; }

  // PIN (Ziffernblock wie am Sperrbildschirm; beim Festlegen zweimal eingeben)
  function pinModal(onOk, setMode) {
    var v = "", first = null, busy = false;
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(function (k) { return k === "" ? '<span></span>' : '<button data-pk="' + k + '" aria-label="' + (k === "del" ? "Löschen" : k) + '">' + (k === "del" ? "⌫" : k) + '</button>'; }).join("");
    modal(mHead(setMode ? "PIN festlegen" : "Praxisbereich") + '<div class="modalBody pinBody"><p id="pinMsg">' + (setMode ? "Bitte legen Sie eine 4-stellige PIN für den Praxisbereich fest." : "Bitte PIN eingeben") + '</p><div class="pinDots"><i></i><i></i><i></i><i></i></div><div class="err" id="pinErr"></div><div class="pinPad">' + keys + '</div></div>');
    $(".modal").style.maxWidth = "420px";
    var box = $(".pinBody"), dots = $(".pinDots");
    function paint() { $all(".pinDots i").forEach(function (d, i) { d.classList.toggle("on", i < v.length); }); }
    function later(fn, ms) { busy = true; setTimeout(function () { busy = false; fn(); }, ms); }
    function wrong(msg, after2) { $("#pinErr").textContent = msg; dots.classList.add("shake"); later(function () { v = ""; paint(); dots.classList.remove("shake"); if (after2) after2(); }, 450); }
    function press(k) {
      if (busy) return;
      if (k === "del") v = v.slice(0, -1); else if (v.length < 4) v += k;
      paint();
      if (v.length < 4) return;
      if (setMode) {
        if (!first) { first = v; later(function () { v = ""; paint(); $("#pinMsg").textContent = "Bitte PIN zur Bestätigung wiederholen"; $("#pinErr").textContent = ""; }, 200); return; }
        if (v !== first) { first = null; wrong("PINs stimmen nicht überein. Bitte neu festlegen.", function () { $("#pinMsg").textContent = "Bitte legen Sie eine 4-stellige PIN fest."; }); return; }
        var s = settings(); s.pin = v; busy = true;
        DB.put(s).then(function () { closeModal(); onOk(); }).catch(function (er) { busy = false; v = ""; first = null; paint(); $("#pinErr").textContent = "Speichern fehlgeschlagen. Bitte App schließen und neu öffnen. " + errMsg(er); });
      } else if (v === settings().pin) { closeModal(); onOk(); }
      else wrong("Falsche PIN");
    }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-pk]"); if (b) press(b.getAttribute("data-pk")); });
    S._pinKey = function (e) { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("del"); };
  }

  // pick patient for treatment (immer alle, unabhängig von der letzten Suche)
  function pickPatientModal(action) {
    var list = kind("patient").sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
    modal(mHead("Patientin wählen") + '<div class="modalBody">' + (list.length ? list.map(function (p) { return '<button class="navitem" data-a="' + action + '" data-id="' + p.id + '">' + avatarHtml(p, "") + '<span class="nt">' + esc(fullName(p)) + '</span></button>'; }).join("") : '<div class="empty">Noch keine Patientinnen. Bitte zuerst den Fragebogen am Tablet ausfüllen lassen.</div>') + '</div>');
  }

  // new treatment entry
  function treatmentModal(pid, correctsId) {
    var p = patient(pid); if (!p) return;
    var lastC = byPatient("treatconsent", pid).filter(function (c) { return !c.refused; })[0];
    var orig = correctsId ? docById(correctsId) : null;
    var base = orig || lastC || {};
    var an = latestAnamnesis(pid), yesT = yesQs(an), canPhoto = photoDocOk(pid);
    var day = orig ? orig.date : isoDay(Date.now());
    S.newPhotos = [];   // Korrektur: Originalfotos bleiben am Originaleintrag
    S.photoTok = uid(); S.tPid = pid;
    modal(mHead((correctsId ? "Korrektur: " : "Behandlung: ") + esc(fullName(p))) + '<div class="modalBody">' +
      (an ? (yesT.length ? '<div class="warnbox"><b>Fragebogen vom ' + fmtDate(an.createdAt) + ':</b> ' + yesT.map(function (q) { var ad = ansDetail(an.answers[q.id]); return esc(shortQ(q)) + (ad ? " (" + esc(ad) + ")" : ""); }).join(" · ") + '</div>' : "") : '<div class="warnbox">Kein Gesundheitsfragebogen vorhanden.</div>') +
      (correctsId ? '<div class="note">Der ursprüngliche Eintrag vom ' + (orig ? fmtDT(orig.createdAt) : "") + ' bleibt unverändert sichtbar. Die Korrektur wird als neuer Eintrag mit Datum gespeichert.</div>' : "") +
      '<div class="row"><div><label class="f req" for="tDate">Datum</label><input class="i" type="date" id="tDate" value="' + day + '"></div><div><label class="f req" for="tBy">Behandelt von</label><input class="i" id="tBy" value="' + esc(base.behandler || settings().practitioner) + '"></div></div>' +
      '<label class="f">Behandelte Bereiche</label><div class="chips" id="tAreas">' + C.treatments.map(function (t) { var on = (base.areas || []).indexOf(t) >= 0; return '<button class="chip' + (on ? " sel" : "") + '" data-a="toggleArea" data-v="' + esc(t) + '" data-on="' + (on ? 1 : 0) + '">' + esc(t) + '</button>'; }).join("") + '</div>' +
      '<div class="row3"><div><label class="f" for="tProd">Produkt</label><input class="i" id="tProd" value="' + esc(base.product || "") + '" placeholder="z. B. Juvederm Volbella"></div><div><label class="f req" for="tLot">Charge (LOT)</label><input class="i" id="tLot" value="' + esc(orig ? orig.lot || "" : "") + '" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"></div><div><label class="f" for="tAmt">Menge (ml)</label><input class="i" id="tAmt" inputmode="decimal" value="' + esc(orig ? orig.amount || "" : base.amount || "") + '"></div></div>' +
      '<label class="f" for="tNotes">Was wurde gemacht? Verlauf, Besonderheiten, Empfehlung</label><textarea class="i" id="tNotes" style="min-height:110px">' + esc(orig ? orig.notes || "" : "") + '</textarea>' +
      (canPhoto
        ? '<label class="f">Fotos</label><p class="stepSub npHint">Bitte bei jedem Foto wählen, wann es aufgenommen wurde. Die Beschreibung ist freiwillig.</p><div class="npList" id="tPhotos"></div>' +
          '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><label class="btn">' + I.camera + 'Foto aufnehmen<input type="file" accept="image/*" capture="environment" data-a-change="addPhoto" style="display:none"></label><label class="btn">' + I.photo + 'Aus Galerie<input type="file" accept="image/*" multiple data-a-change="addPhoto" style="display:none"></label></div>'
        : '<div class="npList" id="tPhotos"></div><div class="warnbox">Keine Einwilligung für Dokumentationsfotos. Fotos können nicht gespeichert werden. Die Patientin kann sie über „Fragebogen aktualisieren“ erteilen.</div>') +
      (!correctsId ? '<div class="warnbox' + (consentFor(pid, day) ? " hidden" : "") + '" id="tNoConsent" style="margin-top:12px">Für dieses Datum liegt keine unterschriebene Einwilligung vor.<br><button class="btn primary" data-a="newConsent" data-id="' + pid + '">' + I.sign + 'Aufklärung starten</button><label class="check"><input type="checkbox" id="tNoConsentOk"><span>Einwilligung liegt anders vor oder es wurde nicht injiziert</span></label></div>' : "") +
      '<div class="err" id="tErr"></div></div>' +
      '<div class="modalFoot"><button class="btn" data-a="closeModal">Abbrechen</button><button class="btn primary" data-a="saveTreatment" data-id="' + pid + '" data-c="' + (correctsId || "") + '">In der Akte speichern</button></div>', true);
    renderNewPhotos();
  }
  // Jedes neue Foto: Zeitpunkt (Vorher / Direkt nach / Kontrolle / Ergebnis) und optionale Kurzbeschreibung.
  function renderNewPhotos() {
    var box = $("#tPhotos"); if (!box) return;
    box.innerHTML = S.newPhotos.map(function (ph, i) {
      return '<div class="np"><img src="' + esc(photoSrc(ph)) + '" alt=""><div class="npR"><div class="npKinds" role="group" aria-label="Zeitpunkt des Fotos">' +
        PH_KINDS.map(function (k) { return '<button type="button" class="chip' + (ph.kind === k ? " sel" : "") + '" data-a="photoKind" data-i="' + i + '" data-v="' + k + '">' + PH_KIND[k] + '</button>'; }).join("") + '</div>' +
        '<input class="i" data-pcap="' + i + '" maxlength="80" value="' + esc(ph.caption || "") + '" placeholder="Beschreibung (optional), z. B. frontal, entspannt" autocomplete="off" spellcheck="true" enterkeyhint="done"></div>' +
        '<button type="button" class="iconbtn npRm" data-a="rmPhoto" data-i="' + i + '" aria-label="Foto entfernen">' + I.close + '</button></div>';
    }).join("");
  }
  // Vorschlag für den Zeitpunkt: zweites Foto nach „Vorher“ ist „Direkt nach“; bei Kontrolle „Kontrolle“; erstes Foto überhaupt „Vorher“.
  function defaultPhotoKind() {
    var list = S.newPhotos || [];
    if (list.length) { var lk = list[list.length - 1].kind; return lk === "vorher" ? "direkt" : (lk || ""); }
    if (selectedChips('[data-a="toggleArea"]').indexOf("Kontrolle") >= 0) return "kontrolle";
    var prev = S.tPid ? allPhotos(S.tPid) : [], dEl = $("#tDate"), d = dEl && dEl.value ? dEl.value : isoDay(Date.now());
    if (!prev.length) return "vorher";
    return prev.some(function (ph) { return ph.date === d; }) ? "direkt" : "";
  }

  // Aufklärung + Einwilligung. Teil C (Behandlerin) zuerst; Teil D (Patientin) erst nach abgeschlossenem Gespräch.
  var HARD = ["q12", "q21", "q22"];
  function consentTextHtml(lang, refused) {
    var pc = contentFor(lang);
    var main = refused ? '<b>' + esc(TL(lang, "consentRefusalLabel")) + '</b> ' + esc(pc.refusalText) : pc.consentText.map(esc).join("<br><br>");
    if (lang === "de") return main;
    var de = refused ? "<b>Ablehnung:</b> " + esc(C.refusalText) : C.consentText.map(esc).join("<br>");
    return main + '<div class="deBinding" lang="de"><b>' + esc(TL(lang, "consentGermanBinding")) + '</b><br>' + de + '</div>';
  }
  function consentModal(pid) {
    var p = patient(pid); if (!p) return;
    var an = latestAnamnesis(pid), yes = yesQs(an), lang = LANGS.indexOf(p.lang) >= 0 ? p.lang : "de";
    var hasHard = yes.some(function (q) { return HARD.indexOf(q.id) >= 0; });
    S.consent = { pid: pid, lang: lang, talkConfirmedAt: null };
    modal(mHead("Aufklärung und Einwilligung") + '<div class="modalBody">' +
      '<div class="postHead">' + avatarHtml(p, "md") + '<div><div class="who">' + esc(fullName(p)) + '</div><div class="when">Hyaluron-Filler · Gesicht und Lippen' + (lang !== "de" ? " · Sprache der Patientin: " + LANG_DE[lang] : "") + '</div></div></div>' +
      '<div id="partC">' +
      (an ? '<div class="' + (yes.length ? "warnbox" : "note") + '"><b>Gesundheitsfragebogen vom ' + fmtDT(an.createdAt) + ':</b> ' + (yes.length ? yes.map(function (q) { var ad = ansDetail(an.answers[q.id]); return esc(shortQ(q)) + (ad ? " (" + esc(ad) + ")" : ""); }).join(" · ") : "keine Auffälligkeiten") + (an.questions ? '<br><b>Fragen:</b> ' + esc(an.questions) : "") + '</div>' : '<div class="warnbox">Kein Gesundheitsfragebogen vorhanden. Bitte zuerst den Fragebogen am Tablet ausfüllen lassen.</div>') +
      yes.map(function (q) {
        var ad = ansDetail(an.answers[q.id]), hard = HARD.indexOf(q.id) >= 0;
        return '<label class="check"><input type="checkbox" data-ack="' + q.id + '"><span><b' + (hard ? ' style="color:var(--red)"' : "") + '>' + esc(shortQ(q)) + '</b>' + (ad ? ": " + esc(ad) : "") + ' besprochen' + (hard ? '<br><span style="color:var(--red)">Gegenanzeige laut Patienteninformation: Behandlung in der Regel nicht möglich oder verschieben</span>' : "") + '</span></label>';
      }).join("") +
      (hasHard ? '<label class="f req" for="cHardReason">Begründung, warum trotzdem behandelt wird</label><textarea class="i" id="cHardReason"></textarea>' : "") +
      '<h3 style="margin-top:18px">C. Von der Behandlerin auszufüllen</h3>' +
      '<label class="f req">Geplante Behandlung</label><div class="chips">' + C.treatments.map(function (t) { return '<button class="chip" data-a="toggleCArea" data-v="' + esc(t) + '" data-on="0">' + esc(t) + '</button>'; }).join("") + '</div>' +
      '<input class="i" id="cOther" placeholder="Sonstiges: bitte angeben" style="margin-top:6px">' +
      '<label class="f">Behandlungsbereiche einzeichnen</label><div class="sigwrap" style="max-width:520px"><canvas class="face" id="faceC"></canvas><button class="btn sigclear" data-a="faceClear">Löschen</button></div>' +
      '<div class="row3"><div><label class="f" for="cProd">Produkt</label><input class="i" id="cProd"></div><div><label class="f" for="cAmt">Menge (ml)</label><input class="i" id="cAmt" inputmode="decimal"></div><div><label class="f req" for="cTech">Technik</label><select class="i" id="cTech"><option value="">bitte wählen</option><option>Nadel</option><option>Kanüle</option><option>Nadel und Kanüle</option></select></div></div>' +
      '<div class="row"><div><label class="f req" for="cCost">Voraussichtliche Kosten (€)</label><input class="i" id="cCost" inputmode="decimal"></div><div><label class="f req" for="cBy">Aufklärung durch</label><input class="i" id="cBy" value="' + esc(settings().practitioner) + '"></div></div>' +
      '<label class="f req" for="cNotes">Inhalt des Aufklärungsgesprächs</label><textarea class="i" id="cNotes" placeholder="Besprochene Risiken, Alternativen, Besonderheiten aus dem Fragebogen, Fragen der Patientin und Antworten, Hinweis auf Bedenkzeit"></textarea>' +
      '<label class="check"><input type="checkbox" id="cTalk"><span>Aufklärungsgespräch persönlich geführt (Dauer ca. <input class="i" id="cMin" inputmode="numeric" style="width:70px;display:inline-block;padding:4px 8px"> Min.)</span></label>' +
      '<label class="check"><input type="checkbox" id="cContra"><span>Gesundheitsfragebogen' + (an ? " vom " + fmtDT(an.createdAt) : "") + ' geprüft, Gegenanzeigen ausgeschlossen</span></label>' +
      '<div class="err" id="cErrC"></div>' +
      '<button class="btn primary big" data-a="toPartD" style="width:100%;justify-content:center;margin-top:8px">Aufklärungsgespräch abgeschlossen: weiter zur Unterschrift</button>' +
      '</div>' +
      '<div id="partD" class="hidden" lang="' + lang + '">' +
      '<h3 style="margin-top:18px">' + esc(TL(lang, "consentHeading")) + '</h3>' +
      '<div class="note" id="cSummary"></div>' +
      '<label class="check"><input type="checkbox" id="cRefuse"><span><b>' + esc(TL(lang, "consentRefuseCheck")) + '</b></span></label>' +
      '<div class="note" id="cText">' + consentTextHtml(lang, false) + '</div>' +
      '<p><b>' + esc(TL(lang, "consentSignAfterTalk")) + '</b></p>' +
      '<label class="f">' + esc(TL(lang, "consentSigPatientLabel")) + '</label><div class="sigwrap line"><canvas class="sig" id="sigCP"></canvas><button class="btn sigclear" data-a="padClear" data-v="cp">' + esc(TL(lang, "clear")) + '</button><span class="sighint">' + esc(TL(lang, "consentSigPatientHint")) + '</span></div>' +
      '<label class="f" lang="de">Unterschrift Behandlerin / Behandler</label><div class="sigwrap line"><canvas class="sig" id="sigCB"></canvas><button class="btn sigclear" data-a="padClear" data-v="cb">Löschen</button><span class="sighint">Behandlerin / Behandler</span></div>' +
      '<div class="stepSub" id="cDate"></div>' +
      '</div>' +
      '<div class="err" id="cErr"></div></div>' +
      '<div class="modalFoot"><span class="hoOnly"><input type="password" inputmode="numeric" maxlength="4" id="hoPin" placeholder="PIN" class="i" autocomplete="off"><button class="btn" data-a="hoCancel">Abbrechen</button></span>' +
      '<button class="btn" data-a="closeModal">Abbrechen</button><button class="btn primary hidden" id="cSave" data-a="saveConsent">Unterschrieben speichern</button></div>', true);
    S.pads = { face: new Pad($("#faceC"), { bg: faceBg, color: "#c0262d", width: 3.5 }) };
  }
  function validateC() {
    if (!latestAnamnesis(S.consent.pid)) return "Bitte zuerst den Gesundheitsfragebogen ausfüllen lassen.";
    var areas = selectedChips('[data-a="toggleCArea"]');
    if (!areas.length) return "Bitte geplante Behandlung wählen.";
    if (areas.indexOf("Sonstiges") >= 0 && !$("#cOther").value.trim()) return "Bitte Sonstiges angeben.";
    if (!$("#cTech").value) return "Bitte Technik wählen.";
    if (!$("#cCost").value.trim()) return "Bitte voraussichtliche Kosten angeben (§ 630c BGB).";
    if (!$("#cBy").value.trim()) return "Bitte angeben, wer aufgeklärt hat.";
    if (!$("#cNotes").value.trim()) return "Bitte den Inhalt des Aufklärungsgesprächs notieren.";
    if (!$("#cTalk").checked) return "Bitte bestätigen, dass das Gespräch persönlich geführt wurde.";
    if (!/^\d+$/.test($("#cMin").value.trim())) return "Bitte Dauer des Gesprächs in Minuten angeben.";
    if ($all("[data-ack]").some(function (x) { return !x.checked; })) return "Bitte jede Ja-Antwort aus dem Fragebogen als besprochen bestätigen.";
    if ($("#cHardReason") && !$("#cHardReason").value.trim()) return "Bitte begründen, warum trotz Gegenanzeige behandelt wird.";
    if (!$("#cContra").checked) return "Bitte Gegenanzeigen prüfen und bestätigen.";
    return "";
  }
  function toPartD() {
    var cErr = validateC();
    if (cErr) { $("#cErrC").textContent = cErr; $("#cErrC").scrollIntoView({ block: "center" }); return; }
    var lang = S.consent.lang, now = Date.now();
    $all("#partC input,#partC select,#partC textarea,#partC button").forEach(function (x) { x.disabled = true; });
    $("#faceC").style.pointerEvents = "none";
    S.consent.talkConfirmedAt = now;
    var areas = selectedChips('[data-a="toggleCArea"]'), other = $("#cOther").value.trim();
    $("#cSummary").innerHTML = '<b>' + esc(TL(lang, "consentPlanned")) + ':</b> ' + esc(areas.join(", ") + (other ? " (" + other + ")" : "")) +
      '<br><b>' + esc(TL(lang, "consentCost")) + ':</b> ' + esc($("#cCost").value.trim()) + ' €. ' + esc(TL(lang, "consentCostSelf"));
    $("#cDate").textContent = (C.practice.city ? C.practice.city + ", " : "") + fmtDTL(now, lang);
    $("#cErrC").textContent = ""; $("#cErr").textContent = "";
    $("#partD").classList.remove("hidden"); $("#cSave").classList.remove("hidden");
    S.pads.cp = sigPad("sigCP"); S.pads.cb = sigPad("sigCB");
    document.body.classList.add("handover");
    $("#partD").scrollIntoView({ block: "start" });
  }

  function consentDocHtml(d) {
    var p = patient(d.patientId) || {}, av = d.anamnesisId ? docById(d.anamnesisId) : null;
    var cText = d.consentText || C.consentText, rText = d.refusalText || C.refusalText;
    var shownLang = d.lang && d.lang !== "de" ? d.lang : null;
    return '<div class="postHead">' + avatarHtml(p, "md") + '<div><div class="who">' + esc(fullName(p)) + '</div><div class="when">' + fmtDT(d.createdAt) + ' · Textversion ' + esc(d.contentVersion) + (shownLang ? " · Sprache der Patientin: " + LANG_DE[shownLang] : "") + '</div></div></div>' +
      (d.refused ? '<div class="warnbox"><b>Ablehnung:</b> ' + esc(rText) + '</div>' : "") +
      '<dl class="meta"><dt>Behandlung</dt><dd>' + esc((d.areas || []).join(", ")) + (d.other ? " (" + esc(d.other) + ")" : "") + '</dd><dt>Produkt</dt><dd>' + esc(d.product || "") + (d.amount ? ", " + esc(d.amount) + " ml" : "") + '</dd><dt>Technik</dt><dd>' + esc(d.tech || "") + '</dd><dt>Kosten</dt><dd>' + esc(d.cost || "") + ' €</dd><dt>Aufgeklärt von</dt><dd>' + esc(d.behandler) + '</dd>' +
      '<dt>Gespräch</dt><dd>' + (d.talk ? "persönlich geführt" + (d.minutes ? ", ca. " + esc(d.minutes) + " Min." : "") : "nicht bestätigt") + '</dd>' +
      (d.talkConfirmedAt ? '<dt>Gespräch abgeschlossen</dt><dd>' + fmtDT(d.talkConfirmedAt) + '</dd>' : "") +
      '<dt>Unterschrift</dt><dd>' + esc(d.city ? d.city + ", " : "") + fmtDT(d.createdAt) + '</dd>' +
      '<dt>Fragebogen</dt><dd>' + (av ? "Version vom " + fmtDT(av.createdAt) : "keiner") + '</dd>' +
      (d.acks ? '<dt>Ja-Antworten besprochen</dt><dd>' + esc(d.acks.map(function (id) { return shortQ({ id: id }); }).join(", ") || "keine") + '</dd>' : "") +
      (d.hardReason ? '<dt>Begründung Gegenanzeige</dt><dd>' + esc(d.hardReason) + '</dd>' : "") +
      '<dt>Gegenanzeigen</dt><dd>' + (d.contra ? "ausgeschlossen" : "nicht bestätigt") + '</dd></dl>' +
      '<p style="white-space:pre-wrap"><b>Gesprächsinhalt:</b> ' + esc(d.notes || "") + '</p>' +
      (d.face ? '<img src="' + d.face + '" alt="" style="width:100%;max-width:520px;border:1px solid var(--line);border-radius:8px">' : "") +
      (!d.refused ? '<div class="note">' + cText.map(esc).join("<br>") + '</div>' : "") +
      (shownLang ? '<div class="deBinding">Der Patientin angezeigt (' + LANG_DE[shownLang] + '):<br>' + (d.refused ? esc(d.refusalTextShown || "") : (d.consentTextShown || []).map(esc).join("<br>")) + '</div>' : "") +
      '<div class="row"><div>' + (d.sigPatient ? '<img src="' + d.sigPatient + '" alt="" style="height:80px;max-width:100%">' : "") + '<div class="stepSub">Unterschrift Patientin</div></div><div>' + (d.sigBehandler ? '<img src="' + d.sigBehandler + '" alt="" style="height:80px;max-width:100%">' : "") + '<div class="stepSub">Unterschrift Behandlerin / Behandler</div></div></div>';
  }
  function viewConsent(id) {
    var d = docById(id); if (!d) return;
    modal(mHead(d.refused ? "Ablehnung" : "Aufklärung und Einwilligung") + '<div class="modalBody">' + consentDocHtml(d) + '</div>' +
      '<div class="modalFoot"><button class="btn" data-a="closeModal">Schließen</button><button class="btn primary" data-a="printCopy" data-id="' + d.id + '">' + I.print + 'Kopie für Patientin</button></div>', true);
  }

  // ---------------------------------------------------------------- PRINT (PDF przez systemowe „Drucken > PDF”)
  function stripAvatars(h) { return h.replace(/class="avatar[^"]*"[^>]*>[^<]*<\/span>/g, ">"); }
  function doPrint(h) {
    $("#print").innerHTML = h; document.body.classList.add("printing");
    setTimeout(function () { window.print(); }, 300);
  }
  // Abschrift für die Patientin (§ 630e Abs. 2 Satz 2 BGB) inkl. Kosten in Textform (§ 630c Abs. 3 BGB)
  function printCopy(id) {
    var d = docById(id); if (!d) return;
    var p = patient(d.patientId) || {}, lang = d.lang && d.lang !== "de" ? d.lang : null;
    var h = '<h1>' + (d.refused ? "Ablehnung" : "Aufklärung und Einwilligung") + ': Hyaluron-Filler</h1><p>' + practiceLine() + '</p><p>Abschrift für ' + esc(fullName(p)) + (p.dob ? ", geb. " + fmtDate(p.dob) : "") + '</p>' +
      stripAvatars(consentDocHtml(d)) +
      '<h2 class="pb">Patienteninformation</h2>' + fillerInfo("de") +
      (lang ? '<h2 class="pb">' + esc(TL(lang, "stepTitles").info) + '</h2>' + fillerInfo(lang) : "");
    DB.put({ id: uid(), kind: "log", type: "copy", patientId: d.patientId, createdAt: Date.now(), text: "Abschrift der " + (d.refused ? "Ablehnung" : "Einwilligung") + " vom " + fmtDT(d.createdAt) + " zum Drucken oder Teilen geöffnet" }).catch(function () { /* Protokoll optional */ });
    doPrint(h);
  }
  function printPatient(pid) {
    var p = patient(pid); if (!p) return;
    var h = '<h1>Patientenakte: ' + esc(fullName(p)) + '</h1><p>' + practiceLine() + '<br>Erstellt am ' + fmtDT(Date.now()) + '</p>' +
      '<h2>Persönliche Angaben</h2><table><tr><td>Geburtsdatum</td><td>' + (p.dob ? fmtDate(p.dob) : "") + '</td></tr><tr><td>Adresse</td><td>' + esc(p.street) + ', ' + esc(p.zip) + ' ' + esc(p.city) + '</td></tr><tr><td>Telefon / E-Mail</td><td>' + esc(p.phone) + ' / ' + esc(p.email) + '</td></tr>' + (p.lang && p.lang !== "de" ? '<tr><td>Sprache</td><td>' + LANG_DE[p.lang] + '</td></tr>' : "") + '</table>';
    byPatient("anamnesis", pid).forEach(function (v, i) {
      h += '<h2>Gesundheitsfragebogen vom ' + fmtDT(v.createdAt) + (i === 0 ? " (aktuell)" : "") + (v.lang && v.lang !== "de" ? ", ausgefüllt auf " + LANG_DE[v.lang] : "") + '</h2><table>' +
        C.questions.filter(function (q) { return v.sex !== "männlich" || !q.women; }).map(function (q) {
          var a = v.answers[q.id] || {}, ad = ansDetail(a);
          return '<tr><td>' + esc(qText(v, q)) + (v.qTextsShown && v.qTextsShown[q.id] ? '<br><span class="shown">' + esc(v.qTextsShown[q.id]) + '</span>' : "") + (ad ? "<br><i>" + esc(ad) + "</i>" : "") + '</td><td><b>' + (a.a === "j" ? "Ja" : a.a === "n" ? "Nein" : "") + '</b></td></tr>';
        }).join("") + '</table>' + (v.questions ? '<p>Fragen der Patientin: ' + esc(v.questions) + '</p>' : "") + (v.signature ? '<img class="sig" src="' + v.signature + '">' : "");
    });
    byPatient("treatconsent", pid).forEach(function (d) { h += '<h2 class="pb">' + (d.refused ? "Ablehnung" : "Aufklärung und Einwilligung") + ' vom ' + fmtDT(d.createdAt) + '</h2>' + stripAvatars(consentDocHtml(d)); });
    var cf = photoConsent(pid);
    if (cf) h += '<h2>Einwilligung Fotos vom ' + fmtDT(cf.createdAt) + '</h2><p>Dokumentation: ' + (cf.doc ? "ja" : "nein") + ' · Website und Social Media: ' + esc(pubLabel(cf.pub)) + '</p>';
    var tr = byPatient("treatment", pid).slice().reverse(), seenPh = {};
    if (tr.length) h += '<h2 class="pb">Behandlungen</h2>';
    tr.forEach(function (e) {
      var o = e.correctsId ? docById(e.correctsId) : null;
      h += '<h3>' + fmtDate(e.date) + ': ' + esc((e.areas || []).join(", ")) + (e.correctsId ? " (Korrektur zum Eintrag vom " + (o ? fmtDT(o.createdAt) : "") + ")" : "") + '</h3><p>Produkt: ' + esc(e.product || "") + ' · Charge: ' + esc(e.lot || "") + ' · Menge: ' + esc(e.amount || "") + ' ml · Behandelt von: ' + esc(e.behandler || "") + '<br>Eingetragen: ' + fmtDT(e.createdAt) + '</p>' + (e.notes ? '<p>' + esc(e.notes) + '</p>' : "") +
        photoList(e).filter(function (ph) { var src = photoSrc(ph); if (!src || seenPh[src]) return false; seenPh[src] = 1; return true; }).map(function (ph) {
          var lb = photoLabel(ph, true);
          return '<span class="ph"><img src="' + esc(photoSrc(ph)) + '">' + (lb ? '<small>' + esc(lb) + '</small>' : "") + '</span>';
        }).join("");
    });
    byPatient("log", pid).forEach(function (l) { h += '<p style="font-size:10px;color:#666">' + fmtDT(l.createdAt) + ': ' + esc(l.text) + '</p>'; });
    doPrint(h);
  }

  // ---------------------------------------------------------------- DEMO data
  // Gezeichnetes Beispielgesicht, immer gleicher Bildausschnitt (wichtig für den Schieberegler).
  // o: hue (Hintergrund), label, lip (Lippenvolumen ~0.6 bis 1.3), red (Rötung 0 bis 1), fold (Nasolabialfalte 0 bis 1)
  function demoPhoto(o) {
    var c = document.createElement("canvas"); c.width = 600; c.height = 800; var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 600, 800); g.addColorStop(0, "hsl(" + o.hue + ",30%,84%)"); g.addColorStop(1, "hsl(" + (o.hue + 20) + ",26%,62%)");
    x.fillStyle = g; x.fillRect(0, 0, 600, 800);
    x.fillStyle = "hsl(26,42%,86%)"; x.beginPath(); x.ellipse(300, 390, 205, 280, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#6d5a52"; [210, 390].forEach(function (ex) { x.beginPath(); x.ellipse(ex, 320, 30, 11, 0, 0, Math.PI * 2); x.fill(); });
    x.strokeStyle = "#8a6f62"; x.lineWidth = 7; x.lineCap = "round";
    [[165, 255], [345, 435]].forEach(function (b) { x.beginPath(); x.moveTo(b[0], 287); x.quadraticCurveTo((b[0] + b[1]) / 2, 266, b[1], 287); x.stroke(); });
    x.strokeStyle = "hsl(20,30%,70%)"; x.lineWidth = 4; x.beginPath(); x.moveTo(300, 330); x.lineTo(286, 440); x.quadraticCurveTo(300, 455, 316, 440); x.stroke();
    if (o.fold) {
      x.strokeStyle = "rgba(140,92,82," + o.fold + ")"; x.lineWidth = 3 + 5 * o.fold;
      [-1, 1].forEach(function (k) { x.beginPath(); x.moveTo(300 + k * 46, 452); x.quadraticCurveTo(300 + k * 96, 520, 300 + k * 90, 590); x.stroke(); });
    }
    var s = o.lip || 1, red = o.red || 0;
    if (red) { x.fillStyle = "rgba(225,95,95," + (0.16 * red) + ")"; x.beginPath(); x.ellipse(300, 557, 135, 62, 0, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "hsl(" + (352 - red * 4) + "," + (44 + red * 18) + "%," + (60 - red * 6) + "%)";
    x.beginPath(); x.ellipse(300, 549 - 9 * s, 70 + 10 * s, 6 + 13 * s, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(300, 565, 66 + 10 * s, 8 + 16 * s, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "rgba(120,40,50,.5)"; x.lineWidth = 2; x.beginPath(); x.moveTo(226, 557); x.quadraticCurveTo(300, 563, 374, 557); x.stroke();
    x.fillStyle = "rgba(255,255,255,.92)"; x.textAlign = "center"; x.font = "bold 30px sans-serif"; x.fillText(o.label, 300, 752);
    x.font = "16px sans-serif"; x.fillStyle = "rgba(255,255,255,.75)"; x.fillText("Beispielbild", 300, 780);
    return c.toDataURL("image/jpeg", 0.8);
  }
  function demoSig(k) {
    var c = document.createElement("canvas"); c.width = 400; c.height = 120; var x = c.getContext("2d");
    x.lineWidth = 2.4; x.lineCap = "round"; x.strokeStyle = "#1f1a1c"; x.beginPath(); x.moveTo(20, 80);
    for (var i = 0; i < 12; i++) x.quadraticCurveTo(35 + i * 28, (i % 2 ? 25 : 100) + k * 4, 50 + i * 28, 70);
    x.stroke(); return c.toDataURL("image/png");
  }
  function makeDemo() {
    var now = Date.now(), ps = [], pr = settings().practitioner;
    var people = [
      { first: "Anna", last: "Beispiel", dob: "1991-04-12", sex: "weiblich", street: "Musterstraße 1", zip: "10115", city: "Berlin", phone: "0151 0000000", email: "anna@example.com", height: "168", weight: "60" },
      { first: "Julia", last: "Muster", dob: "1986-09-30", sex: "weiblich", street: "Beispielweg 5", zip: "10585", city: "Berlin", phone: "0160 0000000", email: "julia@example.com", height: "172", weight: "64" }
    ];
    // Verlauf über gut 3 Monate: Vorher und direkt nach der Behandlung, Kontrolle nach 2 Wochen, Ergebnis nach 3 Monaten.
    // Julia zusätzlich mit einer zweiten, jüngeren Behandlung (Lippen), damit Bereichsfilter und „letzte Behandlung“ etwas zeigen.
    var today = isoDay(now);
    function at(iso, h, m) { var q = isoParts(iso); return Math.min(now - 60000, new Date(q[0], q[1] - 1, q[2], h, m || 0).getTime()); }
    var plans = [
      { hue: 340, series: [
        { area: "Lippen: Volumen", start: isoAddDays(isoAddMonths(today, -3), -2), product: "Hyaluron-Filler (Demo)", lot: "DEMO-1000", amount: "1", cost: "229", tech: "Nadel",
          notes: "Ausgangsbefund fotografiert. 1 ml Lippen mit Nadel, gut vertragen. Kühlung und Verhaltenshinweise mitgegeben.",
          photos: [{ kind: "vorher", caption: "frontal, entspannt", o: { lip: 0.6 } }, { kind: "direkt", caption: "leichte Schwellung, normal", o: { lip: 1.3, red: 1 } }],
          control: { notes: "Kontrolle: Schwellung abgeklungen, symmetrisch, Patientin zufrieden.", caption: "Schwellung abgeklungen", o: { lip: 1.08, red: 0.15 } },
          result: { notes: "Ergebnis nach 3 Monaten stabil, Volumen gut erhalten. Auffrischung frühestens in 3 Monaten besprochen.", caption: "frontal, entspannt", o: { lip: 1.0 } } }
      ] },
      { hue: 20, series: [
        { area: "Nasolabialfalten", start: isoAddDays(isoAddMonths(today, -3), -9), product: "Hyaluron-Filler (Demo)", lot: "DEMO-2000", amount: "2", cost: "349", tech: "Kanüle",
          notes: "Nasolabialfalten beidseits mit Kanüle, je 1 ml. Gut vertragen, kleine Rötung an den Einstichstellen.",
          photos: [{ kind: "vorher", caption: "frontal, Kopf gerade", o: { fold: 0.8, lip: 0.8 } }, { kind: "direkt", caption: "Einstichstellen leicht gerötet", o: { fold: 0.25, lip: 0.8, red: 0.3 } }],
          control: { notes: "Kontrolle: gleichmäßig, keine Knötchen tastbar.", caption: "gleichmäßig", o: { fold: 0.3, lip: 0.8 } },
          result: { notes: "Ergebnis nach 3 Monaten: Falten deutlich weicher, Patientin sehr zufrieden.", caption: "frontal, Kopf gerade", o: { fold: 0.36, lip: 0.8 } } },
        { area: "Lippen: Kontur", start: isoAddDays(today, -30), product: "Hyaluron-Filler (Demo)", lot: "DEMO-2001", amount: "0.5", cost: "189", tech: "Nadel",
          notes: "Lippenkontur betont, 0,5 ml. Gut vertragen.",
          photos: [{ kind: "vorher", caption: "Lippen entspannt", o: { fold: 0.36, lip: 0.8 } }, { kind: "direkt", caption: "", o: { fold: 0.36, lip: 1.15, red: 0.8 } }],
          control: { notes: "Kontrolle nach 2 Wochen: Kontur gleichmäßig, Patientin zufrieden.", caption: "Kontur gleichmäßig", o: { fold: 0.36, lip: 1.02 } } }
      ] }
    ];
    people.forEach(function (pp, k) {
      var plan = plans[k], pid = uid(), anId = uid(), first = plan.series[0].start, t0 = at(first, 9, 30), lastTs = t0;
      var ans = {}; C.questions.forEach(function (q) { ans[q.id] = { a: "n" }; });
      if (k === 0) { ans.q3 = { a: "j", d: "Pflaster (leichte Rötung)" }; ans.q11 = { a: "j", d: "ca. 2 mal im Jahr" }; }
      ps.push(DB.put({ id: anId, kind: "anamnesis", patientId: pid, createdAt: t0, contentVersion: C.version, lang: "de", answers: ans, sex: pp.sex, confirm: [true, true], signature: demoSig(k), demo: true }));
      ps.push(DB.put({ id: uid(), kind: "consent", type: "fotos", patientId: pid, createdAt: t0, contentVersion: C.version, lang: "de", doc: true, pub: "ohne", signature: demoSig(k), demo: true }));
      ps.push(DB.put({ id: uid(), kind: "consent", type: "datenschutz", patientId: pid, createdAt: t0, contentVersion: C.version, lang: "de", read: true, signature: demoSig(k), demo: true }));
      plan.series.forEach(function (s, j) {
        var tcId = uid(), tcTs = at(s.start, 10, 5);
        ps.push(DB.put({ id: tcId, kind: "treatconsent", patientId: pid, createdAt: tcTs, contentVersion: C.version, lang: "de", areas: [s.area], product: s.product, amount: s.amount, tech: s.tech, cost: s.cost, behandler: pr, notes: "Risiken inkl. Gefäßverschluss und Erblindung besprochen, Alternativen genannt, Herpesprophylaxe empfohlen, Bedenkzeit angeboten.", talk: true, minutes: "20", contra: true, acks: k === 0 ? ["q3", "q11"] : [], talkConfirmedAt: tcTs - 300000, city: C.practice.city || "", anamnesisId: anId, consentText: C.consentText.slice(), refusalText: C.refusalText, sigPatient: demoSig(k), sigBehandler: demoSig(k + 3), demo: true }));
        function photo(ph, label) { return { src: demoPhoto(Object.assign({ hue: plan.hue, label: label }, ph.o)), kind: ph.kind, caption: ph.caption }; }
        function entry(date, h, data) {
          var ts = at(date, h, 10 + j * 5); lastTs = Math.max(lastTs, ts);
          ps.push(DB.put(Object.assign({ id: uid(), kind: "treatment", patientId: pid, createdAt: ts, date: date, behandler: pr, product: "", lot: "", amount: "", consentId: null, demo: true }, data)));
        }
        entry(s.start, 10, { areas: [s.area], product: s.product, lot: s.lot, amount: s.amount, notes: s.notes, consentId: tcId,
          photos: s.photos.map(function (ph) { return photo(ph, ph.kind === "vorher" ? "vorher" : "direkt nach"); }) });
        entry(isoAddDays(s.start, 14), 15, { areas: [s.area, "Kontrolle"], notes: s.control.notes, photos: [photo({ kind: "kontrolle", caption: s.control.caption, o: s.control.o }, "nach 2 Wochen")] });
        if (s.result) entry(isoAddMonths(s.start, 3), 11, { areas: [s.area, "Kontrolle"], notes: s.result.notes, photos: [photo({ kind: "ergebnis", caption: s.result.caption, o: s.result.o }, "nach 3 Monaten")] });
      });
      ps.push(DB.put(Object.assign({ id: pid, kind: "patient", lang: "de", createdAt: t0, updatedAt: lastTs, demo: true }, pp)));
    });
    return Promise.all(ps);
  }

  // ---------------------------------------------------------------- EVENTS
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el) return;
    var a = el.getAttribute("data-a"), id = el.getAttribute("data-id"), v = el.getAttribute("data-v");
    if (el.tagName === "A") e.preventDefault();
    var f = S.flow;
    switch (a) {
      case "noop": break;
      case "setLang":
        if (LANGS.indexOf(v) < 0) break;
        if (S.mode === "patient" && S.flow) { collectFlow(); S.flow.err = ""; }
        S.lang = v; render(); break;
      case "startPatient": closeModal(); startFlow(null); break;
      case "openPanel":
        if (!settings().pin) pinModal(enterPanel, true);
        else pinModal(enterPanel);
        break;
      case "lock": S.resumePid = null; goKiosk(); break;
      case "toKiosk":
        // Nach dem Absenden: Praxis landet nach der PIN direkt im Profil dieser Patientin.
        S.resumePid = f ? f.pid : null; goKiosk(); break;
      case "abortFlow":
        if (confirm(T("abortConfirm"))) { S.resumePid = (S.returnPanel && f) ? f.pid : null; goKiosk(); }
        break;
      case "flowBack":
        if (Date.now() - (S._stepAt || 0) < 600) break;
        collectFlow(); f.err = ""; f.step--; S._stepAt = Date.now(); render(); break;
      case "flowNext":
        if (Date.now() - (S._stepAt || 0) < 600) break;
        collectFlow(); f.err = validateStep();
        if (f.err) {
          if (STEPS[f.step] === "sign") { showFlowErr(f.err); f.err = ""; break; }
          S._keepScroll = STEPS[f.step] === "health"; render(); break;
        }
        if (STEPS[f.step] === "sign") {
          el.disabled = true;
          submitFlow().then(function () { clearDraft(); S._stepAt = Date.now(); f.step++; S.returnPanel = false; render(); })
            .catch(function (er) { el.disabled = false; showFlowErr(T("errSaveFailed", { e: errMsg(er) })); });
        } else { S._stepAt = Date.now(); f.step++; render(); }
        break;
      case "yn":
        collectFlow(); var qid = el.getAttribute("data-q");
        f.answers[qid] = Object.assign(f.answers[qid] || {}, { a: v });   // Text bleibt erhalten, falls wieder "Ja"; gespeichert wird bereinigt
        S._keepScroll = true; f.err = ""; render(); break;
      case "sigClear": if (S.sigPad) S.sigPad.clear(); break;
      case "nav":
        S.view = v; S.pid = null; resetCmp(); S.phArea = ""; clearPrint(); render();
        if (el.classList.contains("searchBtn")) { var q2 = $("#q2"); if (q2) q2.focus(); }
        break;
      case "profile": closeModal(); closeLightbox(); S.view = "profile"; S.pid = id; S.tab = "timeline"; S.anVer = null; resetCmp(); S.phArea = ""; clearPrint(); render(); break;
      case "tab": S.tab = v; S.anVer = (v === "info" && id) ? id : null; resetCmp(); render(); break;
      case "anVer": S.anVer = id; S._keepScroll = true; render(); break;
      case "updateAnamnesis": S.returnPanel = true; startFlow(S.pid); break;
      case "newTreatmentPick": pickPatientModal("pickedForTreatment"); break;
      case "pickedForTreatment": treatmentModal(id); break;
      case "newTreatment": treatmentModal(S.pid); break;
      case "correct": var od = docById(id); if (od) treatmentModal(od.patientId, id); break;
      case "toggleArea": case "toggleCArea":
        var on = el.getAttribute("data-on") !== "1"; el.setAttribute("data-on", on ? 1 : 0); el.classList.toggle("sel", on);
        break;
      case "rmPhoto": S.newPhotos.splice(+el.getAttribute("data-i"), 1); renderNewPhotos(); break;
      case "photoKind":
        var npx = S.newPhotos && S.newPhotos[+el.getAttribute("data-i")]; if (!npx) break;
        npx.kind = npx.kind === v ? "" : v;   // nochmal tippen hebt die Auswahl auf
        var row = el.parentNode;
        if (row && row.children && row.children.length) Array.prototype.forEach.call(row.children, function (b) { b.classList.toggle("sel", b.getAttribute("data-v") === npx.kind); });
        else renderNewPhotos();
        break;
      case "saveTreatment": el.disabled = true; saveTreatment(id, el.getAttribute("data-c"), el); break;
      case "newConsent": closeModal(); consentModal(id); break;
      case "faceClear": if (S.pads && S.pads.face) S.pads.face.clear(); break;
      case "padClear": if (S.pads && S.pads[v]) S.pads[v].clear(); break;
      case "toPartD": toPartD(); break;
      case "hoCancel":
        var hp = $("#hoPin");
        if (hp && hp.value === settings().pin) closeModal(); else { toast("Falsche PIN"); if (hp) hp.value = ""; }
        break;
      case "saveConsent": el.disabled = true; saveConsent(el); break;
      case "viewConsent": viewConsent(id); break;
      case "printCopy": printCopy(id); break;
      case "closeModal": closeModal(); break;
      case "zoom":
        var en = docById(id); if (!en) break;
        guard(function () { openLightbox(en, +el.getAttribute("data-i"), el.getAttribute("data-from") === "cmp"); });
        break;
      case "lbCompare":
        var lbi = +el.getAttribute("data-i");
        guard(function () { closeLightbox(); compareFrom(id, lbi); });
        break;
      case "cmpFrom": guard(function () { compareFrom(id, null); }); break;
      case "cmpPick":
        guard(function () {
          var k = el.getAttribute("data-k"); if (!k) return;
          S.cmp = S.cmp || [];
          var at = S.cmp.indexOf(k);
          if (at >= 0) S.cmp.splice(at, 1);
          else { if (S.cmp.length >= 4) { toast("Höchstens 4 Fotos gleichzeitig vergleichen"); return; } S.cmp.push(k); }
          S.cmpRange = null;
          if (S.cmpOpen) { S.cmpOpen = false; FX.queue = []; dropCmpCard(); }
          paintSelection();
        });
        break;
      case "cmpGo":
        if ((S.cmp || []).length < 2) break;
        S.cmpOpen = true; S.cmpRange = null; S._keepScroll = true; render(); scrollToCmp(); break;
      case "cmpRange":
        guard(function () {
          var pr = rangePair(allPhotos(S.pid), v);
          if (!pr) { toast("Für diesen Zeitraum gibt es nicht genug Fotos"); return; }
          S.cmp = [pr[0].key, pr[1].key]; S.cmpOpen = true; S.cmpRange = v; S._keepScroll = true; render(); scrollToCmp();
        });
        break;
      case "phArea":
        guard(function () {
          S.phArea = v || "";
          var pr = S.cmpRange && S.cmpOpen ? rangePair(allPhotos(S.pid), S.cmpRange) : null;   // aktive Schnellauswahl mit neuem Bereich wiederholen
          if (pr) { S.cmp = [pr[0].key, pr[1].key]; S.cmpOpen = true; } else resetCmp();
          S._keepScroll = true; render();
        });
        break;
      case "cmpMode":
        S.cmpMode = v === "slider" ? "slider" : "side"; S._keepScroll = true;
        guard(function () { render(); if (S.fullEl) fillCmpFull(); });
        break;
      case "cmpFull": guard(openCmpFull); break;
      case "cmpFullClose": closeCmpFull(); break;
      case "cmpPrint": guard(printComparison); break;
      case "cmpNote":
        var nt = el.previousElementSibling;
        if (nt) { var opened = nt.classList.toggle("clamp") === false; el.textContent = opened ? "Weniger anzeigen" : "Mehr anzeigen"; }
        break;
      case "cmpReset": resetCmp(); S._keepScroll = true; render(); break;
      // Gesichtsanalyse (face.js); jeder Fehler bleibt auf diese Funktion beschränkt
      case "faceCmp":
        guard(function () { S.faceCmp = !S.faceCmp; if (!S.faceCmp) FX.queue = []; S._keepScroll = true; render(); if (S.fullEl) fillCmpFull(); });
        break;
      case "faceLines": guard(faceLinesToggle); break;
      case "faceRetry":
        guard(function () {
          var fl = hookPhotos(cmpPhotos());
          fl.forEach(function (ph) { var h = srcHash(ph.src), st = FX.mem[h]; if (st && !st.ok && !st.noFace) delete FX.mem[h]; });
          faceQueue(fl.map(faceItem)); faceRefresh();
        });
        break;
      case "faceLb": guard(faceLbToggle); break;
      case "faceLbRetry":
        guard(function () { if (!S.lbPhoto) return; delete FX.mem[srcHash(S.lbPhoto.src)]; faceLbRun(); faceLbPaint(); });
        break;
      case "printPatient": printPatient(id && patient(id) ? id : S.pid); break;
      case "exportData": exportData(); break;
      case "saveSettings":
        var s = settings(); s.practitioner = $("#setName").value.trim() || s.practitioner;
        var np = $("#setPin").value.trim(); if (np) { if (!/^\d{4}$/.test(np)) { toast("PIN muss 4 Ziffern haben"); break; } s.pin = np; }
        DB.put(s).then(function () { toast("Gespeichert"); render(); }).catch(function (er) { toast("Speichern fehlgeschlagen. Bitte App schließen und neu öffnen. " + errMsg(er)); });
        break;
      case "demo":
        if (S._demoBusy) break;
        S._demoBusy = true; el.disabled = true;
        makeDemo().then(function () { S._demoBusy = false; toast("Beispieldaten angelegt"); S.view = "feed"; render(); })
          .catch(function (er) { S._demoBusy = false; el.disabled = false; toast("Speichern fehlgeschlagen. " + errMsg(er)); });
        break;
      case "wipe":
        // Nur Beispieldaten. Echte Dokumentation muss 10 Jahre bleiben (§ 630f Abs. 3 BGB).
        var demoP = {}; DB.all.forEach(function (d) { if (d.kind === "patient" && d.demo) demoP[d.id] = 1; });
        var ids = DB.all.filter(function (d) { return d.demo || demoP[d.patientId]; }).map(function (d) { return d.id; });
        if (!ids.length) { toast("Keine Beispieldaten vorhanden"); break; }
        if (confirm(ids.length + " Beispiel-Datensätze löschen? Echte Patientinnen bleiben erhalten.")) {
          DB.del(ids).then(function () { recent = recent.filter(function (x) { return !demoP[x]; }); toast("Beispieldaten gelöscht"); render(); })
            .catch(function (er) { toast("Löschen fehlgeschlagen. " + errMsg(er)); });
        }
        break;
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (S.flow && S.mode === "patient") {
      if (el.hasAttribute("data-c")) S.flow[el.getAttribute("data-c")] = el.checked;
      if (el.hasAttribute("data-ci")) S.flow.confirm[+el.getAttribute("data-ci")] = el.checked;
      if (el.hasAttribute("data-r")) { S.flow[el.getAttribute("data-r")] = el.value; $all(".radio").forEach(function (r) { r.classList.toggle("on", r.querySelector("input").checked); }); }
      draftSoon();
    }
    if (el.id === "cRefuse" && S.consent) {
      // Unterschrift gilt nie für den jeweils anderen Text.
      $("#cText").innerHTML = consentTextHtml(S.consent.lang, el.checked);
      if (S.pads && S.pads.cp) { S.pads.cp.clear(); S.pads.cb.clear(); }
    }
    if (el.id === "tDate" && S.tPid) { var w = $("#tNoConsent"); if (w) w.classList.toggle("hidden", !!consentFor(S.tPid, el.value)); }
    var ac = el.getAttribute("data-a-change");
    if (ac === "addPhoto") {
      var tok = S.photoTok, files = Array.prototype.slice.call(el.files || []), sb = $('[data-a="saveTreatment"]');
      if (!files.length) return;
      if (sb) sb.disabled = true;
      files.reduce(function (pr, file) {
        return pr.then(function () { return fileToDataUrl(file).then(function (u) { if (S.photoTok !== tok || !$("#tPhotos")) return; var kd = ""; try { kd = defaultPhotoKind(); } catch (er) { kd = ""; } S.newPhotos.push({ src: u, kind: kd, caption: "" }); renderNewPhotos(); }); });
      }, Promise.resolve())
        .catch(function () { toast("Foto konnte nicht geladen werden"); })
        .then(function () { el.value = ""; if (sb) sb.disabled = false; });
    }
    if (ac === "avatar" && el.files && el.files[0]) {
      var apid = S.pid;
      fileToDataUrl(el.files[0], 500, 0.85).then(function (u) { var p = patient(apid); if (!p) return; p.avatar = u; p.updatedAt = Date.now(); return DB.put(p); })
        .then(function () { render(); })
        .catch(function (er) { toast("Foto konnte nicht gespeichert werden. " + errMsg(er)); });
    }
    if (ac === "importData" && el.files && el.files[0]) importData(el.files[0]);
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "q" || t.id === "q2") {
      S.q = t.value;
      // Nur die Liste neu aufbauen; das Eingabefeld bleibt (Autokorrektur, Diktat, Tastatur).
      if (S.view === "patients" && $("#plist")) {
        var list = filteredPatients(); $("#plist").innerHTML = patientRows(list); $("#pcount").textContent = list.length;
        var other = $(t.id === "q" ? "#q2" : "#q"); if (other) other.value = S.q;
        return;
      }
      S.view = "patients"; S.pid = null; render();
      var q2 = $("#q2"); if (q2) { q2.focus(); try { q2.setSelectionRange(S.q.length, S.q.length); } catch (er) { /* ignore */ } }
      return;
    }
    if (t.hasAttribute && t.hasAttribute("data-pcap")) {
      var npc = S.newPhotos && S.newPhotos[+t.getAttribute("data-pcap")]; if (npc) npc.caption = t.value;
      return;
    }
    if (t.id === "f_dobTxt" && e.inputType === "insertText") {
      var dv = t.value; if (/^\d{2}$/.test(dv) || /^\d{1,2}\.\d{2}$/.test(dv)) t.value = dv + ".";
    }
    if (S.mode === "patient") draftSoon();
  });

  document.addEventListener("keydown", function (e) { if (S._pinKey && $(".pinBody")) S._pinKey(e); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (S.lbEl) closeLightbox(); else if (S.fullEl) closeCmpFull(); } });

  // Tastatur offen: feste Fußleiste fließt mit dem Inhalt (iPad)
  function isTextField(el) { return !!el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && !/^(checkbox|radio|file|button|submit)$/i.test(el.type))); }
  document.addEventListener("focusin", function (e) { if (isTouch && isTextField(e.target)) document.body.classList.add("kbd"); });
  document.addEventListener("focusout", function () { setTimeout(function () { if (!isTextField(document.activeElement)) document.body.classList.remove("kbd"); }, 60); });

  // Automatische Sperre nach 5 Min. ohne Bedienung (nie, solange ein Fenster offen ist)
  var IDLE = 5 * 60000, lastAct = Date.now();
  function lockIfIdle() { if (S.mode === "panel" && !$("#modal").innerHTML && Date.now() - lastAct >= IDLE) { S.resumePid = null; goKiosk(); } }
  ["pointerdown", "keydown"].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, true); });
  setInterval(lockIfIdle, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) lockIfIdle(); });

  function selectedChips(sel) { return $all(sel).filter(function (b) { return b.getAttribute("data-on") === "1"; }).map(function (b) { return b.getAttribute("data-v"); }); }

  function saveTreatment(pid, correctsId, btn) {
    function fail(msg) { btn.disabled = false; $("#tErr").textContent = msg; $("#tErr").scrollIntoView({ block: "center" }); }
    var date = $("#tDate").value, by = $("#tBy").value.trim();
    if (!date || !by) return fail("Bitte Datum und Behandler/in angeben.");
    var doc = { id: uid(), kind: "treatment", patientId: pid, createdAt: Date.now(), date: date, behandler: by,
      areas: selectedChips('[data-a="toggleArea"]'), product: $("#tProd").value.trim(), lot: $("#tLot").value.trim(), amount: $("#tAmt").value.trim(),
      notes: $("#tNotes").value.trim(), correctsId: correctsId || null,
      photos: (S.newPhotos || []).filter(photoSrc).map(function (ph) { return { src: photoSrc(ph), kind: photoKind(ph), caption: photoCaption(ph).trim().slice(0, 80) }; }) };
    if (!doc.areas.length && !doc.notes && !doc.photos.length) return fail("Bitte mindestens Bereich, Notiz oder Foto angeben.");
    if (doc.amount && !doc.product) return fail("Bitte Produkt angeben.");
    if ((doc.product || doc.amount) && !doc.lot) return fail("Bitte Chargennummer (LOT) angeben.");
    var tc = consentFor(pid, date), okBox = $("#tNoConsentOk"), ack = !!(okBox && okBox.checked);
    if (!correctsId && (doc.product || doc.amount) && !tc && !ack) {
      var w = $("#tNoConsent"); if (w) w.classList.remove("hidden");
      return fail("Für dieses Datum liegt keine Einwilligung vor. Bitte Aufklärung starten oder bestätigen.");
    }
    doc.consentId = tc ? tc.id : null; doc.noConsentAck = !tc && ack;
    var p = patient(pid); p.updatedAt = Date.now();
    Promise.all([DB.put(doc), DB.put(p)]).then(function () { closeModal(); S.mode = "panel"; S.view = "profile"; S.pid = pid; S.tab = "timeline"; resetCmp(); render(); toast("In der Akte gespeichert"); })
      .catch(function (er) { fail("Speichern fehlgeschlagen. Bitte App schließen und neu öffnen. " + errMsg(er)); });
  }

  function saveConsent(btn) {
    function fail(msg) { btn.disabled = false; $("#cErr").textContent = msg; $("#cErr").scrollIntoView({ block: "center" }); }
    if (!S.pads || !S.pads.cp) return fail("Bitte zuerst das Aufklärungsgespräch abschließen.");
    var lang = S.consent.lang, pc = contentFor(lang), refused = $("#cRefuse").checked;
    if (!S.pads.cp.dirty) return fail(TL(lang, "consentErrPatientSig"));
    if (!S.pads.cb.dirty) return fail("Unterschrift Behandlerin / Behandler fehlt.");
    var pid = S.consent.pid, an = latestAnamnesis(pid);
    var doc = { id: uid(), kind: "treatconsent", patientId: pid, createdAt: Date.now(), contentVersion: C.version, lang: lang, refused: refused,
      areas: selectedChips('[data-a="toggleCArea"]'), other: $("#cOther").value.trim(), product: $("#cProd").value.trim(), amount: $("#cAmt").value.trim(), tech: $("#cTech").value, cost: $("#cCost").value.trim(),
      behandler: $("#cBy").value.trim(), notes: $("#cNotes").value.trim(), talk: $("#cTalk").checked, minutes: $("#cMin").value.trim(), contra: $("#cContra").checked,
      acks: $all("[data-ack]").map(function (x) { return x.getAttribute("data-ack"); }), hardReason: $("#cHardReason") ? $("#cHardReason").value.trim() : "",
      talkConfirmedAt: S.consent.talkConfirmedAt, city: C.practice.city || "",
      face: S.pads.face.dirty ? $("#faceC").toDataURL("image/png") : null, sigPatient: S.pads.cp.data(), sigBehandler: S.pads.cb.data(),
      anamnesisId: an ? an.id : null, consentText: C.consentText.slice(), refusalText: C.refusalText };
    if (lang !== "de") { doc.consentTextShown = pc.consentText.slice(); doc.refusalTextShown = pc.refusalText; }
    DB.put(doc).then(function () {
      closeModal(); S.mode = "panel"; S.view = "profile"; S.pid = pid; S.tab = "timeline"; render();
      toast(refused ? "Ablehnung gespeichert" : "Einwilligung gespeichert");
      viewConsent(doc.id);   // direkt mit „Kopie für Patientin“
    }).catch(function (er) { fail("Speichern fehlgeschlagen. Bitte App schließen und neu öffnen. " + errMsg(er)); });
  }

  // Sicherung: auf dem iPad über die Teilen-Ansicht („In Dateien sichern“), sonst als Download.
  function exportData() {
    var d = new Date(), name = "aestheticbook-sicherung-" + isoDay(d) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + ".json";
    var json = JSON.stringify({ app: "aestheticbook", exportedAt: Date.now(), docs: DB.all });
    if (isIOS() || isStandalone()) {
      var file = null;
      try {
        if (navigator.share && navigator.canShare) {
          file = new File([json], name, { type: "application/json" });
          if (!navigator.canShare({ files: [file] })) { file = new File([json], name, { type: "text/plain" }); if (!navigator.canShare({ files: [file] })) file = null; }
        }
      } catch (er) { file = null; }
      if (file) {
        navigator.share({ files: [file] }).then(function () { toast("Sicherung erstellt"); })
          .catch(function (er) { if (er && er.name !== "AbortError") toast("Sicherung fehlgeschlagen: " + errMsg(er)); });
        return;
      }
      if (isStandalone()) { toast("Teilen ist hier nicht verfügbar. Bitte Aestheticbook über https öffnen."); return; }
    }
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
    toast("Sicherung erstellt");
  }
  function importData(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(fr.result); if (data.app !== "aestheticbook" || !Array.isArray(data.docs)) throw new Error("Keine Aestheticbook-Sicherung");
        var have = {}; DB.all.forEach(function (d) { have[d.id] = 1; });
        var add = data.docs.filter(function (d) { return d && d.id && !have[d.id] && d.id !== "settings"; });
        Promise.all(add.map(DB.put)).then(function () { toast(add.length + " Datensätze wiederhergestellt"); render(); })
          .catch(function (er) { toast("Wiederherstellen fehlgeschlagen. " + errMsg(er)); render(); });
      } catch (er) { toast("Fehler: " + er.message); }
    };
    fr.readAsText(file);
  }

  // ---------------------------------------------------------------- boot
  DB.open().then(DB.load).then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { /* ignore */ });
    loadDraft();
    render();
  }).catch(function (er) {
    $("#app").innerHTML = '<div class="card" style="margin:20px">Speicher nicht verfügbar: ' + esc(er && er.message) + '. Bitte nicht im privaten Modus öffnen.</div>';
  });
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () { /* offline-Cache optional */ });
  // Dateien der Gesichtsanalyse (ca. 22 MB) im Hintergrund für den Offline-Betrieb sichern, falls die Installation sie noch nicht geholt hat.
  function precacheMP() { try { var sw = navigator.serviceWorker; if (sw && sw.controller && window.ABFace) sw.controller.postMessage("ab-precache-mp"); } catch (e) { /* optional */ } }
  setTimeout(precacheMP, 8000);
  // Neue Version des Service Workers hat übernommen (nach einem Update): auch ihn nachladen lassen
  try { if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) navigator.serviceWorker.addEventListener("controllerchange", function () { setTimeout(precacheMP, 3000); }); } catch (e) { /* optional */ }
})();
