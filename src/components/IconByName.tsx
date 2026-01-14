import * as React from "react";
import { Tag, icons, type LucideProps } from "lucide-react";

export default function IconByName({
  name,
  fallback = true,
  ...props
}: { name?: string | null; fallback?: boolean } & LucideProps) {
  const Icon = name ? (icons as Record<string, React.ComponentType<LucideProps>>)[name] : undefined;
  if (!Icon) return fallback ? <Tag {...props} /> : null;
  return <Icon {...props} />;
}
