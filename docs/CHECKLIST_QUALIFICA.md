# Checklist — Agenzia idonea e attiva

Usa questa checklist **prima** di generare o inviare qualsiasi email.
Compila i campi nel CRM (`data/agenzie.csv`) solo se i controlli passano.

## 1. Fonte del contatto (obbligatorio)
- [ ] Contatto trovato manualmente (sito, Maps, fiera, referral, directory ufficiale)
- [ ] **Non** proveniente da scraping automatico di massa
- [ ] Fonte annotata in `fonte` (es. `sito-ufficiale`, `google-maps`, `fiera-2026`)

## 2. Identità aziendale
- [ ] Nome agenzia chiaro e verificabile
- [ ] Sito o pagina pubblica aggiornata
- [ ] Operano nella **zona target** (o servono clienti in quella zona)
- [ ] Tipo coerente: retail / tour operator / DMC / incoming

## 3. Attività reale
- [ ] Segnali di attività recente (orari, contenuti, offerte, social, telefono attivo)
- [ ] Non risulta chiusa / sospesa / solo placeholder
- [ ] Email aziendale pubblica plausibile (`info@`, `booking@`, contatto sul sito)

## 4. Pertinenza (legittimo interesse)
- [ ] La tua offerta è rilevante per la loro attività
- [ ] C'è un potenziale **vantaggio reciproco** (non solo tuo)
- [ ] Il contatto è professionale, non personale/privato

## 5. Privacy e rispetto
- [ ] Nessun opt-out precedente per questa email/agenzia
- [ ] Non hai già scritto di recente (rispetta i tempi di follow-up)
- [ ] Volume giornaliero sotto il tetto (max 100)

## Esito
- Se **tutti** i punti critici passano → `stato=qualificata`
- Se qualcosa manca ma recuperabile → `stato=da_verificare`
- Se non idonea / chiusa / fuori target → `stato=scartata` + motivo in `note`
- Se ha chiesto di non essere ricontattata → `stato=opt_out` (mai più contatti)
