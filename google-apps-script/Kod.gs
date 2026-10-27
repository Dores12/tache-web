/* ==========================================================================
   Vstupný bod webovej aplikácie.

   Web posiela JSON ako text/plain, lebo Apps Script nepodporuje predletovú
   požiadavku CORS. Odpoveď je vždy JSON, aj pri chybe.

   Konverzia na webe sa pushne až vtedy, keď odtiaľto príde ok: true.
   Preto tu nič nesmie spadnúť ticho.

   Pri zmene kódu: Nasadiť → Spravovať nasadenia → Upraviť existujúce →
   Nová verzia. Adresa /exec ostane rovnaká.
   ========================================================================== */

function odpoved_(objekt) {
  return ContentService
    .createTextOutput(JSON.stringify(objekt))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Rýchly test, či je nasadenie živé: otvor adresu /exec v prehliadači.
 * S parametrom ?t=token overí osobný odkaz na dotazník. Bez platného
 * tokenu sa dotazník nesmie otvoriť.
 */
function doGet(e) {
  var token = e && e.parameter ? e.parameter.t : '';

  if (token) {
    try {
      var najdena = objednavkaPodlaTokenu_(token);
      if (!najdena) {
        return odpoved_({ ok: false, error: 'neplatny token' });
      }
      return odpoved_({
        ok: true,
        cislo: najdena.udaje.cislo,
        meno: najdena.udaje.meno,
        balik: najdena.udaje.balik,
        /* Krok o reklame sa ukáže len pri balíku Na kľúč alebo doplnku. */
        reklama: String(najdena.udaje.balik).indexOf('kľúč') !== -1
          || /reklam/i.test(String(najdena.udaje.doplnky))
      });
    } catch (chyba) {
      return odpoved_({ ok: false, error: 'server' });
    }
  }

  var chyba = [];
  ['tabulkaId', 'email', 'iban'].forEach(function (kluc) {
    if (!NASTAVENIA[kluc]) { chyba.push(kluc); }
  });

  return odpoved_({
    ok: true,
    sluzba: 'Tache',
    cas: new Date().toISOString(),
    chybajuceNastavenia: chyba
  });
}

function doPost(e) {
  var zamok = LockService.getScriptLock();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return odpoved_({ ok: false, error: 'prazdna poziadavka' });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (chyba) {
      return odpoved_({ ok: false, error: 'necitatelne data' });
    }

    var kontrola = skontroluj_(data);

    if (kontrola.chyby.length) {
      return odpoved_({ ok: false, error: 'validacia', polia: kontrola.chyby });
    }

    /* Spam nezamietame. Robot nemá vedieť, že ho vidíme, preto ide
       do karty Spam a odpoveď je kladná. */
    if (kontrola.spam) {
      zapisSpam_(data.typ, kontrola.spam, data);
      return odpoved_({ ok: true });
    }

    /* Zámok drží len zápis, nie celé spracovanie. */
    zamok.waitLock(30000);

    var vysledok;
    switch (data.typ) {
      case 'order': vysledok = spracujObjednavku_(data); break;
      case 'audit': vysledok = spracujKontrolu_(data); break;
      case 'ads': vysledok = spracujReklamu_(data); break;
      case 'questionnaire': vysledok = spracujDotaznik_(data); break;
      default: vysledok = { ok: false, error: 'neznamy typ' };
    }

    return odpoved_(vysledok);

  } catch (chyba) {
    /* Pri akejkoľvek chybe sa aspoň ozveme Danielovi, nech o nej vie. */
    try {
      nahlasChybu_(chyba, e && e.postData ? e.postData.contents : '');
    } catch (ignoruj) { /* keď zlyhá aj e-mail, už sa nedá nič */ }

    return odpoved_({ ok: false, error: 'server' });

  } finally {
    try { zamok.releaseLock(); } catch (ignoruj) { /* zámok nebol vzatý */ }
  }
}

/* --- Kontrola webu zadarmo ---------------------------------------------- */
function spracujKontrolu_(data) {
  var list = karta_(KARTY.kontroly, HLAVICKY.kontroly);
  var mapa = stlpce_(list);

  if (jeDuplicita_(list, data.email, mapa['E-mail'])) {
    return { ok: true, duplicita: true };
  }

  list.appendRow([
    new Date(), data.email, data.web, 'Nová',
    zdrojAkoText_(data), data.event_id
  ]);

  posliKontrolaKlientovi_(data);
  posliOznamenieDanielovi_('Nová kontrola webu', [
    'Web: ' + data.web,
    'E-mail: ' + data.email
  ]);

  return { ok: true };
}

/* --- Správa zo stránky Správa reklamy ------------------------------------ */
function spracujReklamu_(data) {
  var list = karta_(KARTY.reklama, HLAVICKY.reklama);
  var mapa = stlpce_(list);

  if (jeDuplicita_(list, data.email, mapa['E-mail'])) {
    return { ok: true, duplicita: true };
  }

  list.appendRow([
    new Date(), data.meno, data.email, data.web || '', data.platforma,
    data.sprava, 'Nová', zdrojAkoText_(data), data.event_id
  ]);

  posliReklamaKlientovi_(data);
  posliOznamenieDanielovi_('Nová správa o reklame', [
    'Meno: ' + data.meno,
    'E-mail: ' + data.email,
    'Platforma: ' + data.platforma,
    'Web: ' + (data.web || 'neuvedený'),
    '',
    data.sprava
  ]);

  return { ok: true };
}
