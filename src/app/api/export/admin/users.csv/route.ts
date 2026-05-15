import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { Role, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const role = (url.searchParams.get("role") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();

  const where: Prisma.UserWhereInput = {};
  if (role && role !== "ALL") {
    if ((Object.values(Role) as string[]).includes(role)) {
      where.role = role as Role;
    }
  }
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { email: { contains: q } },
      { name: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isBlocked: true,
      blockedReason: true,
      blockedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const headers = [
    "userId",
    "email",
    "name",
    "phone",
    "role",
    "isBlocked",
    "blockedReason",
    "blockedAt",
    "createdAt",
    "updatedAt",
  ];

  const rows = users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: u.name || "",
    phone: u.phone || "",
    role: u.role,
    isBlocked: u.isBlocked ? "true" : "false",
    blockedReason: u.blockedReason || "",
    blockedAt: u.blockedAt ? formatIsoDateTime(u.blockedAt) : "",
    createdAt: formatIsoDateTime(u.createdAt),
    updatedAt: formatIsoDateTime(u.updatedAt),
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_Users_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
