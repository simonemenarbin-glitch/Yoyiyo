import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { upsertBrand } from "@/lib/actions/brand";
import { computeBrandMetrics } from "@/lib/brand/metrics";
import { eur } from "@/lib/format";
import {
  PageHeader,
  SoftDetails,
  btnDark,
  fieldClass,
} from "@/components/ui";
import { brandStatusLabel } from "@/lib/labels";

export default async function BrandsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const brands = await prisma.brand.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { leads: true, campaigns: true, sites: true } },
    },
    orderBy: { name: "asc" },
  });

  const cards = await Promise.all(
    brands.map(async (b) => ({
      brand: b,
      metrics: await computeBrandMetrics(b.id, orgId),
    })),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Growth"
        title="Marchi"
        description="Scegli un brand: vedi i numeri, lancia campagne e crea landing. Tutto collegato a lead e preventivi."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ brand, metrics }) => (
          <Link
            key={brand.id}
            href={`/app/marchi/${brand.id}`}
            className="rounded-2xl border border-teal-900/10 bg-white/90 p-4 shadow-sm transition active:scale-[0.99] hover:border-teal-800/25 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="h-2 w-10 rounded-full"
                  style={{ background: brand.primaryColor }}
                />
                <h2 className="mt-2 truncate text-lg font-semibold text-[#0F3D3E]">
                  {brand.name}
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {brand.tagline || brand.slug}
                </p>
              </div>
              <StatusPill>{brandStatusLabel[brand.status]}</StatusPill>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-slate-50 px-2 py-3">
                <div className="text-lg font-semibold text-[#0F3D3E]">{metrics.leadsTotal}</div>
                <div className="text-xs text-slate-500">lead</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-3">
                <div className="text-lg font-semibold text-[#0F3D3E]">
                  {eur(metrics.pipelineValue)}
                </div>
                <div className="text-xs text-slate-500">pipeline</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-3">
                <div className="text-lg font-semibold text-[#0F3D3E]">
                  {brand._count.sites}
                </div>
                <div className="text-xs text-slate-500">siti</div>
              </div>
            </div>
            <div className="mt-3 text-sm font-semibold text-[#B33A2B]">Apri brand →</div>
          </Link>
        ))}
      </div>

      <SoftDetails summary="Aggiungi un nuovo marchio">
        <form action={upsertBrand} className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Nome brand" className={fieldClass} />
          <input name="slug" placeholder="slug-url (opzionale)" className={fieldClass} />
          <input name="tagline" placeholder="Tagline breve" className={`${fieldClass} sm:col-span-2`} />
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            Colore primario
            <input name="primaryColor" type="color" defaultValue="#0F3D3E" />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            Colore secondario
            <input name="secondaryColor" type="color" defaultValue="#B33A2B" />
          </label>
          <button className={`${btnDark} sm:col-span-2 sm:w-fit`}>Crea marchio</button>
        </form>
      </SoftDetails>
    </div>
  );
}
