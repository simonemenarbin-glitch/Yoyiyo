import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/lib/actions/crm";
import { leadSourceLabel } from "@/lib/labels";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const brands = await prisma.brand.findMany({
    where: { organizationId: membership.organizationId },
  });

  const sources = Object.keys(leadSourceLabel) as (keyof typeof leadSourceLabel)[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/crm" className="text-sm text-teal-800/70">
          ← Pipeline
        </Link>
        <h1
          className="mt-2 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Nuovo lead
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Ingresso da social, WhatsApp o mail — poi lo sposti in pipeline e apri il preventivo.
        </p>
      </div>

      <form action={createLead} className="space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Nome</span>
            <input name="firstName" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Cognome</span>
            <input name="lastName" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input name="email" type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Telefono / WhatsApp</span>
            <input name="phone" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Fonte</span>
            <select name="source" defaultValue="WHATSAPP" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              {sources.map((s) => (
                <option key={s} value={s}>
                  {leadSourceLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Dettaglio fonte</span>
            <input
              name="sourceDetail"
              placeholder="es. DM Instagram, casella info@"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        </div>
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
            <span className="mb-1 block text-slate-600">Pax</span>
            <input
              name="paxCount"
              type="number"
              min={1}
              defaultValue={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Interesse / itinerario</span>
          <input name="interest" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Budget hint (€, opzionale)</span>
          <input name="budgetHint" type="number" step="10" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Note</span>
          <textarea name="notes" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </label>
        <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white">
          Salva lead
        </button>
      </form>
    </div>
  );
}
