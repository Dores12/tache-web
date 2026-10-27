/* ==========================================================================
   Zálohová faktúra.

   Zo šablóny v Google Docs vznikne kópia, do nej sa doplnia údaje a QR kód,
   potom sa uloží ako PDF do priečinka klienta a kópia sa zmaže.

   Riadnu faktúru po prijatí platby vystavuje Daniel ručne. Toto je len
   zálohová faktúra, teda výzva na úhradu.

   Náležitosti šablóny nechaj skontrolovať účtovníkovi. Funkcia
   vytvorSablonuFaktury() vyrobí základnú šablónu, z ktorej sa dá vychádzať.
   ========================================================================== */

/** Dátum v tvare 6. 11. 2026. */
function datumSk_(datum) {
  return datum.getDate() + '. ' + (datum.getMonth() + 1) + '. '
    + datum.getFullYear();
}

/** Dátum v tvare 2026-11-06 pre QR kód. */
function datumIso_(datum) {
  return Utilities.formatDate(datum, 'Europe/Bratislava', 'yyyy-MM-dd');
}

/**
 * Vyrobí PDF zálohovej faktúry.
 * Vracia { url, subor }, súbor sa prikladá k e-mailu klientovi.
 */
function vytvorZalohovuFakturu_(objednavka) {
  if (!NASTAVENIA.sablonaFakturyId) {
    throw new Error('V nastaveniach chýba sablonaFakturyId');
  }

  var priecinok = priecinokObjednavky_(objednavka.cislo, objednavka.meno);
  var sucet = objednavka.sucet;

  /* Kópia šablóny, do ktorej sa píše. */
  var kopia = DriveApp.getFileById(NASTAVENIA.sablonaFakturyId)
    .makeCopy('pracovná kópia ' + objednavka.cislo, priecinok);

  var dokument = DocumentApp.openById(kopia.getId());
  var telo = dokument.getBody();

  /* Položky faktúry ako jeden odsek na riadok. */
  var polozky = [sucet.balik.name + ' – ' + cena_(sucet.zaBalik)];
  sucet.doplnky.forEach(function (d) {
    polozky.push(d.name + ' – ' + cena_(d.price));
  });

  var nahrady = {
    '{{cislo}}': objednavka.cislo,
    '{{datum}}': datumSk_(new Date()),
    '{{splatnost}}': datumSk_(objednavka.splatnost),
    '{{vs}}': objednavka.variabilnySymbol,
    '{{odberatel}}': objednavka.meno,
    '{{email}}': objednavka.email,
    '{{firma}}': objednavka.firma || '',
    '{{polozky}}': polozky.join('\n'),
    '{{spolu}}': cena_(sucet.spolu),
    '{{zaloha}}': cena_(sucet.zaloha),
    '{{doplatok}}': cena_(sucet.doplatok),
    '{{dodavatel}}': NASTAVENIA.owner,
    '{{adresa}}': NASTAVENIA.businessAddress,
    '{{ico}}': NASTAVENIA.ico,
    '{{register}}': NASTAVENIA.tradeRegister,
    '{{iban}}': NASTAVENIA.iban,
    '{{dph}}': NASTAVENIA.vatPayer ? '' : 'Nie som platca DPH.'
  };

  Object.keys(nahrady).forEach(function (kluc) {
    telo.replaceText(kluc.replace(/[{}]/g, '\\$&'), nahrady[kluc]);
  });

  /* QR kód na miesto {{qr}}. */
  vlozQrKod_(telo, objednavka);

  dokument.saveAndClose();

  var pdf = priecinok.createFile(
    kopia.getAs('application/pdf').setName('Zalohova-faktura-' + objednavka.cislo + '.pdf')
  );

  kopia.setTrashed(true);

  return { url: pdf.getUrl(), subor: pdf };
}

/**
 * Nájde odsek s {{qr}} a nahradí ho obrázkom QR kódu.
 */
function vlozQrKod_(telo, objednavka) {
  var najdene = telo.findText('\\{\\{qr\\}\\}');
  if (!najdene) { return; }

  var retazec = payBySquare({
    cisloObjednavky: objednavka.cislo,
    suma: objednavka.sucet.zaloha,
    iban: NASTAVENIA.iban,
    variabilnySymbol: objednavka.variabilnySymbol,
    splatnost: datumIso_(objednavka.splatnost),
    prijemca: NASTAVENIA.owner,
    sprava: objednavka.cislo
  });

  var odsek = najdene.getElement().getParent().asParagraph();
  odsek.clear();
  odsek.appendInlineImage(qrObrazok(retazec)).setWidth(150).setHeight(150);
}

/* ==========================================================================
   Jednorazová pomôcka: vyrobí šablónu faktúry.

   Spusti raz z editora, ID výsledného dokumentu vlož do NASTAVENIA
   .sablonaFakturyId a potom si dokument uprav podľa seba. Zachovaj značky
   v dvojitých zátvorkách, tie sa pri každej objednávke nahrádzajú.
   ========================================================================== */
function vytvorSablonuFaktury() {
  var dokument = DocumentApp.create('Tache – šablóna zálohovej faktúry');
  var telo = dokument.getBody();
  telo.clear();

  function nadpis(text) {
    telo.appendParagraph(text).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  }

  telo.appendParagraph('Zálohová faktúra {{cislo}}')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  telo.appendParagraph('Toto nie je daňový doklad. Riadnu faktúru dostanete '
    + 'po pripísaní platby.');

  nadpis('Dodávateľ');
  telo.appendParagraph('{{dodavatel}}');
  telo.appendParagraph('{{adresa}}');
  telo.appendParagraph('IČO: {{ico}}');
  telo.appendParagraph('Zapísaný v živnostenskom registri {{register}}');
  telo.appendParagraph('{{dph}}');

  nadpis('Odberateľ');
  telo.appendParagraph('{{odberatel}}');
  telo.appendParagraph('{{firma}}');
  telo.appendParagraph('{{email}}');

  nadpis('Predmet');
  telo.appendParagraph('{{polozky}}');
  telo.appendParagraph('Cena celkom: {{spolu}}');
  telo.appendParagraph('Záloha na úhradu: {{zaloha}}');
  telo.appendParagraph('Doplatok pred spustením: {{doplatok}}');

  nadpis('Platba');
  telo.appendParagraph('Dátum vystavenia: {{datum}}');
  telo.appendParagraph('Splatnosť: {{splatnost}}');
  telo.appendParagraph('IBAN: {{iban}}');
  telo.appendParagraph('Variabilný symbol: {{vs}}');
  telo.appendParagraph('Správa pre prijímateľa: {{cislo}}');
  telo.appendParagraph('{{qr}}');
  telo.appendParagraph('QR kód naskenujte v aplikácii banky, suma aj '
    + 'variabilný symbol sa vyplnia samé.');

  dokument.saveAndClose();

  Logger.log('ID šablóny: ' + dokument.getId());
  return dokument.getId();
}
