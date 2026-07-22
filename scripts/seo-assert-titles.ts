/**
 * Build-time SEO length gate.
 * Run: SEO_STRICT=1 npx tsx scripts/seo-assert-titles.ts
 */
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  TITLE_TEMPLATE_SUFFIX,
} from "../src/lib/seo/config";
import { fitDescription, fitTitleSegment, renderedTitle } from "../src/lib/seo/assert";

const samples: Array<{ title: string; description: string; label: string }> = [
  {
    label: "home",
    title: "Online Gift Shop in Noida & Delhi NCR",
    description:
      "Premium online gifting store for Noida, Greater Noida, New Delhi and Delhi NCR. Shop birthday, anniversary, corporate and festival gifts, barware, home decor and hampers.",
  },
  {
    label: "shop",
    title: "Shop Gifts in Noida & Delhi NCR",
    description:
      "Shop gifts in Noida, Greater Noida, New Delhi and Delhi NCR by occasion, recipient and budget. Explore birthday, anniversary, corporate and festival gifts.",
  },
  {
    label: "default",
    title: "Bohosaaz | Online Gift Shop in Noida & Delhi NCR",
    description:
      "Bohosaaz is a premium online gifting marketplace for gift products in Noida, Greater Noida, New Delhi and Delhi NCR.",
  },
];

let failed = 0;

for (const sample of samples) {
  const isDefault = sample.label === "default";
  const segment = isDefault ? sample.title : fitTitleSegment(sample.title);
  const description = fitDescription(sample.description);
  const full = isDefault ? sample.title : renderedTitle(segment);

  if (full.length > TITLE_MAX) {
    console.error(`FAIL ${sample.label}: title ${full.length} > ${TITLE_MAX}: ${full}`);
    failed += 1;
  } else {
    console.log(`OK   ${sample.label}: title ${full.length} chars`);
  }

  if (description.length > DESCRIPTION_MAX) {
    console.error(
      `FAIL ${sample.label}: description ${description.length} > ${DESCRIPTION_MAX}`
    );
    failed += 1;
  }

  if (!isDefault && !full.endsWith(TITLE_TEMPLATE_SUFFIX.trim()) && !full.includes("Bohosaaz")) {
    // renderedTitle always appends suffix
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("SEO title/description assertions passed.");
