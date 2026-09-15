# Yoyiyo — CRM-light outreach B2B soft

Sistema semplice per contattare **agenzie già trovate da te**, in modo professionale e tracciato.

## Cosa fa
- ti aiuta a **qualificare** agenzie idonee e attive
- genera **bozze email soft** personalizzate
- tiene un **registro invii / opt-out**
- propone **follow-up solo dove consentito**
- rispetta un tetto di **max 100 email/giorno** (configurabile)

## Cosa NON fa
- non scrapa indirizzi
- non invia email in automatico
- non fa blast di massa

L’invio resta manuale dal tuo client email (Gmail, Outlook, ecc.): questo tool prepara bozze e tiene il registro.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Poi modifica `config.yaml`:
- mittente
- offerta / valore per l’agenzia
- zona target
- `max_email_giorno` (default `100`)

## Flusso consigliato

1. Trova un’agenzia a mano (sito, Maps, fiera, referral).
2. Aggiungila al CRM.
3. Completa `docs/CHECKLIST_QUALIFICA.md`.
4. Qualificala.
5. Genera la bozza soft.
6. Invia tu dal client email.
7. Registra l’invio.
8. Se rispondono “STOP” → `opt-out`.
9. Dopo N giorni, chiedi i follow-up consentiti (max 1).

### Comandi

```bash
# Stato e tetto giornaliero
python outreach_crm.py status

# Aggiungi contatto verificato
python outreach_crm.py add \
  --nome "Agenzia Rossi" \
  --email "info@agenziarossi.it" \
  --tipo agenzia_retail \
  --fonte sito-ufficiale \
  --zona "Sicilia orientale" \
  --sito "https://agenziarossi.it"

# Qualifica dopo checklist
python outreach_crm.py qualify agenzia-rossi -y

# Bozza primo contatto (NON invia)
python outreach_crm.py draft agenzia-rossi

# Dopo che hai inviato tu
python outreach_crm.py sent agenzia-rossi

# Follow-up consentiti
python outreach_crm.py followups
python outreach_crm.py draft agenzia-rossi --followup
python outreach_crm.py sent agenzia-rossi --followup

# Opt-out / risposta
python outreach_crm.py opt-out agenzia-rossi --note "ha risposto STOP"
python outreach_crm.py reply agenzia-rossi --note "interessati, richiedere materiale"

# Prepara più bozze soft (max rimanente del tetto giornaliero)
python outreach_crm.py today-batch --limit 20
```

## File principali
- `config.yaml` — mittente, offerta, zona, limiti
- `data/agenzie.csv` — CRM
- `docs/CHECKLIST_QUALIFICA.md` — idoneità / attività / legittimo interesse
- `templates/email_soft.txt` — primo contatto
- `templates/email_followup.txt` — unico follow-up soft
- `drafts/` — bozze generate
- `outreach/invii_giornalieri.csv` — conteggio giornaliero

## Note privacy (orientative, non parere legale)
In B2B un primo contatto soft a email aziendali pubbliche può basarsi su **legittimo interesse professionale**, se:
- il destinatario è pertinente
- c’è potenziale vantaggio reciproco
- il tono non è aggressivo
- l’opt-out è chiaro e rispettato
- i volumi restano bassi e tracciati

Se arriva uno STOP, non contattare più quell’indirizzo.
