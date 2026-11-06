import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap-db";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabase();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = primaryMembership(user);
  if (!membership) redirect("/login");

  const brands = await prisma.brand.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      orgName={membership.organization.name}
      brandNames={brands.map((b) => b.name)}
      userName={user.name}
    >
      {children}
    </AppShell>
  );
}
