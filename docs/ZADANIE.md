# Zadanie – predajný web Tache, fáza 1

Stav k 25. 10. 2026. Pravidlá práce, techniky, merania a textov sú v `CLAUDE.md`. Tento súbor hovorí, **čo** postaviť a v akom poradí.

## 1. O čo ide

Daniel Tache robí sám predajné stránky s meraním pre malé firmy (salóny, kliniky, fitness, remeselníci) a k nim voliteľnú správu reklamy. Hlavný produkt je web, reklama je doplnok. Web predáva tri balíky s konfigurátorom, objednávka beží automaticky od výberu balíka po zálohovú faktúru s QR kódom a vstupný dotazník.

Komunikácia so zákazníkom je **len e-mailom**. Na webe nie je telefón ani rezervácia hovoru.

## 2. Mapa stránok fázy 1

| URL | Stránka | Návrh | Indexovať |
|---|---|---|---|
| `/` | Domov | `design/Main.dc.html`, mobil `design/Mobil.dc.html` | áno |
| `/cennik` | Balíky a ceny s konfigurátorom a objednávkou | `design/Cennik.dc.html` | áno |
| `/reklama` | Správa reklamy | `design/Reklama.dc.html` | áno |
| `/ukazky` | Zoznam ukážok (zatiaľ jedna karta: Recovery IV Clinic) | **nie je navrhnutá**, poskladaj z existujúcich prvkov a ukáž mi ju pred dokončením | áno |
| `/ukazky/recovery-iv-clinic` | Case study kliniky | `design/Ukazka-klinika.dc.html` | áno |
| `/dakujem` | Po objednávke, QR kód na zálohu | `design/Dakujem.dc.html` | nie |
| `/dotaznik` | Vstupný dotazník, 9 krokov, osobný odkaz | vzor kroku: `design/Dotaznik-krok6.dc.html` | nie |
| `/obchodne-podmienky`, `/ochrana-osobnych-udajov`, `/cookies` | Právne stránky | jednoduchá textová stránka v štýle webu | áno |
| `/404` | Stránka nenájdená, odkaz na balíky | jednoduchá stránka v štýle webu | nie |

- Menu: Balíky a ceny · Správa reklamy · Ukážky · Blog · O mne + tlačidlo „Vybrať balík“. **Blog** sa v menu ani na domove nezobrazí, kým `config.blogEnabled` je `false` (články prídu vo fáze 2). **O mne** vedie na sekciu `/#o-mne`.
- Odkazy v návrhoch typu `Cennik.dc.html` zodpovedajú URL v tabuľke (`/cennik`).
- Hlavička a pätička sú rovnaké na všetkých stránkach okrem `/dakujem` a `/dotaznik`, ktoré majú v hlavičke len logo a skrátenú pätičku.

## 3. Dáta

### 3.1 `packages.js`

| Balík | `id` | Bežná cena | Zakladateľská | Hotové do | Kolá úprav | Podpora |
|---|---|---|---|---|---|---|
| Štart | `start` | 249 € | 149 € | 3 dní | 2 | 14 dní |
| Lead systém (odporúčaný, predvolený) | `lead` | 449 € | 269 € | 7 dní | 3 | 30 dní |
| Na kľúč | `kluc` | 790 € | 479 € | 14 dní | 3 | 60 dní |

Doplnky (`only` = balík, pri ktorom sa zobrazí; prázdne = pri všetkých):

| `id` | Názov na webe | Cena | `only` |
|---|---|---|---|
| `pixel` | Meranie pre reklamu na Mete a Googli | 79 € | start |
| `auto` | Dopyty do tabuľky a potvrdenie zákazníkovi | 99 € | start |
| `dizajn` | Dizajn na mieru | 99 € | start |
| `kampan` | Spustenie reklamy na Mete alebo Googli | 149 € | lead |
| `kreativy` | Texty a 3 obrázky do reklamy | 99 € | lead |
| `druha` | Reklama aj na druhej platforme | 149 € | kluc |
| `podstranka` | Ďalšia podstránka | 49 € | – |
| `kolo` | Ďalšie kolo úprav | 39 € | – |
| `clanok` | Článok na blog napísaný pre Google | 59 € | – |

- **Ponuka vyššieho balíka:** keď súčet doplnkov viazaných na aktuálny balík ≥ 70 % rozdielu zakladateľských cien k vyššiemu balíku, zobrazí sa „Za X € viac máte celý balík Y a tieto doplnky sú v ňom v cene.“ s tlačidlom „Prepnúť na Y“. Po prepnutí sa doplnky vynulujú. Logika je v `design/Cennik.dc.html` v `renderVals()`.
- Pri zmene balíka sa doplnky vynulujú. Ceny formát „134,50 €“ (desatinná čiarka, celé čísla bez desatinných miest).
- Záloha 50 %, doplatok 50 % pred spustením na doméne klienta.
- Paušály: správa webu 29 € mesačne (hodina práce), správa reklamy Meta 149 €, Google 149 €, Meta a Google 249 € mesačne, spustenie 149 € jednorazovo za platformu (pri Na kľúč jedna platforma v cene). Odporúčaný rozpočet na reklamu od 10 € denne.
- Zakladateľská cena platí pre prvých 5 klientov, počet voľných miest je v `config.js` (`founderSlotsLeft`, teraz 4). Pri 0 sa zakladateľské ceny a všetky zmienky o nich nevykreslia a platia bežné ceny.

### 3.2 `config.js` (hodnoty v [zátvorkách] doplní Daniel, dovtedy prázdne)

`siteUrl`, `email` [e-mail na doméne], `owner` (Daniel Tache), `businessAddress` [miesto podnikania], `ico` [IČO], `tradeRegister` [okresný úrad], `vatPayer: false`, `iban` [IBAN], `beneficiary` (Daniel Tache), `gtmId` [GTM ID], `formEndpoint` [URL Apps Scriptu], `founderSlotsLeft: 4`, `replyTime` („do 24 hodín v pracovné dni“), `auditTime` („do 2 pracovných dní“), `proformaDueDays: 10`, `blogEnabled: false`, `debug`.

## 4. Stránky – čo treba vedieť nad rámec návrhov

### Domov
- Sekcie a texty presne podľa `design/Main.dc.html`. Mobilné správanie hero a cesty zákazníčky podľa `design/Mobil.dc.html` (cesta zvisle, hlavné tlačidlo na celú šírku, menu pod ikonou).
- Na mobile pridaj lištu s tlačidlom „Vybrať balík“ pri spodnom okraji: zobrazí sa, keď hlavné tlačidlo v hero zmizne z obrazovky, a skryje sa pri sekcii Balíky a pri záverečnej výzve. Toto v návrhu nie je, ukáž mi ju.
- Sekcia „Kontrola webu zadarmo“ (`#kontrola`) má formulár typu `audit` (odkaz na web, e-mail).
- Miesto na portrét v sekcii O mne ostáva, kým Daniel nedodá fotku (`assets/img/daniel.webp`).

### Balíky a ceny
- Konfigurátor podľa návrhu: krok 1 balík, krok 2 doplnky, krok 3 objednávka, súhrn vpravo (na mobile pod formulárom, s mini súhrnom „Spolu“ nad tlačidlom).
- Výber balíka cez parameter `?balik=start|lead|kluc` (z tlačidiel na domove).
- Porovnávacia tabuľka v posuvnom boxe na mobile.

### Správa reklamy
- Formulár typu `ads`: meno, e-mail, web (nepovinné), „Čo predávate a komu“ (povinné), platforma (Meta, Google, Meta aj Google, Ešte neviem). Tlačidlá plánov predvyberú platformu a posunú na formulár.

### Ďakujem
- Načíta číslo objednávky z URL (`?o=OBJ-2026-001`) a súhrn zo `sessionStorage` uloženého pri odoslaní. Bez nich ukáže všeobecné poďakovanie bez QR.
- QR PAY by square vykreslí v prehliadači: suma = záloha, variabilný symbol z čísla objednávky, správa pre prijímateľa = číslo objednávky, IBAN a meno z configu. Pred spustením ho Daniel naskenuje bankovou aplikáciou.
- Kroky „Čo bude nasledovať“, „Čo si môžete pripraviť“, „E-mail neprišiel?“ podľa návrhu.

### Dotazník
- 9 krokov podľa tabuľky nižšie, rovnaké rozloženie ako vzor kroku 6: zoznam krokov vľavo (na mobile zbalený nad formulárom), pruh postupu, „Späť“ a „Uložiť a pokračovať“.
- Rozpracované odpovede v `localStorage` pod kľúčom podľa tokenu. Token z URL overí Apps Script, bez neho hláška a e-mail.
- Krok 8 sa zobrazí len pri balíku Na kľúč alebo doplnku reklamy.

| Krok | Otázky |
|---|---|
| 1. Firma | názov, IČO, odvetvie, adresa prevádzky, telefón firmy pre web, e-mail, otváracie hodiny |
| 2. Ponuka | služby a ceny, čo predávate najviac, čím sa líšite, aktuálna akcia |
| 3. Cieľ webu | čo má návštevník spraviť (formulár, telefón, rezervácia), kto dopyt spracuje a ako rýchlo |
| 4. Zákazník | kto kupuje, 3 najčastejšie obavy alebo otázky, prečo kupujú, 2 až 3 konkurenti |
| 5. Podklady | existujúce texty, odkaz na priečinok s fotkami a logom, firemné farby, recenzie s menom a súhlasom |
| 6. Vzhľad | 3 weby, ktoré sa páčia, čo sa na nich páči, vykanie alebo tykanie, nálada (Pokojná, Priateľská, Výrazná) |
| 7. Technika a účty | doména a kde je, existujúci web, e-mail na doméne, existujúce účty GA4, GTM, Meta, Google Ads |
| 8. Reklama | platforma, mesačný rozpočet, oblasť, ponuka do reklamy, doterajšie skúsenosti |
| 9. Právne | kto je prevádzkovateľ osobných údajov, existujúce texty o ochrane údajov |

Pozor: telefón v kroku 1 je telefón **klientovej firmy** pre jeho web, nie kontakt na Daniela.

### Case study kliniky
- Texty a čísla podľa návrhu. Odkaz „Pozrieť web naživo“ vedie na `https://recoverybratislava.sk/?utm_source=tache&utm_medium=referral&utm_campaign=ukazka`, otvára sa v novej karte s `rel="noopener"`.
- **Screenshoty urob sám** cez Playwright: `https://recoverybratislava.sk/`, v cookie lište klikni „Odmietnuť“, počkaj na načítanie fotiek. Počítač 1440 × 900 (horná časť stránky) a mobil 390 × 844 (horná časť), ulož ako WebP do `assets/img/ukazky/recovery-desktop.webp` a `recovery-mobil.webp` aj v 2× hustote. Vlož ich do rámčekov v sekcii „Stránka, ktorú som postavil“ a ako malý náhľad aj na domov do sekcie s výsledkom kliniky. Výsledok mi ukáž.

### Právne stránky
- Texty dodá Daniel (návrh pripraví Claude na kontrolu odborníkom). Kým nie sú, stránka má len nadpis a vetu „Pripravujeme.“ a **web sa nespúšťa**.

## 5. Poradie práce

1. **Kostra:** štruktúra priečinkov, fonty, `tokens.css` a základné štýly, hlavička a pätička, `config.js`, `packages.js`, cookie lišta a Consent Mode, pomocník pre `dataLayer`, `nav.js`, `robots.txt`, `sitemap.xml`, `_redirects` a `netlify.toml`.
2. **Domov.**
3. **Balíky a ceny** s konfigurátorom a objednávkou v testovacom režime.
4. **Správa reklamy**, **Ukážky**, **case study** so screenshotmi, **404**, právne stránky ako zástupné.
5. **Apps Script:** objednávka, číslovanie, zálohová faktúra PDF s QR, e-maily, formuláre `audit` a `ads`, pripomienky, stav „Záloha prijatá“ → odkaz na dotazník.
6. **Ďakujem** s QR.
7. **Dotazník** a generátor zadania pre Claude Code.
8. **Meranie:** zoznam premenných, spúšťačov a značiek pre GTM, ktoré Daniel nastaví, a QA podľa `CLAUDE.md` sekcia 7.
9. Spustenie podľa `CLAUDE.md` sekcia 9.

Po každom kroku zastav, ukáž screenshoty 375 a 1440 px a počkaj na schválenie.

## 6. Fáza 2 (teraz nestavať)

Blog (prvých 6 článkov podľa plánu v dokumente so štruktúrou), stránky služieb, segmentové stránky bez menu pre vlastnú reklamu, ukážkový web pre salón, offline konverzie zo Sheetu do Mety a Google Ads (zaplatená záloha ako Purchase).

## 7. Otvorené body (❓)

- Portrét Daniela, IČO, miesto podnikania, okresný úrad, e-mail na doméne, IBAN.
- Registrácia domény `tache.sk` a e-mailu vo Webglobe.
- GTM ID, GA4 a nový Meta Pixel.
- Texty právnych stránok.
- Šablóna zálohovej faktúry v Google Docs (náležitosti overiť s účtovníkom).

## 8. Prvý prompt pre Claude Code

> Prečítaj `CLAUDE.md`, `docs/ZADANIE.md` a `design/README.md` a prejdi všetky návrhy v `design/`. Potom mi napíš plán pre krok 1 (kostra) zo sekcie 5: štruktúru priečinkov, zoznam súborov, ako budú vyzerať `config.js` a `packages.js`, ako bude fungovať `nav.js` s `init()` a `destroy()` skriptov stránok a ako vyriešiš opakovanú hlavičku a pätičku. Polož mi otázky ku všetkému, čo nie je jasné alebo chýba. Nič neimplementuj, kým neodpoviem.
