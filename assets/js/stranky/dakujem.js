/* ==========================================================================
   Ďakujem.

   Číslo objednávky berie z adresy (?o=OBJ-2026-001), súhrn zo
   sessionStorage, kam ho uložil konfigurátor pri odoslaní. Keď chýba
   jedno aj druhé, zostane všeobecné poďakovanie bez QR kódu.

   QR kód sa skladá priamo v prehliadači, žiadna externá služba. Reťazec
   robí assets/js/paybysquare.js, obrázok knižnica qrcode-generator.
   Obe sa načítajú až tu, aby nezaťažovali ostatné stránky.

   Stránka sa vždy načítava normálne, nav.js ju nevymieňa.
   ========================================================================== */

window.TACHE = window.TACHE || {};
window.TACHE.pages = window.TACHE.pages || {};

(function () {
  'use strict';

  var KLUC_SUHRNU = 'tache_objednavka_v1';

  var KNIZNICE = [
    '/assets/vendor/lzma1/lzma1.js',
    '/assets/vendor/qrcode-generator/qrcode.js',
    '/assets/js/paybysquare.js'
  ];

  var nacitane = null;

  /** Načíta knižnice pre QR kód. Spustí sa najviac raz. */
  function nacitajKniznice() {
    if (nacitane) { return nacitane; }

    nacitane = KNIZNICE.reduce(function (rad, cesta) {
      return rad.then(function () {
        return new Promise(function (hotovo, zle) {
          var skript = document.createElement('script');
          skript.src = cesta;
          skript.addEventListener('load', function () { hotovo(); });
          skript.addEventListener('error', function () {
            zle(new Error('nepodarilo sa načítať ' + cesta));
          });
          document.head.appendChild(skript);
        });
      });
    }, Promise.resolve());

    return nacitane;
  }

  function cisloZAdresy() {
    try {
      return new URLSearchParams(window.location.search).get('o') || '';
    } catch (e) {
      return '';
    }
  }

  function suhrnZUlozeska() {
    try {
      var ulozene = window.sessionStorage.getItem(KLUC_SUHRNU);
      return ulozene ? JSON.parse(ulozene) : null;
    } catch (e) {
      return null;
    }
  }

  /** Z čísla objednávky OBJ-2026-001 spraví variabilný symbol 2026001. */
  function variabilnySymbol(cislo) {
    var cifry = String(cislo).replace(/[^0-9]/g, '');
    return cifry || '';
  }

  function splatnost() {
    var dni = Number(window.TACHE.config.proformaDueDays) || 10;
    var datum = new Date(Date.now() + dni * 24 * 60 * 60 * 1000);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return datum.getFullYear() + '-' + p(datum.getMonth() + 1) + '-' + p(datum.getDate());
  }

  function nastav(vyber, text) {
    document.querySelectorAll(vyber).forEach(function (prvok) {
      prvok.textContent = text;
    });
  }

  /* --- Súhrn objednávky -------------------------------------------------- */
  function vypisSuhrn(cislo, suhrn) {
    var data = window.TACHE.data;

    nastav('[data-cislo]', cislo);
    nastav('[data-email]', suhrn && suhrn.email ? suhrn.email : '');
    nastav('[data-vs]', variabilnySymbol(cislo));
    nastav('[data-sprava]', cislo);
    nastav('[data-iban]', window.TACHE.config.iban);

    if (!suhrn) { return; }

    nastav('[data-balik]', suhrn.balik.nazov);
    nastav('[data-cena-balika]', data.cena(suhrn.balik.cena));
    nastav('[data-spolu]', data.cena(suhrn.spolu));
    nastav('[data-zaloha]', data.cena(suhrn.zaloha));
    nastav('[data-doplatok]', data.cena(suhrn.doplatok));
    nastav('[data-suma]', data.cena(suhrn.zaloha));

    var zoznam = document.querySelector('[data-doplnky]');
    if (!zoznam) { return; }

    zoznam.textContent = '';
    (suhrn.doplnky || []).forEach(function (doplnok) {
      var riadok = document.createElement('div');
      riadok.className = 'suhrn-dakujem__doplnok';

      var nazov = document.createElement('dt');
      nazov.textContent = doplnok.nazov;
      var cena = document.createElement('dd');
      cena.textContent = data.cena(doplnok.cena);

      riadok.appendChild(nazov);
      riadok.appendChild(cena);
      zoznam.appendChild(riadok);
    });
  }

  /* --- QR kód ------------------------------------------------------------- */
  function vykresliQr(cislo, suhrn) {
    var miesto = document.querySelector('[data-qr]');
    var iban = window.TACHE.config.iban;

    if (!miesto) { return; }

    /* Bez IBAN v configu alebo bez sumy QR kód nevykreslíme. */
    if (!iban || !suhrn) {
      miesto.textContent = 'QR kód doplníme, keď bude v nastaveniach IBAN. '
        + 'Platobné údaje sú v zálohovej faktúre v e-maile.';
      return;
    }

    nacitajKniznice().then(function () {
      var retazec = PAYBYSQUARE.retazec({
        cisloObjednavky: cislo,
        suma: suhrn.zaloha,
        iban: iban,
        variabilnySymbol: variabilnySymbol(cislo),
        splatnost: splatnost(),
        prijemca: window.TACHE.config.beneficiary || window.TACHE.config.owner,
        sprava: cislo
      });

      var kod = qrcode(0, 'M');
      kod.addData(retazec);
      kod.make();

      var obrazok = document.createElement('img');
      obrazok.src = kod.createDataURL(6, 4);
      obrazok.width = 200;
      obrazok.height = 200;
      obrazok.alt = 'QR kód PAY by square na úhradu zálohy '
        + window.TACHE.data.cena(suhrn.zaloha)
        + ', variabilný symbol ' + variabilnySymbol(cislo);

      miesto.textContent = '';
      miesto.classList.remove('platba__qr--prazdny');
      miesto.removeAttribute('role');
      miesto.removeAttribute('aria-label');
      miesto.appendChild(obrazok);

      window.TACHE.track.push('qr_view');

    }).catch(function () {
      miesto.textContent = 'QR kód sa nepodarilo vykresliť. Platobné údaje '
        + 'nájdete pod ním aj v zálohovej faktúre v e-maile.';
    });
  }

  /* --- Štart --------------------------------------------------------------- */
  function init() {
    var cislo = cisloZAdresy();
    var suhrn = suhrnZUlozeska();

    /* Súhrn z inej objednávky by mýlil, radšej ho zahodíme. */
    if (suhrn && cislo && suhrn.cislo && suhrn.cislo !== cislo) {
      suhrn = null;
    }

    var mameObjednavku = !!cislo;

    document.querySelectorAll('[data-ak-objednavka]').forEach(function (prvok) {
      prvok.hidden = !mameObjednavku;
    });
    document.querySelectorAll('[data-ak-bez-objednavky]').forEach(function (prvok) {
      prvok.hidden = mameObjednavku;
    });

    if (!mameObjednavku) { return; }

    /* Bez súhrnu nevieme sumu, takže ani QR a ani súhrn objednávky. */
    if (!suhrn) {
      var karta = document.querySelector('.suhrn-dakujem');
      if (karta) { karta.hidden = true; }
    }

    vypisSuhrn(cislo, suhrn);
    vykresliQr(cislo, suhrn);
  }

  function destroy() { /* stránka sa nevymieňa, netreba nič odpájať */ }

  window.TACHE.pages.dakujem = { init: init, destroy: destroy };
}());
