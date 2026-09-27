"""Ciò che il motore sostiene, e ciò che ha trovato già in commercio.

Le cifre dell'esempio sono un'ipotesi di lavoro, non un preventivo.
"""

from __future__ import annotations

DATA_RICERCA = "27 settembre 2026"

IDEA = {
    "nome": "Soglia",
    "frase": (
        "Più agenzie depositano un frammento: quanti passeggeri hanno già, "
        "in quale settimana, sotto quale tetto di costo. Il motore somma solo "
        "i frammenti compatibili. Il verificatore firma il preventivo del "
        "fornitore. Se dopo la firma la somma resta sopra il minimo, la "
        "partenza nasce. Prima di quella firma la partenza non c'è, e il "
        "fornitore non viene pagato."
    ),
}

# Unità di scambio. Il motore rifiuta di trattare altro.
UNITA = "frammento di passeggeri già in mano a un'agenzia, inutile da solo"

VICINI = [
    {
        "nome": "adivaha, marketplace di partenze fisse",
        "url": "https://www.adivaha.com/series-fares-fixed-departure-market-place.html",
        "fatto": (
            "Un operatore carica posti che ha già comprato. Le agenzie li vendono. "
            "Ci sono regole di release e di scadenza."
        ),
    },
    {
        "nome": "Bókun Allocation Manager",
        "url": "https://www.bokun.io/sell/allocation-manager",
        "fatto": (
            "Chi possiede i posti li tiene per i canali migliori e rilascia "
            "gli invenduti quando la partenza si avvicina."
        ),
    },
    {
        "nome": "TourKnife",
        "url": "https://www.tourknife.com/group-travel-software/",
        "fatto": (
            "Software di un tour operator per progettare, vendere e operare "
            "le proprie partenze fisse, anche verso agenzie."
        ),
    },
    {
        "nome": "Kaptio Circle",
        "url": "https://www.kaptio.com/travel-platform/circle",
        "fatto": (
            "Registro di un tour operator per capacità, allotment e partenze "
            "fisse di gruppo."
        ),
    },
    {
        "nome": "SoloPoolD",
        "url": "https://www.solopoold.com/how-it-works/",
        "fatto": (
            "I viaggiatori singoli entrano in un pool anonimo per ottenere "
            "una tariffa gruppo in hotel. La prenotazione si conferma anche "
            "se il pool non si riempie, perché l'inventario è già preso."
        ),
    },
    {
        "nome": "Pindrop Travel",
        "url": "https://pindroptravel.com/",
        "fatto": (
            "Un'agenzia pubblica un viaggio e le persone di quel gruppo pagano "
            "ciascuna la propria quota, con un link."
        ),
    },
    {
        "nome": "DMC Quote",
        "url": "https://dmcquote.com/b2b-travel-portal",
        "fatto": (
            "Portale all'ingrosso. Verifica che chi compra sia un'agenzia, "
            "così le tariffe nette restano nette."
        ),
    },
    {
        "nome": "archètravel, rete agenzie",
        "url": "https://www.archetravel.com/agenzie/",
        "fatto": (
            "Catalogo già costruito, venduto alle agenzie, con partenze "
            "garantite anche con due partecipanti."
        ),
    },
    {
        "nome": "Aretina Tour Operator",
        "url": "https://www.aretinatours.com/tour-di-gruppo-partenze-garantite/",
        "fatto": (
            "Partenze garantite con minimo due persone, in Oriente e Sud America, "
            "a prezzo invariato."
        ),
    },
]

GIRI = [
    {
        "domanda": "L'unità di scambio è un posto che un operatore ha già comprato e non riesce a vendere?",
        "esito": "Chiuso.",
        "risposta": (
            "Quel commercio c'è già: adivaha, Bókun, TourKnife, Kaptio. "
            "Soglia tratta un'altra unità: passeggeri che un'agenzia ha già, "
            "in numero troppo basso per il minimo del fornitore, su una "
            "partenza che ancora non esiste."
        ),
    },
    {
        "domanda": "L'unità è un viaggiatore singolo che vuole il prezzo del gruppo?",
        "esito": "Chiuso.",
        "risposta": (
            "SoloPoolD fa pool anonimi di singoli per tariffe hotel, e conferma "
            "la prenotazione anche a pool incompleto. Qui si parte solo se la "
            "somma dei frammenti raggiunge il minimo firmato."
        ),
    },
    {
        "domanda": "Basta abbassare il minimo a due persone e tenere lo stesso prezzo?",
        "esito": "Aperto, dipende dal corridoio.",
        "risposta": (
            "archètravel e Aretina vendono già partenze garantite con due "
            "partecipanti. Dove il fornitore accetta quel minimo, Soglia non "
            "aggiunge nulla. Soglia ha senso dove il minimo resta alto: guida, "
            "mezzo, allotment, regole del gruppo. Lo decidi tu con V9."
        ),
    },
    {
        "domanda": "Le agenzie concorrenti accetteranno di mostrare i clienti?",
        "esito": "Aperto.",
        "risposta": (
            "Il frammento porta un conteggio, una settimana, un corridoio e un "
            "tetto di costo. Niente nomi, niente prezzo di vendita. Ogni "
            "agenzia tiene il proprio cliente e il proprio prezzo al pubblico. "
            "I nomi arrivano solo al verificatore, dopo il blocco, perché il "
            "fornitore ha bisogno della lista. Le altre agenzie vedono "
            "«Agenzia 3 ha confermato 4 persone». Se mi dici che nemmeno "
            "questo passa, l'idea muore (V2)."
        ),
    },
    {
        "domanda": "Chi risponde del pacchetto verso il viaggiatore?",
        "esito": "Bloccato sul verificatore.",
        "risposta": (
            "Il motore non sceglie l'organizzatore. La Direttiva (UE) 2015/2302, "
            "recepita in Italia dal D.Lgs. 62/2018, aggancia obblighi precisi "
            "a chi combina e vende il pacchetto. Sul foglio di soglia il nome "
            "dell'organizzatore va scritto prima del blocco. Senza quella "
            "riga il motore non fa avanzare il pilota (V4)."
        ),
    },
    {
        "domanda": "Il primo passo è un software?",
        "esito": "Chiuso.",
        "risposta": (
            "Il primo pilota è un foglio e una telefonata al fornitore. "
            "La somma dei frammenti è già nel motore, ed è volutamente piccola. "
            "Una piattaforma si costruisce solo dopo che le tue risposte "
            "tengono l'idea in vita."
        ),
    },
    {
        "domanda": "Come entra il cliente finale senza svuotare le agenzie?",
        "esito": "Regola scritta, vendita ancora chiusa.",
        "risposta": (
            "Il B2C apre solo su una soglia già confermata dalle agenzie, "
            "solo sui posti tra il numero già bloccato e il massimo, e solo "
            "a un prezzo minimo scritto nel foglio prima che le agenzie "
            "aderiscano. In fase uno quel canale resta spento."
        ),
    },
    {
        "domanda": "Come scala, se la firma è tua e tu sei uno?",
        "esito": "Chiuso come principio.",
        "risposta": (
            "Il collo di bottiglia è l'ora del verificatore, non il calcolo. "
            "Si scala replicando il verificatore per corridoio. Il motore "
            "resta uno. Tu, all'inizio, firmi i gruppi del corridoio che "
            "conosci. Più avanti controlli a campione le firme degli altri, "
            "non ogni preventivo."
        ),
    },
]

PASSI = [
    "L'agenzia deposita un frammento: corridoio, settimana, numero di persone, tetto di netto a persona. Zero euro.",
    "Il motore accosta solo i frammenti con lo stesso corridoio e la stessa settimana, e calcola il tetto comune: il più basso tra i tetti dichiarati.",
    "Se la somma è sotto il minimo, non nasce nulla. Il motore dice quante persone mancano.",
    "Se la somma sta tra minimo e massimo, il motore prepara un foglio di soglia e si ferma.",
    "Il verificatore controlla cinque cose: preventivo vero, minimo e release scritti, acconti a campione senza mostrare i nomi alle altre agenzie, netto sotto ogni tetto, nome dell'organizzatore.",
    "Se il netto firmato sta sotto il tetto comune, ogni agenzia ha 48 ore per vincolare il proprio frammento.",
    "Se alla fine delle 48 ore la somma è ancora almeno il minimo, la partenza nasce e il fornitore può essere pagato. Se la somma scende sotto il minimo, la soglia muore e il fornitore non riceve un pagamento.",
]

MORTE = [
    "Le agenzie non dichiarano nemmeno un conteggio senza nomi (V2 = no).",
    "Il fornitore non mette un preventivo fermo, anche solo per poche decine di ore, su un gruppo non ancora chiuso (V3 = no).",
    "Nessuno accetta di essere l'organizzatore del pacchetto (V4 senza un nome).",
    "Su quel corridoio il fornitore parte già con due persone allo stesso prezzo (V9 = si).",
    "Hai già visto un circuito, anche informale, che somma i passeggeri di agenzie concorrenti tenendo i clienti separati (V6 = si): l'unicità cade e questo giro si rifà.",
    "La situazione «ho pochi passeggeri e non parto» nel tuo mercato è rara (V1 = 0).",
]

DOMANDE = [
    {
        "id": "V1",
        "testo": (
            "Nel lavoro che vedi tu, quante volte al mese un'agenzia resta "
            "con un gruppo troppo piccolo per il minimo del fornitore e la "
            "partenza non si fa? Scrivi un numero, anche approssimato."
        ),
        "tipo": "numero",
    },
    {
        "id": "V2",
        "testo": (
            "Le agenzie con cui parli dichiarerebbero «4 persone, questo "
            "corridoio, questa settimana, tetto di netto X», senza nomi e "
            "senza il prezzo a cui vendono al cliente?"
        ),
        "tipo": "si-no",
    },
    {
        "id": "V3",
        "testo": (
            "Un fornitore con cui lavori mette un preventivo vincolante, "
            "anche solo per 48 o 72 ore, su un gruppo che ancora non hai chiuso?"
        ),
        "tipo": "si-no",
    },
    {
        "id": "V4",
        "testo": (
            "Chi deve risultare organizzatore del pacchetto quando la soglia "
            "si chiude? Scrivi: yoyiyo, dmc, agenzia, oppure non-so."
        ),
        "tipo": "organizzatore",
    },
    {
        "id": "V5",
        "testo": (
            "Il margine che già ti resta su un gruppo, come operatore, copre "
            "il tempo di una verifica come questa?"
        ),
        "tipo": "si-no",
    },
    {
        "id": "V6",
        "testo": (
            "Conosci un prodotto, anche una chat o un network, che somma già "
            "i passeggeri di agenzie concorrenti sullo stesso gruppo e tiene "
            "i clienti separati?"
        ),
        "tipo": "si-no",
    },
    {
        "id": "V7",
        "testo": (
            "Se, a gruppo già confermato, i posti ancora vuoti fino al massimo "
            "andassero al pubblico a un prezzo minimo scritto prima, le "
            "agenzie lo leggerebbero come uno sgarbo?"
        ),
        "tipo": "si-no",
    },
    {
        "id": "V8",
        "testo": (
            "Riesci a controllare, a campione e senza passare i nomi alle "
            "altre agenzie, che dietro un frammento ci sia già un acconto vero?"
        ),
        "tipo": "si-no",
    },
    {
        "id": "V9",
        "testo": (
            "I fornitori con cui lavori accettano di partire con due persone "
            "allo stesso prezzo di un gruppo pieno? Scrivi: si, no, oppure "
            "solo-alcune-mete."
        ),
        "tipo": "minimo",
    },
]

# Obbligatorie per dichiarare il pilota vivo.
OBBLIGATORIE = ("V1", "V2", "V3", "V4", "V6", "V9")

ESEMPIO = {
    "corridoio": "Cina classica, 8 giorni",
    "settimana": "2026-W42",
    "minimo": 10,
    "massimo": 16,
    "frammenti": [
        {"agenzia": "A", "pax": 4, "tetto": 1300},
        {"agenzia": "B", "pax": 3, "tetto": 1250},
        {"agenzia": "C", "pax": 4, "tetto": 1400},
    ],
    "nota": (
        "Numeri inventati per mostrare il calcolo. Il netto vero lo scrivi "
        "tu dopo il preventivo. Il tetto comune è il più basso: 1.250. "
        "Un preventivo a 1.260 farebbe uscire l'agenzia B e la somma "
        "tornerebbe sotto il minimo."
    ),
}
