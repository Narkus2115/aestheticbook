# MediaPipe Face Landmarker (lokal, offline)

Wird von `app/face.js` genutzt (Gesichtsproportionen). Alles läuft im Browser des iPads; es werden keine Fotos oder Daten an einen Server geschickt. Die Dateien werden erst beim ersten Aufruf der Analyse geladen.

## Versionen und Quellen

| Datei | Größe (Byte) | Quelle |
|---|---|---|
| `vision_bundle.mjs` | 136 870 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs |
| `wasm/vision_wasm_internal.js` | 209 826 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.js |
| `wasm/vision_wasm_internal.wasm` | 9 423 986 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm |
| `wasm/vision_wasm_nosimd_internal.js` | 209 735 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.js |
| `wasm/vision_wasm_nosimd_internal.wasm` | 9 294 247 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.wasm |
| `face_landmarker.task` | 3 758 596 | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task |
| `package.json` | 592 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/package.json |

- `@mediapipe/tasks-vision` **0.10.14** (npm, veröffentlicht 10.05.2024). Bewusst eine ältere, weit verbreitete Version: liefert noch die Varianten ohne SIMD mit, die Safari vor 16.4 braucht. `FilesetResolver.forVisionTasks()` wählt automatisch SIMD oder nicht-SIMD.
- Modell `face_landmarker.task`, float16, Version 1 (478 Punkte inkl. Iris).
- Heruntergeladen am 11.10.2026 mit curl. Die SHA-256-Werte der npm-Dateien stimmen mit der Dateiliste von jsDelivr überein (`data.jsdelivr.com/v1/packages/npm/@mediapipe/tasks-vision@0.10.14`).

## SHA-256

```
e77f281f9619150d937023c355bae170e9120e3b9e43f1e23a2a7bee07197669  vision_bundle.mjs
9440cf0cc0cea21800e31581ec32aeedcc5fbf9df4509796bbc7d3f99e52ab9c  wasm/vision_wasm_internal.js
f82a8e6c05e08a44cc9f9e7ec5f845935bcbb1b1500ebe8c2f4812fb4e2917dc  wasm/vision_wasm_internal.wasm
abe9b6fbeaf86fcb53a5edce3926c82ccb0619e18fed4d9d9ce561ee7f55e054  wasm/vision_wasm_nosimd_internal.js
38b61feab2fd7934e05cbe9f68baa308978a5e3b7f85c1913bb8ae89b8ef8b97  wasm/vision_wasm_nosimd_internal.wasm
64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff  face_landmarker.task
20120384b2b0c1300d27ba769fff3cacfdbc964d5eb4cc12dda37a68d6c3885b  package.json
```

## Lizenz

MediaPipe (Bibliothek und Modell): Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0 , Copyright Google LLC.
Die Spiegelpaar-Tabelle in `face.js` (PAIRS, MID) ist aus `canonical_face_model.obj` abgeleitet
(https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj, Apache 2.0):
jeder Punkt mit x < 0 wurde dem Punkt mit gespiegelter Koordinate (-x, y, z) zugeordnet (exakter Treffer für alle 220 Paare), x = 0 ergibt die 28 Mittellinienpunkte.

## Hinweise für Betrieb

- Server-MIME-Typen: `.mjs` als JavaScript (GitHub Pages: ja), `.wasm` als `application/wasm` (sonst langsamerer Fallback, funktioniert trotzdem).
- Offline-Betrieb (umgesetzt in `app/sw.js`): eigener, dauerhafter Cache `ab-mediapipe-0.10.14`, wird beim Aufräumen alter App-Caches nicht gelöscht, Strategie "Cache zuerst" (Dateien ändern sich nie). Die sechs Dateien werden bei der Installation des Service Workers einzeln geholt (nicht über `addAll`, ein Fehler bricht die Installation nicht ab, höchstens 60 s Wartezeit). Was dabei fehlt, holt die App etwa 8 s nach jedem Start nach (Nachricht `ab-precache-mp` an den Service Worker) bzw. spätestens bei der ersten Analyse.
- Pro Gerät werden nur etwa 13 MB geladen (eine der beiden WebAssembly-Varianten + Modell + Bundle).
- `selftest.html` ist eine kleine Testseite für das iPad (Modul laden, Foto wählen, Ergebnis ansehen). Für den Betrieb nicht nötig, darf gelöscht werden.

## Aktualisieren

Neue Version nur nach Test auf dem ältesten iPad: alle Dateien aus demselben Versionsordner holen, `MP_VERSION` in `face.js` anpassen, Hashes hier eintragen, Service-Worker-Cache-Namen ändern.
