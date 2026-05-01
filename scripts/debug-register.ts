import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Trying to create a test user...");
  try {
    const user = await prisma.user.create({
      data: {
        email: "debug-" + Date.now() + "@test.com",
        password: "password123",
        name: "Debug User",
        role: "USER"
      }
    });
    console.log("✅ User created:", user.id);
    
    // cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log("✅ User cleaned up");
  } catch (e) {
    console.error("❌ CREATE FAILED:", e);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
