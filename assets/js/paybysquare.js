/* ==========================================================================
   PAY by square – reťazec pre QR kód platby.

   Tento súbor beží na dvoch miestach:
     - v prehliadači na stránke /dakujem,
     - v Apps Scripte pri zálohovej faktúre, kam sa kopíruje ako
       paybysquare.gs.

   Preto tu nie je nič, čo by patrilo len jednej strane: žiadne window,
   žiadne Utilities. Obrázok QR si každá strana vykreslí po svojom,
   reťazec je spoločný.

   Formát, zjednodušene:
     1. údaje sa poskladajú do reťazca oddeleného tabulátormi,
     2. pred ne sa pridá kontrolný súčet CRC32 (4 bajty, little endian),
     3. celé sa to skomprimuje LZMA a z výsledku sa zahodí 13 bajtov
        hlavičky, lebo čítačka si ju doplní sama,
     4. na začiatok ide 2-bajtová hlavička bysquare a 2 bajty s dĺžkou
        nekomprimovaných dát,
     5. všetko sa zakóduje do base32hex bez doplnkových znakov.

   Overené proti knižnici bysquare: poskladaný reťazec je bajt na bajt
   rovnaký a každý výsledok sa rozbalí späť presne na pôvodné dáta.
   Potrebuje LZMA1.compress z assets/vendor/lzma1/lzma1.js.
   ========================================================================== */

var PAYBYSQUARE = (function () {
  'use strict';

  var tabulkaCrc = null;

  function crcTabulka() {
    if (tabulkaCrc) { return tabulkaCrc; }

    tabulkaCrc = [];
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      tabulkaCrc[i] = c;
    }
    return tabulkaCrc;
  }

  function crc32(bajty) {
    var tabulka = crcTabulka();
    var c = -1;
    for (var i = 0; i < bajty.length; i++) {
      c = tabulka[(c ^ bajty[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ -1) >>> 0;
  }

  /** Text na bajty v UTF-8. */
  function naBajty(text) {
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
  function base32hex(bajty) {
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
   * Odstráni diakritiku. Formát ju v mene príjemcu a v správe neprenáša
   * spoľahlivo, preto ju zhadzujeme rovnako ako referenčná knižnica.
   */
  function bezDiakritiky(text) {
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
  function retazec(udaje) {
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
      bezDiakritiky(udaje.sprava || ''),
      '1',                                  // jeden účet
      udaje.iban || '',
      '',                                   // BIC
      '0',                                  // bez trvalého príkazu
      '0',                                  // bez inkasa
      bezDiakritiky(udaje.prijemca || ''),
      '',                                   // ulica
      ''                                    // mesto
    ];

    var telo = naBajty(polia.join('\t'));
    var kontrola = crc32(telo);

    var sKontrolou = [
      kontrola & 0xFF,
      (kontrola >>> 8) & 0xFF,
      (kontrola >>> 16) & 0xFF,
      (kontrola >>> 24) & 0xFF
    ].concat(telo);

    var skomprimovane = LZMA1.compress(Uint8Array.from(sKontrolou));

    /* Prvých 13 bajtov je hlavička LZMA, tú si čítačka doplní sama. */
    var vystup = [
      0x00, 0x00,
      sKontrolou.length & 0xFF,
      (sKontrolou.length >>> 8) & 0xFF
    ];
    for (var i = 13; i < skomprimovane.length; i++) {
      vystup.push(skomprimovane[i] & 0xFF);
    }

    return base32hex(vystup);
  }

  return { retazec: retazec, bezDiakritiky: bezDiakritiky };
}());
