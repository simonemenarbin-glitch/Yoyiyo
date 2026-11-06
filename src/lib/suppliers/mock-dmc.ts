import type { ProductType } from "@prisma/client";
import { sellFromNet } from "./pricing";
import type { SupplierAdapter, SupplierOffer, SupplierSearchInput } from "./types";

type MockRow = {
  ref: string;
  type: ProductType;
  title: string;
  city: string;
  net: number;
  keywords: string[];
};

const CATALOG: MockRow[] = [
  {
    ref: "PEK-HID-BB",
    type: "HOTEL",
    title: "Holiday Inn Dongzhimen o similare · BB rimborsabile",
    city: "Pechino",
    net: 92,
    keywords: ["pechino", "beijing", "dongzhimen", "hotel", "hid"],
  },
  {
    ref: "PEK-MUT-FD",
    type: "EXCURSION",
    title: "Mutianyu + Città Proibita · guida IT full day",
    city: "Pechino",
    net: 180,
    keywords: ["pechino", "mutianyu", "guida", "muraglia"],
  },
  {
    ref: "XIY-HTL-BT",
    type: "HOTEL",
    title: "Holiday Inn Bell Tower o similare · BB",
    city: "Xi'an",
    net: 78,
    keywords: ["xian", "xi'an", "bell", "hotel"],
  },
  {
    ref: "XIY-TERRA",
    type: "EXCURSION",
    title: "Esercito di terracotta · guida IT",
    city: "Xi'an",
    net: 95,
    keywords: ["xian", "terracotta", "guida"],
  },
  {
    ref: "CTU-DOR",
    type: "HOTEL",
    title: "Dorsett Chengdu o similare · BB",
    city: "Chengdu",
    net: 88,
    keywords: ["chengdu", "dorsett", "hotel", "panda"],
  },
  {
    ref: "CTU-PANDA",
    type: "EXCURSION",
    title: "Base panda Chengdu · accompagnatore IT",
    city: "Chengdu",
    net: 70,
    keywords: ["chengdu", "panda", "accompagnatore"],
  },
  {
    ref: "CKG-SOM",
    type: "HOTEL",
    title: "Somerset Yangtze River o similare · BB",
    city: "Chongqing",
    net: 85,
    keywords: ["chongqing", "somerset", "hotel"],
  },
  {
    ref: "SHA-ETON",
    type: "HOTEL",
    title: "Eton Shanghai o similare · BB",
    city: "Shanghai",
    net: 110,
    keywords: ["shanghai", "eton", "bund", "hotel"],
  },
  {
    ref: "PEK-SHA-HSR",
    type: "OTHER",
    title: "Treno AV Pechino → Shanghai (2ª cl.) + transfer stazioni",
    city: "Pechino",
    net: 95,
    keywords: ["treno", "hsr", "pechino", "shanghai", "av"],
  },
  {
    ref: "CTU-ZJJ-HSR",
    type: "OTHER",
    title: "Treno AV Chengdu → Zhangjiajie + transfer",
    city: "Chengdu",
    net: 72,
    keywords: ["treno", "chengdu", "zhangjiajie", "av"],
  },
  {
    ref: "ZJJ-WUL",
    type: "EXCURSION",
    title: "Wulingyuan full day · accompagnatore IT",
    city: "Zhangjiajie",
    net: 120,
    keywords: ["zhangjiajie", "wulingyuan", "accompagnatore"],
  },
  {
    ref: "PKX-TRF",
    type: "TRANSFER",
    title: "Transfer aeroporto Pechino ↔ hotel",
    city: "Pechino",
    net: 45,
    keywords: ["transfer", "pechino", "aeroporto"],
  },
];

export function createMockDmcAdapter(opts?: {
  code?: string;
  name?: string;
  markupPct?: number;
}): SupplierAdapter {
  const code = opts?.code || "mock-dmc";
  const name = opts?.name || "Mock DMC Cina (demo API)";
  const markupPct = opts?.markupPct ?? 20;

  return {
    code,
    name,
    async search(input: SupplierSearchInput): Promise<SupplierOffer[]> {
      const q = (input.query || "").trim().toLowerCase();
      const city = (input.city || "").trim().toLowerCase();
      const tokens = `${q} ${city}`.split(/[^a-zà-ü0-9']+/i).filter((t) => t.length > 1);

      return CATALOG.filter((row) => {
        if (input.serviceType && row.type !== input.serviceType) return false;
        if (!tokens.length) return true;
        const hay = `${row.title} ${row.city} ${row.keywords.join(" ")}`.toLowerCase();
        return tokens.some((t) => hay.includes(t) || row.keywords.some((k) => k.includes(t)));
      })
        .slice(0, 25)
        .map((row) => {
          const net = row.net;
          const sell = sellFromNet(net, markupPct);
          return {
            offerId: `${code}:${row.ref}`,
            connectorCode: code,
            connectorName: name,
            serviceType: row.type,
            title: row.title,
            city: row.city,
            currency: "EUR",
            netCost: net,
            sellPrice: sell,
            priceSource: "SUPPLIER_API" as const,
            supplierCode: code.toUpperCase(),
            supplierRef: row.ref,
            notes: "Tariffa demo da connettore API — sostituibile con live quote fornitore",
            raw: { mock: true, ref: row.ref },
          };
        });
    },
  };
}
