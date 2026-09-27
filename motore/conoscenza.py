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
            "partecipanti. In casa il calendario è più preciso: su "
            "cinaingruppo.it la Base 2 parte in due solo sulle date teal, "
            "con una quota diversa dalla Base 4. La Base 4 chiede quattro "
            "persone quasi ogni giorno e una conferma almeno 45 giorni prima. "
            "Il groupage su yoyiyo.biz è un su misura condiviso, minimo 4, "
            "costruito su un nucleo di amici o famiglia. Soglia, sul tour "
            "pronto, resta solo dove la data non è teal e il cliente non si "
            "sposta. Lo decidi tu con V1 e V9."
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

# Pagine lette il 27 settembre 2026. La firma del verificatore non è questa lettura.
PAGINE = [
    {
        "nome": "Yoyiyo Partner",
        "url": "https://www.yoyiyo.biz/partner",
        "fatto": (
            "Licenza sotto MTI Srl per consulenti e creator, senza aprire "
            "un'agenzia. Sito personale, Travel Compositor, desk Cina "
            "(FIT, groupage, nozze). Fee d'ingresso zero, compenso sulla "
            "performance. La linea creator può essere proposta anche alle "
            "agenzie: la pagina parla di 2.500 contatti trade."
        ),
    },
    {
        "nome": "Tour pronti, cinaingruppo.it",
        "url": "https://www.cinaingruppo.it/",
        "fatto": (
            "Base 4: minimo 4, quasi ogni giorno, conferma almeno 45 giorni "
            "prima. Base 2: minimo 2, solo date teal, quota dedicata diversa "
            "dalla Base 4. Prezzo in pagina: consigliato al pubblico. Listino "
            "agenzie su richiesta."
        ),
    },
    {
        "nome": "Desk agenzie, yoyiyo.biz",
        "url": "https://www.yoyiyo.biz/",
        "fatto": (
            "Groupage: su misura condiviso, minimo 4, rotta fuori catalogo, "
            "costruito intorno a un nucleo di amici o famiglia. Su misura da "
            "1–2 persone. Le agenzie scrivono a agenzieitalia@yoyiyo.biz."
        ),
    },
    {
        "nome": "Partner hotel, yoyiyo.it",
        "url": "https://www.yoyiyo.it/hotel-e-servizi",
        "fatto": (
            "Incoming: hotel e aziende italiane delegano l'accoglienza dei "
            "clienti cinesi. Altro mestiere, fuori da questa soglia."
        ),
    },
]

# Domande che il verificatore si farebbe, risposte lette sulle pagine.
# «resta tua» = la pagina non basta, la riga in verifica resta vuota.
DOMANDE_SUE = [
    {
        "id": "S1",
        "voce": "Base 2 e Base 4 le vendo già. Sto ricostruendo il mio calendario?",
        "esito": "la pagina risponde",
        "risposta": (
            "Sul tour pronto, sì se il cliente può spostarsi su una data teal: "
            "lì si parte in due, con un'altra quota. Soglia sul tour pronto "
            "resta un caso solo: due o tre persone, data non teal, cliente che "
            "non sposta. In due frammenti si arriva a quattro, e quella data "
            "è già Base 4."
        ),
    },
    {
        "id": "S2",
        "voce": "Il groupage è già un su misura condiviso da quattro. Dov'è la differenza?",
        "esito": "la pagina risponde",
        "risposta": (
            "La pagina costruisce il groupage su un nucleo di amici o famiglia, "
            "una richiesta sola. Soglia metterebbe nello stesso viaggio due "
            "nuclei che non si conoscono, tenuti da due facce diverse. Quella "
            "frase, usata così, direbbe una cosa falsa. O si cambia la frase, "
            "o quel groupage resta una famiglia sola."
        ),
    },
    {
        "id": "S3",
        "voce": "I partner mi servono o mi complicano la promessa al cliente?",
        "esito": "la pagina risponde",
        "risposta": (
            "Servono come primo bacino. In pagina operano sotto la licenza MTI, "
            "senza partita IVA di agenzia: l'organizzatore scritto è uno. "
            "È più pulito di due agenzie concorrenti. Complicano l'altra frase "
            "della stessa pagina: il cliente compra il consulente, non un logo. "
            "Prima del blocco va detto che in viaggio possono esserci persone "
            "portate da un altro consulente, e che l'operativo sta al desk di Bologna."
        ),
    },
    {
        "id": "S4",
        "voce": "Travel Compositor c'è già. Costruisco un altro booking?",
        "esito": "la pagina risponde",
        "risposta": (
            "No. Sito, booking e AskIA sono nel pacchetto partner. Manca una "
            "riga sul desk: quante persone, quale settimana, quale tetto, "
            "tour pronto o rotta. Il motore somma. Tu firmi. Si prenota dopo, "
            "con gli strumenti che la pagina già elenca."
        ),
    },
    {
        "id": "S5",
        "voce": "Se due partner vedono il netto, vedono il listino confidenziale?",
        "esito": "la pagina risponde",
        "risposta": (
            "cinaingruppo pubblica il prezzo consigliato al pubblico e tiene "
            "il listino agenzie su richiesta. Ogni frammento mostra al suo "
            "titolare solo se il proprio tetto regge. Non mostra il netto "
            "dell'altro e non mostra il listino."
        ),
    },
    {
        "id": "S6",
        "voce": "Le 48 ore per vincolarsi rompono i 45 giorni di conferma?",
        "esito": "la pagina risponde",
        "risposta": (
            "Stanno dentro, non al posto. La pagina chiede la conferma almeno "
            "45 giorni prima; sotto quella soglia la disponibilità si "
            "riconferma, non è automatica. Le 48 ore sono il tempo in cui due "
            "frammenti si vincolano tra loro, prima di quella conferma."
        ),
    },
    {
        "id": "S7",
        "voce": "Il creator vende già al suo pubblico. Un posto residuo mi svuota la provvigione?",
        "esito": "la pagina risponde",
        "risposta": (
            "La pagina ha già due uscite sulla stessa linea: l'audience del "
            "creator e le agenzie. Un posto rimasto vuoto, se mai si apre, "
            "passa dal partner che ha portato le persone, al prezzo minimo "
            "scritto prima. Un prezzo pubblico più basso taglia il motivo per "
            "cui il partner è entrato."
        ),
    },
    {
        "id": "S8",
        "voce": "Quante volte al mese resto con due o tre persone su una data non teal, o con un groupage da due che ne chiede quattro?",
        "esito": "resta tua",
        "risposta": (
            "La pagina non lo dice. Se la risposta vera è «sposto il cliente "
            "sul teal, oppure gli faccio il su misura», Soglia su questo "
            "corridoio si chiude. È la V1, e resta vuota finché non la scrivi."
        ),
    },
    {
        "id": "S9",
        "voce": "La pagina partner degli hotel, su yoyiyo.it, c'entra con questa soglia?",
        "esito": "la pagina risponde",
        "risposta": (
            "No. È incoming: strutture italiane che delegano l'accoglienza "
            "dei clienti cinesi. Non deposita frammenti verso la Cina."
        ),
    },
    {
        "id": "S10",
        "voce": "Allora la pagina Yoyiyo Partner mi è utile?",
        "esito": "la pagina risponde",
        "risposta": (
            "Sì, come casa del pilota: licenza, desk, persone, booking. "
            "No, come prova che la somma di due gruppi incompleti esista già. "
            "In pagina quella somma non c'è."
        ),
    },
]

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
