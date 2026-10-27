/* ==========================================================================
   Nastavenia – všetko, čo sa mení, je tu a nikde inde.

   Hodnoty v hranatých zátvorkách doplní Daniel po vytvorení tabuľky,
   priečinka a šablóny faktúry. Kým sú prázdne, doGet() na ne upozorní
   a doPost() dopyt aj tak uloží, len nepošle faktúru.

   Pozor: tento súbor patrí do projektu Apps Scriptu, nie na web. Nikdy ho
   nekopíruj do assets/js.
   ========================================================================== */

var NASTAVENIA = {
  /* --- Identita a platby ------------------------------------------------ */
  owner: 'Daniel Tache',
  email: '',                  // e-mail na doméne, chodia naň notifikácie
  ico: '',
  dic: '',
  businessAddress: '',
  tradeRegister: '',
  iban: '',
  vatPayer: false,

  /* --- Google súbory ---------------------------------------------------- */
  tabulkaId: '',              // ID tabuľky s dopytmi a objednávkami
  priecinokId: '',            // ID priečinka na Drive, kam idú faktúry
  sablonaFakturyId: '',       // ID dokumentu so šablónou zálohovej faktúry

  /* --- Obchodné pravidlá ------------------------------------------------- */
  zalohaPodiel: 0.5,          // záloha 50 %
  splatnostDni: 10,           // splatnosť zálohovej faktúry
  pripomienkaPoDnoch: 5,      // pripomienka po 5 dňoch bez platby
  uzavrietPoDnoch: 10,        // po 10 dňoch stav Uzavretá a uvoľnenie miesta
  duplicitaMinut: 10,         // rovnaký e-mail a typ do 10 minút = duplicita
  najskorOdoslanieMs: 2000,   // rýchlejšie odoslanie je robot

  /* --- Web --------------------------------------------------------------- */
  webUrl: 'https://tache.netlify.app',
  replyTime: 'do 24 hodín v pracovné dni',
  auditTime: 'do 2 pracovných dní',

  /* --- Vývoj -------------------------------------------------------------- */
  debug: false
};

/* Názvy kariet v tabuľke. Musia sedieť s tým, čo je v Sheete. */
var KARTY = {
  objednavky: 'Objednávky',
  kontroly: 'Kontroly webu',
  reklama: 'Reklama',
  dotazniky: 'Dotazníky',
  spam: 'Spam'
};

/* Stavy objednávky. Daniel ich prepína ručne v stĺpci Stav. */
var STAVY = {
  nova: 'Nová',
  zalohaPrijata: 'Záloha prijatá',
  dotaznikOdoslany: 'Dotazník vyplnený',
  hotovo: 'Hotovo',
  uzavreta: 'Uzavretá'
};

/* Hlavičky kariet. Poradie určuje poradie stĺpcov, meniť len s tabuľkou. */
var HLAVICKY = {
  objednavky: [
    'Čas', 'Číslo objednávky', 'Stav', 'Meno', 'E-mail', 'Firma alebo IČO',
    'Odvetvie', 'Balík', 'Doplnky', 'Spolu', 'Záloha', 'Doplatok',
    'Zakladateľská cena', 'Variabilný symbol', 'Splatnosť', 'Faktúra',
    'Token dotazníka', 'Pripomienka odoslaná', 'Zdroj', 'event_id'
  ],
  kontroly: ['Čas', 'E-mail', 'Web', 'Stav', 'Zdroj', 'event_id'],
  reklama: ['Čas', 'Meno', 'E-mail', 'Web', 'Platforma', 'Správa', 'Stav',
    'Zdroj', 'event_id'],
  dotazniky: ['Čas', 'Číslo objednávky', 'Token', 'Zadanie', 'Odpovede'],
  spam: ['Čas', 'Typ', 'Dôvod', 'Údaje']
};
