import path from "path";
import fs from "fs/promises";
import { Buffer } from "buffer";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";

type AnyFont = any;

function nowYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function wrapText(params: {
  text: string;
  font: AnyFont;
  fontSize: number;
  maxWidth: number;
}) {
  const { text, font, fontSize, maxWidth } = params;
  const hasSpace = /\s/.test(text);
  const units = hasSpace ? text.split(/\s+/) : [...text];

  const lines: string[] = [];
  let line = "";

  for (const u of units) {
    const test = line ? (hasSpace ? `${line} ${u}` : `${line}${u}`) : u;
    const width = font.widthOfTextAtSize(test, fontSize);

    if (width <= maxWidth) {
      line = test;
      continue;
    }

    if (line) lines.push(line);

    let chunk = "";
    for (const ch of u) {
      const t = chunk + ch;
      if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) chunk = t;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  }

  if (line) lines.push(line);
  return lines;
}

function drawWatermarkCenter(params: {
  page: any;
  logoImage: any;
  opacity: number;
  maxWidthPercent: number;
}) {
  const { page, logoImage, opacity, maxWidthPercent } = params;
  const { width, height } = page.getSize();

  const maxW = width * maxWidthPercent;
  const scale = maxW / logoImage.width;
  const w = logoImage.width * scale;
  const h = logoImage.height * scale;

  page.drawImage(logoImage, {
    x: (width - w) / 2,
    y: (height - h) / 2,
    width: w,
    height: h,
    opacity,
  });
}

function normalizeCO2Subscript(s: string) {
  return (s || "").replace(/CO2e/g, "CO₂e").replace(/CO2/g, "CO₂");
}

function normalizeFooterText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 100);
}

function drawFooter(params: {
  page: any;
  font: AnyFont;
  fontSize: number;
  batchId: string;
  generatedAt: string;
  pageNo: number;
  totalPages: number;
}) {
  const { page, font, fontSize, batchId, generatedAt, pageNo, totalPages } =
    params;

  const { width } = page.getSize();
  const margin = 48;

  const y1 = 16;
  const y2 = 30;

  const leftTop = "SustainAI | Sustainability Statement";
  const rightTop = `Page ${pageNo} / ${totalPages}`;

  const cleanBatch = normalizeFooterText(batchId);
  const cleanDate = normalizeFooterText(generatedAt);
  const leftBottom = `Batch:${cleanBatch} | Gen:${cleanDate}`;

  page.drawText(leftTop, {
    x: margin,
    y: y1,
    size: fontSize,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const rightW = font.widthOfTextAtSize(rightTop, fontSize);
  page.drawText(rightTop, {
    x: width - margin - rightW,
    y: y1,
    size: fontSize,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const small = Math.max(8.5, fontSize - 1);
  page.drawText(leftBottom, {
    x: margin,
    y: y2,
    size: small,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
}

function drawContentHeader(params: {
  page: any;
  font: AnyFont;
  margin: number;
  title: string;
  batchId: string;
}) {
  const { page, font, margin, title, batchId } = params;

  page.drawText(title, {
    x: margin,
    y: 805,
    size: 16,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawText(`Batch: ${batchId}`, {
    x: margin,
    y: 782,
    size: 10.5,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawLine({
    start: { x: margin, y: 770 },
    end: { x: 595.28 - margin, y: 770 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
}

async function readFontBytesSafe(fileName: string) {
  const p = path.join(process.cwd(), "public", "fonts", fileName);
  return fs.readFile(p);
}

async function embedFontWithFallback(pdfDoc: PDFDocument) {
  const fkMod: any = await import("@pdf-lib/fontkit");
  const fontkit = fkMod?.default ?? fkMod;
  if (!fontkit) throw new Error("FONTKIT_IMPORT_FAILED");

  pdfDoc.registerFontkit(fontkit);

  const candidates = [
    "NotoSansCJKtc-Regular.otf",
    "NotoSerifTC-Regular.otf",
  ];

  let lastErr: any = null;

  for (const name of candidates) {
    try {
      const bytes = await readFontBytesSafe(name);
      const font = await pdfDoc.embedFont(bytes);
      return { font, used: name };
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw new Error(`EMBED_FONT_FAILED: ${lastErr?.message || String(lastErr)}`);
}

async function embedLogoSafe(pdfDoc: PDFDocument) {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo.png");
  const logoBytes = await fs.readFile(logoPath);
  return pdfDoc.embedPng(logoBytes);
}

export type ReportSection = {
  title: string;
  paragraphs: { text: string }[];
};

export async function generateReportPdf(params: {
  batchId: string;
  material?: string;
  traceUrl: string;
  title: string;
  sections: ReportSection[];
}) {
  const { batchId, material, traceUrl, title, sections } = params;

  const generatedAt = nowYMD();
  const pdfDoc = await PDFDocument.create();

  const { font } = await embedFontWithFallback(pdfDoc);
  const logoImage = await embedLogoSafe(pdfDoc);

  const qrDataUrl = await QRCode.toDataURL(traceUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });

  const qrBase64 = qrDataUrl.split(",")[1] || "";
  const qrBytes = Buffer.from(qrBase64, "base64");
  const qrImage = await pdfDoc.embedPng(qrBytes);

  const cover = pdfDoc.addPage([595.28, 841.89]);
  const { width: cw, height: ch } = cover.getSize();

  drawWatermarkCenter({
    page: cover,
    logoImage,
    opacity: 0.06,
    maxWidthPercent: 0.62,
  });

  const titleSize = 24;
  const subtitleSize = 12;

  const tW = font.widthOfTextAtSize(title, titleSize);
  cover.drawText(title, {
    x: (cw - tW) / 2,
    y: ch - 180,
    size: titleSize,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });

  const subtitle = `Batch: ${batchId}   |   Material: ${
    material || "-"
  }   |   Generated: ${generatedAt}`;

  const subW = font.widthOfTextAtSize(subtitle, subtitleSize);
  cover.drawText(subtitle, {
    x: (cw - subW) / 2,
    y: ch - 215,
    size: subtitleSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  const qrSize = 110;
  cover.drawImage(qrImage, {
    x: (cw - qrSize) / 2,
    y: ch - 370,
    width: qrSize,
    height: qrSize,
    opacity: 0.95,
  });

  const qrHint = "Scan to view batch traceability record";
  const qrHintW = font.widthOfTextAtSize(qrHint, 10);
  cover.drawText(qrHint, {
    x: (cw - qrHintW) / 2,
    y: ch - 392,
    size: 10,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const coverNote =
    "This document is generated by SustainAI from batch-level data and is intended for ESG disclosure demonstration.";

  const coverLines = wrapText({
    text: normalizeCO2Subscript(coverNote),
    font,
    fontSize: 11,
    maxWidth: cw - 96,
  });

  let cy = 140;
  for (const line of coverLines) {
    cover.drawText(line, {
      x: 48,
      y: cy,
      size: 11,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    cy -= 16;
  }

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;

  const margin = 48;
  const maxWidth = PAGE_W - margin * 2;

  const contentFontSize = 11.5;
  const lineHeight = 16;
  const sectionGap = 14;
  const SAFE_BOTTOM_Y = 140;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  drawWatermarkCenter({
    page,
    logoImage,
    opacity: 0.07,
    maxWidthPercent: 0.7,
  });

  drawContentHeader({
    page,
    font,
    margin,
    title,
    batchId,
  });

  let y = 740;

  const newContentPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    drawWatermarkCenter({
      page,
      logoImage,
      opacity: 0.07,
      maxWidthPercent: 0.7,
    });

    drawContentHeader({
      page,
      font,
      margin,
      title,
      batchId,
    });

    y = 740;
  };

  for (const sec of sections) {
    if (y < SAFE_BOTTOM_Y + 80) newContentPage();

    page.drawText(normalizeCO2Subscript(sec.title), {
      x: margin,
      y,
      size: 13,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= 18;

    for (const p of sec.paragraphs) {
      const lines = wrapText({
        text: normalizeCO2Subscript(p.text),
        font,
        fontSize: contentFontSize,
        maxWidth,
      });

      const estimatedH = lines.length * lineHeight + 12;
      if (y - estimatedH < SAFE_BOTTOM_Y) newContentPage();

      for (const line of lines) {
        if (y < SAFE_BOTTOM_Y) newContentPage();

        page.drawText(line, {
          x: margin,
          y,
          size: contentFontSize,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });

        y -= lineHeight;
      }

      y -= 10;
    }

    y -= sectionGap;
  }

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    drawFooter({
      page: pages[i],
      font,
      fontSize: 9.5,
      batchId,
      generatedAt,
      pageNo: i + 1,
      totalPages,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `SustainAI-${batchId}.pdf`;

  return { pdfBytes, filename };
}