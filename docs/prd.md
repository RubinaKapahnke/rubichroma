# RubiChroma – Product Requirements Document

**Status:** MVP-Planung  
**Claim:** Color Your Music  
**Führende Quelle:** Dieses Dokument beschreibt Produktvision, MVP-Scope und Validierung. GitHub-Issues beschreiben die konkrete Umsetzung.

**Technische Leitquelle:** [Tech Stack und Architektur](tech-stack.md)

## Product Vision

RubiChroma eröffnet Menschen einen persönlichen, visuellen Zugang zum Instrumentalspiel. Anfänger verbinden Farben, Hören und eigenes Spielen und entwickeln sich in ihrem Tempo vom ersten farbigen Ton zum selbstständig gespielten Stück – zunächst auf der Kalimba, später auf weiteren Instrumenten.

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

- kuratiertes Profil für eine 17-Zungen-Kalimba in C
- wiederverwendbare, liedunabhängige Farbprofile
- Farbwähler und HEX-Eingabe
- lokale Foto-Farbübernahme per Pipette ohne automatische Bilderkennung
- ein Tutorial und zwei rechtlich geprüfte gemeinfreie Stücke
- eigene Lieder und vorhandener Desktop-Editor
- responsive mobile Übungsansicht und grundlegende mobile Korrekturen, aber keine vollständige Editor-Parität
- Töne, Akkorde, Pausen und Taktstriche
- Ganze, Halbe, Viertel, Achtel und Sechzehntel
- eine Taktart und ein Grundtempo pro Lied
- nicht blockierende Warnungen bei falscher Taktfüllung
- synthetischer Kalimba-Klang
- Start, Pause, Stopp, Lautstärke und synchrone Hervorhebung
- block- und tonweise Bereichsauswahl, Loop und relative Übungsgeschwindigkeit
- drei Farbstufen: vollständig, abgeschwächt und ohne Farbe
- lokale Speicherung, Sicherungsimport/-export sowie Druck/PDF
- offline-first und ohne Benutzerkonto

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

## Offene Entscheidungen

- Farbzuordnung primär über physische Zunge/Taste, absolute Tonhöhe oder Tonstufe
- Foto nach dem Speichern verwerfen, lokal behalten oder Wahl anbieten
- endgültige Schreibweise der Marke: „RubiChroma“ oder „Rubichroma“

## Umsetzung

Übergeordnetes MVP-Epic: [#1](https://github.com/RubinaKapahnke/rubichroma/issues/1)

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
