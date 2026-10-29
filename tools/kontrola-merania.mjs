/* ==========================================================================
   Kontrola merania.

   Prejde web, vyvolá každú udalosť zo sekcie 7.1 CLAUDE.md a porovná, či má
   očakávaný názov aj parametre. Nájde aj opak: udalosť, ktorá sa pushne,
   ale v tabuľke nie je.

   Čo táto kontrola spraviť nevie: overiť, že GTM značky naozaj vystrelili
   a že v GA4 pribudla konverzia. To treba prejsť ručne podľa postupu
   v docs/MERANIE.md, až keď bude kontajner nastavený.

   Beží proti lokálnemu serveru a nahrádza config.js testovacími hodnotami,
   aby sa dali otestovať aj prvky, ktoré sa bez e-mailu či IBAN nevykreslia.
   GTM ID ostáva prázdne, takže sa žiadny kontajner nenačíta.

   Spustenie:
     python3 tools/server.py 8787 &
     node tools/kontrola-merania.mjs
   Prípadne s inou adresou, keď server beží na inom porte:
     node tools/kontrola-merania.mjs http://localhost:8788
   ========================================================================== */

import { spawn } from 'node:child_process';
import { Chrome, pockaj, PREHLIADAC } from './chrome.mjs';

/* Adresa webu. Keď je 8787 obsadený iným projektom, server.py si vezme
   ďalší voľný port a vypíše ho. Vtedy ho treba odovzdať aj sem:
     node tools/kontrola-merania.mjs http://localhost:8788 */
const ZAKLAD = process.argv[2] || 'http://localhost:8787';

/* Vlastný ladiaci port Chromu, nesúvisí s portom webu. */
const PORT = 9333;

/* --- Očakávané udalosti podľa CLAUDE.md sekcia 7.1 --------------------- */
const POVINNE = {
  virtual_page_view: ['page_path', 'page_title', 'page_location'],
  consent_update: ['consent_analytics', 'consent_marketing'],
  package_select: ['package_id'],
  addon_toggle: ['addon_id', 'state'],
  upsell_view: ['from_package', 'to_package'],
  upsell_accept: ['from_package', 'to_package'],
  form_start: ['form_id'],
  form_error: ['form_id', 'error_type'],
  generate_lead: ['event_id', 'package_id', 'value', 'currency', 'founder_price'],
  audit_request: ['event_id'],
  ads_inquiry: ['event_id', 'platform'],
  email_click: ['link_location'],
  live_site_click: ['site'],
  qr_view: [],
  questionnaire_step: ['step'],
  questionnaire_submit: [],
  section_view: ['section'],
  scroll_depth: ['percent'],
  faq_open: ['faq_index']
};

/* Udalosti nad rámec tabuľky. Treba ich vedome schváliť, inak by sa
   do dataLayeru vkrádali veci, pre ktoré v GTM nikto nespraví značku. */
const NAVYSE_SCHVALENE = {
  package_cta: ['link_location']
};

/* Testovací config. Bez e-mailu a IBAN sa časť prvkov nevykreslí. */
const TESTOVACI_CONFIG = `
window.TACHE = window.TACHE || {};
window.TACHE.config = {
  siteUrl: 'http://localhost:8787',
  email: 'test@tache.test',
  owner: 'Daniel Tache',
  businessAddress: 'Prešov',
  ico: '12345678',
  tradeRegister: 'Okresný úrad Prešov',
  vatPayer: false,
  iban: 'SK3112000000198742637541',
  beneficiary: 'Daniel Tache',
  proformaDueDays: 10,
  gtmId: '',
  formEndpoint: '',
  founderSlotsTotal: 5,
  founderSlotsLeft: 4,
  replyTime: 'do 24 hodín v pracovné dni',
  auditTime: 'do 2 pracovných dní',
  blogEnabled: false,
  debug: false
};`;

/* --- Pomôcky ------------------------------------------------------------- */
let chrome = null;
const zozbierane = [];

async function dataLayer() {
  return chrome.hodnota(`JSON.stringify(
    (window.dataLayer || []).filter(function (z) {
      return z && typeof z === 'object' && z.event;
    })
  )`);
}

async function zapamataj(kde) {
  const udalosti = JSON.parse(await dataLayer());
  udalosti.forEach((u) => zozbierane.push({ kde, udalost: u }));
}

/** Zabráni odchodu zo stránky pri klikaní na odkazy.
    Dá sa vypnúť nastavením window.__blokujem na false. */
async function zablokujOdchod() {
  await chrome.hodnota(`
    window.__blokujem = true;
    if (!window.__blokovacPripojeny) {
      window.__blokovacPripojeny = true;
      document.addEventListener('click', function (e) {
        var odkaz = e.target.closest && e.target.closest('a');
        if (odkaz && window.__blokujem) { e.preventDefault(); }
      }, true);
    }
    true`);
}

async function otvor(cesta) {
  await chrome.otvor(ZAKLAD + cesta, 1400);
  await zablokujOdchod();
}

/* --- Prechody webom ------------------------------------------------------ */
async function domov() {
  await otvor('/');

  /* Uložená voľba z predchádzajúceho behu by lištu vôbec nezobrazila. */
  await chrome.hodnota(`
    try { localStorage.removeItem('tache_consent_v1'); } catch (e) {}
    true`);
  await chrome.otvor(ZAKLAD + '/', 1400);
  await zablokujOdchod();

  /* Súhlas s cookies. */
  await chrome.hodnota(`
    (function () {
      var tlacidla = Array.from(document.querySelectorAll('.cookies button'));
      var prijat = tlacidla.find(function (t) { return /Prijať/.test(t.textContent); });
      if (prijat) { prijat.click(); }
      return !!prijat;
    }())`);
  await pockaj(300);

  /* Kliky cez data-track. */
  await chrome.hodnota(`
    (function () {
      var karta = document.querySelector('[data-track="package_select"]');
      if (karta) { karta.click(); }
      var vyzva = document.querySelector('[data-track="package_cta"]');
      if (vyzva) { vyzva.click(); }
      var mail = document.querySelector('[data-track="email_click"]');
      if (mail) { mail.click(); }
      var naziv = document.querySelector('[data-track="live_site_click"]');
      if (naziv) { naziv.click(); }
      return true;
    }())`);
  await pockaj(200);

  /* Častá otázka. */
  await chrome.hodnota(`
    (function () {
      var otazka = document.querySelector('details[data-faq-index="2"]');
      if (otazka) { otazka.open = true; otazka.dispatchEvent(new Event('toggle')); }
      return true;
    }())`);
  await pockaj(300);

  /* Scrollovanie: section_view aj scroll_depth. */
  await chrome.hodnota(`document.documentElement.style.scrollBehavior='auto'; true`);
  for (const podiel of [0.2, 0.45, 0.7, 0.95]) {
    await chrome.hodnota(
      `window.scrollTo(0, document.documentElement.scrollHeight * ${podiel}); true`);
    await pockaj(1400);
  }

  /* Formulár kontroly webu. */
  await chrome.hodnota(`
    (function () {
      var f = document.getElementById('formular-audit');
      f.querySelector('[name=web]').dispatchEvent(new Event('focusin', { bubbles: true }));
      f.requestSubmit();
      return true;
    }())`);
  await pockaj(400);

  await chrome.hodnota(`
    (function () {
      var f = document.getElementById('formular-audit');
      f.querySelector('[name=web]').value = 'mojaklinika.sk';
      f.querySelector('[name=email]').value = 'jana@salonjana.sk';
      f.requestSubmit();
      return true;
    }())`);
  await pockaj(900);

  await zapamataj('/');

  /* Prechod cez nav.js: virtual_page_view. */
  await chrome.hodnota(`
    (function () {
      window.__blokujem = false;
      var odkaz = document.querySelector('.menu__odkazy a[href="/reklama"]');
      odkaz.click();
      return true;
    }())`);
  await pockaj(1200);
  await zapamataj('prechod na /reklama');
}

async function reklama() {
  await otvor('/reklama');

  await chrome.hodnota(`
    (function () {
      var f = document.getElementById('formular-reklama');
      f.querySelector('[name=meno]').value = 'Igor Test';
      f.querySelector('[name=email]').value = 'igor@test.sk';
      f.querySelector('[name=sprava]').value = 'Predávam masáže v Prešove.';
      f.querySelector('[name=platforma]').value = 'Meta';
      f.requestSubmit();
      return true;
    }())`);
  await pockaj(900);
  await zapamataj('/reklama');
}

async function cennik() {
  await otvor('/cennik?balik=start');

  /* Doplnok, ktorý prekročí prah ponuky vyššieho balíka. */
  await chrome.hodnota(`
    (function () {
      var d = document.querySelector('[data-doplnok=auto] input');
      d.checked = true;
      d.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }())`);
  await pockaj(400);

  await chrome.hodnota(`document.querySelector('[data-upsell-tlacidlo]').click(); true`);
  await pockaj(400);

  /* Objednávka. */
  await chrome.hodnota(`
    (function () {
      var f = document.getElementById('formular-objednavka');
      f.querySelector('[name=meno]').value = 'Jana Kováčová';
      f.querySelector('[name=email]').value = 'jana@salonjana.sk';
      f.querySelector('[name=odvetvie]').value = 'Salón alebo kozmetika';
      f.querySelector('[name=firma]').value = '12345678';
      f.querySelector('[name=firma]').dispatchEvent(new Event('input', { bubbles: true }));
      f.querySelector('[name=podmienky]').checked = true;
      f.requestSubmit();
      return true;
    }())`);
  await pockaj(1200);
  await zapamataj('/cennik');
}

async function dakujem() {
  /* Súhrn, ktorý tam inak nechá konfigurátor. */
  await otvor('/dakujem?o=OBJ-2026-001');
  await chrome.hodnota(`
    (function () {
      sessionStorage.setItem('tache_objednavka_v1', JSON.stringify({
        cislo: 'OBJ-2026-001',
        balik: { id: 'lead', nazov: 'Lead systém', cena: 269 },
        doplnky: [], spolu: 269, zaloha: 134.5, doplatok: 134.5,
        email: 'jana@salonjana.sk', event_id: 'ev-test'
      }));
      return true;
    }())`);
  await otvor('/dakujem?o=OBJ-2026-001');
  await pockaj(2500);
  await zapamataj('/dakujem');
}

async function dotaznik() {
  await otvor('/dotaznik?t=test-token-123');

  await chrome.hodnota(`
    (function () {
      var f = document.getElementById('formular-dotaznik');
      for (var i = 0; i < 8; i++) { f.querySelector('[data-dalej]').click(); }
      f.requestSubmit();
      return true;
    }())`);
  await pockaj(1200);
  await zapamataj('/dotaznik');
}

/* --- Vyhodnotenie --------------------------------------------------------- */
function vyhodnot() {
  const najdene = new Map();

  zozbierane.forEach(({ kde, udalost }) => {
    if (!najdene.has(udalost.event)) {
      najdene.set(udalost.event, { kde, ukazky: [] });
    }
    najdene.get(udalost.event).ukazky.push(udalost);
  });

  let chyby = 0;

  console.log('== Udalosti podľa CLAUDE.md sekcia 7.1 ==\n');

  Object.keys(POVINNE).sort().forEach((nazov) => {
    const zaznam = najdene.get(nazov);

    if (!zaznam) {
      console.log(`  CHÝBA  ${nazov}`);
      chyby++;
      return;
    }

    const ukazka = zaznam.ukazky[0];
    const chybajuce = POVINNE[nazov].filter((p) => !(p in ukazka));

    if (chybajuce.length) {
      console.log(`  ZLE    ${nazov}  chýbajú parametre: ${chybajuce.join(', ')}`);
      chyby++;
      return;
    }

    const hodnoty = POVINNE[nazov]
      .map((p) => `${p}=${JSON.stringify(ukazka[p])}`)
      .join(' ');
    console.log(`  OK     ${nazov.padEnd(20)} ${zaznam.ukazky.length}x  ${hodnoty}`);
  });

  console.log('\n== Udalosti nad rámec tabuľky ==\n');

  const navyse = [...najdene.keys()]
    .filter((n) => !(n in POVINNE) && n !== 'gtm.js');

  if (!navyse.length) {
    console.log('  žiadne');
  }

  navyse.forEach((nazov) => {
    if (nazov in NAVYSE_SCHVALENE) {
      console.log(`  SCHVÁLENÉ  ${nazov}  (nie je v tabuľke, pozri docs/MERANIE.md)`);
    } else {
      console.log(`  NEZNÁMA    ${nazov}  nikto pre ňu v GTM nespraví značku`);
      chyby++;
    }
  });

  /* Konverzie sa smú pushnúť až po potvrdení zo servera. */
  console.log('\n== Poradie pri konverziách ==\n');

  ['generate_lead', 'audit_request', 'ads_inquiry', 'questionnaire_submit']
    .forEach((nazov) => {
      const zaznam = najdene.get(nazov);
      if (!zaznam) { return; }
      const maId = zaznam.ukazky.every((u) => !!u.event_id || nazov === 'questionnaire_submit');
      console.log(`  ${maId ? 'OK    ' : 'ZLE   '} ${nazov.padEnd(22)} ${zaznam.ukazky.length}x`);
      if (!maId) { chyby++; }
    });

  /* V testovacom režime musí byť na všetkom test_mode. */
  const bezPriznaku = zozbierane.filter(({ udalost }) => udalost.test_mode !== true);
  console.log('\n== Testovací režim ==\n');
  if (bezPriznaku.length) {
    console.log(`  ZLE    ${bezPriznaku.length} udalostí bez test_mode`);
    chyby++;
  } else {
    console.log(`  OK     všetkých ${zozbierane.length} udalostí nesie test_mode`);
  }

  return chyby;
}

/* --- Beh ------------------------------------------------------------------ */
async function main() {
  const proces = spawn(PREHLIADAC, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/tache-meranie',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    /* Na porte môže sedieť úplne iný projekt. Radšej sa uistíme, že
       odpovedá náš web, než aby sme merali cudziu stránku. */
    const skuska = await fetch(ZAKLAD + '/assets/js/packages.js')
      .then((o) => (o.ok ? o.text() : ''))
      .catch(() => '');

    if (!skuska.includes('window.TACHE.data')) {
      throw new Error(
        `Na ${ZAKLAD} neodpovedá web Tache. Spusti python3 tools/server.py `
        + 'a adresu, ktorú vypíše, odovzdaj tomuto skriptu ako parameter.'
      );
    }

    await pockaj(2500);
    chrome = await Chrome.pripoj(PORT);

    await chrome.posli('Page.enable');
    await chrome.posli('Runtime.enable');

    /* Podstrčíme config s vyplnenými údajmi. */
    await chrome.posli('Fetch.enable', {
      patterns: [{ urlPattern: '*/assets/js/config.js' }]
    });
    chrome.na('Fetch.requestPaused', async (p) => {
      await chrome.posli('Fetch.fulfillRequest', {
        requestId: p.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/javascript; charset=utf-8' }
        ],
        body: Buffer.from(TESTOVACI_CONFIG, 'utf8').toString('base64')
      });
    });

    await domov();
    await reklama();
    await cennik();
    await dakujem();
    await dotaznik();

    const chyby = vyhodnot();

    console.log('\n' + (chyby === 0
      ? 'Meranie na webe sedí so sekciou 7.1.'
      : `Nájdených problémov: ${chyby}`));

    chrome.zavri();
    proces.kill();
    process.exit(chyby === 0 ? 0 : 1);

  } catch (chyba) {
    console.error('chyba:', chyba.message);
    if (chrome) { chrome.zavri(); }
    proces.kill();
    process.exit(1);
  }
}

main();
