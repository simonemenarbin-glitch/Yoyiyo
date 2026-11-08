import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  cancelSocialPost,
  deleteSocialPost,
  publishSocialPostNow,
  runSocialDueQueue,
  upsertSocialPost,
} from "@/lib/actions/social";
import {
  SOCIAL_CONTENT_TYPES,
  SOCIAL_PLATFORMS,
  addDays,
  sameDay,
  socialContentTypeLabel,
  socialPlatformLabel,
  socialPostStatusLabel,
  startOfWeek,
} from "@/lib/social/platforms";
import { shortDate } from "@/lib/format";
import {
  EmptyHint,
  FlashOk,
  PageHeader,
  SectionCard,
  btnDark,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/ui";

export default async function SocialSchedulerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const sp = await searchParams;

  const weekOffset = Number(sp.week || 0) || 0;
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [brands, campaigns, posts] = await Promise.all([
    prisma.brand.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.socialPost.findMany({
      where: { organizationId: orgId },
      include: { brand: true, campaign: true },
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
      take: 200,
    }),
  ]);

  const weekPosts = posts.filter((p) => {
    const anchor = p.scheduledAt || p.publishedAt || p.createdAt;
    return anchor >= weekStart && anchor < weekEnd;
  });

  const defaultBrandId = brands[0]?.id || "";
  const localScheduledDefault = (() => {
    // Derivato da weekStart (già stabile per request) + 2h, non da Date.now() in render.
    const d = new Date(weekStart.getTime() + 2 * 3600_000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Social planner"
        description="Post e Stories su Meta (FB/IG), TikTok e LinkedIn — bozza, programma e pubblica in modalità demo."
        actions={
          <>
            <Link href="/app/landing" className={btnSecondary}>
              Landing
            </Link>
            <form action={runSocialDueQueue}>
              <input type="hidden" name="back" value="/app/social" />
              <button className={btnPrimary}>Pubblica scaduti</button>
            </form>
          </>
        }
      />

      {sp.saved ? <FlashOk>Salvato.</FlashOk> : null}
      {sp.published ? <FlashOk>Pubblicato (demo).</FlashOk> : null}
      {sp.queue_ok != null ? (
        <FlashOk>
          Coda: {sp.queue_ok} ok · {sp.queue_fail || 0} errori.
        </FlashOk>
      ) : null}
      {sp.err ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {sp.err}
        </div>
      ) : null}

      <SectionCard
        title="Calendario settimana"
        hint={`${shortDate(weekStart)} → ${shortDate(addDays(weekStart, 6))}`}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Link href={`/app/social?week=${weekOffset - 1}`} className={btnSecondary}>
            ← Prec
          </Link>
          <Link href="/app/social?week=0" className={btnSecondary}>
            Questa settimana
          </Link>
          <Link href={`/app/social?week=${weekOffset + 1}`} className={btnSecondary}>
            Succ →
          </Link>
        </div>
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((day) => {
            const items = weekPosts.filter((p) => {
              const anchor = p.scheduledAt || p.publishedAt || p.createdAt;
              return sameDay(anchor, day);
            });
            return (
              <div
                key={day.toISOString()}
                className="min-h-[120px] rounded-xl border border-teal-900/10 bg-slate-50/80 p-2"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {day.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" })}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {items.map((p) => (
                    <li key={p.id}>
                      <a
                        href={`#post-${p.id}`}
                        className="block rounded-lg border border-white bg-white px-2 py-1.5 text-[11px] shadow-sm hover:border-teal-800/30"
                      >
                        <div className="font-semibold text-[#0F3D3E]">
                          {socialPlatformLabel[p.platform]} · {socialContentTypeLabel[p.contentType]}
                        </div>
                        <div className="truncate text-slate-600">{p.title || p.body}</div>
                        <div className="text-slate-400">{socialPostStatusLabel[p.status]}</div>
                      </a>
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="text-[11px] text-slate-400">—</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <SectionCard title="Nuovo post / story" hint="Salva bozza o programma. La pubblicazione usa la modalità demo.">
          {brands.length === 0 ? (
            <EmptyHint>Crea prima un marchio.</EmptyHint>
          ) : (
            <form action={upsertSocialPost} className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Brand</span>
                <select name="brandId" defaultValue={defaultBrandId} className={fieldClass} required>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Piattaforma</span>
                <select name="platform" defaultValue="META_INSTAGRAM" className={fieldClass}>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {socialPlatformLabel[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Tipo</span>
                <select name="contentType" defaultValue="POST" className={fieldClass}>
                  {SOCIAL_CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {socialContentTypeLabel[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Campagna (opz.)</span>
                <select name="campaignId" defaultValue="" className={fieldClass}>
                  <option value="">— nessuna —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-700">Titolo interno</span>
                <input name="title" placeholder="es. Promo groupage marzo" className={fieldClass} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-700">Testo</span>
                <textarea
                  name="body"
                  rows={4}
                  required
                  placeholder="Copy del post o della story…"
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-700">Hashtag</span>
                <input name="hashtags" placeholder="#cina #yoyiyo #groupage" className={fieldClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Media URL (opz.)</span>
                <input name="mediaUrl" placeholder="https://…" className={fieldClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Link CTA (opz.)</span>
                <input name="linkUrl" placeholder="/s/yoyiyo/cina-classic" className={fieldClass} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-700">Programma per</span>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  defaultValue={localScheduledDefault}
                  className={fieldClass}
                />
              </label>
              <input type="hidden" name="mediaCaption" value="" />
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button name="intent" value="DRAFT" className={btnDark}>
                  Salva bozza
                </button>
                <button name="intent" value="SCHEDULED" className={btnPrimary}>
                  Programma
                </button>
              </div>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Coda contenuti" hint={`${posts.length} totali`}>
          {posts.length === 0 ? (
            <EmptyHint>Nessun contenuto. Crea un post o una story a sinistra.</EmptyHint>
          ) : (
            <ul className="max-h-[36rem] space-y-3 overflow-auto pr-1">
              {posts.map((p) => (
                <li
                  key={p.id}
                  id={`post-${p.id}`}
                  className={`rounded-2xl border px-4 py-3 ${
                    sp.focus === p.id ? "border-[#0F3D3E]/40 bg-[#0F3D3E]/5" : "border-teal-900/10 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        {p.brand.name} · {socialPlatformLabel[p.platform]} ·{" "}
                        {socialContentTypeLabel[p.contentType]}
                      </div>
                      <div className="mt-0.5 font-semibold text-[#0F3D3E]">
                        {p.title || p.body.slice(0, 60)}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.body}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <StatusPill>{socialPostStatusLabel[p.status]}</StatusPill>
                        {p.scheduledAt ? <span>⏱ {shortDate(p.scheduledAt)}</span> : null}
                        {p.publishedAt ? <span>✓ {shortDate(p.publishedAt)}</span> : null}
                        {p.providerPostId ? <span className="font-mono">{p.providerPostId}</span> : null}
                      </div>
                      {p.lastError ? (
                        <p className="mt-1 text-xs text-slate-500">{p.lastError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      {p.status === "DRAFT" || p.status === "SCHEDULED" || p.status === "FAILED" ? (
                        <form action={publishSocialPostNow}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className={btnPrimary}>Pubblica ora</button>
                        </form>
                      ) : null}
                      {p.status === "SCHEDULED" ? (
                        <form action={cancelSocialPost}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className={btnSecondary}>Annulla</button>
                        </form>
                      ) : null}
                      {p.status === "DRAFT" || p.status === "CANCELLED" || p.status === "FAILED" ? (
                        <form action={deleteSocialPost}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className={btnSecondary}>Elimina</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
