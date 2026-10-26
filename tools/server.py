#!/usr/bin/env python3
"""Lokalny server pre vyvoj, ktory sa chova ako Netlify.

Adresy su bez pripony (/cennik), na disku su subory cennik.html. Netlify to
rieši zapnutymi Pretty URLs, tento server robi to iste, aby sa lokalne
testovalo presne to, co pojde na web. Navyse vracia 404 na interne cesty
podla netlify.toml a na neznamych adresach servíruje 404.html.

Server komprimuje textove odpovede a posiela rovnake hlavicky ako
netlify.toml, aby lokalny Lighthouse ukazoval cisla blizke produkcii.

Spustenie:  python3 tools/server.py [port]       (predvolene 8080)

Subor nie je sucastou webu, Netlify ho vracia ako 404.
"""

import os
import sys
import gzip
import mimetypes
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote

KOREN = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))

# Rovnaky zoznam ako v netlify.toml.
BLOKOVANE = (
    "/docs/", "/design/", "/google-apps-script/", "/tools/", "/_input/",
    "/CLAUDE.md", "/README.md",
)

# Typy, ktore ma zmysel komprimovat. Netlify to robi automaticky.
KOMPRIMOVATELNE = (
    "text/", "application/javascript", "application/json", "image/svg+xml",
    "application/xml",
)

# Rovnake hlavicky ako v netlify.toml.
BEZPECNOSTNE = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "X-Frame-Options": "DENY",
}

ROCNA_CACHE = ("/assets/fonts/", "/assets/img/")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=KOREN, **kwargs)

    def log_message(self, sprava, *args):
        sys.stderr.write("%s %s\n" % (self.command, self.path))

    # --- Pomocne ---------------------------------------------------------
    def _blokovana(self, cesta):
        return any(cesta == b or cesta.startswith(b) for b in BLOKOVANE)

    def _na_disku(self, cesta):
        """Bezpecne prelozi URL cestu na subor v korene projektu."""
        cisty = posixpath.normpath(unquote(cesta)).lstrip("/")
        plny = os.path.realpath(os.path.join(KOREN, cisty))
        if plny != KOREN and not plny.startswith(KOREN + os.sep):
            return None
        return plny

    def _najdi(self, cesta):
        """Vrati URL cestu k suboru, ktory sa ma poslat, alebo None."""
        if cesta.endswith("/"):
            cesta = cesta[:-1]
        if cesta == "":
            cesta = "/index.html"

        plny = self._na_disku(cesta)
        if plny is None:
            return None

        if os.path.isfile(plny):
            return cesta

        # Adresa bez pripony: skus rovnomenny .html subor.
        if "." not in posixpath.basename(cesta):
            s_priponou = self._na_disku(cesta + ".html")
            if s_priponou and os.path.isfile(s_priponou):
                return cesta + ".html"

            v_adresari = self._na_disku(cesta + "/index.html")
            if v_adresari and os.path.isfile(v_adresari):
                return cesta + "/index.html"

        return None

    def _chyba404(self, s_telom=True):
        subor = os.path.join(KOREN, "404.html")
        telo = b""
        if os.path.isfile(subor):
            with open(subor, "rb") as f:
                telo = f.read()

        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(telo)))
        self.end_headers()
        if s_telom:
            self.wfile.write(telo)

    # --- Obsluha ---------------------------------------------------------
    def _priprav(self):
        rozdelene = urlsplit(self.path)
        cesta = rozdelene.path

        if self._blokovana(cesta):
            return None

        najdene = self._najdi(cesta)
        if najdene is None:
            return None

        self.path = najdene
        if rozdelene.query:
            self.path += "?" + rozdelene.query
        return self.path

    def _posli(self, cesta, s_telom=True):
        plny = self._na_disku(cesta)
        with open(plny, "rb") as f:
            telo = f.read()

        typ = mimetypes.guess_type(plny)[0] or "application/octet-stream"
        if typ.startswith("text/") or typ in ("application/javascript",
                                              "application/json"):
            typ += "; charset=utf-8"

        kodovanie = None
        prijima = self.headers.get("Accept-Encoding", "")
        if "gzip" in prijima and len(telo) > 512 \
                and any(typ.startswith(t) for t in KOMPRIMOVATELNE):
            telo = gzip.compress(telo, 6)
            kodovanie = "gzip"

        self.send_response(200)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(len(telo)))
        if kodovanie:
            self.send_header("Content-Encoding", kodovanie)
            self.send_header("Vary", "Accept-Encoding")
        for nazov, hodnota in BEZPECNOSTNE.items():
            self.send_header(nazov, hodnota)
        if any(cesta.startswith(p) for p in ROCNA_CACHE):
            self.send_header("Cache-Control",
                             "public, max-age=31536000, immutable")
        self.end_headers()

        if s_telom:
            self.wfile.write(telo)

    def do_GET(self):
        cesta = self._priprav()
        if cesta is None:
            self._chyba404()
            return
        self._posli(cesta.split("?")[0])

    def do_HEAD(self):
        cesta = self._priprav()
        if cesta is None:
            self._chyba404(s_telom=False)
            return
        self._posli(cesta.split("?")[0], s_telom=False)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("Tache beží na http://localhost:%d  (koniec: Ctrl+C)" % port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nKoniec.")
        server.server_close()


if __name__ == "__main__":
    main()
