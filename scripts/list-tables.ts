import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`SHOW TABLES`);
  console.log("TABLES:", JSON.stringify(tables, null, 2));
}

main()
  .catch((err) => {
    console.error("❌ list-tables failed:", err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
