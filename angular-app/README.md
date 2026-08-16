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
- Dexie-Schema v2 migriert bereits vorhandene v1-Songdatensätze atomar und idempotent vom direkten `word.notation`-Feld auf strukturierte Musikereignisse. Revision, Zeitstempel und Migrationsmarker bleiben bei dieser rein strukturellen Umstellung konsistent.
- JSON-Export behält `song` und `keys` auf oberster Ebene. Unbekannte Zusatzfelder, Unicode, leere Werte, `toneCount` und die 17 Key-Objekte werden bei Import/Export erhalten.
- Strukturierte `note`-, `chord`- und `separator`-Ereignisse sind die semantische Primärquelle. Töne und Akkorde verwenden eine Tonstufe von 1 bis 7, eine Oktave von 0 bis 2 und derzeit explizit die Standarddauer `quarter`.
- Exakter Legacy-Rohtext, Parser-Version und Event-Fingerprint bilden eine reine Fidelity-Hülle. Unveränderte Ereignisse exportieren exakt den importierten Text einschließlich unbekannter Fragmente; nach einer strukturellen Änderung wird deterministisch kanonisch serialisiert. Eingaben im Feld „Legacy-Notation“ werden unmittelbar wieder in Ereignisse geparst.

Es ist absichtlich kein Service Worker registriert: Ohne fest vereinbarten Angular-Deploy-Unterpfad könnte dessen Scope den Legacy-Root übernehmen.

## Markenbasis

Die Angular-Oberfläche verwendet die verbindliche Sora-Hausschrift lokal aus dem App-Bundle und zentrale RubiChroma-Tokens in `src/styles/_tokens.scss`. Das feste Markenpink `#F7496E` kennzeichnet Branding, Primäraktionen und aktive Zustände. Ruhige neutrale Flächen halten den visuellen Raum für spätere persönliche Musikfarben frei; Zustände bleiben zusätzlich durch Text, Form oder Symbole erkennbar. Light und Dark Mode sind manuell umschaltbar: Beim ersten Start gilt die Systemeinstellung, anschließend die lokal gespeicherte Auswahl.

## Aktueller Schnitt

Enthalten sind Laden/Migration, Anzeige der Zeilen und Wörter, Bearbeiten von Titel, Worttext und Legacy-Notation, Autosave sowie JSON-Import/-Export. Noch nicht enthalten sind vollständige Vanilla-Featureparität, Audio/Tone.js, Fotoimport, Backend, NgRx oder Capacitor.

## Ablösung der Alt-App

Der parallele Betrieb ist nur Phase 0 der Migration. Nach dem Kerngate aus strukturiertem Musikmodell, verlustfreier Migration und übernommenem Kerneditor dürfen neue MVP-Produktfeatures beginnen; die restliche Editorparität wird parallel übertragen. Angular wird erst nach vollständiger Desktop-Parität, Backup/Restore, responsiver Touch- und Accessibility-Abnahme sowie automatisierten Kernabläufen in einem separat freigegebenen Cutover zur einzigen Anwendung. Im selben Cutover-Schritt werden die Vanilla-Dateien im Repository-Root entfernt; es bleibt kein dauerhaft gepflegter Alt-Client zurück. Für die Umstellung muss ein expliziter Rollback-Release ohne Datenverlust bereitstehen.
