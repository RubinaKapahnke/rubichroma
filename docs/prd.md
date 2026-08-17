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
- Klick beziehungsweise Tippen auf eine freie, nicht-interaktive Fläche innerhalb des Players schaltet zwischen Wiedergabe und Pause um. Interaktive Bedienelemente behalten ihre eigene Funktion und lösen keinen zusätzlichen Wechsel durch Event-Bubbling aus.
- Die Leertaste schaltet ebenfalls zwischen Wiedergabe und Pause um, sofern der Fokus nicht in einem Eingabe-, Auswahl- oder anderen die Leertaste selbst verwendenden interaktiven Element liegt. Greift der Player-Shortcut, wird das standardmäßige Scrollen verhindert.
- Stopp setzt die Position bei aktivem Loop an dessen Anfang, sonst an den Stückanfang zurück.
- Am regulären Stückende bleibt die Position stehen; eine klar erkennbare Aktion **Wiederholen** startet erneut. Es gibt keinen automatischen Neustart.
- Lautstärke und aktuelle Position sind jederzeit sichtbar beziehungsweise steuerbar.
- Jedes Stück besitzt ein festgelegtes Originaltempo. Nutzer verändern davon getrennt die Übungsgeschwindigkeit über Presets und einen freien Regler. Anzeige und Eingabe lassen sich zwischen BPM und Prozent des Originaltempos umschalten; beim Öffnen ist BPM der Standard. Aktueller Wert, Presets und Regler sind in der gewählten Einheit eindeutig beschriftet.
- Der Einheitenwechsel rechnet nur die Darstellung und Eingabewerte um. Eine kanonische interne Tempodarstellung verhindert, dass Rundung beim wiederholten Wechsel zwischen BPM und Prozent die reale Wiedergabegeschwindigkeit schleichend verändert.
- Eine Geschwindigkeitsänderung wirkt während laufender Wiedergabe ohne Positionsverlust; bereits klingende und neu geplante Ereignisse bleiben musikalisch sauber.
- Notenlängen, Pausen und gleichzeitig klingende Töne beziehungsweise Akkorde werden korrekt wiedergegeben.
- Mehrere musikalische Ebenen wie Melodie und Begleitung gehören zum Zielbild. Der Mixer bietet je Spur ausschließlich Ein/Aus; spurbezogene Lautstärkeregler und eine Solo-Funktion sind nicht vorgesehen. Die Gesamtlautstärke bleibt davon getrennt steuerbar.
- Ein Metronom lässt sich im Player unabhängig von Melodie und Begleitung ein- und ausschalten und ist beim Öffnen zunächst aus. Es folgt exakt dem kanonischen aktuellen Wiedergabetempo, akzentuiert den ersten Schlag jedes Taktes und bleibt bei Start, Pause, Fortsetzen, Stopp, Sprüngen sowie Loop-Grenzen taktsynchron. Ein Umschalten während der Wiedergabe erzeugt keinen Versatz. Separate Metronomlautstärke und Einzähler gehören nicht zu diesem aktuellen Umfang.
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
- Der Loop lässt sich frei über einen Start- und Endtakt festlegen, beispielsweise **Von Takt 1 bis Takt 4**. Start und Ende müssen existierende Takte bezeichnen, der Start darf nicht hinter dem Ende liegen und der aktive Bereich wird verständlich angezeigt. Vordefinierte Übungsabschnitte können zusätzlich angeboten werden, ersetzen diese freie Taktwahl aber nicht.
- Loop-Auswahl und zugehörige Einstellungen bleiben pro Stück gespeichert. Beim erneuten Öffnen ist der gespeicherte Loop zunächst deaktiviert, damit keine unerwartete Wiederholung startet.
- Die genaue Rasterung der Loop-Grenzen ist noch offen. Beabsichtigt ist, ausgewählte musikalische Ereignisse einschließlich ihrer vollständigen Dauer eindeutig wiederzugeben.

### Gemeinsame Playeroberfläche, Flow und Laufnotation

Der Player ist eine visuell zusammenhängende Oberfläche und kein Dashboard aus vielen gleichgewichtigen Karten. Die aktive Visualisierung bildet die dominante Hauptfläche. Transport, Position, Tempo und Lautstärke stehen in einer kompakten gemeinsamen Steuerleiste; Loop und Mixer bleiben als sekundäre Funktionen platzsparend erreichbar beziehungsweise einklappbar.

Innerhalb desselben Players kann der Visualisierungsbereich zwischen zwei Darstellungen wechseln:

- **Flow:** kommende Ereignisse bewegen sich auf festen Instrumentenspuren von oben nach unten zu einer Anschlaglinie und zum darunter sichtbaren Instrument.
- **Laufnotation beziehungsweise Tab:** farbige Ereignisse bewegen sich von rechts nach links zu einer festen vertikalen Spiellinie ungefähr im vorderen Drittel. Rechts liegt die Vorschau, links bereits Gespieltes.

Beide Darstellungen sind Projektionen derselben Timeline. Ein Wechsel unterbricht die Wiedergabe nicht und verändert weder Position noch Geschwindigkeit, Loop, Farbhilfe oder Ebenenzustand. Auf kleinen Bildschirmen ist immer nur eine Visualisierung sichtbar. Eine gleichzeitige Darstellung kann auf großen Bildschirmen später optional angeboten werden, ist aber weder eigener Navigationsbereich noch Standard.

Der Liedtext läuft in beiden Darstellungen synchron mit derselben Timeline mit. Vor dem synchronen Text zeigt der Player die aktuelle Taktangabe aus derselben Taktzählung wie Loop und Notenblatt. Für den gesamten musikalischen Verlauf sind die tatsächlich zum Stück gehörenden vollständigen Textzeilen hinterlegt und zeitlich passend zugeordnet; frühere Zeilen werden nicht als Platzhalter für fehlenden späteren Text wiederholt, und instrumentale Abschnitte erhalten keinen künstlichen Text. Der Text wird in musikalisch passende Silben segmentiert und jede Silbe eindeutig einem zugehörigen Musikereignis beziehungsweise Zeitabschnitt zugeordnet. Ausschließlich die aktuell gesungene oder gespielte Silbe ist aktiv hervorgehoben; weder das ganze Wort oder die ganze Zeile noch bereits gespielte Silben bleiben gleichzeitig aktiv. Beim nächsten Silbenereignis endet die vorherige Hervorhebung zuverlässig, in Pausen ist keine vergangene Silbe aktiv. Die nächste Textzeile bleibt vorauslesbar und bereits Gespieltes tritt zurück. Der Text gehört zur zusammenhängenden Playeroberfläche und wird nicht als unabhängiger, separat gesteuerter Scroller umgesetzt. Ein Wechsel zwischen Flow und Laufnotation bewahrt Textposition und Hervorhebung.

Unterhalb des Players steht zusätzlich ein vollständiges Notenblatt für das gesamte Lied. Es projiziert dieselben Editor-/Tabdaten in unveränderter musikalischer Reihenfolge: Die zu einer Silbe oder Textstelle gehörenden Töne und Akkorde stehen unmittelbar darüber; es existiert keine separat gepflegte Playerfassung. Setzt sich ein Wort in einer weiteren Silbe fort, steht direkt nach jeder nicht letzten Silbe ein Bindestrich; die letzte Silbe erhält keinen Fortsetzungsbindestrich und trägt gegebenenfalls das Satzzeichen. Das gilt auch über getrennte Noten- oder Ereignisfelder hinweg. Der Bindestrich gehört nur zur sichtbaren Silbenschreibweise und erzeugt weder eine eigene Liedposition noch ein eigenes Klickziel. Sichtbare Taktzahlen und Taktgrenzen verwenden dieselbe Zählung wie Wiedergabeposition, laufender Text und Loop-Auswahl. Klick beziehungsweise Tippen auf eine Silbe oder Textstelle springt die gemeinsame Timeline exakt zum zugehörigen Ereignis und aktualisiert Transport, Flow oder Laufnotation, Zungenmarkierung und aktive Silbe gemeinsam. Während der Wiedergabe wird das Notenblatt automatisch nach oben nachgeführt, sodass die exklusiv aktive Silbe im sichtbaren Bereich bleibt; ein expliziter Sprung führt auch die Scrollposition unmittelbar passend nach. Das Notenblatt bleibt auf Desktop vollständig nutzbar und wird auf Mobilgeräten responsiv dargestellt, ohne die Seite horizontal zu verbreitern.

Als späterer Ausbau kann eine ausgewählte Stelle des Notenblatts den Editor direkt an der entsprechenden Lied-/Notenposition öffnen. Diese Rücknavigation gehört nicht zum aktuellen Playerumfang.

Für die Laufnotation gilt:

- Die Spiellinie bleibt fest, während die Ereignisse auf sie zulaufen.
- Farbbalken tragen das persönliche RubiChroma-Farbsystem. Kalimba-Zahl und Tonbuchstabe können unabhängig eingeblendet werden; klassische Notensymbole sind eine mögliche spätere Darstellungsoption.
- Die Balkenlänge zeigt die Haltedauer. Gleichzeitig eintreffende Balken bilden einen Akkord.
- Die Kalimba-Zungen bleiben unterhalb der laufenden Ereignisse in ihrer physischen Anordnung sichtbar und reagieren beim Erreichen der Spiellinie.

Für die Kalimba gilt in Flow:

- Alle Zungen des persönlichen Instrumentprofils erscheinen als feste Spuren in exakt der physischen Links-rechts-Anordnung. Sie werden nicht nach Tonhöhe umsortiert.
- Die 17 Fallspuren, die Ziel- beziehungsweise Jetzt-Linie und die 17 sichtbaren Zungen verwenden eine gemeinsame responsive Geometrie- und Positionsquelle. Die Mittellinie jedes Notenbalkens trifft auf die Mitte der Zunge desselben Tons; diese Zuordnung bleibt auf Desktop, Mobilgeräten und nach Größenänderungen stabil.
- Der Holzkorpus liegt mit realistisch schmalen Seitenrändern eng um die 17 Zungen. Die Zungen werden weder künstlich auseinandergezogen noch unabhängig von den Fallspuren skaliert.
- Die sichtbaren Zungen sind als Instrumentabbildung eindeutig erkennbar: metallische, unterschiedlich lange und eher schlanke Zungen mit kalimbatypischer Form statt kurzer breiter Tasten oder abstrakter Rechtecke. Das oben eingespannte Ende ist gerade; das unten liegende freie Spielende ist nur moderat abgerundet und wirkt nicht pillenförmig.
- In der kompakten Playerdarstellung wird kein dekorativer Steg gezeigt, wenn er wegen der verfügbaren Größe nicht mit glaubwürdiger Position und Proportion dargestellt werden kann.
- Tonbuchstabe und Kalimba-Zahl beziehungsweise Oktavmarkierung stehen wie eine Prägung oder aufgedruckte Instrumentbeschriftung direkt auf der jeweiligen Zunge. Die Beschriftung bleibt auch bei abgeschwächter oder ausgeschalteter Farbhilfe lesbar.
- Oktavlagen werden ausschließlich auf der physischen Zungenbeschriftung wie beim realen Instrument durch Punkte an der Ziffer dargestellt: Grundoktave ohne Punkt, höhere Oktaven mit einem beziehungsweise zwei Punkten oberhalb und gegebenenfalls tiefere Oktaven mit entsprechenden Punkten unterhalb. Diese Darstellungsregel ändert nicht die separat festgelegte Textnotation und Eingabekompatibilität außerhalb der Zungenabbildung.
- Im Stück unbenutzte Zungen bleiben zur räumlichen Orientierung sichtbar, aber stark zurückgenommen.
- Die aktuell zu spielende Zunge wird kräftig hervorgehoben; die Zunge des nächsten Ereignisses wird gleichzeitig schwächer vorangekündigt. Vorschau und aktive Markierung bleiben auch ohne Farbe durch mindestens ein weiteres Merkmal unterscheidbar.
- Die kräftige Hervorhebung ist an den Einsatz und eine fachlich sinnvolle kurze sichtbare Dauer des aktuellen Ereignisses gebunden und verschwindet danach zuverlässig. Jedes neue Ereignis löst auf seiner Zunge einen klar erkennbaren neuen Impuls aus, auch wenn dieselbe Zunge unmittelbar zuvor bereits durch einen Akkord oder ein anderes Ereignis markiert war.
- Jede physische Zunge wird bei Darstellung und Klang monophon behandelt. Beginnt auf derselben Zunge ein neues Ereignis, endet der zuvor aktive Balken exakt an diesem Anschlagszeitpunkt und der neue Einsatz startet als eigener Impuls ohne grafische Überlagerung. Entsprechend retriggert oder ersetzt der neue Anschlag die laufende Stimme derselben Zunge, statt zwei unabhängige Stimmen zu stapeln; Ausklänge anderer Zungen dürfen parallel weiterlaufen. Diese Regel gilt auch für den Übergang von Akkord- oder Arpeggioton zu einer unmittelbar folgenden Melodienote.
- Der Vorschauzeitraum basiert auf musikalischer statt realer Zeit und ist auf 1, 2 oder 4 Takte einstellbar; beim Öffnen sind 2 Takte der Standard.
- Kommende Notenbalken erscheinen oben und laufen nach unten zur festen Anschlaglinie. Die darunter sichtbare Zunge reagiert beim Auftreffen.
- Die Vorderkante eines Notenbalkens markiert den Einsatz, seine Länge in Bewegungsrichtung die Haltedauer und sein Ende das Loslassen.
- Akkorde werden durch gleichzeitiges Eintreffen und eine dezente visuelle Gruppierung als Einheit kenntlich, ohne die Instrumentenspuren zu verwischen.
- Arpeggien bestehen dagegen aus zeitlich nacheinander eintreffenden Einzeltönen. Eine Begleitfigur darf nur dann mehrere Zungen gleichzeitig anzeigen oder anschlagen, wenn die gemeinsame Timeline tatsächlich einen Akkord enthält.
- Pausen erscheinen primär als zeitliche Lücke und bei ausreichendem Platz zusätzlich mit einem dezenten Pausensymbol.
- Kalimba-Zahl und Tonbuchstabe lassen sich unabhängig voneinander ein- und ausschalten.

### Farbhilfe, persönliche Einstellungen und Zugänglichkeit

- Die Darstellung verwendet das aktive persönliche RubiChroma-Farbsystem.
- Die Farbhilfe kann vollständig, abgeschwächt oder ohne Farbe angezeigt werden.
- Farbe ist niemals das einzige Unterscheidungsmerkmal. Spur, Position, Beschriftung, Form und Hervorhebung machen auch ohne Farbe eindeutig, welche Zunge wann und wie lange gespielt wird.
- Ansicht, Übungsgeschwindigkeit, Farbhilfe, Mixerzustand und Loop-Auswahl werden pro Stück gespeichert.
- Allgemeine Player-Präferenzen werden global gespeichert. Eine separate Metronomlautstärke ist im aktuellen Umfang nicht vorhanden.
- Bei aktivierter Systemeinstellung für reduzierte Bewegung ersetzt eine ruhige, schrittweise aktualisierte Vorschau die kontinuierliche Flow-Animation. Reihenfolge, Zeitpunkt und Dauer bleiben erkennbar.
- Der Leertasten-Shortcut setzt keinen Fokus auf die nicht-interaktive Playerhülle und erzeugt dort keinen Fokusrahmen. Ein klar sichtbarer Tastaturfokus bleibt ausschließlich am tatsächlich fokussierten interaktiven Bedienelement erhalten.

### Zukünftige Spielerkennung

Der Player soll später erkennen können, was ein Nutzer tatsächlich spielt. Mikrofon- und MIDI-Eingaben sowie daraus abgeleitetes Feedback sind nicht Teil des MVP. Das Player- und Timeline-Modell wird jedoch so abgegrenzt, dass diese Eingaben später ergänzt werden können, ohne Wiedergabe, Notation oder Musikmodell auszutauschen. Offen bleiben insbesondere Erkennungsqualität, Live-Modi und die genaue visuelle Rückmeldung; die übergeordneten Lern-, Feedback- und Evidenzprinzipien stehen im Abschnitt **Übungen und Lernsystem**.

### MVP-Schnitt und spätere Ausbaustufen

| Fähigkeit | MVP-Schnitt | Langfristiges Zielbild |
|---|---|---|
| Instrument | kuratiertes Profil für eine 17-Zungen-Kalimba in C | weitere Instrumentprofile auf demselben Musik- und Timeline-Modell |
| Klang | vollständig lokaler synthetischer Kalimba-Klang | austauschbare hochwertige Instrument-Samples |
| Darstellung | synchronisierte Tab-/Laufnotation und aktive Hervorhebung | eine gemeinsame Playeroberfläche mit umschaltbarer Laufnotation und Kalimba-Flow; gleichzeitige Darstellung nur optional |
| Transport | Start, Pause, Stopp, Lautstärke und sichtbare Position | zusätzlich erweiterte Navigation und persönliche Ansichtspräferenzen |
| Üben | Bereich, Loop, relative Übungsgeschwindigkeit und Metronom Ein/Aus | zusätzlich getrennt steuerbarer Einzähler |
| Ebenen | mehrere Ebenen im Datenmodell vorbereitet, zunächst ohne vollständigen Mixer | Ein/Aus je Ebene; keine spurbezogene Lautstärke oder Solo-Funktion |
| Spielerkennung | keine Mikrofon-, MIDI- oder Bewertungsfunktion | trennbare Eingabe und sachliches Feedback für gespielte Ereignisse |

### Testbare Player-Anforderungen

Die folgenden Nutzerabläufe bilden den fachlichen Abnahmevertrag, jeweils soweit die zugehörige Ausbaustufe umgesetzt ist:

- Ein Stück mit Tönen, Akkorden, Pausen und unterschiedlichen Dauern bleibt über Start, Pause, Fortsetzen, Tempoänderung und Stopp hör- und sichtbar synchron.
- Freie Playerflächen toggeln per Klick beziehungsweise Tap genau einmal zwischen Wiedergabe und Pause; interaktive Controls lösen nur ihre eigene Aktion aus. Die Leertaste toggelt bei freiem Playerfokus ohne Seitenscrollen, aber nicht in Eingabe- oder Auswahlelementen.
- Eine Änderung der Übungsgeschwindigkeit verändert weder Originaltempo noch Lieddaten und verliert die aktuelle musikalische Position nicht.
- Beim Umschalten zwischen BPM und Prozent bleiben reale Wiedergabegeschwindigkeit und Transportposition unverändert. Auch wiederholtes Hin- und Herschalten erzeugt durch Rundung keine Tempodrift; Presets und Regler sind in beiden Einheiten eindeutig.
- Das Metronom ist beim Öffnen aus und lässt sich unabhängig von den Musikspuren ein- und ausschalten. Es folgt in beiden Tempoeinheiten demselben kanonischen Tempo, akzentuiert Schlag 1 und bleibt bei Transportaktionen, Sprüngen und mehreren Loop-Durchläufen ohne zusätzliche oder verwaiste Klicks taktsynchron.
- Ein Nutzer springt während laufender beziehungsweise pausierter Wiedergabe über Timeline und Note; der Player behält den vorherigen Wiedergabestatus bei.
- Derselbe Bereich lässt sich über Notenauswahl und Timeline-Griffe einstellen. Mehrere Loop-Durchläufe bleiben ohne zeitliche Drift und spielen kein Ereignis außerhalb der Auswahl an.
- Ein freier Loop von Start- bis Endtakt akzeptiert nur vorhandene Takte mit Start kleiner oder gleich Ende und zeigt den aktiven Bereich verständlich an. Loop, Transport, laufender Text und Notenblatt stimmen bei Taktzahlen und Grenzen überein.
- Nach erneutem Öffnen sind die bestätigten stückbezogenen Einstellungen und der letzte Loop-Bereich vorhanden, der Loop läuft aber nicht automatisch an.
- Die Laufnotation bewegt Ereignisse von rechts nach links zu einer festen Spiellinie; aktive Note, Akkord und Pause bleiben auch bei abgeschwächter oder ausgeschalteter Farbhilfe eindeutig erkennbar.
- Die spätere Flow-Ansicht bewegt Ereignisse von oben nach unten auf die physische Zungenanordnung zu und bildet Einsatz, Haltedauer, Loslassen, Akkorde und Pausen korrekt ab.
- Der Flow-Horizont lässt sich auf 1, 2 oder 4 Takte umschalten und startet mit 2 Takten, ohne Transportposition oder reale Wiedergabe zu verändern. Begleitungs-Arpeggien erscheinen und erklingen als nacheinander folgende Einzeltöne; nur echte Akkorde sind gleichzeitig.
- Für alle 17 Töne endet die Mittellinie des Flow-Balkens auf der Mitte der tonidentischen Zunge in physischer Kalimba-Reihenfolge. Die Abweichung beträgt auf Desktop, 390 Pixel Breite und nach dynamischer Größenänderung höchstens zwei CSS-Pixel; auch gleichzeitig eintreffende Akkordbalken bleiben korrekt ausgerichtet.
- Die Instrumentdarstellung ist ohne zusätzliche Erklärung als 17-Zungen-Kalimba erkennbar; schlanke Zungenproportionen, Metallcharakter, reale Anordnung, moderate Rundung am freien Ende und direkt aufgebrachte Ton-/Zahlbeschriftung unterstützen die Zuordnung. Die kompakte Darstellung verzichtet auf einen sachlich falsch proportionierten Steg; der Holzkorpus umschließt die Zungen mit schmalen realistischen Seitenrändern.
- Die Zungenprägung zeigt Grundoktave sowie höhere und gegebenenfalls tiefere Oktavlagen durch keine, oberhalb oder unterhalb der Ziffer gesetzte Punkte; auf den physischen Zungen erscheinen dafür keine Apostroph- oder Prime-Zeichen.
- Aktuelle und nächste Zunge sind als starke beziehungsweise schwächere Markierung unterscheidbar. Die aktive Markierung endet zuverlässig, und zwei aufeinanderfolgende Ereignisse derselben Zunge bleiben als getrennte Einsätze sichtbar, einschließlich des Übergangs von Akkord oder Arpeggio zu Melodie. Auf derselben Zunge endet der vorherige Balken und seine Stimme exakt mit dem neuen Anschlag; es sind dort weder zwei aktive Balken noch zwei unabhängig gestapelte Stimmen gleichzeitig vorhanden. Ausklänge anderer Zungen bleiben davon unberührt.
- Der vollständige Liedtext ist über den gesamten musikalischen Verlauf in der richtigen Reihenfolge und zeitlichen Zuordnung vorhanden; fehlender Inhalt wird nicht durch wiederholte Anfangszeilen ersetzt. Innerhalb eines mehrsilbigen Worts ist immer nur die zur aktuellen Note gehörende Silbe aktiv; Silbenwechsel, Pausen, Sprünge, Loops und Ansichtswechsel entfernen beziehungsweise rekonstruieren die Aktivmarkierung aus derselben Timeline zuverlässig.
- Das vollständige Notenblatt unterhalb des Players zeigt für jede Silbe beziehungsweise Textstelle die zugeordneten Editor-Töne oder -Akkorde in derselben Reihenfolge. Fortgesetzte Wörter erscheinen beispielsweise als „Twin-“ plus „kle“ oder „won-“ plus „der“; nur nicht letzte Silben tragen den Bindestrich, Satzzeichen bleiben an der letzten Silbe, und der Bindestrich besitzt keine eigene Timelineposition. Ein Klick oder Tap am Liedanfang, in der Mitte und nahe dem Ende springt exakt zum zugehörigen Ereignis und synchronisiert alle Playerprojektionen sowie die Scrollposition. Während normaler Wiedergabe hält das automatische Nachführen die aktive Silbe sichtbar; Desktop und 390-Pixel-Ansicht bleiben ohne horizontalen Seitenoverflow nutzbar.
- Taktzahlen und Taktgrenzen sind im vollständigen Notenblatt sichtbar; vor dem laufenden synchronen Text steht die aktuelle Taktangabe. Seek, Taktwechsel und Loop-Grenzen aktualisieren beide Anzeigen aus derselben Timeline.
- Ein Wechsel zwischen Laufnotation und Flow unterbricht die Wiedergabe nicht und bewahrt Position, Tempo, Loop, Farbhilfe und Ebenenzustand.
- Die Playeroberfläche bleibt als zusammenhängende Einheit erkennbar; sekundäre Loop- und Mixersteuerungen verdrängen die aktive Visualisierung nicht.
- Bei reduzierter Bewegung bleiben Reihenfolge, Annäherung, Zeitpunkt und Dauer in beiden Visualisierungen ohne kontinuierliche Animation verständlich.
- Play/Pause per Leertaste erzeugt keinen Fokusrahmen um die gesamte Playerhülle; beim Navigieren mit Tab bleibt der Fokus am jeweils tatsächlich fokussierten Control deutlich sichtbar.
- Die Ebenensteuerung kann Melodie und Begleitung unabhängig ein- und ausschalten, ohne die gemeinsame Timeline zu verlassen; spurbezogene Lautstärke und Solo werden nicht angeboten.

### Noch offene Player-Entscheidungen

- Unter- und Obergrenze sowie Schrittweite der relativen Übungsgeschwindigkeit
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
