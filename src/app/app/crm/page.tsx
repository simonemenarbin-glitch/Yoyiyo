import Link from "next/link";
import { redirect } from "next/navigation";
import type { ClientType, Prisma } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  clientTypeLabel,
  clientTypesOrdered,
  leadSourceLabel,
  pipelineStageLabel,
  pipelineStagesOrdered,
} from "@/lib/labels";
import { PageHeader, SoftDetails, btnPrimary, btnSecondary, fieldClass } from "@/components/ui";

export default async function CrmPipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const sp = await searchParams;

  const brandId = sp.brandId || "";
  const clientType = (sp.clientType || "") as ClientType | "";
  const customerId = sp.customerId || "";
  const partnerId = sp.partnerId || "";
  const q = (sp.q || "").trim();

  const where: Prisma.LeadWhereInput = { organizationId: orgId };
  if (brandId) where.brandId = brandId;
  if (clientType && clientTypesOrdered.includes(clientType as ClientType)) {
    where.clientType = clientType as ClientType;
  }
  if (customerId) where.customerId = customerId;
  if (partnerId) where.partnerId = partnerId;
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { interest: { contains: q } },
      { pipelineName: { contains: q } },
    ];
  }

  const [leads, brands, customers, partners] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        brand: true,
        customer: true,
        partner: true,
        quotes: { select: { id: true, number: true }, take: 1, orderBy: { updatedAt: "desc" } },
      },
      orderBy: { lastActivityAt: "desc" },
    }),
    prisma.brand.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { lastName: "asc" },
      include: { _count: { select: { leads: true } } },
    }),
    prisma.agencyPartner.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
  ]);

  const byStage = Object.fromEntries(
    pipelineStagesOrdered.map((s) => [s, leads.filter((l) => l.pipelineStage === s)]),
  ) as Record<(typeof pipelineStagesOrdered)[number], typeof leads>;

  const filterActive = Boolean(brandId || clientType || customerId || partnerId || q);
  const selectedCustomer = customerId
    ? customers.find((c) => c.id === customerId)
    : null;

  // Multi-pipeline per cliente: raggruppa lead aperti dello stesso cliente
  const openByCustomer = new Map<
    string,
    { label: string; customerId: string | null; items: typeof leads }
  >();
  for (const lead of leads.filter((l) => !["WON", "LOST"].includes(l.pipelineStage))) {
    const key = lead.customerId || `lead:${lead.id}`;
    const label = lead.customer
      ? `${lead.customer.lastName} ${lead.customer.firstName}`
      : `${lead.lastName} ${lead.firstName}`;
    const bucket = openByCustomer.get(key) || {
      label,
      customerId: lead.customerId,
      items: [],
    };
    bucket.items.push(lead);
    openByCustomer.set(key, bucket);
  }
  const multiPipelines = [...openByCustomer.values()].filter((b) => b.items.length > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="CRM"
        title={
          selectedCustomer
            ? `Pipeline · ${selectedCustomer.lastName} ${selectedCustomer.firstName}`
            : "Pipeline lead"
        }
        description="Filtra, apri un lead, invia risposte. Un cliente può avere più pipeline aperte."
        actions={
          <>
            <Link href="/app/crm/canali" className={btnPrimary}>
              Aggiorna canali
            </Link>
            <Link href="/app/crm/nuovo" className={btnSecondary}>
              Nuovo lead
            </Link>
            <Link href="/app/crm/intake" className={btnSecondary}>
              Incolla messaggio
            </Link>
          </>
        }
      />

      <form method="get" className="space-y-3 rounded-2xl border border-teal-900/10 bg-white/90 p-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Cerca</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome, email, interesse…"
            className={fieldClass}
          />
        </label>
        <SoftDetails summary="Filtri (tipo, brand, cliente, partner)" defaultOpen={filterActive}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Tipo cliente</span>
              <select name="clientType" defaultValue={clientType} className={fieldClass}>
                <option value="">Tutti</option>
                {clientTypesOrdered.map((t) => (
                  <option key={t} value={t}>
                    {clientTypeLabel[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Marchio</span>
              <select name="brandId" defaultValue={brandId} className={fieldClass}>
                <option value="">Tutti</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Cliente</span>
              <select name="customerId" defaultValue={customerId} className={fieldClass}>
                <option value="">Tutti</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.lastName} {c.firstName}
                    {c._count.leads ? ` (${c._count.leads})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Partner B2B</span>
              <select name="partnerId" defaultValue={partnerId} className={fieldClass}>
                <option value="">Tutti</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SoftDetails>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-semibold text-white">
            Applica
          </button>
          {filterActive ? (
            <Link
              href="/app/crm"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Reset
            </Link>
          ) : null}
          <span className="text-sm text-slate-500 sm:ml-auto">{leads.length} lead in vista</span>
        </div>
      </form>

      {multiPipelines.length > 0 ? (
        <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-[#0F3D3E]">Pipeline aperte per cliente</h2>
            <span className="text-xs text-slate-500">
              {multiPipelines.length} clienti · click per aprire la board filtrata
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {multiPipelines.slice(0, 12).map((bucket) => (
              <div
                key={bucket.customerId || bucket.label}
                className="rounded-xl border border-slate-100 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-[#0F3D3E]">{bucket.label}</div>
                    <div className="text-xs text-slate-500">
                      {bucket.items.length} pipeline aperte
                    </div>
                  </div>
                  {bucket.customerId ? (
                    <div className="flex flex-col gap-1 text-right">
                      <Link
                        href={`/app/crm?customerId=${bucket.customerId}`}
                        className="text-xs text-teal-800 underline"
                      >
                        Board
                      </Link>
                      <Link
                        href={`/app/clienti/${bucket.customerId}`}
                        className="text-xs text-teal-800 underline"
                      >
                        Scheda
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/app/crm/leads/${bucket.items[0].id}`}
                      className="text-xs text-teal-800 underline"
                    >
                      Apri
                    </Link>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {bucket.items.slice(0, 4).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/app/crm/leads/${lead.id}`}
                      className="block truncate text-xs text-slate-600 hover:text-[#0F3D3E]"
                    >
                      · {lead.pipelineName || lead.interest || leadSourceLabel[lead.source]}{" "}
                      <span className="text-slate-400">
                        ({pipelineStageLabel[lead.pipelineStage]})
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="rotta-scroll-x flex snap-x snap-mandatory gap-3 pb-2">
        {pipelineStagesOrdered.map((stage) => (
          <section
            key={stage}
            className="min-w-[85%] flex-1 snap-start rounded-2xl border border-teal-900/10 bg-white/70 p-3 sm:min-w-[240px]"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[#0F3D3E]">
                {pipelineStageLabel[stage]}
              </h2>
              <span className="rounded-full bg-[#0F3D3E]/10 px-2 py-0.5 text-xs text-[#0F3D3E]">
                {byStage[stage].length}
              </span>
            </div>
            <div className="space-y-2">
              {byStage[stage].map((lead) => (
                <Link
                  key={lead.id}
                  href={`/app/crm/leads/${lead.id}`}
                  className="block rounded-xl border border-slate-100 bg-white px-3 py-3 hover:border-teal-800/25 hover:bg-teal-50/50"
                >
                  <div className="font-medium text-slate-900">
                    {lead.lastName} {lead.firstName}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    <StatusPill>{clientTypeLabel[lead.clientType]}</StatusPill>
                    {lead.brand ? <StatusPill>{lead.brand.name}</StatusPill> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {leadSourceLabel[lead.source]} · {lead.paxCount} pax
                  </div>
                  {lead.pipelineName || lead.interest ? (
                    <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {lead.pipelineName || lead.interest}
                    </div>
                  ) : null}
                  {lead.customer ? (
                    <div className="mt-1 text-[11px] text-teal-800/80">
                      Cliente: {lead.customer.lastName}
                    </div>
                  ) : null}
                  {lead.quotes.length > 0 ? (
                    <div className="mt-2">
                      <StatusPill>{lead.quotes[0].number}</StatusPill>
                    </div>
                  ) : null}
                </Link>
              ))}
              {byStage[stage].length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  Vuoto
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
