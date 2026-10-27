/* ==========================================================================
   Dotazník.

   Odkaz je osobný. Token z adresy overí Apps Script, a kým ho nepotvrdí,
   dotazník sa nezobrazí. Bez platného tokenu je na stránke len hláška
   a e-mail.

   Rozpracované odpovede sa ukladajú do localStorage pod kľúčom podľa
   tokenu, takže sa dá prestať a vrátiť sa cez ten istý odkaz. Ukladá sa
   priebežne pri písaní, nie až pri prechode na ďalší krok.

   Krok 8 o reklame sa zobrazí len pri balíku Na kľúč alebo pri doplnku
   reklamy. Hovorí to odpoveď z overenia tokenu.

   Žiadne pole nie je povinné. Čo klient nevyplní, označí sa v zadaní pre
   Claude Code ako chýbajúce.
   ========================================================================== */

window.TACHE = window.TACHE || {};
window.TACHE.pages = window.TACHE.pages || {};

(function () {
  'use strict';

  var PREDPONA_KLUCA = 'tache_dotaznik_';
  var PAUZA_ULOZENIA = 600;

  var odpojit = [];
  var odpojitFormular = null;

  var form = null;
  var token = '';
  var kroky = [];          // viditeľné kroky, čísla sekcií
  var aktualny = 0;        // index v poli kroky
  var casovacUlozenia = null;

  /* --- Token a úložisko -------------------------------------------------- */
  function tokenZAdresy() {
    try {
      return new URLSearchParams(window.location.search).get('t') || '';
    } catch (e) {
      return '';
    }
  }

  function kluc() {
    return PREDPONA_KLUCA + token;
  }

  function nacitajOdpovede() {
    try {
      var ulozene = window.localStorage.getItem(kluc());
      return ulozene ? JSON.parse(ulozene) : {};
    } catch (e) {
      return {};
    }
  }

  function ulozOdpovede() {
    var data = {};
    new FormData(form).forEach(function (hodnota, nazov) {
      if (nazov !== 't_hp' && nazov !== 'token') { data[nazov] = hodnota; }
    });

    try {
      window.localStorage.setItem(kluc(), JSON.stringify(data));
      oznam('Uložené');
    } catch (e) {
      oznam('Uložiť sa nepodarilo, nechajte si okno otvorené.');
    }
  }

  function oznam(text) {
    var miesto = form.querySelector('[data-ulozene]');
    if (miesto) { miesto.textContent = text; }
  }

  function vyplnUlozene() {
    var data = nacitajOdpovede();

    Object.keys(data).forEach(function (nazov) {
      var polia = form.querySelectorAll('[name="' + nazov + '"]');
      if (!polia.length) { return; }

      if (polia[0].type === 'radio') {
        polia.forEach(function (pole) {
          pole.checked = pole.value === data[nazov];
        });
        return;
      }
      polia[0].value = data[nazov];
    });

    oznacVolby();
  }

  /* --- Karty s voľbami ---------------------------------------------------- */
  function oznacVolby() {
    form.querySelectorAll('[data-volba]').forEach(function (volba) {
      var prepinac = volba.querySelector('input');
      volba.setAttribute('data-vybrane',
        prepinac && prepinac.checked ? 'ano' : 'nie');
    });
  }

  /* --- Kroky --------------------------------------------------------------- */
  function sekcia(cislo) {
    return form.querySelector('[data-krok="' + cislo + '"]');
  }

  function vykresliKrok() {
    var cislo = kroky[aktualny];

    form.querySelectorAll('[data-krok]').forEach(function (prvok) {
      prvok.hidden = Number(prvok.getAttribute('data-krok')) !== cislo;
    });

    /* Poradie počítame z viditeľných krokov, nie z ich čísel. */
    var poradie = aktualny + 1;
    var spolu = kroky.length;

    form.querySelector('[data-cislo-kroku]').textContent = String(poradie);
    form.querySelector('[data-pocet-krokov]').textContent = String(spolu);
    form.querySelector('[data-postup]').style.width =
      Math.round((poradie / spolu) * 100) + '%';

    var nazov = sekcia(cislo).querySelector('h1').textContent;
    var prepinac = form.querySelector('[data-nazov-kroku]');
    if (prepinac) {
      prepinac.textContent = 'Krok ' + poradie + ' z ' + spolu + ': ' + nazov;
    }

    /* Zoznam krokov vľavo. */
    form.querySelectorAll('[data-krok-polozka]').forEach(function (polozka) {
      var cisloPolozky = Number(polozka.getAttribute('data-krok-polozka'));
      var index = kroky.indexOf(cisloPolozky);

      polozka.hidden = index === -1;
      if (index === -1) { return; }

      var stav = index < aktualny ? 'hotovy'
        : (index === aktualny ? 'aktualny' : 'dalsi');
      polozka.setAttribute('data-stav', stav);

      var tlacidlo = polozka.querySelector('button');
      /* Dopredu sa dá preskočiť len na už navštívený krok. */
      tlacidlo.disabled = index > aktualny;
      if (index === aktualny) {
        tlacidlo.setAttribute('aria-current', 'step');
      } else {
        tlacidlo.removeAttribute('aria-current');
      }
    });

    /* Tlačidlá dole. */
    var poslednyKrok = aktualny === kroky.length - 1;
    form.querySelector('[data-spat]').hidden = aktualny === 0;
    form.querySelector('[data-dalej]').hidden = poslednyKrok;
    form.querySelector('[data-odoslat]').hidden = !poslednyKrok;

    var spat = form.querySelector('[data-spat]');
    if (aktualny > 0) {
      spat.textContent = 'Späť na '
        + sekcia(kroky[aktualny - 1]).querySelector('h1').textContent;
    }
  }

  function prejdiNaKrok(index, zFokusom) {
    if (index < 0 || index >= kroky.length) { return; }

    var predtym = aktualny;
    aktualny = index;
    vykresliKrok();

    if (zFokusom) {
      var nadpis = sekcia(kroky[aktualny]).querySelector('h1');
      nadpis.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }

    /* Hlásime len postup dopredu, návrat späť nie je dokončený krok. */
    if (index > predtym) {
      window.TACHE.track.push('questionnaire_step', { step: predtym + 1 });
    }
  }

  /* --- Zapojenie ------------------------------------------------------------ */
  function pripoj(prvok, udalost, funkcia, volby) {
    prvok.addEventListener(udalost, funkcia, volby);
    odpojit.push(function () {
      prvok.removeEventListener(udalost, funkcia, volby);
    });
  }

  function zapojFormular() {
    /* Priebežné ukladanie, aby sa nič nestratilo. */
    pripoj(form, 'input', function () {
      oznam('');
      window.clearTimeout(casovacUlozenia);
      casovacUlozenia = window.setTimeout(ulozOdpovede, PAUZA_ULOZENIA);
    });

    pripoj(form, 'change', function (e) {
      if (e.target.type === 'radio') { oznacVolby(); }
      ulozOdpovede();
    });

    pripoj(form.querySelector('[data-dalej]'), 'click', function () {
      ulozOdpovede();
      prejdiNaKrok(aktualny + 1, true);
    });

    pripoj(form.querySelector('[data-spat]'), 'click', function () {
      ulozOdpovede();
      prejdiNaKrok(aktualny - 1, true);
    });

    form.querySelectorAll('[data-skok]').forEach(function (tlacidlo) {
      pripoj(tlacidlo, 'click', function () {
        var index = kroky.indexOf(Number(tlacidlo.getAttribute('data-skok')));
        if (index === -1 || index > aktualny) { return; }
        ulozOdpovede();
        zatvorZoznam();
        prejdiNaKrok(index, true);
      });
    });

    /* Zbalený zoznam krokov na mobile. */
    var zoznam = form.querySelector('.kroky-zoznam');
    var prepinac = form.querySelector('.kroky-zoznam__prepinac');
    if (prepinac) {
      pripoj(prepinac, 'click', function () {
        var otvorene = zoznam.getAttribute('data-otvorene') === 'ano';
        zoznam.setAttribute('data-otvorene', otvorene ? 'nie' : 'ano');
        prepinac.setAttribute('aria-expanded', otvorene ? 'false' : 'true');
      });
    }

    odpojitFormular = window.TACHE.forms.pripojit(form, {
      typ: 'questionnaire',
      event: 'questionnaire_submit',
      hotovo: function () {
        /* Rozpracované odpovede už netreba držať. */
        try { window.localStorage.removeItem(kluc()); } catch (e) { /* nič */ }

        form.hidden = true;
        var hotovo = document.querySelector('[data-hotovo="questionnaire"]');
        if (hotovo) {
          hotovo.hidden = false;
          var nadpis = hotovo.querySelector('h2');
          if (nadpis) { nadpis.focus(); }
        }
        window.scrollTo(0, 0);
      }
    });
  }

  function zatvorZoznam() {
    var zoznam = form.querySelector('.kroky-zoznam');
    var prepinac = form.querySelector('.kroky-zoznam__prepinac');
    if (!zoznam) { return; }
    zoznam.setAttribute('data-otvorene', 'nie');
    if (prepinac) { prepinac.setAttribute('aria-expanded', 'false'); }
  }

  /* --- Overenie tokenu ------------------------------------------------------ */
  /* Viditeľnosť rieši trieda na <html>, ktorú nasadila hlavička stránky.
     Tu sa už len odoberie, keď sa token neoveril. */
  function ukaz(sTokenom) {
    document.documentElement.classList.toggle('ma-token', sTokenom);
  }

  function spustiDotaznik(udaje) {
    var cislo = document.querySelector('[data-cislo]');
    if (cislo && udaje.cislo) { cislo.textContent = udaje.cislo; }

    var poleTokenu = form.querySelector('[data-token]');
    if (poleTokenu) { poleTokenu.value = token; }

    /* Krok 8 je o reklame a nie každý ho vypĺňa. */
    kroky = [];
    form.querySelectorAll('[data-krok]').forEach(function (prvok) {
      var cisloKroku = Number(prvok.getAttribute('data-krok'));
      if (prvok.getAttribute('data-kluc') === 'reklama' && !udaje.reklama) {
        return;
      }
      kroky.push(cisloKroku);
    });

    ukaz(true);
    vyplnUlozene();
    zapojFormular();
    prejdiNaKrok(0, false);
  }

  function overToken() {
    var endpoint = window.TACHE.config.formEndpoint;

    /* Testovací režim: backend nemáme, dotazník ukážeme aj tak,
       aby sa dal preklikať. Krok o reklame sa v ňom zobrazí. */
    if (!endpoint) {
      spustiDotaznik({ cislo: 'OBJ-TEST-001', reklama: true });
      return;
    }

    window.fetch(endpoint + '?t=' + encodeURIComponent(token), {
      redirect: 'follow'
    })
      .then(function (odpoved) { return odpoved.json(); })
      .then(function (udaje) {
        if (!udaje || !udaje.ok) { ukaz(false); return; }
        spustiDotaznik(udaje);
      })
      .catch(function () {
        ukaz(false);
      });
  }

  /* --- Štart ----------------------------------------------------------------- */
  function init() {
    form = document.getElementById('formular-dotaznik');
    if (!form) { return; }

    token = tokenZAdresy();

    if (!token) {
      ukaz(false);
      return;
    }

    overToken();
  }

  function destroy() {
    window.clearTimeout(casovacUlozenia);

    odpojit.forEach(function (f) { f(); });
    odpojit = [];

    if (odpojitFormular) {
      odpojitFormular();
      odpojitFormular = null;
    }
  }

  window.TACHE.pages.dotaznik = { init: init, destroy: destroy };
}());
