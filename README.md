# Yoyiyo

## TikTok mini app

Mini app Node/Express per collegare un account TikTok via OAuth e inviare un
video alla TikTok Content Posting API.

### Cosa fa

- Avvia un flusso OAuth TikTok.
- Salva i token localmente in `.data/tiktok-tokens.json`.
- Legge informazioni base dell'account collegato.
- Legge le opzioni creator disponibili per la pubblicazione.
- Pubblica un video da URL HTTPS con `/v2/post/publish/video/init/`.
- Controlla lo stato di una pubblicazione con il publish ID.

### Limiti importanti

TikTok non consente di pubblicare in modo libero solo con username e password.
Serve un'app su TikTok Developers, autorizzazione OAuth dell'account e
approvazione degli scope necessari.

Per pubblicare pubblicamente serve lo scope `video.publish` approvato da TikTok.
Senza audit/approvazione, l'API puo' limitare i post a visibilita' privata o
bloccare la pubblicazione pubblica.

### Setup

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Copia il file ambiente:

   ```bash
   cp .env.example .env
   ```

3. Crea un'app in <https://developers.tiktok.com/>.

4. Nel portale TikTok configura il redirect URI:

   ```text
   http://localhost:3000/auth/tiktok/callback
   ```

5. Inserisci in `.env`:

   ```text
   TIKTOK_CLIENT_KEY=...
   TIKTOK_CLIENT_SECRET=...
   ```

6. Avvia l'app:

   ```bash
   npm start
   ```

7. Apri:

   ```text
   http://localhost:3000
   ```

8. Clicca `Collega TikTok` e completa l'autorizzazione nel browser.

### Pubblicazione da URL

La mini app usa `PULL_FROM_URL`: il video deve essere disponibile a un URL
pubblico HTTPS. Per alcune configurazioni TikTok richiede anche la verifica del
dominio sorgente nel Developer Portal.

### Script

```bash
npm start     # avvia l'app
npm run dev   # avvia con watch mode Node
npm run check # controlla la sintassi JS
```

### Sicurezza

Non committare mai `.env`, `.data/`, token OAuth, client secret o file di
credenziali. Questa mini app e' pensata per test/local development; prima di
usarla in produzione servono storage sicuro, HTTPS e gestione utenti.
