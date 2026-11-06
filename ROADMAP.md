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

## Fase 0.7 — Catalogo contratti (fatto)

- [x] Periodi / stagioni con prenotabile-entro
- [x] Allotment (unità, booked, release, free-sale)
- [x] Supplementi (single, child, city tax, seasonal…)
- [x] Politiche cancellazione / pagamento / release
- [x] Own-list search risolve periodo + supplementi

## Fase 0.8 — Connettori sandbox (fatto)

- [x] Adapter interface: search / quote / book / cancel + capabilities
- [x] Travio sandbox (pacchetti/DMC) e Hotelston sandbox (hotel OTA)
- [x] UI `/app/fornitori` sandbox tester
- [x] Default connectors READY in sandbox (no live keys)

## Fase 0.9 — Network B2B (fatto)

- [x] PartnerNet (STANDARD / PREFERRED / PROMOTER / WHITE_LABEL)
- [x] Listini differenziati (agencyNet + suggestedSell)
- [x] Portale promoter `/p/[token]`

## Fase 1 — Vendita completa

- [x] Storefront multi-brand (landing esistenti + /richiesta)
- [x] Checkout guest + richiesta preventivo pubblica
- [x] Listini agenzia partner
- [ ] Documenti automatici (voucher / conferma)
- [ ] Credenziali live connettori API (Travio/Hotelston/…) al posto del sandbox

## Fase 1.5 — Pratiche ops + documenti (fatto)

- [x] Policy penali FIT vs groupage >20 (acconto 10% / release 120 gg + scala)
- [x] Variazioni e cancellazioni (riga / totale) con storico `PracticeChange`
- [x] Documenti: voucher, conferma, foglio notizie (HTML stampabile)
- [x] Flag groupage, acconto, confirmedAt su pratica

## Fase 2 — Operations

- [ ] Rooming list strutturata + pax nominativi
- [ ] Task operativi e assegnazioni
- [ ] Export PDF nativo (oltre HTML print)
- [ ] RQ fornitore tracciate per riga

## Fase 3 — CRM omnicanale

- [ ] Inbox unificata email/WhatsApp
- [ ] Thread → lead → preventivo automatico
- [ ] Note e timeline cliente

## Fase 4 — Growth

- [ ] Campagne email/social
- [x] Reporting margini per brand/canale + scadenze cassa
- [ ] AI quotazioni / import contratti

## Fase 5 — Enterprise

- [ ] Postgres multi-tenant hardening
- [ ] MFA / SSO
- [ ] Backup/DR e audit compliance
- [ ] Billing SaaS (canoni per tenant)
