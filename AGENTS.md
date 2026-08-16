# RubiChroma – Arbeitsanweisungen für KI-Agenten

Dieses Repository gehört zum Produkt **RubiChroma – Color Your Music**. Der lokale Ordner kann noch den historischen Namen `Kalimba Tool` tragen; maßgeblich sind Produktname und GitHub-Repository `RubinaKapahnke/rubichroma`.

## Führende Quellen

- [README.md](README.md): Einstieg, Repository-Aufbau und Branch-Ablauf
- [docs/prd.md](docs/prd.md): Produktvision, MVP-Scope und Erfolgskriterien
- [docs/tech-stack.md](docs/tech-stack.md): technischer Zielzustand und Architekturregeln
- [RUBICHROMA-CI.md](RUBICHROMA-CI.md): verbindliche und noch offene Markenentscheidungen
- [docs/deployment.md](docs/deployment.md): Cloudflare-Pages-Konfiguration und Veröffentlichungsweg
- [angular-app/README.md](angular-app/README.md): aktueller Angular-Migrationsstand, Datenkompatibilität und lokale Befehle
- GitHub-Issues: konkrete Umsetzung und aktueller Arbeitsstatus

Produkt-, Architektur-, Marken- oder Deploymententscheidungen werden in der jeweils führenden Quelle geändert. Keine zusätzliche Kontext- oder Handoff-Datei mit denselben Aussagen anlegen. Als offen markierte Entscheidungen nicht selbstständig festlegen.

## Projektspezifisches Festhalten

- In RubiChroma bedeuten Formulierungen wie „festhalten“, „merken“ oder „dokumentieren“ standardmäßig: die Information in der passenden führenden Repository-Quelle oder im zuständigen Issue von `RubinaKapahnke/rubichroma` ergänzen.
- Globale Ideen-, Wunsch- oder Aufgaben-Inboxen, persönliche `items.jsonl`-Sammlungen und allgemeine Capture-Skills dafür nicht verwenden, außer der Nutzer verlangt ausdrücklich eine projektübergreifende oder globale Ablage.
- Vor einer neuen Ablage zuerst eine vorhandene führende Quelle oder ein passendes GitHub-Issue suchen. Nur wenn keines geeignet ist, ein klar abgegrenztes RubiChroma-Issue anlegen; keine parallele Handoff- oder Merkliste erzeugen.
- Fachliche Entscheidungen bleiben in ihrer führenden Quelle beziehungsweise im Issue. `AGENTS.md` enthält nur die Routing- und Arbeitsregel und dupliziert nicht den fachlichen Inhalt.

## Repository-Aufbau

- Der Vanilla-Client im Repository-Root ist während der Migration die funktionale Referenz.
- `angular-app/` ist die neue Angular-Anwendung und der primäre Ort für neue Produktentwicklung.
- Die Alt-App wird erst nach nachgewiesener Funktions- und Datenübernahme entfernt.
- Die Legacy-Quelle `localStorage['kalimba-note-tool-v1']` niemals löschen oder überschreiben.

## Branches und Veröffentlichung

- `main` enthält ausschließlich Produktion.
- `dev` ist die gemeinsame Testumgebung.
- Feature-Branches werden per Pull Request nach `dev` integriert.
- Nur freigegebene Änderungen werden über einen Promotion-Branch und Pull Request nach `main` gebracht.
- Hosting erfolgt über Cloudflare Pages mit GitHub-Integration. Kein Worker-Projekt mit `wrangler deploy` anlegen.

## Abhängigkeiten, Delegation und Status

- Ein Child-Issue erst umsetzen lassen, wenn seine technische Basis im vorgesehenen PR-Zielbranch enthalten ist. Ist ein Parent-PR noch offen, entweder dessen Integration abwarten oder einen ausdrücklich freigegebenen Stacked-PR-Vertrag festlegen; ohne einen dieser Wege keinen Child-Task als vollständig beauftragen.
- Der beauftragende Koordinationstask bleibt für delegierte Codex-Tasks bis zur Ergebnisübernahme verantwortlich. Jeder Auftrag nennt die ID des Koordinationstasks und verlangt bei Abschluss sowie bei entscheidungsbedürftiger Blockade eine aktive Rückmeldung dorthin.
- Die Rückmeldung enthält mindestens den erreichten Status je Scope, Commit-SHAs, PR- und CI-Nachweise, geänderte Issues, bewusste Restpunkte sowie Branch- und Worktree-Sauberkeit. Eine Abschlussantwort nur im Umsetzungstask gilt noch nicht als an die Koordination übergeben.
- Der Koordinationstask wartet nach Erstellung auf einen nachweislichen Start und nach Abschluss auf die Rückmeldung. Falls direkte Task-Nachrichten nicht verfügbar sind, überwacht er den Task mit der Thread-Wartefunktion bis zum Ergebnis. Danach gleicht er die Nachweise mit dem aktuellen Repository- und GitHub-Stand ab und berichtet dem Nutzer den konsolidierten Stand.
- Vor dem Coding eine kompakte Akzeptanzmatrix festlegen: Akzeptanzkriterium → realistischer Nutzerablauf → automatischer Test → erforderlicher CI-Nachweis. Bei Import, Hydration, Restore oder anderem Zustandstausch muss die Matrix den unmittelbar sichtbaren Zustand ohne Reload, eine Folgeaktion, Undo soweit vorhanden und den Zustand nach Reload enthalten.
- Repräsentative Testdaten vor der Abschlussprüfung bereitstellen. Nur synthetische, gemeinfreie oder eindeutig freigegebene Fixtures committen; lokale Nutzer-Testdaten bleiben außerhalb des Branch-Scopes.
- In frischen Worktrees Skill-Pfade nur aus dem aktuellen Skill-Katalog auflösen und Abhängigkeiten vor Prüfungen mit dem Lockfile bereitstellen. Keine Cache- oder Skill-Pfade raten und fehlende `node_modules` nicht als Codefehler bewerten.
- Status strikt staffeln: `implementiert` → `lokal geprüft` → `PR mit CI grün` → `nach dev integriert` → `Issue geschlossen`. `Abgeschlossen` oder `vollständig umgesetzt` nur nach der letzten für das Issue verlangten Stufe verwenden; Blocker und fehlende Stufen immer ausdrücklich nennen.

## GitHub-Authentifizierung in Codex

- Die verbundene GitHub-App, die `gh`-CLI und Git-Zugangsdaten sind getrennte Authentifizierungskontexte. Eine funktionierende App-Verbindung bedeutet nicht automatisch, dass `gh` angemeldet ist, und umgekehrt.
- Sandbox-Prozesse und freigegebene Prozesse außerhalb der Sandbox können unter Windows unterschiedliche Sicht auf den Anmeldespeicher haben. Ein fehlgeschlagenes `gh auth status` in einem Kontext widerlegt daher nicht den gültigen Login im anderen Kontext.
- Vor `gh auth login` den Status immer in genau dem Ausführungskontext prüfen, in dem der nachfolgende `gh`-Befehl laufen soll. Nur bei dort tatsächlich fehlender oder ungültiger Anmeldung erneut authentifizieren.
- GitHub-Metadaten bevorzugt über die bereits verbundene GitHub-App bearbeiten. Für notwendige `gh`-Befehle den nachweislich angemeldeten Kontext wiederverwenden; für `git push` die vorhandenen Git-Zugangsdaten verwenden.
- Eine Codex-Sicherheitsfreigabe für einen extern wirksamen Befehl ist keine erneute GitHub-Anmeldung. Beides in Statusmeldungen klar unterscheiden.
- Tokens, Gerätecodes und andere Anmeldedaten niemals in Dateien, Commits, Logs oder Chat-Antworten übernehmen.

## Toolchain

- Node.js 24
- pnpm 11.19.0
- Befehle für Angular werden in `angular-app/` ausgeführt.

```sh
pnpm install --frozen-lockfile
pnpm check:domain-boundary
pnpm test
pnpm build
pnpm e2e
```

## Prüfung nach Änderungen

- Nur Dokumentation: `git diff --check`
- Angular-Code: `pnpm check:domain-boundary`, `pnpm test` und `pnpm build`
- UI, Routing, Browser-Speicherung, Import, Hydration oder Migration: zusätzlich die betroffenen Playwright-Tests mit `pnpm e2e`. Zustandstausch immer anhand einer repräsentativen Fixture sofort ohne Reload und erneut nach Reload prüfen.
- Ein grüner lokaler Browserlauf ersetzt keinen CI-Nachweis. PRs mit Angular-Code gelten erst als CI-grün, wenn auch die verpflichtenden Playwright-Tests im Workflow erfolgreich waren.
- Nur die für den Scope erforderlichen Prüfungen ausführen. Unveränderte Befunde nicht durch zusätzliche breite Audits wiederholen.

Bestehende Nutzeränderungen im Worktree respektieren. Keine fremden Änderungen zurücksetzen und keine offenen Produktentscheidungen durch technische Annahmen ersetzen.
