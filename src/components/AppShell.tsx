import Link from "next/link";
import { destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  CompactDesktopNav,
  DesktopNav,
  MobileBottomNav,
  MobileTopMenu,
} from "@/components/AppNav";
import { DemoBadge } from "@/components/ui";

export function AppShell({
  orgName,
  brandNames,
  userName,
  children,
}: {
  orgName: string;
  brandNames: string[];
  userName: string;
  children: React.ReactNode;
}) {
  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  const brandsJoined = brandNames.join(" · ");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e8f2f1,transparent_40%),linear-gradient(180deg,#f7f4ef_0%,#eef3f2_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-teal-900/10 bg-[#0F3D3E] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/app" className="min-w-0" title={`${orgName} — ${brandsJoined}`}>
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-teal-100/80 sm:text-xs">
                Rotta ERP
              </div>
              <DemoBadge />
            </div>
            <div className="truncate text-base font-semibold sm:text-lg" title={orgName}>
              {orgName}
            </div>
            <div
              className="hidden truncate text-xs text-teal-100/70 sm:block"
              title={brandsJoined}
            >
              {brandsJoined}
            </div>
          </Link>
          <DesktopNav />
          <CompactDesktopNav />
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="hidden text-teal-100/80 xl:inline" title={userName}>
              {userName}
            </span>
            <MobileTopMenu />
            <form action={logout}>
              <button className="min-h-10 rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:pb-10">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
