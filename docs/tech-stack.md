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

Der MVP benötigt kein Backend, Benutzerkonto oder Cloud-Datenspeicher. Cloudflare Pages dient ausschließlich der Auslieferung der statischen Web-App.

## Hosting und Veröffentlichung

Die Web-App wird als statische Angular-Anwendung über Cloudflare Pages mit GitHub-Integration veröffentlicht. `main` ist Produktion; `dev`, Feature-Branches und Pull Requests erhalten Vorschau-Deployments. Die verbindliche Konfiguration und der Einrichtungszeitpunkt stehen in [Deployment und Cloudflare Pages](deployment.md).

## Architekturregeln

### Fachmodell vor Darstellung

Das interne Musikmodell ist unabhängig von Angular, Instrumentprofil, Farbe und sichtbarer Notation. Es beschreibt unter anderem Lied, Takt, Tempo sowie Ton-, Akkord- und Pausenereignisse mit ihren Dauern.

Die musikalische Timeline ist ebenfalls eine darstellungs- und instrumentenunabhängige Fachgrenze. Sie ordnet Ereignisse über stabile Identitäten, musikalische Positionen und Dauern an. Instrumentenspuren, Notation, Flow und Audio sind Projektionen beziehungsweise Verbraucher dieser Timeline und definieren keine eigene konkurrierende Zeitbasis.

Bereits in Phase 0 sind strukturierte `note`-, `chord`- und `separator`-Ereignisse die semantische Quelle. Ton und Akkord tragen eine Tonstufe von 1 bis 7, eine Oktave von 0 bis 2 und zunächst explizit die Standarddauer `quarter`. Die bisherige Textnotation liegt nur in einer versionierten Fidelity-Hülle aus exaktem Legacy-Rohtext, Parser-Version und Event-Fingerprint. Solange der Fingerprint zu den Ereignissen passt, wird der Originaltext exakt exportiert; nach einer strukturellen Änderung entsteht deterministisch kanonische Legacy-Notation. Unbekannte oder fehlerhafte Fragmente erzeugen keine Musikereignisse, bleiben bei einem unveränderten Roundtrip aber erhalten.

Textnotation, Kalimba-Zahlen, Tonbuchstaben und farbige Darstellung sind Projektionen dieses Modells. Keine sichtbare Notationsform ist selbst die führende Datenstruktur.

Instrumentprofile, Farbprofile und Übungszustand bleiben eigenständige fachliche Bereiche. Dadurch können später weitere Instrumente und Darstellungen ergänzt werden, ohne das Musikmodell auszutauschen.

Das Musikmodell erlaubt mehrere musikalische Ebenen wie Melodie und Begleitung von Anfang an, auch wenn der MVP zunächst keine vollständige Mehrspur- oder Mixer-Oberfläche anbietet. Ereigniszuordnung und Speicherung dürfen deshalb keine dauerhaft einzige Stimme voraussetzen.

Ein Farbprofil gehört zu genau einem Instrumentprofil und einer Stimmung. Die Zuordnung referenziert stabile physische Zungen- oder Tasten-IDs und hält die zu dieser Stimmung gehörenden Tonhöhen und Tonstufen als Metadaten vor. Bei einer anderen Stimmung wird eine neue Farbskala angelegt; RubiChroma übernimmt die Zuordnung nicht stillschweigend.

### Oberfläche

Material und CDK werden für generische Elemente wie Formulare, Dialoge, Menüs, Slider und barrierearme Interaktionen verwendet. Musikalische und lernbezogene Elemente sind eigene RubiChroma-Komponenten, insbesondere Notation, Takte, Wiedergabeposition, Loop-Bereich, Farbhilfen, Instrumentdarstellung und Foto-Pipette.

Das Corporate-Identity-Dokument ist die führende Quelle für Theme-Tokens und Gestaltung. Light und Dark Mode gehören zum MVP. Beim ersten Start gilt die Systemeinstellung; eine manuelle Auswahl wird lokal gespeichert. Die MVP-Oberfläche ist deutsch, während Texte und Formate technisch für spätere Internationalisierung vorbereitet werden.

### Reaktive Zustandsgrenzen

Komponenten mit `OnPush` erhalten an ihren Eingabegrenzen unveränderliche beziehungsweise referenziell neue Zustände. Eine als Component-Input weitergereichte `FormArray`, `FormGroup`, Collection oder Dokumentstruktur darf bei Import, Restore, Migration oder Hydration nicht nur verborgen in-place mutiert werden. Der Zustandstausch ersetzt die Referenz oder veröffentlicht eine gleichwertige, explizit reaktive Revision, sodass untergeordnete Komponenten ohne Reload sofort den neuen Zustand rendern.

Für jeden vollständigen Dokumenttausch gilt derselbe Abnahmevertrag: repräsentative Daten laden, unmittelbar den neuen sichtbaren Inhalt und das Verschwinden des vorherigen Inhalts prüfen, anschließend eine betroffene Aktion und Undo soweit vorhanden ausführen und den gespeicherten Zustand nach Reload erneut prüfen. Parser- oder Repository-Tests allein belegen diesen Darstellungsvertrag nicht.

### Audio und Synchronisation

Tone.js ist die gemeinsame Zeitgrundlage für Wiedergabe und alle zeitabhängigen Projektionen. Synchrone Notation und Hervorhebung im MVP sowie spätere Flow-, Mehrspur-, Metronom- und Einzählfunktionen leiten ihren Zustand aus derselben musikalischen Timeline und demselben Transport ab. Die Oberfläche betreibt keinen unabhängigen Timer, der der Audiowiedergabe folgt. Tempoänderung, Pause, Fortsetzen, Sprung und Loop werden als gemeinsame Transportoperationen behandelt und nicht getrennt je Darstellung nachgebildet.

Audio wird erst nach einer bewussten Benutzeraktion gestartet und vollständig lokal bereitgestellt. Klangerzeugung und Soundquelle bleiben hinter der Audioanbindung austauschbar, damit der synthetische MVP-Klang später durch Samples ergänzt werden kann, ohne Timeline oder Musikmodell auszutauschen.

Eine zukünftige Spielerkennung wird über eine von Transport und Audioausgabe getrennte Eingabeschnittstelle angebunden. Mikrofon- und MIDI-Adapter liefern normalisierte gespielte Ereignisse; eine davon getrennte Feedbackgrenze vergleicht sie mit erwarteten Timeline-Ereignissen. Weder Eingabe noch Feedback werden zur semantischen Quelle des Liedes.

### Speicherung und Offlinebetrieb

Dexie-Schemata und exportierte Sicherungsformate sind ab der ersten Version explizit versioniert und migrierbar. Service Worker und IndexedDB haben getrennte Aufgaben:

- Service Worker: Anwendung, Fonts und statische Audioressourcen
- IndexedDB: Lieder, Farbprofile, Übungszustand und lokale Nutzerdaten

Speicherung, Audio und Medienzugriff werden hinter eigenen Services gekapselt. So können sie für eine spätere Capacitor-App bei Bedarf durch SQLite oder native Funktionen ersetzt werden.

Ein Foto für die Pipettenfunktion wird standardmäßig nach der Farbübernahme verworfen. Entscheidet sich der Nutzer für die Aufbewahrung, bleibt es ausschließlich lokal gespeichert.

## Übergang von der bestehenden App

Die Angular-Struktur entsteht parallel zur bestehenden Vanilla-JavaScript-App. Funktionen werden in überprüfbaren fachlichen Abschnitten übertragen. Die bestehende App bleibt Referenz, bis der jeweilige Ablauf in Angular übernommen und getestet ist. Die vollständige Paritätscheckliste wird in [Issue #15](https://github.com/RubinaKapahnke/rubichroma/issues/15) gepflegt.

Diese Parallelphase ist Phase 0 und kein dauerhafter Betriebszustand. Zuerst werden das strukturierte Musikmodell, die verlustfreie Migration und der Kerneditor fertiggestellt. Danach können neue MVP-Produktfeatures beginnen, während die restliche Editorparität übertragen wird.

Vor dem Cutover sind vollständige Funktionsparität des vorhandenen Desktop-Editors, eine mobile Übungsansicht mit grundlegenden mobilen Korrekturen, Backup/Restore, responsive Touch- und Accessibility-Abnahme sowie automatisierte Kernabläufe verpflichtend. Eine vollständige mobile Editor-Parität gehört nicht zum MVP. Die Freigabe umfasst Domain-Grenzprüfung, Unit- und Integrationstests, Produktions-Build, Migrationstests mit bestehenden Sicherungen sowie Browser-End-to-End-Tests.

Erst nach diesem Cutover-Gate wird Angular in einem separat freigegebenen Schritt zur einzigen Anwendung. Die Root-Vanilla-Dateien werden dabei entfernt; ein expliziter, datenverlustfreier Rollback-Release muss bereitstehen.

Capacitor wird nicht für den Web-MVP benötigt. Die Angular-App wird jedoch von Anfang an responsiv, touch-tauglich und ohne unnötige Abhängigkeit von reinen Desktop-Browserfunktionen entwickelt.

## Später neu bewerten

- Capacitor-Projekte vor der ersten Store-Testversion
- SQLite nur bei nachgewiesenem Bedarf der nativen App
- native Audiolösung nur, wenn Web Audio die Qualitätsziele auf Zielgeräten nicht erfüllt
- NgRx nur bei einer später belegten Zustandskomplexität
