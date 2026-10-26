/* ==========================================================================
   Správa reklamy.

   Tlačidlá pri plánoch predvyberú platformu vo formulári a posunú naň.
   Formulár typu ads potvrdzuje server, až potom sa pushne ads_inquiry.
   ========================================================================== */

window.TACHE = window.TACHE || {};
window.TACHE.pages = window.TACHE.pages || {};

(function () {
  'use strict';

  var odpojit = [];
  var odpojitFormular = null;

  function obmedzitPohyb() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* --- Tlačidlá plánov --------------------------------------------------- */
  function tlacidlaPlanov() {
    var vyber = document.querySelector('[name="platforma"]');
    var sekcia = document.getElementById('napiste-mi');
    if (!vyber || !sekcia) { return; }

    function naKlik(e) {
      var tlacidlo = e.target.closest('[data-platforma]');
      if (!tlacidlo) { return; }

      vyber.value = tlacidlo.getAttribute('data-platforma');
      sekcia.scrollIntoView({
        behavior: obmedzitPohyb() ? 'auto' : 'smooth',
        block: 'start'
      });

      /* Fokus ide na prvé pole, nie na výber, aby sa dalo rovno písať. */
      var prve = document.querySelector('#formular-reklama [name="meno"]');
      if (prve) { prve.focus({ preventScroll: true }); }
    }

    document.addEventListener('click', naKlik);
    odpojit.push(function () {
      document.removeEventListener('click', naKlik);
    });
  }

  /* --- Formulár ----------------------------------------------------------- */
  function formular() {
    var form = document.getElementById('formular-reklama');
    if (!form) { return; }

    odpojitFormular = window.TACHE.forms.pripojit(form, {
      typ: 'ads',
      event: 'ads_inquiry',
      parametre: function (data) {
        return { platform: data.platforma };
      }
    });
  }

  function init() {
    tlacidlaPlanov();
    formular();
  }

  function destroy() {
    odpojit.forEach(function (f) { f(); });
    odpojit = [];

    if (odpojitFormular) {
      odpojitFormular();
      odpojitFormular = null;
    }
  }

  window.TACHE.pages.reklama = { init: init, destroy: destroy };
}());
