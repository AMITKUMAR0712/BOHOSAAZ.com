import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "admin@bohosaaz.com").trim().toLowerCase();
  const password = process.argv[3] || "Admin@1234";
  const name = process.argv[4] || "Admin";

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log(`✅ Existing user updated to admin: ${email}`);
    return;
  }

  const created = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`✅ Admin created: ${created.email} (${created.role})`);
}

main()
  .catch((err) => {
    console.error("❌ create-admin failed:", err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
