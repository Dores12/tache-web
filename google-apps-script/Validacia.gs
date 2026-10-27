/* ==========================================================================
   Validácia na serveri.

   Platia tie isté pravidlá ako v prehliadači (assets/js/forms.js). Klientskej
   validácii sa veriť nedá, požiadavka môže prísť odkiaľkoľvek.

   Vracia pole chýb. Prázdne pole znamená, že je všetko v poriadku.
   ========================================================================== */

function jeEmail_(hodnota) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(hodnota || '').trim());
}

function jeOdkaz_(hodnota) {
  return /^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/\S*)?$/
    .test(String(hodnota || '').trim());
}

function textJe_(hodnota, najmenej, najviac) {
  var dlzka = String(hodnota || '').trim().length;
  return dlzka >= najmenej && dlzka <= najviac;
}

/**
 * Skontroluje dáta podľa typu formulára.
 * Vracia { chyby: [...], spam: 'dôvod' alebo '' }.
 */
function skontroluj_(data) {
  var chyby = [];
  var spam = '';

  /* Honeypot a čas vyplnenia. Spam sa neodmieta, ide do karty Spam
     a odpoveď je aj tak kladná, aby robot nevedel, že ho vidíme. */
  if (String(data.t_hp || '').trim() !== '') {
    spam = 'vyplnený honeypot';
  } else if (Number(data.elapsed_ms || 0) < NASTAVENIA.najskorOdoslanieMs) {
    spam = 'odoslané za ' + data.elapsed_ms + ' ms';
  }

  if (!jeEmail_(data.email)) {
    chyby.push('email');
  }

  switch (data.typ) {
    case 'audit':
      if (!jeOdkaz_(data.web)) { chyby.push('web'); }
      break;

    case 'ads':
      if (!textJe_(data.meno, 2, 120)) { chyby.push('meno'); }
      if (!textJe_(data.sprava, 10, 4000)) { chyby.push('sprava'); }
      if (['Meta', 'Google', 'Meta aj Google', 'Ešte neviem']
        .indexOf(String(data.platforma)) === -1) {
        chyby.push('platforma');
      }
      if (data.web && !jeOdkaz_(data.web)) { chyby.push('web'); }
      break;

    case 'order':
      if (!textJe_(data.meno, 2, 120)) { chyby.push('meno'); }
      if (!textJe_(data.odvetvie, 1, 120)) { chyby.push('odvetvie'); }
      if (data.podmienky !== true && data.podmienky !== 'true') {
        chyby.push('podmienky');
      }
      /* Bez IČO objednáva spotrebiteľ a musí potvrdiť začatie práce
         pred uplynutím 14-dňovej lehoty na odstúpenie. */
      if (!String(data.firma || '').trim()
        && data.lehota !== true && data.lehota !== 'true') {
        chyby.push('lehota');
      }
      if (!balikPodlaId_(data.balik)) { chyby.push('balik'); }
      break;

    case 'questionnaire':
      if (!String(data.token || '').trim()) { chyby.push('token'); }
      break;

    default:
      chyby.push('typ');
  }

  return { chyby: chyby, spam: spam };
}
