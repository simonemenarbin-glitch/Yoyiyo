export type Formula = 'tour-pronti' | 'su-misura' | 'groupage'

export type Itinerary = {
  id: string
  title: string
  days: number
  cities: string[]
  blurb: string
  idealFor: string
  url: string
}

export type Destination = {
  name: string
  aliases: string[]
  pitch: string
}

export const BRAND = {
  name: 'Yoyiyo',
  legal: 'MTI SRL',
  seat: 'Via Bizzarri, 9 — Calderara di Reno (BO)',
  vat: 'P.IVA 04072721204',
  emailB2b: 'agenzieitalia@yoyiyo.biz',
  emailB2c: 'info@yoyiyo.it',
  whatsapp: '+39 379 240 7399',
  site: 'https://www.yoyiyo.biz',
  groups: 'https://cinaingruppo.it',
  webinar: 'https://calendar.app.google/AxghxV74wCNd2o6m8',
}

export const FORMULAS: Record<
  Formula,
  { label: string; question: string; summary: string; cta: string; link: string }
> = {
  'tour-pronti': {
    label: 'Tour pronti',
    question: 'Programma + prezzo già pronti, accompagnamento costante.',
    summary:
      'Circuito chiuso con listino confidenziale. Base 4 tutti i giorni · Base 2 solo sulle date in scheda. Ideale quando il cliente vuole qualcuno ogni giorno.',
    cta: 'Apri cinaingruppo.it',
    link: BRAND.groups,
  },
  'su-misura': {
    label: 'Su misura',
    question: 'Ritmo e prezzo suoi — semi-autonomo o autonomo.',
    summary:
      'Individuale quotato per davvero da 1–2 pax. Guida sulle giornate che contano, o quasi zero. Non è un SIC rinominato «flessibile».',
    cta: 'Scrivi a agenzieitalia@yoyiyo.biz',
    link: `mailto:${BRAND.emailB2b}`,
  },
  groupage: {
    label: 'Groupage',
    question: 'Nucleo amici/famiglia da 4+, rotta fuori catalogo.',
    summary:
      'Su misura condiviso, minimo 4. Si costruisce intorno al gruppo, non è un SIC da listino. Stesso desk italiano.',
    cta: 'Richiedi groupage',
    link: `mailto:${BRAND.emailB2b}?subject=Richiesta%20Groupage`,
  },
}

export const ITINERARIES: Itinerary[] = [
  {
    id: 'classico',
    title: 'Classico della Cina',
    days: 12,
    cities: ['Pechino', "Xi'an", 'Guilin', 'Longji', 'Yangshuo', 'Shanghai'],
    blurb: 'Le quattro mete iconiche — ideale per la prima volta.',
    idealFor: 'prima volta, classico, iconiche',
    url: 'https://www.yoyiyo.biz/itinerari/12-day-china-classic-tour.html',
  },
  {
    id: 'triangolo',
    title: "Triangolo d'oro",
    days: 8,
    cities: ['Pechino', "Xi'an", 'Shanghai'],
    blurb: "Il triangolo d'oro in una settimana.",
    idealFor: 'breve, settimana, prima volta short',
    url: 'https://www.yoyiyo.biz/itinerari/8-day-china-golden-triangle-tour.html',
  },
  {
    id: 'essenza-panda',
    title: 'Essenza Cina e panda',
    days: 14,
    cities: ['Pechino', "Xi'an", 'Chengdu', 'Leshan', 'Yangtze', 'Shanghai'],
    blurb: 'Storia imperiale, panda e crociera sul Yangtze.',
    idealFor: 'panda, chengdu, yangtze, crociera',
    url: 'https://www.yoyiyo.biz/itinerari/2-week-china-essence-and-panda-tour.html',
  },
  {
    id: 'naturali',
    title: 'Meraviglie naturali della Cina',
    days: 14,
    cities: ['Pechino', "Xi'an", 'Zhangjiajie', 'Guilin', 'Yangshuo', 'Shanghai'],
    blurb: 'Classico imperiale e natura spettacolare: Avatar, fiume Li, metropoli.',
    idealFor: 'zhangjiajie, avatar, natura, guilin',
    url: 'https://www.yoyiyo.biz/itinerari/14-day-china-natural-wonders-discovery.html',
  },
  {
    id: 'seta',
    title: 'Via della Seta fino a Kashgar',
    days: 12,
    cities: ["Xi'an", 'Xinjiang', 'Zhangye', 'Jiayuguan', 'Dunhuang', 'Turpan', 'Urumqi', 'Kashgar'],
    blurb: 'Deserto, bazar e montagne Danxia.',
    idealFor: 'seta, dunhuang, kashgar, deserto',
    url: 'https://www.yoyiyo.biz/itinerari/12-day-china-silk-road-tour-from-xi-an-to-kashga.html',
  },
  {
    id: 'yunnan',
    title: 'Yunnan e Chongqing',
    days: 11,
    cities: ['Kunming', 'Dali', 'Lijiang', 'Shangri-La', 'Chongqing'],
    blurb: 'Etnie del sud-ovest e gole spettacolari.',
    idealFor: 'yunnan, lijiang, shangri-la, etnie',
    url: 'https://www.yoyiyo.biz/itinerari/11-day-yunnan-and-chongqing-natural-tour.html',
  },
]

export const DESTINATIONS: Destination[] = [
  {
    name: 'Pechino',
    aliases: ['beijing', 'pechino', 'peking'],
    pitch:
      'Capitale imperiale e politica: Città Proibita, Muraglia, Hutong e la Cina moderna.',
  },
  {
    name: 'Shanghai',
    aliases: ['shanghai'],
    pitch: 'Metropoli del futuro sul Bund: grattacieli, concessioni storiche e vita cosmopolita.',
  },
  {
    name: "Xi'an",
    aliases: ['xian', "xi'an", 'xi an'],
    pitch: "Tredici dinastie e Esercito di Terracotta: il cuore della Cina antica.",
  },
  {
    name: 'Guilin',
    aliases: ['guilin', 'yangshuo'],
    pitch: 'Paesaggio carsico iconico: fiume Li, colline e campagna di Yangshuo.',
  },
  {
    name: 'Chengdu',
    aliases: ['chengdu', 'panda', 'sichuan'],
    pitch: 'Capitale del Sichuan: panda, hot pot, tè e ritmo lento.',
  },
  {
    name: 'Zhangjiajie',
    aliases: ['zhangjiajie', 'avatar'],
    pitch: 'Montagne Avatar, Porta del Cielo e parco forestale UNESCO.',
  },
  {
    name: 'Yunnan',
    aliases: ['yunnan', 'lijiang', 'dali', 'kunming'],
    pitch: 'La provincia più diversa: etnie, risaie e altopiani.',
  },
  {
    name: 'Tibet',
    aliases: ['tibet', 'lhasa'],
    pitch: 'Lhasa, monasteri e altopiano sacro — richiede acclimatamento e permesso.',
  },
]

export const FAQ = [
  {
    q: /visto|visa|ingresso[- ]free/i,
    a: 'Gli italiani possono entrare in Cina senza visto fino al 31/12/2026 per soggiorni fino a 30 giorni. Yoyiyo coordina pratica e itinerario in italiano.',
  },
  {
    q: /prezz|cost|budget|quanto/i,
    a: 'Ogni viaggio è su misura: preventivo gratuito in base a date, hotel e tappe. I prezzi indicativi sul sito sono senza voli intercontinentali; da catalogo con voli inclusi si può stimare circa 800 € in meno.',
  },
  {
    q: /prima volta|consigli|meglio/i,
    a: 'Per la prima volta in Cina consigliamo il Classico della Cina (12 giorni: Pechino, Xi’an, Guilin, Shanghai) o il Triangolo d’oro (8 giorni). Entrambi personalizzabili FIT.',
  },
  {
    q: /modific|personalizz|su misura/i,
    a: 'Sì. Ogni itinerario è una base di lavoro Yoyiyo: adattiamo date, ritmo, hotel, budget e tappe. Su misura = semi-autonomo o autonomo, non un SIC rinominato.',
  },
  {
    q: /lingua|italian|parl/i,
    a: 'Consulenza pre-viaggio, coordinamento in destinazione e hotline 24h sempre in italiano. Contratto europeo, sede a Bologna.',
  },
  {
    q: /gruppo|sic|partenz/i,
    a: 'Per Tour pronti con programma + prezzo (Base 4 / Base 2) usa cinaingruppo.it. Qui su yoyiyo.biz: Su misura e Groupage. Non forzare un SIC se il cliente vuole ritmo proprio.',
  },
]
