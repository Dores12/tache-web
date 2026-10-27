/* ==========================================================================
   Spúšťače.

   Spusti raz nastavSpustace() z editora. Založí dva spúšťače:
     - denný, ktorý rieši pripomienky a uzatváranie objednávok,
     - pri úprave tabuľky, ktorý zareaguje na prepnutie stavu na
       „Záloha prijatá“.

   Spúšťač pri úprave musí byť inštalovaný, nie jednoduchý onEdit.
   Jednoduchý nemá právo posielať e-maily.
   ========================================================================== */

function nastavSpustace() {
  /* Najprv zmažeme staré, nech sa po opakovanom spustení nehromadia. */
  ScriptApp.getProjectTriggers().forEach(function (spustac) {
    ScriptApp.deleteTrigger(spustac);
  });

  ScriptApp.newTrigger('dennaKontrola')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  ScriptApp.newTrigger('priUpraveTabulky')
    .forSpreadsheet(NASTAVENIA.tabulkaId)
    .onEdit()
    .create();

  Logger.log('Spúšťače nastavené.');
}

/** Koľko dní ubehlo od dátumu. */
function dniOd_(datum) {
  if (!(datum instanceof Date)) { return 0; }
  return Math.floor((new Date().getTime() - datum.getTime()) / 86400000);
}

/**
 * Denná kontrola nezaplatených záloh.
 * Po 5 dňoch pripomienka, po 10 dňoch stav Uzavretá a uvoľnenie miesta.
 */
function dennaKontrola() {
  var list = karta_(KARTY.objednavky, HLAVICKY.objednavky);
  var poslednyRiadok = list.getLastRow();
  if (poslednyRiadok < 2) { return; }

  var mapa = stlpce_(list);
  var hodnoty = list.getRange(2, 1, poslednyRiadok - 1, list.getLastColumn()).getValues();

  for (var i = 0; i < hodnoty.length; i++) {
    var riadok = hodnoty[i];
    var cisloRiadka = i + 2;
    var stav = String(riadok[mapa['Stav'] - 1]);

    /* Zaplatené aj uzavreté objednávky preskakujeme. */
    if (stav !== STAVY.nova) { continue; }

    var dni = dniOd_(riadok[mapa['Čas'] - 1]);
    var pripomienkaOdoslana = String(riadok[mapa['Pripomienka odoslaná'] - 1]);

    var objednavka = {
      cislo: riadok[mapa['Číslo objednávky'] - 1],
      meno: riadok[mapa['Meno'] - 1],
      email: riadok[mapa['E-mail'] - 1],
      zaloha: Number(riadok[mapa['Záloha'] - 1]),
      variabilnySymbol: riadok[mapa['Variabilný symbol'] - 1],
      splatnost: riadok[mapa['Splatnosť'] - 1],
      token: riadok[mapa['Token dotazníka'] - 1]
    };

    if (dni >= NASTAVENIA.uzavrietPoDnoch) {
      list.getRange(cisloRiadka, mapa['Stav']).setValue(STAVY.uzavreta);

      posliOznamenieDanielovi_('Objednávka ' + objednavka.cislo + ' uzavretá', [
        'Záloha neprišla ani po ' + NASTAVENIA.uzavrietPoDnoch + ' dňoch.',
        'Stav je Uzavretá a zakladateľské miesto sa uvoľnilo.',
        '',
        'Klient: ' + objednavka.meno + ', ' + objednavka.email
      ]);
      continue;
    }

    if (dni >= NASTAVENIA.pripomienkaPoDnoch && !pripomienkaOdoslana) {
      try {
        posliPripomienku_(objednavka);
        list.getRange(cisloRiadka, mapa['Pripomienka odoslaná']).setValue(new Date());
      } catch (chyba) {
        nahlasChybu_(chyba, 'pripomienka ' + objednavka.cislo);
      }
    }
  }
}

/**
 * Reakcia na ručnú zmenu v tabuľke. Keď Daniel prepne stav na
 * „Záloha prijatá“, klientovi odíde osobný odkaz na dotazník.
 */
function priUpraveTabulky(e) {
  try {
    if (!e || !e.range) { return; }

    var list = e.range.getSheet();
    if (list.getName() !== KARTY.objednavky) { return; }

    var mapa = stlpce_(list);
    if (e.range.getColumn() !== mapa['Stav']) { return; }
    if (String(e.range.getValue()) !== STAVY.zalohaPrijata) { return; }

    var cisloRiadka = e.range.getRow();
    if (cisloRiadka < 2) { return; }

    var riadok = list.getRange(cisloRiadka, 1, 1, list.getLastColumn()).getValues()[0];

    posliOdkazNaDotaznik_({
      cislo: riadok[mapa['Číslo objednávky'] - 1],
      meno: riadok[mapa['Meno'] - 1],
      email: riadok[mapa['E-mail'] - 1],
      token: riadok[mapa['Token dotazníka'] - 1]
    });

    posliOznamenieDanielovi_('Odkaz na dotazník odoslaný', [
      'Objednávka: ' + riadok[mapa['Číslo objednávky'] - 1],
      'Klient: ' + riadok[mapa['E-mail'] - 1]
    ]);

  } catch (chyba) {
    nahlasChybu_(chyba, 'spúšťač pri úprave tabuľky');
  }
}
