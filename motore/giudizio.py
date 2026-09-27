"""Legge le risposte del verificatore e decide se l'idea resta in vita.

Il motore non completa le risposte mancanti. Una riga vuota tiene fermo il pilota.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from motore.conoscenza import OBBLIGATORIE

SI_NO = {"si", "no", "non-so"}
ORGANIZZATORI = {"yoyiyo", "dmc", "agenzia", "non-so"}
MINIMI = {"si", "no", "solo-alcune-mete"}


@dataclass
class Risposta:
    id: str
    testo: str
    risposta: str
    nota: str


@dataclass
class Esito:
    stato: str
    motivi: list[str] = field(default_factory=list)
    b2c: str = "in_decisione"
    organizzatore: str | None = None
    corridoi: str = "tutti quelli dove il minimo resta alto"


def _norm(valore: str) -> str:
    return valore.strip().lower().replace("ì", "i").replace("sì", "si")


def _intero(valore: str) -> int | None:
    match = re.search(r"\d+", valore.replace(".", ""))
    if not match:
        return None
    return int(match.group(0))


def giudica(risposte: dict[str, Risposta]) -> Esito:
    motivi: list[str] = []
    mancano = [vid for vid in OBBLIGATORIE if not risposte.get(vid) or not risposte[vid].risposta.strip()]
    if mancano:
        motivi.append(
            "Restano senza risposta: " + ", ".join(mancano) + ". Il pilota non parte."
        )

    v1 = risposte.get("V1")
    v1_n = _intero(v1.risposta) if v1 and v1.risposta.strip() else None
    if v1 and v1.risposta.strip() and v1_n is None:
        motivi.append("V1 non contiene un numero. Scrivi quante volte al mese, anche circa.")
        mancano.append("V1")

    uccisioni: list[str] = []
    if v1_n == 0:
        uccisioni.append(
            "V1 è 0: nel mercato che vedi tu il gruppo troppo piccolo non è un fatto ricorrente. Soglia si ferma."
        )

    v2 = _norm(risposte["V2"].risposta) if risposte.get("V2") and risposte["V2"].risposta.strip() else ""
    if v2 == "no":
        uccisioni.append(
            "V2 è no: senza un frammento dichiarabile dalle agenzie non c'è nulla da sommare."
        )
    elif v2 == "non-so":
        motivi.append("V2 è non-so: finché le agenzie non accettano il frammento, il pilota resta fermo.")
        mancano.append("V2")
    elif v2 and v2 not in SI_NO:
        motivi.append("V2 accetta solo: si, no, non-so.")
        mancano.append("V2")

    v3 = _norm(risposte["V3"].risposta) if risposte.get("V3") and risposte["V3"].risposta.strip() else ""
    if v3 == "no":
        uccisioni.append(
            "V3 è no: senza un preventivo fermo, anche breve, la firma non attesta nulla."
        )
    elif v3 == "non-so":
        motivi.append("V3 è non-so: senza un preventivo fermo la firma non attesta nulla. Il pilota resta fermo.")
        mancano.append("V3")
    elif v3 and v3 not in SI_NO:
        motivi.append("V3 accetta solo: si, no, non-so.")
        mancano.append("V3")

    v4 = _norm(risposte["V4"].risposta) if risposte.get("V4") and risposte["V4"].risposta.strip() else ""
    organizzatore: str | None = None
    if v4 in {"yoyiyo", "dmc", "agenzia"}:
        organizzatore = v4
    elif v4 == "non-so":
        motivi.append("V4 è non-so: manca il nome dell'organizzatore. Il pilota resta fermo.")
        if "V4" not in mancano:
            mancano.append("V4")
    elif v4 and v4 not in ORGANIZZATORI:
        motivi.append("V4 accetta solo: yoyiyo, dmc, agenzia, non-so.")
        if "V4" not in mancano:
            mancano.append("V4")

    v6 = _norm(risposte["V6"].risposta) if risposte.get("V6") and risposte["V6"].risposta.strip() else ""
    if v6 == "non-so":
        motivi.append("V6 è non-so: l'unicità non è ancora verificata. Il pilota resta fermo.")
        mancano.append("V6")
    elif v6 and v6 not in SI_NO:
        motivi.append("V6 accetta solo: si, no, non-so.")
        mancano.append("V6")
    da_rifare = v6 == "si"

    v9 = _norm(risposte["V9"].risposta) if risposte.get("V9") and risposte["V9"].risposta.strip() else ""
    corridoi = "tutti quelli dove il minimo resta alto"
    if v9 == "si":
        uccisioni.append(
            "V9 è si: su questi fornitori il minimo due allo stesso prezzo risolve già il problema. Soglia non serve."
        )
    elif v9 == "solo-alcune-mete":
        corridoi = "solo le mete dove il fornitore non parte in due allo stesso prezzo"
    elif v9 == "no":
        pass
    elif v9:
        motivi.append("V9 accetta solo: si, no, solo-alcune-mete.")
        mancano.append("V9")

    b2c = "in_decisione"
    v7 = _norm(risposte["V7"].risposta) if risposte.get("V7") and risposte["V7"].risposta.strip() else ""
    if v7 == "si":
        b2c = "chiuso"
        motivi.append(
            "V7 è si: il canale verso il pubblico resta spento. Il B2B può vivere lo stesso."
        )
    elif v7 == "no":
        b2c = "aperto_dopo_conferma"
        motivi.append(
            "V7 è no: il pubblico entra solo a soglia già confermata, sui posti fino al massimo, al prezzo minimo scritto prima."
        )
    elif v7 == "non-so":
        b2c = "chiuso"
        motivi.append("V7 è non-so: il canale verso il pubblico resta spento finché non decidi.")
    elif v7 and v7 not in SI_NO:
        motivi.append("V7 accetta solo: si, no, non-so.")

    v5 = _norm(risposte["V5"].risposta) if risposte.get("V5") and risposte["V5"].risposta.strip() else ""
    if v5 == "no":
        motivi.append(
            "V5 è no: il margine operativo attuale non copre la verifica. Prima del pilota va scritto chi paga quel tempo."
        )
    elif v5 == "si":
        motivi.append(
            "V5 è si: il primo pilota si appoggia al margine che già ti resta sul gruppo, senza una fee di software."
        )
    elif v5 and v5 not in SI_NO:
        motivi.append("V5 accetta solo: si, no, non-so.")

    v8 = _norm(risposte["V8"].risposta) if risposte.get("V8") and risposte["V8"].risposta.strip() else ""
    if v8 == "no":
        motivi.append(
            "V8 è no: il campione sull'acconto non regge. Ogni frammento, per essere sommato, deve mostrare a te la prova dell'acconto."
        )
    elif v8 == "si":
        motivi.append("V8 è si: l'acconto si controlla a campione, e i nomi restano da te.")
    elif v8 and v8 not in SI_NO:
        motivi.append("V8 accetta solo: si, no, non-so.")

    if uccisioni:
        stato = "morta"
        if da_rifare:
            uccisioni.append(
                "In più V6 è si: hai già visto un circuito che fa questa somma. Vale la pena nominarlo nella nota."
            )
        motivi = uccisioni + motivi
    elif da_rifare:
        stato = "da_rifare"
        motivi.insert(
            0,
            "V6 è si: questo meccanismo, detto da te, esiste già. Il giro sull'unicità si rifà da capo, con il nome di quel circuito scritto nella nota.",
        )
    elif mancano:
        stato = "in_attesa"
    elif v1_n is not None and v1_n < 2:
        stato = "pilota_debole"
        motivi.insert(
            0,
            f"V1 è {v1_n} volta al mese: abbastanza per una prova manuale, poco per una piattaforma.",
        )
    else:
        stato = "pilota"
        if v1_n is not None:
            motivi.insert(0, f"V1 è {v1_n} volte al mese: c'è materiale per un corridoio pilota, fatto a mano.")

    if organizzatore == "agenzia":
        motivi.append(
            "V4 è agenzia: una agenzia diventerebbe organizzatore dei clienti delle altre. Il foglio deve dirlo prima del blocco, perché è il punto che le altre faticheranno a firmare."
        )
    elif organizzatore == "dmc":
        motivi.append(
            "V4 è dmc: le agenzie vendono il pacchetto del fornitore. Soglia somma e tu attesti. Il fornitore deve accettare una lista nomi che arriva da più agenzie italiane."
        )
    elif organizzatore == "yoyiyo":
        motivi.append(
            "V4 è yoyiyo: sul foglio di soglia l'organizzatore sei tu. Gli obblighi del pacchetto stanno da questa parte del contratto."
        )

    return Esito(
        stato=stato,
        motivi=motivi,
        b2c=b2c,
        organizzatore=organizzatore,
        corridoi=corridoi,
    )
