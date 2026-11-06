import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function createQuote(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const title = String(formData.get("title") || "").trim();
  const channel = String(formData.get("channel") || "B2B") as
    | "WEB"
    | "B2B"
    | "COUNTER"
    | "LANDING"
    | "WHATSAPP"
    | "EMAIL"
    | "INSTAGRAM"
    | "FACEBOOK";
  const partnerId = String(formData.get("partnerId") || "") || null;
  const customerId = String(formData.get("customerId") || "") || null;
  const brandId = String(formData.get("brandId") || "") || null;
  const practiceId = String(formData.get("practiceId") || "") || null;
  const leadId = String(formData.get("leadId") || "") || null;
  const paxCount = Number(formData.get("paxCount") || 2);

  const count = await prisma.quote.count({ where: { organizationId: orgId } });
  const number = `QT-2026-${String(count + 1).padStart(4, "0")}`;

  const quote = await prisma.quote.create({
    data: {
      organizationId: orgId,
      brandId,
      partnerId,
      customerId,
      practiceId,
      leadId,
      number,
      title: title || `Preventivo ${number}`,
      channel,
      status: "DRAFT",
      pipelineStage: "QUOTING",
      paxCount,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      hypothesisNote:
        "Questa è un’ipotesi che costruiamo senza avere un budget. Se sembra troppo alta o troppo basica, ci adeguiamo.",
      notes:
        "Validità 7 giorni. Prima ipotesi di lavoro — non è un programma chiuso.",
    },
  });

  if (leadId) {
    await prisma.lead.updateMany({
      where: { id: leadId, organizationId: orgId },
      data: { pipelineStage: "QUOTING", lastActivityAt: new Date() },
    });
  }

  redirect(`/app/preventivi/${quote.id}`);
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const { leadId: prefillLeadId } = await searchParams;

  const [brands, partners, customers, practices, leads] = await Promise.all([
    prisma.brand.findMany({ where: { organizationId: orgId } }),
    prisma.agencyPartner.findMany({ where: { organizationId: orgId } }),
    prisma.customer.findMany({ where: { organizationId: orgId } }),
    prisma.practice.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.lead.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const selectedLead = prefillLeadId
    ? leads.find((l) => l.id === prefillLeadId)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/preventivi" className="text-sm text-teal-800/70">
          ← Preventivi
        </Link>
        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-teal-900/50">Vendita</div>
        <h1
          className="mt-1 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Nuovo preventivo
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Preferibile partire da un lead in{" "}
          <Link href="/app/crm" className="underline">
            Pipeline
          </Link>
          ; qui puoi anche creare a mano.
        </p>
      </div>

      <form action={createQuote} className="space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Titolo</span>
          <input
            name="title"
            required
            defaultValue={selectedLead?.interest || ""}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Lead CRM</span>
            <select
              name="leadId"
              defaultValue={prefillLeadId || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              <option value="">— senza lead —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lastName} {l.firstName} · {l.source}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Pax</span>
            <input
              name="paxCount"
              type="number"
              min={1}
              defaultValue={selectedLead?.paxCount || 2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Brand</span>
            <select
              name="brandId"
              defaultValue={selectedLead?.brandId || ""}
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
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Canale</span>
            <select name="channel" defaultValue="B2B" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="B2B">B2B</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="WEB">Sito</option>
              <option value="COUNTER">Banco</option>
              <option value="LANDING">Landing</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Partner</span>
            <select name="partnerId" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">—</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Cliente</span>
            <select
              name="customerId"
              defaultValue={selectedLead?.customerId || ""}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName} {c.firstName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Pratica collegata</span>
          <select name="practiceId" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            <option value="">—</option>
            {practices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.reference} — {p.title}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white">
          Crea e apri editor
        </button>
      </form>
    </div>
  );
}
