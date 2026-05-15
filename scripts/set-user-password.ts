import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function usage(exitCode = 1) {
  // Intentionally do not echo passwords.
  console.log("Usage:");
  console.log("  npm run set-password -- <email> <newPassword>");
  console.log("  npm run set-password -- --email <email> --password <newPassword>");
  process.exit(exitCode);
}

function readArg(flag: string, argv: string[]) {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes("-h") || argv.includes("--help")) usage(0);

  const emailFromFlags = readArg("--email", argv);
  const passwordFromFlags = readArg("--password", argv);

  const email = (emailFromFlags ?? argv[0])?.trim().toLowerCase();
  const newPassword = passwordFromFlags ?? argv[1];

  if (!email || !newPassword) usage(1);

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new Error(`No user found for email: ${email}`);
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  });

  console.log(`✅ Password updated for ${user.email} (role: ${user.role})`);
}

main()
  .catch((err) => {
    console.error("❌ set-password failed:", err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
