/* ==========================================================================
   Formuláre – spoločná logika pre všetky typy (audit, ads, order,
   questionnaire). Pravidlá sú v CLAUDE.md sekcia 8.1.

   Čo robí:
   - validuje pri opustení poľa a pri odoslaní, nie počas písania,
   - chyba zmizne hneď po oprave, fokus ide na prvé chybné pole,
   - nápoveda pri preklepe v e-maile, ktorá neblokuje odoslanie,
   - honeypot t_hp a elapsed_ms posiela ďalej, spam vyhodnocuje server,
   - konverziu pushne až po ok: true zo servera, nikdy po kliku,
   - pri prázdnom formEndpoint neodošle nič a správa sa ako v teste.

   Použitie zo skriptu stránky:
     TACHE.forms.pripojit(form, { typ: 'audit', event: 'audit_request' });
   ========================================================================== */

window.TACHE = window.TACHE || {};

(function () {
  'use strict';

  var cfg = window.TACHE.config;
  var TIMEOUT = 12000;

  /* Domény, pri ktorých sa oplatí ponúknuť opravu preklepu. */
  var DOMENY = [
    'gmail.com', 'zoznam.sk', 'azet.sk', 'centrum.sk', 'post.sk',
    'outlook.com', 'hotmail.com', 'icloud.com', 'seznam.cz', 'yahoo.com'
  ];

  /* Skloňovanie: 1 pole, 2 až 4 polia, 5 a viac polí. */
  function suhrnChyb(pocet) {
    if (pocet === 1) { return 'Jedno pole ešte potrebuje opraviť.'; }
    if (pocet < 5) { return 'Opravte prosím ' + pocet + ' polia.'; }
    return 'Opravte prosím ' + pocet + ' polí.';
  }

  function id() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* --- Validácia jedného poľa ------------------------------------------ */
  function jeEmail(hodnota) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(hodnota);
  }

  function jeOdkaz(hodnota) {
    return /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(hodnota);
  }

  function chybaPola(pole) {
    var hodnota = (pole.value || '').trim();
    var vlastna = pole.getAttribute('data-chyba');

    if (pole.type === 'checkbox') {
      if (pole.required && !pole.checked) {
        return vlastna || 'Bez tohto políčka to ďalej nepôjde.';
      }
      return '';
    }

    if (pole.required && !hodnota) {
      return vlastna || 'Toto pole vyplňte.';
    }

    if (!hodnota) { return ''; }

    if (pole.type === 'email' && !jeEmail(hodnota)) {
      return 'Zadajte e-mail v tvare meno@domena.sk.';
    }

    if (pole.type === 'url' && !jeOdkaz(hodnota)) {
      return 'Zadajte odkaz na web, napríklad vasweb.sk.';
    }

    return '';
  }

  /* --- Zobrazenie chyby pri poli --------------------------------------- */
  function hlaskaPri(pole) {
    var obal = pole.closest('.pole') || pole.parentNode;
    var hlaska = obal.querySelector('.pole__chyba');
    if (!hlaska) {
      hlaska = document.createElement('p');
      hlaska.className = 'pole__chyba';
      hlaska.id = (pole.name || 'pole') + '-chyba-'
        + Math.random().toString(36).slice(2, 7);
      obal.appendChild(hlaska);
    }
    return hlaska;
  }

  function ukazChybu(pole, text) {
    var hlaska = hlaskaPri(pole);
    hlaska.textContent = text;
    pole.setAttribute('aria-invalid', 'true');
    pole.setAttribute('aria-describedby', hlaska.id);
  }

  function zmazChybu(pole) {
    var obal = pole.closest('.pole') || pole.parentNode;
    var hlaska = obal.querySelector('.pole__chyba');
    if (hlaska) { hlaska.textContent = ''; }
    pole.removeAttribute('aria-invalid');
    pole.removeAttribute('aria-describedby');
  }

  /* --- Nápoveda pri preklepe v e-maile ---------------------------------
     Neblokuje odoslanie, len ponúkne opravu jedným kliknutím.
     -------------------------------------------------------------------- */
  function vzdialenost(a, b) {
    var predch = [];
    var i, j;
    for (j = 0; j <= b.length; j++) { predch[j] = j; }
    for (i = 1; i <= a.length; i++) {
      var aktualny = [i];
      for (j = 1; j <= b.length; j++) {
        aktualny[j] = Math.min(
          predch[j] + 1,
          aktualny[j - 1] + 1,
          predch[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      predch = aktualny;
    }
    return predch[b.length];
  }

  function navrhDomeny(email) {
    var kusy = email.split('@');
    if (kusy.length !== 2) { return ''; }
    var domena = kusy[1].toLowerCase();
    if (DOMENY.indexOf(domena) !== -1) { return ''; }

    for (var i = 0; i < DOMENY.length; i++) {
      if (vzdialenost(domena, DOMENY[i]) <= 2) {
        return kusy[0] + '@' + DOMENY[i];
      }
    }
    return '';
  }

  function napoveda(pole) {
    var obal = pole.closest('.pole') || pole.parentNode;
    var box = obal.querySelector('.napoveda');
    var navrh = jeEmail((pole.value || '').trim())
      ? navrhDomeny(pole.value.trim())
      : '';

    if (!navrh) {
      if (box) { box.remove(); }
      return;
    }

    if (!box) {
      box = document.createElement('p');
      box.className = 'napoveda';
      obal.appendChild(box);
    }

    box.textContent = 'Mysleli ste ';
    var tlacidlo = document.createElement('button');
    tlacidlo.type = 'button';
    tlacidlo.textContent = navrh;
    tlacidlo.addEventListener('click', function () {
      pole.value = navrh;
      box.remove();
      pole.focus();
    });
    box.appendChild(tlacidlo);
    box.appendChild(document.createTextNode('?'));
  }

  /* --- Odoslanie na Apps Script ---------------------------------------- */
  function odoslat(data) {
    var prerusenie = new AbortController();
    var casovac = window.setTimeout(function () {
      prerusenie.abort();
    }, TIMEOUT);

    return window.fetch(cfg.formEndpoint, {
      method: 'POST',
      /* Apps Script nepodporuje CORS preflight, preto text/plain. */
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
      signal: prerusenie.signal
    })
      .then(function (odpoved) {
        window.clearTimeout(casovac);
        if (!odpoved.ok) {
          var chyba = new Error('server');
          chyba.druh = 'server';
          throw chyba;
        }
        return odpoved.json();
      })
      .catch(function (e) {
        window.clearTimeout(casovac);
        if (!e.druh) {
          e.druh = (e.name === 'AbortError') ? 'timeout' : 'network';
        }
        throw e;
      });
  }

  /* --- Pripojenie formulára -------------------------------------------- */
  function pripojit(form, nastavenia) {
    if (!form || form.dataset.pripojeny === 'ano') { return function () {}; }
    form.dataset.pripojeny = 'ano';

    var typ = nastavenia.typ;
    var otvoreny = Date.now();
    var tlacidlo = form.querySelector('[type="submit"]');
    var povodnyText = tlacidlo ? tlacidlo.textContent : '';
    var suhrn = form.querySelector('[data-suhrn]');
    var hotovo = document.querySelector('[data-hotovo="' + typ + '"]');
    var poslucháče = [];

    function polia() {
      return Array.prototype.filter.call(
        form.querySelectorAll('input, select, textarea'),
        function (p) { return p.name && p.name !== 't_hp'; }
      );
    }

    function pridaj(prvok, udalost, funkcia, volby) {
      prvok.addEventListener(udalost, funkcia, volby);
      poslucháče.push([prvok, udalost, funkcia, volby]);
    }

    /* form_start raz za reláciu a formulár. */
    var kluc = 'tache_form_start_' + typ;
    function zaciatok() {
      try {
        if (window.sessionStorage.getItem(kluc)) { return; }
        window.sessionStorage.setItem(kluc, '1');
      } catch (e) { /* bez úložiska sa pushne viackrát, nevadí */ }
      window.TACHE.track.push('form_start', { form_id: typ });
    }
    pridaj(form, 'focusin', zaciatok);

    /* Validácia pri opustení poľa, nie počas písania. */
    polia().forEach(function (pole) {
      pridaj(pole, 'blur', function () {
        var chyba = chybaPola(pole);
        if (chyba) { ukazChybu(pole, chyba); } else { zmazChybu(pole); }
        if (pole.type === 'email') { napoveda(pole); }
      });

      /* Chyba zmizne hneď, ako je pole v poriadku. */
      pridaj(pole, 'input', function () {
        if (pole.getAttribute('aria-invalid') === 'true' && !chybaPola(pole)) {
          zmazChybu(pole);
        }
      });

      pridaj(pole, 'change', function () {
        if (pole.type === 'checkbox' && pole.checked) { zmazChybu(pole); }
      });
    });

    function zablokuj(blokovane, text) {
      if (!tlacidlo) { return; }
      tlacidlo.disabled = blokovane;
      tlacidlo.textContent = blokovane ? text : povodnyText;
    }

    function ukazSuhrn(text) {
      if (suhrn) { suhrn.textContent = text; }
    }

    function chyba(druh, pole) {
      window.TACHE.track.push('form_error', {
        form_id: typ,
        error_type: druh,
        form_field: pole || undefined
      });
    }

    function podarilo(odpoved, data) {
      window.TACHE.track.push(nastavenia.event, Object.assign(
        { event_id: data.event_id },
        nastavenia.parametre ? nastavenia.parametre(data, odpoved) : {}
      ));

      if (nastavenia.hotovo) {
        nastavenia.hotovo(odpoved, data);
        return;
      }

      if (hotovo) {
        form.hidden = true;
        hotovo.hidden = false;
        var nadpis = hotovo.querySelector('h3');
        if (nadpis) {
          nadpis.setAttribute('tabindex', '-1');
          nadpis.focus();
        }
      }
    }

    pridaj(form, 'submit', function (e) {
      e.preventDefault();
      ukazSuhrn('');

      var chybne = polia().filter(function (pole) {
        var text = chybaPola(pole);
        if (text) { ukazChybu(pole, text); return true; }
        zmazChybu(pole);
        return false;
      });

      if (chybne.length) {
        ukazSuhrn(suhrnChyb(chybne.length));
        chybne[0].focus();
        chyba('validation', chybne[0].name);
        return;
      }

      var data = { typ: typ, event_id: id(), elapsed_ms: Date.now() - otvoreny };
      new FormData(form).forEach(function (hodnota, nazov) {
        data[nazov] = hodnota;
      });
      form.querySelectorAll('input[type="checkbox"]').forEach(function (p) {
        if (p.name) { data[p.name] = p.checked; }
      });
      Object.assign(data, window.TACHE.source.ziskat());

      /* Testovací režim: nič sa neodosiela, eventy nesú test_mode. */
      if (!cfg.formEndpoint) {
        zablokuj(true, 'Odosielam…');
        window.setTimeout(function () {
          zablokuj(false);
          podarilo({ ok: true, test: true }, data);
        }, 400);
        return;
      }

      zablokuj(true, 'Odosielam…');

      odoslat(data)
        .then(function (odpoved) {
          zablokuj(false);
          if (!odpoved || !odpoved.ok) {
            var e2 = new Error('server');
            e2.druh = 'server';
            throw e2;
          }
          podarilo(odpoved, data);
        })
        .catch(function (e) {
          zablokuj(false);
          ukazSuhrn('Správu sa nepodarilo odoslať. Skúste to o chvíľu znova, '
            + 'alebo mi napíšte e-mail.');
          chyba(e.druh || 'network');
        });
    });

    /* destroy() pre nav.js: odpojí všetko, čo sme pripojili. */
    return function () {
      poslucháče.forEach(function (p) {
        p[0].removeEventListener(p[1], p[2], p[3]);
      });
      poslucháče = [];
      delete form.dataset.pripojeny;
    };
  }

  window.TACHE.forms = { pripojit: pripojit, novyId: id };
}());
