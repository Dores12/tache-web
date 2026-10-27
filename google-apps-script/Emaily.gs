/* ==========================================================================
   E-maily.

   Klientovi píšeme z adresy na doméne. Apps Script vie odosielať z inej
   adresy, len ak je v Gmaile nastavená ako alias. Kým alias nie je,
   e-mail odíde z adresy účtu a Daniel na to dostane upozornenie.

   Oznámenia Danielovi idú cez MailApp a nikdy neobsahujú identifikátory
   kliknutia z reklamy. Tie patria len do tabuľky.

   Pred prvým ostrým e-mailom nastav na doméne SPF, DKIM a DMARC.
   ========================================================================== */

/** Adresa, z ktorej sa dá odosielať, alebo prázdny reťazec. */
function alias_() {
  if (!NASTAVENIA.email) { return ''; }
  try {
    var aliasy = GmailApp.getAliases();
    return aliasy.indexOf(NASTAVENIA.email) === -1 ? '' : NASTAVENIA.email;
  } catch (chyba) {
    return '';
  }
}

/** Odoslanie klientovi. */
function posliKlientovi_(komu, predmet, riadky, prilohy) {
  var telo = riadky.join('\n');
  var volby = { name: 'Tache' };

  var odosielatel = alias_();
  if (odosielatel) {
    volby.from = odosielatel;
    volby.replyTo = odosielatel;
  } else if (NASTAVENIA.email) {
    volby.replyTo = NASTAVENIA.email;
  }

  if (prilohy && prilohy.length) { volby.attachments = prilohy; }

  GmailApp.sendEmail(komu, predmet, telo, volby);
}

/** Oznámenie Danielovi. */
function posliOznamenieDanielovi_(predmet, riadky) {
  if (!NASTAVENIA.email) { return; }

  var text = riadky.filter(function (r) { return r !== ''; }).join('\n');
  MailApp.sendEmail(NASTAVENIA.email, '[Tache] ' + predmet, text);
}

/** Keď doPost spadne, nech sa o tom Daniel dozvie hneď. */
function nahlasChybu_(chyba, telo) {
  if (!NASTAVENIA.email) { return; }

  MailApp.sendEmail(
    NASTAVENIA.email,
    '[Tache] CHYBA vo formulári',
    'Chyba: ' + chyba + '\n\nStack: ' + (chyba && chyba.stack ? chyba.stack : '-')
      + '\n\nPrijaté dáta:\n' + String(telo).slice(0, 3000)
  );
}

/* --- Objednávka --------------------------------------------------------- */
function posliObjednavkuKlientovi_(objednavka, fakturaUrl, pdf) {
  var sucet = objednavka.sucet;
  var polozky = [sucet.balik.name + ': ' + cena_(sucet.zaBalik)];
  sucet.doplnky.forEach(function (d) {
    polozky.push(d.name + ': ' + cena_(d.price));
  });

  var riadky = [
    'Dobrý deň, ' + objednavka.meno + ',',
    '',
    'ďakujem za objednávku. Jej číslo je ' + objednavka.cislo + '.',
    '',
    'Čo ste si objednali:',
    polozky.join('\n'),
    'Spolu: ' + cena_(sucet.spolu),
    '',
    'Na úhradu teraz: ' + cena_(sucet.zaloha) + ' (záloha 50 %)',
    'Doplatok ' + cena_(sucet.doplatok) + ' až pred spustením na vašej doméne.',
    '',
    'Platobné údaje:',
    'IBAN: ' + NASTAVENIA.iban,
    'Variabilný symbol: ' + objednavka.variabilnySymbol,
    'Správa pre prijímateľa: ' + objednavka.cislo,
    'Splatnosť: ' + datumSk_(objednavka.splatnost),
    '',
    'V prílohe je zálohová faktúra aj s QR kódom. Naskenujte ho v aplikácii '
      + 'banky a suma aj variabilný symbol sa vyplnia samé.',
    '',
    'Hneď ako uvidím zálohu na účte, pošlem vám odkaz na vstupný dotazník. '
      + 'Jeho vyplnenie trvá asi 30 minút a od neho začína plynúť termín '
      + 'dodania, teda ' + sucet.balik.days + '.',
    '',
    'Ak čokoľvek nesedí, stačí odpísať na tento e-mail.',
    '',
    NASTAVENIA.owner
  ];

  posliKlientovi_(objednavka.email, 'Objednávka ' + objednavka.cislo
    + ' a zálohová faktúra', riadky, pdf ? [pdf] : []);
}

/* --- Kontrola webu ------------------------------------------------------- */
function posliKontrolaKlientovi_(data) {
  posliKlientovi_(data.email, 'Váš web som dostal na kontrolu', [
    'Dobrý deň,',
    '',
    'odkaz na web ' + data.web + ' mi prišiel, ďakujem.',
    '',
    'Pozriem sa naň a ' + NASTAVENIA.auditTime + ' vám napíšem tri veci, '
      + 'ktoré by som na ňom zmenil, aby sa z rovnakej návštevnosti ozvalo '
      + 'viac ľudí.',
    '',
    'Je to zadarmo a k ničomu vás to nezaväzuje.',
    '',
    NASTAVENIA.owner
  ]);
}

/* --- Správa o reklame ---------------------------------------------------- */
function posliReklamaKlientovi_(data) {
  posliKlientovi_(data.email, 'Vaša správa mi prišla', [
    'Dobrý deň, ' + data.meno + ',',
    '',
    'vaša správa mi prišla, ďakujem.',
    '',
    'Odpíšem vám ' + NASTAVENIA.replyTime + ', ktorá platforma pre vašu firmu '
      + 'dáva zmysel a s akým rozpočtom začať.',
    '',
    'Odpoveď je zadarmo a k ničomu vás nezaväzuje.',
    '',
    NASTAVENIA.owner
  ]);
}

/* --- Pripomienka nezaplatenej zálohy -------------------------------------- */
function posliPripomienku_(objednavka) {
  posliKlientovi_(objednavka.email, 'Pripomienka: objednávka '
    + objednavka.cislo, [
    'Dobrý deň, ' + objednavka.meno + ',',
    '',
    'pripomínam zálohovú faktúru k objednávke ' + objednavka.cislo + '.',
    '',
    'Na úhradu: ' + cena_(objednavka.zaloha),
    'IBAN: ' + NASTAVENIA.iban,
    'Variabilný symbol: ' + objednavka.variabilnySymbol,
    'Splatnosť: ' + datumSk_(objednavka.splatnost),
    '',
    'Ak ste si to medzitým rozmysleli, nič sa nedeje, stačí odpísať. '
      + 'Po ' + NASTAVENIA.uzavrietPoDnoch + ' dňoch objednávku uzavriem '
      + 'a miesto uvoľním ďalšiemu záujemcovi.',
    '',
    NASTAVENIA.owner
  ]);
}

/* --- Odkaz na dotazník ---------------------------------------------------- */
function posliOdkazNaDotaznik_(objednavka) {
  var odkaz = NASTAVENIA.webUrl + '/dotaznik?t=' + objednavka.token;

  posliKlientovi_(objednavka.email, 'Zálohu mám, tu je dotazník', [
    'Dobrý deň, ' + objednavka.meno + ',',
    '',
    'zálohu k objednávke ' + objednavka.cislo + ' mám na účte, ďakujem.',
    '',
    'Teraz potrebujem od vás odpovede na pár otázok o firme, službách '
      + 'a cenách. Vyplnenie trvá asi 30 minút a rozpracované odpovede sa '
      + 'vám priebežne ukladajú, takže môžete prestať a vrátiť sa cez '
      + 'rovnaký odkaz.',
    '',
    odkaz,
    '',
    'Odkaz je osobný, neposielajte ho ďalej.',
    '',
    'Od vyplnenia dotazníka a dodania podkladov začína plynúť termín '
      + 'dodania.',
    '',
    NASTAVENIA.owner
  ]);
}
