import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const usersRaw = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBlocked: true,
      blockedReason: true,
      blockedAt: true,
      tokenVersion: true,
      createdAt: true,
      vendor: { select: { id: true, status: true, shopName: true } },
    },
  });

  const users = usersRaw.map((u) => ({
    ...u,
    blockedAt: u.blockedAt ? u.blockedAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersClient initialUsers={users} />;
}
