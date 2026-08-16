# RubiChroma – Deployment und Cloudflare Pages

**Status:** Beschlossen, Cloudflare-Projekt noch nicht eingerichtet
**Geltungsbereich:** Web-App, Produktions-Deployment und Vorschauen

## Zielbild

RubiChroma wird über **Cloudflare Pages mit GitHub-Integration** veröffentlicht. Ein Worker-Projekt mit `wrangler deploy` ist für die statische Angular-App nicht vorgesehen. Cloudflare-Agenten, Skills oder MCP-Verbindungen sind für das Hosting nicht erforderlich und werden davon getrennt behandelt.

Cloudflare baut und veröffentlicht automatisch, sobald ein Commit auf einem freigegebenen Branch bei GitHub ankommt.

| Git-Stand | Zweck | Cloudflare-Ziel |
|---|---|---|
| `main` | Produktion | Produktions-URL des Pages-Projekts |
| `dev` | feste Testumgebung | Branch-Alias `dev.<projekt>.pages.dev` |
| Feature-Branch | isolierte Vorschau | eigener Branch-Alias |
| Pull Request | Review vor dem Merge | eindeutige Preview-URL |

Änderungen gelangen zuerst per Pull Request nach `dev`. Nach dem Test werden nur freigegebene Änderungen über einen Promotion-Branch und Pull Request nach `main` übernommen. Ein Push auf `dev` verändert die Produktion nicht.

## Geplante Cloudflare-Konfiguration

| Einstellung | Wert |
|---|---|
| Projekttyp | Pages, vorhandenes Git-Repository importieren |
| Repository | `RubinaKapahnke/rubichroma` |
| Projektname | `rubichroma` |
| Produktionsbranch | `main` |
| Root directory | `angular-app` |
| Build command | `pnpm build` |
| Build output directory | `dist/angular-app/browser` |
| Builds für Nicht-Produktionsbranches | aktiviert |

Die Pfade sind relativ zur Root directory `angular-app`. Das Pages-Projekt wird erst angelegt, wenn die Angular-App auf dem Produktionsbranch vorhanden und dort baubar ist. Bis dahin darf im Cloudflare-Dialog nicht auf **Deploy** geklickt werden.

## Angular-Ausgabeordner

In `angular.json` ist der `outputPath` ausdrücklich auf `dist/angular-app` festgelegt. Der verwendete Angular-Application-Builder legt die auslieferbare Browser-Anwendung darunter im Ordner `browser` ab:

```text
angular-app/dist/angular-app/browser
```

Cloudflare benötigt als **Build output directory** den Ordner, in dem die fertige `index.html` und die gebündelten Dateien liegen. Da Cloudflare bereits in `angular-app` startet, wird dort `dist/angular-app/browser` eingetragen.

Der explizite `outputPath` hält die Angular- und Cloudflare-Konfiguration auch dann synchron, wenn sich Angular-Vorgaben oder der Projektname später ändern.

## Daten und Migration

RubiChroma speichert Nutzerdaten lokal im Browser. Browser-Speicher ist an die jeweilige Herkunft aus Protokoll, Domain und Port gebunden. Eine neue `pages.dev`- oder eigene Produktionsdomain übernimmt deshalb keine vorhandenen lokalen Daten von einer anderen URL. Für den Wechsel wird die bereits vorgesehene JSON-Sicherung verwendet oder eine gesonderte Same-Origin-Migration umgesetzt.

## Offizielle Grundlagen

- [Cloudflare Pages: Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages: Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Cloudflare Pages: Angular](https://developers.cloudflare.com/pages/framework-guides/deploy-an-angular-site/)
