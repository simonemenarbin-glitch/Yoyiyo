"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ProductType } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  bookSupplierOffer,
  cancelSupplierBooking,
  ensureDefaultConnectors,
  quoteSupplierOffer,
  searchSupplierOffers,
} from "@/lib/suppliers/registry";

async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  return { orgId: membership.organizationId };
}

export type SandboxSearchState = {
  offers: Awaited<ReturnType<typeof searchSupplierOffers>>;
  query: string;
  connectorCode: string;
  error?: string;
};

export async function runSandboxSearch(
  _prev: SandboxSearchState | null,
  formData: FormData,
): Promise<SandboxSearchState> {
  const { orgId } = await requireOrg();
  await ensureDefaultConnectors(prisma, orgId);

  const query = String(formData.get("query") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const connectorCode = String(formData.get("connectorCode") || "").trim();
  const serviceType = String(formData.get("serviceType") || "") as ProductType | "";
  const checkInRaw = String(formData.get("checkIn") || "");
  const checkOutRaw = String(formData.get("checkOut") || "");
  const paxCount = Number(formData.get("paxCount") || 2) || 2;

  try {
    const offers = await searchSupplierOffers(prisma, {
      organizationId: orgId,
      query,
      city: city || undefined,
      connectorCode: connectorCode || undefined,
      serviceType: serviceType || "",
      checkIn: checkInRaw ? new Date(checkInRaw) : new Date("2026-09-10"),
      checkOut: checkOutRaw ? new Date(checkOutRaw) : new Date("2026-09-13"),
      paxCount,
    });
    return { offers, query, connectorCode };
  } catch (e) {
    return {
      offers: [],
      query,
      connectorCode,
      error: e instanceof Error ? e.message : "Errore ricerca",
    };
  }
}

export type SandboxActionState = {
  message: string;
  ok: boolean;
  detailJson?: string;
};

export async function runSandboxQuote(
  _prev: SandboxActionState | null,
  formData: FormData,
): Promise<SandboxActionState> {
  const { orgId } = await requireOrg();
  const connectorCode = String(formData.get("connectorCode") || "");
  const offerId = String(formData.get("offerId") || "");
  const result = await quoteSupplierOffer(prisma, orgId, connectorCode, offerId);
  if (!result) {
    return { ok: false, message: "Quote non supportata da questo connettore" };
  }
  revalidatePath("/app/fornitori");
  return {
    ok: result.status === "OK",
    message: `${result.status}: ${result.message || ""} · net ${result.netCost} → sell ${result.sellPrice}`,
    detailJson: JSON.stringify(result, null, 2),
  };
}

export async function runSandboxBook(
  _prev: SandboxActionState | null,
  formData: FormData,
): Promise<SandboxActionState> {
  const { orgId } = await requireOrg();
  const connectorCode = String(formData.get("connectorCode") || "");
  const offerId = String(formData.get("offerId") || "");
  const holderName = String(formData.get("holderName") || "Demo Holder").trim();
  const paxCount = Number(formData.get("paxCount") || 2) || 2;
  const result = await bookSupplierOffer(prisma, orgId, connectorCode, {
    offerId,
    holderName,
    paxCount,
  });
  if (!result) {
    return { ok: false, message: "Book non supportato" };
  }
  return {
    ok: result.status === "CONFIRMED",
    message: `${result.status} · ${result.bookingRef || "—"} · ${result.message || ""}`,
    detailJson: JSON.stringify(result, null, 2),
  };
}

export async function runSandboxCancel(
  _prev: SandboxActionState | null,
  formData: FormData,
): Promise<SandboxActionState> {
  const { orgId } = await requireOrg();
  const connectorCode = String(formData.get("connectorCode") || "");
  const bookingRef = String(formData.get("bookingRef") || "");
  const result = await cancelSupplierBooking(prisma, orgId, connectorCode, bookingRef);
  if (!result) {
    return { ok: false, message: "Cancel non supportato" };
  }
  return {
    ok: result.status === "CANCELLED" || result.status === "PENALTY",
    message: `${result.status} · ${result.bookingRef} · ${result.message || ""}`,
    detailJson: JSON.stringify(result, null, 2),
  };
}
