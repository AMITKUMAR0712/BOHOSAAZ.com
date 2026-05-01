import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Testing DB connection...");
  try {
    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}`);
    
    const productCount = await prisma.product.count();
    console.log(`Product count: ${productCount}`);
    
    const wishlistCount = await prisma.wishlistItem.count();
    console.log(`Wishlist count: ${wishlistCount}`);
    
    console.log("DB connection OK!");
  } catch (error) {
    console.error("DB connection FAILED:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
