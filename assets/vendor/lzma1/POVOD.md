# lzma1

Kompresia LZMA1. Potrebuje ju generátor reťazca PAY by square: formát
bysquare ukladá dáta skomprimované LZMA a bez 13-bajtovej hlavičky.

- Balík: `lzma1`, verzia 2.1.0
- Licencia: Apache-2.0, text je v `LICENSE.txt`
- Súbor `lzma1.js` je zbalená verzia (esbuild, formát IIFE, globálny názov
  `LZMA1`), aby fungovala aj v prehliadači aj v Apps Scripte, ktorý ES
  moduly nepozná.

Vystavuje jedinú funkciu `LZMA1.compress(Uint8Array)`. Vracia prúd vo
formáte LZMA alone, teda 13 bajtov hlavičky a za nimi telo. Vlastnosti sú
`lc=3, lp=0, pb=2` (bajt `0x5D`), presne tie, ktoré pri dekódovaní
predpokladajú čítačky PAY by square.
