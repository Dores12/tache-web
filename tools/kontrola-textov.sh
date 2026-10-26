#!/usr/bin/env bash
#
# Kontrola zakázaných vzorcov v textoch podľa CLAUDE.md sekcia 4.
# Skript nič nehodnotí za teba, len nájde výskyty, ktoré treba prejsť očami.
# Napríklad "kontakt, ktorý nezdvihne telefón" v sekcii Problém je v poriadku,
# ponuka telefonátu nie.
#
# Prehľadáva HTML stránky a JS, kde sú texty pre návštevníka (cookie lišta,
# hlásenia formulárov). Návrhy v design/ a dokumenty v docs/ sa preskakujú.
#
# Spustenie:  bash tools/kontrola-textov.sh
# Vracia 1, keď niečo našiel.

set -uo pipefail
cd "$(dirname "$0")/.."

SUBORY=()
while IFS= read -r subor; do
  SUBORY+=("$subor")
done < <(find . \( -name '*.html' -o -name '*.js' \) \
  -not -path './design/*' -not -path './docs/*' -not -path './.git/*' \
  -not -path './assets/vendor/*' -not -path './tools/*' | sort)

# Schválené výskyty, ktoré sa už nehlásia. Zoznam je v overene-texty.txt.
POVOLENE=tools/overene-texty.txt

odfiltruj() {
  if [ ! -f "$POVOLENE" ]; then
    cat
    return
  fi
  grep -vFf <(grep -v '^#' "$POVOLENE" | grep -v '^[[:space:]]*$') || true
}

najdene=0

hladaj() {
  local popis="$1"
  local vzor="$2"
  local vynimka="${3:-}"

  local vysledok
  if [ -n "$vynimka" ]; then
    vysledok=$(grep -niE "$vzor" "${SUBORY[@]}" | grep -viE "$vynimka" | odfiltruj)
  else
    vysledok=$(grep -niE "$vzor" "${SUBORY[@]}" | odfiltruj)
  fi

  if [ -n "$vysledok" ]; then
    echo "-- $popis"
    printf '%s\n' "$vysledok" | sed 's/^/   /'
    echo
    najdene=$((najdene + 1))
  fi
}

echo "== Vzorce na preverenie =="
echo

hladaj 'Dvojica "nie X, ale Y"' 'nie [^<>]*, ale'
hladaj 'Telefón (na webe nemá byť)' 'telefón|telefon|mobil: |zavola|zavolá|hovor[ťu]|telefonát'
# Povolené je "Lead systém" a kód: id balíka 'lead', kľúč lead.founder,
# názov eventu generate_lead.
hladaj 'Slovo lead mimo názvu balíka' '\blead' "lead syst|'lead'|lead\.|generate_lead"
hladaj 'Sľub výsledku' 'zaručene|zaručujem|garantujem počet|určite viac zákazníkov'
hladaj 'Dlhá pomlčka' '—'
hladaj 'Tykanie v texte pre zákazníka' '\b(objednaj|napíš mi|pozri si|vyber si)\b'

if [ "$najdene" -eq 0 ]; then
  echo "Nič podozrivé."
  exit 0
fi

echo "Nálezov na prejdenie: $najdene"
echo "Každý výskyt over ručne, nie všetky sú chyba."
exit 1
