# RubiChroma – Product Requirements Document

**Status:** MVP-Planung  
**Claim:** Color Your Music  
**Führende Quelle:** Dieses Dokument beschreibt Produktvision, MVP-Scope und Validierung. GitHub-Issues beschreiben die konkrete Umsetzung.

**Technische Leitquelle:** [Tech Stack und Architektur](tech-stack.md)

## Product Vision

RubiChroma eröffnet Menschen einen persönlichen, visuellen Zugang zum Instrumentalspiel. Anfänger verbinden Farben, Hören und eigenes Spielen und entwickeln sich in ihrem Tempo vom ersten farbigen Ton zum selbstständig gespielten Stück – zunächst auf der Kalimba, später auf weiteren Instrumenten.

## Product Goal

Bis zum geschlossenen MVP-Piloten ermöglicht RubiChroma Kalimba-Anfängern, ihr persönliches Farbsystem zu übernehmen und einen kurzen unbekannten Abschnitt innerhalb einer Übungssitzung mithilfe von Hören, Tempo, Loop und reduzierbarer Farbhilfe selbstständig zu lernen. Langfristig unterstützt RubiChroma dabei, vollständige Lieder selbstständig zu spielen.

## Produktkern und Abgrenzung

RubiChroma ist zuerst ein personalisierbarer farbbasierter Tab- und Notationseditor mit integriertem Übungsplayer. Nutzer erstellen oder übernehmen eigene Tabs und Notationen, wenden ihr persönliches Farbsystem darauf an und können das Ergebnis ansehen, ausdrucken, abspielen und gezielt üben.

Der zentrale Produktfluss ist:

> **Tab erstellen oder importieren → persönliche Farben anwenden → ansehen oder ausdrucken → abspielen → Tempo und Loop nutzen → üben**

Lernpfade, Übungen und Lernspiele bauen auf diesem Kern auf. Sie erschließen vorhandene Musik gezielter, ersetzen aber weder den Editor noch den freien Player- und Übungsablauf und dürfen diese Kernfunktionen nicht in den Hintergrund drängen.

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

## Übungen und Lernsystem

RubiChroma soll neben dem freien Üben von Tabs und Liedern kurze interaktive Übungen für Anfänger und Fortgeschrittene anbieten. Eine Übung verfolgt ein konkretes musikalisches Lernziel und führt möglichst unmittelbar zum Spielen auf dem Instrument oder zur Anwendung in einem Liedabschnitt.

Der grundlegende Lernkreislauf lautet:

> **Grundlage verstehen → gezielt üben → in einem Lied anwenden**

Übungen bilden kein separates Produkt oder paralleles Musiksystem. Sie verwenden dieselben musikalischen Inhalte, persönlichen Farbsysteme und grundlegenden Player-Funktionen wie Tabs und Lieder.

### Lernzugänge und Lerneinheiten

Das Zielbild verbindet drei Einstiege:

- einen geführten Lernpfad für Nutzer, die Orientierung wünschen
- einen Lied-Einstieg mit passenden Vorübungen für einen konkreten Abschnitt
- einen freien Katalog nach Fähigkeit und Schwierigkeitsgrad

Eine typische kurze Lerneinheit besteht aus drei bis sieben aufeinander abgestimmten Aufgaben und besitzt einen erkennbaren Abschluss. Der erste vollständige Lernsystem-Schnitt soll den Kernkreislauf anhand eines Song-Warm-ups belegen:

1. benötigte Töne und Positionen kennenlernen
2. typische Tonfolge üben
3. Rhythmus üben
4. kurze Folge beziehungsweise ein Begleitmuster spielen
5. das Gelernte im zugehörigen Liedabschnitt anwenden

### Fähigkeiten und wiederverwendbare Lernspiele

Übungen werden nicht nur als Anfänger- oder Fortgeschritteneninhalt eingeordnet, sondern nach konkreten Fähigkeiten und Schwierigkeitsgraden. Trainierbare Fähigkeiten sind insbesondere:

- Orientierung auf dem Instrument
- Zuordnung von Farbe, Zahl, Tonbuchstabe, Notation und Instrumentposition
- Notenlesen und Gehörbildung
- Rhythmus, Tempo und Spielflüssigkeit
- Ton-, Positions- und Oktavwechsel
- Links-/Rechts-Koordination
- Akkorde, Arpeggien und Begleitmuster
- Melodie und Begleitung

Eine begrenzte Anzahl wiederverwendbarer Lernspiel-Typen soll viele Übungen tragen können. Dazu gehören insbesondere Ton oder Position finden, Notation auf das Instrument übertragen, Instrumentposition deuten, gehörten Ton erkennen, Darstellungen zuordnen, Rhythmus reproduzieren, fehlende Elemente ergänzen, Reihenfolgen herstellen, kurze Folgen nachspielen, Muster merken, Song-Warm-ups und die anschließende Anwendung im Lied.

Eine Fähigkeit soll aus mehreren Richtungen trainierbar sein: sehen und erkennen, hören und erkennen, Symbol auf Instrument übertragen, Instrumentposition deuten, Rhythmus reproduzieren, Muster spielen und das Ergebnis im Lied anwenden. Das persönliche RubiChroma-Farbsystem ergänzt dabei die Verbindung **Farbe ↔ Ton ↔ Zahl ↔ Notation ↔ Instrumentposition**.

Die grundlegenden Mechaniken bleiben für unterschiedliche Niveaus gleich. Schwierigkeit entsteht unter anderem durch Tonraum, Sprünge, Oktavwechsel, Rhythmus, Geschwindigkeit, Akkorde, Begleitung und den Umfang sichtbarer Hilfen.

### Inhalte und Wiederholungsvarianten

Die Lernlogik und die musikalischen Kerninhalte werden redaktionell festgelegt. Wiederholungsvarianten dürfen innerhalb dieser festgelegten Regeln automatisch entstehen, damit wiederholtes Üben nicht immer identisch abläuft. Automatische Varianten dürfen das fachliche Lernziel, den vorgesehenen Schwierigkeitsgrad und die instrumentelle Spielbarkeit nicht unbeabsichtigt verändern.

Das musikalische Lernziel wird unabhängig von einem einzelnen Instrument beschrieben und auf kompatible Instrument- und Stimmungsprofile abgebildet. Nicht spielbare Übungen werden für die jeweilige Konfiguration nicht angeboten.

### Feedback, Hilfen und Freiheit

- Eine Antwort erhält unmittelbares, wertungsfreies Feedback. Fehler führen nicht zu verlorenen Leben oder einer Bestrafung.
- Nach einem Fehler kann der Nutzer erneut versuchen, eine Hilfe anfordern oder bewusst überspringen. Keine Aufgabe erzeugt eine Sackgasse.
- Hilfen werden stufenweise angeboten: zunächst ein neutraler Neuversuch, anschließend ein gezielter Hinweis und schließlich Vormachen beziehungsweise Lösung.
- Redaktionell definierte Schwierigkeitsstufen geben die Lernprogression vor. Hilfen und Wiederholungen passen sich innerhalb dieser Stufen an den bisherigen Verlauf an; eine vollständig adaptive Aufgabengenerierung ist dafür nicht erforderlich.
- Inhalte bleiben frei zugänglich. Lernpfad, Voraussetzungen und Song-Bereitschaft erzeugen Empfehlungen, aber keine harten Zugangssperren.
- Farbe ist auch in Lernspielen niemals das einzige Unterscheidungsmerkmal. Zahl, Tonbuchstabe, Notation, Position und geeignete Beschriftungen halten Aufgaben unabhängig von der Farbwahrnehmung verständlich.

### Abschluss, Beherrschung und Song-Bereitschaft

Das Beenden einer Lerneinheit und die Beherrschung einer Fähigkeit sind getrennte Aussagen. Eine Einheit kann abgeschlossen werden, auch wenn Hilfen, Wiederholungen oder Überspringen nötig waren.

Die sichtbaren Beherrschungsstufen lauten:

> **Neu → In Übung → Sicher → Gefestigt**

Die Beherrschung wird aus mehreren Versuchen abgeleitet. Aktuelle und selbstständig gelöste Aufgaben wiegen stärker als ältere Ergebnisse oder Aufgaben mit Hilfen. Ein erreichter sichtbarer Stand wird nach einer Pause nicht künstlich zurückgestuft; stattdessen kann RubiChroma eine gezielte Auffrischung empfehlen.

Fortschritt bleibt nachvollziehbar über drei verbundene Ebenen:

1. Ergebnis einer konkreten Aufgabe
2. daraus abgeleitete Beherrschung konkreter Fähigkeiten
3. daraus abgeleitete Bereitschaft für einen bestimmten Liedabschnitt

Song-Bereitschaft ist keine Prüfung und keine Zugangshürde. Sie erklärt abschnittsbezogen, was bereits sicher gelingt, wo noch Schwierigkeiten bestehen und welche Übungen voraussichtlich helfen. Ein Nutzer darf den Abschnitt oder das vollständige Lied jederzeit trotzdem öffnen und spielen.

### Eingabe und Evidenz

Im ersten Lernsystem-Schnitt liefern Bildschirm-Interaktionen eindeutige, automatisch auswertbare Antworten. Spätere Mikrofon- und MIDI-Erkennung sollen dieselben fachlichen Übungen bewerten können; dabei ändert sich die Eingabequelle, nicht das Lernziel oder die Übungsdefinition.

Reales Spielen kann bis dahin durch den Nutzer selbst eingeschätzt und als Übungsaktivität erfasst werden. Selbst eingeschätzte Aktivität bleibt klar von automatisch gemessener Evidenz unterschieden. Spätere Mikrofon- und MIDI-Daten ergänzen die automatische Evidenz, ohne vorhandene Selbsteinschätzungen umzudeuten.

### Produktstufung des Lernsystems

| Bereich | Erster vollständiger Lernsystem-Schnitt | Langfristiges Zielbild |
|---|---|---|
| Lernbogen | ein vollständiger Song-Warm-up vom Grundelement bis zur Anwendung im Abschnitt | Lernpfad, Lied-Einstieg und freier Fähigkeitskatalog |
| Aufgabenumfang | kurze Einheit mit drei bis sieben zusammenhängenden Bildschirm-Aufgaben | viele Übungen aus wiederverwendbaren Lernspiel-Typen und kontrollierten Varianten |
| Schwierigkeit | redaktionell definierte Stufen mit angepassten Hilfen und Wiederholungen | breiter Fähigkeits- und Schwierigkeitsraum für Anfänger und Fortgeschrittene |
| Eingabe | eindeutig auswertbare Bildschirm-Interaktion und getrennte Selbsteinschätzung realen Spielens | zusätzliche objektive Evidenz über Mikrofon und MIDI |
| Anwendung | unmittelbarer Übergang in den vorbereiteten Liedabschnitt | abschnittsbezogene Empfehlungen und Auffrischungen über viele Lieder und Fähigkeiten |

### Testbare fachliche Anforderungen

- Eine kurze Lerneinheit führt mit drei bis sieben zusammenhängenden Aufgaben von einem benannten Lernziel zu einer erkennbaren Anwendung in einem Liedabschnitt.
- Nach einer falschen Antwort kann der Nutzer erneut versuchen, die nächste Hilfestufe anfordern oder überspringen und die Einheit in jedem Fall fortsetzen.
- Abschluss der Einheit, Beherrschungsstufe der beteiligten Fähigkeiten und Song-Bereitschaft werden getrennt angezeigt und nachvollziehbar miteinander verknüpft.
- Zwei unterschiedliche Aufgaben zum selben Lernziel können als kontrollierte Wiederholungsvarianten erscheinen, ohne Lernziel, Schwierigkeitsgrad oder spielbaren Tonumfang zu verletzen.
- Eine mit Bildschirm-Eingabe bewertete Übung kann später dieselben erwarteten musikalischen Ereignisse über Mikrofon oder MIDI bewerten, ohne eine zweite fachliche Übung zu benötigen.
- Selbst eingeschätztes reales Spielen ist im Verlauf als solches erkennbar und wird nicht als automatisch gemessene Leistung ausgegeben.
- Nach längerer Pause bleibt die erreichte Beherrschungsstufe bestehen; eine Auffrischung wird als Empfehlung angeboten.
- Ein Nutzer kann trotz geringer Song-Bereitschaft jeden Liedabschnitt öffnen und spielen.

### Noch offene Lernsystem-Entscheidungen

- wie kuratierte Lieder und eigene beziehungsweise importierte Tabs jeweils mit Lernwegen und Übungsvorschlägen verbunden werden
- ob schwierige Abschnitte ausschließlich vom Nutzer markiert, zusätzlich von RubiChroma vorgeschlagen oder auf beiden Wegen ausgewählt werden
- welcher Übungsablauf aus einem ausgewählten eigenen Tab-Abschnitt entsteht
- wie eng automatisch vorgeschlagene Warm-ups am konkreten musikalischen Material bleiben
- wie stark Übungen persönliche Farben und andere Hilfen reduzieren dürfen und welche Kontrolle Nutzer dabei behalten
- wie Ergebnisse tabbezogener Übungen zwischen allgemeinem Fähigkeitsfortschritt und konkreter Abschnittsbereitschaft aufgeteilt werden

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

### Gemeinsame Playeroberfläche, Flow und Laufnotation

Der Player ist eine visuell zusammenhängende Oberfläche und kein Dashboard aus vielen gleichgewichtigen Karten. Die aktive Visualisierung bildet die dominante Hauptfläche. Transport, Position, Tempo und Lautstärke stehen in einer kompakten gemeinsamen Steuerleiste; Loop und Mixer bleiben als sekundäre Funktionen platzsparend erreichbar beziehungsweise einklappbar.

Innerhalb desselben Players kann der Visualisierungsbereich zwischen zwei Darstellungen wechseln:

- **Flow:** kommende Ereignisse bewegen sich auf festen Instrumentenspuren von oben nach unten zu einer Anschlaglinie und zum darunter sichtbaren Instrument.
- **Laufnotation beziehungsweise Tab:** farbige Ereignisse bewegen sich von rechts nach links zu einer festen vertikalen Spiellinie ungefähr im vorderen Drittel. Rechts liegt die Vorschau, links bereits Gespieltes.

Beide Darstellungen sind Projektionen derselben Timeline. Ein Wechsel unterbricht die Wiedergabe nicht und verändert weder Position noch Geschwindigkeit, Loop, Farbhilfe oder Ebenenzustand. Auf kleinen Bildschirmen ist immer nur eine Visualisierung sichtbar. Eine gleichzeitige Darstellung kann auf großen Bildschirmen später optional angeboten werden, ist aber weder eigener Navigationsbereich noch Standard.

Der Liedtext läuft in beiden Darstellungen synchron mit derselben Timeline mit. Das aktuell gespielte Wort beziehungsweise Textstück ist eindeutig hervorgehoben; die nächste Textzeile bleibt vorauslesbar und bereits Gespieltes tritt zurück. Der Text gehört zur zusammenhängenden Playeroberfläche und wird nicht als unabhängiger, separat gesteuerter Scroller umgesetzt. Ein Wechsel zwischen Flow und Laufnotation bewahrt Textposition und Hervorhebung.

Für die Laufnotation gilt:

- Die Spiellinie bleibt fest, während die Ereignisse auf sie zulaufen.
- Farbbalken tragen das persönliche RubiChroma-Farbsystem. Kalimba-Zahl und Tonbuchstabe können unabhängig eingeblendet werden; klassische Notensymbole sind eine mögliche spätere Darstellungsoption.
- Die Balkenlänge zeigt die Haltedauer. Gleichzeitig eintreffende Balken bilden einen Akkord.
- Die Kalimba-Zungen bleiben unterhalb der laufenden Ereignisse in ihrer physischen Anordnung sichtbar und reagieren beim Erreichen der Spiellinie.

Für die Kalimba gilt in Flow:

- Alle Zungen des persönlichen Instrumentprofils erscheinen als feste Spuren in exakt der physischen Links-rechts-Anordnung. Sie werden nicht nach Tonhöhe umsortiert.
- Die sichtbaren Zungen sind als Instrumentabbildung eindeutig erkennbar: metallische, unterschiedlich lange Zungen mit kalimbatypischer gerundeter Spielfläche statt gleichförmiger Tasten oder abstrakter Rechtecke.
- Tonbuchstabe und Kalimba-Zahl beziehungsweise Oktavmarkierung stehen wie eine Prägung oder aufgedruckte Instrumentbeschriftung direkt auf der jeweiligen Zunge. Die Beschriftung bleibt auch bei abgeschwächter oder ausgeschalteter Farbhilfe lesbar.
- Im Stück unbenutzte Zungen bleiben zur räumlichen Orientierung sichtbar, aber stark zurückgenommen.
- Der Vorschauzeitraum basiert auf musikalischer statt realer Zeit. Zwei Takte sind der bestätigte Ausgangspunkt; ob weitere Horizonte wählbar werden, ist noch offen.
- Kommende Notenbalken erscheinen oben und laufen nach unten zur festen Anschlaglinie. Die darunter sichtbare Zunge reagiert beim Auftreffen.
- Die Vorderkante eines Notenbalkens markiert den Einsatz, seine Länge in Bewegungsrichtung die Haltedauer und sein Ende das Loslassen.
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

Der Player soll später erkennen können, was ein Nutzer tatsächlich spielt. Mikrofon- und MIDI-Eingaben sowie daraus abgeleitetes Feedback sind nicht Teil des MVP. Das Player- und Timeline-Modell wird jedoch so abgegrenzt, dass diese Eingaben später ergänzt werden können, ohne Wiedergabe, Notation oder Musikmodell auszutauschen. Offen bleiben insbesondere Erkennungsqualität, Live-Modi und die genaue visuelle Rückmeldung; die übergeordneten Lern-, Feedback- und Evidenzprinzipien stehen im Abschnitt **Übungen und Lernsystem**.

### MVP-Schnitt und spätere Ausbaustufen

| Fähigkeit | MVP-Schnitt | Langfristiges Zielbild |
|---|---|---|
| Instrument | kuratiertes Profil für eine 17-Zungen-Kalimba in C | weitere Instrumentprofile auf demselben Musik- und Timeline-Modell |
| Klang | vollständig lokaler synthetischer Kalimba-Klang | austauschbare hochwertige Instrument-Samples |
| Darstellung | synchronisierte Tab-/Laufnotation und aktive Hervorhebung | eine gemeinsame Playeroberfläche mit umschaltbarer Laufnotation und Kalimba-Flow; gleichzeitige Darstellung nur optional |
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
- Die Laufnotation bewegt Ereignisse von rechts nach links zu einer festen Spiellinie; aktive Note, Akkord und Pause bleiben auch bei abgeschwächter oder ausgeschalteter Farbhilfe eindeutig erkennbar.
- Die spätere Flow-Ansicht bewegt Ereignisse von oben nach unten auf die physische Zungenanordnung zu und bildet Einsatz, Haltedauer, Loslassen, Akkorde und Pausen korrekt ab.
- Die Instrumentdarstellung ist ohne zusätzliche Erklärung als 17-Zungen-Kalimba erkennbar; Zungenlängen, Metallcharakter, reale Anordnung und direkt aufgebrachte Ton-/Zahlbeschriftung unterstützen die Zuordnung.
- Der Liedtext läuft synchron mit; aktuelles Wort beziehungsweise Textstück, vorauslesbare nächste Zeile und bereits gespielter Text bleiben zur musikalischen Position passend erkennbar.
- Ein Wechsel zwischen Laufnotation und Flow unterbricht die Wiedergabe nicht und bewahrt Position, Tempo, Loop, Farbhilfe und Ebenenzustand.
- Die Playeroberfläche bleibt als zusammenhängende Einheit erkennbar; sekundäre Loop- und Mixersteuerungen verdrängen die aktive Visualisierung nicht.
- Bei reduzierter Bewegung bleiben Reihenfolge, Annäherung, Zeitpunkt und Dauer in beiden Visualisierungen ohne kontinuierliche Animation verständlich.
- Die spätere Ebenensteuerung kann Melodie und Begleitung unabhängig stummschalten, regeln und solo wiedergeben, ohne die gemeinsame Timeline zu verlassen.

### Noch offene Player-Entscheidungen

- Unter- und Obergrenze sowie Schrittweite der relativen Übungsgeschwindigkeit
- feste oder wählbare Flow-Horizonte über den bestätigten Zwei-Takt-Ausgangspunkt hinaus
- genaue Rasterung und ein möglicher Feinmodus für Loop-Grenzen
- genaue Länge und Konfigurierbarkeit des späteren Einzählers
- spätere Erkennungsmodi, etwa kontinuierliches Live-Feedback oder ein Modus **Warte auf mich**, sowie Form und Umfang der Rückmeldung
- Auswahl, Qualitätsziel, Lizenzierung und Ladeverhalten späterer Instrument-Samples
- genaue responsive Anordnung der Player-Bedienelemente sowie Vollbild- oder Querformatführung für Flow auf schmalen Geräten
- ob klassische Notensymbole zusätzlich zu farbigen Balken, Zahl und Tonbuchstabe angeboten werden
- ob eine gleichzeitige Darstellung von Laufnotation und Flow auf großen Bildschirmen langfristig einen eigenen Mehrwert bietet

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
