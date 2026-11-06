import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestSourceMessage } from "@/lib/actions/intake";
import { leadSourceLabel } from "@/lib/labels";

const SAMPLE = `From: Giulia Bianchi <giulia.bianchi@example.com>
Subject: Richiesta viaggio Cina

Buongiorno,
siamo in 2 e vorremmo una Cina di circa 12 giorni a settembre 2026,
con Pechino, Xi'an e Shanghai. Budget intorno a 2500 euro a persona land.
Grazie
Giulia Bianchi
+39 333 4455667`;

export default async function IntakePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const brands = await prisma.brand.findMany({
    where: { organizationId: membership.organizationId },
  });
  const sources = Object.keys(leadSourceLabel) as (keyof typeof leadSourceLabel)[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/app/crm" className="text-sm text-teal-800/70">
          ← Pipeline
        </Link>
        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-teal-900/50">CRM intake</div>
        <h1
          className="mt-1 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Leggi mail / messaggio
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Incolla il testo della mail, del WhatsApp o del DM. Il sistema estrae i dati del lead: se
          bastano, prepara un preventivo base da listino (e slot API fornitori); altrimenti propone
          una bozza di risposta da completare / rifinire con AI.
        </p>
      </div>

      <form
        action={ingestSourceMessage}
        className="space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Fonte</span>
            <select
              name="source"
              defaultValue="EMAIL"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {leadSourceLabel[s]}
                </option>
              ))}
            </select>
          </label>
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
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Dettaglio fonte</span>
          <input
            name="sourceDetail"
            placeholder="es. info@, wa business, DM Instagram"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Testo mail / messaggio</span>
          <textarea
            name="rawSourceText"
            required
            rows={14}
            defaultValue={SAMPLE}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-sans text-sm leading-relaxed"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="autoQuote" value="1" defaultChecked className="rounded" />
          Se i dati bastano, crea subito il preventivo base
        </label>
        <button className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white">
          Analizza e procedi
        </button>
      </form>
    </div>
  );
}
