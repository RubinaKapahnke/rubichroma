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
- UI, Routing, Browser-Speicherung oder Migration: zusätzlich die betroffenen Playwright-Tests mit `pnpm e2e`
- Nur die für den Scope erforderlichen Prüfungen ausführen. Unveränderte Befunde nicht durch zusätzliche breite Audits wiederholen.

Bestehende Nutzeränderungen im Worktree respektieren. Keine fremden Änderungen zurücksetzen und keine offenen Produktentscheidungen durch technische Annahmen ersetzen.
