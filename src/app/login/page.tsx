import { redirect } from "next/navigation";
import { createSession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";
  await ensureDatabase();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      redirect("/login?error=1");
    }
    await createSession(user.id);
  } catch {
    redirect("/login?error=1");
  }
  redirect("/app");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await ensureDatabase();
  const user = await getCurrentUser();
  if (user) redirect("/app");
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#0F3D3E,#163f40_40%,#f4f1ea_40%)] px-6">
      <div className="w-full max-w-md rounded-3xl border border-teal-900/10 bg-white p-8 shadow-2xl shadow-teal-950/10">
        <div className="text-xs uppercase tracking-[0.22em] text-teal-800/60">Rotta ERP</div>
        <h1
          className="mt-2 text-3xl text-[#0F3D3E]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Accedi alla piattaforma
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Demo tenant: <strong>demo@rotta.erp</strong> / <strong>rotta-demo</strong>
        </p>

        {params.error ? (
          <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            Credenziali non valide.
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue="demo@rotta.erp"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-[#0F3D3E] focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Password</span>
            <input
              name="password"
              type="password"
              required
              defaultValue="rotta-demo"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-[#0F3D3E] focus:ring-2"
            />
          </label>
          <button className="w-full rounded-xl bg-[#0F3D3E] px-4 py-3 font-medium text-white hover:bg-[#124849]">
            Entra
          </button>
        </form>

        <Link href="/" className="mt-6 inline-block text-sm text-teal-800/70 hover:text-teal-900">
          ← Torna alla home
        </Link>
      </div>
    </div>
  );
}
