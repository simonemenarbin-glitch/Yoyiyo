import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { PageHeader, SectionCard, btnDark, btnSecondary, fieldClass } from "@/components/ui";
import {
  createAgencyPartner,
  createPartnerNet,
  createPriceList,
  togglePartnerPortal,
} from "@/lib/actions/b2b";
import { partnerNetKindLabel } from "@/lib/labels";

export default async function B2BPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const [nets, partners, lists] = await Promise.all([
    prisma.partnerNet.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { partners: true, priceLists: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.agencyPartner.findMany({
      where: { organizationId: orgId },
      include: { net: true },
      orderBy: { name: "asc" },
    }),
    prisma.partnerPriceList.findMany({
      where: { organizationId: orgId },
      include: { net: true, partner: true, _count: { select: { lines: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network"
        title="B2B partner e listini"
        description="Reti differenziate, listini netti agenzia e portale promoter — stile Medusa network."
      />

      <SectionCard title="Reti / net" hint="STANDARD · PREFERRED · PROMOTER · WHITE_LABEL">
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 pr-3">Codice</th>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Comm. TO%</th>
                <th className="py-2 pr-3">Markup ag.%</th>
                <th className="py-2">Partner / listini</th>
              </tr>
            </thead>
            <tbody>
              {nets.map((n) => (
                <tr key={n.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs">{n.code}</td>
                  <td className="py-2 pr-3 font-medium">{n.name}</td>
                  <td className="py-2 pr-3">{partnerNetKindLabel[n.kind]}</td>
                  <td className="py-2 pr-3">{n.defaultCommissionPct}%</td>
                  <td className="py-2 pr-3">{n.defaultMarkupPct}%</td>
                  <td className="py-2">
                    {n._count.partners} partner · {n._count.priceLists} listini
                  </td>
                </tr>
              ))}
              {!nets.length ? (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-500">
                    Nessuna rete — crea NET-A / NET-B demo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form action={createPartnerNet} className="grid gap-2 md:grid-cols-4">
          <input name="code" placeholder="Codice (NET-A)" className={fieldClass} required />
          <input name="name" placeholder="Nome rete" className={fieldClass} required />
          <select name="kind" className={fieldClass} defaultValue="STANDARD">
            {Object.entries(partnerNetKindLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input name="defaultCommissionPct" type="number" defaultValue={12} placeholder="Comm TO %" className={fieldClass} />
          <input name="defaultMarkupPct" type="number" defaultValue={10} placeholder="Markup ag %" className={fieldClass} />
          <button className={btnDark}>Crea rete</button>
        </form>
      </SectionCard>

      <SectionCard title="Agenzie partner" hint="Abilita portale promoter con token /p/…">
        <div className="mb-4 space-y-3">
          {partners.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-[#0F3D3E]">{p.name}</div>
                <div className="text-sm text-slate-600">
                  {p.net ? `${p.net.code} · ` : ""}
                  {p.email || "—"} · comm. {p.commissionPct}%
                  {p.city ? ` · ${p.city}` : ""}
                </div>
                {p.portalEnabled && p.portalToken ? (
                  <Link
                    href={`/p/${p.portalToken}`}
                    className="text-xs font-medium text-teal-800 underline"
                    target="_blank"
                  >
                    Portale /p/{p.portalToken.slice(0, 12)}…
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">Portale off</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill>{p.portalEnabled ? "Portale ON" : "Portale OFF"}</StatusPill>
                <form action={togglePartnerPortal}>
                  <input type="hidden" name="partnerId" value={p.id} />
                  <button className={btnSecondary + " !min-h-9 !text-xs"}>
                    {p.portalEnabled ? "Disabilita" : "Abilita portale"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
        <form action={createAgencyPartner} className="grid gap-2 md:grid-cols-3">
          <input name="name" placeholder="Ragione sociale" className={fieldClass} required />
          <input name="email" type="email" placeholder="Email" className={fieldClass} />
          <input name="contactName" placeholder="Referente" className={fieldClass} />
          <select name="netId" className={fieldClass} defaultValue="">
            <option value="">Senza rete</option>
            {nets.map((n) => (
              <option key={n.id} value={n.id}>
                {n.code} — {n.name}
              </option>
            ))}
          </select>
          <input name="commissionPct" type="number" defaultValue={12} className={fieldClass} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="portalEnabled" value="1" defaultChecked /> Abilita portale
          </label>
          <button className={btnDark}>Aggiungi partner</button>
        </form>
      </SectionCard>

      <SectionCard title="Listini differenziati" hint="Per rete o per singola agenzia">
        <ul className="mb-4 space-y-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/app/b2b/listini/${l.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <span className="font-medium text-[#0F3D3E]">{l.name}</span>
                <span className="text-xs text-slate-500">
                  {l.net?.code || "—"} / {l.partner?.name || "tutti"} · {l._count.lines} voci
                </span>
              </Link>
            </li>
          ))}
          {!lists.length ? <li className="text-sm text-slate-500">Nessun listino.</li> : null}
        </ul>
        <form action={createPriceList} className="grid gap-2 md:grid-cols-3">
          <input name="name" placeholder="Nome listino" className={fieldClass} required />
          <select name="netId" className={fieldClass} defaultValue="">
            <option value="">Rete (opz.)</option>
            {nets.map((n) => (
              <option key={n.id} value={n.id}>
                {n.code}
              </option>
            ))}
          </select>
          <select name="partnerId" className={fieldClass} defaultValue="">
            <option value="">Partner (opz.)</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className={btnDark}>Nuovo listino</button>
        </form>
      </SectionCard>
    </div>
  );
}
