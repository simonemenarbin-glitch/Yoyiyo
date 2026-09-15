#!/usr/bin/env python3
"""
Yoyiyo Outreach CRM-light
-------------------------
Qualifica agenzie già trovate da te, genera bozze email soft,
tiene registro invii/opt-out e propone follow-up solo dove consentito.

NON scrapa indirizzi.
NON invia email automaticamente (niente blast).
Tetto giornaliero configurabile (default 100 bozze/registrazioni).
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    print("Installa le dipendenze: pip install -r requirements.txt", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "agenzie.csv"
CONFIG_PATH = ROOT / "config.yaml"
DRAFTS_DIR = ROOT / "drafts"
LOG_DIR = ROOT / "outreach"
DAILY_LOG = LOG_DIR / "invii_giornalieri.csv"

TIPI_LABEL = {
    "agenzia_retail": "agenzia di viaggio",
    "tour_operator": "tour operator",
    "dmc": "DMC",
    "incoming": "agenzia incoming",
}

STATI_VALIDI = {
    "da_verificare",
    "qualificata",
    "contattata",
    "followup_inviato",
    "risposta",
    "opt_out",
    "scartata",
}

FIELDNAMES = [
    "id",
    "nome",
    "tipo",
    "zona",
    "email",
    "contatto",
    "sito",
    "fonte",
    "stato",
    "qualifica_ok",
    "data_primo_contatto",
    "data_ultimo_invio",
    "n_invii",
    "data_followup",
    "risposta",
    "opt_out",
    "note",
]


def today() -> date:
    return date.today()


def parse_date(value: str) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def ensure_files() -> None:
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    if not DAILY_LOG.exists():
        with DAILY_LOG.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f, fieldnames=["data", "agenzia_id", "email", "tipo_messaggio", "file_bozza"]
            )
            writer.writeheader()
    if not DATA_PATH.exists():
        with DATA_PATH.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()


def load_rows() -> list[dict[str, str]]:
    ensure_files()
    with DATA_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        for key in FIELDNAMES:
            row.setdefault(key, "")
    return rows


def save_rows(rows: list[dict[str, str]]) -> None:
    ensure_files()
    with DATA_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in FIELDNAMES})


def find_row(rows: list[dict[str, str]], agenzia_id: str) -> dict[str, str]:
    for row in rows:
        if row["id"] == agenzia_id:
            return row
    raise SystemExit(f"Agenzia non trovata: {agenzia_id}")


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "agenzia"


def truthy(value: str) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "si", "sì", "ok", "y"}


def daily_count(day: date | None = None) -> int:
    ensure_files()
    day = day or today()
    count = 0
    with DAILY_LOG.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("data") == day.isoformat():
                count += 1
    return count


def assert_under_daily_cap(config: dict[str, Any], extra: int = 1) -> None:
    limit = int(config.get("limiti", {}).get("max_email_giorno", 100))
    used = daily_count()
    if used + extra > limit:
        raise SystemExit(
            f"Tetto giornaliero raggiunto: {used}/{limit}. "
            "Niente blast: riprova domani o alza il limite solo se resta soft e tracciato."
        )


def log_daily(agenzia_id: str, email: str, tipo: str, draft_path: Path) -> None:
    ensure_files()
    with DAILY_LOG.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["data", "agenzia_id", "email", "tipo_messaggio", "file_bozza"]
        )
        writer.writerow(
            {
                "data": today().isoformat(),
                "agenzia_id": agenzia_id,
                "email": email,
                "tipo_messaggio": tipo,
                "file_bozza": str(draft_path.relative_to(ROOT)),
            }
        )


def cmd_status(_: argparse.Namespace) -> None:
    config = load_config()
    rows = load_rows()
    limit = int(config.get("limiti", {}).get("max_email_giorno", 100))
    used = daily_count()
    by_state: dict[str, int] = {}
    for row in rows:
        if row["id"].startswith("esempio"):
            continue
        by_state[row["stato"]] = by_state.get(row["stato"], 0) + 1

    print(f"Zona target: {config.get('target', {}).get('zona')}")
    print(f"Offerta: {config.get('offerta', {}).get('descrizione')}")
    print(f"Oggi: {used}/{limit} bozze/registrazioni")
    print("Stati CRM:")
    if not by_state:
        print("  (nessuna agenzia reale — rimuovi l'esempio e aggiungi contatti verificati)")
    for stato, n in sorted(by_state.items()):
        print(f"  {stato}: {n}")


def cmd_add(args: argparse.Namespace) -> None:
    rows = load_rows()
    agenzia_id = args.id or slugify(args.nome)
    if any(r["id"] == agenzia_id for r in rows):
        raise SystemExit(f"ID già presente: {agenzia_id}")

    row = {k: "" for k in FIELDNAMES}
    row.update(
        {
            "id": agenzia_id,
            "nome": args.nome,
            "tipo": args.tipo,
            "zona": args.zona or "",
            "email": args.email,
            "contatto": args.contatto or "",
            "sito": args.sito or "",
            "fonte": args.fonte,
            "stato": "da_verificare",
            "qualifica_ok": "no",
            "n_invii": "0",
            "risposta": "no",
            "opt_out": "no",
            "note": args.note or "",
        }
    )
    rows.append(row)
    save_rows(rows)
    print(f"Aggiunta: {agenzia_id} (stato=da_verificare)")
    print("Prossimo passo: completa la checklist e lancia `qualify`.")


def cmd_qualify(args: argparse.Namespace) -> None:
    rows = load_rows()
    row = find_row(rows, args.id)
    if truthy(row.get("opt_out", "")):
        raise SystemExit("Questa agenzia è in opt-out: non qualificabile.")

    missing = []
    if not row.get("email"):
        missing.append("email")
    if not row.get("fonte"):
        missing.append("fonte")
    if not row.get("tipo"):
        missing.append("tipo")
    if args.fail:
        row["stato"] = "scartata"
        row["qualifica_ok"] = "no"
        if args.motivo:
            row["note"] = (row.get("note") + " | " if row.get("note") else "") + args.motivo
        save_rows(rows)
        print(f"Scartata: {row['id']}")
        return

    if missing and not args.force:
        raise SystemExit(
            "Qualifica incompleta, mancano: "
            + ", ".join(missing)
            + ". Completa i campi o usa --force solo se la checklist è ok."
        )

    if not args.yes:
        print("Confermi di aver completato docs/CHECKLIST_QUALIFICA.md per questa agenzia? [y/N]")
        answer = input().strip().lower()
        if answer not in {"y", "yes", "s", "si", "sì"}:
            raise SystemExit("Qualifica annullata.")

    row["stato"] = "qualificata"
    row["qualifica_ok"] = "yes"
    if args.motivo:
        row["note"] = (row.get("note") + " | " if row.get("note") else "") + args.motivo
    save_rows(rows)
    print(f"Qualificata: {row['id']}")


def build_context(config: dict[str, Any], row: dict[str, str]) -> dict[str, str]:
    mittente = config.get("mittente", {})
    offerta = config.get("offerta", {})
    target = config.get("target", {})
    contatto = (row.get("contatto") or "").strip()
    zona_cfg = (target.get("zona") or "").strip()
    zona = (row.get("zona") or "").strip() or zona_cfg
    if zona.lower().startswith("da impostare"):
        zona = ""
    tipo = (row.get("tipo") or "").strip()
    telefono = (mittente.get("telefono") or "").strip()
    sito = (mittente.get("sito") or "").strip()

    blocco = ""
    if telefono:
        blocco += f"\n{telefono}"
    if sito:
        blocco += f"\n{sito}"

    return {
        "nome_mittente": mittente.get("nome", ""),
        "ruolo_mittente": mittente.get("ruolo", ""),
        "azienda_mittente": mittente.get("azienda", ""),
        "email_mittente": mittente.get("email", ""),
        "opt_out_hint": f"rispondi STOP a {mittente.get('email', '')}",
        "offerta_descrizione": offerta.get("descrizione", ""),
        "valore_per_loro": offerta.get("valore_per_loro", ""),
        "call_to_action": offerta.get("call_to_action", ""),
        "nome_agenzia": row.get("nome", ""),
        "saluto_contatto": f" {contatto}" if contatto else "",
        "zona_frase": f" in/su {zona}" if zona else "",
        "tipo_frase": f" come {TIPI_LABEL.get(tipo, tipo)}" if tipo else "",
        "blocco_contatti": blocco,
    }


def render_template(name: str, context: dict[str, str]) -> str:
    path = ROOT / "templates" / name
    text = path.read_text(encoding="utf-8")
    return text.format(**context)


def cmd_draft(args: argparse.Namespace) -> None:
    config = load_config()
    rows = load_rows()
    row = find_row(rows, args.id)

    if truthy(row.get("opt_out", "")) or row.get("stato") == "opt_out":
        raise SystemExit("Opt-out attivo: nessuna bozza.")
    if row.get("stato") == "scartata":
        raise SystemExit("Agenzia scartata: nessuna bozza.")
    if not truthy(row.get("qualifica_ok", "")) and not args.force:
        raise SystemExit("Prima qualifica l'agenzia (`qualify`) oppure usa --force con cautela.")

    assert_under_daily_cap(config)

    kind = "followup" if args.followup else "soft"
    if args.followup:
        max_fu = int(config.get("limiti", {}).get("max_followup", 1))
        already = 1 if row.get("data_followup") else 0
        n_invii = int(row.get("n_invii") or 0)
        if already >= max_fu or n_invii >= (1 + max_fu):
            raise SystemExit("Follow-up non consentito: tetto follow-up raggiunto.")
        if not row.get("data_primo_contatto"):
            raise SystemExit("Nessun primo contatto registrato: non fare follow-up a freddo.")
        wait_days = int(config.get("limiti", {}).get("giorni_prima_followup", 7))
        primo = parse_date(row["data_primo_contatto"])
        if primo and today() < primo + timedelta(days=wait_days) and not args.force:
            raise SystemExit(
                f"Troppo presto per il follow-up (attendi {wait_days} giorni dal primo contatto)."
            )
        template = "email_followup.txt"
    else:
        if row.get("data_primo_contatto") and not args.force:
            raise SystemExit("Primo contatto già fatto. Usa `draft --followup` se consentito.")
        template = "email_soft.txt"

    context = build_context(config, row)
    body = render_template(template, context)
    filename = f"{today().isoformat()}_{row['id']}_{kind}.txt"
    draft_path = DRAFTS_DIR / filename
    draft_path.write_text(body, encoding="utf-8")

    print(f"Bozza creata: {draft_path.relative_to(ROOT)}")
    print("Invio: copia/incolla nel tuo client email. Questo tool NON invia messaggi.")
    print("---")
    print(body)


def cmd_sent(args: argparse.Namespace) -> None:
    """Registra un invio già fatto manualmente dall'utente."""
    config = load_config()
    rows = load_rows()
    row = find_row(rows, args.id)

    if truthy(row.get("opt_out", "")) or row.get("stato") == "opt_out":
        raise SystemExit("Opt-out attivo: non registrare nuovi invii.")

    assert_under_daily_cap(config)

    kind = "followup" if args.followup else "soft"
    draft_path = Path(args.draft) if args.draft else DRAFTS_DIR / f"{today().isoformat()}_{row['id']}_{kind}.txt"
    if not draft_path.exists():
        # Permetti registrazione anche senza file bozza, ma crea un placeholder di traccia
        draft_path.parent.mkdir(parents=True, exist_ok=True)
        if not draft_path.exists():
            draft_path.write_text(
                f"(Invio registrato manualmente il {today().isoformat()} — bozza non allegata)\n",
                encoding="utf-8",
            )

    n_invii = int(row.get("n_invii") or 0) + 1
    row["n_invii"] = str(n_invii)
    row["data_ultimo_invio"] = today().isoformat()
    if not row.get("data_primo_contatto"):
        row["data_primo_contatto"] = today().isoformat()
    if args.followup:
        row["data_followup"] = today().isoformat()
        row["stato"] = "followup_inviato"
    else:
        row["stato"] = "contattata"

    log_daily(row["id"], row.get("email", ""), kind, draft_path)
    save_rows(rows)
    used = daily_count()
    limit = int(config.get("limiti", {}).get("max_email_giorno", 100))
    print(f"Registrato invio {kind} per {row['id']}. Oggi: {used}/{limit}")


def cmd_opt_out(args: argparse.Namespace) -> None:
    rows = load_rows()
    row = find_row(rows, args.id)
    row["opt_out"] = "yes"
    row["stato"] = "opt_out"
    if args.note:
        row["note"] = (row.get("note") + " | " if row.get("note") else "") + args.note
    save_rows(rows)
    print(f"Opt-out registrato per {row['id']}. Nessun contatto futuro.")


def cmd_reply(args: argparse.Namespace) -> None:
    rows = load_rows()
    row = find_row(rows, args.id)
    row["risposta"] = "yes"
    row["stato"] = "risposta"
    if args.note:
        row["note"] = (row.get("note") + " | " if row.get("note") else "") + args.note
    save_rows(rows)
    print(f"Risposta annotata per {row['id']}.")


def cmd_followups(_: argparse.Namespace) -> None:
    config = load_config()
    rows = load_rows()
    wait_days = int(config.get("limiti", {}).get("giorni_prima_followup", 7))
    max_fu = int(config.get("limiti", {}).get("max_followup", 1))
    candidates = []

    for row in rows:
        if row["id"].startswith("esempio"):
            continue
        if truthy(row.get("opt_out", "")) or row.get("stato") in {"opt_out", "scartata", "risposta"}:
            continue
        if not row.get("data_primo_contatto"):
            continue
        if row.get("data_followup") and max_fu <= 1:
            continue
        if truthy(row.get("risposta", "")):
            continue
        primo = parse_date(row["data_primo_contatto"])
        if not primo:
            continue
        if today() >= primo + timedelta(days=wait_days):
            candidates.append(row)

    if not candidates:
        print("Nessun follow-up consentito al momento.")
        return

    print("Follow-up consentiti (genera bozza con: python outreach_crm.py draft ID --followup):")
    for row in candidates:
        print(
            f"- {row['id']} | {row['nome']} | {row['email']} | "
            f"primo contatto {row['data_primo_contatto']}"
        )


def cmd_today_batch(args: argparse.Namespace) -> None:
    """Prepara fino a N bozze soft per agenzie già qualificate (max tetto giornaliero)."""
    config = load_config()
    rows = load_rows()
    limit = int(config.get("limiti", {}).get("max_email_giorno", 100))
    remaining = max(0, limit - daily_count())
    n = min(args.limit, remaining)
    if n <= 0:
        raise SystemExit("Tetto giornaliero già raggiunto.")

    ready = [
        r
        for r in rows
        if not r["id"].startswith("esempio")
        and truthy(r.get("qualifica_ok", ""))
        and not truthy(r.get("opt_out", ""))
        and r.get("stato") == "qualificata"
        and not r.get("data_primo_contatto")
    ][:n]

    if not ready:
        print("Nessuna agenzia qualificata pronta per il primo contatto.")
        return

    print(f"Preparazione {len(ready)} bozze (rimangono {remaining} slot oggi, tetto {limit}).")
    for row in ready:
        ns = argparse.Namespace(id=row["id"], followup=False, force=False)
        cmd_draft(ns)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="CRM-light B2B soft outreach (niente scraping, niente invio automatico)."
    )
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Stato CRM e tetto giornaliero").set_defaults(func=cmd_status)

    add = sub.add_parser("add", help="Aggiungi un'agenzia trovata e verificata a mano")
    add.add_argument("--nome", required=True)
    add.add_argument("--email", required=True)
    add.add_argument("--tipo", required=True, choices=sorted(TIPI_LABEL))
    add.add_argument("--fonte", required=True, help="Es. sito-ufficiale, google-maps, fiera-2026")
    add.add_argument("--zona")
    add.add_argument("--contatto")
    add.add_argument("--sito")
    add.add_argument("--id")
    add.add_argument("--note")
    add.set_defaults(func=cmd_add)

    q = sub.add_parser("qualify", help="Segna agenzia come idonea dopo la checklist")
    q.add_argument("id")
    q.add_argument("--yes", "-y", action="store_true", help="Salta conferma interattiva")
    q.add_argument("--force", action="store_true")
    q.add_argument("--fail", action="store_true", help="Scarta l'agenzia")
    q.add_argument("--motivo")
    q.set_defaults(func=cmd_qualify)

    d = sub.add_parser("draft", help="Genera bozza email soft o follow-up (NON invia)")
    d.add_argument("id")
    d.add_argument("--followup", action="store_true")
    d.add_argument("--force", action="store_true")
    d.set_defaults(func=cmd_draft)

    s = sub.add_parser("sent", help="Registra un invio fatto da te nel client email")
    s.add_argument("id")
    s.add_argument("--followup", action="store_true")
    s.add_argument("--draft", help="Percorso bozza usata")
    s.set_defaults(func=cmd_sent)

    o = sub.add_parser("opt-out", help="Registra STOP / non ricontattare")
    o.add_argument("id")
    o.add_argument("--note")
    o.set_defaults(func=cmd_opt_out)

    r = sub.add_parser("reply", help="Segna che l'agenzia ha risposto")
    r.add_argument("id")
    r.add_argument("--note")
    r.set_defaults(func=cmd_reply)

    sub.add_parser("followups", help="Elenca follow-up consentiti").set_defaults(func=cmd_followups)

    b = sub.add_parser("today-batch", help="Prepara bozze soft per agenzie qualificate (max tetto)")
    b.add_argument("--limit", type=int, default=20, help="Quante bozze preparare ora (default 20)")
    b.set_defaults(func=cmd_today_batch)

    return p


def main() -> None:
    ensure_files()
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
