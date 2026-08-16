# RubiChroma – Tech Stack und Architektur

**Status:** Beschlossen für den MVP
**Führende Quelle:** Dieses Dokument beschreibt den technischen Zielzustand und die verbindlichen Architekturregeln. GitHub-Issues beschreiben die konkrete Umsetzung.

## Stack

- Angular 22 mit TypeScript und Standalone Components
- Angular Material und CDK für generische Bedienelemente und Interaktionen
- SCSS und ein eigenes RubiChroma-Theme
- Angular Signals und Services für Anwendungszustand; kein NgRx im MVP
- Angular Reactive Forms
- Dexie und IndexedDB für lokale strukturierte Daten
- Tone.js für Transport, Tempo, Wiedergabe und Loops
- Angular Service Worker für App-Dateien und statische Offline-Ressourcen
- Vitest für Unit- und Integrationstests
- Playwright für Browser- und End-to-End-Tests
- später Capacitor für iOS- und Android-Pakete

Der MVP benötigt kein Backend, Benutzerkonto oder Cloud-System.

## Architekturregeln

### Fachmodell vor Darstellung

Das interne Musikmodell ist unabhängig von Angular, Instrumentprofil, Farbe und sichtbarer Notation. Es beschreibt unter anderem Lied, Takt, Tempo sowie Ton-, Akkord- und Pausenereignisse mit ihren Dauern.

Textnotation, Kalimba-Zahlen, Tonbuchstaben und farbige Darstellung sind Projektionen dieses Modells. Keine sichtbare Notationsform ist selbst die führende Datenstruktur.

Instrumentprofile, Farbprofile und Übungszustand bleiben eigenständige fachliche Bereiche. Dadurch können später weitere Instrumente und Darstellungen ergänzt werden, ohne das Musikmodell auszutauschen.

### Oberfläche

Material und CDK werden für generische Elemente wie Formulare, Dialoge, Menüs, Slider und barrierearme Interaktionen verwendet. Musikalische und lernbezogene Elemente sind eigene RubiChroma-Komponenten, insbesondere Notation, Takte, Wiedergabeposition, Loop-Bereich, Farbhilfen, Instrumentdarstellung und Foto-Pipette.

### Audio und Synchronisation

Tone.js ist die gemeinsame Zeitgrundlage für Wiedergabe und visuelle Hervorhebung. Die Oberfläche betreibt keinen unabhängigen Timer, der der Audiowiedergabe folgt. Audio wird erst nach einer bewussten Benutzeraktion gestartet und vollständig lokal bereitgestellt.

### Speicherung und Offlinebetrieb

Dexie-Schemata und exportierte Sicherungsformate sind ab der ersten Version explizit versioniert und migrierbar. Service Worker und IndexedDB haben getrennte Aufgaben:

- Service Worker: Anwendung, Fonts und statische Audioressourcen
- IndexedDB: Lieder, Farbprofile, Übungszustand und lokale Nutzerdaten

Speicherung, Audio und Medienzugriff werden hinter eigenen Services gekapselt. So können sie für eine spätere Capacitor-App bei Bedarf durch SQLite oder native Funktionen ersetzt werden.

## Übergang von der bestehenden App

Die Angular-Struktur entsteht parallel zur bestehenden Vanilla-JavaScript-App. Funktionen werden in überprüfbaren fachlichen Abschnitten übertragen. Die bestehende App bleibt Referenz, bis der jeweilige Ablauf in Angular übernommen und getestet ist.

Capacitor wird nicht für den Web-MVP benötigt. Die Angular-App wird jedoch von Anfang an responsiv, touch-tauglich und ohne unnötige Abhängigkeit von reinen Desktop-Browserfunktionen entwickelt.

## Später neu bewerten

- Capacitor-Projekte vor der ersten Store-Testversion
- SQLite nur bei nachgewiesenem Bedarf der nativen App
- native Audiolösung nur, wenn Web Audio die Qualitätsziele auf Zielgeräten nicht erfüllt
- NgRx nur bei einer später belegten Zustandskomplexität
