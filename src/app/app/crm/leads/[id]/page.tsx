import { redirect } from "next/navigation";

/** Legacy lead URL → vista Trattativa 360. */
export default async function LeadDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v != null && v !== "") qs.set(k, v);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/app/crm/trattative/${id}${suffix}`);
}
