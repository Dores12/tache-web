/* ==========================================================================
   Tenký klient ladiaceho protokolu Chrome.

   Node 22 má WebSocket zabudovaný, takže netreba Playwright ani žiadnu
   knižnicu. Používajú to tools/screenshoty.mjs a tools/kontrola-merania.mjs.

   Chrome treba najprv spustiť s otvoreným portom:
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
       --headless --disable-gpu --remote-debugging-port=9222 \
       --user-data-dir=/tmp/tache-chrome about:blank &
   ========================================================================== */

export const PREHLIADAC =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function pockaj(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class Chrome {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.cakajuce = new Map();
    this.poslucháči = new Map();

    ws.addEventListener('message', (e) => {
      const sprava = JSON.parse(e.data);

      if (sprava.method) {
        const funkcia = this.poslucháči.get(sprava.method);
        if (funkcia) { funkcia(sprava.params); }
        return;
      }

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

  /** Pripojí sa na prvú otvorenú kartu. */
  static async pripoj(port = 9222) {
    const odpoved = await fetch(`http://127.0.0.1:${port}/json/list`);
    const terce = await odpoved.json();
    const stranka = terce.find((t) => t.type === 'page');
    if (!stranka) { throw new Error('Chrome nemá otvorenú žiadnu kartu'); }

    const ws = new WebSocket(stranka.webSocketDebuggerUrl);
    await new Promise((splni, zamietni) => {
      ws.addEventListener('open', splni, { once: true });
      ws.addEventListener('error',
        () => zamietni(new Error('WebSocket zlyhal')), { once: true });
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

  na(udalost, funkcia) {
    this.poslucháči.set(udalost, funkcia);
  }

  /** Spustí výraz v stránke a vráti jeho hodnotu. */
  async hodnota(vyraz) {
    const { result, exceptionDetails } = await this.posli('Runtime.evaluate', {
      expression: vyraz,
      returnByValue: true,
      awaitPromise: true
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception
        ? exceptionDetails.exception.description
        : exceptionDetails.text);
    }
    return result.value;
  }

  /** Načíta adresu a počká, kým stránka dobehne. */
  async otvor(adresa, cakanie = 1200) {
    await this.posli('Page.navigate', { url: adresa });
    await pockaj(cakanie);
  }

  zavri() {
    this.ws.close();
  }
}
