"""Scrive il dossier e il foglio che compila il verificatore."""

from __future__ import annotations

from motore.conoscenza import (
    DATA_RICERCA,
    DOMANDE,
    DOMANDE_SUE,
    ESEMPIO,
    GIRI,
    IDEA,
    MORTE,
    PAGINE,
    PASSI,
    VICINI,
)
from motore.giudizio import Esito, Risposta
from motore.somma import Frammento, proponi


def foglio_verifica() -> str:
    blocchi = [
        "# Verifica di Simone — ciclo 1",
        "",
        "Compila `risposta` e, se serve, `nota`. Ciò che lasci vuoto resta aperto.",
        "Sì/no: `si`, `no`, `non-so`.",
        "V1: un numero.",
        "V4: `yoyiyo`, `dmc`, `agenzia`, `non-so`.",
        "V9: `si`, `no`, `solo-alcune-mete`.",
        "",
        "Il motore non sovrascrive questo file.",
        "",
    ]
    for domanda in DOMANDE:
        blocchi.extend(
            [
                f"## {domanda['id']}",
                f"domanda: {domanda['testo']}",
                "risposta:",
                "nota:",
                "",
            ]
        )
    return "\n".join(blocchi).rstrip() + "\n"


def _esempio_proposte() -> str:
    pezzi = [
        Frammento(
            agenzia=item["agenzia"],
            corridoio=ESEMPIO["corridoio"],
            settimana=ESEMPIO["settimana"],
            pax=item["pax"],
            tetto_netto=item["tetto"],
        )
        for item in ESEMPIO["frammenti"]
    ]
    pezzi.append(
        Frammento(
            agenzia="D",
            corridoio="Giappone",
            settimana=ESEMPIO["settimana"],
            pax=6,
            tetto_netto=2000,
        )
    )
    proposte = proponi(pezzi, ESEMPIO["minimo"], ESEMPIO["massimo"])
    righe = []
    for proposta in proposte:
        dettaglio = ", ".join(f"{f.agenzia} {f.pax} pax tetto {f.tetto_netto}" for f in proposta.frammenti)
        extra = ""
        if proposta.manca:
            extra = f", ne mancano {proposta.manca}"
        if proposta.eccedenza:
            extra = f", eccedenza {proposta.eccedenza}"
        righe.append(
            f"- {proposta.corridoio}, {proposta.settimana}: {proposta.persone} persone, "
            f"tetto comune {proposta.tetto_comune}, stato `{proposta.stato}`{extra}. "
            f"Frammenti: {dettaglio}."
        )
    return "\n".join(righe)


def dossier_ciclo_1() -> str:
    vicini = "\n".join(
        f"- **{v['nome']}.** {v['fatto']} {v['url']}" for v in VICINI
    )
    giri = "\n\n".join(
        f"### {i}. {g['domanda']}\n\nEsito: {g['esito']}\n\n{g['risposta']}"
        for i, g in enumerate(GIRI, start=1)
    )
    passi = "\n".join(f"{i}. {p}" for i, p in enumerate(PASSI, start=1))
    morte = "\n".join(f"- {m}" for m in MORTE)
    domande = "\n".join(f"- **{d['id']}.** {d['testo']}" for d in DOMANDE)
    esempio = _esempio_proposte()
    return f"""# Soglia — ciclo 1

Motore: questo deposito. Verificatore: Simone.
Ricerca dei vicini: {DATA_RICERCA}. Il motore non certifica che un'idea sia assente dal mondo intero. Certifica cosa ha trovato, e si ferma dove serve la tua firma.

## Cosa fai tu

Apri `verifica/ciclo-001.md`, compila le risposte che sai già, e rilancia `python3 -m motore`.
Finché V1, V2, V3, V4, V6 e V9 non tengono l'idea in vita, non si costruisce una piattaforma.

Le domande che ti faresti tu, risposte sulle pagine pubbliche, stanno in `dossier/lettura-partner.md`. Quella lettura non compila la verifica: la firma resta tua.

## L'idea

**{IDEA['nome']}.** {IDEA['frase']}

Fase uno: solo agenzie. Il cliente finale entra dopo, sulla stessa soglia già confermata, con una regola di prezzo scritta prima.

Il primo corridoio è quello in cui controlli un preventivo vero. Se è il corridoio dei gruppi che già tratti con le agenzie italiane, la verifica cade su documenti che sai leggere. Lo stesso protocollo vale su un altro corridoio il giorno in cui un altro verificatore firma lì. All'inizio la firma è la tua.

## I passi

{passi}

## Il foglio che firmeresti

Su una soglia proposta il foglio porta: corridoio, settimana, minimo, massimo, elenco dei frammenti (agenzia e numero, non i nomi), tetto comune, netto che tu hai verificato, scadenza delle 48 ore, nome dell'organizzatore, prezzo minimo verso il pubblico (in fase uno: assente).

Senza la riga dell'organizzatore il foglio non è firmabile.

## Esempio di calcolo

Ipotesi, non un preventivo. Minimo {ESEMPIO['minimo']}, massimo {ESEMPIO['massimo']}. {ESEMPIO['nota']}

{esempio}

Il Giappone con 6 persone resta sotto soglia e non viene mescolato alla Cina: settimana uguale, corridoio diverso.

## Cosa risulta già in commercio

{vicini}

La frase che puoi verificare: in questi prodotti la partenza, o l'inventario, esiste prima della domanda sparsa delle agenzie. In Soglia l'ordine è inverso. La partenza nasce dalla somma, dopo la tua firma.

## Giri già fatti

{giri}

## Cosa la fa morire

{morte}

## Scala

Si parte da un corridoio, un verificatore, fogli veri. Il motore somma e tiene il conto delle domande. Quando un corridoio chiude soglie ogni settimana, si aggiunge un secondo verificatore su un altro corridoio. Tu passi dal firmare ogni preventivo al controllare un campione di firme.

Il B2C non è un secondo prodotto. È la stessa soglia, a posti residui, dopo la conferma delle agenzie. Se mi dici che le agenzie lo vivrebbero come uno sgarbo, quel canale resta spento e il B2B continua.

## Domande aperte

{domande}
"""


def lettura_partner() -> str:
    pagine = "\n".join(f"- **{p['nome']}.** {p['fatto']} {p['url']}" for p in PAGINE)
    domande = "\n\n".join(
        f"### {d['id']}. {d['voce']}\n\nEsito: {d['esito']}.\n\n{d['risposta']}"
        for d in DOMANDE_SUE
    )
    aperte = [d["id"] for d in DOMANDE_SUE if d["esito"] == "resta tua"]
    return f"""# Domande che ti faresti tu

Motore, al posto del verificatore. Pagine lette il {DATA_RICERCA}.
Nessuna di queste righe è scritta in `verifica/ciclo-001.md`.

## Pagine

{pagine}

## Domande

{domande}

## Cosa resta aperto

{", ".join(aperte) if aperte else "Niente."}

S8 è la V1 del foglio di verifica. Le altre, su queste pagine, le ho chiuse io.
Il pilota, se vive, sta dentro Yoyiyo Partner e sul desk: due frammenti, stessa settimana, data non teal oppure rotta di groupage da riscrivere. Si prenota con gli strumenti già in pagina.
"""


def dossier_ciclo_2(esito: Esito, risposte: dict[str, Risposta]) -> str:
    compilate = [
        f"- **{vid}.** {risposte[vid].risposta}"
        + (f" — {risposte[vid].nota}" if risposte[vid].nota else "")
        for vid in risposte
        if risposte[vid].risposta.strip()
    ]
    if not compilate:
        compilate = ["- Nessuna risposta compilata."]
    motivi = "\n".join(f"- {m}" for m in esito.motivi) or "- Nessun motivo registrato."
    if esito.stato == "morta":
        seguito = (
            "Mi fermo qui. Non apro un altro concetto finché non mi dici "
            "quale premessa è cambiata."
        )
    elif esito.stato == "da_rifare":
        seguito = (
            "Scrivi nella nota di V6 il nome del circuito che già lo fa. "
            "Il giro successivo parte da quel nome, non da Soglia."
        )
    elif esito.stato == "in_attesa":
        seguito = "Le obbligatorie ancora vuote tengono fermo il pilota."
    else:
        seguito = (
            f"Pilota manuale su: {esito.corridoi}. "
            f"Organizzatore sul foglio: {esito.organizzatore or 'manca'}. "
            "Prossima prova: cinque agenzie, un fornitore, un foglio, nessuna piattaforma. "
            f"Canale pubblico: {esito.b2c}."
        )
    return f"""# Soglia — ciclo 2

Questo ciclo usa solo le risposte scritte in `verifica/ciclo-001.md`.

## Stato

**{esito.stato}**

{motivi}

## Risposte lette

{chr(10).join(compilate)}

## Seguito

{seguito}
"""
