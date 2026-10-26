/* ==========================================================================
   Cookie lišta a Consent Mode v2.

   Predvolené hodnoty sa nastavujú inline v <head> ešte pred GTM, aby sa
   uložená voľba aplikovala okamžite. Tento súbor rieši iba lištu,
   podrobné nastavenie a uloženie voľby.

   Lišta sa skladá v JS, nie v HTML. Bez JS by nefungovala a takto nie je
   treba udržiavať ďalší zhodný blok v každom HTML súbore.

   QA: pred súhlasom gcs=G100, po Prijať všetko gcs=G111. Bez súhlasu
   nesmie vzniknúť _fbp ani sa načítať fbevents.js.
   ========================================================================== */

window.TACHE = window.TACHE || {};

(function () {
  'use strict';

  var KLUC = 'tache_consent_v1';
  var PLATNOST_MESIACE = 12;

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  /* --- Uložená voľba --------------------------------------------------- */
  function precitat() {
    try {
      var ulozene = window.localStorage.getItem(KLUC);
      if (!ulozene) { return null; }
      var volba = JSON.parse(ulozene);
      var platneDo = new Date(volba.date);
      platneDo.setMonth(platneDo.getMonth() + PLATNOST_MESIACE);
      if (platneDo < new Date()) { return null; }
      return volba;
    } catch (e) {
      return null;
    }
  }

  function zapisat(analytics, marketing) {
    try {
      window.localStorage.setItem(KLUC, JSON.stringify({
        analytics: analytics,
        marketing: marketing,
        date: new Date().toISOString()
      }));
    } catch (e) {
      /* Súkromné okno alebo zakázané úložisko, voľba platí len pre reláciu. */
    }
  }

  /* --- Odoslanie voľby do merania -------------------------------------- */
  function pouzit(analytics, marketing) {
    gtag('consent', 'update', {
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
      analytics_storage: analytics ? 'granted' : 'denied'
    });

    window.TACHE.track.push('consent_update', {
      consent_analytics: analytics,
      consent_marketing: marketing
    });
  }

  function rozhodnut(analytics, marketing) {
    zapisat(analytics, marketing);
    pouzit(analytics, marketing);
    zatvorit();
  }

  /* --- Lišta ----------------------------------------------------------- */
  var lista = null;

  function zatvorit() {
    if (!lista) { return; }
    lista.parentNode.removeChild(lista);
    lista = null;
  }

  function tlacidlo(text, trieda, akcia) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tlacidlo ' + trieda;
    b.textContent = text;
    b.addEventListener('click', akcia);
    return b;
  }

  function prepinac(id, nazov, popis, zaskrtnute) {
    var obal = document.createElement('div');
    obal.className = 'cookies__skupina';

    var label = document.createElement('label');
    label.className = 'pole pole--zaskrtavacie';

    var vstup = document.createElement('input');
    vstup.type = 'checkbox';
    vstup.id = id;
    vstup.checked = zaskrtnute;

    var text = document.createElement('span');
    text.textContent = nazov;

    label.appendChild(vstup);
    label.appendChild(text);

    var p = document.createElement('p');
    p.textContent = popis;

    obal.appendChild(label);
    obal.appendChild(p);
    return { obal: obal, vstup: vstup };
  }

  function otvorit() {
    if (lista) { return; }
    var volba = precitat();

    lista = document.createElement('aside');
    lista.className = 'cookies';
    lista.setAttribute('aria-label', 'Nastavenie cookies');

    var obsah = document.createElement('div');
    obsah.className = 'cookies__obsah';

    var text = document.createElement('p');
    text.className = 'cookies__text';
    text.textContent = 'Používam cookies na meranie návštevnosti a na reklamu. '
      + 'Bez vášho súhlasu sa nič také nespustí. Voľbu môžete kedykoľvek zmeniť '
      + 'v pätičke.';

    var tlacidla = document.createElement('div');
    tlacidla.className = 'cookies__tlacidla';

    var podrobne = document.createElement('div');
    podrobne.className = 'cookies__podrobne';
    podrobne.hidden = true;

    var analytika = prepinac(
      'cookies-analytika',
      'Meranie návštevnosti',
      'Google Analytics. Ukazuje mi, ktoré stránky ľudia čítajú a odkiaľ prišli.',
      volba ? volba.analytics : false
    );
    var marketing = prepinac(
      'cookies-marketing',
      'Reklama',
      'Meta Pixel a konverzie Google Ads. Bez súhlasu sa kód reklamy vôbec '
      + 'nenačíta.',
      volba ? volba.marketing : false
    );

    podrobne.appendChild(analytika.obal);
    podrobne.appendChild(marketing.obal);
    podrobne.appendChild(tlacidlo('Uložiť voľbu', 'tlacidlo--hlavne', function () {
      rozhodnut(analytika.vstup.checked, marketing.vstup.checked);
    }));

    /* Prijať a odmietnuť sú vedľa seba a rovnako výrazné. */
    var prijat = tlacidlo('Prijať všetko', 'tlacidlo--hlavne', function () {
      rozhodnut(true, true);
    });
    var odmietnut = tlacidlo('Odmietnuť', 'tlacidlo--hlavne', function () {
      rozhodnut(false, false);
    });

    var nastavit = tlacidlo('Nastaviť podrobne', 'tlacidlo--obrysove', function () {
      var skryte = podrobne.hidden;
      podrobne.hidden = !skryte;
      nastavit.setAttribute('aria-expanded', skryte ? 'true' : 'false');
      if (skryte) { analytika.vstup.focus(); }
    });
    nastavit.setAttribute('aria-expanded', 'false');

    tlacidla.appendChild(prijat);
    tlacidla.appendChild(odmietnut);
    tlacidla.appendChild(nastavit);

    obsah.appendChild(text);
    obsah.appendChild(tlacidla);
    lista.appendChild(obsah);
    lista.appendChild(podrobne);
    document.body.appendChild(lista);
  }

  /* --- Odkaz Nastavenie cookies v pätičke ------------------------------ */
  function spustit() {
    document.querySelectorAll('[data-cookies-nastavenie]').forEach(function (b) {
      b.addEventListener('click', function () {
        otvorit();
      });
    });

    if (!precitat()) { otvorit(); }
  }

  window.TACHE.consent = {
    otvorit: otvorit,
    precitat: precitat
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spustit);
  } else {
    spustit();
  }
}());
