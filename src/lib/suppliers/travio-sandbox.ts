import type { ProductType } from "@prisma/client";
import { sellFromNet } from "./pricing";
import type {
  SupplierAdapter,
  SupplierBookInput,
  SupplierBookResult,
  SupplierCancelResult,
  SupplierOffer,
  SupplierQuoteResult,
  SupplierSearchInput,
} from "./types";

/**
 * Travio-style DMC/packages sandbox.
 * Response shape mirrors a typical Italian package wholesaler (hotel + tour codes).
 * No live credentials — deterministic demo catalog.
 */
type TravioRow = {
  code: string;
  type: ProductType;
  title: string;
  city: string;
  board: string;
  net: number;
  allotment: number;
  refundable: boolean;
  keywords: string[];
};

const TRAVIO_CATALOG: TravioRow[] = [
  {
    code: "TV-PEK-PKG01",
    type: "PACKAGE",
    title: "Pechino Classic 4gg / 3nn · guida IT",
    city: "Pechino",
    board: "BB",
    net: 410,
    allotment: 8,
    refundable: true,
    keywords: ["pechino", "package", "classic", "guida"],
  },
  {
    code: "TV-PEK-SHA",
    type: "PACKAGE",
    title: "Pechino + Shanghai 7nn · land only",
    city: "Pechino",
    board: "BB",
    net: 890,
    allotment: 5,
    refundable: false,
    keywords: ["pechino", "shanghai", "package", "land"],
  },
  {
    code: "TV-XIY-HTL",
    type: "HOTEL",
    title: "Xi'an Bell Tower area · DBL BB (Travio allot.)",
    city: "Xi'an",
    board: "BB",
    net: 72,
    allotment: 15,
    refundable: true,
    keywords: ["xian", "hotel", "bell"],
  },
  {
    code: "TV-CTU-PANDA",
    type: "EXCURSION",
    title: "Chengdu panda morning · private",
    city: "Chengdu",
    board: "—",
    net: 65,
    allotment: 20,
    refundable: true,
    keywords: ["chengdu", "panda", "excursion"],
  },
  {
    code: "TV-ZJJ-WUL",
    type: "PACKAGE",
    title: "Zhangjiajie Avatar 3nn · transfer+park",
    city: "Zhangjiajie",
    board: "BB",
    net: 520,
    allotment: 6,
    refundable: false,
    keywords: ["zhangjiajie", "avatar", "package", "wulingyuan"],
  },
  {
    code: "TV-PKX-TRF",
    type: "TRANSFER",
    title: "PKX/PEK private transfer sedan",
    city: "Pechino",
    board: "—",
    net: 48,
    allotment: 30,
    refundable: true,
    keywords: ["transfer", "pechino", "aeroporto", "pkx"],
  },
];

const quoteCache = new Map<string, SupplierQuoteResult>();

export function createTravioSandboxAdapter(opts?: {
  code?: string;
  name?: string;
  markupPct?: number;
}): SupplierAdapter {
  const code = opts?.code || "travio";
  const name = opts?.name || "Travio (sandbox)";
  const markupPct = opts?.markupPct ?? 18;

  return {
    code,
    name,
    capabilities: {
      search: true,
      quote: true,
      book: true,
      cancel: true,
      liveCredentialsRequired: true,
      sandbox: true,
    },
    async search(input: SupplierSearchInput): Promise<SupplierOffer[]> {
      const q = (input.query || "").trim().toLowerCase();
      const city = (input.city || "").trim().toLowerCase();
      const tokens = `${q} ${city}`.split(/[^a-zà-ü0-9']+/i).filter((t) => t.length > 1);

      return TRAVIO_CATALOG.filter((row) => {
        if (input.serviceType && row.type !== input.serviceType) return false;
        if (!tokens.length) return true;
        const hay = `${row.title} ${row.city} ${row.code} ${row.keywords.join(" ")}`.toLowerCase();
        return tokens.some((t) => hay.includes(t) || row.keywords.some((k) => k.includes(t)));
      }).map((row) => {
        // Travio-ish: packages priced per pax; hotels per room/night
        const pax = input.paxCount || 2;
        const nights =
          input.checkIn && input.checkOut
            ? Math.max(
                1,
                Math.round(
                  (input.checkOut.getTime() - input.checkIn.getTime()) / (24 * 60 * 60 * 1000),
                ),
              )
            : 1;
        let net = row.net;
        if (row.type === "HOTEL") net = row.net * nights;
        if (row.type === "PACKAGE" || row.type === "EXCURSION") net = row.net * Math.max(1, pax);
        const sell = sellFromNet(net, markupPct);
        return {
          offerId: `${code}:${row.code}:${nights}n:${pax}p`,
          connectorCode: code,
          connectorName: name,
          serviceType: row.type,
          title: row.title,
          city: row.city,
          currency: "EUR",
          netCost: net,
          sellPrice: sell,
          priceSource: "SUPPLIER_API" as const,
          supplierCode: "TRAVIO",
          supplierRef: row.code,
          board: row.board,
          refundable: row.refundable,
          availableUnits: row.allotment,
          notes: `Sandbox Travio · board ${row.board} · allot ${row.allotment}`,
          raw: {
            provider: "travio-sandbox",
            packageCode: row.code,
            board: row.board,
            allotment: row.allotment,
            nights,
            pax,
          },
        };
      });
    },
    async quote(offerId: string): Promise<SupplierQuoteResult> {
      const ref = offerId.split(":")[1];
      const row = TRAVIO_CATALOG.find((r) => r.code === ref);
      const now = new Date();
      if (!row || row.allotment <= 0) {
        return {
          offerId,
          quotedAt: now,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          netCost: 0,
          sellPrice: 0,
          currency: "EUR",
          status: "UNAVAILABLE",
          message: "Codice Travio non disponibile in sandbox",
        };
      }
      const net = row.net;
      const result: SupplierQuoteResult = {
        offerId,
        quotedAt: now,
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        netCost: net,
        sellPrice: sellFromNet(net, markupPct),
        currency: "EUR",
        status: "OK",
        message: "Quote sandbox valida 30 minuti",
        raw: { travioQuoteId: `TQ-${ref}-${now.getTime()}` },
      };
      quoteCache.set(offerId, result);
      return result;
    },
    async book(input: SupplierBookInput): Promise<SupplierBookResult> {
      const quoted = quoteCache.get(input.offerId);
      if (!quoted || quoted.status !== "OK") {
        // Auto-quote if missing
        const q = await this.quote!(input.offerId);
        if (q.status !== "OK") {
          return { bookingRef: "", status: "REJECTED", message: q.message };
        }
      }
      const ref = `TV-SBX-${Date.now().toString(36).toUpperCase()}`;
      return {
        bookingRef: ref,
        status: "CONFIRMED",
        message: `Prenotazione sandbox Travio per ${input.holderName}`,
        raw: { holderName: input.holderName, paxCount: input.paxCount, sandbox: true },
      };
    },
    async cancel(bookingRef: string): Promise<SupplierCancelResult> {
      if (!bookingRef.startsWith("TV-")) {
        return { bookingRef, status: "REJECTED", message: "Riferimento non Travio" };
      }
      return {
        bookingRef,
        status: "CANCELLED",
        penaltyAmount: 0,
        message: "Cancellazione sandbox senza penale (demo)",
      };
    },
  };
}
