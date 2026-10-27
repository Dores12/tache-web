/* ==========================================================================
   QR kód pre zálohovú faktúru.

   Reťazec PAY by square skladá spoločný súbor paybysquare.gs, ktorý je
   rovnaký ako assets/js/paybysquare.js na webe. Tu je len to, čo platí
   pre Apps Script: obrázok ako Blob, ktorý sa dá vložiť do dokumentu.

   V projekte musia byť aj:
     lzma1.gs       (assets/vendor/lzma1/lzma1.js)
     qrcode.gs      (assets/vendor/qrcode-generator/qrcode.js)
     paybysquare.gs (assets/js/paybysquare.js)
   ========================================================================== */

/** Reťazec PAY by square. Údaje sú opísané v paybysquare.gs. */
function payBySquare(udaje) {
  return PAYBYSQUARE.retazec(udaje);
}

/**
 * Obrázok QR kódu ako GIF. Knižnica ho poskladá v čistom JavaScripte,
 * takže netreba canvas ani externú službu.
 */
function qrObrazok(retazec, velkostBunky) {
  var kod = qrcode(0, 'M');
  kod.addData(retazec);
  kod.make();

  var dataUrl = kod.createDataURL(velkostBunky || 6, 4);
  var base64 = dataUrl.split(',')[1];

  return Utilities.newBlob(Utilities.base64Decode(base64), 'image/gif', 'qr.gif');
}

/** Rýchla skúška z editora Apps Scriptu. */
function skuskaQr() {
  var retazec = payBySquare({
    cisloObjednavky: 'OBJ-2026-001',
    suma: 134.5,
    iban: NASTAVENIA.iban || 'SK3112000000198742637541',
    variabilnySymbol: '2026001',
    splatnost: '2026-11-06',
    prijemca: NASTAVENIA.owner,
    sprava: 'OBJ-2026-001'
  });

  Logger.log(retazec);
  return retazec;
}
