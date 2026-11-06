"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomCheckoutToken } from "@/lib/sales/tokens";

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "Ospite", lastName: parts.slice(1).join(" ") || "Web" };
}

/** Standalone public quote request page `/richiesta/[brandSlug]`. */
export async function submitPublicQuoteRequest(formData: FormData) {
  const brandSlug = String(formData.get("brandSlug") || "").trim();
  const brand = await prisma.brand.findFirst({
    where: { slug: brandSlug, status: "ACTIVE" },
  });
  if (!brand) redirect(`/richiesta/${brandSlug}?err=brand`);

  const { firstName, lastName } = splitName(String(formData.get("nome") || ""));
  const email = String(formData.get("email") || "").trim();
  if (!email) redirect(`/richiesta/${brandSlug}?err=email`);

  const paxCount = Number(formData.get("pax") || 2) || 2;
  const departureHint = String(formData.get("periodo") || "") || null;
  const destinations = String(formData.get("destinazioni") || "") || null;
  const message = String(formData.get("messaggio") || "") || null;
  const budgetHint = formData.get("budget") ? Number(formData.get("budget")) : null;
  const phone = String(formData.get("telefono") || "") || null;

  const lead = await prisma.lead.create({
    data: {
      organizationId: brand.organizationId,
      brandId: brand.id,
      firstName,
      lastName,
      email,
      phone,
      source: "WEB",
      sourceDetail: `richiesta pubblica /richiesta/${brand.slug}`,
      pipelineStage: "NEW",
      intakeStatus: departureHint ? "READY_TO_QUOTE" : "NEEDS_INFO",
      clientType: "B2C",
      pipelineName: destinations || `Richiesta ${brand.name}`,
      interest: [destinations, departureHint, message].filter(Boolean).join(" · ") || brand.name,
      paxCount,
      departureHint,
      budgetHint: budgetHint && !Number.isNaN(budgetHint) ? budgetHint : null,
      destinationsJson: destinations ? JSON.stringify(destinations.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) : null,
      rawSourceText: message,
      missingFieldsJson: JSON.stringify(!departureHint ? ["dates"] : []),
      notes: "Richiesta pubblica guest",
    },
  });

  const req = await prisma.publicQuoteRequest.create({
    data: {
      organizationId: brand.organizationId,
      brandId: brand.id,
      firstName,
      lastName,
      email,
      phone,
      paxCount,
      departureHint,
      destinations,
      message,
      budgetHint: budgetHint && !Number.isNaN(budgetHint) ? budgetHint : null,
      status: "NEW",
      leadId: lead.id,
    },
  });

  // Optional demo checkout offer for immediate guest path
  const checkout = await prisma.guestCheckout.create({
    data: {
      organizationId: brand.organizationId,
      brandId: brand.id,
      publicRequestId: req.id,
      token: randomCheckoutToken(),
      status: "DRAFT",
      guestEmail: email,
      guestName: `${firstName} ${lastName}`,
      paxCount,
      totalSell: 0,
      notes: "Checkout creato alla richiesta — totale da preventivo",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: brand.organizationId,
      action: "PUBLIC_QUOTE_REQUEST",
      entityType: "PublicQuoteRequest",
      entityId: req.id,
      metaJson: JSON.stringify({ leadId: lead.id, checkoutId: checkout.id }),
    },
  });

  redirect(`/richiesta/${brand.slug}?ok=1&checkout=${checkout.token}`);
}

/** Operator: open guest checkout link from a quote. */
export async function createCheckoutFromQuote(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const quoteId = String(formData.get("quoteId") || "");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: membership.organizationId },
    include: { customer: true, lead: true },
  });
  if (!quote) throw new Error("Preventivo non trovato");

  const guestEmail =
    quote.customer?.email || quote.lead?.email || String(formData.get("guestEmail") || "").trim();
  const guestName = quote.customer
    ? `${quote.customer.firstName} ${quote.customer.lastName}`
    : quote.lead
      ? `${quote.lead.firstName} ${quote.lead.lastName}`
      : String(formData.get("guestName") || "Ospite");

  if (!guestEmail) throw new Error("Email ospite mancante");

  const checkout = await prisma.guestCheckout.create({
    data: {
      organizationId: membership.organizationId,
      brandId: quote.brandId,
      quoteId: quote.id,
      token: randomCheckoutToken(),
      status: "PENDING_PAYMENT",
      guestEmail,
      guestName,
      paxCount: quote.paxCount,
      totalSell: quote.totalSell,
      currency: quote.currency,
      expiresAt: quote.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: `Checkout da preventivo ${quote.number}`,
    },
  });

  revalidatePath(`/app/preventivi/${quote.id}`);
  revalidatePath("/app/vendite-web");
  redirect(`/checkout/${checkout.token}`);
}

/** Guest demo pay — no real PSP. */
export async function completeGuestCheckoutDemo(formData: FormData) {
  const token = String(formData.get("token") || "");
  const checkout = await prisma.guestCheckout.findUnique({ where: { token } });
  if (!checkout || checkout.status === "CANCELLED" || checkout.status === "EXPIRED") {
    redirect(`/checkout/${token}?err=invalid`);
  }

  const paymentRef = `DEMO-${Date.now().toString(36).toUpperCase()}`;
  await prisma.guestCheckout.update({
    where: { id: checkout.id },
    data: {
      status: "PAID_DEMO",
      paymentRef,
      paidAt: new Date(),
    },
  });

  if (checkout.publicRequestId) {
    await prisma.publicQuoteRequest.update({
      where: { id: checkout.publicRequestId },
      data: { status: "CHECKED_OUT" },
    });
  }

  if (checkout.quoteId) {
    await prisma.quote.update({
      where: { id: checkout.quoteId },
      data: { status: "ACCEPTED", pipelineStage: "WON" },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: checkout.organizationId,
      action: "GUEST_CHECKOUT_PAID_DEMO",
      entityType: "GuestCheckout",
      entityId: checkout.id,
      metaJson: JSON.stringify({ paymentRef, demo: true }),
    },
  });

  redirect(`/checkout/${token}?paid=1`);
}
