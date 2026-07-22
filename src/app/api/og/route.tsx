import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo/config";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || SITE.name).slice(0, 120);
  const type = searchParams.get("type") || "page";

  const subtitle =
    type === "product"
      ? "Shop meaningful gifts · Bohosaaz"
      : type === "blog"
        ? "Gift journal · Bohosaaz"
        : SITE.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #3d322c 0%, #2f2622 55%, #1f1916 100%)",
          color: "#f5f0ea",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#d4c4b0",
          }}
        >
          {SITE.name}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: title.length > 60 ? 48 : 58,
              lineHeight: 1.15,
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 26, color: "#d4c4b0" }}>{subtitle}</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#cbb8a4",
          }}
        >
          <span>Noida · Greater Noida · Delhi NCR</span>
          <span>www.bohosaaz.com</span>
        </div>
      </div>
    ),
    {
      width: SITE.ogImageWidth,
      height: SITE.ogImageHeight,
    }
  );
}
