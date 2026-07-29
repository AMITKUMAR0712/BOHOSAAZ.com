/** Extract FAQ Q&A pairs from markdown-ish blog bodies (### Question + answer lines). */
export function extractFaqsFromMarkdown(body: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  const faqIndex = body.search(/^##\s+FAQ\s*$/im);
  if (faqIndex < 0) return faqs;

  const faqBlock = body.slice(faqIndex);
  const parts = faqBlock.split(/^###\s+/m).slice(1);

  for (const part of parts) {
    const lines = part.trim().split(/\r?\n/);
    const question = (lines.shift() || "").trim().replace(/\?$/, "?");
    const answer = lines.join(" ").replace(/\s+/g, " ").trim();
    if (question && answer) faqs.push({ question, answer });
  }

  return faqs;
}
