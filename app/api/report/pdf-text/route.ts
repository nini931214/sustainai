// app/api/report/pdf-text/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";

import { listBatches, getBatchById } from "@/lib/chain";
import { getBatchSummary } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------- 基本設定 ----------------------- */

const A4 = { w: 595.28, h: 841.89 };
const M = 56; // margin
const FONT_PATH = path.join(process.cwd(), "public/fonts/NotoSansTC-Regular.ttf");
const LOGO_PATH = path.join(process.cwd(), "public/brand/logo.png");
const BRAND = "SustainAI";

// ✅ 讀 batch_versions.json：用 batchId + batchVersionId 找 hash（Verify 用）
const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_VERSIONS_FILE = path.join(DATA_DIR, "batch_versions.json");

// ⚠️ 不要用 Unicode 下標，很多字型會變豆腐
const CO2E_TOKEN = "[[CO2E]]";

/* ----------------------- 小工具 ----------------------- */

function safeStr(v: any) {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function widthOf(font: any, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

function wrapTextByWidth(font: any, text: string, size: number, maxW: number) {
  const s = safeStr(text).replace(/\r/g, "");
  if (!s) return [""];
  const lines: string[] = [];

  const rawLines = s.split("\n");
  for (const raw of rawLines) {
    const t = raw.trimEnd();
    if (!t) {
      lines.push("");
      continue;
    }

    let cur = "";
    for (const ch of t) {
      const next = cur + ch;
      if (widthOf(font, next, size) <= maxW) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        cur = ch;
      }
    }
    if (cur) lines.push(cur);
  }

  return lines;
}

function chunkString(s: string, n = 32) {
  const t = safeStr(s).replace(/\s+/g, "");
  if (!t) return ["—"];
  const out: string[] = [];
  for (let i = 0; i < t.length; i += n) out.push(t.slice(i, i + n));
  return out;
}

function drawText(
  page: any,
  font: any,
  text: string,
  x: number,
  y: number,
  size: number,
  color = rgb(0.12, 0.12, 0.12)
) {
  page.drawText(safeStr(text), {
    x,
    y,
    size,
    font,
    color,
    lineHeight: size * 1.35,
  });
}

function drawCenteredText(
  page: any,
  font: any,
  text: string,
  centerX: number,
  y: number,
  size: number,
  color = rgb(0.12, 0.12, 0.12)
) {
  const t = safeStr(text);
  const w = widthOf(font, t, size);
  drawText(page, font, t, centerX - w / 2, y, size, color);
}

/** helper: 允許指定 font（mono） */
function pageDrawText(
  page: any,
  f: any,
  text: string,
  x: number,
  y: number,
  size: number,
  color = rgb(0.12, 0.12, 0.12)
) {
  page.drawText(safeStr(text), { x, y, size, font: f, color, lineHeight: size * 1.35 });
}

/* ---------------- JSON 讀檔 ---------------- */

async function readJsonAny(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

/* ---------------- batchVersionHash resolve（✅修正重點） ---------------- */

async function resolveBatchVersionFromDb(batchId: string, batchVersionId?: string) {
  try {
    const versionsDb = await readJsonAny(BATCH_VERSIONS_FILE, { records: [] });
    const records: any[] = Array.isArray(versionsDb.records) ? versionsDb.records : [];

    // 1) 優先：batchId + batchVersionId 精準找
    let v: any = null;
    if (batchVersionId) {
      v =
        records.find(
          (r) =>
            String(r?.batchId) === String(batchId) &&
            String(r?.batchVersionId || "") === String(batchVersionId)
        ) || null;
    }

    // 2) fallback：沒給 batchVersionId 或找不到 → 用 batchId 找「最新 ts」的那筆
    if (!v) {
      const candidates = records.filter((r) => String(r?.batchId) === String(batchId));
      candidates.sort((a, b) => Number(b?.ts || 0) - Number(a?.ts || 0));
      v = candidates[0] || null;
    }

    return {
      found: !!v,
      batchVersionId: String(v?.batchVersionId || batchVersionId || ""),
      hash: String(v?.hash || ""),
    };
  } catch {
    return { found: false, batchVersionId: String(batchVersionId || ""), hash: "" };
  }
}

/* ---------------- CO₂e 手工下標渲染 ---------------- */

function co2eWidth(font: any, size: number) {
  const subSize = size * 0.72;
  const wCO = widthOf(font, "CO", size);
  const w2 = widthOf(font, "2", subSize);
  const we = widthOf(font, "e", size);
  return wCO + w2 + we;
}

function drawCO2e(page: any, font: any, x: number, y: number, size: number) {
  const subSize = size * 0.72;

  page.drawText("CO", { x, y, size, font, color: rgb(0.12, 0.12, 0.12) });
  const wCO = widthOf(font, "CO", size);

  page.drawText("2", {
    x: x + wCO,
    y: y - size * 0.22,
    size: subSize,
    font,
    color: rgb(0.12, 0.12, 0.12),
  });
  const w2 = widthOf(font, "2", subSize);

  page.drawText("e", {
    x: x + wCO + w2,
    y,
    size,
    font,
    color: rgb(0.12, 0.12, 0.12),
  });

  return wCO + w2 + widthOf(font, "e", size);
}

type Token = { kind: "text"; value: string } | { kind: "co2e" };

function tokenizeWithCO2E(text: string): Token[] {
  const s = safeStr(text);
  if (!s) return [{ kind: "text", value: "" }];

  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const idx = s.indexOf(CO2E_TOKEN, i);
    if (idx === -1) {
      out.push({ kind: "text", value: s.slice(i) });
      break;
    }
    if (idx > i) out.push({ kind: "text", value: s.slice(i, idx) });
    out.push({ kind: "co2e" });
    i = idx + CO2E_TOKEN.length;
  }
  return out;
}

function splitTokensToLines(font: any, tokens: Token[], size: number, maxW: number) {
  const lines: Token[][] = [];
  let cur: Token[] = [];
  let curW = 0;

  const pushLine = () => {
    lines.push(cur);
    cur = [];
    curW = 0;
  };

  const measureToken = (t: Token) => {
    if (t.kind === "co2e") return co2eWidth(font, size);
    return widthOf(font, t.value, size);
  };

  const expanded: Token[] = [];
  for (const t of tokens) {
    if (t.kind === "text") {
      const v = t.value.replace(/\r/g, "");
      for (const ch of v) {
        if (ch === "\n") expanded.push({ kind: "text", value: "\n" });
        else expanded.push({ kind: "text", value: ch });
      }
    } else {
      expanded.push(t);
    }
  }

  for (const t of expanded) {
    if (t.kind === "text" && t.value === "\n") {
      pushLine();
      continue;
    }

    const w = measureToken(t);
    if (curW + w <= maxW) {
      cur.push(t);
      curW += w;
    } else {
      if (cur.length) pushLine();
      cur.push(t);
      curW = w;
    }
  }

  if (cur.length) pushLine();
  if (!lines.length) lines.push([{ kind: "text", value: "" }]);
  return lines;
}

function drawTokensLine(page: any, font: any, tokens: Token[], x: number, y: number, size: number) {
  let cx = x;
  for (const t of tokens) {
    if (t.kind === "co2e") {
      cx += drawCO2e(page, font, cx, y, size);
    } else {
      if (t.value) {
        page.drawText(t.value, { x: cx, y, size, font, color: rgb(0.12, 0.12, 0.12) });
        cx += widthOf(font, t.value, size);
      }
    }
  }
}

function drawWrappedParagraphWithCO2E(
  page: any,
  font: any,
  text: string,
  x: number,
  yTop: number,
  size: number,
  maxW: number
) {
  const tokens = tokenizeWithCO2E(text);
  const lines = splitTokensToLines(font, tokens, size, maxW);
  let y = yTop;
  for (const lineTokens of lines) {
    drawTokensLine(page, font, lineTokens, x, y, size);
    y -= size * 1.45;
  }
  return y;
}

/* ---------------- QR / Footer / Watermark ---------------- */

async function qrPng(data: string, px = 240) {
  return QRCode.toBuffer(data, {
    type: "png",
    width: px,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

function footer(page: any, font: any, pageNo: number, total: number, batchId: string) {
  const y = 28;
  const left = `${BRAND}  |  Batch: ${batchId}`;
  const right = `Page ${pageNo} / ${total}`;

  drawText(page, font, left, M, y, 9, rgb(0.35, 0.35, 0.35));
  const rw = widthOf(font, right, 9);
  drawText(page, font, right, A4.w - M - rw, y, 9, rgb(0.35, 0.35, 0.35));
}

function addWatermark(page: any, logoImage: any) {
  if (!logoImage) return;

  const targetW = 440;
  const scale = targetW / logoImage.width;
  const w = logoImage.width * scale;
  const h = logoImage.height * scale;

  const x = (A4.w - w) / 2;
  const y = (A4.h - h) / 2 - 10;

  page.drawImage(logoImage, {
    x,
    y,
    width: w,
    height: h,
    opacity: 0.14,
  });
}

/* ----------------------- PDF 產生 ----------------------- */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // ✅ 跟 app/ai/page.tsx 一樣：用 ?batch= 批次ID 取資料
    const batchKey = url.searchParams.get("batch") || url.searchParams.get("batchId") || "";
    const batches = listBatches();
    const batch =
      (batchKey && getBatchById(batchKey)) || (batches.length > 0 ? batches[0] : undefined);

    if (!batch) {
      return NextResponse.json({ ok: false, error: "BATCH_NOT_FOUND", batch: batchKey }, { status: 404 });
    }

    // ✅ 同 Demo：用 getBatchSummary(batch) 算出同一套文字
    const summary = getBatchSummary(batch);
    const fp = (summary as any)?.footprint || {};

    const totalCo2 = Number(fp.total_co2e ?? 0);
    const transportShare = totalCo2 > 0 ? Math.round((Number(fp.transport_co2e ?? 0) / totalCo2) * 100) : 0;
    const processShare = totalCo2 > 0 ? Math.round((Number(fp.process_co2e ?? 0) / totalCo2) * 100) : 0;
    const recycleRate = fp.reuse_ratio != null ? Number(fp.reuse_ratio) * 100 : undefined;
    const savedCo2 = totalCo2 * 0.3;
    const mainSource = Number(fp.transport_co2e ?? 0) >= Number(fp.process_co2e ?? 0) ? "運輸" : "再生加工(處理廠)";

    const inputKg = Number((batch as any).kg || 0);
    const outputKg = Number((batch as any).processor?.output_kg || 0);
    const wasteKg = Number((batch as any).processor?.waste_kg || 0);
    const lossRate = inputKg > 0 ? Math.round((wasteKg / inputKg) * 100) : undefined;

    // ✅ IDs（每批次不同）
    const reportId =
      url.searchParams.get("reportId") ||
      (summary as any)?.reportId ||
      (batch as any)?.reportId ||
      `RPT-${String((batch as any).id || batchKey || "UNKNOWN")}`;

    const batchId = String((batch as any).id || batchKey);

    // ✅ batchVersionId：優先 query，其次 summary/batch
    const batchVersionIdInput =
      url.searchParams.get("batchVersionId") ||
      (summary as any)?.batchVersionId ||
      (batch as any)?.batchVersionId ||
      "";

    // ✅ 先從 batch_versions.json 找「真正的」batchVersionHash（Verify lookup key）
    const resolved = await resolveBatchVersionFromDb(batchId, batchVersionIdInput);
    const batchVersionId = resolved.batchVersionId || batchVersionIdInput;

    // ✅ fallback：如果 db 找不到，才退回 summary/batch 內可能有的欄位
    const batchVersionHash =
      resolved.hash ||
      url.searchParams.get("batchVersionHash") ||
      (summary as any)?.batchVersionHash ||
      (batch as any)?.hash ||
      (batch as any)?.versionHash ||
      "";

    const reportPayloadHash =
      url.searchParams.get("reportPayloadHash") ||
      (summary as any)?.reportPayloadHash ||
      (batch as any)?.reportPayloadHash ||
      "";

    // ✅ Verify / Trace QR
    // Verify：verify/page.tsx 目前「一定要 batchVersionHash」，所以 QR 必帶
    const verifyUrl =
      url.searchParams.get("verifyUrl") ??
      `http://localhost:3000/verify?batchVersionHash=${encodeURIComponent(batchVersionHash)}&batchId=${encodeURIComponent(
        batchId
      )}${batchVersionId ? `&batchVersionId=${encodeURIComponent(batchVersionId)}` : ""}&reportId=${encodeURIComponent(
        reportId
      )}${reportPayloadHash ? `&reportPayloadHash=${encodeURIComponent(reportPayloadHash)}` : ""}`;

    // Trace：回 /trace
    const traceUrl =
      url.searchParams.get("traceUrl") ??
      `http://localhost:3000/trace?batchId=${encodeURIComponent(batchId)}${
        batchVersionId ? `&batchVersionId=${encodeURIComponent(batchVersionId)}` : ""
      }`;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await fs.readFile(FONT_PATH);
    const font = await pdfDoc.embedFont(fontBytes);

    const mono = await pdfDoc.embedFont(StandardFonts.Courier);

    // logo（可缺）
    let logoImage: any = null;
    try {
      const logoBytes = await fs.readFile(LOGO_PATH);
      const isPng = logoBytes?.[0] === 0x89 && logoBytes?.[1] === 0x50;
      logoImage = isPng ? await pdfDoc.embedPng(logoBytes) : await pdfDoc.embedJpg(logoBytes);
    } catch {
      logoImage = null;
    }

    // QR
    const verifyQrBytes = await qrPng(verifyUrl, 220);
    const traceQrBytes = await qrPng(traceUrl, 220);
    const verifyQr = await pdfDoc.embedPng(verifyQrBytes);
    const traceQr = await pdfDoc.embedPng(traceQrBytes);

    /* ======================= Page 1 ======================= */
    const p1 = pdfDoc.addPage([A4.w, A4.h]);
    addWatermark(p1, logoImage);

    const title = `${BRAND} | 批次驗證與履歷`;
    const line1 = `Report ID：${reportId}`;
    const line2 = `Batch：${batchId}${batchVersionId ? ` / ${batchVersionId}` : ""}`;

    const centerY = A4.h / 2;
    drawCenteredText(p1, font, title, A4.w / 2, centerY + 36, 26);
    drawCenteredText(p1, font, line1, A4.w / 2, centerY - 6, 12);
    drawCenteredText(p1, font, line2, A4.w / 2, centerY - 28, 12);

    footer(p1, font, 1, 3, batchId);

    /* ======================= Page 2 ======================= */
    const p2 = pdfDoc.addPage([A4.w, A4.h]);
    addWatermark(p2, logoImage);

    let y = A4.h - M;

    drawText(p2, font, "一、循環經濟永續聲明（AI 生成 Demo）", M, y, 18);
    y -= 34;

    // 1) 一句話管理摘要
    drawText(p2, font, "1. 一句話管理摘要", M, y, 13);
    y -= 20;

    const material = safeStr((batch as any).material || "回收材料");
    const summaryText =
      `本批次「${material}」回收材料的估算總碳排約 ` +
      `${totalCo2.toFixed(2)} kg ${CO2E_TOKEN}，其中 ${mainSource} 環節為主要排放來源` +
      `（運輸約 ${transportShare}%、再生加工約 ${processShare}%）。在回收投入 ${inputKg.toFixed(
        1
      )} kg 的前提下，保守估計相較原生塑膠流程可減少約 ${savedCo2.toFixed(2)} kg ${CO2E_TOKEN}。` +
      (recycleRate != null
        ? ` 整體再利用率約 ${recycleRate.toFixed(1)}%，顯示大部分回收料已成功導入再製與產品應用。`
        : "");

    y = drawWrappedParagraphWithCO2E(p2, font, summaryText, M, y, 11, A4.w - M * 2);
    y -= 14;

    // 2) GRI / ISSB 段落
    drawText(p2, font, "2. GRI / ISSB 對應報告段落（簡化示範）", M, y, 13);
    y -= 18;

    const processorName = safeStr((batch as any).processor?.name || "處理廠");
    const g1 =
      `【GRI 301 – 材料使用與循環】\n` +
      `本批次共投入回收塑膠材料 ${inputKg.toFixed(1)} kg，材質類型為「${material}」。經處理廠 ${processorName} 再生處理後，輸出可再利用材料約 ${outputKg.toFixed(1)} kg` +
      (lossRate != null
        ? `，再生過程中產生報廢損耗約 ${wasteKg.toFixed(1)} kg（約占投入量的 ${lossRate}%）。`
        : "。") +
      ` 依據再利用率約 ${recycleRate != null ? recycleRate.toFixed(1) : "0.0"}% 推估，本批次成功將多數回收料導入後續製造流程，降低對原生塑膠的依賴。`;

    const g2 =
      `【GRI 306 – 廢棄物產生與處理】\n` +
      `在本批次的再生處理過程中，回收材料經分類、清洗與再生造粒等程序，合計產生廢棄物約 ${wasteKg.toFixed(1)} kg。企業後續可進一步說明報廢部分的處理方式（例如：能源回收、委外處理或再次分級使用），以提升整體材料循環效率並降低廢棄物最終處置比例。`;

    const g3 =
      `【ISSB S2 – 氣候相關風險與機會】\n` +
      `本批次回收與再生活動的估算碳排放量為 ${totalCo2.toFixed(2)} kg ${CO2E_TOKEN}，包含運輸與再生加工能源使用。依據內部假設基準，若改採原生塑膠生產，相同產品批次之排放量預估將增加約 ${savedCo2.toFixed(2)} kg ${CO2E_TOKEN}。此結果顯示導入回收材料具有實質減碳效益，並有助於公司在中長期氣候目標與淨零路徑中的落實。`;

    const maxW = A4.w - M * 2;
    for (const block of [g1, g2, g3]) {
      const parts = block.split("\n");
      drawText(p2, font, parts[0], M, y, 11.5);
      y -= 18;
      y = drawWrappedParagraphWithCO2E(p2, font, parts.slice(1).join("\n"), M, y, 11, maxW);
      y -= 10;
    }

    // 3) Key Evidence + Trace QR
    drawText(p2, font, "3. Key Evidence 主要依據", M, y, 13);
    y -= 18;

    const bullets = [
      "批次履歷（Trace QR）",
      "處理廠稽核紀錄",
      "Multi-Role Console 操作留痕",
      "ESG Dashboard 指標彙整",
      "AI 永續聲明生成紀錄",
      "ISSB / GRI 對應欄位（示範）",
    ];

    const bulletX = M + 14;
    const bulletMaxW = A4.w - M * 2 - 14;
    for (const b of bullets) {
      drawText(p2, font, "•", M, y, 12);
      const lines = wrapTextByWidth(font, b, 11, bulletMaxW);
      for (const ln of lines) {
        drawText(p2, font, ln, bulletX, y, 11);
        y -= 16;
      }
    }

    y -= 6;
    const qrSize = 120;
    const qrX = M;
    const qrY = y - qrSize;

    p2.drawImage(traceQr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    drawText(p2, font, "批次追蹤 / 查詢（Trace）", qrX + qrSize + 16, qrY + qrSize - 18, 12);
    drawText(p2, font, "掃描進入追蹤/查詢頁。", qrX + qrSize + 16, qrY + qrSize - 38, 10, rgb(0.35, 0.35, 0.35));

    footer(p2, font, 2, 3, batchId);

    /* ======================= Page 3 ======================= */
    const p3 = pdfDoc.addPage([A4.w, A4.h]);
    addWatermark(p3, logoImage);

    let y3 = A4.h - M;

    drawText(p3, font, "二、稽核狀態與鎖定（不可竄改）", M, y3, 18);
    y3 -= 28;

    const tableX = M;
    const tableW = A4.w - M * 2;
    const colL = 180;
    const colR = tableW - colL;
    const rowPadY = 10;

    const rows: Array<{ k: string; vLines: string[]; mono?: boolean }> = [
      { k: "稽核狀態", vLines: ["approved"] },
      { k: "稽核時間", vLines: [new Date().toISOString()] },
      { k: "時間來源", vLines: ["batch.ts"] },
      { k: "Report Payload Hash", vLines: chunkString(reportPayloadHash || "—", 34), mono: true },
      { k: "Batch Version Hash (lookup key)", vLines: chunkString(batchVersionHash || "—", 34), mono: true },
      { k: "Signature", vLines: ["—（請至 Verify 頁檢視）"] },
      { k: "Timestamp Proof（OTS）", vLines: ["—（由 Verify 頁顯示 complete / pending）"] },
    ];

    const keySize = 11;
    const valSize = 10.5;
    const lineH = 14;
    const border = rgb(0.86, 0.86, 0.86);

    let curY = y3;
    const startY = curY;

    const rowHeights = rows.map((r) => {
      const lines = r.vLines.length ? r.vLines : ["—"];
      const h = rowPadY * 2 + lines.length * lineH;
      return Math.max(h, 44);
    });

    const totalH = rowHeights.reduce((a, b) => a + b, 0);

    p3.drawRectangle({
      x: tableX,
      y: startY - totalH,
      width: tableW,
      height: totalH,
      borderColor: border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    p3.drawLine({
      start: { x: tableX + colL, y: startY },
      end: { x: tableX + colL, y: startY - totalH },
      thickness: 1,
      color: border,
    });

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rh = rowHeights[i];

      if (i > 0) {
        p3.drawLine({
          start: { x: tableX, y: curY },
          end: { x: tableX + tableW, y: curY },
          thickness: 1,
          color: border,
        });
      }

      const cellTop = curY;
      const cellBottom = curY - rh;

      drawText(p3, font, r.k, tableX + 12, cellTop - 26, keySize);

      const vx = tableX + colL + 12;
      let vy = cellTop - 26;

      const maxVW = colR - 24;
      const vFont = r.mono ? mono : font;

      const vLinesExpanded: string[] = [];
      for (const ln of r.vLines.length ? r.vLines : ["—"]) {
        const ws = wrapTextByWidth(vFont, ln, valSize, maxVW);
        vLinesExpanded.push(...ws);
      }

      for (const ln of vLinesExpanded) {
        pageDrawText(p3, vFont, ln, vx, vy, valSize, rgb(0.15, 0.15, 0.15));
        vy -= lineH;
      }

      curY = cellBottom;
    }

    y3 = startY - totalH - 22;

    drawText(p3, font, "驗證方式：", M, y3, 12);
    y3 -= 18;

    const verifyDesc =
      "掃描下方「Verify」QR 進入公開驗證頁；系統將以 batchVersionHash 作為 lookup key，驗證簽章、雜湊一致性，並檢查 OpenTimestamps（OTS）時間戳狀態（complete / pending）。";
    y3 = drawWrappedParagraphWithCO2E(p3, font, verifyDesc, M, y3, 11, A4.w - M * 2);
    y3 -= 10;

    const vSize = 120;
    const vX = M;
    const vY = y3 - vSize;

    p3.drawImage(verifyQr, { x: vX, y: vY, width: vSize, height: vSize });
    drawText(p3, font, "Verify", vX + vSize + 16, vY + vSize - 18, 12);
    drawText(p3, font, "掃描進入公開驗證頁。", vX + vSize + 16, vY + vSize - 38, 10, rgb(0.35, 0.35, 0.35));

    const p3Note = "此文件由 SustainAI 系統依批次稽核資料自動生成，用於循環經濟永續報告展示與公開驗證。";
    const noteLines = wrapTextByWidth(font, p3Note, 10.5, A4.w - M * 2);

    let noteY = 56;
    for (let i = 0; i < noteLines.length; i++) {
      const ln = noteLines[i];
      drawCenteredText(p3, font, ln, A4.w / 2, noteY - i * 14, 10.5, rgb(0.35, 0.35, 0.35));
    }

    footer(p3, font, 3, 3, batchId);

    const bytes = await pdfDoc.save();

    

const pdfBody = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength
) as ArrayBuffer;

return new NextResponse(pdfBody, {
  headers: {
    "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${BRAND}-${batchId}${batchVersionId ? `-${batchVersionId}` : ""}.pdf`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PDF_GEN_FAILED",
        message: err?.message ?? String(err),
        stack: err?.stack ?? null,
      },
      { status: 500 }
    );
  }
}