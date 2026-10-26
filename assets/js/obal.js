/* ==========================================================================
   Obal – hlavička, pätička, mobilné menu a doplnenie hodnôt z configu
   a z packages.js do HTML.

   Kontrakt atribútov v HTML:
     data-config="email"        text prvku = hodnota z configu
     data-mailto                href = mailto: z configu
     data-text="slots-veta"     odvodený text (skloňovanie, živnosť, rok)
     data-price="lead.founder"  cena z packages.js
     data-if="blogEnabled"      prvok sa odkryje, len keď je prepínač true
     data-prazdne="obal"        pri prázdnej hodnote sa odstráni rodič

   Pravidlo z CLAUDE.md: prázdna hodnota v configu znamená, že sa prvok
   nevykreslí. Preto sa prvok s prázdnou hodnotou z DOM odstráni.
   ========================================================================== */

window.TACHE = window.TACHE || {};

(function () {
  'use strict';

  var cfg = window.TACHE.config;

  /* --- Skloňovanie voľných miest --------------------------------------
     1 miesto, 2 až 4 miesta, 5 a viac miest.
     ----------------------------------------------------------------- */
  function vetaOMiestach(n) {
    if (n <= 0) { return ''; }
    if (n === 1) { return 'Zostáva 1 miesto'; }
    if (n < 5) { return 'Zostávajú ' + n + ' miesta'; }
    return 'Zostáva ' + n + ' miest';
  }

  /* --- Údaje o živnosti do pätičky ------------------------------------
     Riadky, ku ktorým chýbajú údaje, sa vynechajú.
     ----------------------------------------------------------------- */
  function udajeZivnosti() {
    var riadky = [];
    riadky.push(cfg.owner + (cfg.businessAddress ? ', ' + cfg.businessAddress : ''));
    if (cfg.ico) { riadky.push('IČO: ' + cfg.ico); }
    if (cfg.tradeRegister) {
      riadky.push('Zapísaný v živnostenskom registri ' + cfg.tradeRegister);
    }
    if (!cfg.vatPayer) { riadky.push('Nie som platca DPH.'); }
    return riadky;
  }

  function odvodenyText(kluc) {
    var data = window.TACHE.data;
    switch (kluc) {
      case 'slots-veta':
        return vetaOMiestach(cfg.founderSlotsLeft);
      case 'slots-pocet':
        return cfg.founderSlotsLeft > 0 ? String(cfg.founderSlotsLeft) : '';
      case 'slots-celkom':
        return String(cfg.founderSlotsTotal);
      case 'rok':
        return String(new Date().getFullYear());
      case 'cena-od':
        return data ? data.cena(data.packages[0].regular) : '';
      default:
        return '';
    }
  }

  /* --- Cena podľa data-price="balik.pole" ----------------------------- */
  function cenaZKluca(kluc) {
    var data = window.TACHE.data;
    if (!data) { return ''; }
    var casti = kluc.split('.');
    var b = data.balik(casti[0]);
    if (b) {
      if (casti[1] === 'aktualna') { return data.cena(data.cenaBalika(b)); }
      if (typeof b[casti[1]] === 'number') { return data.cena(b[casti[1]]); }
      return '';
    }
    if (casti[0] === 'pausal' && typeof data.retainers[casti[1]] === 'number') {
      return data.cena(data.retainers[casti[1]]);
    }
    var d = data.doplnok(casti[0]);
    if (d) { return data.cena(d.price); }
    return '';
  }

  function odstranit(prvok) {
    var cil = prvok.getAttribute('data-prazdne') === 'obal'
      ? prvok.parentNode
      : prvok;
    if (cil && cil.parentNode) { cil.parentNode.removeChild(cil); }
  }

  /* --- Doplnenie hodnôt do časti stránky -----------------------------
     nav.js to volá znova po každej výmene obsahu.
     ----------------------------------------------------------------- */
  function vyplnit(korene) {
    var root = korene || document;

    root.querySelectorAll('[data-config]').forEach(function (prvok) {
      var hodnota = cfg[prvok.getAttribute('data-config')];
      if (hodnota === '' || hodnota === null || hodnota === undefined) {
        odstranit(prvok);
        return;
      }
      prvok.textContent = String(hodnota);
    });

    root.querySelectorAll('[data-mailto]').forEach(function (prvok) {
      if (!cfg.email) {
        odstranit(prvok);
        return;
      }
      prvok.setAttribute('href', 'mailto:' + cfg.email);
    });

    root.querySelectorAll('[data-text]').forEach(function (prvok) {
      var text = odvodenyText(prvok.getAttribute('data-text'));
      if (!text) {
        odstranit(prvok);
        return;
      }
      prvok.textContent = text;
    });

    root.querySelectorAll('[data-price]').forEach(function (prvok) {
      var text = cenaZKluca(prvok.getAttribute('data-price'));
      if (text) { prvok.textContent = text; }
    });

    /* Údaje o živnosti ako viacriadkový odstavec. */
    root.querySelectorAll('[data-zivnost]').forEach(function (prvok) {
      var riadky = udajeZivnosti();
      prvok.textContent = '';
      riadky.forEach(function (riadok, i) {
        if (i > 0) { prvok.appendChild(document.createElement('br')); }
        prvok.appendChild(document.createTextNode(riadok));
      });
    });

    /* Zakladateľské ceny. Pri 0 voľných miestach sa všetky zmienky o nich
       odstránia a ukáže sa znenie pre bežné ceny, ktoré je v HTML skryté. */
    var suMiesta = (cfg.founderSlotsLeft || 0) > 0;

    root.querySelectorAll('[data-zakladatelska]').forEach(function (prvok) {
      if (!suMiesta) { odstranit(prvok); }
    });

    root.querySelectorAll('[data-bez-zakladatelskej]').forEach(function (prvok) {
      if (suMiesta) { odstranit(prvok); } else { prvok.removeAttribute('hidden'); }
    });

    /* Prepínače sekcií. V HTML sú tieto prvky skryté atribútom hidden. */
    root.querySelectorAll('[data-if]').forEach(function (prvok) {
      if (cfg[prvok.getAttribute('data-if')]) { prvok.removeAttribute('hidden'); }
    });

    root.querySelectorAll('[data-if-not]').forEach(function (prvok) {
      if (!cfg[prvok.getAttribute('data-if-not')]) { prvok.removeAttribute('hidden'); }
    });
  }

  /* --- Aktívna položka menu -------------------------------------------
     Nie je v HTML, aby bola hlavička vo všetkých súboroch úplne rovnaká
     a dala sa overiť grepom. Vyznačí sa odtiaľto podľa atribútu
     data-nav-active na prvku <main>. Bez JS sa aktívna položka nevyznačí,
     čo je len vizuálna vec.
     ----------------------------------------------------------------- */
  function aktivneMenu(nazov) {
    var aktivna = nazov;
    if (aktivna === undefined) {
      var main = document.querySelector('main');
      aktivna = main ? main.getAttribute('data-nav-active') : null;
    }

    document.querySelectorAll('[data-nav]').forEach(function (odkaz) {
      if (aktivna && odkaz.getAttribute('data-nav') === aktivna) {
        odkaz.setAttribute('aria-current', 'page');
      } else {
        odkaz.removeAttribute('aria-current');
      }
    });
  }

  /* --- Mobilné menu ---------------------------------------------------
     Panel je v bežnom toku pod hlavičkou, nie je to prekrytie, preto
     nepotrebuje uzavretie fokusu. Zatvára ho tá istá ikona, Esc
     a klik mimo panela.
     ----------------------------------------------------------------- */
  function mobilneMenu() {
    var prepinac = document.querySelector('.menu__prepinac');
    var panel = document.getElementById('menu-panel');
    if (!prepinac || !panel) { return; }

    function nastavit(otvorene) {
      panel.setAttribute('data-otvorene', otvorene ? 'ano' : 'nie');
      prepinac.setAttribute('aria-expanded', otvorene ? 'true' : 'false');
      prepinac.setAttribute(
        'aria-label',
        otvorene ? 'Zatvoriť menu' : 'Otvoriť menu'
      );
    }

    prepinac.addEventListener('click', function () {
      var otvorene = prepinac.getAttribute('aria-expanded') === 'true';
      nastavit(!otvorene);
      if (!otvorene) {
        var prvy = panel.querySelector('a');
        if (prvy) { prvy.focus(); }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && prepinac.getAttribute('aria-expanded') === 'true') {
        nastavit(false);
        prepinac.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (prepinac.getAttribute('aria-expanded') !== 'true') { return; }
      if (panel.contains(e.target) || prepinac.contains(e.target)) { return; }
      nastavit(false);
    });

    /* Po prechode na inú stránku sa menu zatvorí. */
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nastavit(false); }
    });
  }

  /* --- Pruh testovacieho režimu --------------------------------------
     Vykreslí sa, len keď je formEndpoint prázdny, teda sa nič neodosiela.
     ----------------------------------------------------------------- */
  function pruhTestu() {
    if (cfg.formEndpoint) { return; }
    var pruh = document.createElement('p');
    pruh.className = 'pruh-test';
    pruh.setAttribute('role', 'status');
    pruh.textContent = 'Testovací režim: nič sa neodosiela.';
    document.body.insertBefore(pruh, document.body.firstChild);
  }

  function spustit() {
    vyplnit(document);
    aktivneMenu();
    mobilneMenu();
    pruhTestu();
  }

  window.TACHE.obal = {
    vyplnit: vyplnit,
    aktivneMenu: aktivneMenu
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spustit);
  } else {
    spustit();
  }
}());
