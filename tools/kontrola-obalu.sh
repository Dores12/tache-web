#!/usr/bin/env bash
#
# Kontrola, že opakované bloky sú vo všetkých HTML súboroch rovnaké.
#
# CLAUDE.md sekcia 5 žiada, aby sa hlavička a pätička opakovali v každom
# HTML a pri zmene sa overilo grepom, že sú rovnaké. Tento skript to robí
# za nás: vyberie bloky medzi značkami <!-- #blok:start --> a
# <!-- #blok:end --> a porovná ich kontrolným súčtom.
#
# Navyše overí, že hostiteľ v canonical a og:url sedí so siteUrl v configu.
# Na to ľahko zabudnúť pri prechode na doménu tache.sk.
#
# Spustenie:  bash tools/kontrola-obalu.sh
# Vracia 1, keď niečo nesedí, takže sa dá použiť aj pred commitom.

set -uo pipefail
cd "$(dirname "$0")/.."

BLOKY=(hlava meranie hlavicka paticka skripty)
chyby=0

vyber_blok() {
  sed -n "/<!-- #$2:start -->/,/<!-- #$2:end -->/p" "$1"
}

echo "== Zhodnosť opakovaných blokov =="

for blok in "${BLOKY[@]}"; do
  subory=()
  while IFS= read -r subor; do
    subory+=("$subor")
  done < <(grep -rl --include='*.html' "<!-- #$blok:start -->" . \
    --exclude-dir=design --exclude-dir=.git --exclude-dir=tools \
    --exclude-dir=docs | sort)

  if [ ${#subory[@]} -eq 0 ]; then
    echo "  $blok: nikde, preskakujem"
    continue
  fi

  vzor=$(vyber_blok "${subory[0]}" "$blok" | shasum | cut -d' ' -f1)
  nesedi=()

  for subor in "${subory[@]}"; do
    sucet=$(vyber_blok "$subor" "$blok" | shasum | cut -d' ' -f1)
    if [ "$sucet" != "$vzor" ]; then
      nesedi+=("$subor")
    fi
  done

  if [ ${#nesedi[@]} -eq 0 ]; then
    echo "  $blok: rovnaký v ${#subory[@]} súboroch"
  else
    echo "  $blok: LÍŠI SA od ${subory[0]} v:"
    for subor in "${nesedi[@]}"; do
      echo "      $subor"
    done
    chyby=$((chyby + 1))
  fi
done

echo
echo "== Chýbajúce bloky =="

# tools/ a docs/ nie sú stránky webu, šablóny v nich obal nemajú mať.
for subor in $(find . -name '*.html' -not -path './design/*' \
  -not -path './.git/*' -not -path './tools/*' -not -path './docs/*' \
  | sort); do
  chyba_v_subore=""
  for blok in "${BLOKY[@]}"; do
    if ! grep -q "<!-- #$blok:start -->" "$subor"; then
      chyba_v_subore="$chyba_v_subore $blok"
    fi
  done
  if [ -n "$chyba_v_subore" ]; then
    echo "  $subor chýba:$chyba_v_subore"
    chyby=$((chyby + 1))
  fi
done

if [ "$chyby" -eq 0 ]; then
  echo "  nič nechýba"
fi

echo
echo "== Hostiteľ v canonical a og:url =="

site_url=$(sed -n "s/.*siteUrl: *'\([^']*\)'.*/\1/p" assets/js/config.js | head -1)

if [ -z "$site_url" ]; then
  echo "  siteUrl v configu je prázdny, preskakujem"
else
  hostitel=$(printf '%s' "$site_url" | sed -E 's#^https?://##; s#/.*##')
  echo "  config: $hostitel"

  zle=$(grep -rhoE '(rel="canonical" href|property="og:(url|image)" content)="https?://[^/"]+' \
    --include='*.html' . --exclude-dir=design --exclude-dir=.git \
    --exclude-dir=tools --exclude-dir=docs \
    | sed -E 's#.*="https?://##' | sort -u | grep -v "^$hostitel$" || true)

  if [ -n "$zle" ]; then
    echo "  INÝ HOSTITEĽ v canonical alebo og:"
    printf '      %s\n' $zle
    chyby=$((chyby + 1))
  else
    echo "  všetky canonical a og sedia"
  fi
fi

echo
if [ "$chyby" -eq 0 ]; then
  echo "Všetko v poriadku."
  exit 0
fi

echo "Nájdených problémov: $chyby"
exit 1
