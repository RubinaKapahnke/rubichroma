# RubiChroma – Angular Foundation

Isolierte Angular-22-Standalone-App als erster Migrationsschnitt. Der bestehende Vanilla-Client im Repository-Root bleibt unverändert.

## Start und Prüfung

Voraussetzung ist Node.js 24. Die Befehle werden in `angular-app/` ausgeführt:

```sh
pnpm install
pnpm start
pnpm test
pnpm build
pnpm e2e
```

`pnpm e2e` erwartet einen installierten Playwright-Chromium-Browser (`pnpm exec playwright install chromium`). Der Browser-Download ist bewusst kein Installationsskript.

## Daten und Kompatibilität

- Beim ersten Start wird ausschließlich `localStorage['kalimba-note-tool-v1']` gelesen. Das funktioniert nur unter demselben Origin (Schema, Host und Port) wie die Vanilla-App.
- Die Legacy-Quelle wird niemals gelöscht oder überschrieben. Ohne Legacy-Quelle wird ein kleiner Default-Song verwendet; eine vorhandene ungültige Quelle führt sichtbar zu einem Fehler.
- Der importierte Stand und alle weiteren Änderungen liegen in IndexedDB (`kalimba-angular-v1`). Migration und Marker werden atomar in einer Dexie-Transaktion geschrieben.
- JSON-Export behält `song` und `keys` auf oberster Ebene. Unbekannte Zusatzfelder, Unicode, leere Werte, `toneCount` und die 17 Key-Objekte werden bei Import/Export erhalten.
- Rohe Notation ist die Primärquelle. Die Token-Projektion dient nur der Anzeige und schreibt keine normalisierte Notation zurück.

Es ist absichtlich kein Service Worker registriert: Ohne fest vereinbarten Angular-Deploy-Unterpfad könnte dessen Scope den Legacy-Root übernehmen.

## Markenbasis

Die Angular-Oberfläche verwendet die verbindliche Sora-Hausschrift lokal aus dem App-Bundle und zentrale RubiChroma-Tokens in `src/styles/_tokens.scss`. Das feste Markenpink `#F7496E` kennzeichnet Branding, Primäraktionen und aktive Zustände. Ruhige neutrale Flächen halten den visuellen Raum für spätere persönliche Musikfarben frei; Zustände bleiben zusätzlich durch Text, Form oder Symbole erkennbar. Light und Dark Mode folgen der Systemeinstellung.

## Aktueller Schnitt

Enthalten sind Laden/Migration, Anzeige der Zeilen und Wörter, Bearbeiten von Titel, Worttext und Rohnotation, Autosave sowie JSON-Import/-Export. Noch nicht enthalten sind vollständige Vanilla-Featureparität, Audio/Tone.js, Fotoimport, Backend, NgRx oder Capacitor.

## Ablösung der Alt-App

Der parallele Betrieb ist nur eine Migrationsphase. Sobald die vereinbarten Kernfunktionen, der verlustfreie Datenumzug und die Browser-Abnahmetests vollständig grün sind, wird Angular zur einzigen Anwendung. Im selben Umstellungsschritt werden die dann nicht mehr benötigten Vanilla-Dateien im Repository-Root entfernt; es bleibt kein dauerhaft gepflegter Alt-Client zurück.
