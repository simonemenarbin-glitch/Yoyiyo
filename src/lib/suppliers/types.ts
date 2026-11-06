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
  notes?: string;
  raw?: Record<string, unknown>;
};

export type SupplierAdapter = {
  code: string;
  name: string;
  search(input: SupplierSearchInput, config?: Record<string, unknown>): Promise<SupplierOffer[]>;
};
