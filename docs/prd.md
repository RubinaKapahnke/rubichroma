# RubiChroma – Product Requirements Document

**Status:** MVP-Planung  
**Claim:** Color Your Music  
**Führende Quelle:** Dieses Dokument beschreibt Produktvision, MVP-Scope und Validierung. GitHub-Issues beschreiben die konkrete Umsetzung.

**Technische Leitquelle:** [Tech Stack und Architektur](tech-stack.md)

## Product Vision

RubiChroma eröffnet Menschen einen persönlichen, visuellen Zugang zum Instrumentalspiel. Anfänger verbinden Farben, Hören und eigenes Spielen und entwickeln sich in ihrem Tempo vom ersten farbigen Ton zum selbstständig gespielten Stück – zunächst auf der Kalimba, später auf weiteren Instrumenten.

## Product Goal

Bis zum geschlossenen MVP-Piloten ermöglicht RubiChroma Kalimba-Anfängern, ihr persönliches Farbsystem zu übernehmen und einen kurzen unbekannten Abschnitt innerhalb einer Übungssitzung mithilfe von Hören, Tempo, Loop und reduzierbarer Farbhilfe selbstständig zu lernen. Langfristig unterstützt RubiChroma dabei, vollständige Lieder selbstständig zu spielen.

## Zielgruppe

Primär selbstlernende Anfänger. Lehrkräfte und Musikpädagogen sind eine sekundäre Zielgruppe.

## MVP-Hypothese

Ein Kalimba-Anfänger kann sein vorhandenes oder persönliches Farbsystem in RubiChroma übernehmen und damit nach einer Übungssitzung einen kurzen, zuvor unbekannten Abschnitt selbstständig spielen.

## Kernablauf

1. Tutorialstück oder eigenes Lied wählen.
2. Farben manuell einrichten oder aus einem Foto übernehmen.
3. Kurzen Abschnitt ansehen und anhören.
4. Schwierige Stelle block- oder tonweise markieren.
5. Tempo reduzieren und den Bereich wiederholen.
6. Farbhilfe vollständig, abgeschwächt oder ohne Farbe anzeigen.
7. Abschnitt ohne laufende Wiedergabe selbst spielen.

## MVP-Scope

- kuratiertes Instrument- und Stimmungsprofil für eine 17-Zungen-Kalimba in C
- wiederverwendbare, liedunabhängige Farbprofile je Instrument und Stimmung; eine andere Stimmung benötigt eine neu festgelegte Farbskala
- eigenständige, kontrastgeprüfte RubiChroma-Startpalette ohne übernommene externe Produktfarbwerte
- Farbwähler und HEX-Eingabe
- lokale Foto-Farbübernahme per Pipette ohne automatische Bilderkennung; Nutzer entscheiden über die lokale Aufbewahrung, Standard ist Verwerfen
- ein Tutorial und zwei rechtlich geprüfte gemeinfreie Stücke
- eigene Lieder und vollständige Funktionsübernahme des vorhandenen Desktop-Editors
- responsive mobile Übungsansicht und grundlegende mobile Korrekturen, aber keine vollständige Editor-Parität
- Töne, Akkorde, Pausen und Taktstriche
- Ganze, Halbe, Viertel, Achtel und Sechzehntel
- eine Taktart und ein Grundtempo pro Lied
- nicht blockierende Warnungen bei falscher Taktfüllung
- synthetischer Kalimba-Klang
- Start, Pause, Stopp, Lautstärke und synchrone Hervorhebung
- block- und tonweise Bereichsauswahl, Loop und relative Übungsgeschwindigkeit
- drei Farbstufen: vollständig, abgeschwächt und ohne Farbe
- lokale Speicherung, Sicherungsimport/-export sowie Browserdruck/A4-PDF
- offline-first und ohne Benutzerkonto
- deutsche MVP-Oberfläche mit technischer Vorbereitung für weitere Sprachen
- Light und Dark Mode mit manuellem Umschalter; beim ersten Start gilt die Systemeinstellung, danach die lokal gespeicherte Auswahl

## Nicht im MVP

- weitere Instrumente
- vollständiger mobiler Noteneditor
- Konten, Cloud-Synchronisierung, Cloud-Datenspeicherung oder Teilen
- öffentliche Songbibliothek
- automatische Instrument-, Sticker-, Tasten- oder Tonerkennung
- Mikrofonanalyse und automatische Spielbewertung
- Metronom und Einzählen
- punktierte Noten, Triolen sowie Takt- oder Tempowechsel
- realistische Samples und Audioexport
- öffentliche Beta

## Langfristiges Player-Zielbild

Der RubiChroma Player verbindet Hören, Sehen, Vorauslesen, Wiederholen und Mitspielen in einer gemeinsamen Übungsoberfläche. Sein primärer Nutzen ist geführtes Mitspielen und gezieltes Üben; das reine Anhören und visuelle Nachvollziehen eines Stücks ist darin enthalten.

Für die Produktplanung gilt:

> **Nicht das Zielbild verkleinern, sondern nur die Release-Zuordnung staffeln.**

Der erste fachliche Schwerpunkt bleibt die Kalimba. Musikmodell, Timeline und Playerzustand dürfen jedoch nicht voraussetzen, dass dauerhaft nur eine Kalimba oder nur eine musikalische Ebene unterstützt wird.

### Wiedergabe und Übungssteuerung

- Start beziehungsweise Fortsetzen beginnt an der aktuellen Position, Pause bewahrt sie.
- Stopp setzt die Position bei aktivem Loop an dessen Anfang, sonst an den Stückanfang zurück.
- Am regulären Stückende bleibt die Position stehen; eine klar erkennbare Aktion **Wiederholen** startet erneut. Es gibt keinen automatischen Neustart.
- Lautstärke und aktuelle Position sind jederzeit sichtbar beziehungsweise steuerbar.
- Jedes Stück besitzt ein festgelegtes Originaltempo. Nutzer verändern davon getrennt die relative Übungsgeschwindigkeit über typische Schnellwerte wie 50 %, 75 % und 100 % sowie einen freien Regler.
- Eine Geschwindigkeitsänderung wirkt während laufender Wiedergabe ohne Positionsverlust; bereits klingende und neu geplante Ereignisse bleiben musikalisch sauber.
- Notenlängen, Pausen und gleichzeitig klingende Töne beziehungsweise Akkorde werden korrekt wiedergegeben.
- Mehrere musikalische Ebenen wie Melodie und Begleitung gehören zum Zielbild. Sie lassen sich später einzeln ein- und ausschalten, in der Lautstärke regeln und solo schalten.
- Ein späteres Metronom ist optional, lautstärkeregelbar und an Tempo und Loop gekoppelt.
- Ein späterer Einzähler ist optional und für normalen Start sowie Loop-Wiederholungen getrennt steuerbar. Während des Einzählers bleibt die visuelle Vorschau aktiv und läuft sichtbar auf den Einsatz zu.

### Gemeinsame Timeline und Navigation

Audio und alle Visualisierungen beziehen sich auf dieselbe musikalische Timeline. Sie steuert Wiedergabeposition, aktives Ereignis, Tempo, Pause und Fortsetzen, Sprünge sowie Loop-Grenzen; spätere Flow-, Metronom-, Einzähl- und Mehrspur-Funktionen werden an dieselbe Grundlage angebunden.

- Grobes Springen ist über eine Timeline möglich, präzises Springen durch Auswahl einer Note beziehungsweise eines Flow-Elements.
- Ein Sprung während der Wiedergabe setzt die Wiedergabe unmittelbar an der neuen Position fort. Im pausierten Zustand bleibt der Player nach dem Sprung pausiert.
- Die Notationsansicht folgt kontinuierlich. Die aktuelle Note liegt dabei ungefähr im vorderen Drittel des sichtbaren Bereichs, damit kommende Ereignisse vorausgelesen werden können.
- Vorhandene Liedtexte beziehungsweise Silben können optional synchron bei der zugehörigen Notation angezeigt werden.

### Bereichsauswahl und Loop

- Ein zusammenhängender Bereich kann von einer einzelnen Note bis zu einem größeren musikalischen Abschnitt reichen.
- Nutzer können erste und letzte Note auswählen oder denselben Bereich mit zwei Griffen auf der Timeline einstellen. Beide Bedienwege bearbeiten dieselbe Auswahl.
- Die Loop-Wiedergabe wiederholt den gewählten Bereich und bleibt mit Geschwindigkeit, Lautstärke, Metronom und späteren Ebenensteuerungen kombinierbar.
- Loop-Auswahl und zugehörige Einstellungen bleiben pro Stück gespeichert. Beim erneuten Öffnen ist der gespeicherte Loop zunächst deaktiviert, damit keine unerwartete Wiederholung startet.
- Die genaue Rasterung der Loop-Grenzen ist noch offen. Beabsichtigt ist, ausgewählte musikalische Ereignisse einschließlich ihrer vollständigen Dauer eindeutig wiederzugeben.

### Notation, Flow und Hybrid

Der vollständige Player bietet drei jederzeit wechselbare Ansichten:

- **Notation:** synchronisierte RubiChroma-Notation mit Hervorhebung der aktuell klingenden Note beziehungsweise des Akkords
- **Flow:** kommende Ereignisse bewegen sich entlang fester Instrumentenspuren auf ihren Spielzeitpunkt zu
- **Hybrid:** Notation und Flow sind gleichzeitig sichtbar

Auf großen Bildschirmen ist Hybrid die bevorzugte Ausgangsansicht; die zuletzt gewählte Ansicht wird respektiert. Auf kleinen Bildschirmen ist jeweils nur Notation oder Flow sichtbar und direkt umschaltbar, damit beide Darstellungen spielbar und lesbar bleiben.

Für die Kalimba gilt in Flow:

- Alle Zungen des persönlichen Instrumentprofils erscheinen als feste Spuren in exakt der physischen Links-rechts-Anordnung. Sie werden nicht nach Tonhöhe umsortiert.
- Im Stück unbenutzte Zungen bleiben zur räumlichen Orientierung sichtbar, aber stark zurückgenommen.
- Der Vorschauzeitraum basiert auf musikalischer statt realer Zeit. Zwei Takte sind der bestätigte Ausgangspunkt; ob weitere Horizonte wählbar werden, ist noch offen.
- Die Vorderkante eines Notenbalkens markiert den Einsatz, seine Länge die Haltedauer und sein Ende das Loslassen.
- Akkorde werden durch gleichzeitiges Eintreffen und eine dezente visuelle Gruppierung als Einheit kenntlich, ohne die Instrumentenspuren zu verwischen.
- Pausen erscheinen primär als zeitliche Lücke und bei ausreichendem Platz zusätzlich mit einem dezenten Pausensymbol.
- Kalimba-Zahl und Tonbuchstabe lassen sich unabhängig voneinander ein- und ausschalten.

### Farbhilfe, persönliche Einstellungen und Zugänglichkeit

- Die Darstellung verwendet das aktive persönliche RubiChroma-Farbsystem.
- Die Farbhilfe kann vollständig, abgeschwächt oder ohne Farbe angezeigt werden.
- Farbe ist niemals das einzige Unterscheidungsmerkmal. Spur, Position, Beschriftung, Form und Hervorhebung machen auch ohne Farbe eindeutig, welche Zunge wann und wie lange gespielt wird.
- Ansicht, Übungsgeschwindigkeit, Farbhilfe, Mixerzustand und Loop-Auswahl werden pro Stück gespeichert.
- Metronom-Lautstärke und allgemeine Player-Präferenzen werden global gespeichert.
- Bei aktivierter Systemeinstellung für reduzierte Bewegung ersetzt eine ruhige, schrittweise aktualisierte Vorschau die kontinuierliche Flow-Animation. Reihenfolge, Zeitpunkt und Dauer bleiben erkennbar.

### Zukünftige Spielerkennung

Der Player soll später erkennen können, was ein Nutzer tatsächlich spielt. Mikrofon- und MIDI-Eingaben sowie daraus abgeleitetes Feedback sind nicht Teil des MVP. Das Player- und Timeline-Modell wird jedoch so abgegrenzt, dass diese Eingaben später ergänzt werden können, ohne Wiedergabe, Notation oder Musikmodell auszutauschen. Die späteren Übungsmodi und die genaue Form des Feedbacks sind noch offen.

### MVP-Schnitt und spätere Ausbaustufen

| Fähigkeit | MVP-Schnitt | Langfristiges Zielbild |
|---|---|---|
| Instrument | kuratiertes Profil für eine 17-Zungen-Kalimba in C | weitere Instrumentprofile auf demselben Musik- und Timeline-Modell |
| Klang | vollständig lokaler synthetischer Kalimba-Klang | austauschbare hochwertige Instrument-Samples |
| Darstellung | synchronisierte Notation und aktive Hervorhebung | Notation, Flow und Hybrid |
| Transport | Start, Pause, Stopp, Lautstärke und sichtbare Position | zusätzlich erweiterte Navigation und persönliche Ansichtspräferenzen |
| Üben | Bereich, Loop und relative Übungsgeschwindigkeit | zusätzlich Metronom und getrennt steuerbarer Einzähler |
| Ebenen | mehrere Ebenen im Datenmodell vorbereitet, zunächst ohne vollständigen Mixer | Ein/Aus, Lautstärke und Solo je Ebene |
| Spielerkennung | keine Mikrofon-, MIDI- oder Bewertungsfunktion | trennbare Eingabe und sachliches Feedback für gespielte Ereignisse |

### Testbare Player-Anforderungen

Die folgenden Nutzerabläufe bilden den fachlichen Abnahmevertrag, jeweils soweit die zugehörige Ausbaustufe umgesetzt ist:

- Ein Stück mit Tönen, Akkorden, Pausen und unterschiedlichen Dauern bleibt über Start, Pause, Fortsetzen, Tempoänderung und Stopp hör- und sichtbar synchron.
- Eine Änderung der Übungsgeschwindigkeit verändert weder Originaltempo noch Lieddaten und verliert die aktuelle musikalische Position nicht.
- Ein Nutzer springt während laufender beziehungsweise pausierter Wiedergabe über Timeline und Note; der Player behält den vorherigen Wiedergabestatus bei.
- Derselbe Bereich lässt sich über Notenauswahl und Timeline-Griffe einstellen. Mehrere Loop-Durchläufe bleiben ohne zeitliche Drift und spielen kein Ereignis außerhalb der Auswahl an.
- Nach erneutem Öffnen sind die bestätigten stückbezogenen Einstellungen und der letzte Loop-Bereich vorhanden, der Loop läuft aber nicht automatisch an.
- Die aktuelle Notation bleibt vorauslesbar; aktive Note, Akkord und Pause sind auch bei abgeschwächter oder ausgeschalteter Farbhilfe eindeutig erkennbar.
- Die spätere Flow-Ansicht bildet physische Zungenanordnung, Einsatz, Haltedauer, Loslassen, Akkorde und Pausen korrekt ab und bleibt bei reduzierter Bewegung vollständig verständlich.
- Die spätere Ebenensteuerung kann Melodie und Begleitung unabhängig stummschalten, regeln und solo wiedergeben, ohne die gemeinsame Timeline zu verlassen.

### Noch offene Player-Entscheidungen

- Unter- und Obergrenze sowie Schrittweite der relativen Übungsgeschwindigkeit
- feste oder wählbare Flow-Horizonte über den bestätigten Zwei-Takt-Ausgangspunkt hinaus
- genaue Rasterung und ein möglicher Feinmodus für Loop-Grenzen
- genaue Länge und Konfigurierbarkeit des späteren Einzählers
- spätere Erkennungsmodi, etwa kontinuierliches Live-Feedback oder ein Modus **Warte auf mich**, sowie Form und Umfang der Rückmeldung
- Auswahl, Qualitätsziel, Lizenzierung und Ladeverhalten späterer Instrument-Samples
- genaue visuelle und responsive Anordnung der Player-Bedienelemente

## Roadmap

### Phase 0: sichere Ablösung der bestehenden App

Phase 0 bleibt bis zum Cutover ein paralleler Migrationsstrang. Neue MVP-Produktfeatures beginnen nach dem ersten Kerngate; die vollständige Parität ist spätestens vor der Abschaltung der Alt-App erforderlich.

1. Funktionsinventur der Vanilla-App und festgehaltene Paritätsentscheidung für jeden Kernablauf.
2. **Kerngate:** strukturierte Musikereignisse als einzige semantische Quelle, verlustfreie Legacy-Migration und übernommener Kerneditor. Legacy-Notation bleibt ausschließlich eine fingerprint-gebundene Kompatibilitätshülle.
3. Nach dem Kerngate folgen die neuen MVP-Produktfeatures; parallel werden die restlichen vorhandenen Editorfunktionen übertragen.
4. **Cutover-Gate:** vollständige Desktop-Parität sowie mobile Übungsansicht und grundlegende mobile Korrekturen sind geprüft. Eine vollständige mobile Editor-Parität ist nicht erforderlich.
5. Sicherungsexport und Wiederherstellung sind verlustfrei getestet; unbekannte Felder und unveränderte Legacy-Notation bleiben exakt erhalten.
6. Kernabläufe sind durch Unit-, Integrations- und Browser-Tests sowie responsive, Touch-, Tastatur- und Accessibility-Abnahmen abgesichert.
7. Angular wird erst nach erfülltem Cutover-Gate zur einzigen Anwendung. Die Root-Vanilla-Dateien werden im selben, separat freigegebenen Schritt entfernt; ein datenverlustfreier Rollback-Release liegt bereit.

### Produkt-Roadmap nach dem Kerngate

1. Farbprofile und Foto-Pipette
2. rhythmisches Datenmodell, Takt und Tempo
3. Kalimba-Wiedergabe und Hervorhebung
4. Bereich, Loop, Übungsgeschwindigkeit und Farbstufen
5. Tutorial, zwei Transferstücke und geschlossener Pilot

## MVP-Erfolg

Pilot mit 8–12 Kalimba-Anfängern und zwei Lehrkräften.

- mindestens 80 % bewältigen den Kernablauf ohne direkte Hilfe
- mindestens 70 % können den geübten Abschnitt anschließend nachvollziehbar spielen
- mindestens 80 % verstehen Tempo, Loop und Farbstufen
- ein vorhandenes Farbsystem kann erfolgreich per Foto übernommen werden
- keine kritischen Speicher- oder Importverluste
- beide Lehrkräfte bewerten Ausdruck und Notation als praktisch nutzbar

## Festgelegte Produktentscheidungen

- Verbindliche Schreibweise ist **RubiChroma**, der Claim lautet **Color Your Music**.
- Farbprofile gehören zu genau einem Instrument- und Stimmungsprofil. Physische Zunge beziehungsweise Taste, Tonhöhe und Tonstufe werden gemeinsam referenzierbar gespeichert; eine neue Stimmung erhält eine neu festgelegte Farbskala.
- Nutzer entscheiden, ob ein für die Pipette verwendetes Foto lokal erhalten bleibt. Standard ist das Verwerfen nach der Farbübernahme.
- Der geschlossene Pilot verwendet die deutsche Oberfläche. Weitere Sprachen werden technisch vorbereitet, gehören aber nicht zum MVP-Inhaltsumfang.
- Symbolmarke und endgültiges App-Icon sind vor der ersten Store-Testversion erforderlich, nicht vor dem geschlossenen Pilot.
- Marken-, Claim- und Rechteprüfung sind Gates vor öffentlicher Beta oder Store-Veröffentlichung.

## Umsetzung

Übergeordnetes MVP-Epic: [#1](https://github.com/RubinaKapahnke/rubichroma/issues/1)

- [#15 Angular-Grundstruktur, Migrationsparität und Cutover](https://github.com/RubinaKapahnke/rubichroma/issues/15)
- [#3 Rhythmisches Daten- und Notationsmodell](https://github.com/RubinaKapahnke/rubichroma/issues/3)
- [#4 Taktart und Liedtempo](https://github.com/RubinaKapahnke/rubichroma/issues/4)
- [#2 Taktfüllung und Auftakt](https://github.com/RubinaKapahnke/rubichroma/issues/2)
- [#8 Kalimba-Klang und Audio-Scheduling](https://github.com/RubinaKapahnke/rubichroma/issues/8)
- [#5 Player und Hervorhebung](https://github.com/RubinaKapahnke/rubichroma/issues/5)
- [#6 Bereich, Loop und Übungsgeschwindigkeit](https://github.com/RubinaKapahnke/rubichroma/issues/6)
- [#7 Migration und Tests](https://github.com/RubinaKapahnke/rubichroma/issues/7)
- [#9 Wiederverwendbare Farbprofile](https://github.com/RubinaKapahnke/rubichroma/issues/9)
- [#10 Foto und Pipette](https://github.com/RubinaKapahnke/rubichroma/issues/10)
- [#11 Farbhilfe in drei Stufen](https://github.com/RubinaKapahnke/rubichroma/issues/11)
- [#12 MVP-Onboarding und Startstücke](https://github.com/RubinaKapahnke/rubichroma/issues/12)
- [#13 Geschlossener MVP-Pilot](https://github.com/RubinaKapahnke/rubichroma/issues/13)
