# Návrhy – ako ich čítať

Súbory `*.dc.html` sú exporty návrhov z Claude Design. Sú to referencie, nie kód na nasadenie. Texty v nich sú finálne (schválené 25. 10. 2026).

| Súbor | Stránka |
|---|---|
| `Main.dc.html` | Domov `/`, desktop (stránka je fluidná, na užších šírkach sa skladá) |
| `Mobil.dc.html` | Domov na mobile 390 px: hero, cesta zákazníčky, problém, postup |
| `Cennik.dc.html` | Balíky a ceny `/cennik`, konfigurátor |
| `Reklama.dc.html` | Správa reklamy `/reklama` |
| `Ukazka-klinika.dc.html` | Case study `/ukazky/recovery-iv-clinic` |
| `Dakujem.dc.html` | Ďakujem `/dakujem` |
| `Dotaznik-krok6.dc.html` | Dotazník, vzor jedného kroku |

## Čo z nich brať

- **Obsah je medzi `<x-dc>` a `</x-dc>`.** Inline `style` atribúty sú presné hodnoty (farby, veľkosti, odstupy). Prepíš ich do CSS tried a premenných z `CLAUDE.md` sekcia 3, nekopíruj inline štýly.
- **Responzivita:** návrhy používajú `clamp()`, `flex-wrap` a jeden zlom 860 px (menu sa skryje, mriežky sa zložia do stĺpca). Mobilnú podobu domova ukazuje `Mobil.dc.html`.
- **`<sc-for>`, `<sc-if>` a `{{…}}`** sú šablóny návrhového nástroja (cykly, podmienky, hodnoty). Skutočné dáta a logika sú v `<script type="text/x-dc">` vo funkcii `renderVals()`. V `Cennik.dc.html` je tam celý konfigurátor (balíky, doplnky, pravidlo ponuky vyššieho balíka, formát cien), v `Dotaznik-krok6.dc.html` voľby oslovenia a nálady. Prepíš ich do vanilla JS, dáta ber z `packages.js`.
- **Ignoruj:** `<script src="./support.js">`, `<helmet>`, odkaz na Google Fonts (fonty budú lokálne) a atribúty `data-props`.
- **Odkazy** `*.dc.html` nahraď URL podľa tabuľky vyššie. `mailto:[e-mail]` a ostatné hodnoty v [hranatých zátvorkách] berú hodnotu z `config.js`.
- **Zástupné prvky** (portrét, QR kód, screenshoty webu kliniky) nahradia skutočné obrázky podľa `docs/ZADANIE.md`.
- Ukážkové údaje (číslo objednávky OBJ-2026-001, e-mail vas@email.sk, mená v tabuľke dopytov na domove) sú len pre návrh. Tabuľka dopytov na domove je ilustračná a ostáva s popisom „Ilustračný príklad“.
