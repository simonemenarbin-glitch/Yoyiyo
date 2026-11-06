import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "rotta_session";
const SESSION_DAYS = 14;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const token = sha256(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return raw;
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.deleteMany({ where: { token: sha256(raw) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  try {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value;
    if (!raw) return null;

    const session = await prisma.session.findUnique({
      where: { token: sha256(raw) },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function primaryMembership(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || user.memberships.length === 0) return null;
  return user.memberships[0];
}
