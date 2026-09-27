"""Rigenera il dossier. Non tocca le risposte già scritte dal verificatore."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from motore.conoscenza import DOMANDE
from motore.giudizio import Risposta, giudica
from motore.render import dossier_ciclo_1, dossier_ciclo_2, foglio_verifica


def leggi_verifica(testo: str) -> dict[str, Risposta]:
    testi = {d["id"]: d["testo"] for d in DOMANDE}
    parti = re.split(r"^## (V\d+)\s*$", testo, flags=re.M)
    letti: dict[str, Risposta] = {}
    for indice in range(1, len(parti), 2):
        vid = parti[indice]
        corpo = parti[indice + 1]
        letti[vid] = Risposta(
            id=vid,
            testo=testi.get(vid, ""),
            risposta=_campo(corpo, "risposta"),
            nota=_campo(corpo, "nota"),
        )
    for domanda in DOMANDE:
        letti.setdefault(
            domanda["id"],
            Risposta(id=domanda["id"], testo=domanda["testo"], risposta="", nota=""),
        )
    return letti


def _campo(corpo: str, nome: str) -> str:
    match = re.search(rf"^{nome}:[ \t]*(.*)$", corpo, flags=re.M)
    if not match:
        return ""
    return match.group(1).strip()


def esegui(root: Path) -> str:
    dossier = root / "dossier"
    verifica = root / "verifica"
    dossier.mkdir(exist_ok=True)
    verifica.mkdir(exist_ok=True)

    percorso = verifica / "ciclo-001.md"
    if not percorso.exists():
        percorso.write_text(foglio_verifica(), encoding="utf-8")

    risposte = leggi_verifica(percorso.read_text(encoding="utf-8"))
    (dossier / "ciclo-001.md").write_text(dossier_ciclo_1(), encoding="utf-8")

    compilate = any(r.risposta.strip() for r in risposte.values())
    if compilate:
        esito = giudica(risposte)
        (dossier / "ciclo-002.md").write_text(
            dossier_ciclo_2(esito, risposte),
            encoding="utf-8",
        )
        return esito.stato
    ciclo_2 = dossier / "ciclo-002.md"
    if ciclo_2.exists():
        ciclo_2.unlink()
    return "in_attesa"


def main(argv: list[str], root: Path) -> int:
    del argv
    stato = esegui(root)
    print(f"Soglia: {stato}")
    print("Dossier: dossier/ciclo-001.md")
    print("Verifica: verifica/ciclo-001.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:], Path(__file__).resolve().parents[1]))
