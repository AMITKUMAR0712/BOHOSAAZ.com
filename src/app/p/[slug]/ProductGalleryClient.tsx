"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type Img = {
  id?: string;
  url: string;
  isPrimary?: boolean;
};

export default function ProductGalleryClient({
  title,
  images,
}: {
  title: string;
  images: Img[];
}) {
  const ordered = useMemo(() => {
    const list = Array.isArray(images) ? images.filter((x) => x?.url) : [];
    const primaryIdx = list.findIndex((x) => x.isPrimary);
    if (primaryIdx > 0) {
      const [p] = list.splice(primaryIdx, 1);
      list.unshift(p);
    }
    return list;
  }, [images]);

  const [active, setActive] = useState(0);
  const current = ordered[active]?.url || null;

  return (
    <div>
      <div className="aspect-4/3 overflow-hidden bg-muted">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 will-change-transform hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {ordered.length > 1 ? (
        <div className="border-t border-border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            {ordered.map((img, idx) => {
              const selected = idx === active;
              return (
                <button
                  key={img.id || img.url}
                  type="button"
                  onClick={() => setActive(idx)}
                  className={cn(
                    "relative rounded-(--radius) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected ? "ring-2 ring-ring" : "hover:opacity-90",
                  )}
                  aria-label={selected ? "Selected image" : "Select image"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt="thumbnail"
                    className={cn(
                      "h-16 w-16 rounded-(--radius) border border-border object-cover",
                      selected ? "border-ring" : "",
                    )}
                  />
                  {img.isPrimary ? (
                    <span className="absolute -right-1 -top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Primary
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
