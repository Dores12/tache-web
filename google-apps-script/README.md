# Backend v Google Apps Scripte

Spracúva štyri formuláre z webu (`order`, `audit`, `ads`, `questionnaire`),
čísluje objednávky, vystavuje zálohové faktúry s QR kódom, posiela e-maily,
pripomína nezaplatené zálohy a z vyplneného dotazníka skladá zadanie.

Kód sa do Apps Scriptu **kopíruje ručne**, tento priečinok je zdroj pravdy.
Netlify ho vracia ako 404, na web sa nedostane.

## Čo kam

| Súbor | Čo robí |
|---|---|
| `Nastavenia.gs` | všetko, čo sa mení: ID tabuľky, priečinka, šablóny, IBAN, e-mail |
| `Kod.gs` | `doPost` a `doGet`, smerovanie podľa typu formulára |
| `Validacia.gs` | kontrola údajov na serveri, rovnaké pravidlá ako v prehliadači |
| `Baliky.gs` | kópia cien z `assets/js/packages.js` pre výpočet na serveri |
| `Tabulka.gs` | zápis do Sheetu, číslovanie, duplicity, zakladateľské miesta |
| `Objednavka.gs` | spracovanie objednávky |
| `Faktura.gs` | zálohová faktúra z Google Docs do PDF, aj generátor šablóny |
| `QrKod.gs` | reťazec PAY by square a obrázok QR |
| `Emaily.gs` | všetky e-maily klientovi aj Danielovi |
| `Spustace.gs` | denná kontrola a reakcia na zmenu stavu v tabuľke |
| `Dotaznik.gs` | overenie tokenu a zostavenie zadania v markdowne |

K tomu dve knižnice z `assets/vendor/`, ktoré treba do projektu pridať tiež:

| Súbor v repozitári | Názov v Apps Scripte |
|---|---|
| `assets/vendor/lzma1/lzma1.js` | `lzma1.gs` |
| `assets/vendor/qrcode-generator/qrcode.js` | `qrcode.gs` |

## Nastavenie krok za krokom

1. **Tabuľka.** Vytvor nový Google Sheet. Karty `Objednávky`, `Kontroly
   webu`, `Reklama`, `Dotazníky` a `Spam` si skript založí sám aj
   s hlavičkami. Z adresy si vezmi ID a vlož ho do `tabulkaId`.
2. **Priečinok na Drive.** Vytvor priečinok pre klientov, ID vlož do
   `priecinokId`. Pre každú objednávku v ňom vznikne podpriečinok.
3. **Projekt.** Na script.google.com vytvor projekt a nakopíruj doň všetky
   `.gs` súbory z tohto priečinka aj obe knižnice.
4. **Šablóna faktúry.** Spusti raz funkciu `vytvorSablonuFaktury()`. ID
   z denníka vlož do `sablonaFakturyId` a dokument si uprav podľa seba.
   Značky v dvojitých zátvorkách nechaj, tie sa dopĺňajú. **Náležitosti
   nechaj skontrolovať účtovníkovi.**
5. **Ostatné nastavenia.** Doplň `email`, `ico`, `businessAddress`,
   `tradeRegister` a `iban`.
6. **Nasadenie.** Nasadiť → Nové nasadenie → Webová aplikácia. Spúšťať ako
   *ja*, prístup *ktokoľvek*. Adresu `/exec` vlož do `formEndpoint`
   v `assets/js/config.js`.
7. **Spúšťače.** Spusti raz `nastavSpustace()`.
8. **Odosielanie z domény.** V Gmaile pridaj adresu na doméne ako alias.
   Bez neho e-maily odídu z adresy účtu. Na doméne nastav SPF, DKIM a DMARC
   **pred prvým ostrým e-mailom**.

## Pri každej ďalšej zmene kódu

Nasadiť → Spravovať nasadenia → Upraviť existujúce → **Nová verzia**.
Adresa `/exec` ostane rovnaká, nič sa na webe meniť nemusí.

## Overenie

Rýchly test, či nasadenie žije: otvor adresu `/exec` v prehliadači. Vráti
JSON so zoznamom chýbajúcich nastavení.

Celý backend sa dá otestovať aj bez nasadenia, so službami Google
nahradenými napodobeninami:

```
node tools/test-apps-script.mjs
```

Prejde validáciu, spam, číslovanie, výpočet cien, duplicity, zakladateľské
miesta, e-maily, dotazník, QR kód aj oba spúšťače. Spusti to po každej
zmene v tomto priečinku.

Ceny v `Baliky.gs` sa musia zhodovať s `assets/js/packages.js`, stráži to
`python3 tools/kontrola-cien.py`.

## Čo vedome nerobí

- **Riadnu faktúru nevystavuje.** Po prijatí platby ju vystavuje Daniel
  ručne. Automatická je len zálohová faktúra, teda výzva na úhradu.
- **Platby nekontroluje.** Stav „Záloha prijatá“ prepína Daniel ručne
  v tabuľke, až to spustí odoslanie dotazníka.
- **Spam neodmieta.** Ide do karty `Spam` a odpoveď je aj tak kladná, aby
  robot nevedel, že ho vidíme.
