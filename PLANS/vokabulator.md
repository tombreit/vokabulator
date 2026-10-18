# Vokabulator – Plan (living document)

> Living document: wird bei jedem Batch fortgeschrieben (Status, Entscheidungen, Changelog).
> Sprache: Plan & UI deutsch, Code & Kommentare englisch.

## Status

| Batch | Thema | Status |
|---|---|---|
| 0 | Fundament (Repo, SvelteKit, Apache, Deploy) | ✅ |
| 1 | Lerneinheiten, Text-Import, Speicher | ✅ |
| 2 | Karteikarten-Abfrage, Leitner, Ergebnis | ⬜ |
| 3 | Offline/PWA, Backup → **1. nutzbare Version, Review-Pause** | ⬜ |
| 4 | PDF-Parser (C.C.Buchner-Lexikon, Datei-Upload) | ⬜ |
| 5 | Mediencode-Import über Proxy | ⬜ |
| 6 | QR-Scanner (nativer `BarcodeDetector`) | ⬜ |
| 7 | Spielmechanik: Tippen, Multiple Choice, Punkte, Joker, Schachuhr, Feedback | ⬜ |
| 8 | Teilen | ⬜ |
| 9 | Design & Polish | ⬜ |

## Kontext

Mein Sohn lernt Vokabeln (vor allem Latein, manchmal Englisch/Spanisch). In den Schulbüchern stehen QR-Codes
(z. B. `https://ccbuchner.de/clip_code/40702-229/`). Die Vokabeln liegen erst ein Klick weiter als PDF vor.
Vokabulator soll sie per Scan holen, als Lerneinheit offline auf dem Smartphone speichern und spielerisch abfragen:
Leitner-Prinzip wie bei AnkiDroid, „schwer“-Markierung, Punkte, Emojis und Feedback in Jugendsprache.

**Annahmen:** Zielgerät ist aktuelles Chrome auf Android. Es gibt keine Abwärtskompatibilität und keine Polyfills,
wir nutzen nur moderne Web-APIs. Gehostet wird auf dem eigenen Root-Server mit **Apache**, eigene Subdomain, HTTPS.

## Erkenntnisse aus der Analyse

**Mediencode-Seite** (`/clip_code/40702-229/`): Die H1 lautet „Mediencode 40702-229“, der Text „Hier findest du die
Lexika zum Kapitel **Die nd-Formen**“. Der einzige PDF-Link ist `/_files_media/mediathek/downloads/26273.pdf`.

**PDF** (6 Seiten, mit Word erzeugt, echter Text, kein Scan) – die Struktur lässt sich gut auswerten:
- Lateinisches Lemma ist **fett** (`Aptos-Bold`). Grammatik-Infos (`m`, `n`, `m. dopp. Akk.`) sind *kursiv*. Die deutsche Bedeutung ist normal gesetzt.
- Kapitelverweise (`17`, `6. 10. Ü1`, `III`) stehen als kleine Hochzahl hinter der Bedeutung: Schriftgröße ≈ 10 statt 16.
- Zweispaltiges Layout. Einträge laufen über mehrere Zeilen. Ein neuer Eintrag beginnt immer mit fettem Text.
- Überschriften sind größer (≈ 21) und fett. Die erste ist der Einheitstitel „Die nd-Formen | Cäsar gegen Cato“, danach folgen Abschnitte:
  „Seite 2“, „A Zwei Positionen im Senat“, „B Zwei Politiker im Vergleich“. Folgeseiten ohne Überschrift setzen den
  vorigen Abschnitt fort.
- Fußzeile „© C. C. Buchner Verlag, Bamberg“ wird ignoriert. Wörter kommen in mehreren Abschnitten doppelt vor (`cōnsilium`).
- Insgesamt sind es etwa 130 verschiedene Wörter. → **Lerneinheit = ein QR-Code/PDF, Abschnitte sind auswählbare Teilmengen.**

**CORS:** Der Browser darf `ccbuchner.de` nicht direkt abrufen. Das ist der **einzige serverseitige Baustein**: ein
kleiner Apache-Reverse-Proxy, der nur die zwei URL-Muster weiterreicht (Mediencode-Seite und Download-PDF).
Das ist kein offener Proxy, und PDFs werden nicht auf unserem Server gespeichert.

## Stack und Begründung

- **SvelteKit 3.1 im SPA-Modus** (`@sveltejs/adapter-static` 4, `ssr = false`, Fallback `200.html`), **Svelte 5.57** (Runes), **Vite 8**.
  - Warum: Eine `.svelte`-Datei enthält Markup, Logik und Style der Komponente zusammen. Das ist gut für
    *Locality of Behaviour*. Routing, Übergänge und Service Worker sind eingebaut. `build/` geht per rsync auf den Server.
  - Ehrliche Kosten: Kit-Konventionen (`+page.svelte`, `+layout.js`). Kit 3 ist neu: Die Konfiguration steht in
    `vite.config.js`, der Service Worker nutzt `$app/service-worker` und `$app/manifest`. Gerüst mit aktuellem `npx sv create`.
- **JavaScript + JSDoc** mit `// @ts-check`, geprüft durch `svelte-check` 4.7.
- **Kein CSS-Framework:** scoped `<style>` in Komponenten plus Design-Tokens (CSS Custom Properties) in `src/app.css`.
- **Bibliotheken bewusst minimal:** `pdfjs-dist` 6.4 (wird nur auf der Import-Seite per lazy import geladen), `vitest` 5.
  Alles andere läuft über Plattform-APIs.
- **Moderne Plattform-APIs:** `BarcodeDetector` + `getUserMedia` (QR), Web Share API, `CompressionStream`
  (Teilen-Links), Screen Wake Lock (Display bleibt beim Lernen an), Vibration, View Transitions, `<dialog>`/Popover,
  `navigator.storage.persist()`, `DOMParser`, `crypto.randomUUID()`, CSS Nesting, `:has()`, `@starting-style`, Container Queries.
- **Speicher:** `localStorage` (synchron, einfach nachvollziehbar, in DevTools lesbar). Die Datenmenge ist klein.
- **Paketmanager:** pnpm (ist installiert), Node 24 (Kit 3 braucht ≥ 22.17).

## Datenfluss

```
QR-Scan / Code-Eingabe ──► /proxy/ccbuchner/clip_code/<code>/   (Apache → www.ccbuchner.de)
                             └─ DOMParser: a[href$=".pdf"], Kapitelname
                         ──► /proxy/ccbuchner/_files_media/mediathek/downloads/<n>.pdf
                             └─ pdf.js: Textitems inkl. Font/Größe/Position
                             └─ parseLexikon(items) → { title, sections, entries }   (reine Funktion, getestet)
                         ──► Vorschau → speichern in localStorage → offline lernen
Text einfügen / PDF-Datei wählen ─────────────┘ (gleiche Pipeline ab Parser, ohne Netz)
```

## Projektstruktur (Ziel)

```
PLANS/vokabulator.md            living document (dieser Plan)
README.md                       Entwickeln, Testen, Deployen in 5 Minuten
vite.config.js                  Kit-3-Config, adapter-static, Dev-Proxy /proxy/ccbuchner
deploy/apache-vokabulator.conf  VirtualHost: static + SPA-Fallback + eng begrenzter Proxy + Cache-Header
deploy/deploy.sh                pnpm build && rsync --delete build/ $VOKABULATOR_TARGET
static/                         manifest.webmanifest, Icons
src/app.css                     Design-Tokens, Basis-Styles
src/service-worker/index.js     Offline-Cache (App-Shell)
src/lib/model.js                Datenmodell (JSDoc-Typen), buildUnit(): Importer-Ergebnis → Unit
src/lib/storage.js              localStorage: laden/speichern, Schema-Version, Backup-Export/-Import
src/lib/import/text-parser.js   eingefügter Text → Einträge          (+ text-parser.test.js daneben)
src/lib/import/pdf-lexikon.js   pdf.js-Items → Einheit (reine Funktion) (+ Test mit Fixture)
src/lib/import/pdf-items.js     PDF-Bytes → Items (pdf.js-Anbindung, Font-Auflösung)
src/lib/import/ccbuchner.js     Mediencode/URL → PDF-URL → Einheit
src/lib/learn/leitner.js        Fächer, Auswahl der nächsten Wörter   (+ Test)
src/lib/learn/check-answer.js   Normalisieren & Vergleichen           (+ Test)
src/lib/learn/scoring.js        Punkte, Combo, Joker-Kosten           (+ Test)
src/lib/learn/feedback.js       Sprüche & Emojis – reine Daten, frei editierbar
src/lib/share.js                Teilen-Links bauen/lesen
src/lib/components/             ProgressBar, Card, ChessClock, QrScanner, …
src/routes/+layout.js           ssr = false
src/routes/+page.svelte         „Meine Einheiten“
src/routes/neu/+page.svelte     Import: Scannen | Code | PDF-Datei | Text   (?code=… für Teilen-Links)
src/routes/neu/*Import.svelte   je Import-Weg eine Komponente; alle enden in DraftPreview.svelte (Vorschau + Speichern)
src/routes/einheit/[id]/+page.svelte   Wortliste, Abschnitte, ⭐ schwer, Lernmodus wählen
src/routes/lernen/[id]/+page.svelte    Abfrage + Ergebnisseite (ein Zustandsautomat in einer Datei)
src/routes/einstellungen/+page.svelte  Backup, Feedback-Stil, Sound
```

Regeln für Nachvollziehbarkeit: Fachlogik steckt in kleinen reinen Modulen unter `src/lib`, jedes mit einem
Kopfkommentar zum Zweck. Tests liegen direkt daneben. UI-Zustand lebt in der Route, die ihn nutzt. Speichern
passiert explizit über `storage.js`, ohne versteckte Effekte. Pro Batch gibt es einen git-Commit.

## Datenmodell (localStorage, Schema v1)

```js
// vokabulator.units → Unit[]
Unit = { id: 'ccb-40702-229' | 'txt-<uuid>', title, lang: 'la'|'en'|'es',
         source: { type: 'ccbuchner', code, pdfUrl } | { type: 'text' } | { type: 'pdf-file', name },
         createdAt, sections: [{ title, entryIds: [] }], entries: [Entry] }
Entry = { id: 'capere-capio-cepi-captum',   // Slug des Lemmas: stabil bei Re-Import, dedupliziert
          front: 'capere, capiō, cēpī, captum', frontInfo: '',      // fett + kursiv vor der Bedeutung
          back: 'nehmen, ergreifen, fangen; erobern', refs: '6. 10. Ü1' }
// vokabulator.progress.<unitId> → { [entryId]: { box: 1..5, hard: bool, right, wrong, lastSeen } }
// vokabulator.settings, vokabulator.stats (Punkte, Highscores, Tages-Streak)
```

## Batches

Jeder Batch endet mit `pnpm check && pnpm test && pnpm build`, einem Commit und einem Status-Update in diesem Dokument.

### Batch 0 – Fundament
- `git init`, `.gitignore`. Plan nach `PLANS/vokabulator.md`.
- `npx sv create` (SvelteKit 3, JS + JSDoc, Vitest), danach SPA-Setup: adapter-static mit Fallback und `ssr = false`.
- `deploy/apache-vokabulator.conf`:
  - `FallbackResource /200.html`
  - `ProxyPassMatch` nur für `^/proxy/ccbuchner/(clip_code/\d+-\d+/?|_files_media/mediathek/downloads/\d+\.pdf)$`, mit `SSLProxyEngine on` und `ProxyPassReverse`
  - Cache-Header: `/_app/immutable/` langlebig, `service-worker.js`/`index.html` mit no-cache
  - Benötigte Module notieren: proxy, proxy_http, ssl, headers
- `deploy/deploy.sh` mit `rsync -avz --delete`, Ziel über Umgebungsvariable. Den Deploy führst du selbst aus.
- README: Setup, Dev-Server, Handy-Test via `chrome://inspect` mit Port-Forwarding (localhost gilt als sicherer Kontext).
- **Fertig wenn:** `pnpm dev` zeigt eine Startseite, `pnpm build` erzeugt `build/`, `rsync -n` (Dry-Run) läuft durch.

### Batch 1 – Lerneinheiten, Text-Import, Speicher
- `storage.js` (CRUD für Einheiten und Fortschritt, Schema-Version).
- `text-parser.js`: eine Vokabel pro Zeile, Trenner Tab / `;` / ` - ` / ` = `. Zeilen mit `# Titel` starten einen Abschnitt. Sprache wählbar.
- Seiten: Startseite (Liste), `/neu` (Tab „Text einfügen“ mit Live-Vorschau), `/einheit/[id]` (Wortliste nach Abschnitten, Löschen mit Rückfrage).
- **Fertig wenn:** Text einfügen → Einheit sichtbar → bleibt nach dem Neuladen erhalten. Tests für den Parser sind grün.

### Batch 2 – Karteikarten-Abfrage, Leitner, Ergebnis (Basis)
- `leitner.js`: 5 Fächer. Richtig → Fach + 1, falsch → Fach 1.
  - Rundenauswahl (10/20/alle): zuerst ⭐ schwer, dann niedrige Fächer, dann lange nicht gesehen, mit etwas Zufall.
  - Bewusst ohne Datums-Intervalle wie bei Anki: Der Vokabeltest ist meist in ein paar Tagen, nicht in Wochen.
- `/lernen/[id]`: Richtung (La→De / De→La / gemischt) und Abschnitte wählen. Karte aufdecken, dann selbst bewerten
  mit „Gewusst ✅“ oder „Nicht gewusst ❌“. Fortschrittsbalken. Wörter jederzeit per ⭐ als schwer markieren.
- Ergebnis: Trefferquote, Liste der falschen Wörter mit ⭐-Knopf, „Nur Fehler nochmal“.
- Fortschrittsanzeige der Einheit: Anteil der Wörter ab Fach 4.
- **Fertig wenn:** Eine Runde lässt sich komplett durchspielen, die Fächer ändern sich nachvollziehbar. Tests für `leitner.js`.

### Batch 3 – Offline/PWA, Backup → 1. nutzbare Version
- Service Worker (Kit 3 `$app/service-worker` + `$app/manifest`): App-Shell vorab cachen, alte Caches beim
  Versionswechsel löschen. `manifest.webmanifest` + Icons, damit die App installierbar ist. `navigator.storage.persist()`.
- `/einstellungen`: Backup als JSON exportieren und importieren (Schutz gegen gelöschte Browserdaten).
- Screen Wake Lock während des Lernens.
- **Fertig wenn:** Die App lässt sich auf dem Handy installieren. Im Flugmodus starten → Einheit lernen klappt.
  Das Deploy-Skript ist bereit. → **Review-Pause.**

### Batch 4 – PDF-Parser (Datei-Upload)
- **Zuerst ein Spike:** Liefert pdf.js 6 den echten Fontnamen (`Aptos-Bold`/`-Italic`)? Weg dahin: `page.commonObjs`
  nach `getOperatorList()`, alternativ die `styles` aus `getTextContent`. Ergebnis kommt ins Entscheidungs-Log.
- `pdf-items.js`: PDF-Bytes → `{ str, x, y, size, bold, italic }[]` pro Seite.
- `pdf-lexikon.js` (rein, testbar):
  1. Fußzeile und Leerstellen verwerfen.
  2. Klassifizieren: Überschrift (≥ 1,2 × Grundgröße), Hochzahl (≤ 0,8 × Grundgröße) → `refs`.
  3. Spalten an der Seitenmitte trennen, erst links, dann rechts lesen.
  4. Zeilen nach y gruppieren. Eine Zeile, die mit fettem Text beginnt, startet einen neuen Eintrag.
  5. Fett und kursiv vor dem ersten normalen Text → `front`/`frontInfo`, der Rest → `back`.
  6. Die erste Überschrift ist der Titel, alle weiteren sind Abschnitte. Einträge werden per Slug dedupliziert.
- Fixture: `26273.pdf` liegt in `tests/fixtures/` (nur privates Repo, Urheberrecht Verlag). Erwartete Werte werden geprüft:
  Titel, die 3 Abschnitte, Stichproben wie `capere…` → `nehmen, ergreifen, fangen; erobern` ohne `6. 10. Ü1`,
  sowie `mihi` (Dat. von egō) → `mir`.
- `/neu`, Tab „PDF-Datei“: Datei wählen → Vorschau mit Abschnitten und Wortanzahl → speichern.
- **Fertig wenn:** Das Beispiel-PDF wird ohne manuelle Korrektur vollständig und korrekt importiert.

### Batch 5 – Mediencode-Import über Proxy
- `ccbuchner.js`: akzeptiert `40702-229` oder die volle URL. Lädt die Seite über `/proxy/ccbuchner/…`, liest den
  PDF-Link per `DOMParser`, lädt das PDF und übergibt es an den Parser aus Batch 4.
- Dev-Proxy in `vite.config.js` mit identischem Pfad, damit derselbe Code in Dev und Produktion läuft.
- Verständliche Fehlermeldungen für offline, unbekannten Code und PDF ohne erkennbare Vokabeln.
- `/neu?code=40702-229` importiert direkt (Grundlage fürs Teilen).
- **Fertig wenn:** Code eintippen → Vorschau → Einheit gespeichert, lokal und auf dem Server.

### Batch 6 – QR-Scanner
- `QrScanner.svelte`: `getUserMedia` (Rückkamera) + nativer `BarcodeDetector({ formats: ['qr_code'] })` im
  `requestAnimationFrame`-Takt, Kamera beim Verlassen stoppen. Erkannte URL → Code → Import aus Batch 5.
- Ohne Polyfill. Wo die API fehlt (z. B. Desktop-Linux beim Entwickeln), bleibt die Code-Eingabe.
- **Fertig wenn:** Den QR-Code im Buch mit dem Handy scannen → Einheit ist da.

### Batch 7 – Spielmechanik
- Modi: Karteikarte (Batch 2), **Tippen**, **Multiple Choice** (4 Optionen aus derselben Einheit).
- `check-answer.js`:
  - Groß-/Kleinschreibung und nur Makronen ignorieren (ā→a, Umlaute bleiben). Artikel und Klammern entfernen.
  - Jede Einzelbedeutung zählt (getrennt an `,`/`;`). Für De→La reicht die Grundform (`capere`).
  - Levenshtein ≤ 1 gilt als „Tippfehler, zählt halb“. Ein Knopf „Ich lag doch richtig“ überstimmt die Prüfung (Fairness).
- `scoring.js`: +10 pro Treffer, Combo ×2 ab 3 und ×3 ab 6 in Folge.
  - 3 Joker 💡 pro Runde: „Erster Buchstabe“ kostet −3, „Aufdecken“ bringt 0 Punkte und zählt als nicht gewusst.
- **Schachuhr ⏱️** (an/aus; 1/3/5 Min): ein Zeitkonto pro Runde, das nur tickt, solange eine Frage offen ist.
  Restzeit gibt Bonuspunkte, bei 0 endet die Runde.
- `feedback.js`: Sprüche je Situation (richtig, Combo, Tippfehler, falsch, Joker, Rekord), z. B. „Sheesh 🔥“,
  „No cap, korrekt 💯“, „Bruh 💀“, „Das war wohl nix 💩“. Als reine Datenliste von dir leicht anpassbar.
- Ergebnisseite: Punkte, Quote, Zeit, Highscore pro Einheit („Neuer Rekord! 🏆“), Tages-Streak 🔥.
- **Fertig wenn:** Alle Modi funktionieren mit Timer an und aus. Tests für `check-answer` und `scoring`.

### Batch 8 – Teilen
- C.C.Buchner-Einheit: Link `/neu?code=40702-229`. Geteilt wird nur der Code, das Gerät des Freundes holt das PDF selbst
  (sauber beim Urheberrecht).
- Text-Einheit: Inhalt per `CompressionStream` komprimiert im URL-Fragment `#d=…` (landet nie auf dem Server).
- Ergebnis teilen inkl. Challenge: `&challenge=120` → „Schlag 120 Punkte!“. Versand über `navigator.share`,
  Fallback Zwischenablage (Desktop).
- **Fertig wenn:** Ein Link vom Handy an ein zweites Gerät führt dort direkt zum Import bzw. zur Challenge.

### Batch 9 – Design & Polish
- Eigene visuelle Identität (mit der Skill `frontend-design`): mobile-first, große Daumen-Buttons unten, Dark Mode.
- Animationen: Karten-Flip (3D-CSS), View Transitions zwischen Seiten, Konfetti auf der Ergebnisseite (eigenes kleines Canvas).
- Vibration bei richtig/falsch, optionale Sounds (standardmäßig aus), Fächer als 🥚🐣🐥🐔🦅, App-Icon.
- Barrierearmut: Kontraste, Fokus, `prefers-reduced-motion`.

## Entscheidungs-Log
- 2026-10-18: SvelteKit 3 im SPA-Modus, JS + JSDoc, Apache, localStorage, Leitner ohne Datums-Intervalle,
  nur moderne Browser-APIs (Chrome Android), keine Polyfills, Batches 0–3 am Stück, danach batchweise mit Review.
- 2026-10-18 (Batch 0): SPA-Fallback heißt `200.html` statt `index.html` – Empfehlung der Kit-3-Doku, weil
  `index.html` mit Prerendering kollidieren kann. TypeScript (für svelte-check) bleibt auf 6.x, weil Kit 3 TS 6 voraussetzt.
  Kit 3 importiert eigene Module über `#lib/…` (package.json `imports`) statt `$lib`.

## Risiken / offene Punkte
- pdf.js-Fontnamen: Spike in Batch 4. Fallback ist die Auswertung der Font-Ressourcen über die Operator-Liste.
- Andere Buchner-PDFs (andere Bücher, Englisch/Spanisch) können ein anderes Layout haben → Parser-Varianten pro Layout.
  Für alles andere gibt es den universellen Text-Import.
- `ccbuchner.de` leitet eventuell auf `www.` um → `ProxyPassReverse` und auf dem Server mit curl prüfen.
- Kamera und Service Worker brauchen HTTPS (Let's Encrypt auf dem Server).

## Backlog / Ideen
- Web Share Target: aus dem Chrome-PDF-Viewer „Teilen → Vokabulator“.
- CSV-Export für Anki. Weitere Verlage (Klett/Cornelsen) als eigene Import-Adapter.
- Tonausgabe per `speechSynthesis` (Englisch/Spanisch).

## Changelog
- 2026-10-18: Plan erstellt.
- 2026-10-18: Batch 0 – Gerüst (`sv create`, SvelteKit 3.1, Vitest 5), SPA-Config, Apache-Config, Deploy-Skript, README.
- 2026-10-18: Batch 1 – Datenmodell (`model.js`), `storage.js`, Text-Import mit Live-Vorschau, Einheiten-Liste und -Seite. Löschen sitzt auf der Einheitsseite (mit Rückfrage) statt auf der Startseite, damit nichts versehentlich verschwindet.

## Verifikation
- Automatisch: `pnpm check` (svelte-check / JSDoc-Typen), `pnpm test` (Vitest: Parser, Leitner, später Antwortprüfung,
  Scoring, PDF-Fixture), `pnpm build`.
- Manuell lokal: `pnpm dev`, Text einfügen → lernen → neu laden → Fortschritt ist noch da.
  `pnpm preview` → DevTools → Application: Service Worker aktiv, im Offline-Modus weiter nutzbar.
- Handy: per `chrome://inspect` Port-Forwarding auf `localhost:5173` oder nach dem Deploy auf der Subdomain:
  installieren, Flugmodus, eine Runde lernen.
- Server (durch dich): `apachectl configtest`, danach `curl -I https://<domain>/proxy/ccbuchner/clip_code/40702-229/` → 200,
  ein nicht erlaubter Pfad → 404.
