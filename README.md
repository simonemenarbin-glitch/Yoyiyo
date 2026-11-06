# Rotta ERP

Piattaforma SaaS cloud stile MedusaERP per agenzie di viaggio e tour operator (Yoyiyo).

## Nucleo attuale

- Multi-tenant: Organization + Brand + Membership
- Catalogo contratti: periodi, allotment, supplementi, politiche
- Connettori fornitori sandbox (Travio / Hotelston / mock DMC)
- Preventivi multi-fonte + pratiche ops (penali, documenti)
- Network B2B + portale promoter `/p/[token]`
- Richiesta pubblica `/richiesta/[brand]` + checkout guest `/checkout/[token]`
- Reporting margini + scadenze cassa
- Contabilità 74-ter base + stub SdI

## Avvio locale

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

Demo: `demo@rotta.erp` / `rotta-demo`

### Test utili

```bash
npm run test:catalog
npm run test:suppliers
npm run test:b2b
npm run test:reporting
npm run test:74ter
```

### Percorsi demo

| Area | URL |
|---|---|
| Catalogo contratti | `/app/catalogo` |
| Fornitori sandbox | `/app/fornitori` |
| B2B / listini | `/app/b2b` |
| Portale promoter | `/p/prt_befriend_demo_token_0001` |
| Richiesta pubblica | `/richiesta/yoyiyo` |
| Vendite web | `/app/vendite-web` |
| Reporting | `/app/reporting` |
| 74-ter | `/app/contabilita` |

Nessun secret in repo: IMAP/PSP/SdI/API fornitori usano env Hostinger o restano sandbox.
