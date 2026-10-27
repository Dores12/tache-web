/* ==========================================================================
   Dotazník.

   Odkaz je osobný, platí preň token z objednávky. Bez platného tokenu sa
   dotazník neotvorí, overuje sa cez doGet s parametrom t.

   Po odoslaní sa z odpovedí poskladá zadanie pre Claude Code v markdowne,
   uloží sa do priečinka klienta a odkaz naň príde Danielovi. Nevyplnená
   odpoveď je v zadaní označená ❓ chýba, aby bolo hneď vidieť, čo treba
   doplniť.

   Otázky musia sedieť s poliami na stránke /dotaznik.
   ========================================================================== */

var KROKY_DOTAZNIKA = [
  {
    nazov: 'Firma', pole: 'firma', otazky: [
      ['nazov', 'Názov firmy'],
      ['ico', 'IČO'],
      ['odvetvie', 'Odvetvie'],
      ['adresa', 'Adresa prevádzky'],
      ['telefon', 'Telefón firmy pre web'],
      ['email', 'E-mail firmy'],
      ['hodiny', 'Otváracie hodiny']
    ]
  },
  {
    nazov: 'Ponuka', pole: 'ponuka', otazky: [
      ['sluzby', 'Služby a ceny'],
      ['najviac', 'Čo predávate najviac'],
      ['odlisnost', 'Čím sa líšite'],
      ['akcia', 'Aktuálna akcia']
    ]
  },
  {
    nazov: 'Cieľ webu', pole: 'ciel', otazky: [
      ['akcia', 'Čo má návštevník spraviť'],
      ['kto', 'Kto dopyt spracuje a ako rýchlo']
    ]
  },
  {
    nazov: 'Zákazník', pole: 'zakaznik', otazky: [
      ['kto', 'Kto kupuje'],
      ['obavy', 'Tri najčastejšie obavy alebo otázky'],
      ['preco', 'Prečo kupujú'],
      ['konkurenti', 'Dvaja až traja konkurenti']
    ]
  },
  {
    nazov: 'Podklady', pole: 'podklady', otazky: [
      ['texty', 'Existujúce texty'],
      ['fotky', 'Odkaz na priečinok s fotkami a logom'],
      ['farby', 'Firemné farby'],
      ['recenzie', 'Recenzie s menom a súhlasom']
    ]
  },
  {
    nazov: 'Vzhľad', pole: 'vzhlad', otazky: [
      ['web1', 'Web, ktorý sa páči 1'],
      ['web2', 'Web, ktorý sa páči 2'],
      ['web3', 'Web, ktorý sa páči 3'],
      ['preco', 'Čo sa na nich páči'],
      ['oslovenie', 'Vykanie alebo tykanie'],
      ['nalada', 'Nálada webu']
    ]
  },
  {
    nazov: 'Technika a účty', pole: 'technika', otazky: [
      ['domena', 'Doména a kde je'],
      ['web', 'Existujúci web'],
      ['email', 'E-mail na doméne'],
      ['ucty', 'Existujúce účty GA4, GTM, Meta, Google Ads']
    ]
  },
  {
    nazov: 'Reklama', pole: 'reklama', otazky: [
      ['platforma', 'Platforma'],
      ['rozpocet', 'Mesačný rozpočet'],
      ['oblast', 'Oblasť'],
      ['ponuka', 'Ponuka do reklamy'],
      ['skusenosti', 'Doterajšie skúsenosti']
    ]
  },
  {
    nazov: 'Právne', pole: 'pravne', otazky: [
      ['prevadzkovatel', 'Kto je prevádzkovateľ osobných údajov'],
      ['texty', 'Existujúce texty o ochrane údajov']
    ]
  }
];

/**
 * Nájde objednávku podľa tokenu.
 * Vráti { riadok, udaje } alebo null.
 */
function objednavkaPodlaTokenu_(token) {
  if (!token) { return null; }

  var list = karta_(KARTY.objednavky, HLAVICKY.objednavky);
  var poslednyRiadok = list.getLastRow();
  if (poslednyRiadok < 2) { return null; }

  var mapa = stlpce_(list);
  var hodnoty = list.getRange(2, 1, poslednyRiadok - 1, list.getLastColumn()).getValues();

  for (var i = 0; i < hodnoty.length; i++) {
    if (String(hodnoty[i][mapa['Token dotazníka'] - 1]) !== String(token)) {
      continue;
    }

    return {
      riadok: i + 2,
      mapa: mapa,
      list: list,
      udaje: {
        cislo: hodnoty[i][mapa['Číslo objednávky'] - 1],
        meno: hodnoty[i][mapa['Meno'] - 1],
        email: hodnoty[i][mapa['E-mail'] - 1],
        stav: String(hodnoty[i][mapa['Stav'] - 1]),
        balik: hodnoty[i][mapa['Balík'] - 1],
        doplnky: String(hodnoty[i][mapa['Doplnky'] - 1])
      }
    };
  }
  return null;
}

/** Spracovanie odoslaného dotazníka. */
function spracujDotaznik_(data) {
  var najdena = objednavkaPodlaTokenu_(data.token);
  if (!najdena) {
    return { ok: false, error: 'neplatny token' };
  }

  var zadanie = zostavZadanie_(najdena.udaje, data);
  var odkaz = '';

  try {
    var priecinok = priecinokObjednavky_(najdena.udaje.cislo, najdena.udaje.meno);
    var subor = priecinok.createFile(
      'Zadanie-' + najdena.udaje.cislo + '.md', zadanie, MimeType.PLAIN_TEXT
    );
    odkaz = subor.getUrl();
  } catch (chyba) {
    odkaz = 'CHYBA: ' + chyba;
  }

  karta_(KARTY.dotazniky, HLAVICKY.dotazniky).appendRow([
    new Date(), najdena.udaje.cislo, data.token, odkaz, JSON.stringify(data)
  ]);

  najdena.list
    .getRange(najdena.riadok, najdena.mapa['Stav'])
    .setValue(STAVY.dotaznikOdoslany);

  posliOznamenieDanielovi_('Dotazník vyplnený ' + najdena.udaje.cislo, [
    'Klient: ' + najdena.udaje.meno + ', ' + najdena.udaje.email,
    'Balík: ' + najdena.udaje.balik,
    '',
    'Zadanie pre Claude Code: ' + odkaz
  ]);

  return { ok: true, cislo: najdena.udaje.cislo };
}

/**
 * Zostaví zadanie pre Claude Code v markdowne.
 * Krok 8 o reklame sa vypíše, len keď je balík Na kľúč alebo je medzi
 * doplnkami reklama.
 */
function zostavZadanie_(objednavka, odpovede) {
  var CHYBA = '❓ chýba';
  var riadky = [];

  riadky.push('# Zadanie webu: ' + (hodnotaOdpovede_(odpovede, 'firma', 'nazov') || objednavka.meno));
  riadky.push('');
  riadky.push('Objednávka ' + objednavka.cislo + ', balík ' + objednavka.balik + '.');
  if (objednavka.doplnky) {
    riadky.push('Doplnky: ' + objednavka.doplnky + '.');
  }
  riadky.push('Kontakt na klienta: ' + objednavka.email + '.');
  riadky.push('Dotazník vyplnený ' + datumSk_(new Date()) + '.');
  riadky.push('');

  var chceReklamu = String(objednavka.balik).indexOf('kľúč') !== -1
    || /reklam/i.test(String(objednavka.doplnky));

  KROKY_DOTAZNIKA.forEach(function (krok, index) {
    if (krok.pole === 'reklama' && !chceReklamu) { return; }

    riadky.push('## ' + (index + 1) + '. ' + krok.nazov);
    riadky.push('');

    krok.otazky.forEach(function (otazka) {
      var hodnota = hodnotaOdpovede_(odpovede, krok.pole, otazka[0]);
      riadky.push('- **' + otazka[1] + ':** ' + (hodnota || CHYBA));
    });

    riadky.push('');
  });

  riadky.push('---');
  riadky.push('');
  riadky.push('Zostavené automaticky z vyplneného dotazníka. Všade, kde je '
    + CHYBA + ', odpoveď chýba a treba ju doplniť u klienta.');

  return riadky.join('\n');
}

/** Odpoveď sa posiela ako firma_nazov, ciel_akcia a podobne. */
function hodnotaOdpovede_(odpovede, krok, otazka) {
  var hodnota = odpovede[krok + '_' + otazka];
  return hodnota === undefined ? '' : String(hodnota).trim();
}
