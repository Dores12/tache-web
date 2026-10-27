/* ==========================================================================
   QR kód PAY by square.

   Reťazec aj obrázok vznikajú priamo tu, bez akejkoľvek externej služby.
   Potrebné knižnice sú v projekte ako samostatné súbory:
     lzma1.gs   kompresia (assets/vendor/lzma1/lzma1.js)
     qrcode.gs  obrázok QR (assets/vendor/qrcode-generator/qrcode.js)

   Formát bysquare, zjednodušene:
     1. údaje sa poskladajú do reťazca oddeleného tabulátormi,
     2. pred ne sa pridá kontrolný súčet CRC32 (4 bajty, little endian),
     3. celé sa to skomprimuje LZMA a z výsledku sa zahodí 13 bajtov
        hlavičky, lebo čítačka si ju doplní sama,
     4. na začiatok ide 2-bajtová hlavička bysquare a 2 bajty s dĺžkou
        nekomprimovaných dát,
     5. všetko sa zakóduje do base32hex bez doplnkových znakov.

   Overené proti knižnici bysquare: poskladaný reťazec je bajt na bajt
   rovnaký a knižnica vie výsledný QR reťazec prečítať späť na rovnaké
   údaje. Pred ostrým spustením ho Daniel ešte naskenuje bankovou
   aplikáciou.
   ========================================================================== */

/** Tabuľka pre CRC32, počíta sa raz pri prvom použití. */
var CRC_TABULKA = null;

function crcTabulka_() {
  if (CRC_TABULKA) { return CRC_TABULKA; }

  CRC_TABULKA = [];
  for (var i = 0; i < 256; i++) {
    var c = i;
    for (var k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABULKA[i] = c;
  }
  return CRC_TABULKA;
}

function crc32_(bajty) {
  var tabulka = crcTabulka_();
  var c = -1;
  for (var i = 0; i < bajty.length; i++) {
    c = tabulka[(c ^ bajty[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/** Text na bajty v UTF-8. */
function naBajty_(text) {
  var out = [];
  for (var i = 0; i < text.length; i++) {
    var kod = text.charCodeAt(i);
    if (kod < 0x80) {
      out.push(kod);
    } else if (kod < 0x800) {
      out.push(0xC0 | (kod >> 6), 0x80 | (kod & 0x3F));
    } else {
      out.push(0xE0 | (kod >> 12), 0x80 | ((kod >> 6) & 0x3F), 0x80 | (kod & 0x3F));
    }
  }
  return out;
}

/** base32hex podľa RFC 4648, bez doplnkových znakov. */
function base32hex_(bajty) {
  var ZNAKY = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
  var bity = 0;
  var hodnota = 0;
  var out = '';

  for (var i = 0; i < bajty.length; i++) {
    hodnota = (hodnota << 8) | bajty[i];
    bity += 8;
    while (bity >= 5) {
      out += ZNAKY[(hodnota >>> (bity - 5)) & 31];
      bity -= 5;
    }
  }
  if (bity > 0) {
    out += ZNAKY[(hodnota << (5 - bity)) & 31];
  }
  return out;
}

/**
 * Odstráni diakritiku. Formát bysquare ju v mene príjemcu a v správe
 * neprenáša spoľahlivo, preto ju knižnica aj my zhadzujeme.
 */
function bezDiakritiky_(text) {
  if (!text) { return ''; }

  var ZDROJ = 'áäčďéěíĺľňóôöŕřšťúůüýžÁÄČĎÉĚÍĹĽŇÓÔÖŔŘŠŤÚŮÜÝŽ';
  var CIEL = 'aacdeeillnooorrstuuuyzAACDEEILLNOOORRSTUUUYZ';

  var out = '';
  for (var i = 0; i < text.length; i++) {
    var index = ZDROJ.indexOf(text.charAt(i));
    out += index === -1 ? text.charAt(i) : CIEL.charAt(index);
  }
  return out;
}

/**
 * Poskladá reťazec pre QR kód jednorazovej platby.
 *
 * udaje: { cisloObjednavky, suma, iban, variabilnySymbol, splatnost,
 *          prijemca, sprava }
 */
function payBySquare(udaje) {
  var polia = [
    udaje.cisloObjednavky || '',
    '1',                                  // jedna platba
    '1',                                  // typ: jednorazový príkaz
    String(udaje.suma),
    'EUR',
    udaje.splatnost || '',                // RRRR-MM-DD
    udaje.variabilnySymbol || '',
    '',                                   // konštantný symbol
    '',                                   // špecifický symbol
    '',                                   // referencia platiteľa
    bezDiakritiky_(udaje.sprava || ''),
    '1',                                  // jeden účet
    udaje.iban || '',
    '',                                   // BIC
    '0',                                  // bez trvalého príkazu
    '0',                                  // bez inkasa
    bezDiakritiky_(udaje.prijemca || ''),
    '',                                   // ulica
    ''                                    // mesto
  ];

  var telo = naBajty_(polia.join('\t'));
  var kontrola = crc32_(telo);

  var sKontrolou = [
    kontrola & 0xFF,
    (kontrola >>> 8) & 0xFF,
    (kontrola >>> 16) & 0xFF,
    (kontrola >>> 24) & 0xFF
  ].concat(telo);

  var skomprimovane = LZMA1.compress(Uint8Array.from(sKontrolou));

  /* Prvých 13 bajtov je hlavička LZMA, tú si čítačka doplní sama. */
  var vystup = [0x00, 0x00, sKontrolou.length & 0xFF, (sKontrolou.length >>> 8) & 0xFF];
  for (var i = 13; i < skomprimovane.length; i++) {
    vystup.push(skomprimovane[i] & 0xFF);
  }

  return base32hex_(vystup);
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
    iban: 'SK3112000000198742637541',
    variabilnySymbol: '2026001',
    splatnost: '2026-11-06',
    prijemca: 'Daniel Tache',
    sprava: 'OBJ-2026-001'
  });

  Logger.log(retazec);
  return retazec;
}
