#!/bin/bash
#
# Spustí web na tomto počítači a otvorí ho v prehliadači.
#
# Stačí na tento súbor dvakrát kliknúť v priečinku. Otvorí sa čierne okno
# Terminálu, nechaj ho otvorené. Keď skončíš, zatvor ho alebo stlač
# Ctrl a C naraz.
#
# Prečo to takto a prečo nestačí otvoriť index.html dvojklikom: stránky sa
# na seba odkazujú adresami ako /cennik a štýly hľadajú v /assets. To sú
# adresy na webe, nie cesty v priečinku. Pri otvorení súboru z Findera ich
# prehliadač hľadá v koreni disku a nenájde nič, takže uvidíš holý text.
# Tento server sa chová rovnako ako Netlify, takže vidíš presne to, čo
# potom pôjde na web.

PORT=8787
PRIECINOK="$(cd "$(dirname "$0")" && pwd)"

cd "$PRIECINOK" || exit 1

echo "Tache, lokálny web"
echo "-------------------------------------------"
echo "Priečinok: $PRIECINOK"
echo

if ! command -v python3 > /dev/null 2>&1; then
  echo "Na počítači chýba python3. Nainštaluj ho a skús znova."
  echo "Stlač ľubovoľný kláves pre zatvorenie."
  read -r -n 1
  exit 1
fi

echo "Toto okno nechaj otvorené. Keď skončíš, zatvor ho"
echo "alebo stlač Ctrl a C naraz."
echo "-------------------------------------------"
echo

ZAZNAM="$(mktemp -t tache-web)"
trap 'rm -f "$ZAZNAM"' EXIT

# Server si sám nájde voľný port, keď je ten náš obsadený iným projektom.
# Adresu, na ktorej naozaj beží, si prečítame z jeho výpisu.
(
  for _ in $(seq 1 80); do
    ADRESA="$(grep -o 'http://localhost:[0-9]*' "$ZAZNAM" 2>/dev/null | head -1)"
    if [ -n "$ADRESA" ]; then
      open "$ADRESA"
      exit 0
    fi
    sleep 0.25
  done
) &

python3 -u tools/server.py "$PORT" 2>&1 | tee "$ZAZNAM"
