# Rotta ERP — roadmap parità Medusa

## Fase 0 — Nucleo (fatto in v0.1)

- [x] Multi-organization / multi-brand
- [x] Ruoli membership
- [x] Catalogo + rate plan
- [x] Pratica multi-servizio
- [x] Preventivo / canali vendita
- [x] CRM clienti + partner B2B
- [x] Login sessione + audit

## Fase 0.5 — Preventivo lavorabile da CRM (fatto)

- [x] Lead da WhatsApp / mail / Instagram / Facebook / web
- [x] Board pipeline (NEW → … → WON/LOST)
- [x] Preventivo collegato al lead
- [x] Editor righe: listino proprio + voce manuale
- [x] `PriceSource` OWN_LIST | SUPPLIER_API | MANUAL (API fornitori strutturalmente pronto)
- [x] Stati documento + stadio pipeline sul preventivo
- [x] Intake: legge mail/messaggio, decide READY vs NEEDS_INFO
- [x] Auto-preventivo base da listino se dati sufficienti
- [x] Bozza risposta editabile + refine AI (API key opzionale / locale)
- [x] Maschera canali IMAP + WhatsApp/IG/FB/Web
- [x] Pulsante Aggiorna → sync automatico lead + preventivo bozza / risposta pronta
- [x] Webhook `/api/channels/webhook/[id]` per push Meta/form
- [x] Invio risposte dalla piattaforma (SMTP / WhatsApp / Meta) con conferma
- [x] Timeline conversazione lead (IN/OUT tracciati)
- [x] Più pipeline per cliente + filtri tipo cliente / marchio / partner

## Fase 0.6 — Preventivo + pricing multi-fonte (fatto)

- [x] `SupplierConnector` per org (own-list, mock DMC, stub Travio/Hotelston)
- [x] Ricerca offerte da preventivo (listino proprio date-aware + API sandbox)
- [x] Aggiunta riga da offerta con priceSource / supplierRef
- [x] Conversione preventivo → pratica
- [x] Pagina `/app/fornitori` enable/disable connettori

## Fase 1 — Vendita completa

- [ ] Storefront multi-brand
- [ ] Checkout guest + richiesta preventivo
- [ ] Listini agenzia partner
- [ ] Documenti automatici (voucher / conferma)
- [ ] Credenziali live connettori API (Travio/Hotelston/…) al posto del sandbox

## Fase 2 — Operations

- [ ] Workflow stati pratica + variazioni/cancellazioni
- [ ] Penali e release (FIT vs groupage >20)
- [ ] Rooming list / documenti viaggio
- [ ] Task operativi e assegnazioni

## Fase 3 — CRM omnicanale

- [ ] Inbox unificata email/WhatsApp
- [ ] Thread → lead → preventivo automatico
- [ ] Note e timeline cliente

## Fase 4 — Growth

- [ ] Campagne email/social
- [ ] Reporting margini per brand/canale
- [ ] AI quotazioni / import contratti

## Fase 5 — Enterprise

- [ ] Postgres multi-tenant hardening
- [ ] MFA / SSO
- [ ] Backup/DR e audit compliance
- [ ] Billing SaaS (canoni per tenant)
