# Yoyiyo Desk AI

Assistente AI per **agenzie di viaggio e tour operator**: programmi di viaggio, bozze email/WhatsApp, scelta formula (Tour pronti · Su misura · Groupage) e FAQ operative sul prodotto Cina Yoyiyo.

## Avvio

```bash
cd web
npm install
npm run dev
```

Build statica:

```bash
cd web
npm run build
```

Output in `web/dist/` (deployabile su hosting statico).

## Cosa fa

| Modalità | Output |
|---|---|
| Programma | Bozza giorno per giorno su basi FIT Yoyiyo |
| Email / WA | Risposta B2B con formula e scheda |
| Formula | Tour pronti vs Su misura vs Groupage |
| FAQ desk | Visto 2026, prezzi, prima volta, destinazioni |

La demo gira in locale sulla knowledge base prodotto (yoyiyo.biz / llms.txt). Nessuna chiave API richiesta.

## Contatti B2B

- agenzieitalia@yoyiyo.biz
- WhatsApp +39 379 240 7399
- https://www.yoyiyo.biz
