/* ==========================================================================
   Test backendu v google-apps-script/ bez nasadenia.

   Služby Google sú tu nahradené napodobeninami, ktoré si pamätajú, čo sa
   do nich zapísalo. Vďaka tomu sa dá celý tok objednávky prejsť v Node
   a chyby nájsť skôr, než sa kód nahrá do Apps Scriptu, kde sa ladí ťažko.

   Spustenie:  node tools/test-apps-script.mjs
   Vracia 1, keď niečo zlyhá.
   ========================================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* --- Napodobeniny služieb Google -------------------------------------- */
const zapisane = { listy: {}, maily: [], subory: [], priecinky: [] };

class List {
  constructor(nazov, hlavicka) {
    this.nazov = nazov;
    this.riadky = hlavicka ? [hlavicka] : [];
  }
  getName() { return this.nazov; }
  appendRow(r) { this.riadky.push(r.slice()); }
  getLastRow() { return this.riadky.length; }
  getLastColumn() { return this.riadky[0] ? this.riadky[0].length : 0; }
  setFrozenRows() { return this; }
  getRange(riadok, stlpec, pocetR = 1, pocetS = 1) {
    const list = this;
    return {
      getValues() {
        const out = [];
        for (let r = 0; r < pocetR; r++) {
          const zdroj = list.riadky[riadok - 1 + r] || [];
          out.push(zdroj.slice(stlpec - 1, stlpec - 1 + pocetS));
        }
        return out;
      },
      getValue() { return (list.riadky[riadok - 1] || [])[stlpec - 1]; },
      setValue(v) {
        if (!list.riadky[riadok - 1]) { list.riadky[riadok - 1] = []; }
        list.riadky[riadok - 1][stlpec - 1] = v;
        return this;
      },
      setFontWeight() { return this; },
      getRow() { return riadok; },
      getColumn() { return stlpec; },
      getSheet() { return list; }
    };
  }
}

class Tabulka {
  constructor() { this.listy = {}; }
  getSheetByName(n) { return this.listy[n] || null; }
  insertSheet(n) { this.listy[n] = new List(n); zapisane.listy[n] = this.listy[n]; return this.listy[n]; }
}

const tabulka = new Tabulka();

globalThis.SpreadsheetApp = { openById: () => tabulka };

globalThis.Utilities = {
  newBlob: (bajty, typ, nazov) => ({ bajty, typ, nazov, getBytes: () => bajty }),
  base64Decode: (b64) => Array.from(Buffer.from(b64, 'base64')),
  getUuid: () => 'token-' + Math.random().toString(36).slice(2, 10),
  formatDate: (d, _tz, vzor) => {
    const p = (n) => String(n).padStart(2, '0');
    return vzor.replace('yyyy', d.getFullYear()).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate()));
  }
};

globalThis.Logger = { log: (...a) => zapisane.log?.push(a) };
globalThis.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
globalThis.ContentService = {
  MimeType: { JSON: 'json' },
  createTextOutput: (t) => ({ obsah: t, setMimeType() { return this; }, getContent() { return this.obsah; } })
};
globalThis.MimeType = { PLAIN_TEXT: 'text/plain' };

const priecinok = {
  getFoldersByName: () => ({ hasNext: () => false }),
  createFolder: (n) => { zapisane.priecinky.push(n); return priecinok; },
  createFile: (a, b) => {
    const nazov = typeof a === 'string' ? a : (a && a.nazov) || 'subor';
    zapisane.subory.push(nazov);
    return { getUrl: () => 'https://drive.example/' + encodeURIComponent(nazov), getBlob: () => ({ nazov }) };
  }
};

globalThis.DriveApp = {
  getFolderById: () => priecinok,
  getFileById: () => ({
    makeCopy: (nazov) => ({
      getId: () => 'kopia',
      getAs: () => ({ setName: (n) => ({ nazov: n }) }),
      setTrashed: () => {}
    })
  })
};

globalThis.DocumentApp = {
  ParagraphHeading: { TITLE: 0, HEADING2: 2 },
  openById: () => ({
    getBody: () => ({
      replaceText: () => {},
      findText: () => ({
        getElement: () => ({ getParent: () => ({ asParagraph: () => ({ clear() {}, appendInlineImage: () => ({ setWidth: () => ({ setHeight() {} }) }) }) }) })
      })
    }),
    saveAndClose: () => {}
  })
};

globalThis.GmailApp = {
  getAliases: () => [],
  sendEmail: (komu, predmet, telo, volby) =>
    zapisane.maily.push({ komu, predmet, telo, prilohy: (volby && volby.attachments) || [] })
};
globalThis.MailApp = {
  sendEmail: (komu, predmet, telo) => zapisane.maily.push({ komu, predmet, telo, prilohy: [] })
};

/* --- Načítanie zdrojov v poradí ako Apps Script ------------------------- */
runInThisContext(readFileSync(KOREN + '/assets/vendor/lzma1/lzma1.js', 'utf8'));
runInThisContext(readFileSync(KOREN + '/assets/vendor/qrcode-generator/qrcode.js', 'utf8'));
/* Spoločný kodér, ktorý sa do Apps Scriptu kopíruje ako paybysquare.gs. */
runInThisContext(readFileSync(KOREN + '/assets/js/paybysquare.js', 'utf8'));

const subory = readdirSync(KOREN + '/google-apps-script').filter((f) => f.endsWith('.gs')).sort();
for (const subor of subory) {
  try {
    runInThisContext(readFileSync(KOREN + '/google-apps-script/' + subor, 'utf8'), { filename: subor });
  } catch (e) {
    console.error('CHYBA pri načítaní ' + subor + ': ' + e.message);
    process.exit(1);
  }
}
console.log('Načítaných súborov: ' + subory.length + ' (' + subory.join(', ') + ')');

/* --- Nastavenia pre test ------------------------------------------------- */
NASTAVENIA.tabulkaId = 'test';
NASTAVENIA.priecinokId = 'test';
NASTAVENIA.sablonaFakturyId = 'test';
NASTAVENIA.email = 'daniel@example.sk';
NASTAVENIA.iban = 'SK3112000000198742637541';
NASTAVENIA.businessAddress = 'Prešov';
NASTAVENIA.ico = '12345678';

/* --- Pomôcky ------------------------------------------------------------- */
let zlyhani = 0;
function skus(nazov, funkcia) {
  try {
    const hlaska = funkcia();
    console.log('  OK   ' + nazov + (hlaska ? '  (' + hlaska + ')' : ''));
  } catch (e) {
    zlyhani++;
    console.log('  ZLE  ' + nazov + '  ' + e.message);
  }
}
function nechNastane(podmienka, sprava) {
  if (!podmienka) { throw new Error(sprava); }
}
function posli(data) {
  const odpoved = doPost({ postData: { contents: JSON.stringify(data) } });
  return JSON.parse(odpoved.getContent());
}
const zaklad = { elapsed_ms: 9000, t_hp: '', event_id: 'ev-test' };

/* --- Testy --------------------------------------------------------------- */
console.log('\n== Validácia ==');

skus('prázdna požiadavka neprejde', () => {
  const r = JSON.parse(doPost({}).getContent());
  nechNastane(r.ok === false, 'malo zlyhať');
});

skus('neznámy typ neprejde', () => {
  const r = posli({ ...zaklad, typ: 'nieco', email: 'a@b.sk' });
  nechNastane(r.ok === false && r.error === 'validacia', 'malo zlyhať');
});

skus('zlý e-mail neprejde', () => {
  const r = posli({ ...zaklad, typ: 'audit', email: 'nie-email', web: 'web.sk' });
  nechNastane(r.polia.indexOf('email') !== -1, 'mala byť chyba e-mailu');
});

skus('objednávka bez súhlasu neprejde', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'a@b.sk', meno: 'Jana Nová', odvetvie: 'Fitness', balik: 'lead', podmienky: false, lehota: true });
  nechNastane(r.polia.indexOf('podmienky') !== -1, 'mala byť chyba súhlasu');
});

skus('spotrebiteľ bez potvrdenia lehoty neprejde', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'a@b.sk', meno: 'Jana Nová', odvetvie: 'Fitness', balik: 'lead', podmienky: true, firma: '' });
  nechNastane(r.polia.indexOf('lehota') !== -1, 'mala byť chyba lehoty');
});

skus('s IČO sa lehota nepýta', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'firma@b.sk', meno: 'Jana Nová', odvetvie: 'Fitness', balik: 'start', podmienky: true, firma: '12345678' });
  nechNastane(r.ok === true, 'malo prejsť: ' + JSON.stringify(r));
  return r.cislo;
});

console.log('\n== Spam ==');

skus('honeypot ide do karty Spam, odpoveď je kladná', () => {
  const pocet = zapisane.listy['Spam'] ? zapisane.listy['Spam'].getLastRow() : 0;
  const r = posli({ ...zaklad, typ: 'audit', email: 'robot@b.sk', web: 'web.sk', t_hp: 'robot' });
  nechNastane(r.ok === true, 'odpoveď mala byť kladná');
  nechNastane(zapisane.listy['Spam'].getLastRow() > pocet, 'nezapísalo sa do Spamu');
});

skus('príliš rýchle odoslanie je spam', () => {
  const r = posli({ ...zaklad, elapsed_ms: 200, typ: 'audit', email: 'rychly@b.sk', web: 'web.sk' });
  nechNastane(r.ok === true, 'odpoveď mala byť kladná');
});

console.log('\n== Objednávka ==');

skus('číslovanie beží od OBJ-RRRR-001', () => {
  const rok = new Date().getFullYear();
  const prve = zapisane.listy['Objednávky'].riadky[1][1];
  nechNastane(prve === 'OBJ-' + rok + '-001', 'prvé číslo je ' + prve);
  return prve;
});

skus('druhá objednávka dostane ďalšie číslo a vlastný variabilný symbol', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'druha@b.sk', meno: 'Peter Druhý', odvetvie: 'Iné', balik: 'kluc', podmienky: true, firma: '87654321' });
  const rok = new Date().getFullYear();
  nechNastane(r.cislo === 'OBJ-' + rok + '-002', 'číslo je ' + r.cislo);
  nechNastane(r.variabilnySymbol === String(rok) + '002', 'VS je ' + r.variabilnySymbol);
  return r.cislo + ', VS ' + r.variabilnySymbol;
});

skus('cenu počíta server, nie prehliadač', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'podvod@b.sk', meno: 'Hacker Test', odvetvie: 'Iné', balik: 'kluc', doplnky: [], podmienky: true, firma: '11111111', spolu: 1 });
  nechNastane(r.spolu === 479, 'server zobral sumu ' + r.spolu + ', mala byť 479');
  return 'poslaných 1 €, účtovaných ' + r.spolu + ' €';
});

skus('doplnok mimo balíka sa zahodí', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'doplnky@b.sk', meno: 'Eva Test', odvetvie: 'Fitness', balik: 'lead', doplnky: ['kampan', 'pixel'], podmienky: true, firma: '22222222' });
  nechNastane(r.spolu === 269 + 149, 'suma je ' + r.spolu + ', mala byť 418 (pixel patrí k Štartu)');
  return r.spolu + ' €';
});

skus('záloha je polovica a sedí s doplatkom', () => {
  const r = posli({ ...zaklad, typ: 'order', email: 'zaloha@b.sk', meno: 'Zuzana Test', odvetvie: 'Iné', balik: 'start', doplnky: ['pixel'], podmienky: true, firma: '33333333' });
  nechNastane(Math.abs(r.zaloha * 2 - r.spolu) < 0.01, 'záloha ' + r.zaloha + ' nesedí so sumou ' + r.spolu);
  return 'spolu ' + r.spolu + ' €, záloha ' + r.zaloha + ' €';
});

skus('duplicita do 10 minút nezaloží nový riadok', () => {
  const pocet = zapisane.listy['Objednávky'].getLastRow();
  const r = posli({ ...zaklad, typ: 'order', email: 'zaloha@b.sk', meno: 'Zuzana Test', odvetvie: 'Iné', balik: 'start', podmienky: true, firma: '33333333' });
  nechNastane(r.duplicita === true, 'nerozpoznaná duplicita');
  nechNastane(zapisane.listy['Objednávky'].getLastRow() === pocet, 'pribudol riadok');
});

skus('zakladateľské miesta sa míňajú', () => {
  const volne = volnychZakladatelskychMiest_();
  nechNastane(volne >= 0 && volne < ZAKLADATELSKYCH_MIEST, 'voľných je ' + volne);
  return 'voľných ' + volne + ' z ' + ZAKLADATELSKYCH_MIEST;
});

skus('klient dostal e-mail s faktúrou v prílohe', () => {
  const mail = zapisane.maily.find((m) => m.komu === 'firma@b.sk');
  nechNastane(!!mail, 'e-mail klientovi neodišiel');
  nechNastane(mail.prilohy.length === 1, 'chýba príloha');
  nechNastane(/IBAN/.test(mail.telo), 'v e-maile nie je IBAN');
});

skus('oznámenie Danielovi neobsahuje identifikátory kliknutia', () => {
  const mail = zapisane.maily.find((m) => m.komu === NASTAVENIA.email && /objednávka/i.test(m.predmet));
  nechNastane(!!mail, 'oznámenie neodišlo');
  nechNastane(!/gclid|fbclid|wbraid|gbraid/i.test(mail.telo), 'v e-maile sú click ID');
});

console.log('\n== Kontrola webu a reklama ==');

skus('kontrola webu sa zapíše a klient dostane odpoveď', () => {
  const r = posli({ ...zaklad, typ: 'audit', email: 'kontrola@b.sk', web: 'mojweb.sk' });
  nechNastane(r.ok === true, 'neprešlo');
  nechNastane(zapisane.listy['Kontroly webu'].getLastRow() >= 2, 'nezapísalo sa');
  nechNastane(zapisane.maily.some((m) => m.komu === 'kontrola@b.sk'), 'klient nedostal e-mail');
});

skus('správa o reklame vyžaduje platformu zo zoznamu', () => {
  const r = posli({ ...zaklad, typ: 'ads', email: 'r@b.sk', meno: 'Igor Test', sprava: 'Predávam masáže v Prešove.', platforma: 'TikTok' });
  nechNastane(r.polia.indexOf('platforma') !== -1, 'zlá platforma mala zlyhať');
});

skus('správa o reklame prejde', () => {
  const r = posli({ ...zaklad, typ: 'ads', email: 'reklama@b.sk', meno: 'Igor Test', sprava: 'Predávam masáže v Prešove.', platforma: 'Meta' });
  nechNastane(r.ok === true, 'neprešlo');
  nechNastane(zapisane.listy['Reklama'].getLastRow() >= 2, 'nezapísalo sa');
});

console.log('\n== Dotazník ==');

skus('bez platného tokenu sa dotazník neotvorí', () => {
  const r = JSON.parse(doGet({ parameter: { t: 'vymyslene' } }).getContent());
  nechNastane(r.ok === false, 'malo zlyhať');
});

skus('platný token vráti údaje objednávky', () => {
  const list = zapisane.listy['Objednávky'];
  const mapa = stlpce_(list);
  const token = list.riadky[1][mapa['Token dotazníka'] - 1];
  const r = JSON.parse(doGet({ parameter: { t: token } }).getContent());
  nechNastane(r.ok === true, 'neprešlo: ' + JSON.stringify(r));
  nechNastane(!!r.cislo, 'chýba číslo objednávky');
  return r.cislo;
});

skus('odoslaný dotazník vyrobí zadanie a označí chýbajúce odpovede', () => {
  const list = zapisane.listy['Objednávky'];
  const mapa = stlpce_(list);
  const token = list.riadky[1][mapa['Token dotazníka'] - 1];
  const r = posli({ ...zaklad, typ: 'questionnaire', email: 'firma@b.sk', token: token, firma_nazov: 'Salón Jana', firma_ico: '12345678', ponuka_sluzby: 'Strihanie 25 €' });
  nechNastane(r.ok === true, 'neprešlo: ' + JSON.stringify(r));
  nechNastane(zapisane.subory.some((s) => /^Zadanie-/.test(s)), 'zadanie sa neuložilo');
  nechNastane(list.riadky[1][mapa['Stav'] - 1] === STAVY.dotaznikOdoslany, 'stav sa nezmenil');
});

skus('zadanie má nadpisy aj značku chýbajúcej odpovede', () => {
  const zadanie = zostavZadanie_(
    { cislo: 'OBJ-2026-001', meno: 'Jana', email: 'a@b.sk', balik: 'Lead systém', doplnky: '' },
    { firma_nazov: 'Salón Jana' }
  );
  nechNastane(/^# Zadanie webu: Salón Jana/m.test(zadanie), 'chýba nadpis');
  nechNastane(/❓ chýba/.test(zadanie), 'chýba značka nevyplnenej odpovede');
  nechNastane(!/## 8\. Reklama/.test(zadanie), 'krok Reklama sa nemal vypísať pri balíku Lead systém');
  return 'bez kroku Reklama, ' + zadanie.split('\n').length + ' riadkov';
});

skus('pri balíku Na kľúč zadanie krok Reklama obsahuje', () => {
  const zadanie = zostavZadanie_(
    { cislo: 'OBJ-2026-002', meno: 'Peter', email: 'a@b.sk', balik: 'Na kľúč', doplnky: '' },
    {}
  );
  nechNastane(/## 8\. Reklama/.test(zadanie), 'krok Reklama chýba');
});

console.log('\n== QR kód ==');

skus('PAY by square má očakávanú hlavičku a abecedu', () => {
  const retazec = payBySquare({ cisloObjednavky: 'OBJ-2026-001', suma: 134.5, iban: NASTAVENIA.iban, variabilnySymbol: '2026001', splatnost: '2026-11-06', prijemca: 'Daniel Tache', sprava: 'OBJ-2026-001' });
  nechNastane(/^[0-9A-V]+$/.test(retazec), 'reťazec nie je base32hex');
  nechNastane(retazec.slice(0, 4) === '0007', 'hlavička je ' + retazec.slice(0, 4));
  return retazec.length + ' znakov';
});

skus('QR obrázok je GIF', () => {
  const obrazok = qrObrazok('TEST');
  nechNastane(obrazok.typ === 'image/gif', 'typ je ' + obrazok.typ);
  return obrazok.bajty.length + ' B';
});

console.log('\n== Dotazník: polia na stránke a v generátore zadania ==');

skus('každé pole v dotaznik.html pozná aj Dotaznik.gs', () => {
  const html = readFileSync(KOREN + '/dotaznik.html', 'utf8');

  /* Polia zo stránky. Honeypot a token nepatria k otázkam. */
  const MIMO = ['t_hp', 'token'];
  const naStranke = new Set();
  for (const m of html.matchAll(/name="([a-z0-9]+_[a-z0-9]+)"/g)) {
    if (MIMO.indexOf(m[1]) === -1) { naStranke.add(m[1]); }
  }
  nechNastane(naStranke.size > 0, 'na stránke sa nenašlo žiadne pole');

  /* Polia, ktoré očakáva generátor zadania. */
  const vGeneratore = new Set();
  KROKY_DOTAZNIKA.forEach((krok) => {
    krok.otazky.forEach((otazka) => vGeneratore.add(krok.pole + '_' + otazka[0]));
  });

  const navyse = [...naStranke].filter((p) => !vGeneratore.has(p));
  const chybaju = [...vGeneratore].filter((p) => !naStranke.has(p));

  nechNastane(navyse.length === 0, 'stránka má polia, ktoré generátor nepozná: ' + navyse.join(', '));
  nechNastane(chybaju.length === 0, 'generátor čaká polia, ktoré na stránke nie sú: ' + chybaju.join(', '));

  return naStranke.size + ' polí v ' + KROKY_DOTAZNIKA.length + ' krokoch';
});

skus('poradie krokov na stránke sedí s generátorom', () => {
  const html = readFileSync(KOREN + '/dotaznik.html', 'utf8');
  const naStranke = [...html.matchAll(/data-krok="\d+" data-kluc="([a-z]+)"/g)].map((m) => m[1]);
  const vGeneratore = KROKY_DOTAZNIKA.map((k) => k.pole);
  nechNastane(naStranke.join(',') === vGeneratore.join(','),
    'stránka: ' + naStranke.join(',') + ' | generátor: ' + vGeneratore.join(','));
  return vGeneratore.join(', ');
});

console.log('\n== Spúšťače ==');

skus('po 10 dňoch sa objednávka uzavrie a miesto uvoľní', () => {
  const list = zapisane.listy['Objednávky'];
  const mapa = stlpce_(list);
  const predtym = volnychZakladatelskychMiest_();
  /* Posunieme čas prvej objednávky o 11 dní dozadu. */
  list.riadky[1][mapa['Čas'] - 1] = new Date(Date.now() - 11 * 86400000);
  list.riadky[1][mapa['Stav'] - 1] = STAVY.nova;
  dennaKontrola();
  nechNastane(list.riadky[1][mapa['Stav'] - 1] === STAVY.uzavreta, 'stav je ' + list.riadky[1][mapa['Stav'] - 1]);
  nechNastane(volnychZakladatelskychMiest_() >= predtym, 'miesto sa neuvoľnilo');
});

skus('po 5 dňoch odíde pripomienka práve raz', () => {
  const list = zapisane.listy['Objednávky'];
  const mapa = stlpce_(list);
  list.riadky[2][mapa['Čas'] - 1] = new Date(Date.now() - 6 * 86400000);
  list.riadky[2][mapa['Stav'] - 1] = STAVY.nova;
  list.riadky[2][mapa['Pripomienka odoslaná'] - 1] = '';
  const predtym = zapisane.maily.filter((m) => /Pripomienka/.test(m.predmet)).length;
  dennaKontrola();
  dennaKontrola();
  const potom = zapisane.maily.filter((m) => /Pripomienka/.test(m.predmet)).length;
  nechNastane(potom === predtym + 1, 'pripomienok odišlo ' + (potom - predtym));
});

skus('prepnutie stavu na Záloha prijatá pošle odkaz na dotazník', () => {
  const list = zapisane.listy['Objednávky'];
  const mapa = stlpce_(list);
  list.riadky[3][mapa['Stav'] - 1] = STAVY.zalohaPrijata;
  const predtym = zapisane.maily.length;
  priUpraveTabulky({ range: list.getRange(4, mapa['Stav']) });
  const novy = zapisane.maily.slice(predtym).find((m) => /dotazník/i.test(m.predmet));
  nechNastane(!!novy, 'e-mail s dotazníkom neodišiel');
  nechNastane(/\/dotaznik\?t=/.test(novy.telo), 'v e-maile nie je osobný odkaz');
});

/* --- Záver ---------------------------------------------------------------- */
console.log('\n' + (zlyhani === 0
  ? 'Všetko prešlo.'
  : 'Zlyhalo testov: ' + zlyhani));
process.exit(zlyhani === 0 ? 0 : 1);
