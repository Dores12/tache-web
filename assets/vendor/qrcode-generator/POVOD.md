# qrcode-generator

Vykreslenie QR kódu z reťazca. Používa sa na obrázok QR kódu k zálohovej
faktúre a na stránke /dakujem.

- Balík: `qrcode-generator`, verzia 1.4.4
- Licencia: MIT, text je v `LICENSE.txt`
- Vystavuje globálnu funkciu `qrcode(typeNumber, errorCorrectionLevel)`.

Metóda `createDataURL(cellSize, margin)` vráti obrázok GIF ako dátovú
adresu, poskladaný v čistom JavaScripte. Vďaka tomu vie obrázok vyrobiť aj
Apps Script, ktorý nemá canvas, a netreba žiadnu externú službu na QR.
