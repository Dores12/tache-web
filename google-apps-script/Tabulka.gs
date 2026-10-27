/* ==========================================================================
   Tabuľka – zápis dopytov a objednávok.

   Každý zápis beží pod zámkom (LockService). Bez neho by dve objednávky,
   ktoré prídu v tej istej sekunde, mohli dostať rovnaké číslo.
   ========================================================================== */

function tabulka_() {
  if (!NASTAVENIA.tabulkaId) {
    throw new Error('V nastaveniach chýba tabulkaId');
  }
  return SpreadsheetApp.openById(NASTAVENIA.tabulkaId);
}

/** Vráti kartu, a ak chýba, založí ju aj s hlavičkou. */
function karta_(nazov, hlavicka) {
  var subor = tabulka_();
  var list = subor.getSheetByName(nazov);

  if (!list) {
    list = subor.insertSheet(nazov);
    list.appendRow(hlavicka);
    list.setFrozenRows(1);
    list.getRange(1, 1, 1, hlavicka.length).setFontWeight('bold');
  }
  return list;
}

/** Čísla stĺpcov podľa názvu v hlavičke, aby sa dalo písať zrozumiteľne. */
function stlpce_(list) {
  var hlavicka = list.getRange(1, 1, 1, list.getLastColumn()).getValues()[0];
  var mapa = {};
  for (var i = 0; i < hlavicka.length; i++) {
    mapa[hlavicka[i]] = i + 1;
  }
  return mapa;
}

/**
 * Rovnaký e-mail a typ do 10 minút považujeme za dvojklik, nie za nový
 * dopyt. Vráti true, ak sa taký záznam už v karte nachádza.
 */
function jeDuplicita_(list, email, stlpecEmailu) {
  var poslednyRiadok = list.getLastRow();
  if (poslednyRiadok < 2) { return false; }

  var odkial = Math.max(2, poslednyRiadok - 50);
  var pocet = poslednyRiadok - odkial + 1;
  var hodnoty = list.getRange(odkial, 1, pocet, list.getLastColumn()).getValues();

  var hranica = new Date().getTime() - NASTAVENIA.duplicitaMinut * 60 * 1000;
  var hladany = String(email).trim().toLowerCase();

  for (var i = 0; i < hodnoty.length; i++) {
    var cas = hodnoty[i][0];
    var zapisany = String(hodnoty[i][stlpecEmailu - 1]).trim().toLowerCase();
    if (zapisany !== hladany) { continue; }
    if (cas instanceof Date && cas.getTime() >= hranica) { return true; }
  }
  return false;
}

/**
 * Ďalšie číslo objednávky v tvare OBJ-RRRR-NNN. Číslovanie sa začína
 * každý rok od jednotky.
 */
function dalsieCisloObjednavky_(list) {
  var rok = new Date().getFullYear();
  var predpona = 'OBJ-' + rok + '-';
  var poslednyRiadok = list.getLastRow();
  var najvyssie = 0;

  if (poslednyRiadok >= 2) {
    var mapa = stlpce_(list);
    var cisla = list
      .getRange(2, mapa['Číslo objednávky'], poslednyRiadok - 1, 1)
      .getValues();

    for (var i = 0; i < cisla.length; i++) {
      var hodnota = String(cisla[i][0]);
      if (hodnota.indexOf(predpona) !== 0) { continue; }
      var poradie = parseInt(hodnota.slice(predpona.length), 10);
      if (poradie > najvyssie) { najvyssie = poradie; }
    }
  }

  var dalsie = najvyssie + 1;
  var cislo = predpona + ('00' + dalsie).slice(-3);

  return {
    cislo: cislo,
    /* Variabilný symbol je rok a poradie bez pomlčiek. */
    variabilnySymbol: String(rok) + ('00' + dalsie).slice(-3)
  };
}

/**
 * Koľko zakladateľských miest ešte zostáva. Počítajú sa objednávky, ktoré
 * zakladateľskú cenu dostali a neskončili ako Uzavretá.
 */
function volnychZakladatelskychMiest_() {
  var list = karta_(KARTY.objednavky, HLAVICKY.objednavky);
  var poslednyRiadok = list.getLastRow();
  if (poslednyRiadok < 2) { return ZAKLADATELSKYCH_MIEST; }

  var mapa = stlpce_(list);
  var hodnoty = list.getRange(2, 1, poslednyRiadok - 1, list.getLastColumn()).getValues();
  var obsadene = 0;

  for (var i = 0; i < hodnoty.length; i++) {
    var zakladatelska = hodnoty[i][mapa['Zakladateľská cena'] - 1];
    var stav = String(hodnoty[i][mapa['Stav'] - 1]);
    if (zakladatelska === true || zakladatelska === 'áno') {
      if (stav !== STAVY.uzavreta) { obsadene++; }
    }
  }

  return Math.max(0, ZAKLADATELSKYCH_MIEST - obsadene);
}

/** Zápis spamu. Odpoveď klientovi je aj tak kladná. */
function zapisSpam_(typ, dovod, data) {
  var list = karta_(KARTY.spam, HLAVICKY.spam);
  list.appendRow([new Date(), typ, dovod, JSON.stringify(data)]);
}

/** Zo všetkých polí o zdroji návštevy spraví jeden čitateľný text. */
function zdrojAkoText_(data) {
  var POLIA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
    'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'referrer',
    'landing_page', 'consent_analytics', 'consent_marketing'];

  var casti = [];
  POLIA.forEach(function (pole) {
    if (data[pole] !== undefined && data[pole] !== '') {
      casti.push(pole + '=' + data[pole]);
    }
  });
  return casti.join(' | ');
}
