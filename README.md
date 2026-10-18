# Vokabulator 🧠

Vokabeltrainer fürs Smartphone: QR-Code im Schulbuch scannen, Vokabeln landen offline auf dem Handy,
dann wird gelernt – mit Karteikarten, Punkten und Emojis.

Live: https://vokabulator.thms.de/ · Plan, Stand und Entscheidungen: [`PLANS/vokabulator.md`](PLANS/vokabulator.md) (living document).

## Wie die App aufgebaut ist

- **SvelteKit 3 als Single-Page-App.** Alles läuft im Browser, und `pnpm build` erzeugt rein statische Dateien in `build/`.
- **Daten liegen im `localStorage`** des Handys (siehe `src/lib/storage.js`). Es gibt keinen Server und keine Accounts.
- **Fachlogik** steckt in kleinen Modulen unter `src/lib/`, jeweils mit Test daneben (`*.test.js`).
  **Seiten** liegen unter `src/routes/` (`+page.svelte` = eine Seite).
- **Einziger serverseitiger Baustein:** ein eng begrenzter Proxy zu ccbuchner.de, nötig wegen CORS.
  Die Regeln stehen mit allen anderen App-Regeln in [`static/.htaccess`](static/.htaccess) und werden mit jedem
  Deploy übertragen. Im VHost auf dem Server steht nur das Nötigste ([`deploy/apache-vhost.conf`](deploy/apache-vhost.conf)).

## Entwickeln

Voraussetzungen: Node ≥ 22.17 und pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # Typprüfung (JSDoc) mit svelte-check
pnpm test         # Unit-Tests (Vitest)
pnpm build        # statischer Build nach build/
pnpm preview      # Build lokal ansehen (inkl. Service Worker)
```

### Auf dem Handy testen

Kamera und Service Worker brauchen einen „sicheren Kontext“, also HTTPS oder `localhost`. Am einfachsten:

1. Handy per USB anschließen, USB-Debugging aktivieren.
2. Am Rechner in Chrome `chrome://inspect/#devices` öffnen → **Port forwarding** `5173 → localhost:5173`.
3. Auf dem Handy in Chrome `http://localhost:5173` öffnen.

## Deployen

Einmalig auf dem Server: den minimalen VHost einrichten (Anleitung im Kopf von `deploy/apache-vhost.conf`).
Alles Weitere, also Proxy, SPA-Fallback und Cache-Header, kommt mit der `.htaccess` bei jedem Deploy.

Danach für jede neue Version:

```sh
export VOKABULATOR_TARGET=user@server:/var/www/vokabulator
./deploy/deploy.sh --dry-run   # zeigt nur, was kopiert würde
./deploy/deploy.sh             # prüft, testet, baut, prüft .htaccess und kopiert per rsync
```

`pnpm check:htaccess` startet kurz einen lokalen Apache mit denselben Einstellungen wie der VHost und fragt ein paar
URLs ab. Ein Fehler in der `.htaccess` fällt so vor dem Hochladen auf, nicht erst als 500-Fehler auf dem Server.
Dafür muss Apache lokal installiert sein (`apt install apache2`, er muss nicht als Dienst laufen).
