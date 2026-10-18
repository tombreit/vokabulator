# Vokabulator – Plan (living document)

> Living document: wird bei jedem Batch fortgeschrieben (Status, Entscheidungen, Changelog).
> Sprache: Plan & UI deutsch, Code & Kommentare englisch.

## Status

| Batch | Thema | Status |
|---|---|---|
| 0 | Fundament (Repo, SvelteKit, Apache, Deploy) | ✅ |
| 1 | Lerneinheiten, Text-Import, Speicher | ✅ |
| 2 | Karteikarten-Abfrage, Leitner, Ergebnis | ✅ |
| 3 | Offline/PWA, Backup → **1. nutzbare Version, Review-Pause** | ✅ |
| 4 | PDF-Parser (C.C.Buchner-Lexikon, Datei-Upload) | ✅ |
| 5 | Mediencode-Import über Proxy | ✅ (lokal; Server nach Deploy prüfen) |
| – | **Deployment auf https://vokabulator.thms.de/ (durch dich)** | ✅ live: Proxy, Offline, Scanner-Ablauf, Spiel geprüft |
| 6 | QR-Scanner (nativer `BarcodeDetector`) | ✅ (lokal; Kamera-Test auf dem Handy offen) |
| 7 | Spielmechanik: Tippen, Multiple Choice, Punkte, Joker, Schachuhr, Feedback | ✅ (live geprüft) |
| 8 | Teilen | ✅ (live geprüft) |
| 9 | Design & Polish („Wachstafel“) | ✅ live, ersetzt durch Batch 10 |
| 10 | „Blockwelt“: Minecraft-Stil mit Erzen, XP/Level, Fortschritten | ✅ live geprüft |
| 11 | QR-Scanner auf allen Geräten (ZXing-Fallback) | ✅ live geprüft |

## Kontext

Mein Sohn lernt Vokabeln (vor allem Latein, manchmal Englisch/Spanisch). In den Schulbüchern stehen QR-Codes
(z. B. `https://ccbuchner.de/clip_code/40702-229/`). Die Vokabeln liegen erst ein Klick weiter als PDF vor.
Vokabulator soll sie per Scan holen, als Lerneinheit offline auf dem Smartphone speichern und spielerisch abfragen:
Leitner-Prinzip wie bei AnkiDroid, „schwer“-Markierung, Punkte, Emojis und Feedback in Jugendsprache.

**Annahmen:** Zielgerät ist aktuelles Chrome auf Android. Es gibt keine Abwärtskompatibilität und keine Polyfills,
wir nutzen nur moderne Web-APIs. Gehostet wird auf dem eigenen Root-Server mit **Apache**, eigene Subdomain, HTTPS: https://vokabulator.thms.de/

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
kleiner Apache-Reverse-Proxy (Regeln in `static/.htaccess`), der nur die zwei URL-Muster weiterreicht (Mediencode-Seite und Download-PDF).
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
deploy/apache-vhost.conf        minimaler VirtualHost (Domain, TLS via mod_md, DocumentRoot, AllowOverride, SSLProxyEngine)
static/.htaccess                alle App-Regeln: eng begrenzter Proxy, SPA-Fallback, Cache-Header, MIME-Typen
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
- Apache, aufgeteilt (seit 2026-10-18):
  - `deploy/apache-vhost.conf`: nur das, was nicht in `.htaccess` darf. Das sind Domain, TLS (mod_md), DocumentRoot,
    `AllowOverride All`, `SSLProxyEngine on` und `ProxyAddHeaders Off`.
  - `static/.htaccess`, wird mit jedem Deploy übertragen:
    - Proxy per `RewriteRule … [P]`, nur die zwei URL-Muster, nur GET/HEAD, sonst 403
    - SPA-Fallback auf `200.html` (fehlende `/_app/`-Dateien bleiben 404)
    - Cache-Header
    - MIME-Typen für `.mjs` und `.webmanifest`
  - Module: md, ssl, rewrite, proxy, proxy_http, headers
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
- Spike-Ergebnis: pdf.js 6.4 liefert mit `fontExtraProperties: true` den echten Fontnamen (`ABCDEE+Aptos-Bold`/`-Italic`)
  über `page.commonObjs`. Im Browser läuft der moderne Build, in Node (Tests) der Legacy-Build.
- `src/lib/import/pdf-items.js`: PDF-Bytes → pro Seite `{ str, x, y, size, bold, italic }[]`. pdf.js wird per lazy import geladen.
- `src/lib/import/pdf-lexikon.js` (rein, testbar):
  1. Fußzeile (`©`) und Leerstellen verwerfen.
  2. Überschriften (≥ 1,2 × Grundgröße) und Hochzahlen (≤ 0,8 × Grundgröße) erkennen. Hochzahlen werden zu `refs`.
  3. Spalten an der Seitenmitte trennen, Zeilen nach y bilden. Eine Zeile mit fettem Anfang startet einen Eintrag.
  4. Fett → `front`, kursiv davor → `frontInfo`, ab dem ersten normalen *Wort* → `back`. Satzzeichen schalten nicht um.
     Klammern bleiben zusammen.
  5. Die erste Überschrift ist der Titel, alle weiteren sind Abschnitte. Eine Seite ohne Überschrift, deren Alphabet
     neu beginnt, wird zu „… (Teil 2)“: Ihre Überschrift ist im PDF nur ein Bild.
- Fixture `src/lib/import/fixtures/ccbuchner-26273.pdf` (nur privates Repo) mit Test daneben.
- `/neu` mit Tabs „📄 PDF-Datei“ und „✍️ Text eintippen“. `DraftPreview.svelte`: „Speichern & loslegen 🚀“ → `/lernen/[id]`,
  „Nur speichern“ → `/einheit/[id]`. Hinweis, wenn die Einheit schon existiert; der Lernstand bleibt erhalten.
- **Fertig wenn:** Das Beispiel-PDF wird vollständig und korrekt importiert: 148 Wörter in 4 Abschnitten.

### Batch 5 – Mediencode-Import über den Proxy
- `src/lib/import/ccbuchner.js`:
  - `parseMediencode(input)`: Aus `40702-229` oder `https://(www.)ccbuchner.de/clip_code/40702-229/` wird
    `40702-229`. Mit Unit-Tests.
  - `importMediencode(code)`:
    1. `fetch('/proxy/ccbuchner/clip_code/<code>/')`
    2. `DOMParser` → `a[href$=".pdf"]` → PDF über den Proxy laden
    3. `pdf-items.js` → `pdf-lexikon.js` → `UnitDraft` mit `id: 'ccb-<code>'`
- Dev-Proxy in `vite.config.js` (`/proxy/ccbuchner` → `https://www.ccbuchner.de`), derselbe Pfad wie bei Apache.
- `/neu`, Tab „Code eintippen“ + `/neu?code=…`. Gibt es `ccb-<code>` schon, geht es direkt zur Einheit.
- Fehlermeldungen: offline, Code unbekannt, kein PDF-Link, PDF ohne Vokabeln → Hinweis auf die Fallbacks.
- Einheitsseite: „Neu laden“ für ccbuchner-Einheiten. Der Lernstand bleibt, weil die Eintrags-IDs stabil sind.
- **Fertig wenn:** Code eintippen → Vorschau → „Speichern & loslegen“, lokal und auf dem Server.

### Deployment (durch dich) – jetzt, vor Batch 6

Ziel: Der Stand bis Batch 5 läuft auf https://vokabulator.thms.de/. So lässt sich der Scanner in Batch 6 direkt
auf dem Handy testen, denn Kamera und Offline-Modus brauchen HTTPS.

**1. Server prüfen (einmalig).** Vorlage: `deploy/apache-vhost.conf`. Im VHost für `vokabulator.thms.de` muss stehen:
- `AllowOverride All` im `<Directory>` des DocumentRoot, sonst ignoriert Apache die `.htaccess` der App
- `SSLProxyEngine on`, damit der Proxy ccbuchner.de über HTTPS erreicht
- `ProxyAddHeaders Off`, damit keine IP-Adressen an den Verlag gehen
- `ProxyPreserveHost Off` und `SSLProxyProtocol -all +TLSv1.2 +TLSv1.3`, weil ccbuchner.de nur mit SNI `www.ccbuchner.de` und nur TLS 1.2 antwortet
- Module: `a2enmod rewrite proxy proxy_http headers`, danach `apachectl configtest && systemctl reload apache2`
- Für rsync: SSH-Zugang mit Schreibrecht auf den DocumentRoot

**2. Deployen (lokal, im Projektordner).**
```sh
export VOKABULATOR_TARGET=user@host:/var/www/vokabulator   # dein SSH-Ziel und DocumentRoot
./deploy/deploy.sh --dry-run   # prüft, testet, baut und zeigt nur, was kopiert würde
./deploy/deploy.sh             # dasselbe, kopiert dann wirklich (rsync --delete, inkl. .htaccess)
```

**3. Prüfen.**
```sh
curl -sI https://vokabulator.thms.de/                                     | head -1  # 200 – App
curl -sI https://vokabulator.thms.de/einheit/test                         | head -1  # 200 – App-Routen
curl -sI https://vokabulator.thms.de/proxy/ccbuchner/clip_code/40702-229/ | head -1  # 200 – Proxy geht
curl -sI https://vokabulator.thms.de/proxy/ccbuchner/agb/c-856            | head -1  # 403 – nur erlaubte Pfade
```

**4. Auf dem Handy (Chrome).**
1. https://vokabulator.thms.de/ öffnen und über das Menü „App installieren“ wählen.
2. ＋ Neue Lerneinheit → Code `40702-229` → „Speichern & loslegen 🚀“.
3. Flugmodus an, die App vom Startbildschirm öffnen und eine Runde lernen.

**Wenn etwas hakt:** Zuerst ins Error-Log schauen: `tail -n 20 /var/log/apache2/error.log`.
- 500 auf allen Seiten: Ein Modul fehlt (meist `rewrite` oder `headers`), oder `.htaccess` ist nicht erlaubt.
  Die Meldung im Log nennt die Zeile.
- 404 auf `/einheit/test`: `AllowOverride` fehlt, die `.htaccess` wird also nicht gelesen.
- 500/502 nur bei `/proxy/…`: `SSLProxyEngine on` oder `proxy_http` fehlt. Im Error-Log steht dann:
  - `AH01961: SSL Proxy requests for this server not enabled` → `SSLProxyEngine on` in den `*:443`-VHost
  - `AH01144: No protocol handler was valid` → `a2enmod proxy_http && systemctl restart apache2`
  - `AH00898: Error during SSL Handshake with remote server` → `ProxyPreserveHost Off` und
    `SSLProxyProtocol -all +TLSv1.2 +TLSv1.3` in den VHost (falsche SNI bzw. nur TLS 1.3 erlaubt)

Danach gibst du mir Bescheid. Ich prüfe den Host von außen und mache mit Batch 6 weiter.

### Batch 6 – QR-Scanner in der App
- `src/lib/components/QrScanner.svelte`: Rückkamera (`getUserMedia`) + nativer `BarcodeDetector({ formats: ['qr_code'] })`
  im `requestAnimationFrame`-Takt. Kamera beim Verlassen stoppen. Treffer → Vibration → `onscan(text)`.
- `/neu`: Der Tab „📷 Scannen“ ist Standard. Gescannter Text → `parseMediencode` → Import wie in Batch 5.
  Ein QR-Code, der kein Mediencode ist, bekommt eine freundliche Meldung.
- Startseite: Primärbutton „📷 QR-Code scannen“, „＋ Neue Lerneinheit“ wird zweitrangig.
- Ohne `BarcodeDetector` (z. B. Desktop-Linux) fehlt der Scan-Tab, Standard ist dann „Code eintippen“.
- **Fertig wenn:** Den QR-Code im Buch in Vokabulator scannen → Vorschau → „Speichern & loslegen“ (Test auf dem Handy).

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
**Idee „Wachstafel“:** Römische Schüler lernten auf der *tabula cerata*, einer Holztafel mit dunklem Wachs, in das sie
mit dem Griffel schrieben. Die Fragekarte ist so eine Tafel (`QuestionCard.svelte`). Die Lösung wird von links nach
rechts „eingeritzt“. Der Scan-Button auf der Startseite ist eine kleine Tafel. Alles andere bleibt ruhig.

| Token | Wert | Rolle |
|---|---|---|
| Marmor | `#E9ECEF` (dunkel `#1C1720`) | Hintergrund – bewusst kühl statt Creme |
| Tinte | `#221A26` (dunkel `#EFE9F0`) | Text |
| Purpur | `#6B1F5C` (dunkel `#8E3A7D`, als Text `#D08BC2`) | Hauptbuttons, Links, Punkte |
| Gold | `#D9A400` (als Text hell `#7A5900`) | Punkte, Sterne, Fokusrahmen |
| Lorbeer / Pompeji-Rot | `#2F7D4F` / `#B3262E` | richtig / falsch |
| Wachs / Holz / Ritzung | `#2E2219` / `#9B6B3D` / `#F1D9A7` | die Tafel, hell und dunkel gleich |

- **Schriften:** **Marcellus** (nach römischen Inschriften) für lateinische Wörter und Überschriften, **Lexend**
  (für flüssiges Lesen entwickelt) für alles andere. So zeigt schon die Schrift, welche Sprache gefragt ist.
  Beide sind lokal eingebunden, also offline verfügbar, und enthalten alle Makronen.
- **Schriftzug „VOKABVLATOR“:** U als V wie auf römischen Inschriften.
- **Fächer:** 🥚🐣🐥🐔🦅, der Adler als Feldzeichen der Legion. Die Einheitsseite zeigt, wie viele Wörter in welchem Fach liegen.
- **Bewegung nur als Antwort auf eine Aktion:**
  - Einritzen der Lösung
  - Konfetti bei Rekord oder perfekter Runde (`Confetti.svelte`, eigenes Canvas)
  - sanfter Seitenübergang (View Transitions)
  - Vibration: kurz bei richtig, doppelt bei falsch

  Bei „Bewegung reduzieren“ entfällt alles davon.
- **Barrierearmut:** Alle Farbpaare erfüllen WCAG AA, auch im dunklen Modus. Fokus ist als goldener Rahmen sichtbar,
  Tippflächen sind mindestens 48 px groß.
- **Bewusst vermieden:** Labels in Großbuchstaben, Meta-Zeilen mit „·“-Trennern, „→“ an Buttons, Verläufe als Deko.

### Batch 10 – „Blockwelt“ (Minecraft-Stil)
Wunsch: Die Zielgruppe ist die Mittelstufe, viele sind Minecraft-Fans, also Design im Stil des Spiels. Es wird nur
der Stil nachempfunden: keine Original-Texturen, kein Logo, kein Name „Minecraft“ in der App, keine Original-Sounds.
Alle Pixel-Grafiken sind selbst gezeichnet (`src/lib/pixel/sprites.js`).

**Spielmechanik als Bildsprache:**

| Lernmechanik | Blockwelt |
|---|---|
| Leitner-Fächer 1–5 | **Erze Stein → Kohle → Eisen → Gold → Diamant** (`BOX_ORES`). Die Fragekarte zeigt den Block, der bei richtiger Antwort Risse bekommt und aufs nächste Erz springt. |
| Punkte | **XP**, dazu ein **Level** über alle Runden (`learn/level.js`: Level n → n+1 kostet 100 + 50·n XP) |
| Joker | **Hotbar:** Fackel = Tipp/50:50, Fernrohr = Aufdecken |
| Combo | **verzauberte Karte** (lila Schimmer) |
| Tage in Folge | **„X Tage überlebt“** mit Pixel-Sonne |
| Rekorde, Ziele | **Fortschritte** (`learn/advancements.js`, 12 Stück): Einblendung „Fortschritt erzielt!“ und Seite `/fortschritte` |
| Lerneinheiten | **Welten** („Meine Welten“, Weltliste mit dem besten Erz als Symbol) |
| Feedback | **Chatzeile** `<Vokabulator> Sheesh! +20 XP`, dazu Blockwelt-Sprüche und ein gelber Splash-Text auf der Startseite |
| Rundeneinstellungen | **Optionsknöpfe** „Modus: Tippen“, die beim Tippen den Wert wechseln |

**Look:**
- Erde als Hintergrund und Graskante oben
- Stein-Panels (`.card`) mit Fasenkante, Block-Buttons (`.button`, `.primary` = Gras, `.danger` = Rot)
- Inventar-Slots mit Stapelzahl, Tooltips mit lila Rahmen, Pixel-Konfetti
- Text auf Erde hell mit Pixel-Schatten, auf Stein dunkel (Tokens wechseln automatisch in `.card`)
- Alle Farbpaare nach WCAG AA

**Schrift:** **Monocraft** (OFL, `src/lib/fonts/`, auf die nötigen Zeichen reduziert, 18 KB) für Spiel und Fremdwörter,
**Lexend** für Deutsch und längere Texte.

**Ton:** kurze, selbst erzeugte WebAudio-Töne (`src/lib/sound.js`), standardmäßig aus, Schalter in den Einstellungen.
**Sicherung** enthält jetzt auch XP, Level, Rekorde und Fortschritte; beim Wiederherstellen wird zusammengeführt (`mergeStats`).
**App-Icon:** Diamant-Erz, erzeugt von `scripts/make-icons.mjs` aus dem Sprite.

## Entscheidungs-Log
- 2026-10-18: SvelteKit 3 im SPA-Modus, JS + JSDoc, Apache, localStorage, Leitner ohne Datums-Intervalle,
  nur moderne Browser-APIs (Chrome Android), keine Polyfills, Batches 0–3 am Stück, danach batchweise mit Review.
- 2026-10-18 (Batch 0): SPA-Fallback heißt `200.html` statt `index.html` – Empfehlung der Kit-3-Doku, weil
  `index.html` mit Prerendering kollidieren kann. TypeScript (für svelte-check) bleibt auf 6.x, weil Kit 3 TS 6 voraussetzt.
  Kit 3 importiert eigene Module über `#lib/…` (package.json `imports`) statt `$lib`.
- 2026-10-18 (Batch 3): Der Service Worker cached die App-Shell von `/` (auf Apache per Rewrite auf `200.html`)
  und liefert sie offline für jede Route aus. Dafür braucht es absolute Asset-Pfade (`paths.relative: false`) und
  `ignoreVary` beim Cache-Lookup (Server senden `Vary: Origin`, JS-Module werden mit Origin-Header geladen).
- 2026-10-18: **Reverse Proxy bleibt.** Geprüft: ccbuchner.de sendet weder für die Mediencode-Seite noch für das PDF
  `Access-Control-Allow-Origin`; der Browser darf die Inhalte also nicht direkt lesen. Ohne Proxy blieben nur Umwege
  (Teilen-Menü, Datei wählen). Mit Proxy gilt: in Vokabulator scannen → Vorschau → „Speichern & loslegen“.
- 2026-10-18 (Batch 4): pdf.js mit `fontExtraProperties: true`, im Browser der moderne Build (braucht u. a.
  `Uint8Array.toHex`, aktuelles Chrome hat das), in Node/Vitest der Legacy-Build. Der pdf.js-Worker (1,2 MB) liegt
  im Offline-Cache, deshalb funktioniert der PDF-Import auch offline.
- 2026-10-18: **App-Regeln in `.htaccess`, VHost minimal.** So lassen sich neue Anforderungen ohne Serverzugriff
  umsetzen. `ProxyPass` ist in `.htaccess` nicht erlaubt, deshalb `RewriteRule … [P]`. `SSLProxyEngine` und
  `ProxyAddHeaders` dürfen nur in den VHost. Der Service Worker überspringt Dotfiles (`.htaccess`), weil Apache sie
  nicht ausliefert. Lokal gegen Apache 2.4.69 getestet: Proxy, 403 für alles andere, SPA-Fallback, Cache- und
  MIME-Header, offline, PDF-Import.
- 2026-10-18 (Batch 5): Den PDF-Link auf der Mediencode-Seite findet ein einfaches Muster (`href="….pdf"`) statt
  `DOMParser`. Das reicht für die kleine Seite und ist ohne Browser testbar. `importMediencode` bekommt `fetch` und
  pdf.js als austauschbare Abhängigkeiten, deshalb sind die Fehlerfälle per Unit-Test geprüft. Die Sprachauswahl sitzt
  jetzt in der gemeinsamen Vorschau (`DraftPreview.svelte`), Standard ist Latein. Beim Scannen muss also niemand vorher etwas wählen.
- 2026-10-18 (Live-Test): App-Icons liegen unter `/app-icons/` statt `/icons/`. Debians Apache hat global
  `Alias /icons/ /usr/share/apache2/icons/`. Dadurch fehlten die Icons, und die Installation des Service Workers
  brach ab (`cache.addAll` ist alles oder nichts). Weitere globale Debian-Pfade (`/manual`, `/javascript`, `/cgi-bin/`,
  `/server-status`) nicht als Routen verwenden.
- 2026-10-18 (Batch 6): Die Logik „Code schon importiert → Einheit öffnen“ sitzt in `MediencodeLoader.svelte`, Scanner
  und Code-Tab teilen sie sich. `canScanQr` (in `QrScanner.svelte`) entscheidet, ob es den Scan-Tab und den großen
  Scan-Button gibt. Ohne `BarcodeDetector` ist „Code“ der Standard. Typen für `BarcodeDetector` stehen in `src/ambient.d.ts`.
- 2026-10-18 (Live-Test): Der Proxy scheiterte mit `AH00898` (TLS-Handshake). Mit `openssl s_client` geprüft: ccbuchner.de
  antwortet nur mit SNI `www.ccbuchner.de` und nur über TLS 1.2. Die VHost-Vorlage setzt deshalb ausdrücklich
  `ProxyPreserveHost Off` und `SSLProxyProtocol -all +TLSv1.2 +TLSv1.3`. Beides ist in `.htaccess` nicht erlaubt.
- 2026-10-18 (Batch 7a): Die Lernseite ist ein schlanker Zustandsautomat. Jeder Teil ist eine Komponente im Routenordner:
  `Setup`, `QuestionCard`, `Flashcards`/`Typing`/`Choice`, `Feedback`, `Result`. Die Antwortprüfung (`check-answer.js`)
  und die Auswahl-Optionen (`choices.js`) sind reine Module mit Tests. „Ich lag doch richtig“ rechnet das Leitner-Fach
  vom gespeicherten Stand vor der Antwort neu.
- 2026-10-18 (Batch 7b):
  - Joker „💡 Tipp“: im Tipp-Modus der erste Buchstabe, im Auswahl-Modus **50:50**. Das ist spielerisch
    sinnvoller als der erste Buchstabe. Beide kosten 3 Punkte. „👀 Aufdecken“ zählt als nicht gewusst.
  - Karteikarten geben Punkte für die Selbstbewertung, haben aber keine Joker, weil Aufdecken dort schon dazugehört.
  - Richtige Antworten gehen nach 1,2 s automatisch weiter, falsche warten, bis die Lösung gelesen ist.
  - Die Schachuhr steht während des Feedbacks.
  - Läuft die Zeit ab, zählt das Ergebnis alle Karten der Runde. So steht nach 1 von 5 kein „Perfekt“.
  - Rekorde und Tage in Folge liegen in `vokabulator.stats`.
- 2026-10-18 (Batch 8):
  - Eine Challenge überträgt nicht nur die Punkte, sondern auch Modus, Wortzahl, Richtung und Uhr. Der Freund spielt
    also nach denselben Regeln, die Abschnitte bleiben frei wählbar.
  - Der Challenge-Teil des Links wird mit `withChallenge()` von `/neu` zur Lernseite mitgenommen statt über
    Komponenten-Props weitergereicht.
  - Geteilte Text- und PDF-Einheiten behalten ihre ID. Ein erneutes Öffnen aktualisiert dann statt zu verdoppeln.
  - Teilen nutzt `navigator.share` (Android) und sonst die Zwischenablage.
- 2026-10-18 (Batch 9):
  - **Atkinson Hyperlegible Next verworfen**, weil die Schrift kein `ō` enthält. Jedes „capiō“ wäre mit einem
    Ersatzzeichen gesetzt worden. Lexend deckt alle Makronen ab.
  - **„Einritzen“ statt 3D-Karten-Flip**, weil das zur Wachstafel passt und zeigt, was sich ändert: Die Lösung
    erscheint.
  - **Sounds weggelassen.** Es gibt genug Rückmeldung, und auf dem Handy in der Schule nervt Ton eher.
  - **Eigene Flächenfarben** `--good-fill`/`--bad-fill` für Bewertungs-Buttons und `--accent-ink`/`--star-ink`
    für farbigen Text. So bleibt der Kontrast im dunklen Modus erhalten.
  - **Fehler behoben:** Verlässt man den Scanner, während die Kamera anläuft, wurde ein unbehandelter Fehler
    geworfen (`video.play()` abgebrochen).
- 2026-10-18 (Batch 10):
  - **Schrift:** Pixelify Sans verworfen, weil C/O, Z/2, B/8 und 5/S auch in normaler Stärke kaum zu unterscheiden
    waren. Das ist bei Namen wie Caesar oder Cato untragbar. Stattdessen **Monocraft** (OFL) selbst gehostet:
    mit `fontTools` auf Latein, Latin Extended-A, Anführungszeichen und Pfeile reduziert, als WOFF2, ohne Ligaturen.
    Weil Monocraft dicktengleich ist, stehen deutsche Bedeutungen und längere Texte in Lexend.
  - **Nur ein Thema** (dunkle Erde, graue Panels), weil der Look von Haus aus so ist. Hell/Dunkel entfällt.
  - **Karteikarten** zeigen nach der Bewertung 1 s lang die Erz-Änderung, bevor die nächste Karte kommt. Die
    Aufwertung ist der wichtigste Moment.
  - **Joker:** Es bleibt bei einem gemeinsamen Vorrat von 3. Die Hotbar zeigt „Noch N Joker“ statt einer Stapelzahl
    pro Gegenstand, die nach 6 Jokern aussähe.
  - **Sicherung:** Sie enthält jetzt die Statistik, damit Level und Fortschritte auf ein neues Handy mitkommen.
- 2026-10-18 (Batch 11): **Entscheidung „keine Polyfills“ für den Scanner revidiert.** Der eingebaute
  `BarcodeDetector` fehlt in Firefox, auf iPhone/iPad und in Chrome unter Windows/Linux. Dort war der Scanner bisher
  unsichtbar, was beim Test in Firefox/Linux auffiel. Der Scanner soll auf allen Geräten der Schüler laufen. Deshalb:
  - eingebauter Leser, wo vorhanden
  - sonst `barcode-detector/ponyfill`, also ZXing als WebAssembly über dieselbe Schnittstelle, erst bei Bedarf
    geladen (1,1 MB, komprimiert 460 KB)
  - Die `.wasm` kommt von unserem Server statt vom CDN (`prepareZXingModule`).
  - Sie liegt nicht im Offline-Cache, weil Scannen ohnehin Internet für den Import braucht.
  - Scan-Button und Tab sind jetzt immer da.

## Risiken / offene Punkte
- Andere Buchner-PDFs (andere Bücher, Englisch/Spanisch) können ein anderes Layout haben → Parser-Varianten pro Layout.
  Für alles andere gibt es den universellen Text-Import.
- ~~`ccbuchner.de` leitet eventuell auf `www.` um~~ → geklärt: 301 auf `www.`, der Proxy geht direkt auf `www.ccbuchner.de`.
- Kamera und Service Worker brauchen HTTPS (Let's Encrypt auf dem Server).

## Backlog / Ideen
- Web Share Target: aus dem Chrome-PDF-Viewer „Teilen → Vokabulator“.
- CSV-Export für Anki. Weitere Verlage (Klett/Cornelsen) als eigene Import-Adapter.
- Tonausgabe per `speechSynthesis` (Englisch/Spanisch).
- Browser-Smoke-Tests (Playwright, wie bisher lokal genutzt) ins Repo übernehmen.

## Changelog
- 2026-10-18: Plan erstellt.
- 2026-10-18: Batch 0 – Gerüst (`sv create`, SvelteKit 3.1, Vitest 5), SPA-Config, Apache-Config, Deploy-Skript, README.
- 2026-10-18: Batch 1 – Datenmodell (`model.js`), `storage.js`, Text-Import mit Live-Vorschau, Einheiten-Liste und -Seite. Löschen sitzt auf der Einheitsseite (mit Rückfrage) statt auf der Startseite, damit nichts versehentlich verschwindet.
- 2026-10-18: Batch 2 – `leitner.js` (Fächer, Rundenauswahl, Lernstand) mit Tests, `/lernen/[id]` (Setup → Karten → Ergebnis, „Nur Fehler nochmal“), ⭐ auf Lern- und Einheitsseite, Fortschrittsbalken auf Start- und Einheitsseite. Die Fächer zeigt die Wortliste vorerst als ●●○○○.
- 2026-10-18: Batch 3 – Service Worker (offline), Manifest + Platzhalter-Icons (installierbar), Wake Lock beim Lernen, `navigator.storage.persist()`, Backup speichern/laden unter ⚙️ Einstellungen. Im Headless-Chromium geprüft: offline Start/Einheit/Lernen, Backup → frisches Profil, keine Manifest-Fehler.
- 2026-10-18: Batch 4 – PDF-Parser (`pdf-items.js`, `pdf-lexikon.js`) mit Fixture-Tests, Tabs auf `/neu`, PDF-Import, „Speichern & loslegen“. Im Chromium geprüft: Beispiel-PDF → 148 Wörter / 4 Abschnitte → Lernrunde.
- 2026-10-18: Apache-Setup umgebaut: `deploy/apache-vhost.conf` (minimal) + `static/.htaccess` (App-Regeln, wird mitdeployt).
- 2026-10-18: `pnpm check:htaccess` (`deploy/check-htaccess.mjs`): Wegwerf-Apache prüft `build/.htaccess` vor jedem Deploy; Teil von `deploy/deploy.sh`.
- 2026-10-18: Batch 5 – `ccbuchner.js` (Mediencode erkennen, Seite + PDF über `/proxy/ccbuchner/…`), Dev-/Preview-Proxy, Tab „🔢 Code“ (Standard), `/neu?code=…`, bekannte Codes öffnen direkt die Einheit, „🔄 Neu laden“ auf der Einheitsseite. Im Chromium über den Dev-Proxy mit echtem ccbuchner.de geprüft: Import, Wiederöffnen, Neu laden, ungültige Eingabe, unbekannter Code, geteilter Link, offline.
- 2026-10-18: `.htaccess`-Check auf deinen Wunsch wieder entfernt. Der Server ist eingerichtet, geprüft wird nach dem Deploy (Abschnitt „Deployment“). Deployment-Anleitung vor Batch 6 ergänzt.
- 2026-10-18: Live-Prüfung von https://vokabulator.thms.de/: App, `.htaccess`, Header ok. Icons kollidierten mit Debians `/icons/`-Alias, deshalb umbenannt in `/app-icons/`. Der Proxy liefert 500 (Server-Konfiguration, siehe Deployment).
- 2026-10-18: Batch 6 – `QrScanner.svelte` (Rückkamera + nativer `BarcodeDetector`, Vibration, Kamera aus beim Verlassen), Tab „📷 Scannen“ als Standard, großer Scan-Button auf der Startseite, Hinweis bei fremden QR-Codes, Tabs als 2×2-Raster. Im Chromium mit Fake-Kamera und nachgebautem `BarcodeDetector` geprüft: Scan → Vorschau → Lernen, fremder QR-Code, bekannter Code, ohne Detector, Kamera verweigert.
- 2026-10-18: Live: Proxy läuft nach `ProxyPreserveHost Off`/`SSLProxyProtocol`. Import über den echten Server im Chromium geprüft. Der Server hat noch den Build von 20:05, Icon-Fix und Scanner fehlen dort.
- 2026-10-18: Batch 7a – Lernmodi „⌨️ Tippen“ (tolerante Prüfung, Tippfehler, „Ich lag doch richtig“) und „🔘 Auswahl“ (4 Optionen), Modus wird gemerkt. Lernseite in Komponenten aufgeteilt.
- 2026-10-18: Batch 7b – Punkte, Combo ×2/×3, Joker (💡 Tipp/50:50, 👀 Aufdecken), Schachuhr (1/3/5 Min, Zeitbonus), Sprüche in `feedback.js`, Ergebnis mit Rekord, bester Serie, Zeit und Tagen in Folge; Startseite zeigt 🔥 Tage und 🏆 pro Einheit. Tests für `scoring.js` und `streak.js`; im Chromium inkl. vorgespulter Uhr geprüft.
- 2026-10-18: Live-Prüfung des Builds von 20:54: alle Dateien für den Offline-Cache laden, Offline-Modus, Backup, Scanner-Ablauf (Fake-Kamera), Spielmechanik und Proxy grün.
- 2026-10-18: Batch 8 – `share.js` (Links: Mediencode bzw. komprimierte Wörter nach `#d=`, Challenge-Parameter) mit Tests, `ShareButton.svelte`, „📤 Teilen“ auf der Einheitsseite, „📤 Ergebnis teilen“ als Challenge, Challenge-Banner auf `/neu` und Lernseite, Vergleich im Ergebnis. Im Chromium mit zwei Profilen geprüft.
- 2026-10-18: Live: Teilen und Challenges gegen den echten Server geprüft.
- 2026-10-18: Batch 9 – Design „Wachstafel“: Tokens, Marcellus + Lexend, Tafel mit Einritz-Animation, Scan-Tafel auf der Startseite, Fächer 🥚🐣🐥🐔🦅 mit Übersicht, Konfetti, Vibration, Seitenübergänge, neues App-Icon. Kontraste nach WCAG AA nachgerechnet, Screenshots hell/dunkel gesichtet, alle Browser-Abläufe erneut grün, Schriften offline aus dem Cache.
- 2026-10-18: Live: Batch 9 („Wachstafel“) deployt und geprüft.
- 2026-10-18: Batch 10 – „Blockwelt“: Fundament (10a), Erze, Welten, Inventar, aufbrechender Block, XP und Level,
  Hotbar, Chat, Optionsknöpfe, Töne, Monocraft (10b/c), Fortschritte (10d). Alle Browser-Abläufe erneut geprüft
  (Import Code/PDF/Text, Scanner, drei Lernmodi, Joker, Uhr, Teilen/Challenge, offline). Neu geprüft: Level-Up,
  Erz bis Diamant, Fortschritte, Erz-Bilanz, Sound-Schalter.
- 2026-10-18: Live: Batch 10 („Blockwelt“) deployt und geprüft (Proxy, Offline-Dateien, Spiel, Fortschritte).
- 2026-10-18: Batch 11 – Scanner überall: ZXing-Fallback (`barcode-detector`, `zxing-wasm` 3.1.3), Fehlertext bei
  fehlender Kamera, `AddType application/wasm`. Echter Scan geprüft: Chromium ohne eigenen Leser, Fake-Kamera mit dem
  QR-Code aus dem Buch → Einheit in 1,3 s geladen, keine fremden Server.
- 2026-10-18: Live: Batch 11 deployt und geprüft. `.wasm` kommt als `application/wasm`, mit gzip (~460 KB) und
  langem Cache. Echter Scan ohne eingebauten Leser liest den QR-Code aus dem Buch in 1,3 s. Eingebauter Leser, Spiel,
  Teilen/Challenge, Offline und Backup sind grün.

## Verifikation
- Automatisch: `pnpm check` (svelte-check / JSDoc-Typen), `pnpm test` (Vitest: Parser, Leitner, später Antwortprüfung,
  Scoring, PDF-Fixture), `pnpm build`.
- Manuell lokal: `pnpm dev`, Text einfügen → lernen → neu laden → Fortschritt ist noch da.
  `pnpm preview` → DevTools → Application: Service Worker aktiv, im Offline-Modus weiter nutzbar.
- Handy: per `chrome://inspect` Port-Forwarding auf `localhost:5173` oder nach dem Deploy auf der Subdomain:
  installieren, Flugmodus, eine Runde lernen.
- Server: nach jedem Deploy die Prüfungen aus „Deployment (durch dich)“, Schritt 3.
- Server (durch dich): `apachectl configtest`, danach `curl -I https://<domain>/proxy/ccbuchner/clip_code/40702-229/` → 200,
  ein nicht erlaubter Pfad → 404.
