import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ClientType } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  clientTypeLabel,
  clientTypesOrdered,
  leadSourceLabel,
  pipelineStageLabel,
} from "@/lib/labels";

async function updateCustomer(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");

  await prisma.customer.updateMany({
    where: { id, organizationId: membership.organizationId },
    data: {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      clientType: (String(formData.get("clientType") || "B2C") as ClientType) || "B2C",
      preferredBrandId: String(formData.get("preferredBrandId") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  redirect(`/app/clienti/${id}`);
}

async function openNewPipeline(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const customerId = String(formData.get("customerId") || "");
  const pipelineName = String(formData.get("pipelineName") || "").trim();
  const brandId = String(formData.get("brandId") || "") || null;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: membership.organizationId },
  });
  if (!customer) redirect("/app/clienti");

  const lead = await prisma.lead.create({
    data: {
      organizationId: membership.organizationId,
      customerId: customer.id,
      brandId: brandId || customer.preferredBrandId,
      assigneeUserId: user.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      clientType: customer.clientType,
      pipelineName: pipelineName || `Nuova pipeline ${customer.lastName}`,
      source: "OTHER",
      sourceDetail: "Aperta da scheda cliente",
      pipelineStage: "NEW",
      intakeStatus: "RAW",
      interest: pipelineName || null,
      lastActivityAt: new Date(),
    },
  });

  redirect(`/app/crm/leads/${lead.id}`);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      preferredBrand: true,
      leads: {
        include: {
          brand: true,
          quotes: { select: { id: true, number: true, totalSell: true }, take: 1 },
        },
        orderBy: { lastActivityAt: "desc" },
      },
    },
  });
  if (!customer) notFound();

  const brands = await prisma.brand.findMany({
    where: { organizationId: membership.organizationId },
  });

  const openLeads = customer.leads.filter((l) => !["WON", "LOST"].includes(l.pipelineStage));
  const closedLeads = customer.leads.filter((l) => ["WON", "LOST"].includes(l.pipelineStage));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/clienti" className="text-sm text-teal-800/70">
          ← Anagrafiche
        </Link>
        <h1
          className="mt-2 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {customer.lastName} {customer.firstName}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
          <StatusPill>{clientTypeLabel[customer.clientType]}</StatusPill>
          {customer.preferredBrand ? (
            <StatusPill>{customer.preferredBrand.name}</StatusPill>
          ) : null}
          <span>{customer.email || customer.phone || "—"}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/crm?customerId=${customer.id}`}
          className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white"
        >
          Apri board pipeline cliente
        </Link>
        <Link
          href={`/app/crm?customerId=${customer.id}&clientType=${customer.clientType}`}
          className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
        >
          Board + filtro tipo
        </Link>
      </div>

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">
          Pipeline aperte ({openLeads.length})
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Un cliente può avere più trattative in parallelo. Aprine una nuova quando serve.
        </p>
        {openLeads.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">Nessuna pipeline aperta.</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {openLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/app/crm/leads/${lead.id}`}
                className="rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-800/25 hover:bg-teal-50/40"
              >
                <div className="font-medium text-[#0F3D3E]">
                  {lead.pipelineName || lead.interest || "Pipeline"}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <StatusPill>{pipelineStageLabel[lead.pipelineStage]}</StatusPill>
                  <StatusPill>{clientTypeLabel[lead.clientType]}</StatusPill>
                  {lead.brand ? <StatusPill>{lead.brand.name}</StatusPill> : null}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {leadSourceLabel[lead.source]} · {lead.paxCount} pax
                  {lead.quotes[0] ? ` · ${lead.quotes[0].number}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}

        <form action={openNewPipeline} className="mt-4 grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="customerId" value={customer.id} />
          <input
            name="pipelineName"
            required
            placeholder="Nome nuova pipeline (es. Cina settembre)"
            className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2"
          />
          <select name="brandId" className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Marchio…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-[#B33A2B] px-4 py-2 text-sm text-white sm:col-span-3 sm:w-fit">
            Apri nuova pipeline
          </button>
        </form>
      </section>

      {closedLeads.length > 0 ? (
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="font-semibold text-[#0F3D3E]">Chiuse ({closedLeads.length})</h2>
          <div className="mt-3 space-y-2">
            {closedLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/app/crm/leads/${lead.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span>{lead.pipelineName || lead.interest || lead.id.slice(0, 8)}</span>
                <StatusPill>{pipelineStageLabel[lead.pipelineStage]}</StatusPill>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-semibold text-[#0F3D3E]">Anagrafica</h2>
        <form action={updateCustomer} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={customer.id} />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Nome</span>
            <input
              name="firstName"
              defaultValue={customer.firstName}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Cognome</span>
            <input
              name="lastName"
              defaultValue={customer.lastName}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input
              name="email"
              defaultValue={customer.email || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Telefono</span>
            <input
              name="phone"
              defaultValue={customer.phone || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Tipo cliente</span>
            <select
              name="clientType"
              defaultValue={customer.clientType}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              {clientTypesOrdered.map((t) => (
                <option key={t} value={t}>
                  {clientTypeLabel[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Marchio preferito</span>
            <select
              name="preferredBrandId"
              defaultValue={customer.preferredBrandId || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">Note</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={customer.notes || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm text-white sm:w-fit">
            Salva anagrafica
          </button>
        </form>
      </section>
    </div>
  );
}
