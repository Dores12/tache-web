#!/usr/bin/env python3
"""Kontrola, ze ceny v HTML a v strukturovanych datach sedia s packages.js.

packages.js je podla CLAUDE.md jediny zdroj cien. Ceny v tele stranky
doplna JS, ale na dvoch miestach musia byt staticke:

  - zalozny text pri data-price, ktory vidi navstevnik bez JavaScriptu,
  - JSON-LD s ponukami, ktore cita vyhladavac z HTML.

Oboje sa lahko rozide s packages.js. Tento skript to najde.

Spustenie:  python3 tools/kontrola-cien.py
Vracia 1, ked nieco nesedi.
"""

import json
import os
import re
import sys

KOREN = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def nacitaj_cennik():
    """Vytiahne ceny balikov, doplnkov a pausalov z packages.js."""
    zdroj = open(os.path.join(KOREN, "assets/js/packages.js"), encoding="utf-8").read()
    cennik = {}

    for m in re.finditer(
        r"id:\s*'([a-z]+)',\s*\n\s*name:\s*'([^']+)',\s*\n\s*regular:\s*(\d+),"
        r"\s*\n\s*founder:\s*(\d+),", zdroj
    ):
        kluc, nazov, bezna, zakl = m.groups()
        cennik[kluc + ".regular"] = int(bezna)
        cennik[kluc + ".founder"] = int(zakl)
        cennik["nazov." + kluc] = nazov

    for m in re.finditer(r"\{ id: '([a-z]+)', name: '[^']+', price: (\d+),", zdroj):
        cennik[m.group(1)] = int(m.group(2))

    for m in re.finditer(r"^\s{4}([a-zA-Z]+): (\d+),", zdroj, re.M):
        cennik["pausal." + m.group(1)] = int(m.group(2))

    return cennik


def format_ceny(n):
    """Rovnaky format ako cena() v packages.js."""
    return ("%d" % n) + " €"


def skontroluj_zalozne_texty(cennik):
    """Zalozny text pri data-price musi sediet s packages.js."""
    chyby = []

    for subor in sorted(os.listdir(KOREN)):
        if not subor.endswith(".html"):
            continue
        html = open(os.path.join(KOREN, subor), encoding="utf-8").read()

        for m in re.finditer(r'data-price="([^"]+)"[^>]*>([^<]*)<', html):
            kluc, text = m.group(1), m.group(2).strip()
            if kluc.endswith(".aktualna"):
                continue  # zavisi od poctu zakladatelskych miest
            if kluc not in cennik:
                chyby.append("%s: neznamy kluc data-price=%s" % (subor, kluc))
                continue
            ocakavane = format_ceny(cennik[kluc])
            if text != ocakavane:
                chyby.append("%s: data-price=%s ma zalozny text %r, ocakavam %r"
                             % (subor, kluc, text, ocakavane))

    return chyby


def skontroluj_apps_script(cennik):
    """Kopia cennika v Apps Scripte sa musi zhodovat s packages.js."""
    chyby = []
    subor = os.path.join(KOREN, "google-apps-script/Baliky.gs")
    if not os.path.exists(subor):
        return chyby

    zdroj = open(subor, encoding="utf-8").read()

    for m in re.finditer(
        r"\{ id: '([a-z]+)', name: '([^']+)', regular: (\d+), founder: (\d+),",
        zdroj
    ):
        kluc, nazov, bezna, zakl = m.groups()
        for pole, hodnota in ((".regular", bezna), (".founder", zakl)):
            if cennik.get(kluc + pole) != int(hodnota):
                chyby.append("Baliky.gs: %s%s je %s, v packages.js je %s"
                             % (kluc, pole, hodnota, cennik.get(kluc + pole)))
        if cennik.get("nazov." + kluc) != nazov:
            chyby.append("Baliky.gs: nazov %s je %r, v packages.js je %r"
                         % (kluc, nazov, cennik.get("nazov." + kluc)))

    for m in re.finditer(r"\{ id: '([a-z]+)', name: '[^']+', price: (\d+),", zdroj):
        kluc, hodnota = m.groups()
        if cennik.get(kluc) != int(hodnota):
            chyby.append("Baliky.gs: doplnok %s je %s, v packages.js je %s"
                         % (kluc, hodnota, cennik.get(kluc)))

    return chyby


def skontroluj_jsonld(cennik):
    """Ceny v ponukach JSON-LD musia sediet s beznymi cenami balikov."""
    chyby = []
    podla_nazvu = {cennik["nazov." + k]: cennik[k + ".regular"]
                   for k in ("start", "lead", "kluc")
                   if "nazov." + k in cennik}

    for subor in sorted(os.listdir(KOREN)):
        if not subor.endswith(".html"):
            continue
        html = open(os.path.join(KOREN, subor), encoding="utf-8").read()

        for blok in re.findall(
            r'<script type="application/ld\+json">(.*?)</script>', html, re.S
        ):
            try:
                udaje = json.loads(blok)
            except ValueError as e:
                chyby.append("%s: JSON-LD nie je platny JSON (%s)" % (subor, e))
                continue

            ponuky = udaje.get("offers") or []
            if isinstance(ponuky, dict):
                ponuky = [ponuky]

            for ponuka in ponuky:
                nazov = ponuka.get("name")
                cena = ponuka.get("price")
                if nazov not in podla_nazvu:
                    continue
                if str(podla_nazvu[nazov]) != str(cena):
                    chyby.append("%s: ponuka %s ma cenu %s, v packages.js je %s"
                                 % (subor, nazov, cena, podla_nazvu[nazov]))

    return chyby


def main():
    cennik = nacitaj_cennik()
    if not cennik:
        print("Z packages.js sa nepodarilo precitat ziadne ceny.")
        return 1

    print("== Ceny z packages.js ==")
    print("  nacitanych hodnot: %d" % len([k for k in cennik
                                           if not k.startswith("nazov.")]))

    chyby = (skontroluj_zalozne_texty(cennik) + skontroluj_jsonld(cennik)
             + skontroluj_apps_script(cennik))

    print()
    print("== Nezrovnalosti ==")
    if not chyby:
        print("  ziadne")
        return 0

    for chyba in chyby:
        print("  " + chyba)
    print()
    print("Najdenych problemov: %d" % len(chyby))
    return 1


if __name__ == "__main__":
    sys.exit(main())
