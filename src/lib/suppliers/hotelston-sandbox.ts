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
 * Hotelston-style hotel OTA sandbox (room-night inventory, board codes, cancel policies).
 * Distinct from Travio packages — hotel-only focus, lower markup (5%).
 */
type HotelRow = {
  hotelId: string;
  name: string;
  city: string;
  stars: number;
  room: string;
  board: string;
  netPerNight: number;
  roomsLeft: number;
  refundable: boolean;
  cancelHours: number;
  keywords: string[];
};

const HOTELS: HotelRow[] = [
  {
    hotelId: "HS-PEK-1001",
    name: "Holiday Inn Express Beijing Dongzhimen",
    city: "Pechino",
    stars: 3,
    room: "Standard Twin",
    board: "RO",
    netPerNight: 68,
    roomsLeft: 9,
    refundable: true,
    cancelHours: 24,
    keywords: ["pechino", "dongzhimen", "express", "hotel"],
  },
  {
    hotelId: "HS-PEK-2044",
    name: "Novotel Beijing Peace",
    city: "Pechino",
    stars: 4,
    room: "Superior DBL",
    board: "BB",
    netPerNight: 105,
    roomsLeft: 4,
    refundable: true,
    cancelHours: 48,
    keywords: ["pechino", "novotel", "peace", "hotel"],
  },
  {
    hotelId: "HS-SHA-330",
    name: "Hotel Indigo Shanghai on the Bund",
    city: "Shanghai",
    stars: 4,
    room: "City View King",
    board: "BB",
    netPerNight: 142,
    roomsLeft: 6,
    refundable: false,
    cancelHours: 0,
    keywords: ["shanghai", "bund", "indigo", "hotel"],
  },
  {
    hotelId: "HS-CTU-88",
    name: "Dorsett Chengdu",
    city: "Chengdu",
    stars: 4,
    room: "Deluxe Twin",
    board: "BB",
    netPerNight: 82,
    roomsLeft: 12,
    refundable: true,
    cancelHours: 24,
    keywords: ["chengdu", "dorsett", "hotel"],
  },
  {
    hotelId: "HS-XIY-12",
    name: "Grand Hyatt Xi'an",
    city: "Xi'an",
    stars: 5,
    room: "Grand Twin",
    board: "BB",
    netPerNight: 155,
    roomsLeft: 3,
    refundable: true,
    cancelHours: 72,
    keywords: ["xian", "hyatt", "hotel", "5stelle"],
  },
  {
    hotelId: "HS-CKG-7",
    name: "Somerset Yangtze River Chongqing",
    city: "Chongqing",
    stars: 4,
    room: "1BR Suite",
    board: "RO",
    netPerNight: 95,
    roomsLeft: 5,
    refundable: true,
    cancelHours: 24,
    keywords: ["chongqing", "somerset", "hotel"],
  },
];

export function createHotelstonSandboxAdapter(opts?: {
  code?: string;
  name?: string;
  markupPct?: number;
}): SupplierAdapter {
  const code = opts?.code || "hotelston";
  const name = opts?.name || "Hotelston (sandbox)";
  const markupPct = opts?.markupPct ?? 5;

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
      if (input.serviceType && input.serviceType !== "HOTEL") return [];
      const q = (input.query || "").trim().toLowerCase();
      const city = (input.city || "").trim().toLowerCase();
      const tokens = `${q} ${city}`.split(/[^a-zà-ü0-9']+/i).filter((t) => t.length > 1);
      const nights =
        input.checkIn && input.checkOut
          ? Math.max(
              1,
              Math.round(
                (input.checkOut.getTime() - input.checkIn.getTime()) / (24 * 60 * 60 * 1000),
              ),
            )
          : 1;

      return HOTELS.filter((h) => {
        if (!tokens.length) return true;
        const hay = `${h.name} ${h.city} ${h.hotelId} ${h.keywords.join(" ")}`.toLowerCase();
        return tokens.some((t) => hay.includes(t) || h.keywords.some((k) => k.includes(t)));
      }).map((h) => {
        const net = h.netPerNight * nights;
        return {
          offerId: `${code}:${h.hotelId}:${h.room.replace(/\s+/g, "_")}:${nights}`,
          connectorCode: code,
          connectorName: name,
          serviceType: "HOTEL" as ProductType,
          title: `${h.name} · ${h.room} · ${h.stars}★`,
          city: h.city,
          currency: "EUR",
          netCost: net,
          sellPrice: sellFromNet(net, markupPct),
          priceSource: "SUPPLIER_API" as const,
          supplierCode: "HOTELSTON",
          supplierRef: h.hotelId,
          board: h.board,
          refundable: h.refundable,
          availableUnits: h.roomsLeft,
          notes: `Sandbox Hotelston · ${h.board} · cancel ${h.cancelHours}h · ${nights} notti`,
          raw: {
            provider: "hotelston-sandbox",
            hotelId: h.hotelId,
            room: h.room,
            board: h.board,
            stars: h.stars,
            netPerNight: h.netPerNight,
            nights,
            cancelHours: h.cancelHours,
          },
        };
      });
    },
    async quote(offerId: string): Promise<SupplierQuoteResult> {
      const parts = offerId.split(":");
      const hotelId = parts[1];
      const nights = Number(parts[3] || 1) || 1;
      const h = HOTELS.find((x) => x.hotelId === hotelId);
      const now = new Date();
      if (!h || h.roomsLeft <= 0) {
        return {
          offerId,
          quotedAt: now,
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          netCost: 0,
          sellPrice: 0,
          currency: "EUR",
          status: "UNAVAILABLE",
          message: "Hotel/room non disponibile",
        };
      }
      const net = h.netPerNight * nights;
      return {
        offerId,
        quotedAt: now,
        expiresAt: new Date(now.getTime() + 20 * 60 * 1000),
        netCost: net,
        sellPrice: sellFromNet(net, markupPct),
        currency: "EUR",
        status: "OK",
        message: `Quote Hotelston sandbox · board ${h.board}`,
        raw: { hotelstonSession: `HSQ-${hotelId}` },
      };
    },
    async book(input: SupplierBookInput): Promise<SupplierBookResult> {
      const hotelId = input.offerId.split(":")[1];
      const h = HOTELS.find((x) => x.hotelId === hotelId);
      if (!h) {
        return { bookingRef: "", status: "REJECTED", message: "Hotel sconosciuto" };
      }
      if (h.roomsLeft < 1) {
        return { bookingRef: "", status: "ON_REQUEST", message: "Stop-sale — richiesta manuale" };
      }
      return {
        bookingRef: `HS-SBX-${Date.now().toString(36).toUpperCase()}`,
        status: "CONFIRMED",
        message: `Camera confermata sandbox per ${input.holderName}`,
        raw: { hotelId: h.hotelId, room: h.room, sandbox: true },
      };
    },
    async cancel(bookingRef: string): Promise<SupplierCancelResult> {
      if (!bookingRef.startsWith("HS-")) {
        return { bookingRef, status: "REJECTED", message: "Riferimento non Hotelston" };
      }
      return {
        bookingRef,
        status: "PENALTY",
        penaltyAmount: 0,
        message: "Cancellazione sandbox (in live dipenderebbe da cancelHours)",
      };
    },
  };
}
