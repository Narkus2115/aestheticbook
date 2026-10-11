/* Aestheticbook: Gesichtsproportionen direkt auf dem Gerät.
 *
 * Nutzt MediaPipe Face Landmarker (tasks-vision 0.10.14), lokal in vendor/mediapipe/ abgelegt.
 * Es wird nichts an einen Server geschickt: Bibliothek, WebAssembly, Modell und Foto bleiben im Browser.
 *
 * Klassisches Script (kein Modul), ES5-Stil wegen Safari 15 (kein ?. kein ?? keine Klassenfelder).
 * Die Bibliothek wird erst beim ersten Aufruf von load()/analyze() nachgeladen (dynamisches import()).
 * Kein Aufruf wirft Fehler nach außen: load() und analyze() lösen immer auf, mit { ok:false, reason } im Fehlerfall.
 *
 * API (window.ABFace):
 *   isSupported()                    -> boolean (Grundvoraussetzungen: WebAssembly, WebGL, fetch)
 *   load()                           -> Promise<{ok, reason?}>, idempotent, lädt Bibliothek + Modell einmal
 *   status()                         -> "idle" | "loading" | "ready" | "failed"
 *   analyze(src)                     -> Promise<{ok, reason?, metrics?, landmarks?, width, height, ...}>
 *                                       src: data URL, URL, {src|dataUrl|url|data}, <img>, <canvas> oder Blob/File
 *   drawOverlay(canvas, result, opts)-> zeichnet Messlinien (ohne Foto, außer opts.image) passend zur Canvas-Größe
 *   renderMetricsHtml(metrics, compareTo?) -> HTML-String (deutsch), mit "vorher ..." wenn compareTo gesetzt
 *   compareRows([metrics|null, ...])  -> { ref, rows } Werte je Foto und Veränderung zum ersten messbaren Foto
 *   compact(result)                  -> kleines speicherbares Objekt {v,w,h,lm,metrics} (drawOverlay akzeptiert es auch)
 *   METRIC_INFO, DISCLAIMER, NO_FRONTAL, config, version, _math (reine Funktionen für Tests)
 *
 * Landmark-Indizes (MediaPipe Face Mesh, 468 Punkte + 10 Iris-Punkte 468..477):
 *   Mittellinie von oben: 10 Stirn oben, 151, 9 Glabella, 8, 168 Nasion, 6, 197, 195, 5, 4, 1 Nasenspitze,
 *     19, 94, 2 Subnasale, 164, 0 Oberlippe oben (Lippenrot), 11, 12, 13 Oberlippe unten (innen),
 *     14 Unterlippe oben (innen), 15, 16, 17 Unterlippe unten (Lippenrot), 18, 200, 199, 175, 152 Kinn (Menton)
 *   Mundwinkel 61 (rechts) / 291 (links); Nasenflügel außen 129 / 358; Gesichtsrand auf Wangenhöhe 234 / 454
 *   Augenbraue oben 70, 63, 105, 66, 107 (rechts) / 300, 293, 334, 296, 336 (links)
 *   Augenwinkel 33, 133 (rechts) / 362, 263 (links); Iris 468..472 (rechts) / 473..477 (links)
 *   "rechts/links" = aus Sicht der Person (bei nicht gespiegeltem Foto liegt ihre rechte Seite im Bild links).
 *   Spiegelpaare (PAIRS) und Mittellinie (MID) sind aus dem MediaPipe canonical_face_model.obj abgeleitet
 *   (exakte Spiegelung x -> -x), siehe vendor/mediapipe/README.md.
 */
(function () {
  "use strict";
  var root = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this);

  var MP_VERSION = "0.10.14";
  var DISCLAIMER = "Geometrische Messung aus dem Foto, keine medizinische Diagnose.";
  var NO_FRONTAL = "Kopf nicht frontal, Werte eingeschränkt vergleichbar";
  var MOUTH_OPEN = "Mund geöffnet, Lippenwerte eingeschränkt vergleichbar";
  var CUT_OFF = "Gesicht nicht vollständig im Bild, Werte eingeschränkt vergleichbar";

  var config = {
    maxSide: 1280,          // Fotos vor der Erkennung auf max. 1280 px verkleinern
    detectTimeoutMs: 20000, // Zeitlimit für eine Analyse (ohne erstes Laden)
    loadTimeoutMs: 45000,   // Zeitlimit für das erste Laden von Bibliothek + Modell
    forceNoSimd: false,     // Test: WebAssembly ohne SIMD erzwingen (wie Safari < 16.4)
    importMode: "auto",     // "auto": import(), bei Fehler <script type=module>; "script": nur <script type=module>
    basePath: null,         // optional andere URL für vendor/mediapipe/ (mit "/" am Ende)
    yawLimit: 8,            // Grad, ab dann Warnung "Kopf nicht frontal"
    rollLimit: 10,
    pitchLimit: 20,
    irisMm: 11.7            // mittlerer sichtbarer Irisdurchmesser, Maßstab für mm-Angaben
  };

  // ------------------------------------------------------------------ Landmark-Tabellen
  var MID = [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 94, 151, 152, 164, 168, 175, 195, 197, 199, 200];
  // Paare: [rechts, links, rechts, links, ...]
  var PAIRS = [3, 248, 7, 249, 20, 250, 21, 251, 22, 252, 23, 253, 24, 254, 25, 255, 26, 256, 27, 257, 28, 258, 29, 259, 30, 260, 31, 261, 32, 262, 33, 263, 34, 264, 35, 265, 36, 266, 37, 267, 38, 268, 39, 269, 40, 270, 41, 271, 42, 272, 43, 273, 44, 274, 45, 275, 46, 276, 47, 277, 48, 278, 49, 279, 50, 280, 51, 281, 52, 282, 53, 283, 54, 284, 55, 285, 56, 286, 57, 287, 58, 288, 59, 289, 60, 290, 61, 291, 62, 292, 63, 293, 64, 294, 65, 295, 66, 296, 67, 297, 68, 298, 69, 299, 70, 300, 71, 301, 72, 302, 73, 303, 74, 304, 75, 305, 76, 306, 77, 307, 78, 308, 79, 309, 80, 310, 81, 311, 82, 312, 83, 313, 84, 314, 85, 315, 86, 316, 87, 317, 88, 318, 89, 319, 90, 320, 91, 321, 92, 322, 93, 323, 95, 324, 96, 325, 97, 326, 98, 327, 99, 328, 100, 329, 101, 330, 102, 331, 103, 332, 104, 333, 105, 334, 106, 335, 107, 336, 108, 337, 109, 338, 110, 339, 111, 340, 112, 341, 113, 342, 114, 343, 115, 344, 116, 345, 117, 346, 118, 347, 119, 348, 120, 349, 121, 350, 122, 351, 123, 352, 124, 353, 125, 354, 126, 355, 127, 356, 128, 357, 129, 358, 130, 359, 131, 360, 132, 361, 133, 362, 134, 363, 135, 364, 136, 365, 137, 366, 138, 367, 139, 368, 140, 369, 141, 370, 142, 371, 143, 372, 144, 373, 145, 374, 146, 375, 147, 376, 148, 377, 149, 378, 150, 379, 153, 380, 154, 381, 155, 382, 156, 383, 157, 384, 158, 385, 159, 386, 160, 387, 161, 388, 162, 389, 163, 390, 165, 391, 166, 392, 167, 393, 169, 394, 170, 395, 171, 396, 172, 397, 173, 398, 174, 399, 176, 400, 177, 401, 178, 402, 179, 403, 180, 404, 181, 405, 182, 406, 183, 407, 184, 408, 185, 409, 186, 410, 187, 411, 188, 412, 189, 413, 190, 414, 191, 415, 192, 416, 193, 417, 194, 418, 196, 419, 198, 420, 201, 421, 202, 422, 203, 423, 204, 424, 205, 425, 206, 426, 207, 427, 208, 428, 209, 429, 210, 430, 211, 431, 212, 432, 213, 433, 214, 434, 215, 435, 216, 436, 217, 437, 218, 438, 219, 439, 220, 440, 221, 441, 222, 442, 223, 443, 224, 444, 225, 445, 226, 446, 227, 447, 228, 448, 229, 449, 230, 450, 231, 451, 232, 452, 233, 453, 234, 454, 235, 455, 236, 456, 237, 457, 238, 458, 239, 459, 240, 460, 241, 461, 242, 462, 243, 463, 244, 464, 245, 465, 246, 466, 247, 467];

  var IDX = {
    forehead: 10, glabella: 9, subnasale: 2, menton: 152, noseTip: 1,
    lipTop: 0, lipUpperIn: 13, lipLowerIn: 14, lipBottom: 17,
    mouthR: 61, mouthL: 291, alarR: 129, alarL: 358, faceR: 234, faceL: 454,
    browR: [70, 63, 105, 66, 107], browL: [300, 293, 334, 296, 336],
    eyeR: [33, 133], eyeL: [362, 263],
    irisR: [469, 470, 471, 472], irisL: [474, 475, 476, 477]
  };
  // Verhältnis (Haaransatz - Glabella) / (Punkt 10 - Glabella), wenn der Haaransatz im Foto nicht erkannt wird.
  // Punkt 10 liegt meist bei etwa 55 bis 65 % der Stirnhöhe (Testfoto 1,58; Normgesicht mit Farkas-Normen etwa 1,8).
  var HAIR_K = 1.75;

  // Konturen für die Zeichnung (aus FaceLandmarker.FACE_LANDMARKS_* der Bibliothek übernommen)
  var CONTOURS = [
    [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
    [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61],
    [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78],
    [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
    [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
    [46, 53, 52, 65, 55], [70, 63, 105, 66, 107], [276, 283, 282, 295, 285], [300, 293, 334, 296, 336]
  ];

  // ------------------------------------------------------------------ Texte
  var METRIC_INFO = {
    lipRatio: { label: "Lippenverhältnis", ideal: "Orientierung 1 : 1,6",
      text: "Höhe des Oberlippenrots zur Höhe des Unterlippenrots, gemessen in der Mitte. Häufig genannte Orientierung: etwa 1 : 1,6." },
    lipWidthToNose: { label: "Mundbreite zu Nasenbreite", ideal: "Orientierung 1,5",
      text: "Abstand der Mundwinkel geteilt durch die Breite der Nasenflügel. Häufig genannte Orientierung: etwa 1,5." },
    thirds: { label: "Gesichtsdrittel", ideal: "Stirn / Mitte / Kinn",
      text: "Stirn (Haaransatz bis Glabella), Mittelgesicht (Glabella bis Nasenunterkante) und Untergesicht (Nasenunterkante bis Kinnspitze) in Prozent der Gesichtshöhe. Ausgewogen ist etwa je ein Drittel. Der Haaransatz wird im Foto gesucht; ist er nicht klar sichtbar, wird er aus der Stirnform geschätzt." },
    symmetry: { label: "Symmetrie", ideal: "100 % = spiegelgleich",
      text: "Vergleich von rund 220 gespiegelten Messpunkten beider Gesichtshälften. 100 % wäre vollkommen spiegelgleich, natürliche Gesichter liegen etwas darunter." },
    brow: { label: "Augenbrauen", ideal: "Höhe links und rechts",
      text: "Höhenunterschied der Augenbrauen, bezogen auf die Gesichtsachse (nicht auf den Bildrand)." },
    mouthCorner: { label: "Mundwinkel", ideal: "Höhe links und rechts",
      text: "Höhenunterschied der Mundwinkel, bezogen auf die Gesichtsachse." },
    cheek: { label: "Wangenbreite", ideal: "Mitte bis Gesichtsrand",
      text: "Abstand von der Mittellinie bis zum Gesichtsrand auf Wangenhöhe, linke und rechte Seite verglichen. Reagiert stark auf eine leichte Kopfdrehung." },
    faceShape: { label: "Breite zu Höhe", ideal: "oval etwa 1 : 1,3 bis 1 : 1,5",
      text: "Gesichtsbreite auf Wangenhöhe zur Gesichtshöhe vom Haaransatz bis zur Kinnspitze." },
    headPose: { label: "Kopfhaltung", ideal: "frontal und gerade",
      text: "Drehung und Neigung des Kopfes im Foto. Für vergleichbare Vorher-nachher-Werte frontal, gerade, mit gleichem Abstand und gleichem Licht fotografieren." },
    sides: { label: "Seiten", text: "Links und rechts aus Sicht der Patientin (Foto nicht gespiegelt)." },
    mm: { label: "Millimeter", text: "Millimeterangaben sind Näherungen über den durchschnittlichen Irisdurchmesser von 11,7 mm." }
  };

  // ------------------------------------------------------------------ Vektor-Hilfen (rein)
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function deg(r) { return r * 180 / Math.PI; }
  function round(x, d) { if (x == null || !isFinite(x)) return null; var f = Math.pow(10, d || 0); var r = Math.round(x * f) / f; return r === 0 ? 0 : r; }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function meanOf(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : 0; }

  // Normalisierte Landmarks (x,y in 0..1 relativ zu Breite/Höhe, z relativ zur Breite) -> Pixel-3D
  function toPx(lm, W, H) {
    var P = new Array(lm.length);
    for (var i = 0; i < lm.length; i++) { var q = lm[i]; P[i] = [q.x * W, q.y * H, (q.z || 0) * W]; }
    return P;
  }

  // Gesichtskoordinaten: X = seitlich (positiv zur linken Seite der Person), Y = nach oben, Z = Tiefe.
  // Die Spiegelebene wird aus allen Spiegelpaaren geschätzt (Normale = mittlere Richtung rechts -> links),
  // dadurch sind die Werte weitgehend unabhängig von Kopfneigung und leichter Drehung.
  function computeCore(lm, W, H) {
    if (!lm || lm.length < 468 || !(W > 0) || !(H > 0)) return null;
    var P = toPx(lm, W, H);
    var n = [0, 0, 0], c = [0, 0, 0], cnt = 0, k, r, l, m;
    for (k = 0; k < PAIRS.length; k += 2) {
      r = P[PAIRS[k]]; l = P[PAIRS[k + 1]];
      n[0] += l[0] - r[0]; n[1] += l[1] - r[1]; n[2] += l[2] - r[2];
      c[0] += (l[0] + r[0]) / 2; c[1] += (l[1] + r[1]) / 2; c[2] += (l[2] + r[2]) / 2; cnt++;
    }
    for (k = 0; k < MID.length; k++) { m = P[MID[k]]; c[0] += m[0]; c[1] += m[1]; c[2] += m[2]; cnt++; }
    c = mul(c, 1 / cnt); n = norm(n);
    var v = sub(P[IDX.forehead], P[IDX.menton]);
    var u = norm(sub(v, mul(n, dot(v, n))));
    var d = cross(n, u);
    if (!len(n) || !len(u)) return null;
    var F = new Array(P.length);
    for (k = 0; k < P.length; k++) { var q = sub(P[k], c); F[k] = [dot(q, n), dot(q, u), dot(q, d)]; }
    return { P: P, F: F, c: c, n: n, u: u, d: d, W: W, H: H };
  }

  // Kopfhaltung in Grad. roll: Neigung zur Schulter, yaw: Drehung, pitch: Nicken. Vorzeichen nur informativ.
  function headPose(core) {
    var n = core.n, u = core.u, P = core.P;
    var roll = deg(Math.atan2(n[1], n[0]));
    var yaw3 = deg(Math.atan2(n[2], Math.sqrt(n[0] * n[0] + n[1] * n[1])));
    var pitch = deg(Math.atan2(u[2], Math.sqrt(u[0] * u[0] + u[1] * u[1])));
    // Gegenprobe ohne Tiefenwerte: Lage der Nasenspitze zwischen den Gesichtsrändern (im Bild, Rollwinkel herausgerechnet)
    var ca = Math.cos(-roll * Math.PI / 180), sa = Math.sin(-roll * Math.PI / 180);
    function rx(p) { return p[0] * ca - p[1] * sa; }
    var xr = rx(P[IDX.faceR]), xl = rx(P[IDX.faceL]), xn = rx(P[IDX.noseTip]);
    var half = (xl - xr) / 2, off = half > 0 ? (xn - (xl + xr) / 2) / half : 0;
    var yaw2 = deg(Math.asin(clamp(off / 1.3, -1, 1)));
    var yaw = Math.abs(yaw3) >= Math.abs(yaw2) ? yaw3 : yaw2;
    return { yaw: round(yaw, 1), yaw3d: round(yaw3, 1), yaw2d: round(yaw2, 1), pitch: round(pitch, 1), roll: round(roll, 1) };
  }

  function irisScale(core) {
    // mm pro Pixel über den Irisdurchmesser (nur bei 478 Landmarks). Plausibilitätsprüfung über den inneren Augenwinkelabstand.
    var F = core.F;
    if (F.length < 478) return null;
    function diam(ix) {
      var a = F[ix[0]], b = F[ix[2]], c2 = F[ix[1]], d2 = F[ix[3]];
      return (Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)) + Math.sqrt(Math.pow(c2[0] - d2[0], 2) + Math.pow(c2[1] - d2[1], 2))) / 2;
    }
    var dr = diam(IDX.irisR), dl = diam(IDX.irisL), dm = (dr + dl) / 2;
    if (!(dm > 1)) return null;
    if (Math.abs(dr - dl) / dm > 0.35) return null;
    var icd = Math.abs(F[IDX.eyeL[0]][0] - F[IDX.eyeR[1]][0]);
    var q = icd / dm; // typisch etwa 2,4 bis 3,2
    if (q < 1.8 || q > 4.2) return null;
    return config.irisMm / dm;
  }

  function sideDiff(valueR, valueL, scaleMm, faceW, kind) {
    // kind "higher" oder "wider": positiver Unterschied = links größer
    var diff = valueL - valueR, a = Math.abs(diff);
    var mm = scaleMm ? a * scaleMm : null, pct = faceW > 0 ? a / faceW * 100 : null;
    var same = mm != null ? mm < 0.5 : (pct != null ? pct < 0.4 : true);
    return { side: same ? "" : (diff > 0 ? "links" : "rechts"), mm: round(mm, 1), pct: round(pct, 1), kind: kind };
  }

  // Haaransatz (Trichion) in Pixeln über dem Glabella-Punkt; opts.hairUp (in 2D-Bildpixeln) kommt aus der Bildanalyse.
  function thirdsFrom(core, hairUp2d) {
    var F = core.F, P = core.P;
    var yG = F[IDX.glabella][1], yS = F[IDX.subnasale][1], yM = F[IDX.menton][1], y10 = F[IDX.forehead][1];
    var middle = yG - yS, lower = yS - yM;
    if (!(middle > 0) || !(lower > 0) || !(y10 > yG)) return null;
    // 2D-Achse im Bild für Umrechnung und Zeichnung
    var g2 = P[IDX.glabella], s2 = P[IDX.subnasale];
    var up2 = norm2([P[IDX.forehead][0] - P[IDX.menton][0], P[IDX.forehead][1] - P[IDX.menton][1]]);
    var mid2 = (g2[0] - s2[0]) * up2[0] + (g2[1] - s2[1]) * up2[1];
    var upper, found = false;
    if (hairUp2d > 0 && mid2 > 0) { upper = hairUp2d * middle / mid2; found = true; }
    else upper = (y10 - yG) * HAIR_K;
    var tot = upper + middle + lower;
    var upPx2 = mid2 > 0 ? upper * mid2 / middle : 0;
    var tri = [g2[0] + up2[0] * upPx2, g2[1] + up2[1] * upPx2];
    return {
      upper: round(upper / tot * 100, 1), middle: round(middle / tot * 100, 1), lower: round(lower / tot * 100, 1),
      hairline: found ? "erkannt" : "geschätzt",
      trichion: { x: round(tri[0] / core.W, 4), y: round(tri[1] / core.H, 4) },
      heightPx: tot
    };
  }
  function norm2(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1]); return l > 1e-12 ? [a[0] / l, a[1] / l] : [0, -1]; }

  function symmetryScore(core) {
    var F = core.F, faceW = F[IDX.faceL][0] - F[IDX.faceR][0], s = 0, cnt = 0, k, r, l;
    if (!(faceW > 0)) return null;
    for (k = 0; k < PAIRS.length; k += 2) {
      r = F[PAIRS[k]]; l = F[PAIRS[k + 1]];
      // linker Punkt an der Ebene X = 0 gespiegelt, Abstand zum rechten Punkt (frontale Projektion)
      s += Math.sqrt(Math.pow(r[0] + l[0], 2) + Math.pow(r[1] - l[1], 2)); cnt++;
    }
    for (k = 0; k < MID.length; k++) { s += 2 * Math.abs(F[MID[k]][0]); cnt++; }
    var e = s / cnt / faceW; // mittlere Abweichung relativ zur Gesichtsbreite
    return { score: round(clamp(100 * (1 - e * SYM_K), 0, 100), 0), meanDevPct: round(e * 100, 2) };
  }
  var SYM_K = 8; // 1 % mittlere Abweichung (relativ zur Gesichtsbreite) = 92 %

  // Hauptfunktion (rein, ohne DOM). lm: normalisierte Landmarks, W/H: Pixelgröße des analysierten Bildes.
  // opts.hairUp2d: erkannter Abstand Glabella -> Haaransatz in Bildpixeln (optional)
  function computeMetrics(lm, W, H, opts) {
    opts = opts || {};
    var core = computeCore(lm, W, H);
    if (!core) return null;
    var F = core.F;
    var warnings = [];
    var pose = headPose(core);
    var frontal = Math.abs(pose.yaw) <= config.yawLimit && Math.abs(pose.roll) <= config.rollLimit && Math.abs(pose.pitch) <= config.pitchLimit;
    if (!frontal) warnings.push(NO_FRONTAL);
    // Gesicht angeschnitten? MediaPipe liefert dann Punkte außerhalb des Bildes.
    var outside = 0, oval = CONTOURS[0];
    for (var oi = 0; oi < oval.length - 1; oi++) { var q = lm[oval[oi]]; if (q.x < -0.005 || q.x > 1.005 || q.y < -0.005 || q.y > 1.005) outside++; }
    var cutOff = outside >= 2;
    if (cutOff) warnings.push(CUT_OFF);
    var scale = irisScale(core);
    var faceW = F[IDX.faceL][0] - F[IDX.faceR][0];

    // Lippen (Mittellinie): Oberlippenrot 0 -> 13, Unterlippenrot 14 -> 17
    var up = F[IDX.lipTop][1] - F[IDX.lipUpperIn][1], lo = F[IDX.lipLowerIn][1] - F[IDX.lipBottom][1];
    var gap = F[IDX.lipUpperIn][1] - F[IDX.lipLowerIn][1];
    var lipOk = up > 0.5 && lo > 0.5;
    var mouthOpen = lipOk && gap > 0.35 * (up + lo) / 2;
    if (mouthOpen) warnings.push(MOUTH_OPEN);

    var mouthW = F[IDX.mouthL][0] - F[IDX.mouthR][0], noseW = F[IDX.alarL][0] - F[IDX.alarR][0];
    var thirds = thirdsFrom(core, opts.hairUp2d);

    var browR = meanOf(IDX.browR.map(function (i) { return F[i][1]; })), browL = meanOf(IDX.browL.map(function (i) { return F[i][1]; }));
    var sym = symmetryScore(core);
    var faceH = thirds ? thirds.heightPx : null;

    return {
      v: 1,
      lipRatio: lipOk ? round(lo / up, 2) : null,
      lipUpperMm: lipOk && scale ? round(up * scale, 1) : null,
      lipLowerMm: lipOk && scale ? round(lo * scale, 1) : null,
      lipWidthToNose: mouthW > 0 && noseW > 0 ? round(mouthW / noseW, 2) : null,
      mouthWidthMm: scale && mouthW > 0 ? round(mouthW * scale, 1) : null,
      noseWidthMm: scale && noseW > 0 ? round(noseW * scale, 1) : null,
      thirds: thirds ? { upper: thirds.upper, middle: thirds.middle, lower: thirds.lower, hairline: thirds.hairline, trichion: thirds.trichion } : null,
      symmetry: sym ? {
        score: sym.score, meanDevPct: sym.meanDevPct,
        brow: sideDiff(browR, browL, scale, faceW, "higher"),
        mouthCorner: sideDiff(F[IDX.mouthR][1], F[IDX.mouthL][1], scale, faceW, "higher"),
        cheek: sideDiff(-F[IDX.faceR][0], F[IDX.faceL][0], scale, faceW, "wider")
      } : null,
      faceShape: faceH && faceW > 0 ? { widthToHeight: round(faceW / faceH, 2), heightToWidth: round(faceH / faceW, 2) } : null,
      headPose: { yaw: pose.yaw, pitch: pose.pitch, roll: pose.roll, yaw3d: pose.yaw3d, yaw2d: pose.yaw2d, frontal: frontal },
      mouthOpen: mouthOpen,
      cutOff: cutOff,
      mmPerPx: scale ? round(scale, 4) : null,
      warnings: warnings,
      disclaimer: DISCLAIMER
    };
  }

  // ------------------------------------------------------------------ Formatierung (rein)
  function fmt(x, d) {
    if (x == null || !isFinite(x)) return "";
    var s = (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
    return s.replace(".", ",");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ratioLabel(r) { return r == null ? "" : "1 : " + fmt(r, 2); }   // zwei Nachkommastellen wie im Vergleich
  function diffLabel(dv) {
    if (!dv) return "";
    if (!dv.side) return dv.kind === "wider" ? "gleich breit" : "gleich hoch";
    var amount = dv.mm != null ? fmt(dv.mm, 1) + " mm" : fmt(dv.pct, 1) + " %";
    return dv.side + " " + amount + (dv.kind === "wider" ? " breiter" : " höher");
  }
  function thirdsLabel(t) { return t ? fmt(t.upper, 0) + " / " + fmt(t.middle, 0) + " / " + fmt(t.lower, 0) + " %" : ""; }
  function poseLabel(p) {
    if (!p) return "";
    if (p.frontal) return "frontal";
    var bits = [];
    if (Math.abs(p.yaw) > config.yawLimit) bits.push("gedreht " + fmt(Math.abs(p.yaw), 0) + "°");
    if (Math.abs(p.roll) > config.rollLimit) bits.push("seitlich geneigt " + fmt(Math.abs(p.roll), 0) + "°");
    if (Math.abs(p.pitch) > config.pitchLimit) bits.push("nach oben oder unten geneigt " + fmt(Math.abs(p.pitch), 0) + "°");
    return bits.join(", ") || "nicht frontal";
  }
  function g(o, path) { var c = o; for (var i = 0; i < path.length; i++) { if (c == null) return null; c = c[path[i]]; } return c == null ? null : c; }

  // Zeilen: [key, Wertetext aktuell, Wertetext vorher, Zusatz]
  function metricRows(m, p) {
    var rows = [];
    function row(key, cur, prev, sub) { rows.push({ key: key, label: METRIC_INFO[key].label, value: cur || "nicht messbar", prev: prev, sub: sub || METRIC_INFO[key].ideal, info: METRIC_INFO[key].text }); }
    var pv = function (fn) { if (!p) return ""; var s = fn(p); return s || ""; };
    row("lipRatio", ratioLabel(m.lipRatio), pv(function (x) { return ratioLabel(x.lipRatio); }));
    row("lipWidthToNose", m.lipWidthToNose != null ? fmt(m.lipWidthToNose, 2) : "", pv(function (x) { return x.lipWidthToNose != null ? fmt(x.lipWidthToNose, 2) : ""; }));
    row("thirds", thirdsLabel(m.thirds), pv(function (x) { return thirdsLabel(x.thirds); }),
      m.thirds ? "Stirn / Mitte / Kinn, Haaransatz " + m.thirds.hairline : "");
    row("symmetry", g(m, ["symmetry", "score"]) != null ? fmt(m.symmetry.score, 0) + " %" : "", pv(function (x) { return g(x, ["symmetry", "score"]) != null ? fmt(x.symmetry.score, 0) + " %" : ""; }));
    row("brow", diffLabel(g(m, ["symmetry", "brow"])), pv(function (x) { return diffLabel(g(x, ["symmetry", "brow"])); }));
    row("mouthCorner", diffLabel(g(m, ["symmetry", "mouthCorner"])), pv(function (x) { return diffLabel(g(x, ["symmetry", "mouthCorner"])); }));
    row("cheek", diffLabel(g(m, ["symmetry", "cheek"])), pv(function (x) { return diffLabel(g(x, ["symmetry", "cheek"])); }));
    row("faceShape", g(m, ["faceShape", "heightToWidth"]) != null ? "1 : " + fmt(m.faceShape.heightToWidth, 2) : "", pv(function (x) { return g(x, ["faceShape", "heightToWidth"]) != null ? "1 : " + fmt(x.faceShape.heightToWidth, 2) : ""; }));
    row("headPose", poseLabel(m.headPose), pv(function (x) { return poseLabel(x.headPose); }));
    return rows;
  }

  function renderMetricsHtml(metrics, compareTo) {
    try {
      ensureStyle();
      if (!metrics || typeof metrics !== "object") return '<div class="abf"><p class="abf-empty">Keine Messwerte vorhanden.</p></div>';
      var p = compareTo && typeof compareTo === "object" ? compareTo : null;
      var h = '<div class="abf">';
      var warns = (metrics.warnings || []).slice();
      if (p && p.warnings && p.warnings.indexOf(NO_FRONTAL) >= 0 && warns.indexOf(NO_FRONTAL) < 0) warns.push("Vorher-Foto: " + NO_FRONTAL);
      for (var w = 0; w < warns.length; w++) h += '<div class="abf-warn">' + esc(warns[w]) + '</div>';
      metricRows(metrics, p).forEach(function (r) {
        // Inneres span als Flex-Container: Safari 15 kann <summary> selbst nicht zuverlässig als Flexbox darstellen
        h += '<details class="abf-row"><summary><span class="abf-sum"><span class="abf-k">' + esc(r.label) + '<span class="abf-s">' + esc(r.sub) + '</span></span>' +
          '<span class="abf-vv"><span class="abf-v">' + esc(r.value) + '</span>' + (r.prev ? '<span class="abf-p">vorher ' + esc(r.prev) + '</span>' : "") + '</span></span></summary>' +
          '<div class="abf-i">' + esc(r.info) + '</div></details>';
      });
      var foot = METRIC_INFO.sides.text + (metrics.mmPerPx ? " " + METRIC_INFO.mm.text : "");
      h += '<p class="abf-disc">' + esc(DISCLAIMER) + " " + esc(foot) + '</p></div>';
      return h;
    } catch (e) {
      warn("renderMetricsHtml", e);
      return '<div class="abf"><p class="abf-disc">' + esc(DISCLAIMER) + '</p></div>';
    }
  }

  // Einzeiler, z. B. für Notizen
  function summaryText(m) {
    try {
      if (!m) return "";
      var bits = [];
      if (m.lipRatio != null) bits.push("Lippen " + ratioLabel(m.lipRatio));
      if (m.thirds) bits.push("Drittel " + thirdsLabel(m.thirds));
      if (m.symmetry && m.symmetry.score != null) bits.push("Symmetrie " + fmt(m.symmetry.score, 0) + " %");
      if (m.headPose && !m.headPose.frontal) bits.push("Kopf nicht frontal");
      return bits.join(", ");
    } catch (e) { return ""; }
  }

  // Vergleich mehrerer Fotos: Werte je Foto und Veränderung zum ersten messbaren Foto (Bezug).
  // list: Array aus metrics oder null (nicht messbar). Rückgabe { ref, rows: [{ key, label, sub, info, values[], deltas[] }] }.
  function signed(x, d) {
    if (x == null || !isFinite(x)) return "";
    var r = round(x, d);
    if (!r) return "±0";
    return (r > 0 ? "+" : "−") + fmt(Math.abs(r), d);
  }
  // Seitenunterschied: "gleich" zählt als 0 (wie angezeigt); wechselt die höhere Seite, steht das statt einer Zahl da
  function sideDelta(path) {
    return function (a, b) {
      var x = g(a, path), y = g(b, path);
      if (!x || !y) return "";
      if (x.side && y.side && x.side !== y.side) return "Seite gewechselt";
      var k = x.mm != null && y.mm != null ? "mm" : (x.pct != null && y.pct != null ? "pct" : "");
      if (!k) return "";
      return dd(x.side ? x[k] : 0, y.side ? y[k] : 0, 1) + (k === "mm" ? " mm" : " %");
    };
  }
  // Haaransatz einmal erkannt, einmal geschätzt: Unterschied käme von der Methode, nicht vom Gesicht
  function sameHairline(a, b) { return !!(a.thirds && b.thirds && a.thirds.hairline === b.thirds.hairline); }
  // Differenz der angezeigten (gerundeten) Werte, damit z. B. 40 % -> 39 % auch als -1 erscheint
  function dd(x, y, d) { return signed(round(y, d) - round(x, d), d); }
  function numDelta(path, d) {
    return function (a, b) { var x = g(a, path), y = g(b, path); return x != null && y != null ? dd(x, y, d) : ""; };
  }
  var CMP_DEFS = [
    { key: "lipRatio", text: function (m) { return m.lipRatio != null ? "1 : " + fmt(m.lipRatio, 2) : ""; }, delta: numDelta(["lipRatio"], 2) },
    { key: "lipWidthToNose", text: function (m) { return m.lipWidthToNose != null ? fmt(m.lipWidthToNose, 2) : ""; }, delta: numDelta(["lipWidthToNose"], 2) },
    { key: "thirds", text: function (m) { return m.thirds ? thirdsLabel(m.thirds) + (m.thirds.hairline !== "erkannt" ? " (Stirn geschätzt)" : "") : ""; },
      delta: function (a, b) {
        if (!sameHairline(a, b)) return "";
        return [dd(a.thirds.upper, b.thirds.upper, 0), dd(a.thirds.middle, b.thirds.middle, 0), dd(a.thirds.lower, b.thirds.lower, 0)].join(" / ");
      } },
    { key: "symmetry", text: function (m) { return g(m, ["symmetry", "score"]) != null ? fmt(m.symmetry.score, 0) + " %" : ""; }, delta: numDelta(["symmetry", "score"], 0) },
    { key: "brow", text: function (m) { return diffLabel(g(m, ["symmetry", "brow"])); }, delta: sideDelta(["symmetry", "brow"]) },
    { key: "mouthCorner", text: function (m) { return diffLabel(g(m, ["symmetry", "mouthCorner"])); }, delta: sideDelta(["symmetry", "mouthCorner"]) },
    { key: "faceShape", text: function (m) { return g(m, ["faceShape", "heightToWidth"]) != null ? "1 : " + fmt(m.faceShape.heightToWidth, 2) : ""; },
      delta: function (a, b) { return a.thirds && b.thirds && !sameHairline(a, b) ? "" : numDelta(["faceShape", "heightToWidth"], 2)(a, b); } },
    { key: "headPose", text: function (m) { return poseLabel(m.headPose); }, delta: null }
  ];
  function compareRows(list) {
    try {
      list = Array.isArray(list) ? list : [];
      var ref = -1, i;
      for (i = 0; i < list.length; i++) if (list[i] && typeof list[i] === "object") { ref = i; break; }
      var rows = CMP_DEFS.map(function (d) {
        var info = METRIC_INFO[d.key];
        return {
          key: d.key, label: info.label, sub: info.ideal || "", info: info.text,
          values: list.map(function (m) {
            if (!m || typeof m !== "object") return "";
            var t = ""; try { t = d.text(m); } catch (e) { t = ""; }
            return t || "nicht messbar";
          }),
          deltas: list.map(function (m, j) {
            if (!m || typeof m !== "object" || ref < 0 || j === ref || !d.delta) return "";
            try { return d.delta(list[ref], m) || ""; } catch (e) { return ""; }
          })
        };
      });
      return { ref: ref, rows: rows };
    } catch (e) { warn("compareRows", e); return { ref: -1, rows: [] }; }
  }

  var styleDone = false;
  function ensureStyle() {
    if (styleDone || typeof document === "undefined") return;
    styleDone = true;
    try {
      if (document.getElementById("abf-style")) return;
      var s = document.createElement("style");
      s.id = "abf-style";
      s.textContent =
        ".abf{font-size:15px;line-height:1.35}" +
        ".abf-row{border-top:1px solid var(--line,#e4dde0)}" +
        ".abf-row:first-of-type{border-top:0}" +
        ".abf-row>summary{list-style:none;display:block;padding:9px 2px;min-height:44px;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
        ".abf-row>summary::-webkit-details-marker{display:none}" +
        ".abf-sum{display:flex;align-items:center;gap:10px;min-height:26px}" +
        ".abf-sum::after{content:\"\";flex:none;width:7px;height:7px;margin:0 4px 4px 2px;border-right:2px solid var(--muted,#6e6468);border-bottom:2px solid var(--muted,#6e6468);transform:rotate(45deg)}" +
        ".abf-row[open] .abf-sum::after{margin:4px 4px 0 2px;transform:rotate(-135deg)}" +
        ".abf-k{flex:1;min-width:0;color:var(--text,#1f1a1c);font-weight:600}" +
        ".abf-s{display:block;font-weight:400;font-size:12.5px;color:var(--muted,#6e6468)}" +
        ".abf-vv{text-align:right;flex:none;max-width:55%}" +
        ".abf-v{display:block;font-weight:700;color:var(--brand,#7a4b5c);font-variant-numeric:tabular-nums}" +
        ".abf-p{display:block;font-size:12.5px;color:var(--muted,#6e6468);font-variant-numeric:tabular-nums}" +
        ".abf-i{color:var(--muted,#6e6468);font-size:13.5px;padding:0 2px 10px}" +
        ".abf-warn{background:#fff4e0;color:#6b4a00;border-radius:8px;padding:8px 10px;margin:2px 0 8px;font-size:14px}" +
        ".abf-disc{color:var(--muted,#6e6468);font-size:12px;margin:8px 0 2px}" +
        ".abf-empty{color:var(--muted,#6e6468)}";
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* ohne Stil weiter */ }
  }

  // ------------------------------------------------------------------ Zeichnen
  function landmarksOf(result) {
    if (!result) return null;
    if (result.landmarks && result.landmarks.length >= 468) return result.landmarks;
    if (result.lm && result.lm.length >= 468 * 3) {
      var out = [], a = result.lm;
      for (var i = 0; i + 2 < a.length; i += 3) out.push({ x: a[i], y: a[i + 1], z: a[i + 2] });
      return out;
    }
    return null;
  }

  function fitBox(fit, iw, ih, W, H) {
    if (fit === "contain" || fit === "cover") {
      var s = fit === "contain" ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
      var w = iw * s, h = ih * s;
      return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
    }
    return { x: 0, y: 0, w: W, h: H };
  }

  // opts: { fit: "fill"|"contain"|"cover", image: <img>|<canvas>, clear: true, mesh: true, contours: true,
  //         lines: true, labels: true, asymmetry: true, lineScale: 1 }
  function drawOverlay(canvas, result, opts) {
    try {
      opts = opts || {};
      if (!canvas || !canvas.getContext) return false;
      var ctx = canvas.getContext("2d");
      var lm = landmarksOf(result);
      if (!ctx) return false;
      var W = canvas.width, H = canvas.height;
      var iw = (result && (result.width || result.w)) || W, ih = (result && (result.height || result.h)) || H;
      var box = fitBox(opts.fit || "fill", iw, ih, W, H);
      if (opts.clear !== false) ctx.clearRect(0, 0, W, H);
      if (opts.image) { try { ctx.drawImage(opts.image, box.x, box.y, box.w, box.h); } catch (e0) { /* Foto optional */ } }
      if (!lm) return false;
      var core = computeCore(lm, box.w, box.h);
      if (!core) return false;
      var P = core.P, S = Math.min(box.w, box.h), ls = opts.lineScale || 1;
      var faceW2 = Math.sqrt(Math.pow(P[IDX.faceL][0] - P[IDX.faceR][0], 2) + Math.pow(P[IDX.faceL][1] - P[IDX.faceR][1], 2));
      // Linien und Schrift nach Gesichtsgröße, begrenzt durch die Canvas-Größe
      var lw = clamp(faceW2 / 200, 1, Math.max(1, S / 260)) * ls;
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.lineJoin = "round"; ctx.lineCap = "round";

      function stroke(pts, color, width, dash, alpha) {
        if (pts.length < 2) return;
        ctx.save();
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = "rgba(20,10,15,0.55)"; ctx.lineWidth = width + 2 * lw; ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
        ctx.restore();
      }
      function text(t, x, y, align, color, size) {
        ctx.save();
        ctx.font = "600 " + Math.round(size) + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        var tw = ctx.measureText(t).width;
        if (align === "center") x -= tw / 2; else if (align === "right") x -= tw;
        x = Math.max(2 - box.x, Math.min(x, W - box.x - tw - 2)); // im sichtbaren Bereich halten
        y = Math.max(size / 2 + 2 - box.y, Math.min(y, H - box.y - size / 2 - 2));
        ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = "rgba(20,10,15,0.75)"; ctx.strokeText(t, x, y);
        ctx.fillStyle = color || "#fff"; ctx.fillText(t, x, y);
        ctx.restore();
      }
      function p2(i) { return [P[i][0], P[i][1]]; }

      var GOLD = "#e8c98f", ROSE = "#f2b8c9", WHITE = "#ffffff";
      if (opts.mesh !== false) {
        ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.5)";
        var rr = Math.max(0.7, lw * 0.75);
        for (var i = 0; i < 468 && i < P.length; i++) { ctx.beginPath(); ctx.arc(P[i][0], P[i][1], rr, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (opts.contours !== false) {
        for (var c = 0; c < CONTOURS.length; c++) stroke(CONTOURS[c].map(p2), WHITE, lw * 0.8, null, 0.45);
      }

      var met = result && result.metrics;
      var up2 = norm2([P[IDX.forehead][0] - P[IDX.menton][0], P[IDX.forehead][1] - P[IDX.menton][1]]);
      var side2 = [-up2[1], up2[0]]; // senkrecht zur Mittellinie (im Bild nach rechts)
      var fs = clamp(faceW2 / 10, 11, Math.max(11, S / 26)) * ls;

      if (opts.lines !== false) {
        var th = thirdsFrom(core, null);
        var tri = met && met.thirds && met.thirds.trichion ? [met.thirds.trichion.x * box.w, met.thirds.trichion.y * box.h] : (th ? [th.trichion.x * box.w, th.trichion.y * box.h] : p2(IDX.forehead));
        // Mittellinie durch den Symmetrie-Mittelpunkt, Richtung = Bildprojektion der Gesichtsachse
        var c2 = [core.c[0], core.c[1]];
        var ax = norm2([core.u[0], core.u[1]]);
        var proj = function (pt) { return (pt[0] - c2[0]) * ax[0] + (pt[1] - c2[1]) * ax[1]; };
        var top = proj(tri) + faceW2 * 0.08, bot = proj(p2(IDX.menton)) - faceW2 * 0.08;
        stroke([[c2[0] + ax[0] * top, c2[1] + ax[1] * top], [c2[0] + ax[0] * bot, c2[1] + ax[1] * bot]], GOLD, lw * 1.4, [lw * 6, lw * 4]);
        // Drittel-Linien senkrecht zur Mittellinie
        var levels = [tri, p2(IDX.glabella), p2(IDX.subnasale), p2(IDX.menton)];
        var sd = [-ax[1], ax[0]], hl = faceW2 * 0.55;
        var onAxis = [];
        for (var L = 0; L < levels.length; L++) {
          var t = proj(levels[L]);
          var o = [c2[0] + ax[0] * t, c2[1] + ax[1] * t];
          onAxis.push(o);
          stroke([[o[0] - sd[0] * hl, o[1] - sd[1] * hl], [o[0] + sd[0] * hl, o[1] + sd[1] * hl]], GOLD, lw * 1.2, L === 0 && met && met.thirds && met.thirds.hairline !== "erkannt" ? [lw * 3, lw * 3] : null, 0.95);
        }
        if (opts.labels !== false && met && met.thirds) {
          var vals = [met.thirds.upper, met.thirds.middle, met.thirds.lower];
          for (var q = 0; q < 3; q++) {
            var mx = (onAxis[q][0] + onAxis[q + 1][0]) / 2 + sd[0] * (hl + fs * 0.4), my = (onAxis[q][1] + onAxis[q + 1][1]) / 2 + sd[1] * (hl + fs * 0.4);
            text(fmt(vals[q], 0) + " %", mx, my, "left", GOLD, fs);
          }
        }
        // Breiten: Mundwinkel und Nasenflügel
        stroke([p2(IDX.mouthR), p2(IDX.mouthL)], ROSE, lw, null, 0.9);
        stroke([p2(IDX.alarR), p2(IDX.alarL)], ROSE, lw, null, 0.9);
        // Lippenhöhen an der Mittellinie
        var tick = faceW2 * 0.05;
        [IDX.lipTop, IDX.lipUpperIn, IDX.lipLowerIn, IDX.lipBottom].forEach(function (ix) {
          var pp = p2(ix);
          stroke([[pp[0] - sd[0] * tick, pp[1] - sd[1] * tick], [pp[0] + sd[0] * tick, pp[1] + sd[1] * tick]], ROSE, lw * 1.3);
        });
        if (opts.labels !== false && met && met.lipRatio != null) {
          var ml = p2(IDX.mouthL);
          text(ratioLabel(met.lipRatio), ml[0] + side2[0] * fs * 0.6, ml[1] + side2[1] * fs * 0.6, "left", ROSE, fs * 0.95);
        }
        // Asymmetrie: Verbindung Augenbrauen und Mundwinkel (parallel zur Mittellinien-Senkrechten wäre gerade)
        if (opts.asymmetry !== false) {
          var bR = avg2(IDX.browR.map(p2)), bL = avg2(IDX.browL.map(p2));
          stroke(extend(bR, bL, 0.15), WHITE, lw, [lw * 2, lw * 3], 0.85);
          stroke(extend(p2(IDX.mouthR), p2(IDX.mouthL), 0.25), WHITE, lw, [lw * 2, lw * 3], 0.85);
        }
      }
      ctx.restore();
      return true;
    } catch (e) {
      warn("drawOverlay", e);
      try { canvas.getContext("2d").restore(); } catch (e2) { /* egal */ }
      return false;
    }
  }
  function avg2(pts) { var x = 0, y = 0; for (var i = 0; i < pts.length; i++) { x += pts[i][0]; y += pts[i][1]; } return [x / pts.length, y / pts.length]; }
  function extend(a, b, f) { var dx = b[0] - a[0], dy = b[1] - a[1]; return [[a[0] - dx * f, a[1] - dy * f], [b[0] + dx * f, b[1] + dy * f]]; }

  // ------------------------------------------------------------------ Laden der Bibliothek
  function warn(where, e) { try { if (root.console) console.warn("[ABFace] " + where + ":", e && e.message ? e.message : e); } catch (x) { /* egal */ } }
  function msg(e) { return e && e.message ? String(e.message) : String(e || "Fehler"); }
  function now() { try { return root.performance && performance.now ? performance.now() : Date.now(); } catch (e) { return Date.now(); } }

  function scriptBase() {
    try {
      var s = document.currentScript;
      if (!s || !s.src) {
        var all = document.getElementsByTagName("script");
        for (var i = all.length - 1; i >= 0; i--) if (/(^|\/)face\.js([?#]|$)/.test(all[i].src || "")) { s = all[i]; break; }
      }
      if (s && s.src) return s.src.split("#")[0].split("?")[0].replace(/[^\/]*$/, "");
    } catch (e) { /* weiter */ }
    try { return String(location.href).split("#")[0].split("?")[0].replace(/[^\/]*$/, ""); } catch (e2) { return ""; }
  }
  var BASE = typeof document !== "undefined" ? scriptBase() : "";
  function vendorUrl() { return config.basePath || (BASE + "vendor/mediapipe/"); }

  var st = { status: "idle", promise: null, landmarker: null, error: "", simd: null, queue: null, glCanvas: null, mp: null, importFails: 0 };

  function isSupported() {
    try {
      if (typeof window === "undefined" || typeof document === "undefined") return false;
      if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") return false;
      if (typeof Promise === "undefined" || typeof fetch !== "function" || typeof Uint8Array === "undefined") return false;
      if (!window.WebGLRenderingContext) return false;
      var c = document.createElement("canvas");
      return !!(c && c.getContext);
    } catch (e) { return false; }
  }

  function withTimeout(p, ms, text) {
    return new Promise(function (res, rej) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; rej(new Error(text)); } }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); res(v); } },
        function (e) { if (!done) { done = true; clearTimeout(t); rej(e); } });
    });
  }

  function importViaScript(url) {
    return new Promise(function (res, rej) {
      var key = "__abfMod" + Math.floor(Math.random() * 1e9);
      var s = document.createElement("script");
      function cleanup() { try { delete root[key]; } catch (e) { root[key] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      root[key] = function (m) { cleanup(); res(m); };
      s.type = "module";
      s.onerror = function () { cleanup(); rej(new Error("Modul konnte nicht geladen werden")); };
      s.textContent = "import * as m from " + JSON.stringify(url) + "; window[" + JSON.stringify(key) + "](m);";
      (document.head || document.documentElement).appendChild(s);
    });
  }
  function importBundle(url) {
    var p;
    if (config.importMode === "script") return importViaScript(url);
    // import() steckt in new Function, damit ältere Browser diese Datei trotzdem parsen können
    try { p = Promise.resolve((new Function("u", "return import(u);"))(url)); } catch (e) { p = Promise.reject(e); }
    return p.then(null, function (err) {
      warn("import()", err);
      return importViaScript(url).then(null, function () { throw err; });
    });
  }

  function fetchModel(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Modell nicht gefunden (" + r.status + ")");
      return r.arrayBuffer();
    }).then(function (b) {
      if (!b || b.byteLength < 100000) throw new Error("Modelldatei unvollständig");
      return new Uint8Array(b);
    });
  }

  function createLandmarker(mp, fileset, model) {
    var canvas = document.createElement("canvas"); // eigenes Canvas: kein OffscreenCanvas (iPadOS 16 Home-Bildschirm)
    canvas.width = 1; canvas.height = 1;
    // iOS kann den WebGL-Kontext nach Sperre/Hintergrund verwerfen: dann Analysemodul verwerfen, nächste Analyse lädt neu (aus dem Cache)
    try {
      canvas.addEventListener("webglcontextlost", function () {
        canvas._abLost = true;
        if (st.glCanvas !== canvas || !st.landmarker) return;
        var bad = st.landmarker; st.landmarker = null; st.promise = null; st.status = "idle";
        try { if (bad && bad.close) bad.close(); } catch (e) { /* egal */ }
      }, false);
    } catch (e) { /* ohne Überwachung */ }
    st.glCanvas = canvas;
    return mp.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: "CPU" },
      canvas: canvas,
      runningMode: "IMAGE",
      numFaces: 1,
      minFaceDetectionConfidence: 0.4,
      minFacePresenceConfidence: 0.4,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    });
  }

  function doLoad() {
    var base = vendorUrl(), mp, model;
    var noSimd = { wasmLoaderPath: base + "wasm/vision_wasm_nosimd_internal.js", wasmBinaryPath: base + "wasm/vision_wasm_nosimd_internal.wasm" };
    // Safari merkt sich einen gescheiterten Modul-Import pro Adresse: nach einem Fehlschlag neue Adresse (der Service Worker ignoriert ?a=).
    // Ein einmal geladenes Modul wird wiederverwendet (z. B. nach verlorenem WebGL-Kontext).
    var modP = st.mp ? Promise.resolve(st.mp) : importBundle(base + "vision_bundle.mjs" + (st.importFails ? "?a=" + st.importFails : "")).then(function (m) {
      if (m && m.FaceLandmarker && m.FilesetResolver) st.mp = m;
      return m;
    }, function (e) { st.importFails = (st.importFails || 0) + 1; throw e; });
    return modP.then(function (m) {
      mp = m;
      if (!mp || !mp.FaceLandmarker || !mp.FilesetResolver) throw new Error("MediaPipe-Bundle unvollständig");
      var fsP = config.forceNoSimd ? Promise.resolve(noSimd) : mp.FilesetResolver.forVisionTasks(base + "wasm").then(null, function () { return noSimd; });
      return Promise.all([fsP, fetchModel(base + "face_landmarker.task")]);
    }).then(function (r) {
      var fileset = r[0]; model = r[1];
      st.simd = !/nosimd/.test(fileset.wasmBinaryPath);
      return createLandmarker(mp, fileset, model).then(null, function (err) {
        if (!st.simd) throw err;
        // SIMD-Variante gescheitert: einmal ohne SIMD versuchen
        warn("SIMD-Start, versuche ohne SIMD", err);
        st.simd = false;
        return createLandmarker(mp, noSimd, model);
      });
    });
  }

  function load() {
    try {
      if (st.landmarker) return Promise.resolve({ ok: true });
      if (st.promise) return st.promise;
      if (!isSupported()) { st.status = "failed"; st.error = "nicht unterstützt"; return Promise.resolve({ ok: false, reason: "Die Gesichtsanalyse wird auf diesem Gerät nicht unterstützt." }); }
      st.status = "loading"; st.error = "";
      var t0 = now();
      var inner = doLoad();
      // Kommt das Ergebnis nach einem Timeout doch noch, wird es für den nächsten Aufruf behalten.
      inner.then(function (lm) { if (!st.landmarker) { st.landmarker = lm; st.status = "ready"; } }, function () { /* unten behandelt */ });
      st.promise = withTimeout(inner, config.loadTimeoutMs, "Laden dauert zu lange").then(function (lm) {
        st.landmarker = st.landmarker || lm; st.status = "ready"; st.loadMs = Math.round(now() - t0);
        return { ok: true };
      }, function (e) {
        st.promise = null; st.error = msg(e);
        if (st.landmarker) { st.status = "ready"; return { ok: true }; }
        st.status = "failed";
        warn("load", e);
        return { ok: false, reason: "Die Gesichtsanalyse konnte nicht gestartet werden.", detail: st.error };
      });
      return st.promise;
    } catch (e) {
      st.status = "failed"; st.error = msg(e); st.promise = null;
      return Promise.resolve({ ok: false, reason: "Die Gesichtsanalyse konnte nicht gestartet werden.", detail: st.error });
    }
  }

  // ------------------------------------------------------------------ Analyse
  function srcOf(x) {
    if (!x) return null;
    if (typeof x === "string") return x;
    if (x.tagName === "IMG" || x.tagName === "CANVAS") return x;
    if (typeof Blob !== "undefined" && x instanceof Blob) return x;
    if (typeof x === "object") return x.src || x.dataUrl || x.dataURL || x.url || x.data || x.full || null;
    return null;
  }
  function loadImage(src) {
    return new Promise(function (res, rej) {
      var s = srcOf(src);
      if (!s) return rej(new Error("Kein Foto"));
      var blobUrl = null;
      if (typeof s !== "string") {
        if (s.tagName === "CANVAS") return res(s);
        if (s.tagName === "IMG") { if (s.complete && s.naturalWidth) return res(s); s = s.src; }
        else if (typeof Blob !== "undefined" && s instanceof Blob && root.URL && URL.createObjectURL) s = blobUrl = URL.createObjectURL(s);
        else s = null;
      }
      if (typeof s !== "string" || !s) return rej(new Error("Kein Foto"));
      var img = new Image();
      function free() { if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) { /* egal */ } blobUrl = null; } }
      img.onload = function () { res(img); setTimeout(free, 0); };
      img.onerror = function () { free(); rej(new Error("Foto konnte nicht geladen werden")); };
      if (!/^(data|blob):/i.test(s)) img.crossOrigin = "anonymous";
      img.src = s;
    });
  }

  function detectOn(canvas) {
    var res;
    try {
      if (!st.landmarker) throw new Error("Analysemodul nicht geladen");
      if (st.glCanvas && st.glCanvas._abLost) throw new Error("WebGL-Kontext verloren");
      res = st.landmarker.detect(canvas);
    }
    catch (e) {
      // WebAssembly-Instanz eventuell defekt (z. B. Speicher): verwerfen, nächster Aufruf lädt neu
      var bad = st.landmarker; st.landmarker = null; st.promise = null; st.status = "idle";
      try { if (bad && bad.close) bad.close(); } catch (e2) { /* egal */ }
      throw e;
    }
    var f = res && res.faceLandmarks && res.faceLandmarks[0];
    if (!f || f.length < 468) return null;
    var out = new Array(f.length);
    for (var i = 0; i < f.length; i++) out[i] = { x: f[i].x, y: f[i].y, z: f[i].z || 0 };
    return out;
  }

  // Haaransatz im Bild suchen: von Punkt 10 entlang der Mittellinie nach oben, bis die Farbe deutlich von der Stirnhaut abweicht.
  // Rückgabe: Abstand Glabella -> Haaransatz in Bildpixeln, oder 0 wenn unsicher.
  function findHairline(ctx, cw, ch, lm) {
    try {
      var P = toPx(lm, cw, ch);
      var g2 = P[IDX.glabella], t10 = P[IDX.forehead], s2 = P[IDX.subnasale];
      var up = norm2([t10[0] - P[IDX.menton][0], t10[1] - P[IDX.menton][1]]), sd = [-up[1], up[0]];
      var mid2 = (g2[0] - s2[0]) * up[0] + (g2[1] - s2[1]) * up[1];
      var s10 = (t10[0] - g2[0]) * up[0] + (t10[1] - g2[1]) * up[1];
      var faceW = Math.sqrt(Math.pow(P[IDX.faceL][0] - P[IDX.faceR][0], 2) + Math.pow(P[IDX.faceL][1] - P[IDX.faceR][1], 2));
      if (!(mid2 > 10) || !(s10 > 2) || !(faceW > 20)) return 0;
      var sStart = Math.max(s10, 0.55 * mid2), sEnd = 1.6 * mid2, step = Math.max(1, mid2 / 120), half = 0.1 * faceW;
      // Bildausschnitt einmal auslesen
      var cornersS = [0.3 * s10, sEnd], xs = [], ys = [];
      for (var a = 0; a < 2; a++) for (var b = -1; b <= 1; b += 2) { var pt = [g2[0] + up[0] * cornersS[a] + sd[0] * half * b, g2[1] + up[1] * cornersS[a] + sd[1] * half * b]; xs.push(pt[0]); ys.push(pt[1]); }
      var x0 = Math.max(0, Math.floor(Math.min.apply(null, xs)) - 2), y0 = Math.max(0, Math.floor(Math.min.apply(null, ys)) - 2);
      var x1 = Math.min(cw, Math.ceil(Math.max.apply(null, xs)) + 2), y1 = Math.min(ch, Math.ceil(Math.max.apply(null, ys)) + 2);
      if (x1 - x0 < 3 || y1 - y0 < 3) return 0;
      var img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0), D = img.data, iw = x1 - x0, ih = y1 - y0;
      function px(x, y) {
        var xi = Math.round(x) - x0, yi = Math.round(y) - y0;
        if (xi < 0 || yi < 0 || xi >= iw || yi >= ih) return null;
        var o = (yi * iw + xi) * 4; return [D[o], D[o + 1], D[o + 2]];
      }
      // Hautfarbe der Stirn zwischen Glabella und Punkt 10
      var skin = [], i, j, s, c;
      for (i = 0; i <= 6; i++) for (j = -3; j <= 3; j++) {
        s = s10 * (0.3 + 0.6 * i / 6);
        c = px(g2[0] + up[0] * s + sd[0] * half * j / 3 * 0.8, g2[1] + up[1] * s + sd[1] * half * j / 3 * 0.8);
        if (c) skin.push(c);
      }
      if (skin.length < 20) return 0;
      var mean = avgColor(skin);
      // Stirn verdeckt (Pony, Mütze)? Dann Stirnfarbe deutlich anders als die Wangen: lieber schätzen.
      var cheek = [];
      [50, 280, 101, 330].forEach(function (ix) {
        var cx0 = Math.round(P[ix][0]) - 2, cy0 = Math.round(P[ix][1]) - 2;
        if (cx0 < 0 || cy0 < 0 || cx0 + 5 > cw || cy0 + 5 > ch) return;
        var pd = ctx.getImageData(cx0, cy0, 5, 5).data;
        for (var o2 = 0; o2 < pd.length; o2 += 4) cheek.push([pd[o2], pd[o2 + 1], pd[o2 + 2]]);
      });
      if (cheek.length >= 9) {
        var cm = avgColor(cheek);
        if (Math.sqrt(Math.pow(cm[0] - mean[0], 2) + Math.pow(cm[1] - mean[1], 2) + Math.pow(cm[2] - mean[2], 2)) > 60) return 0;
      }
      var sdv = 0;
      skin.forEach(function (q) { sdv += Math.pow(q[0] - mean[0], 2) + Math.pow(q[1] - mean[1], 2) + Math.pow(q[2] - mean[2], 2); });
      sdv = Math.sqrt(sdv / skin.length);
      var thr = Math.max(42, 3 * sdv);
      var need = Math.max(3, Math.round(0.06 * mid2 / step)), run = 0, runStart = 0;
      for (s = sStart; s <= sEnd; s += step) {
        var devs = [];
        for (j = -3; j <= 3; j++) {
          c = px(g2[0] + up[0] * s + sd[0] * half * j / 3, g2[1] + up[1] * s + sd[1] * half * j / 3);
          if (!c) continue;
          devs.push(Math.sqrt(Math.pow(c[0] - mean[0], 2) + Math.pow(c[1] - mean[1], 2) + Math.pow(c[2] - mean[2], 2)));
        }
        if (devs.length < 4) return 0; // Bildrand erreicht
        devs.sort(function (p, q) { return p - q; });
        var med = devs[Math.floor(devs.length / 2)];
        if (med > thr) { if (!run) runStart = s; run++; if (run >= need) return runStart; }
        else run = 0;
      }
      return 0;
    } catch (e) { warn("Haaransatz", e); return 0; }
  }

  function avgColor(arr) { var m = [0, 0, 0]; arr.forEach(function (q) { m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; }); return [m[0] / arr.length, m[1] / arr.length, m[2] / arr.length]; }
  function freeCanvas(c) { try { if (c && c.tagName === "CANVAS") { c.width = 0; c.height = 0; } } catch (e) { /* egal */ } }

  function runDetect(src) {
    return loadImage(src).then(function (img) {
      var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
      if (!W || !H) throw new Error("Foto ohne Größe");
      var sc = Math.min(1, config.maxSide / Math.max(W, H));
      var cw = Math.max(1, Math.round(W * sc)), ch = Math.max(1, Math.round(H * sc));
      var c = document.createElement("canvas"); c.width = cw; c.height = ch;
      var ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      var lm = detectOn(c), padded = false;
      if (!lm) {
        // zweiter Versuch mit Rand: hilft, wenn das Gesicht das Bild fast ganz ausfüllt oder angeschnitten ist
        var p = Math.round(Math.max(cw, ch) * 0.25);
        var c2 = document.createElement("canvas"); c2.width = cw + 2 * p; c2.height = ch + 2 * p;
        var x2 = c2.getContext("2d"); x2.fillStyle = "#7f7f7f"; x2.fillRect(0, 0, c2.width, c2.height); x2.drawImage(c, p, p);
        var lm2 = detectOn(c2);
        if (lm2) {
          padded = true;
          lm = lm2.map(function (q) { return { x: (q.x * c2.width - p) / cw, y: (q.y * c2.height - p) / ch, z: q.z * c2.width / cw }; });
        }
        freeCanvas(c2);
      }
      if (!lm) { freeCanvas(c); return { ok: false, reason: "Kein Gesicht erkannt", width: W, height: H }; }
      var hairUp = findHairline(ctx, cw, ch, lm);
      freeCanvas(c);
      var metrics = computeMetrics(lm, cw, ch, { hairUp2d: hairUp });
      if (!metrics) return { ok: false, reason: "Gesicht nicht vollständig messbar", width: W, height: H };
      var out = [];
      for (var i = 0; i < lm.length; i++) out.push({ x: round(lm[i].x, 5), y: round(lm[i].y, 5), z: round(lm[i].z, 5) });
      return { ok: true, metrics: metrics, landmarks: out, width: W, height: H, analyzedWidth: cw, analyzedHeight: ch, padded: padded, simd: st.simd, version: MP_VERSION };
    });
  }

  function fail(reason, detail, extra) {
    var r = { ok: false, reason: reason, width: 0, height: 0 };
    if (detail) r.detail = detail;
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) r[k] = extra[k];
    return r;
  }

  function analyze(src) {
    var t0 = now();
    var job = function () {
      return new Promise(function (resolve) {
        var settled = false;
        function done(r) { if (settled) return; settled = true; try { r.durationMs = Math.round(now() - t0); } catch (e) { /* egal */ } resolve(r); }
        try {
          load().then(function (lr) {
            if (!lr || !lr.ok) return done(fail((lr && lr.reason) || "Die Gesichtsanalyse konnte nicht gestartet werden.", lr && lr.detail));
            var timer = setTimeout(function () { done(fail("Zeitüberschreitung bei der Analyse")); }, config.detectTimeoutMs);
            runDetect(src).then(function (r) { clearTimeout(timer); done(r); }, function (e) {
              clearTimeout(timer); warn("analyze", e);
              done(fail("Foto konnte nicht analysiert werden", msg(e)));
            });
          }, function (e) { done(fail("Die Gesichtsanalyse konnte nicht gestartet werden.", msg(e))); });
        } catch (e) { done(fail("Foto konnte nicht analysiert werden", msg(e))); }
      });
    };
    // nacheinander abarbeiten (Speicher auf älteren iPads schonen)
    var prev = st.queue || Promise.resolve();
    var p = prev.then(job, job);
    st.queue = p.then(function () {}, function () {});
    return p;
  }

  function compact(result) {
    try {
      var lm = landmarksOf(result);
      if (!result || !lm) return null;
      var flat = [];
      for (var i = 0; i < lm.length; i++) flat.push(round(lm[i].x, 4), round(lm[i].y, 4), round(lm[i].z, 4));
      return { v: 1, w: result.width || result.w || 0, h: result.height || result.h || 0, lm: flat, metrics: result.metrics || null };
    } catch (e) { return null; }
  }

  root.ABFace = {
    isSupported: isSupported,
    load: load,
    status: function () { return st.status; },
    lastError: function () { return st.error; },
    analyze: analyze,
    drawOverlay: drawOverlay,
    renderMetricsHtml: renderMetricsHtml,
    summaryText: summaryText,
    compareRows: compareRows,
    compact: compact,
    METRIC_INFO: METRIC_INFO,
    DISCLAIMER: DISCLAIMER,
    NO_FRONTAL: NO_FRONTAL,
    config: config,
    version: { mediapipe: MP_VERSION, model: "face_landmarker float16/1", module: 1 },
    _math: {
      computeCore: computeCore, computeMetrics: computeMetrics, headPose: headPose, symmetryScore: symmetryScore,
      thirdsFrom: thirdsFrom, irisScale: irisScale, fmt: fmt, ratioLabel: ratioLabel, diffLabel: diffLabel,
      metricRows: metricRows, compareRows: compareRows, signed: signed, landmarksOf: landmarksOf, fitBox: fitBox, IDX: IDX, PAIRS: PAIRS, MID: MID,
      state: function () { return { status: st.status, simd: st.simd, error: st.error, loadMs: st.loadMs, base: vendorUrl() }; }
    }
  };
})();
