import { PrismaClient } from "@prisma/client";
process.env.DATABASE_URL = "file:/tmp/rotta-boot.db";
const { ensureDatabase } = await import("../src/lib/bootstrap-db.ts");
await ensureDatabase();
const p = new PrismaClient();
const u = await p.user.findUnique({ where: { email: "demo@rotta.erp" } });
console.log("user", u?.email, u?.name);
await p.$disconnect();
