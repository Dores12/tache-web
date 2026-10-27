/* ==========================================================================
   Screenshoty cudzieho webu do WebP pre ukážku na /ukazky/recovery-iv-clinic.

   Ovláda Chrome cez jeho ladiaci protokol (klient je v tools/chrome.mjs).
   Chrome vie fotiť priamo do WebP, takže netreba ani prevod.

   Postup podľa docs/ZADANIE.md: načítať stránku, v cookie lište kliknúť
   Odmietnuť, počkať na fotky a odfotiť hornú časť stránky na počítači
   1440 x 900 a na mobile 390 x 844, v hustote 1x aj 2x.

   Spustenie:
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
       --headless --disable-gpu --remote-debugging-port=9222 \
       --user-data-dir=/tmp/tache-chrome about:blank &
     node tools/screenshoty.mjs

   Súbor nie je súčasťou webu, Netlify ho vracia ako 404.
   ========================================================================== */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chrome, pockaj } from './chrome.mjs';

const KOREN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADRESA = 'https://recoverybratislava.sk/';
const PRIECINOK = `${KOREN}/assets/img/ukazky`;

const ZABERY = [
  { nazov: 'recovery-desktop', sirka: 1440, vyska: 900, mobil: false },
  { nazov: 'recovery-mobil', sirka: 390, vyska: 844, mobil: true }
];

/* --- Odmietnutie cookies ------------------------------------------------ */
async function odmietniCookies(chrome) {
  const vysledok = await chrome.hodnota(`(() => {
    const prvky = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const cil = prvky.find((p) => /odmiet|zamiet|reject|nesúhlas|nesuhlas/i.test(
      (p.textContent || '') + ' ' + (p.getAttribute('aria-label') || '')
    ));
    if (!cil) { return 'tlačidlo sa nenašlo'; }
    cil.click();
    return 'kliknuté: ' + cil.textContent.trim().slice(0, 40);
  })()`);
  console.log('  cookies:', vysledok);
}

async function main() {
  const chrome = await Chrome.pripoj();
  await chrome.posli('Page.enable');
  await chrome.posli('Runtime.enable');

  mkdirSync(PRIECINOK, { recursive: true });

  for (const zaber of ZABERY) {
    for (const hustota of [1, 2]) {
      const pripona = hustota === 2 ? '@2x' : '';
      console.log(`${zaber.nazov}${pripona} (${zaber.sirka}x${zaber.vyska}, ${hustota}x)`);

      await chrome.posli('Emulation.setDeviceMetricsOverride', {
        width: zaber.sirka,
        height: zaber.vyska,
        deviceScaleFactor: hustota,
        mobile: zaber.mobil
      });

      await chrome.posli('Page.navigate', { url: ADRESA });
      await pockaj(4000);
      await odmietniCookies(chrome);

      /* Fotky sa načítavajú postupne, preto ich najprv prejdeme scrollom
         a potom sa vrátime navrch. */
      await chrome.hodnota('window.scrollTo(0, document.body.scrollHeight); true');
      await pockaj(2500);
      await chrome.hodnota('window.scrollTo(0, 0); true');
      await pockaj(2500);

      const { data } = await chrome.posli('Page.captureScreenshot', {
        format: 'webp',
        quality: 82,
        captureBeyondViewport: false
      });

      const cesta = `${PRIECINOK}/${zaber.nazov}${pripona}.webp`;
      writeFileSync(cesta, Buffer.from(data, 'base64'));
      console.log('  uložené:', cesta);
    }
  }

  await chrome.posli('Emulation.clearDeviceMetricsOverride');
  chrome.zavri();
  console.log('hotovo');
}

main().catch((e) => {
  console.error('chyba:', e.message);
  process.exit(1);
});
