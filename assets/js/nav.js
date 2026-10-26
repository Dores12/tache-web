/* ==========================================================================
   Navigácia bez načítania stránky (CLAUDE.md sekcia 6).

   Pri kliku na interný odkaz stiahne cieľové HTML, vymení len obsah <main>
   a aktualizuje hlavičku dokumentu. Je to vylepšenie nad bežnými stránkami,
   nesmie zhoršiť SEO ani meranie, preto každá stránka existuje aj ako
   samostatný HTML súbor a funguje aj bez tohto skriptu.

   Skripty stránok sa hlásia do window.TACHE.pages a vystavujú init()
   a destroy(). Ktorý skript sa má načítať, hovorí atribút data-skript
   na prvku <main>, takže tu netreba udržiavať žiadny zoznam stránok.

     <main data-page="cennik" data-skript="cennik" data-nav-active="cennik">
   ========================================================================== */

window.TACHE = window.TACHE || {};
window.TACHE.pages = window.TACHE.pages || {};

(function () {
  'use strict';

  var MAX_CACHE = 10;

  /* Stránka, ktorá sa načíta vždy normálne: po objednávke sa z nej číta
     sessionStorage a vykresľuje QR kód. */
  var VZDY_NORMALNE = ['/dakujem'];

  var cache = new Map();
  var nacitaneSkripty = {};
  var aktualnaStranka = null;
  var oznamovac = null;

  function obmedzitPohyb() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function cestaBezLomky(cesta) {
    return cesta.length > 1 && cesta.charAt(cesta.length - 1) === '/'
      ? cesta.slice(0, -1)
      : cesta;
  }

  /* --- Ktoré odkazy sa nechávajú na prehliadač ------------------------- */
  function obsluzitSami(odkaz, e) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) {
      return false;
    }
    if (odkaz.target || odkaz.hasAttribute('download')
      || odkaz.hasAttribute('data-reload')) {
      return false;
    }

    var url;
    try {
      url = new URL(odkaz.href, window.location.href);
    } catch (chyba) {
      return false;
    }

    if (url.origin !== window.location.origin) { return false; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') { return false; }

    var cesta = cestaBezLomky(url.pathname);
    if (VZDY_NORMALNE.indexOf(cesta) !== -1) { return false; }

    /* Súbory s príponou, napríklad PDF alebo obrázok. */
    var poslednyUsek = cesta.split('/').pop();
    if (poslednyUsek.indexOf('.') !== -1 && !/\.html?$/.test(poslednyUsek)) {
      return false;
    }

    /* Kotva na tej istej stránke necháme prehliadaču. */
    if (cesta === cestaBezLomky(window.location.pathname) && url.hash) {
      return false;
    }

    return true;
  }

  /* --- Stiahnutie stránky --------------------------------------------- */
  function stiahnut(url) {
    if (cache.has(url)) { return Promise.resolve(cache.get(url)); }

    return window.fetch(url, { credentials: 'same-origin' })
      .then(function (odpoved) {
        if (!odpoved.ok) { throw new Error('HTTP ' + odpoved.status); }
        return odpoved.text();
      })
      .then(function (html) {
        if (cache.size >= MAX_CACHE) {
          cache.delete(cache.keys().next().value);
        }
        cache.set(url, html);
        return html;
      });
  }

  function prednacitat(url) {
    if (cache.has(url)) { return; }
    stiahnut(url).catch(function () { /* ticho, je to len prednačítanie */ });
  }

  /* --- Skript stránky -------------------------------------------------- */
  function nacitatSkript(nazov) {
    if (!nazov) { return Promise.resolve(); }
    if (window.TACHE.pages[nazov]) { return Promise.resolve(); }
    if (nacitaneSkripty[nazov]) { return nacitaneSkripty[nazov]; }

    nacitaneSkripty[nazov] = new Promise(function (hotovo) {
      var skript = document.createElement('script');
      skript.src = '/assets/js/stranky/' + nazov + '.js';
      skript.defer = true;
      skript.addEventListener('load', function () { hotovo(); });
      skript.addEventListener('error', function () { hotovo(); });
      document.head.appendChild(skript);
    });

    return nacitaneSkripty[nazov];
  }

  /* --- Hlavička dokumentu --------------------------------------------- */
  function metaObsah(dokument, selektor) {
    var prvok = dokument.querySelector(selektor);
    return prvok ? prvok.getAttribute('content') : null;
  }

  function nastavitMeta(selektor, hodnota, vyrobit) {
    var prvok = document.querySelector(selektor);
    if (hodnota === null) {
      if (prvok && prvok.parentNode) { prvok.parentNode.removeChild(prvok); }
      return;
    }
    if (!prvok) {
      prvok = vyrobit();
      document.head.appendChild(prvok);
    }
    prvok.setAttribute('content', hodnota);
  }

  function metaPrvok(atribut, nazov) {
    var prvok = document.createElement('meta');
    prvok.setAttribute(atribut, nazov);
    return prvok;
  }

  function aktualizovatHlavicku(novy, url) {
    document.title = novy.title;

    nastavitMeta(
      'meta[name="description"]',
      metaObsah(novy, 'meta[name="description"]'),
      function () { return metaPrvok('name', 'description'); }
    );
    nastavitMeta(
      'meta[name="robots"]',
      metaObsah(novy, 'meta[name="robots"]'),
      function () { return metaPrvok('name', 'robots'); }
    );
    nastavitMeta(
      'meta[property="og:title"]',
      metaObsah(novy, 'meta[property="og:title"]'),
      function () { return metaPrvok('property', 'og:title'); }
    );
    nastavitMeta(
      'meta[property="og:description"]',
      metaObsah(novy, 'meta[property="og:description"]'),
      function () { return metaPrvok('property', 'og:description'); }
    );
    nastavitMeta(
      'meta[property="og:url"]',
      metaObsah(novy, 'meta[property="og:url"]'),
      function () { return metaPrvok('property', 'og:url'); }
    );

    var canonical = document.querySelector('link[rel="canonical"]');
    var novyCanonical = novy.querySelector('link[rel="canonical"]');
    if (novyCanonical) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', novyCanonical.getAttribute('href'));
    } else if (canonical && canonical.parentNode) {
      canonical.parentNode.removeChild(canonical);
    }

    if (window.TACHE.config.debug && !novy.querySelector('link[rel="canonical"]')) {
      /* eslint-disable-next-line no-console */
      console.warn('[nav] stránka bez canonical:', url);
    }
  }

  /* --- Prístupnosť po výmene ------------------------------------------- */
  function oznamit(nazov) {
    if (!oznamovac) {
      oznamovac = document.getElementById('oznamovac');
    }
    if (oznamovac) { oznamovac.textContent = nazov; }
  }

  function presunutFokus(main, hash) {
    if (hash) {
      var cil = document.getElementById(hash.slice(1));
      if (cil) {
        if (!cil.hasAttribute('tabindex')) { cil.setAttribute('tabindex', '-1'); }
        cil.focus({ preventScroll: true });
        cil.scrollIntoView({ behavior: obmedzitPohyb() ? 'auto' : 'smooth' });
        return;
      }
    }

    window.scrollTo(0, 0);
    var nadpis = main.querySelector('h1');
    if (nadpis) {
      nadpis.setAttribute('tabindex', '-1');
      nadpis.focus({ preventScroll: true });
    }
  }

  /* --- Výmena obsahu --------------------------------------------------- */
  function vymenit(html, url, hash) {
    var novy = new DOMParser().parseFromString(html, 'text/html');
    var novyMain = novy.querySelector('main');
    var staryMain = document.querySelector('main');

    if (!novyMain || !staryMain) {
      window.location.assign(url);
      return Promise.resolve();
    }

    /* Starý skript stránky si po sebe uklidí. */
    if (aktualnaStranka && window.TACHE.pages[aktualnaStranka]
      && typeof window.TACHE.pages[aktualnaStranka].destroy === 'function') {
      window.TACHE.pages[aktualnaStranka].destroy();
    }

    function prehodit() {
      staryMain.replaceWith(novyMain);
      aktualizovatHlavicku(novy, url);
      window.TACHE.obal.aktivneMenu(novyMain.getAttribute('data-nav-active'));
      window.TACHE.obal.vyplnit(novyMain);
    }

    var prechod = (document.startViewTransition && !obmedzitPohyb())
      ? document.startViewTransition(prehodit).finished
      : Promise.resolve(prehodit());

    return prechod.then(function () {
      var nazovStranky = novyMain.getAttribute('data-skript');
      aktualnaStranka = nazovStranky;

      return nacitatSkript(nazovStranky).then(function () {
        var stranka = nazovStranky && window.TACHE.pages[nazovStranky];
        if (stranka && typeof stranka.init === 'function') { stranka.init(); }

        presunutFokus(novyMain, hash);
        oznamit(document.title.split('|')[0].trim());
        window.TACHE.track.novaStranka();

        window.TACHE.track.push('virtual_page_view', {
          page_path: window.location.pathname + window.location.search,
          page_title: document.title,
          page_location: window.location.href
        });
      });
    });
  }

  function prejst(url, hash, pridatDoHistorie) {
    return stiahnut(url)
      .then(function (html) {
        if (pridatDoHistorie) {
          window.history.pushState({ tache: true }, '', url + (hash || ''));
        }
        return vymenit(html, url, hash);
      })
      .catch(function () {
        /* Pri akejkoľvek chybe sa stránka načíta normálne. */
        window.location.assign(url + (hash || ''));
      });
  }

  /* --- Poslucháče ------------------------------------------------------ */
  function spustit() {
    var main = document.querySelector('main');
    aktualnaStranka = main ? main.getAttribute('data-skript') : null;

    document.addEventListener('click', function (e) {
      var odkaz = e.target.closest('a[href]');
      if (!odkaz || !obsluzitSami(odkaz, e)) { return; }

      var url = new URL(odkaz.href, window.location.href);
      e.preventDefault();
      prejst(url.origin + url.pathname + url.search, url.hash, true);
    });

    /* Prednačítanie pri nabehnutí myšou alebo dotyku. */
    function pripravit(e) {
      var odkaz = e.target.closest ? e.target.closest('a[href]') : null;
      if (!odkaz || !obsluzitSami(odkaz, null)) { return; }
      var url = new URL(odkaz.href, window.location.href);
      prednacitat(url.origin + url.pathname + url.search);
    }

    document.addEventListener('pointerenter', pripravit, true);
    document.addEventListener('touchstart', pripravit, { passive: true });

    window.addEventListener('popstate', function () {
      prejst(
        window.location.origin + window.location.pathname + window.location.search,
        window.location.hash,
        false
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spustit);
  } else {
    spustit();
  }
}());
