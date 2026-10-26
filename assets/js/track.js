/* ==========================================================================
   Meranie – jediná cesta do dataLayeru.

   Web iba pushuje do dataLayeru. Žiadne priame gtag ani fbq, okrem inline
   Consent Mode v hlavičke. Názvy a parametre eventov sú v CLAUDE.md
   sekcia 7.1, nemeň ich bez úpravy GTM.

   Kliky sa merajú delegovane cez data-track, nikdy inline onclick:
     <a data-track="email_click" data-track-link_location="paticka">
   ========================================================================== */

window.TACHE = window.TACHE || {};

(function () {
  'use strict';

  var cfg = window.TACHE.config;
  var testovaciRezim = !cfg.formEndpoint;

  /* Hranice pre scroll_depth a pravidlo pre section_view sú potvrdené
     Danielom: 25, 50, 75 a 90 percent, sekcia aspoň polovicou viditeľná
     dlhšie ako sekundu, raz za zobrazenie stránky. */
  var HRANICE_SCROLLU = [25, 50, 75, 90];
  var PRAH_SEKCIE = 0.5;
  var CAS_SEKCIE = 1000;

  window.dataLayer = window.dataLayer || [];

  /* Stav, ktorý sa po výmene obsahu v nav.js vynuluje. */
  var videneSekcie = {};
  var dosiahnuteHranice = {};
  var sledovacSekcii = null;
  var sledovacObjavenia = null;
  var casovaceSekcii = [];

  function push(event, parametre) {
    var data = { event: event };
    var kluc;
    if (parametre) {
      for (kluc in parametre) {
        if (Object.prototype.hasOwnProperty.call(parametre, kluc)
          && parametre[kluc] !== undefined && parametre[kluc] !== null) {
          data[kluc] = parametre[kluc];
        }
      }
    }
    if (testovaciRezim) { data.test_mode = true; }
    window.dataLayer.push(data);
    if (cfg.debug) {
      /* eslint-disable-next-line no-console */
      console.log('[dataLayer]', data);
    }
  }

  /* --- Delegované kliky ----------------------------------------------- */
  function kliky() {
    document.addEventListener('click', function (e) {
      var spust = e.target.closest('[data-track]');
      if (!spust) { return; }
      var event = spust.getAttribute('data-track');
      var parametre = {};
      Array.prototype.forEach.call(spust.attributes, function (atr) {
        if (atr.name.indexOf('data-track-') === 0) {
          parametre[atr.name.slice('data-track-'.length)] = atr.value;
        }
      });
      push(event, parametre);
    });
  }

  /* --- Otvorenie častej otázky ---------------------------------------- */
  function otazky() {
    document.addEventListener('toggle', function (e) {
      var detail = e.target;
      if (!detail || detail.tagName !== 'DETAILS' || !detail.open) { return; }
      if (!detail.hasAttribute('data-faq-index')) { return; }
      push('faq_open', { faq_index: Number(detail.getAttribute('data-faq-index')) });
    }, true);
  }

  /* --- Zobrazenie sekcie ---------------------------------------------- */
  function sekcie() {
    if (!('IntersectionObserver' in window)) { return; }
    if (sledovacSekcii) { sledovacSekcii.disconnect(); }

    sledovacSekcii = new IntersectionObserver(function (zaznamy) {
      zaznamy.forEach(function (z) {
        var nazov = z.target.getAttribute('data-section');
        if (!nazov || videneSekcie[nazov]) { return; }

        if (z.isIntersecting) {
          var casovac = window.setTimeout(function () {
            if (videneSekcie[nazov]) { return; }
            videneSekcie[nazov] = true;
            push('section_view', { section: nazov });
            sledovacSekcii.unobserve(z.target);
          }, CAS_SEKCIE);
          z.target.__casovacSekcie = casovac;
          casovaceSekcii.push(casovac);
        } else if (z.target.__casovacSekcie) {
          window.clearTimeout(z.target.__casovacSekcie);
          z.target.__casovacSekcie = null;
        }
      });
    }, { threshold: PRAH_SEKCIE });

    document.querySelectorAll('[data-section]').forEach(function (sekcia) {
      sledovacSekcii.observe(sekcia);
    });
  }

  /* --- Hĺbka scrollovania --------------------------------------------- */
  function scroll() {
    function skontrolovat() {
      var vyska = document.documentElement.scrollHeight - window.innerHeight;
      /* Na krátkej stránke, kde sa dá scrollovať menej ako o pol obrazovky,
         by jediné potiahnutie naraz odpálilo všetky hranice. Taký údaj nič
         nehovorí, preto sa hĺbka na takých stránkach nemeria. */
      if (vyska < window.innerHeight / 2) { return; }
      var percent = (window.scrollY / vyska) * 100;
      HRANICE_SCROLLU.forEach(function (hranica) {
        if (percent >= hranica && !dosiahnuteHranice[hranica]) {
          dosiahnuteHranice[hranica] = true;
          push('scroll_depth', { percent: hranica });
        }
      });
    }

    var ceka = false;
    window.addEventListener('scroll', function () {
      if (ceka) { return; }
      ceka = true;
      window.requestAnimationFrame(function () {
        ceka = false;
        skontrolovat();
      });
    }, { passive: true });

    skontrolovat();
  }

  /* --- Postupné objavenie sekcií --------------------------------------
     Posun 20 px, 500 ms. Hlavný nadpis triedu objavit nikdy nedostane,
     aby sa neoneskoroval. Pri obmedzenom pohybe sa animácia vypne v CSS.
     ----------------------------------------------------------------- */
  function objavenie() {
    var prvky = document.querySelectorAll('.objavit:not(.je-videt)');
    if (!('IntersectionObserver' in window)) {
      prvky.forEach(function (p) { p.classList.add('je-videt'); });
      return;
    }
    if (sledovacObjavenia) { sledovacObjavenia.disconnect(); }

    sledovacObjavenia = new IntersectionObserver(function (zaznamy, sledovac) {
      zaznamy.forEach(function (z) {
        if (!z.isIntersecting) { return; }
        z.target.classList.add('je-videt');
        sledovac.unobserve(z.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    prvky.forEach(function (p) { sledovacObjavenia.observe(p); });
  }

  /* --- Nová stránka po výmene obsahu ---------------------------------- */
  function novaStranka() {
    videneSekcie = {};
    dosiahnuteHranice = {};
    casovaceSekcii.forEach(window.clearTimeout);
    casovaceSekcii = [];
    sekcie();
    objavenie();
  }

  function spustit() {
    kliky();
    otazky();
    scroll();
    sekcie();
    objavenie();
  }

  window.TACHE.track = {
    push: push,
    novaStranka: novaStranka,
    testovaciRezim: testovaciRezim
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spustit);
  } else {
    spustit();
  }
}());
