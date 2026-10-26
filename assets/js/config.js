/* ==========================================================================
   Konfigurácia – všetko, čo sa mení, je tu a nikde inde.
   Načítava sa ako prvá, bez defer, pretože z nej čerpá aj GTM v hlavičke.

   Pravidlo: prázdna hodnota znamená, že sa prvok nevykreslí. Údaje, ktoré
   Daniel ešte nedodal, tu zámerne zostávajú prázdne.
   ========================================================================== */

window.TACHE = window.TACHE || {};

window.TACHE.config = {
  /* --- Adresa webu ---------------------------------------------------
     Zatiaľ náhľad na Netlify. Pri pripojení domény sa zmení na
     https://tache.sk a podľa CLAUDE.md sekcia 9 treba prejsť aj canonical,
     og:*, domény v GA4 a overenie domény v Meta.
     ----------------------------------------------------------------- */
  siteUrl: 'https://tache.netlify.app',

  /* --- Kontakt a živnosť --------------------------------------------- */
  email: '',                  // e-mail na doméne, chýba
  owner: 'Daniel Tache',
  businessAddress: '',        // miesto podnikania, chýba
  ico: '',                    // IČO, chýba
  tradeRegister: '',          // okresný úrad, chýba
  vatPayer: false,

  /* --- Platby -------------------------------------------------------- */
  iban: '',                   // IBAN, chýba
  beneficiary: 'Daniel Tache',
  proformaDueDays: 10,

  /* --- Meranie a backend --------------------------------------------- */
  gtmId: '',                  // GTM ID, chýba. Prázdne = GTM sa nenačíta.
  formEndpoint: '',           // URL Apps Scriptu. Prázdne = testovací režim.

  /* --- Zakladateľské miesta ------------------------------------------
     Pri 0 sa zakladateľské ceny a všetky zmienky o nich nevykreslia
     a platia bežné ceny.
     ----------------------------------------------------------------- */
  founderSlotsTotal: 5,
  founderSlotsLeft: 4,

  /* --- Časy odpovede -------------------------------------------------- */
  replyTime: 'do 24 hodín v pracovné dni',
  auditTime: 'do 2 pracovných dní',

  /* --- Prepínače sekcií ----------------------------------------------- */
  blogEnabled: false,         // Blog príde vo fáze 2.

  /* --- Vývoj ---------------------------------------------------------- */
  debug: false                // true vypisuje pushe do dataLayeru do konzoly.
};
