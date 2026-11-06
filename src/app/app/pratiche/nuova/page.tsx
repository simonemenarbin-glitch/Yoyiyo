import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function createPractice(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const title = String(formData.get("title") || "").trim();
  const paxCount = Number(formData.get("paxCount") || 1);
  const channel = String(formData.get("channel") || "B2B") as
    | "WEB"
    | "B2B"
    | "COUNTER"
    | "LANDING"
    | "WHATSAPP";
  const partnerId = String(formData.get("partnerId") || "") || null;
  const customerId = String(formData.get("customerId") || "") || null;
  const brandId = String(formData.get("brandId") || "") || null;
  const departureDate = String(formData.get("departureDate") || "");
  const returnDate = String(formData.get("returnDate") || "");

  const count = await prisma.practice.count({ where: { organizationId: orgId } });
  const reference = `PRA-2026-${String(count + 1).padStart(4, "0")}`;

  const practice = await prisma.practice.create({
    data: {
      organizationId: orgId,
      brandId,
      partnerId,
      customerId,
      reference,
      title: title || `Pratica ${reference}`,
      channel,
      paxCount,
      departureDate: departureDate ? new Date(departureDate) : null,
      returnDate: returnDate ? new Date(returnDate) : null,
      status: "DRAFT",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "CREATE",
      entityType: "Practice",
      entityId: practice.id,
    },
  });

  redirect(`/app/pratiche/${practice.id}`);
}

export default async function NewPracticePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const [brands, partners, customers] = await Promise.all([
    prisma.brand.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.agencyPartner.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { organizationId: orgId }, orderBy: { lastName: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-teal-900/50">Pratiche</div>
        <h1
          className="mt-1 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Nuova pratica
        </h1>
      </div>

      <form action={createPractice} className="space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Titolo</span>
          <input name="title" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Cina Classic 12gg" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Brand</span>
            <select name="brandId" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
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
              <option value="WEB">Sito</option>
              <option value="COUNTER">Banco</option>
              <option value="LANDING">Landing</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Partner B2B</span>
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
            <select name="customerId" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">—</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName} {c.firstName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Pax</span>
            <input name="paxCount" type="number" min={1} defaultValue={2} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Partenza</span>
            <input name="departureDate" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Rientro</span>
            <input name="returnDate" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
        </div>
        <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white">
          Crea pratica
        </button>
      </form>
    </div>
  );
}
