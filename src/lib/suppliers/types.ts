import type { ProductType } from "@prisma/client";

export type SupplierSearchInput = {
  organizationId: string;
  connectorCode?: string;
  query?: string;
  city?: string;
  serviceType?: ProductType | "";
  checkIn?: Date | null;
  checkOut?: Date | null;
  paxCount?: number;
  nationality?: string;
};

export type SupplierOffer = {
  offerId: string;
  connectorCode: string;
  connectorName: string;
  serviceType: ProductType;
  title: string;
  city?: string | null;
  currency: string;
  netCost: number;
  sellPrice: number;
  priceSource: "OWN_LIST" | "SUPPLIER_API" | "MANUAL";
  supplierCode: string;
  supplierRef: string;
  productId?: string | null;
  ratePlanId?: string | null;
  board?: string | null;
  refundable?: boolean;
  availableUnits?: number | null;
  notes?: string;
  raw?: Record<string, unknown>;
};

export type SupplierQuoteResult = {
  offerId: string;
  quotedAt: Date;
  expiresAt: Date;
  netCost: number;
  sellPrice: number;
  currency: string;
  status: "OK" | "UNAVAILABLE" | "ERROR";
  message?: string;
  raw?: Record<string, unknown>;
};

export type SupplierBookInput = {
  offerId: string;
  paxCount: number;
  holderName: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  reference?: string;
};

export type SupplierBookResult = {
  bookingRef: string;
  status: "CONFIRMED" | "ON_REQUEST" | "REJECTED";
  message?: string;
  raw?: Record<string, unknown>;
};

export type SupplierCancelResult = {
  bookingRef: string;
  status: "CANCELLED" | "PENALTY" | "REJECTED";
  penaltyAmount?: number;
  message?: string;
};

export type SupplierCapabilities = {
  search: boolean;
  quote: boolean;
  book: boolean;
  cancel: boolean;
  liveCredentialsRequired: boolean;
  sandbox: boolean;
};

export type SupplierAdapter = {
  code: string;
  name: string;
  capabilities: SupplierCapabilities;
  search(input: SupplierSearchInput, config?: Record<string, unknown>): Promise<SupplierOffer[]>;
  quote?(offerId: string, config?: Record<string, unknown>): Promise<SupplierQuoteResult>;
  book?(input: SupplierBookInput, config?: Record<string, unknown>): Promise<SupplierBookResult>;
  cancel?(bookingRef: string, config?: Record<string, unknown>): Promise<SupplierCancelResult>;
};
