import { kv } from "@/lib/redis";

export type LiveScope =
  | { kind: "user"; userId: string }
  | { kind: "vendor"; vendorId: string }
  | { kind: "admin" }
  | { kind: "global" };

function keyForScope(scope: LiveScope) {
  switch (scope.kind) {
    case "user":
      return `live:user:${scope.userId}:v`;
    case "vendor":
      return `live:vendor:${scope.vendorId}:v`;
    case "admin":
      return "live:admin:v";
    case "global":
      return "live:global:v";
  }
}

export async function bumpLiveVersion(scope: LiveScope) {
  const key = keyForScope(scope);
  await kv.incr(key);
}

export async function getLiveVersion(scope: LiveScope): Promise<number> {
  const key = keyForScope(scope);
  const v = await kv.get(key);
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}
