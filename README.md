# RubiChroma — Color Your Music

Web-App zum Erstellen und Bearbeiten farbiger Kalimba-Noten über dem Liedtext.

## Starten

Im Ordner des Tools ein Terminal öffnen und ausführen:

```powershell
python -m http.server 8080
```

Anschließend im Browser öffnen:

```text
http://127.0.0.1:8080
```

Die Änderungen werden automatisch im Browser gespeichert. Über **Sicherung exportieren** lässt sich zusätzlich eine JSON-Datei herunterladen. **Drucken / PDF** öffnet die Druckansicht; dort kann als Drucker „Als PDF speichern“ gewählt werden.

## Notationsformat

- `1 3 5`: einzelne Töne nacheinander
- `(13)`: 1 und 3 gleichzeitig in einem Feld
- `1′` oder `1″`: höhere Oktaven
- `-`: sichtbarer Trenner

Das Lied, einzelne Wörter, Notationen, Farben und Handzuordnungen können vollständig in der Oberfläche bearbeitet werden.

## Branches und Veröffentlichung

- `main` enthält ausschließlich den Produktionsstand.
- `dev` enthält den gemeinsamen Teststand für kommende Änderungen.
- Neue Änderungen entstehen in einem eigenen Feature-Branch und werden per Pull Request in `dev` integriert.
- Für eine selektive Veröffentlichung wird vom aktuellen `main` ein eigener Promotion-Branch erstellt. Nur die freigegebenen, in `dev` getesteten Änderungen werden übernommen und anschließend per Pull Request nach `main` gebracht.
