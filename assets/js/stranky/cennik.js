/* ==========================================================================
   Cenník – konfigurátor a objednávka.

   Krok 1 balík, krok 2 doplnky, krok 3 objednávka, súhrn vpravo. Všetky
   ceny chodia z packages.js, v HTML je len záložný text pre stav bez JS.

   Pravidlo ponuky vyššieho balíka je prevzaté z design/Cennik.dc.html:
   keď súčet doplnkov viazaných na aktuálny balík dosiahne 70 % rozdielu
   cien k vyššiemu balíku, oplatí sa rovno vyšší balík.

   Konverzia generate_lead sa pushuje až po ok: true zo servera, nikdy po
   kliku na tlačidlo. Rieši to forms.js.
   ========================================================================== */

window.TACHE = window.TACHE || {};
window.TACHE.pages = window.TACHE.pages || {};

(function () {
  'use strict';

  var KLUC_SUHRNU = 'tache_objednavka_v1';

  var data = null;
  var odpojit = [];
  var odpojitFormular = null;

  var stav = { balik: 'lead', doplnky: {} };
  var videnyUpsell = '';

  /* --- Výpočet ---------------------------------------------------------- */
  function vybraneDoplnky() {
    return data.doplnkyPre(stav.balik).filter(function (d) {
      return !!stav.doplnky[d.id];
    });
  }

  function suma() {
    var balik = data.balik(stav.balik);
    var zaBalik = data.cenaBalika(balik);
    var zaDoplnky = vybraneDoplnky().reduce(function (s, d) {
      return s + d.price;
    }, 0);
    var spolu = zaBalik + zaDoplnky;
    var zaloha = spolu * data.depositRatio;

    return {
      balik: balik,
      zaBalik: zaBalik,
      spolu: spolu,
      zaloha: zaloha,
      doplatok: spolu - zaloha
    };
  }

  /* --- Vykreslenie ------------------------------------------------------ */
  function vykresliBaliky() {
    document.querySelectorAll('[data-balik]').forEach(function (volba) {
      var vybrany = volba.getAttribute('data-balik') === stav.balik;
      volba.setAttribute('data-vybrane', vybrany ? 'ano' : 'nie');
      var prepinac = volba.querySelector('input');
      if (prepinac) { prepinac.checked = vybrany; }
    });
  }

  function vykresliDoplnky() {
    document.querySelectorAll('[data-doplnok]').forEach(function (prvok) {
      var id = prvok.getAttribute('data-doplnok');
      var only = prvok.getAttribute('data-only');
      var patri = only === '' || only === stav.balik;
      var zaskrtnuty = patri && !!stav.doplnky[id];

      prvok.hidden = !patri;
      prvok.setAttribute('data-vybrane', zaskrtnuty ? 'ano' : 'nie');

      var policko = prvok.querySelector('input');
      if (policko) { policko.checked = zaskrtnuty; }
    });
  }

  function vykresliUpsell() {
    var box = document.querySelector('[data-upsell]');
    if (!box) { return; }

    var dalsi = data.dalsiBalik(stav.balik);
    var rozdiel = dalsi
      ? data.cenaBalika(dalsi) - data.cenaBalika(data.balik(stav.balik))
      : 0;

    /* Počítajú sa len doplnky viazané práve na tento balík. Tie, ktoré sú
       pri všetkých balíkoch, vo vyššom balíku zadarmo nie sú. */
    var zaViazane = vybraneDoplnky().filter(function (d) {
      return d.only === stav.balik;
    }).reduce(function (s, d) { return s + d.price; }, 0);

    var ukazat = !!dalsi && zaViazane > 0
      && zaViazane >= data.upsellThreshold * rozdiel;

    box.hidden = !ukazat;
    if (!ukazat) { return; }

    box.querySelector('[data-upsell-text]').textContent =
      'Za ' + data.cena(rozdiel) + ' viac máte celý balík ' + dalsi.name
      + ' a tieto doplnky sú v ňom v cene.';
    box.querySelector('[data-upsell-tlacidlo]').textContent =
      'Prepnúť na ' + dalsi.name;

    var dvojica = stav.balik + '>' + dalsi.id;
    if (videnyUpsell !== dvojica) {
      videnyUpsell = dvojica;
      window.TACHE.track.push('upsell_view', {
        from_package: stav.balik,
        to_package: dalsi.id
      });
    }
  }

  function vykresliSuhrn() {
    var s = suma();

    document.querySelectorAll('[data-nazov-balika]').forEach(function (p) {
      p.textContent = s.balik.name;
    });

    var nastav = function (vyber, text) {
      var prvok = document.querySelector(vyber);
      if (prvok) { prvok.textContent = text; }
    };

    nastav('[data-suhrn-balik]', data.cena(s.zaBalik));
    nastav('[data-suhrn-spolu]', data.cena(s.spolu));
    nastav('[data-suhrn-mini]', data.cena(s.spolu));
    nastav('[data-suhrn-zaloha]', data.cena(s.zaloha));
    nastav('[data-suhrn-doplatok]', data.cena(s.doplatok));
    nastav('[data-suhrn-dni]', 'Hotové do ' + s.balik.days);

    var zoznam = document.querySelector('[data-suhrn-doplnky]');
    if (!zoznam) { return; }
    zoznam.textContent = '';

    vybraneDoplnky().forEach(function (d) {
      var riadok = document.createElement('div');
      riadok.className = 'suhrn__doplnok';

      var nazov = document.createElement('dt');
      nazov.textContent = d.name;
      var cena = document.createElement('dd');
      cena.textContent = data.cena(d.price);

      riadok.appendChild(nazov);
      riadok.appendChild(cena);
      zoznam.appendChild(riadok);
    });
  }

  function vykresli() {
    vykresliBaliky();
    vykresliDoplnky();
    vykresliUpsell();
    vykresliSuhrn();
  }

  /* --- Zmeny výberu ------------------------------------------------------ */
  function nastavBalik(id, zdroj) {
    if (!data.balik(id) || id === stav.balik) { return; }
    stav.balik = id;
    /* Pri zmene balíka sa doplnky vynulujú. */
    stav.doplnky = {};
    videnyUpsell = '';
    vykresli();

    if (zdroj !== 'url') {
      window.TACHE.track.push('package_select', { package_id: id });
    }
  }

  function pripojVolby() {
    function naZmenu(e) {
      var prepinac = e.target.closest('input[name="balik"]');
      if (prepinac) {
        nastavBalik(prepinac.value);
        return;
      }

      var policko = e.target.closest('.doplnok input');
      if (!policko) { return; }

      var id = policko.value;
      stav.doplnky[id] = policko.checked;

      /* Najprv sa ohlási zaškrtnutie, až potom sa prekreslí. Vykreslenie
         môže pushnúť upsell_view a ten má prísť až po doplnku, ktorý ho
         vyvolal. */
      window.TACHE.track.push('addon_toggle', {
        addon_id: id,
        state: policko.checked ? 'on' : 'off'
      });

      vykresli();
    }

    document.addEventListener('change', naZmenu);
    odpojit.push(function () {
      document.removeEventListener('change', naZmenu);
    });

    var tlacidlo = document.querySelector('[data-upsell-tlacidlo]');
    if (tlacidlo) {
      var naUpsell = function () {
        var dalsi = data.dalsiBalik(stav.balik);
        if (!dalsi) { return; }
        window.TACHE.track.push('upsell_accept', {
          from_package: stav.balik,
          to_package: dalsi.id
        });
        nastavBalik(dalsi.id, 'upsell');
      };
      tlacidlo.addEventListener('click', naUpsell);
      odpojit.push(function () {
        tlacidlo.removeEventListener('click', naUpsell);
      });
    }
  }

  /* --- Objednávka bez IČO ------------------------------------------------
     Keď je pole Firma alebo IČO prázdne, objednáva spotrebiteľ a musí
     potvrdiť začatie práce pred uplynutím 14-dňovej lehoty.
     -------------------------------------------------------------------- */
  function pripojSpotrebitela(form) {
    var firma = form.querySelector('[name="firma"]');
    var blok = form.querySelector('[data-spotrebitel]');
    if (!firma || !blok) { return; }

    var policko = blok.querySelector('input');

    function prekresli() {
      var spotrebitel = !firma.value.trim();
      blok.hidden = !spotrebitel;
      if (policko) { policko.required = spotrebitel; }
    }

    firma.addEventListener('input', prekresli);
    odpojit.push(function () {
      firma.removeEventListener('input', prekresli);
    });

    prekresli();
  }

  /* --- Formulár objednávky ----------------------------------------------- */
  function pripojFormular() {
    var form = document.getElementById('formular-objednavka');
    if (!form) { return; }

    pripojSpotrebitela(form);

    odpojitFormular = window.TACHE.forms.pripojit(form, {
      typ: 'order',
      event: 'generate_lead',

      /* Do dataLayeru ide hodnota objednávky, nie len cena balíka. */
      parametre: function () {
        var s = suma();
        return {
          package_id: stav.balik,
          value: s.spolu,
          currency: 'EUR',
          founder_price: data.zakladatelska()
        };
      },

      hotovo: function (odpoved, poslane) {
        var s = suma();

        /* Súhrn si prečíta stránka /dakujem. */
        try {
          window.sessionStorage.setItem(KLUC_SUHRNU, JSON.stringify({
            cislo: odpoved.cislo || '',
            balik: { id: s.balik.id, nazov: s.balik.name, cena: s.zaBalik },
            doplnky: vybraneDoplnky().map(function (d) {
              return { id: d.id, nazov: d.name, cena: d.price };
            }),
            spolu: s.spolu,
            zaloha: s.zaloha,
            doplatok: s.doplatok,
            email: poslane.email,
            event_id: poslane.event_id
          }));
        } catch (e) { /* bez úložiska ukáže /dakujem všeobecné znenie */ }

        /* Testovací režim: nič sa neodoslalo, ukážeme potvrdenie na mieste. */
        if (odpoved.test || !odpoved.cislo) {
          var hotovo = document.querySelector('[data-hotovo="order"]');
          form.hidden = true;
          if (hotovo) {
            hotovo.hidden = false;
            var nadpis = hotovo.querySelector('h3');
            if (nadpis) {
              nadpis.setAttribute('tabindex', '-1');
              nadpis.focus();
            }
          }
          return;
        }

        /* Ostro: /dakujem sa načíta normálne, nie cez nav.js. */
        window.location.assign('/dakujem?o=' + encodeURIComponent(odpoved.cislo));
      }
    });
  }

  /* --- Štart -------------------------------------------------------------- */
  function init() {
    data = window.TACHE.data;
    if (!data) { return; }

    stav = { balik: 'lead', doplnky: {} };
    videnyUpsell = '';

    /* Balík z adresy, napríklad /cennik?balik=start z tlačidiel na domove. */
    try {
      var zAdresy = new URLSearchParams(window.location.search).get('balik');
      if (zAdresy && data.balik(zAdresy)) { stav.balik = zAdresy; }
    } catch (e) { /* stará URLSearchParams, ostane predvolený balík */ }

    vykresli();
    pripojVolby();
    pripojFormular();
  }

  function destroy() {
    odpojit.forEach(function (f) { f(); });
    odpojit = [];

    if (odpojitFormular) {
      odpojitFormular();
      odpojitFormular = null;
    }
  }

  window.TACHE.pages.cennik = { init: init, destroy: destroy };
}());
