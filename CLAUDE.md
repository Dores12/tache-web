# CLAUDE.md – Tache, predajný web

Pravidlá pre prácu na repozitári webu **Tache** (tache.sk). Predávam tu tvorbu predajných stránok s meraním pre malé firmy a k nim voliteľnú správu reklamy. Web je zároveň živá ukážka toho, čo predávam: musí byť rýchly, prístupný a správne meraný.

Čo sa má postaviť, je v `docs/ZADANIE.md`. Vizuál a finálne texty sú v `design/` (návod v `design/README.md`). Keď si tieto súbory protirečia, platí poradie v sekcii 0.

---

## 0. Priorita pri rozpore

1. Pokyn v aktuálnom prompte od Daniela.
2. Tento súbor.
3. `docs/ZADANIE.md`.
4. Texty a vizuál v `design/*.dc.html`.

Ak niečo nie je jasné alebo údaj chýba, **opýtaj sa, nič si nedomýšľaj**.

---

## 1. Ako pracujeme

- **Najprv plán a otázky, potom implementácia.** Pri každom prompte najprv napíš, čo zmeníš a v ktorých súboroch, a polož otázky. Kód píš až po odpovedi.
- Vývoj na vetve `dev`, `main` = produkcia. Merge do `main` len po Danielovom schválení.
- Malé commity, Conventional Commits v angličtine (`feat:`, `fix:`, `docs:`, `chore:`).
- Netlify Free: každé nasadenie stojí 15 z 300 kreditov mesačne. Zmeny zbieraj na `dev`, do `main` najviac 2 až 3-krát týždenne.
- Žiadne heslá, tokeny ani URL Apps Scriptu mimo `config.js`. Produkčný `formEndpoint` z Claude Code nikdy netestuj a jeho zmenu necommituj.
- Pracovné dokumenty patria do `docs/`, návrhy do `design/`. Netlify ich vracia ako 404 (sekcia 9).

### QA pred každým commitom

- Screenshoty dotknutých stránok v šírke 375 px a 1440 px, s cookie lištou aj bez nej.
- Lighthouse mobile pre dotknuté stránky.
- Formuláre otestované lokálne s prázdnym `formEndpoint` (testovací režim).
- Kontrola, že eventy v `dataLayer` majú rovnaké názvy a parametre ako v sekcii 7.
- Pri zmene hlavičky alebo pätičky grep, že je rovnaká vo všetkých HTML súboroch.
- Pri zmene navigácie test prechodov tam a späť, priameho otvorenia URL a tlačidla Späť (sekcia 6).

---

## 2. Technika

- **Čisté HTML, CSS a vanilla JS.** Žiadny framework, build krok ani runtime npm závislosti. Čitateľný kód, slovenské komentáre po sekciách, CSS premenné, bez minifikácie v repozitári.
- Knižnice tretích strán len ako lokálne súbory v `assets/vendor/` s licenciou vedľa: `bysquare` (reťazec PAY by square) a `qrcode-generator` (obrázok QR). Nič sa nenačítava z CDN.
- **`assets/js/config.js` = všetko, čo sa mení:** kontakty, IČO a údaje živnosti, IBAN, GTM ID, `formEndpoint`, počet voľných zakladateľských miest, časy odpovede, prepínače sekcií (napr. `blogEnabled`). Načítava sa ako prvý, ostatné skripty s `defer`.
- **`assets/js/packages.js` = jediný zdroj cien balíkov, doplnkov a paušálov.** Žiadna cena natvrdo v HTML. Ceny v HTML sa dopĺňajú z dát, v HTML je len záložný text pre stav bez JS.
- **Prázdna hodnota v configu = prvok sa nevykreslí.** Údaje v [hranatých zátvorkách] v návrhoch sú nepotvrdené a v configu ostávajú prázdne.
- **Fonty lokálne:** Schibsted Grotesk 400, 500, 600, 700, `woff2`, subsety latin + latin-ext (inak nefungujú č, ľ, ť, ž, ô), licencia OFL pribalená, `font-display: swap`, preload len 400 a 700. Nie z fonts.googleapis.com (návrhy ho používajú len na náhľad).
- **Výkon na mobile:** Lighthouse Performance, Accessibility, Best Practices a SEO ≥ 95; LCP < 2,0 s, CLS < 0,05, INP < 200 ms; vlastný JS < 40 kB, CSS < 50 kB bez knižníc; obrázky WebP/AVIF s `width`, `height`, `srcset`, okrem prvej obrazovky `loading="lazy"`.
- **Prístupnosť:** WCAG 2.1 AA, jedno `h1` na stránku, `lang="sk"`, labely pri všetkých poliach, viditeľný focus, ovládanie klávesnicou, dotykové plochy ≥ 44 × 44 px, polia s písmom ≥ 16 px, `prefers-reduced-motion` rešpektovaný. Kontrast textu aspoň 4,5 : 1, farby v sekcii 3 to spĺňajú.
- Žiadny horizontálny scroll od 320 px. Testovať šírky 320, 375, 390, 414, 768, 1024, 1280, 1440 px.

---

## 3. Vizuál

Zdroj pravdy je `design/`. Texty v návrhoch sú finálne (verzia schválená 25. 10. 2026).

| Token | Hodnota | Použitie |
|---|---|---|
| `--fialova` | `#6A00F4` | hero, záverečná výzva, odkazy, hlavné tlačidlo na svetlom |
| `--fialova-hover` | `#5200C2` | hover odkazov a tlačidiel |
| `--marhulova` | `#FFD6A5` | nadpisy a hlavné tlačidlo na fialovej, sekcie Problém a O mne |
| `--atrament` | `#1E0B3A` | text, pätička, text na marhuľovom tlačidle |
| `--text-tlmeny` | `#5E4F6E` | sekundárny text |
| `--text-tlmeny-2` | `#6E6380` | „nie“, „doplnok“ v tabuľke, neaktívne kroky |
| `--na-fialovej` | `#EBDDFF` | bežný text na fialovej |
| `--marhulova-svetla` | `#FFF3E6` | podfarbené sekcie, odporúčaný balík |
| `--fialova-svetla` | `#F1E6FF` | podfarbené sekcie, pás „mesačné platby sú dobrovoľné“ |
| `--okraj` | `#EADBC8` | okraje kariet a tabuliek |
| `--okraj-jemny` | `#F5ECE1` | riadky tabuliek |
| `--okraj-pola` | `#CDB9A3` | okraj polí formulára |
| `--hneda-akcent` | `#8A5F37` | tlmená časť nadpisu na marhuľovom pozadí |
| `--paticka-tlmeny` | `#B9A8D6` | copyright v pätičke |

- Písmo Schibsted Grotesk; H1 v hero do 104 px (`clamp`), H2 `clamp(32px, 4vw, 52px)`, text 16 až 20 px.
- Rohy: tlačidlá a polia 8 px, karty 12 px. Tlačidlá aspoň 44 px vysoké, hlavná výzva 56 px.
- Odporúčaný balík má fialový pruh hore (3 px) a svetlé marhuľové pozadie.
- Ikony len inline SVG s ťahom, žiadne emoji.
- Zakázané: gradientové pozadia, sklenené efekty, tieňované „SaaS“ karty, veľké písmená v nadpisoch sekcií, pomlčky v nadpisoch.
- Animácie len `transform` a `opacity`: postupné objavenie sekcií pri scrollovaní (posun 16 až 24 px, 400 až 600 ms), cesta zákazníčky v hero sa vykreslí postupne. Hlavný nadpis sa nikdy neoneskoruje. Pri „obmedziť pohyb“ bez animácií.

---

## 4. Texty a tvrdenia

- **Vykanie** a **„ja“** (robím sám) na celom webe.
- Pre zákazníka **„dopyt“**, nie „lead“. Výnimka: názov balíka **Lead systém**.
- Technické názvy (GA4, Tag Manager, Consent Mode, Meta Pixel) len v detailoch balíkov a v porovnávacej tabuľke, vždy za bežným vysvetlením v zátvorke.
- **Žiadne telefonovanie.** Na webe nie je telefónne číslo, rezervácia hovoru ani pole Telefón. Kontakt je len e-mail a formuláre. Sľub odpovede: „do 24 hodín v pracovné dni“ (hodnota v `config.js`).
- Nesľubovať výsledok („zaručene viac zákazníkov“) ani počet dopytov. Nesľubovať konkrétne skóre PageSpeed, len „pred odovzdaním otestujem a výsledok pošlem“.
- Čísla o klinike len tie z návrhu (20 €, 15 €, 11 €, 19 z 329, 5,8 %) a vždy s poznámkou, že 11 € a 5,8 % sú za prvý týždeň. Aktualizuje ich Daniel.
- Recenzie a referencie len skutočné, s menom a súhlasom. Kým nie sú, sekcia sa nevykreslí.
- Pred commitom grep vzorcov v textoch a každý výskyt over: `nie .*, ale`, `telefón`, `zavola`, `hovor`, `lead` (okrem `Lead systém` a kódu), `zaručene`, `—` (dlhá pomlčka). Napríklad „kontakt, ktorý nezdvihne telefón“ v sekcii Problém je v poriadku, ponuka telefonátu nie.

---

## 5. Stránky a SEO

- Každá stránka je samostatný HTML súbor s vlastnou URL, `<title>`, meta popisom, `canonical`, `og:*`.
- `index, follow` pre verejné stránky. `noindex` pre `/dakujem`, `/dotaznik`, ukážkové weby (`/ukazky/demo-*`) a `/404`.
- `robots.txt` nič neblokuje okrem interných ciest, `sitemap.xml` so všetkými indexovanými stránkami.
- Štruktúrované dáta: `Person` a `ProfessionalService` na domove, `Offer` s cenami z `packages.js` na `/cennik`, `FAQPage` tam, kde sú otázky, `BlogPosting` pri článkoch.
- Hlavička a pätička sa opakujú v každom HTML. Pri zmene uprav všetky a over grepom.
- Ukážkové weby majú viditeľný pruh „Ukážka“ a sú `noindex`, aby sa vymyslené firmy neobjavovali vo vyhľadávaní.

---

## 6. Navigácia bez načítania stránky (záväzné)

Prechod medzi podstránkami vymení obsah bez nového načítania stránky. Je to vylepšenie nad bežnými stránkami, ktoré nesmie zhoršiť SEO ani meranie.

- Skript `assets/js/nav.js` bez knižnice zachytí kliknutia na interné odkazy, stiahne cieľové HTML cez `fetch`, vymení len obsah `<main>` a aktualizuje `<title>`, meta popis, `canonical`, `og:url` a aktívnu položku menu (`aria-current="page"`). Adresu mení cez `history.pushState`, tlačidlo Späť obslúži `popstate`.
- Normálne načítanie ostáva pre: externé odkazy, `mailto:`, súbory, odkazy s `target`, `download` alebo `data-reload`, Ctrl/Cmd/Shift + klik, stredné tlačidlo, chybu `fetch`. **Stránka `/dakujem` sa po objednávke načíta vždy normálne.**
- Prednačítanie: pri `pointerenter` alebo `touchstart` na odkaze sa cieľová stránka stiahne vopred (cache v pamäti, najviac 10 stránok).
- Animácia prechodu cez View Transitions API, ak ho prehliadač má. Pri „obmedziť pohyb“ bez animácie.
- Prístupnosť: po výmene fokus na nový `h1` (`tabindex="-1"`), ohlásenie názvu stránky cez `aria-live="polite"`, posun navrch, pri odkaze s `#kotvou` na kotvu.
- Skripty stránok (konfigurátor, formuláre, QR, dotazník) exportujú `init()` a `destroy()`. `nav.js` ich volá po každej výmene podľa `data-page` na `<main>`. Žiadne zdvojené poslucháče, žiadne spoliehanie sa na `DOMContentLoaded`.
- Meranie: po každej výmene `dataLayer.push({event: 'virtual_page_view', page_path, page_title, page_location})`. Pri prvom načítaní sa tento event nepushuje, page_view rieši GTM pri načítaní (sekcia 7).

---

## 7. Meranie a súkromie

Architektúra ako na Recovery: vlastný GTM kontajner, vlastná GA4, nový Meta Pixel v Danielovom Business Manageri. **Web iba pushuje do `dataLayer`, žiadne priame `gtag` ani `fbq` v HTML** okrem inline Consent Mode default.

### 7.1 Eventy v dataLayer

| Event | Kedy | Parametre | GA4 | Meta |
|---|---|---|---|---|
| (načítanie) | prvé načítanie stránky | – | page_view | PageView, len so súhlasom |
| `virtual_page_view` | po každej výmene obsahu v `nav.js` | page_path, page_title, page_location | page_view | PageView, len so súhlasom |
| `consent_update` | po voľbe v cookie lište | consent_analytics, consent_marketing | – | spustí základný kód pixelu |
| `package_select` | výber balíka na karte alebo v konfigurátore | package_id | ✓ | – |
| `addon_toggle` | zaškrtnutie doplnku | addon_id, state | ✓ | – |
| `upsell_view`, `upsell_accept` | zobrazenie a prijatie ponuky vyššieho balíka | from_package, to_package | ✓ | – |
| `form_start` | prvé kliknutie do formulára (raz za reláciu a formulár) | form_id | ✓ | – |
| `form_error` | chyba validácie, siete alebo servera | form_id, error_type, form_field (názov poľa, nie hodnota) | ✓ | – |
| `generate_lead` | **až keď server potvrdí uloženie objednávky** | event_id, package_id, value (cena objednávky), currency, founder_price | kľúčová udalosť | **Lead** s `eventID = event_id` a hodnotou |
| `audit_request` | server potvrdil žiadosť o kontrolu webu | event_id | kľúčová udalosť | **Contact** |
| `ads_inquiry` | server potvrdil správu zo stránky Správa reklamy | event_id, platform | kľúčová udalosť | **Contact** |
| `email_click` | klik na `mailto:` | link_location | ✓ | – |
| `live_site_click` | klik na „Pozrieť web naživo“ | site | ✓ | – |
| `qr_view` | QR kód na `/dakujem` sa vykreslil | – | ✓ | – |
| `questionnaire_step` | dokončený krok dotazníka | step | ✓ | – |
| `questionnaire_submit` | server potvrdil odoslanie dotazníka | – | ✓ | – |
| `section_view`, `scroll_depth`, `faq_open` | ako na Recovery | section, percent, faq_index | ✓ | – |

- Kliky sa trackujú delegovane cez `data-track`, žiadne inline `onclick`. `debug: true` v configu vypisuje pushe do konzoly.
- **Konverzia nikdy po kliku na tlačidlo**, vždy až po `ok: true` zo servera.
- V GA4 vypnúť automatické page_view pri zmene histórie a rozšírené meranie Interakcie s formulármi.

### 7.2 Consent Mode v2 a cookie lišta

- Default inline v `<head>` pred GTM: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` = denied; `functionality_storage`, `security_storage` = granted; `wait_for_update: 500`; `ads_data_redaction: true`; `url_passthrough: true`. Uložená voľba sa aplikuje hneď, ešte pred GTM.
- Vlastná ľahká lišta, neblokuje obsah. „Prijať všetko“ a „Odmietnuť“ vedľa seba a rovnako výrazné, plus „Nastaviť podrobne“. Voľba v `localStorage` (`tache_consent_v1`) s dátumom, platnosť 12 mesiacov. „Nastavenie cookies“ v pätičke lištu znova otvorí.
- Po voľbe hneď `gtag('consent', 'update', …)`, potom `consent_update` do dataLayeru.
- **Bez súhlasu nesmie vzniknúť `_fbp` ani sa načítať `fbevents.js`.** Overiť v anonymnom okne po „Odmietnuť“.
- QA: pred súhlasom `gcs=G100`, po „Prijať všetko“ `gcs=G111`, aj po výmene obsahu cez `nav.js`.
- Každá podstránka po výmene má presne jeden page_view v GA4 DebugView aj v Meta Test Events.

### 7.3 Zdroj objednávky

UTM parametre, `gclid`, `gbraid`, `wbraid`, `fbclid`, `fbc`, `fbp` a stav súhlasu sa uložia pri prvej návšteve do `sessionStorage` a idú s každým formulárom do Sheetu. Click ID len pri `ad_storage = granted`.

---

## 8. Formuláre a backend

### 8.1 Spoločné pre všetky formuláre

- `fetch` na Apps Script s `Content-Type: text/plain;charset=utf-8` (Apps Script nepodporuje CORS preflight), `redirect: 'follow'`, timeout 12 s.
- `event_id = crypto.randomUUID()` (záložne čas + náhodné číslo), rovnaké ID ide do Sheetu aj do dataLayeru.
- Pri odosielaní zablokovať tlačidlo, text „Odosielam…“. Pri chybe odblokovať, údaje ponechať, chybový box s e-mailom, `form_error`.
- Validácia pri opustení poľa a pri odoslaní, nie počas písania. Chyba zmizne hneď po oprave. Focus na prvé chybné pole, `aria-invalid`, `aria-describedby`, súhrn v `aria-live="polite"`.
- Nápoveda pri preklepe v e-maile („Mysleli ste …@gmail.com?“), neblokuje odoslanie.
- Honeypot s neutrálnym názvom `t_hp` (nie `company`, prehliadače ho vyplnia samy), mimo obrazovky, `tabindex="-1"`, `autocomplete="off"`, obal s `aria-hidden="true"`. Prah `elapsed_ms` najviac 2 000 ms. Spam ide do karty „Spam“ a odpoveď je aj tak `{ok: true}`.
- Prázdny `formEndpoint` = testovací režim: žltý pruh, eventy s `test_mode: true`, nič sa neodošle.
- Bez JS: `<noscript>` s e-mailom.

### 8.2 Objednávka (krok 3 konfigurátora na `/cennik`)

- Polia: Meno a priezvisko, E-mail, Firma alebo IČO (nepovinné), Odvetvie, súhlas s obchodnými podmienkami (povinný). **Bez telefónu.**
- Bez IČO sa zobrazí informácia pre spotrebiteľa o začatí práce pred uplynutím 14-dňovej lehoty na odstúpenie a potvrdenie pri odoslaní.
- Tlačidlo „Objednať balík {názov}“. Po `ok: true` presmerovanie (normálne načítanie) na `/dakujem?o={číslo objednávky}`.

### 8.3 Apps Script (`google-apps-script/`)

- `doPost` rozlíši typ formulára (`order`, `audit`, `ads`, `questionnaire`). Server-side validácia rovnakými pravidlami ako klient. Zápis cez `LockService` + `appendRow`. Duplicita (rovnaký e-mail a typ do 10 minút) bez nového riadku.
- Objednávka dostane číslo `OBJ-RRRR-NNN`, variabilný symbol `RRRRNNN`.
- **Zálohová faktúra automaticky:** šablóna v Google Docs, vyplnené údaje, QR PAY by square (reťazec cez `bysquare`, obrázok cez `qrcode-generator` priamo v Apps Script), PDF do priečinka klienta na Drive a do e-mailu klientovi. Bez externých QR služieb. Splatnosť 10 dní, „Nie som platca DPH“. Riadnu faktúru po platbe vystavuje Daniel ručne.
- Časový spúšťač: po 5 dňoch bez platby pripomienka, po 10 dňoch stav „Uzavretá“ a uvoľnenie zakladateľského miesta.
- Keď Daniel v Sheete označí „Záloha prijatá“, klientovi odíde osobný odkaz na dotazník (`/dotaznik?t={token}`). Token overuje Apps Script, bez platného tokenu sa dotazník neotvorí.
- Po odoslaní dotazníka Apps Script poskladá zadanie pre Claude Code v markdowne do priečinka klienta a pošle ho Danielovi. Nevyplnená odpoveď sa v zadaní označí „❓ chýba“.
- Notifikácie Danielovi cez `MailApp`, bez click ID v e-maile. Odpoveď vždy JSON, chyby `try/catch` → `{ok: false, error: 'server'}`. `doGet()` = rýchly test.
- **Pri zmene kódu:** Nasadiť → Spravovať nasadenia → Upraviť existujúce → Nová verzia. URL `/exec` ostane rovnaká.
- E-maily odchádzajú z adresy na doméne (Webglobe). SPF, DKIM a DMARC nastaviť pred prvým ostrým e-mailom.

---

## 9. Hosting

- Netlify, publish `.`, bez build príkazu, `main` = produkcia, `dev` = náhľad.
- Hlavičky: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`; fonty a obrázky cache 1 rok. CSP zatiaľ nie.
- Interné súbory vracajú 404 (`status = 404`, `force = true`): `/docs/*`, `/design/*`, `/google-apps-script/*`, `/_input/*`, `/CLAUDE.md`, `/README.md`. Overiť v náhľade.
- Postup spustenia: GTM, GA4 a pixel najprv na Netlify URL, doména `tache.sk` ako posledný krok, potom reklama. Po pripojení domény: `siteUrl`, canonical, `og:*`, domény v GA4, overenie domény v Meta, povolenia prevádzky pixelu.
- Pri presune DNS na Netlify preniesť aj MX, SPF, DKIM a DMARC záznamy e-mailu.
