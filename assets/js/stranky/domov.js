/* ==========================================================================
   Domov.

   Rieši dve veci: lištu s výzvou pri spodnom okraji na mobile a formulár
   kontroly webu.

   Skript sa hlási do window.TACHE.pages a vystavuje init() a destroy(),
   ktoré volá nav.js po každej výmene obsahu. Nič sa neviaže na
   DOMContentLoaded a destroy() musí odpojiť všetko, čo init() pripojil.
   ========================================================================== */

window.TACHE = window.TACHE || {};
window.TACHE.pages = window.TACHE.pages || {};

(function () {
  'use strict';

  var odpojit = [];
  var odpojitFormular = null;

  /* --- Lišta s výzvou na mobile ----------------------------------------
     V návrhoch nie je. Zobrazí sa, keď tlačidlo v hero zmizne z obrazovky,
     a skryje sa pri sekcii Balíky a pri záverečnej výzve, kde by len
     prekrývala rovnakú výzvu. Na počítači ju CSS nezobrazuje vôbec.

     Poloha sa meria priamo pri scrollovaní. IntersectionObserver by bol
     lacnejší, ale pri skokoch v stránke (kotva, obnovenie polohy) chodia
     jeho hlásenia v inom poradí a stav lišty sa rozladí.
     -------------------------------------------------------------------- */
  function listaVyzvy() {
    var lista = document.querySelector('[data-lista-vyzva]');
    var vyzvaVHero = document.querySelector('[data-hero-vyzva]');
    if (!lista || !vyzvaVHero) { return; }

    var tiche = [document.getElementById('cennik'),
      document.getElementById('kontakt')].filter(Boolean);

    function vidno(prvok) {
      var r = prvok.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }

    function prekreslit() {
      var vyzvaPrec = vyzvaVHero.getBoundingClientRect().bottom < 0;
      var prekryva = tiche.some(vidno);
      lista.setAttribute(
        'data-videt',
        (vyzvaPrec && !prekryva) ? 'ano' : 'nie'
      );
    }

    var ceka = false;
    function naScroll() {
      if (ceka) { return; }
      ceka = true;
      window.requestAnimationFrame(function () {
        ceka = false;
        prekreslit();
      });
    }

    window.addEventListener('scroll', naScroll, { passive: true });
    window.addEventListener('resize', naScroll);
    odpojit.push(function () {
      window.removeEventListener('scroll', naScroll);
      window.removeEventListener('resize', naScroll);
    });

    prekreslit();
  }

  /* --- Formulár kontroly webu ------------------------------------------ */
  function formularKontroly() {
    var form = document.getElementById('formular-audit');
    if (!form) { return; }

    odpojitFormular = window.TACHE.forms.pripojit(form, {
      typ: 'audit',
      event: 'audit_request'
    });
  }

  function init() {
    listaVyzvy();
    formularKontroly();
  }

  function destroy() {
    odpojit.forEach(function (f) { f(); });
    odpojit = [];

    if (odpojitFormular) {
      odpojitFormular();
      odpojitFormular = null;
    }
  }

  window.TACHE.pages.domov = { init: init, destroy: destroy };
}());
