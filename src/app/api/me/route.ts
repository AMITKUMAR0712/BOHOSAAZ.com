import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ user: user ?? null });
  } catch (e: any) {
    return Response.json({ error: "Internal server error", debug: e.message }, { status: 500 });
  }
}
