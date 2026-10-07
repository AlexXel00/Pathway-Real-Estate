# Deutsche Version der Website

Die englischen Seiten in `Wesbite/` sind die Vorlage. Die deutschen Seiten in `Wesbite/de/`
werden daraus erzeugt, mit der Übersetzungstabelle `de.json`. Dieser Ordner wird nicht
veröffentlicht (Netlify veröffentlicht nur `Wesbite/`).

## Nach einer Änderung an einer englischen Seite

    cd tools/i18n
    npm install
    node build-de.mjs ../../Wesbite de.json

Das Skript schreibt alle Seiten in `Wesbite/de/` neu und listet am Ende jeden Text auf,
für den es noch keine deutsche Übersetzung gibt ("MISSING ..."), sowie Textstellen in
Skripten, die nicht mehr gefunden werden ("JS not matched ..."). Diese in `de.json`
ergänzen und das Skript erneut ausführen, bis "0 open item(s)" erscheint.

## Aufbau von de.json

- `pages`: Seiten, die es auf Deutsch gibt
- `text`: englischer Text (wie im HTML) -> deutscher Text, für alle Seiten
- `pageText`: Ausnahmen pro Seite
- `js`: Texte in den Skripten der Seiten (`literals` = Text in Anführungszeichen,
  `replace` = genaues Code-Stück), `*` gilt für alle Seiten
- `numbers`: Zahlen mit deutschem Format

## Weitere deutsche Texte

- `Wesbite/i18n-de.js`: deutsche Begriffe für Tags, Kategorien und Ausstattung aus dem Portal,
  Zahlen- und Preisformat
- `Wesbite/consent.js`, `Wesbite/alerts-popup.js`: Cookie-Hinweis und Anmeldefenster (EN und DE)
- `netlify/functions/alerts-*.js`, `netlify/lib/alerts-lib.js`: deutsche E-Mails für Abonnenten,
  die sich auf einer deutschen Seite angemeldet haben

## Neue englische Seite

`plumb_en.py` fügt einer neuen Seite den Sprachumschalter EN | DE, die hreflang-Angaben und das
Sprachfeld in Formularen hinzu. Danach die Seite in `de.json` unter `pages` eintragen und übersetzen.
