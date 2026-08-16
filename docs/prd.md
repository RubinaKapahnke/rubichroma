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
