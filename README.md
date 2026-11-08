# Rotta ERP

Piattaforma SaaS cloud stile MedusaERP per agenzie di viaggio e tour operator.

## Nucleo attuale (v0.1)

- Multi-tenant: Organization + Brand + Membership/ruoli
- Catalogo prodotti + rate plan (contratti)
- Pratiche multi-servizio con margine
- Preventivi / vendita multi-canale (B2B, web, banco, landing, WhatsApp)
- CRM base: clienti + partner agenzia
- Auth a sessione + audit log

## Roadmap verso parità Medusa

1. Checkout sito brandizzato + guest quote
2. Inbox CRM omnicanale (WhatsApp/email)
3. Marketing / campagne
4. Reporting direzionale avanzato + contabilità
5. Connettori fornitori / GDS-OTA
6. AI assistenti su quotazioni e contenuti
7. Hardening enterprise (MFA, DR drill, SSO)

## Stack

- Next.js (App Router) + TypeScript
- Prisma + SQLite (locale) → Postgres in produzione
- Tailwind CSS

## Avvio locale

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run test:landing
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

Demo: `demo@rotta.erp` / `rotta-demo`

### Landing builder

- Hub: `/app/landing` — template LeadConnector-style per brand
- Editor: `/app/marchi/[id]/siti/[siteId]` — testi + anteprima + pubblica
- Pubblico: `/s/yoyiyo/cina-classic`, `/s/yoyiyo/partner`, `/s/cina-in-gruppo/home`
