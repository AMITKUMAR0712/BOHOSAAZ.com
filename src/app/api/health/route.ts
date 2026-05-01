import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const start = Date.now();
    const result = await prisma.$queryRawUnsafe(`SELECT 1 as ok`);
    const end = Date.now();
    
    const tables = await prisma.$queryRawUnsafe(`SHOW TABLES`);
    
    return Response.json({
      status: "online",
      latency: `${end - start}ms`,
      db: result,
      tables: tables,
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
    });
  } catch (e: any) {
    return Response.json({
      status: "error",
      error: e.message,
      stack: e.stack,
      code: e.code,
    }, { status: 500 });
  }
}
