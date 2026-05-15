import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const data = { user: user ?? null };
    return new Response(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Internal server error", debug: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
