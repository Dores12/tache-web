/* ==========================================================================
   Balíky a doplnky – kópia cien pre server.

   Prehliadaču sa pri cenách veriť nedá, objednávka môže prísť odkiaľkoľvek.
   Server si preto cenu spočíta sám z týchto dát a to, čo poslal prehliadač,
   len porovná.

   Zdrojom pravdy ostáva assets/js/packages.js. Tento súbor je jeho kópia
   a musí sa s ním zhodovať. Stráži to tools/kontrola-cien.py, spusti ju po
   každej zmene cien.
   ========================================================================== */

var BALIKY = [
  { id: 'start', name: 'Štart', regular: 249, founder: 149, days: '3 dní' },
  { id: 'lead', name: 'Lead systém', regular: 449, founder: 269, days: '7 dní' },
  { id: 'kluc', name: 'Na kľúč', regular: 790, founder: 479, days: '14 dní' }
];

var DOPLNKY = [
  { id: 'pixel', name: 'Meranie pre reklamu na Mete a Googli', price: 79, only: 'start' },
  { id: 'auto', name: 'Dopyty do tabuľky a potvrdenie zákazníkovi', price: 99, only: 'start' },
  { id: 'dizajn', name: 'Dizajn na mieru', price: 99, only: 'start' },
  { id: 'kampan', name: 'Spustenie reklamy na Mete alebo Googli', price: 149, only: 'lead' },
  { id: 'kreativy', name: 'Texty a 3 obrázky do reklamy', price: 99, only: 'lead' },
  { id: 'druha', name: 'Reklama aj na druhej platforme', price: 149, only: 'kluc' },
  { id: 'podstranka', name: 'Ďalšia podstránka', price: 49, only: '' },
  { id: 'kolo', name: 'Ďalšie kolo úprav', price: 39, only: '' },
  { id: 'clanok', name: 'Článok na blog napísaný pre Google', price: 59, only: '' }
];

/* Počet zakladateľských miest. Koľko ich ešte zostáva, sa počíta
   z tabuľky, aby sa to nemuselo udržiavať na dvoch miestach. */
var ZAKLADATELSKYCH_MIEST = 5;

function balikPodlaId_(id) {
  for (var i = 0; i < BALIKY.length; i++) {
    if (BALIKY[i].id === id) { return BALIKY[i]; }
  }
  return null;
}

function doplnokPodlaId_(id) {
  for (var i = 0; i < DOPLNKY.length; i++) {
    if (DOPLNKY[i].id === id) { return DOPLNKY[i]; }
  }
  return null;
}

/**
 * Spočíta objednávku z id balíka a zoznamu id doplnkov.
 * Doplnok, ktorý k balíku nepatrí, sa ticho zahodí.
 */
function spocitajObjednavku_(idBalika, idDoplnkov, zakladatelska) {
  var balik = balikPodlaId_(idBalika);
  if (!balik) { return null; }

  var zaBalik = zakladatelska ? balik.founder : balik.regular;
  var vybrane = [];
  var zaDoplnky = 0;

  (idDoplnkov || []).forEach(function (id) {
    var doplnok = doplnokPodlaId_(id);
    if (!doplnok) { return; }
    if (doplnok.only !== '' && doplnok.only !== idBalika) { return; }
    vybrane.push(doplnok);
    zaDoplnky += doplnok.price;
  });

  var spolu = zaBalik + zaDoplnky;
  var zaloha = Math.round(spolu * NASTAVENIA.zalohaPodiel * 100) / 100;

  return {
    balik: balik,
    zaBalik: zaBalik,
    doplnky: vybrane,
    spolu: spolu,
    zaloha: zaloha,
    doplatok: Math.round((spolu - zaloha) * 100) / 100,
    zakladatelska: zakladatelska
  };
}

/** Formát ceny rovnaký ako na webe: desatinná čiarka, celé čísla bez desatín. */
function cena_(n) {
  var r = Math.round(n * 100) / 100;
  var s = (r % 1 === 0) ? String(r) : r.toFixed(2);
  return s.replace('.', ',') + ' €';
}
