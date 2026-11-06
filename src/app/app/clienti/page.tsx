import Link from "next/link";
import { redirect } from "next/navigation";
import type { ClientType } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { clientTypeLabel, clientTypesOrdered } from "@/lib/labels";

async function createCustomer(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  const customer = await prisma.customer.create({
    data: {
      organizationId: membership.organizationId,
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      clientType: (String(formData.get("clientType") || "B2C") as ClientType) || "B2C",
      preferredBrandId: String(formData.get("preferredBrandId") || "") || null,
    },
  });
  redirect(`/app/clienti/${customer.id}`);
}

async function createPartner(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  await prisma.agencyPartner.create({
    data: {
      organizationId: membership.organizationId,
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "") || null,
      commissionPct: Number(formData.get("commissionPct") || 10),
    },
  });
  redirect("/app/clienti");
}

export default async function CrmPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const [customers, partners, brands] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId: orgId },
      include: {
        preferredBrand: true,
        _count: { select: { leads: true } },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.agencyPartner.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ where: { organizationId: orgId } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-teal-900/50">Anagrafiche</div>
          <h1
            className="mt-1 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Clienti e partner
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Dalla scheda cliente apri una o più pipeline. Filtri tipo/marchio sulla{" "}
            <Link href="/app/crm" className="underline">
              board CRM
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="text-lg font-semibold text-[#0F3D3E]">Clienti</h2>
          <form action={createCustomer} className="grid gap-2 sm:grid-cols-2">
            <input name="firstName" required placeholder="Nome" className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="lastName" required placeholder="Cognome" className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="email" placeholder="Email" className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="phone" placeholder="Telefono" className="rounded-xl border border-slate-200 px-3 py-2" />
            <select name="clientType" defaultValue="B2C" className="rounded-xl border border-slate-200 px-3 py-2">
              {clientTypesOrdered.map((t) => (
                <option key={t} value={t}>
                  {clientTypeLabel[t]}
                </option>
              ))}
            </select>
            <select name="preferredBrandId" className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="">Marchio preferito…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-[#0F3D3E] px-3 py-2 text-sm text-white sm:col-span-2 sm:w-fit">
              Aggiungi cliente
            </button>
          </form>
          <div className="divide-y divide-slate-100">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/app/clienti/${c.id}`}
                className="flex items-center justify-between py-3 text-sm hover:bg-teal-50/40"
              >
                <div>
                  <div className="font-medium">
                    {c.lastName} {c.firstName}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    <StatusPill>{clientTypeLabel[c.clientType]}</StatusPill>
                    {c.preferredBrand ? <StatusPill>{c.preferredBrand.name}</StatusPill> : null}
                  </div>
                  <div className="text-slate-500">{c.email || c.phone || "—"}</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {c._count.leads} pipeline
                  <div className="text-teal-800 underline">Apri</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-5">
          <h2 className="text-lg font-semibold text-[#0F3D3E]">Partner B2B</h2>
          <form action={createPartner} className="grid gap-2 sm:grid-cols-2">
            <input name="name" required placeholder="Ragione sociale" className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2" />
            <input name="email" placeholder="Email" className="rounded-xl border border-slate-200 px-3 py-2" />
            <input
              name="commissionPct"
              type="number"
              step="0.5"
              defaultValue={10}
              placeholder="Provvigione %"
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
            <button className="rounded-xl bg-[#0F3D3E] px-3 py-2 text-sm text-white sm:col-span-2 sm:w-fit">
              Aggiungi partner
            </button>
          </form>
          <div className="divide-y divide-slate-100">
            {partners.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-slate-500">{p.email || "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-slate-600">{p.commissionPct}%</div>
                  <Link
                    href={`/app/crm?partnerId=${p.id}&clientType=B2B`}
                    className="text-xs text-teal-800 underline"
                  >
                    Pipeline
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
