import Image from "next/image";
import Link from "next/link";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export function BrandCarousel({
  brands,
  langPrefix,
}: {
  brands: Brand[];
  langPrefix: string;
}) {
  if (!brands.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {brands.map((b) => (
        <Link
          key={b.id}
          href={`${langPrefix}/brand/${encodeURIComponent(b.slug)}`}
          className="group rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-4 hover:shadow-premium transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl border border-border bg-background/70 overflow-hidden grid place-items-center">
              {b.logoUrl ? (
                <Image
                  src={b.logoUrl}
                  alt={b.name}
                  width={64}
                  height={64}
                  className="h-10 w-10 object-contain group-hover:scale-[1.03] transition"
                />
              ) : (
                <div className="font-heading text-lg text-primary">
                  {b.name.trim().slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-heading text-sm text-foreground truncate group-hover:text-primary transition">
                {b.name}
              </div>
              <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Brand</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
