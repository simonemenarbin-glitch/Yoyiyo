# Soglia — ciclo 1

Motore: questo deposito. Verificatore: Simone.
Ricerca dei vicini: 27 settembre 2026. Il motore non certifica che un'idea sia assente dal mondo intero. Certifica cosa ha trovato, e si ferma dove serve la tua firma.

## Cosa fai tu

Apri `verifica/ciclo-001.md`, compila le risposte che sai già, e rilancia `python3 -m motore`.
Finché V1, V2, V3, V4, V6 e V9 non tengono l'idea in vita, non si costruisce una piattaforma.

## L'idea

**Soglia.** Più agenzie depositano un frammento: quanti passeggeri hanno già, in quale settimana, sotto quale tetto di costo. Il motore somma solo i frammenti compatibili. Il verificatore firma il preventivo del fornitore. Se dopo la firma la somma resta sopra il minimo, la partenza nasce. Prima di quella firma la partenza non c'è, e il fornitore non viene pagato.

Fase uno: solo agenzie. Il cliente finale entra dopo, sulla stessa soglia già confermata, con una regola di prezzo scritta prima.

Il primo corridoio è quello in cui controlli un preventivo vero. Se è il corridoio dei gruppi che già tratti con le agenzie italiane, la verifica cade su documenti che sai leggere. Lo stesso protocollo vale su un altro corridoio il giorno in cui un altro verificatore firma lì. All'inizio la firma è la tua.

## I passi

1. L'agenzia deposita un frammento: corridoio, settimana, numero di persone, tetto di netto a persona. Zero euro.
2. Il motore accosta solo i frammenti con lo stesso corridoio e la stessa settimana, e calcola il tetto comune: il più basso tra i tetti dichiarati.
3. Se la somma è sotto il minimo, non nasce nulla. Il motore dice quante persone mancano.
4. Se la somma sta tra minimo e massimo, il motore prepara un foglio di soglia e si ferma.
5. Il verificatore controlla cinque cose: preventivo vero, minimo e release scritti, acconti a campione senza mostrare i nomi alle altre agenzie, netto sotto ogni tetto, nome dell'organizzatore.
6. Se il netto firmato sta sotto il tetto comune, ogni agenzia ha 48 ore per vincolare il proprio frammento.
7. Se alla fine delle 48 ore la somma è ancora almeno il minimo, la partenza nasce e il fornitore può essere pagato. Se la somma scende sotto il minimo, la soglia muore e il fornitore non riceve un pagamento.

## Il foglio che firmeresti

Su una soglia proposta il foglio porta: corridoio, settimana, minimo, massimo, elenco dei frammenti (agenzia e numero, non i nomi), tetto comune, netto che tu hai verificato, scadenza delle 48 ore, nome dell'organizzatore, prezzo minimo verso il pubblico (in fase uno: assente).

Senza la riga dell'organizzatore il foglio non è firmabile.

## Esempio di calcolo

Ipotesi, non un preventivo. Minimo 10, massimo 16. Numeri inventati per mostrare il calcolo. Il netto vero lo scrivi tu dopo il preventivo. Il tetto comune è il più basso: 1.250. Un preventivo a 1.260 farebbe uscire l'agenzia B e la somma tornerebbe sotto il minimo.

- Cina classica, 8 giorni, 2026-W42: 11 persone, tetto comune 1250, stato `proposta`. Frammenti: A 4 pax tetto 1300, B 3 pax tetto 1250, C 4 pax tetto 1400.
- Giappone, 2026-W42: 6 persone, tetto comune 2000, stato `sotto_soglia`, ne mancano 4. Frammenti: D 6 pax tetto 2000.

Il Giappone con 6 persone resta sotto soglia e non viene mescolato alla Cina: settimana uguale, corridoio diverso.

## Cosa risulta già in commercio

- **adivaha, marketplace di partenze fisse.** Un operatore carica posti che ha già comprato. Le agenzie li vendono. Ci sono regole di release e di scadenza. https://www.adivaha.com/series-fares-fixed-departure-market-place.html
- **Bókun Allocation Manager.** Chi possiede i posti li tiene per i canali migliori e rilascia gli invenduti quando la partenza si avvicina. https://www.bokun.io/sell/allocation-manager
- **TourKnife.** Software di un tour operator per progettare, vendere e operare le proprie partenze fisse, anche verso agenzie. https://www.tourknife.com/group-travel-software/
- **Kaptio Circle.** Registro di un tour operator per capacità, allotment e partenze fisse di gruppo. https://www.kaptio.com/travel-platform/circle
- **SoloPoolD.** I viaggiatori singoli entrano in un pool anonimo per ottenere una tariffa gruppo in hotel. La prenotazione si conferma anche se il pool non si riempie, perché l'inventario è già preso. https://www.solopoold.com/how-it-works/
- **Pindrop Travel.** Un'agenzia pubblica un viaggio e le persone di quel gruppo pagano ciascuna la propria quota, con un link. https://pindroptravel.com/
- **DMC Quote.** Portale all'ingrosso. Verifica che chi compra sia un'agenzia, così le tariffe nette restano nette. https://dmcquote.com/b2b-travel-portal
- **archètravel, rete agenzie.** Catalogo già costruito, venduto alle agenzie, con partenze garantite anche con due partecipanti. https://www.archetravel.com/agenzie/
- **Aretina Tour Operator.** Partenze garantite con minimo due persone, in Oriente e Sud America, a prezzo invariato. https://www.aretinatours.com/tour-di-gruppo-partenze-garantite/

La frase che puoi verificare: in questi prodotti la partenza, o l'inventario, esiste prima della domanda sparsa delle agenzie. In Soglia l'ordine è inverso. La partenza nasce dalla somma, dopo la tua firma.

## Giri già fatti

### 1. L'unità di scambio è un posto che un operatore ha già comprato e non riesce a vendere?

Esito: Chiuso.

Quel commercio c'è già: adivaha, Bókun, TourKnife, Kaptio. Soglia tratta un'altra unità: passeggeri che un'agenzia ha già, in numero troppo basso per il minimo del fornitore, su una partenza che ancora non esiste.

### 2. L'unità è un viaggiatore singolo che vuole il prezzo del gruppo?

Esito: Chiuso.

SoloPoolD fa pool anonimi di singoli per tariffe hotel, e conferma la prenotazione anche a pool incompleto. Qui si parte solo se la somma dei frammenti raggiunge il minimo firmato.

### 3. Basta abbassare il minimo a due persone e tenere lo stesso prezzo?

Esito: Aperto, dipende dal corridoio.

archètravel e Aretina vendono già partenze garantite con due partecipanti. Dove il fornitore accetta quel minimo, Soglia non aggiunge nulla. Soglia ha senso dove il minimo resta alto: guida, mezzo, allotment, regole del gruppo. Lo decidi tu con V9.

### 4. Le agenzie concorrenti accetteranno di mostrare i clienti?

Esito: Aperto.

Il frammento porta un conteggio, una settimana, un corridoio e un tetto di costo. Niente nomi, niente prezzo di vendita. Ogni agenzia tiene il proprio cliente e il proprio prezzo al pubblico. I nomi arrivano solo al verificatore, dopo il blocco, perché il fornitore ha bisogno della lista. Le altre agenzie vedono «Agenzia 3 ha confermato 4 persone». Se mi dici che nemmeno questo passa, l'idea muore (V2).

### 5. Chi risponde del pacchetto verso il viaggiatore?

Esito: Bloccato sul verificatore.

Il motore non sceglie l'organizzatore. La Direttiva (UE) 2015/2302, recepita in Italia dal D.Lgs. 62/2018, aggancia obblighi precisi a chi combina e vende il pacchetto. Sul foglio di soglia il nome dell'organizzatore va scritto prima del blocco. Senza quella riga il motore non fa avanzare il pilota (V4).

### 6. Il primo passo è un software?

Esito: Chiuso.

Il primo pilota è un foglio e una telefonata al fornitore. La somma dei frammenti è già nel motore, ed è volutamente piccola. Una piattaforma si costruisce solo dopo che le tue risposte tengono l'idea in vita.

### 7. Come entra il cliente finale senza svuotare le agenzie?

Esito: Regola scritta, vendita ancora chiusa.

Il B2C apre solo su una soglia già confermata dalle agenzie, solo sui posti tra il numero già bloccato e il massimo, e solo a un prezzo minimo scritto nel foglio prima che le agenzie aderiscano. In fase uno quel canale resta spento.

### 8. Come scala, se la firma è tua e tu sei uno?

Esito: Chiuso come principio.

Il collo di bottiglia è l'ora del verificatore, non il calcolo. Si scala replicando il verificatore per corridoio. Il motore resta uno. Tu, all'inizio, firmi i gruppi del corridoio che conosci. Più avanti controlli a campione le firme degli altri, non ogni preventivo.

## Cosa la fa morire

- Le agenzie non dichiarano nemmeno un conteggio senza nomi (V2 = no).
- Il fornitore non mette un preventivo fermo, anche solo per poche decine di ore, su un gruppo non ancora chiuso (V3 = no).
- Nessuno accetta di essere l'organizzatore del pacchetto (V4 senza un nome).
- Su quel corridoio il fornitore parte già con due persone allo stesso prezzo (V9 = si).
- Hai già visto un circuito, anche informale, che somma i passeggeri di agenzie concorrenti tenendo i clienti separati (V6 = si): l'unicità cade e questo giro si rifà.
- La situazione «ho pochi passeggeri e non parto» nel tuo mercato è rara (V1 = 0).

## Scala

Si parte da un corridoio, un verificatore, fogli veri. Il motore somma e tiene il conto delle domande. Quando un corridoio chiude soglie ogni settimana, si aggiunge un secondo verificatore su un altro corridoio. Tu passi dal firmare ogni preventivo al controllare un campione di firme.

Il B2C non è un secondo prodotto. È la stessa soglia, a posti residui, dopo la conferma delle agenzie. Se mi dici che le agenzie lo vivrebbero come uno sgarbo, quel canale resta spento e il B2B continua.

## Domande aperte

- **V1.** Nel lavoro che vedi tu, quante volte al mese un'agenzia resta con un gruppo troppo piccolo per il minimo del fornitore e la partenza non si fa? Scrivi un numero, anche approssimato.
- **V2.** Le agenzie con cui parli dichiarerebbero «4 persone, questo corridoio, questa settimana, tetto di netto X», senza nomi e senza il prezzo a cui vendono al cliente?
- **V3.** Un fornitore con cui lavori mette un preventivo vincolante, anche solo per 48 o 72 ore, su un gruppo che ancora non hai chiuso?
- **V4.** Chi deve risultare organizzatore del pacchetto quando la soglia si chiude? Scrivi: yoyiyo, dmc, agenzia, oppure non-so.
- **V5.** Il margine che già ti resta su un gruppo, come operatore, copre il tempo di una verifica come questa?
- **V6.** Conosci un prodotto, anche una chat o un network, che somma già i passeggeri di agenzie concorrenti sullo stesso gruppo e tiene i clienti separati?
- **V7.** Se, a gruppo già confermato, i posti ancora vuoti fino al massimo andassero al pubblico a un prezzo minimo scritto prima, le agenzie lo leggerebbero come uno sgarbo?
- **V8.** Riesci a controllare, a campione e senza passare i nomi alle altre agenzie, che dietro un frammento ci sia già un acconto vero?
- **V9.** I fornitori con cui lavori accettano di partire con due persone allo stesso prezzo di un gruppo pieno? Scrivi: si, no, oppure solo-alcune-mete.
