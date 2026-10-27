# Tache – predajný web

Web na tache.sk, cez ktorý predávam tvorbu predajných stránok s meraním
a voliteľnú správu reklamy. Zároveň je to živá ukážka toho, čo predávam,
takže musí byť rýchly, prístupný a správne meraný.

Čisté HTML, CSS a vanilla JS. Žiadny framework, žiadny build krok, žiadne
npm závislosti za behu.

## Kde sú pravidlá

| Súbor | Čo obsahuje |
|---|---|
| `CLAUDE.md` | Pravidlá práce, techniky, merania a textov. Platí pred zadaním. |
| `docs/ZADANIE.md` | Čo postaviť a v akom poradí. |
| `design/README.md` | Ako čítať návrhy v `design/*.dc.html`. |

Pri rozpore platí poradie zo sekcie 0 v `CLAUDE.md`.

## Spustenie lokálne

```
python3 tools/server.py
```

Web beží na http://localhost:8080. Server sa chová ako Netlify: adresy sú
bez prípony (`/cennik` servíruje `cennik.html`), interné cesty vracajú 404,
textové odpovede komprimuje a posiela rovnaké hlavičky ako `netlify.toml`.
Vďaka tomu lokálny Lighthouse ukazuje čísla blízke produkcii.

Iný port: `python3 tools/server.py 8787`.

## Kontroly pred commitom

```
bash tools/kontrola-obalu.sh
bash tools/kontrola-textov.sh
python3 tools/kontrola-cien.py
node tools/test-apps-script.mjs
```

- **kontrola-obalu.sh** overí, že opakované bloky (`#hlava`, `#meranie`,
  `#hlavicka`, `#paticka`, `#skripty`) sú vo všetkých HTML rovnaké, že
  žiadnej stránke nechýbajú a že hostiteľ v `canonical` a `og:*` sedí so
  `siteUrl` v configu.
- **kontrola-textov.sh** nájde vzorce zakázané v sekcii 4 `CLAUDE.md`
  (telefón, „nie X, ale Y“, slovo lead mimo názvu balíka, sľuby výsledku,
  dlhá pomlčka). Nálezy treba prejsť očami, nie každý je chyba. Čo už bolo
  schválené, patrí do `tools/overene-texty.txt`.
- **kontrola-cien.py** porovná `packages.js` so záložnými cenami pri
  `data-price`, s cenami v štruktúrovaných dátach a s kópiou cenníka
  v `google-apps-script/Baliky.gs`. Tie musia byť statické, a tak sa ľahko
  rozídu so zdrojom cien.
- **test-apps-script.mjs** prejde celý backend so službami Google
  nahradenými napodobeninami: validáciu, spam, číslovanie objednávok,
  výpočet cien, duplicity, e-maily, dotazník, QR kód aj spúšťače.

K tomu podľa `CLAUDE.md` screenshoty dotknutých stránok v 375 a 1440 px
s cookie lištou aj bez nej a Lighthouse mobile.

## Štruktúra

```
index.html, cennik.html, ...   stránky, každá má vlastnú URL
assets/css/   tokens.css (premenné), zaklad.css, prvky.css, stranky.css
assets/js/    config.js     všetko, čo sa mení (kontakty, GTM, prepínače)
              packages.js   jediný zdroj cien balíkov a doplnkov
              obal.js       hlavička, pätička, doplnenie hodnôt z configu
              consent.js    cookie lišta a Consent Mode v2
              track.js      jediná cesta do dataLayeru
              source.js     zdroj návštevy pre formuláre
              nav.js        výmena obsahu bez načítania stránky
              stranky/      skripty jednotlivých stránok, init() a destroy()
assets/fonts/ Schibsted Grotesk, variabilný, latin a latin-ext, OFL
              forms.js      spoločná logika všetkých formulárov
tools/        lokálny server, kontroly, šablóna og obrázka
assets/vendor/ lzma1 a qrcode-generator, obe aj pre Apps Script
google-apps-script/  backend, návod je v jeho README.md
docs/, design/, google-apps-script/   interné, na webe vracajú 404
```

## Nasadenie

Netlify, publish `.`, bez build príkazu. Vetva `main` je produkcia, `dev`
náhľad. Každé nasadenie stojí 15 z 300 kreditov mesačne, preto sa zmeny
zbierajú na `dev` a do `main` idú najviac 2 až 3-krát týždenne.
