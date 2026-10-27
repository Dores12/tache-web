/* ==========================================================================
   Objednávka.

   Cenu počíta server z vlastných dát (Baliky.gs), to, čo poslal prehliadač,
   sa len porovná. Keby sa niekto pokúsil poslať vlastnú sumu, do tabuľky
   ani do faktúry sa nedostane.
   ========================================================================== */

function spracujObjednavku_(data) {
  var list = karta_(KARTY.objednavky, HLAVICKY.objednavky);
  var mapa = stlpce_(list);

  if (jeDuplicita_(list, data.email, mapa['E-mail'])) {
    return { ok: true, duplicita: true };
  }

  /* Zakladateľská cena platí, kým sú voľné miesta. */
  var volne = volnychZakladatelskychMiest_();
  var sucet = spocitajObjednavku_(
    data.balik,
    data.doplnky || [],
    volne > 0
  );

  if (!sucet) {
    return { ok: false, error: 'neznamy balik' };
  }

  /* Keď sa suma z prehliadača nezhoduje, platí tá naša. Stáva sa to, keď
     posledné zakladateľské miesto padne medzi načítaním a odoslaním. */
  var poslanaSuma = Number(data.spolu);
  var sumaSedi = !isNaN(poslanaSuma)
    && Math.abs(poslanaSuma - sucet.spolu) < 0.01;

  var cislovanie = dalsieCisloObjednavky_(list);
  var dnes = new Date();
  var splatnost = new Date(dnes.getTime()
    + NASTAVENIA.splatnostDni * 24 * 60 * 60 * 1000);

  var token = Utilities.getUuid();

  var nazvyDoplnkov = sucet.doplnky.map(function (d) { return d.name; }).join(', ');

  var objednavka = {
    cislo: cislovanie.cislo,
    variabilnySymbol: cislovanie.variabilnySymbol,
    meno: data.meno,
    email: data.email,
    firma: data.firma || '',
    odvetvie: data.odvetvie,
    sucet: sucet,
    splatnost: splatnost,
    token: token,
    eventId: data.event_id
  };

  /* Faktúra sa skúsi vyrobiť, ale objednávku nesmie zhodiť. Keď zlyhá,
     riadok v tabuľke aj tak vznikne a Daniel dostane upozornenie. */
  var faktura = { url: '', subor: null, chyba: '' };
  try {
    var vyrobena = vytvorZalohovuFakturu_(objednavka);
    faktura.url = vyrobena.url;
    faktura.subor = vyrobena.subor;
  } catch (chyba) {
    faktura.chyba = String(chyba);
  }

  list.appendRow([
    dnes,
    objednavka.cislo,
    STAVY.nova,
    objednavka.meno,
    objednavka.email,
    objednavka.firma,
    objednavka.odvetvie,
    sucet.balik.name,
    nazvyDoplnkov,
    sucet.spolu,
    sucet.zaloha,
    sucet.doplatok,
    sucet.zakladatelska ? 'áno' : 'nie',
    objednavka.variabilnySymbol,
    splatnost,
    faktura.url || ('CHYBA: ' + faktura.chyba),
    token,
    '',
    zdrojAkoText_(data),
    objednavka.eventId
  ]);

  try {
    posliObjednavkuKlientovi_(
      objednavka,
      faktura.url,
      faktura.subor ? faktura.subor.getBlob() : null
    );
  } catch (chyba) {
    faktura.chyba += ' e-mail klientovi: ' + chyba;
  }

  posliOznamenieDanielovi_('Nová objednávka ' + objednavka.cislo, [
    'Balík: ' + sucet.balik.name,
    'Doplnky: ' + (nazvyDoplnkov || 'žiadne'),
    'Spolu: ' + cena_(sucet.spolu) + ', záloha ' + cena_(sucet.zaloha),
    'Zakladateľská cena: ' + (sucet.zakladatelska ? 'áno' : 'nie')
      + ' (voľných miest po tejto objednávke: ' + Math.max(0, volne - 1) + ')',
    '',
    'Meno: ' + objednavka.meno,
    'E-mail: ' + objednavka.email,
    'Firma alebo IČO: ' + (objednavka.firma || 'neuvedené, objednáva spotrebiteľ'),
    'Odvetvie: ' + objednavka.odvetvie,
    '',
    sumaSedi ? '' : 'POZOR: suma z webu bola ' + data.spolu
      + ', platí vypočítaná ' + sucet.spolu,
    faktura.chyba ? 'POZOR: faktúra zlyhala, ' + faktura.chyba : 'Faktúra: ' + faktura.url
  ]);

  return {
    ok: true,
    cislo: objednavka.cislo,
    variabilnySymbol: objednavka.variabilnySymbol,
    spolu: sucet.spolu,
    zaloha: sucet.zaloha
  };
}

/**
 * Priečinok klienta na Drive. Každá objednávka má vlastný, aby v ňom
 * neskôr mohlo pristáť aj zadanie z dotazníka.
 */
function priecinokObjednavky_(cislo, meno) {
  if (!NASTAVENIA.priecinokId) {
    throw new Error('V nastaveniach chýba priecinokId');
  }

  var rodic = DriveApp.getFolderById(NASTAVENIA.priecinokId);
  var nazov = cislo + ' ' + meno;
  var existujuce = rodic.getFoldersByName(nazov);

  return existujuce.hasNext() ? existujuce.next() : rodic.createFolder(nazov);
}
