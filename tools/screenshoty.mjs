/* ==========================================================================
   Screenshoty cudzieho webu do WebP pre ukážku na /ukazky/recovery-iv-clinic.

   Ovláda Chrome cez jeho ladiaci protokol. Node 22 má WebSocket zabudovaný,
   takže netreba žiadnu knižnicu ani Playwright. Chrome vie fotiť priamo do
   WebP, takže netreba ani prevod.

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

const KOREN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADRESA = 'https://recoverybratislava.sk/';
const PRIECINOK = `${KOREN}/assets/img/ukazky`;

const ZABERY = [
  { nazov: 'recovery-desktop', sirka: 1440, vyska: 900, mobil: false },
  { nazov: 'recovery-mobil', sirka: 390, vyska: 844, mobil: true }
];

function pockaj(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* --- Tenký klient ladiaceho protokolu --------------------------------- */
class Chrome {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.cakajuce = new Map();
    ws.addEventListener('message', (e) => {
      const sprava = JSON.parse(e.data);
      const cakajuci = this.cakajuce.get(sprava.id);
      if (!cakajuci) { return; }
      this.cakajuce.delete(sprava.id);
      if (sprava.error) {
        cakajuci.zamietni(new Error(sprava.error.message));
      } else {
        cakajuci.splni(sprava.result);
      }
    });
  }

  static async pripoj(url) {
    const ws = new WebSocket(url);
    await new Promise((splni, zamietni) => {
      ws.addEventListener('open', splni, { once: true });
      ws.addEventListener('error', () => zamietni(new Error('WebSocket zlyhal')), { once: true });
    });
    return new Chrome(ws);
  }

  posli(metoda, parametre = {}) {
    const id = ++this.id;
    return new Promise((splni, zamietni) => {
      this.cakajuce.set(id, { splni, zamietni });
      this.ws.send(JSON.stringify({ id, method: metoda, params: parametre }));
    });
  }

  async hodnota(vyraz) {
    const { result } = await this.posli('Runtime.evaluate', {
      expression: vyraz,
      returnByValue: true,
      awaitPromise: true
    });
    return result.value;
  }
}

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
  const odpoved = await fetch('http://127.0.0.1:9222/json/list');
  const terce = await odpoved.json();
  const stranka = terce.find((t) => t.type === 'page');
  if (!stranka) { throw new Error('Chrome nemá otvorenú žiadnu kartu'); }

  const chrome = await Chrome.pripoj(stranka.webSocketDebuggerUrl);
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
  chrome.ws.close();
  console.log('hotovo');
}

main().catch((e) => {
  console.error('chyba:', e.message);
  process.exit(1);
});
