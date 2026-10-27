# Meranie: čo nastaviť v GTM

Web je hotový a do `dataLayer` pushuje všetko, čo treba. Tento dokument
hovorí, čo z toho spraviť v Tag Manageri, GA4 a v Meta Pixeli.

**Web sám neposiela nič do GA4 ani do Mety.** Nie sú v ňom žiadne `gtag`
ani `fbq` volania okrem predvolených hodnôt Consent Mode v hlavičke. Všetko
ostatné je na GTM. Vďaka tomu sa dá meranie meniť bez zásahu do kódu.

Overené automaticky: `node tools/kontrola-merania.mjs` prejde web, vyvolá
každú udalosť a porovná jej názov aj parametre s touto tabuľkou. Spusti to
po každej zmene merania na webe.

---

## 1. Čo založiť

| Čo | Kde | Kam patrí ID |
|---|---|---|
| Kontajner GTM | tagmanager.google.com, typ Web | `gtmId` v `assets/js/config.js` |
| Vlastníctvo GA4 a dátový tok | analytics.google.com | len do GTM, nie do configu |
| Meta Pixel | business.facebook.com, Správca udalostí | len do GTM, nie do configu |

Postup podľa `CLAUDE.md` sekcia 9: najprv to nastav na adrese Netlify,
doménu pripoj až potom a reklamu spusti ako poslednú.

---

## 2. Premenné

Všetko sú to premenné typu **Premenná vrstvy údajov**, verzia 2, názov
premennej je presne ten z tabuľky. Odporúčam ich pomenovať `dl.nazov`, aby
sa v zozname držali pokope.

| Premenná vrstvy údajov | Používa ju udalosť |
|---|---|
| `page_path`, `page_title`, `page_location` | virtual_page_view |
| `consent_analytics`, `consent_marketing` | consent_update |
| `package_id` | package_select, generate_lead |
| `addon_id`, `state` | addon_toggle |
| `from_package`, `to_package` | upsell_view, upsell_accept |
| `form_id`, `error_type`, `form_field` | form_start, form_error |
| `event_id` | generate_lead, audit_request, ads_inquiry |
| `value`, `currency`, `founder_price` | generate_lead |
| `platform` | ads_inquiry |
| `link_location` | email_click, package_cta |
| `site` | live_site_click |
| `step` | questionnaire_step |
| `section` | section_view |
| `percent` | scroll_depth |
| `faq_index` | faq_open |
| `test_mode` | všetky, keď je web v testovacom režime |

### Premenná `test_mode`

Keď je `formEndpoint` v configu prázdny, web je v testovacom režime a každá
udalosť nesie `test_mode: true`. Nastav ju ako premennú a **na každej
značke ju daj ako výnimku** (Spúšťanie → Výnimky → `test_mode` rovná sa
`true`). Inak by ti testovanie naplnilo ostré dáta.

---

## 3. Spúšťače

Všetko sú to spúšťače typu **Vlastná udalosť**, názov udalosti presne
podľa tabuľky, bez regulárneho výrazu.

| Spúšťač | Názov udalosti |
|---|---|
| Inicializácia – všetky stránky | vstavaný, typ Inicializácia |
| Zobrazenie stránky po výmene | `virtual_page_view` |
| Súhlas zmenený | `consent_update` |
| Výber balíka | `package_select` |
| Doplnok prepnutý | `addon_toggle` |
| Ponuka vyššieho balíka zobrazená | `upsell_view` |
| Ponuka vyššieho balíka prijatá | `upsell_accept` |
| Začatie formulára | `form_start` |
| Chyba formulára | `form_error` |
| Objednávka potvrdená | `generate_lead` |
| Žiadosť o kontrolu webu | `audit_request` |
| Dopyt na reklamu | `ads_inquiry` |
| Klik na e-mail | `email_click` |
| Klik na výzvu k balíkom | `package_cta` |
| Klik na web naživo | `live_site_click` |
| QR kód zobrazený | `qr_view` |
| Krok dotazníka | `questionnaire_step` |
| Dotazník odoslaný | `questionnaire_submit` |
| Zobrazenie sekcie | `section_view` |
| Hĺbka scrollovania | `scroll_depth` |
| Otvorenie otázky | `faq_open` |

---

## 4. Značky GA4

### 4.1 Konfiguračná značka

| Pole | Hodnota |
|---|---|
| Typ | Značka Google |
| ID | ID dátového toku GA4 |
| Spúšťač | Inicializácia – všetky stránky |

Prvé načítanie stránky pošle `page_view` samo. **Nerob preň vlastnú
značku**, vznikli by dve.

### 4.2 Zobrazenie stránky po výmene obsahu

Web mení adresu bez načítania stránky, preto po každej výmene pushne
`virtual_page_view`. Z neho treba spraviť `page_view` ručne.

| Pole | Hodnota |
|---|---|
| Typ | Udalosť GA4 |
| Názov udalosti | `page_view` |
| Parametre | `page_location`, `page_path`, `page_title` z premenných |
| Spúšťač | Zobrazenie stránky po výmene |

**V GA4 vypni** Správa → Dátové toky → Rozšírené meranie →
*Zmeny stránky na základe udalostí histórie prehliadača*. Inak sa každý
prechod započíta dvakrát.

Tam istým vypni aj *Interakcie s formulármi*. Formuláre meriame vlastnými
udalosťami a automatické by do nich len šumeli.

### 4.3 Ostatné udalosti

Pre každú udalosť jedna značka typu Udalosť GA4, názov udalosti rovnaký ako
názov v dataLayeri, parametre podľa tabuľky v časti 2.

| Značka | Parametre |
|---|---|
| `package_select` | package_id |
| `addon_toggle` | addon_id, state |
| `upsell_view` | from_package, to_package |
| `upsell_accept` | from_package, to_package |
| `form_start` | form_id |
| `form_error` | form_id, error_type, form_field |
| `generate_lead` | event_id, package_id, value, currency, founder_price |
| `audit_request` | event_id |
| `ads_inquiry` | event_id, platform |
| `email_click` | link_location |
| `package_cta` | link_location |
| `live_site_click` | site |
| `qr_view` | bez parametrov |
| `questionnaire_step` | step |
| `questionnaire_submit` | bez parametrov |
| `section_view` | section |
| `scroll_depth` | percent |
| `faq_open` | faq_index |

Parameter `link_location` hovorí, odkiaľ sa kliklo. Hodnoty, ktoré web
posiela:

| Udalosť | Možné hodnoty `link_location` |
|---|---|
| `email_click` | `hero`, `pre-koho`, `faq`, `zaverecna-vyzva`, `paticka`, `ukazky`, `ukazka-klinika`, `dakujem` |
| `package_cta` | `hlavicka`, `hero`, `zaverecna-vyzva`, `lista-mobil`, `ukazky`, `ukazka-klinika` |

### 4.4 Kľúčové udalosti

V GA4 Správa → Kľúčové udalosti označ tri:

- `generate_lead` (objednávka)
- `audit_request` (žiadosť o kontrolu webu)
- `ads_inquiry` (dopyt na reklamu)

Pri `generate_lead` nastav aj menu, aby sa počítala hodnota.

---

## 5. Značky Meta

### 5.1 Základný kód

| Pole | Hodnota |
|---|---|
| Typ | Vlastný HTML |
| Obsah | základný kód pixelu z Meta Správcu udalostí |
| Spúšťač | Inicializácia – všetky stránky |
| Ďalšie kontroly súhlasu | **vyžaduje `ad_storage`** |

Tá posledná položka je dôležitá. GTM značku podrží, kým návštevník súhlas
nedá, takže bez súhlasu sa `fbevents.js` vôbec nenačíta a `_fbp` nevznikne.
Presne to požaduje `CLAUDE.md` sekcia 7.2.

Po udelení súhlasu GTM značku dobehne sám, preto netreba nič viazať na
`consent_update`.

### 5.2 Udalosti

| Značka Meta | Spúšťač | Čo poslať |
|---|---|---|
| `PageView` | Zobrazenie stránky po výmene | nič navyše |
| `Lead` | Objednávka potvrdená | `eventID` = event_id, `value`, `currency` |
| `Contact` | Žiadosť o kontrolu webu | `eventID` = event_id |
| `Contact` | Dopyt na reklamu | `eventID` = event_id |

**`eventID` nevynechaj.** To isté ID ide aj do Sheetu, takže keď raz
zapneme posielanie konverzií zo Sheetu (fáza 2), Meta pozná, že ide
o tú istú udalosť, a nezapočíta ju dvakrát.

---

## 6. Consent Mode v2

Web rieši svoju časť sám a GTM do toho nemá zasahovať:

- predvolené hodnoty sú inline v `<head>` **pred** GTM, všetky štyri
  reklamné a analytické kategórie sú `denied`,
- `wait_for_update: 500`, `ads_data_redaction: true`, `url_passthrough: true`,
- uložená voľba sa aplikuje ešte pred načítaním GTM,
- po voľbe v lište ide `gtag('consent','update', …)` a hneď za ním
  `consent_update` do dataLayeru.

V GTM staci zapnúť Správca → Nastavenia kontajnera → **Prehľad súhlasu**
a pri každej značke nastaviť, čo vyžaduje:

| Značka | Vyžaduje |
|---|---|
| Značka Google a všetky udalosti GA4 | `analytics_storage` |
| Základný kód Meta a všetky udalosti Meta | `ad_storage` |

Voľba sa drží v `localStorage` pod `tache_consent_v1` s dátumom a platí
12 mesiacov. Odkaz *Nastavenie cookies* v pätičke lištu otvorí znova.

---

## 7. Zdroj návštevy

Web si pri prvej návšteve odloží do `sessionStorage` UTM parametre,
referrer a vstupnú stránku a posiela ich s každým formulárom do Sheetu.
Identifikátory kliknutia (`gclid`, `gbraid`, `wbraid`, `fbclid`, `_fbc`,
`_fbp`) sa odkladajú **len keď je `ad_storage` granted**.

V GTM s tým netreba robiť nič. Do e-mailov sa identifikátory kliknutia
nikdy nedostanú, sú len v tabuľke.

---

## 8. QA po nastavení

Toto treba prejsť ručne, automatická kontrola na to nevidí.

### 8.1 Súhlas

1. Otvor web v anonymnom okne, zapni Náhľad v GTM.
2. **Pred voľbou** v lište nájdi požiadavku na `google-analytics.com/g/collect`
   a over v nej parameter `gcs=G100`.
3. Klikni **Odmietnuť**. V Aplikácia → Súbory cookie **nesmie byť `_fbp`**
   a v sieti sa **nesmie objaviť `fbevents.js`**.
4. V novom anonymnom okne klikni **Prijať všetko**. Teraz má byť
   `gcs=G111` a pixel sa načíta.
5. Preklikaj sa na inú podstránku a over, že `gcs` ostáva `G111` aj po
   výmene obsahu.

### 8.2 Zobrazenia stránok

6. V GA4 DebugView prejdi domov → cenník → reklama → domov. Na **každú
   stránku má byť práve jeden `page_view`**, nie dva a nie žiadny.
7. To isté skontroluj v Meta Test Events pre `PageView`.

### 8.3 Konverzie

8. Odošli formulár kontroly webu. `audit_request` sa smie objaviť **až po
   tom**, čo server odpovie, nie po kliku na tlačidlo.
9. Prejdi objednávku. Over, že `generate_lead` má `value` rovné sume
   objednávky vrátane doplnkov a že `event_id` sa zhoduje s ID v riadku
   v Sheete.
10. V Meta Test Events over, že `Lead` nesie rovnaké `eventID`.

### 8.4 Testovací režim

11. Over, že žiadna značka nevystrelí, keď má udalosť `test_mode: true`.
    Najjednoduchšie v Náhľade GTM na lokálnom webe s prázdnym
    `formEndpoint`.

---

## 9. Čo kontroluje skript

`node tools/kontrola-merania.mjs` spustí Chrome, prejde celý web a overí:

- že sa pushne **každá** udalosť zo sekcie 7.1 `CLAUDE.md`,
- že má všetky povinné parametre,
- že sa nepushuje nič, o čom tento dokument nevie,
- že konverzie nesú `event_id`,
- že v testovacom režime nesie `test_mode` úplne všetko.

Čo overiť nevie: či značky v GTM naozaj vystrelili a či v GA4 pribudla
konverzia. Na to je postup v časti 8.

---

## 10. Udalosť nad rámec tabuľky

`CLAUDE.md` sekcia 7.1 pozná `package_select` pre výber konkrétneho balíka.
Web navyše pushuje **`package_cta`** pri kliknutí na tlačidlo *Vybrať
balík*, ktoré žiadny balík nevyberá, len vedie na cenník. Má parameter
`link_location` s miestom na stránke (`hlavicka`, `hero`,
`zaverecna-vyzva`, `lista-mobil`, `ukazky`, `ukazka-klinika`).

Je to užitočné, lebo z toho vidno, ktorá výzva ľudí na cenník naozaj
dostane. Ak ju Daniel nechce, stačí povedať a atribúty `data-track` sa
z tlačidiel odstránia.
