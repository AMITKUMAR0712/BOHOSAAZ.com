import { bumpLiveVersion, type LiveScope } from "@/lib/live";

export async function bumpDashboardScopes(scopes: Array<LiveScope | null | undefined>) {
  const unique = new Map<string, LiveScope>();

  for (const scope of scopes) {
    if (!scope) continue;
    const key =
      scope.kind === "user"
        ? `user:${scope.userId}`
        : scope.kind === "vendor"
          ? `vendor:${scope.vendorId}`
          : scope.kind;
    unique.set(key, scope);
  }

  await Promise.allSettled(Array.from(unique.values()).map((scope) => bumpLiveVersion(scope)));
}
