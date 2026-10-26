/* ==========================================================================
   Balíky, doplnky a paušály – jediný zdroj cien.
   Žiadna cena nesmie byť natvrdo v HTML. V HTML je pri cene len záložný
   text pre stav bez JS a atribút data-price, ktorý obal.js prepíše.
   ========================================================================== */

window.TACHE = window.TACHE || {};

(function () {
  'use strict';

  var balicky = [
    {
      id: 'start',
      name: 'Štart',
      regular: 249,
      founder: 149,
      days: '3 dní',
      deliveryDays: 3,
      revisions: 2,
      supportDays: 14,
      recommended: false,
      note: 'Predajná stránka z overeného rozloženia. Uvidíte, koľko ľudí sa ozvalo a odkiaľ.'
    },
    {
      id: 'lead',
      name: 'Lead systém',
      regular: 449,
      founder: 269,
      days: '7 dní',
      deliveryDays: 7,
      revisions: 3,
      supportDays: 30,
      recommended: true,
      note: 'Dizajn na mieru, každý dopyt v tabuľke a reklama, ktorá vie, kto sa ozval.'
    },
    {
      id: 'kluc',
      name: 'Na kľúč',
      regular: 790,
      founder: 479,
      days: '14 dní',
      deliveryDays: 14,
      revisions: 3,
      supportDays: 60,
      recommended: false,
      note: 'Web, reklama a prvý mesiac jej správy od jedného človeka.'
    }
  ];

  /* only = balík, pri ktorom sa doplnok zobrazí. Prázdne = pri všetkých. */
  var doplnky = [
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

  var pausaly = {
    web: 29,              // správa webu, hodina práce mesačne
    meta: 149,            // správa reklamy na Mete
    google: 149,          // správa reklamy na Googli
    obe: 249,             // Meta aj Google
    spustenie: 149,       // jednorazovo za platformu
    rozpocetDenne: 10     // odporúčaný rozpočet na reklamu od 10 € denne
  };

  /* Formát ceny: desatinná čiarka, celé čísla bez desatinných miest. */
  function cena(n) {
    var r = Math.round(n * 100) / 100;
    var s = (r % 1 === 0) ? String(r) : r.toFixed(2);
    return s.replace('.', ',') + ' €';
  }

  function balik(id) {
    for (var i = 0; i < balicky.length; i++) {
      if (balicky[i].id === id) { return balicky[i]; }
    }
    return null;
  }

  function doplnok(id) {
    for (var i = 0; i < doplnky.length; i++) {
      if (doplnky[i].id === id) { return doplnky[i]; }
    }
    return null;
  }

  /* Doplnky, ktoré dávajú zmysel k danému balíku. */
  function doplnkyPre(id) {
    return doplnky.filter(function (d) {
      return d.only === '' || d.only === id;
    });
  }

  function dalsiBalik(id) {
    for (var i = 0; i < balicky.length - 1; i++) {
      if (balicky[i].id === id) { return balicky[i + 1]; }
    }
    return null;
  }

  /* Platí zakladateľská cena? Pri 0 voľných miestach už nie. */
  function zakladatelska() {
    return (window.TACHE.config.founderSlotsLeft || 0) > 0;
  }

  /* Cena balíka, ktorá sa má zákazníkovi účtovať. */
  function cenaBalika(b) {
    return zakladatelska() ? b.founder : b.regular;
  }

  window.TACHE.data = {
    packages: balicky,
    addons: doplnky,
    retainers: pausaly,
    depositRatio: 0.5,      // záloha 50 %
    upsellThreshold: 0.7,   // ponuka vyššieho balíka pri 70 % rozdielu cien
    cena: cena,
    balik: balik,
    doplnok: doplnok,
    doplnkyPre: doplnkyPre,
    dalsiBalik: dalsiBalik,
    zakladatelska: zakladatelska,
    cenaBalika: cenaBalika
  };
}());
