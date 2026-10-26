/* ==========================================================================
   Zdroj objednávky.

   Pri prvej návšteve v relácii uloží UTM parametre a kontext návštevy do
   sessionStorage. S každým formulárom potom idú do Sheetu, aby bolo pri
   každom dopyte vidieť, odkiaľ prišiel (CLAUDE.md sekcia 7.3).

   Identifikátory kliknutia z reklamy (gclid, gbraid, wbraid, fbclid) a
   cookies _fbc a _fbp sa ukladajú len vtedy, keď je ad_storage granted.
   Kým súhlas nie je, držia sa len v pamäti tejto stránky. Keď návštevník
   súhlas dá, uložia sa; keď ho nedá, zmiznú spolu so stránkou.
   ========================================================================== */

window.TACHE = window.TACHE || {};

(function () {
  'use strict';

  var KLUC = 'tache_source_v1';

  var UTM = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
  ];
  var KLIKY = ['gclid', 'gbraid', 'wbraid', 'fbclid'];

  /* Identifikátory kliknutia z adresy, kým nie je súhlas. */
  var klikyVPamati = {};

  function parametre() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) {
      return null;
    }
  }

  function cookie(nazov) {
    var zhoda = document.cookie.match(
      new RegExp('(?:^|; )' + nazov.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
    );
    return zhoda ? decodeURIComponent(zhoda[1]) : '';
  }

  function precitat() {
    try {
      var ulozene = window.sessionStorage.getItem(KLUC);
      return ulozene ? JSON.parse(ulozene) : null;
    } catch (e) {
      return null;
    }
  }

  function zapisat(data) {
    try {
      window.sessionStorage.setItem(KLUC, JSON.stringify(data));
    } catch (e) {
      /* Súkromné okno, zdroj sa neuloží. */
    }
  }

  function suhlasNaReklamu() {
    var volba = window.TACHE.consent && window.TACHE.consent.precitat();
    return !!(volba && volba.marketing);
  }

  /* --- Prvá návšteva v relácii ---------------------------------------- */
  function zachytit() {
    var p = parametre();

    if (p) {
      KLIKY.forEach(function (nazov) {
        var hodnota = p.get(nazov);
        if (hodnota) { klikyVPamati[nazov] = hodnota; }
      });
    }

    if (precitat()) {
      /* Zdroj už máme, len doplníme identifikátory, ak medzitým prišiel súhlas. */
      doplnitKliky();
      return;
    }

    var data = {
      landing_page: window.location.pathname,
      referrer: document.referrer || '',
      captured_at: new Date().toISOString()
    };

    if (p) {
      UTM.forEach(function (nazov) {
        var hodnota = p.get(nazov);
        if (hodnota) { data[nazov] = hodnota; }
      });
    }

    zapisat(data);
    doplnitKliky();
  }

  /* --- Doplnenie identifikátorov po súhlase --------------------------- */
  function doplnitKliky() {
    if (!suhlasNaReklamu()) { return; }

    var data = precitat();
    if (!data) { return; }

    var zmena = false;
    KLIKY.forEach(function (nazov) {
      if (klikyVPamati[nazov] && !data[nazov]) {
        data[nazov] = klikyVPamati[nazov];
        zmena = true;
      }
    });

    var fbc = cookie('_fbc');
    var fbp = cookie('_fbp');
    if (fbc && data.fbc !== fbc) { data.fbc = fbc; zmena = true; }
    if (fbp && data.fbp !== fbp) { data.fbp = fbp; zmena = true; }

    if (zmena) { zapisat(data); }
  }

  /* --- Údaje pre formulár ---------------------------------------------
     Stav súhlasu sa pripája až tu, aby v Sheete bol ten, ktorý platil
     v čase odoslania.
     ----------------------------------------------------------------- */
  function ziskat() {
    doplnitKliky();

    var data = precitat() || {};
    var volba = window.TACHE.consent && window.TACHE.consent.precitat();
    var kopia = {};
    var kluc;

    for (kluc in data) {
      if (Object.prototype.hasOwnProperty.call(data, kluc)) {
        kopia[kluc] = data[kluc];
      }
    }

    kopia.consent_analytics = !!(volba && volba.analytics);
    kopia.consent_marketing = !!(volba && volba.marketing);
    return kopia;
  }

  window.TACHE.source = { ziskat: ziskat };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', zachytit);
  } else {
    zachytit();
  }
}());
