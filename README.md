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
| `docs/MERANIE.md` | Čo nastaviť v GTM, GA4 a Meta Pixeli, a ako to overiť. |

Pri rozpore platí poradie zo sekcie 0 v `CLAUDE.md`.

## Spustenie lokálne

Dvakrát klikni na **`spustit-web.command`** v tomto priečinku. Otvorí sa
okno Terminálu, server sa spustí a prehliadač sa otvorí sám. Okno nechaj
otvorené, zatvorením sa web vypne.

Z príkazového riadka to isté spraví:

```
python3 tools/server.py
```

### index.html sa dvojklikom otvoriť nedá

Teda dá, ale uvidíš holý text bez dizajnu. Stránky sa na seba odkazujú
adresami ako `/cennik` a štýly hľadajú v `/assets`. To sú adresy **na
webe**, nie cesty v priečinku. Pri otvorení súboru z Findera ich prehliadač
hľadá v koreni disku a nenájde nič. Preto je tu ten server.

### Čo server robí

Chová sa ako Netlify: adresy bez prípony (`/cennik` servíruje
`cennik.html`), interné cesty vracajú 404, textové odpovede komprimuje
a posiela rovnaké hlavičky ako `netlify.toml`. Vďaka tomu lokálny
Lighthouse ukazuje čísla blízke produkcii.

Predvolený port je 8787. Keď ho drží iný projekt, server si vezme ďalší
voľný a vypíše, na ktorom beží. Vlastný port: `python3 tools/server.py 9000`.

## Kontroly pred commitom

```
bash tools/kontrola-obalu.sh
bash tools/kontrola-textov.sh
python3 tools/kontrola-cien.py
node tools/test-apps-script.mjs
node tools/kontrola-merania.mjs
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
- **kontrola-merania.mjs** otvorí web v Chrome, vyvolá každú udalosť zo
  sekcie 7.1 `CLAUDE.md` a porovná jej názov aj parametre. Potrebuje
  bežiaci `tools/server.py`. Keď server beží na inom porte, odovzdaj mu
  adresu: `node tools/kontrola-merania.mjs http://localhost:8788`.

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
spustit-web.command  spustí web na dvojklik, na web sa nenasadzuje
tools/        lokálny server, kontroly, šablóna og obrázka
              chrome.mjs    spoločný klient pre screenshoty a meranie
assets/vendor/ lzma1 a qrcode-generator, obe aj pre Apps Script
google-apps-script/  backend, návod je v jeho README.md
docs/, design/, google-apps-script/   interné, na webe vracajú 404
```

## Nasadenie

Netlify, publish `.`, bez build príkazu. Vetva `main` je produkcia, `dev`
náhľad. Každé nasadenie stojí 15 z 300 kreditov mesačne, preto sa zmeny
zbierajú na `dev` a do `main` idú najviac 2 až 3-krát týždenne.
