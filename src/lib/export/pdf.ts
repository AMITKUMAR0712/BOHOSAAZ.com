import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

type TableColumn = {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
};

function collectBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export function pdfDownloadResponse(filename: string, pdf: Buffer) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

export function createPdfDoc(opts?: { title?: string; subtitle?: string }) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  let pageNo = 1;

  const title = opts?.title || "Bohosaaz";
  const subtitle = opts?.subtitle || "";

  // Header
  const headerY = doc.y;
  const logoPath = path.join(process.cwd(), "public", "mainlogo.jpeg");
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, doc.page.margins.left, headerY, { fit: [80, 40] });
    } catch {
      // ignore image errors
    }
  }
  doc
    .fontSize(18)
    .text(title, doc.page.margins.left + 90, headerY, { continued: false });
  if (subtitle) {
    doc
      .moveDown(0.2)
      .fontSize(10)
      .fillColor("gray")
      .text(subtitle, doc.page.margins.left + 90, doc.y);
    doc.fillColor("black");
  }

  doc.moveDown(1.2);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor("#cccccc")
    .stroke();
  doc.strokeColor("black").moveDown(1);

  // Footer with page numbers
  const addFooter = () => {
    const bottomY = doc.page.height - doc.page.margins.bottom + 10;
    doc
      .fontSize(9)
      .fillColor("gray")
      .text(`Page ${pageNo}`, doc.page.margins.left, bottomY, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "right",
      })
      .fillColor("black");
  };
  doc.on("pageAdded", () => {
    pageNo += 1;
    addFooter();
  });
  addFooter();

  return doc;
}

export function renderTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: Array<Record<string, unknown>>,
  opts?: { rowHeight?: number }
) {
  const rowHeight = opts?.rowHeight ?? 18;
  const startX = doc.page.margins.left;
  const maxX = doc.page.width - doc.page.margins.right;
  const maxY = doc.page.height - doc.page.margins.bottom - 20;

  const drawHeader = () => {
    let x = startX;
    doc.fontSize(10).font("Helvetica-Bold");
    for (const c of columns) {
      doc.text(c.label, x, doc.y, {
        width: c.width,
        align: c.align ?? "left",
      });
      x += c.width;
    }
    doc.font("Helvetica");
    doc.moveDown(0.6);
    doc
      .moveTo(startX, doc.y)
      .lineTo(maxX, doc.y)
      .strokeColor("#cccccc")
      .stroke();
    doc.strokeColor("black");
    doc.moveDown(0.6);
  };

  drawHeader();

  for (const r of rows) {
    if (doc.y + rowHeight > maxY) {
      doc.addPage();
      drawHeader();
    }

    let x = startX;
    const y = doc.y;
    doc.fontSize(9);
    for (const c of columns) {
      const raw = r[c.key];
      const text = raw === null || raw === undefined ? "" : String(raw);
      doc.text(text, x, y, {
        width: c.width,
        align: c.align ?? "left",
        ellipsis: true,
      });
      x += c.width;
    }
    doc.y = y + rowHeight;
  }
}

export async function buildPdfBuffer(build: (doc: PDFKit.PDFDocument) => void, opts?: { title?: string; subtitle?: string }) {
  const doc = createPdfDoc(opts);
  const done = collectBuffer(doc);
  build(doc);
  doc.end();
  return done;
}
