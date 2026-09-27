"""Somma i frammenti compatibili. Stessa settimana, stesso corridoio.

Il motore non inventa date flessibili: se due agenzie non hanno scritto
la stessa settimana, non stanno nella stessa soglia.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Frammento:
    agenzia: str
    corridoio: str
    settimana: str
    pax: int
    tetto_netto: int

    def __post_init__(self) -> None:
        if not self.agenzia.strip():
            raise ValueError("agenzia vuota")
        if not self.corridoio.strip() or not self.settimana.strip():
            raise ValueError("corridoio o settimana vuoti")
        if self.pax <= 0:
            raise ValueError("pax deve essere almeno 1")
        if self.tetto_netto <= 0:
            raise ValueError("tetto_netto deve essere positivo")


@dataclass(frozen=True)
class Proposta:
    corridoio: str
    settimana: str
    frammenti: tuple[Frammento, ...]
    persone: int
    tetto_comune: int
    stato: str
    manca: int
    eccedenza: int

    @property
    def agenzie(self) -> tuple[str, ...]:
        return tuple(f.agenzia for f in self.frammenti)


def proponi(frammenti: list[Frammento], minimo: int, massimo: int) -> list[Proposta]:
    """Raggruppa e giudica. L'ordine di uscita è stabile."""
    if minimo <= 0:
        raise ValueError("minimo deve essere positivo")
    if massimo < minimo:
        raise ValueError("massimo sotto il minimo")

    gruppi: dict[tuple[str, str], list[Frammento]] = {}
    for frammento in frammenti:
        gruppi.setdefault((frammento.corridoio, frammento.settimana), []).append(frammento)

    proposte: list[Proposta] = []
    for corridoio, settimana in sorted(gruppi):
        pezzi = tuple(sorted(gruppi[(corridoio, settimana)], key=lambda f: f.agenzia))
        persone = sum(f.pax for f in pezzi)
        tetto = min(f.tetto_netto for f in pezzi)
        if persone < minimo:
            stato, manca, eccedenza = "sotto_soglia", minimo - persone, 0
        elif persone > massimo:
            stato, manca, eccedenza = "sopra_massimo", 0, persone - massimo
        else:
            stato, manca, eccedenza = "proposta", 0, 0
        proposte.append(
            Proposta(
                corridoio=corridoio,
                settimana=settimana,
                frammenti=pezzi,
                persone=persone,
                tetto_comune=tetto,
                stato=stato,
                manca=manca,
                eccedenza=eccedenza,
            )
        )
    return proposte


def netto_accettabile(proposta: Proposta, netto: int) -> bool:
    """Il preventivo firmato deve stare sotto ogni tetto, cioè sotto il tetto comune."""
    if netto <= 0:
        raise ValueError("netto deve essere positivo")
    return proposta.stato == "proposta" and netto <= proposta.tetto_comune
