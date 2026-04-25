import fs from "fs/promises";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const batchId = process.argv[2] || "TEST";
const traceId = process.argv[3] || "TRACE";

const root = process.cwd();

// 讀你的 AI JSON（你可以沿用 data/ai-output/{batchId}.json）
async function getAiOutput() {
  const p = path.join(root, "data", "ai-output", `${batchId}.json`);
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

function jsonToParagraphs(ai) {
  const lines = [];
  lines.push("SustainAI｜AI 永續聲明（純文字 PDF）");
  lines.push("");
  lines.push(`批次：${batchId}`);
  lines.push(`Trace：${traceId}`);
  lines.push(`產生時間：${new Date().toLocaleString("zh-TW")}`);
  lines.push("");

  if (ai?.company) lines.push(`公司：${ai.company}`);
  if (ai?.period) lines.push(`期間：${ai.period}`);
  lines.push("");

  if (ai?.summary) {
    lines.push("【摘要】");
    lines.push(String(ai.summary));
    lines.push("");
  }

  if (Array.isArray(ai?.sections)) {
    for (const s of ai.sections) {
      lines.push(`【${s.heading ?? "段落"}】`);
      if (Array.isArray(s.bullets)) {
        for (const b of s.bullets) lines.push(`• ${b}`);
      } else if (s?.text) {
        lines.push(String(s.text));
      }
      lines.push("");
    }
  }
  return lines;
}

// 中文簡易換行：以字數切（正式版你也可以再進階做寬度計算）
function wrapLine(line, maxChars = 42) {
  if (line.length <= maxChars) return [line];
  const out = [];
  let i = 0;
  while (i < line.length) {
    out.push(line.slice(i, i + maxChars));
    i += maxChars;
  }
  return out;
}

async function main() {
  const ai = await getAiOutput();
  const content = jsonToParagraphs(ai);

  const pdfDoc = await PDFDocument.create();
  // ❌ 刪掉：import fontkit from "@pdf-lib/fontkit";

const fkMod: any = await import("@pdf-lib/fontkit");
const fontkit = fkMod.default ?? fkMod;
pdfDoc.registerFontkit(fontkit);

  // ✅ 中文字體（真的就用你 public/fonts 的那支）
  const fontPath = path.join(root, "public", "fonts", "NotoSansTC-Regular.ttf");
  const fontBytes = await fs.readFile(fontPath);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  // Logo
  let logoBytes = null;
  try {
    logoBytes = await fs.readFile(path.join(root, "public", "brand", "logo.png"));
  } catch {}
  const logo = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_X = 55;
  const TOP = 70;
  const BOTTOM = 55;
  const LINE_H = 18;
  const FONT_SIZE = 11;

  const pages = [];
  const addPage = () => {
    const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pages.push(p);

    // ✅ 背後正中央 Logo 浮水印
    if (logo) {
      const w = PAGE_W * 0.55;
      const h = (logo.height / logo.width) * w;
      p.drawImage(logo, {
        x: (PAGE_W - w) / 2,
        y: (PAGE_H - h) / 2,
        width: w,
        height: h,
        opacity: 0.08,
      });
    }
    return p;
  };

  let page = addPage();
  let y = PAGE_H - TOP;

  for (const raw of content) {
    const lines = wrapLine(raw, 42);
    for (const line of lines) {
      if (y < BOTTOM + 40) {
        page = addPage();
        y = PAGE_H - TOP;
      }
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= LINE_H;
    }
  }

  // header/footer/page
  pages.forEach((p, idx) => {
    p.drawText("SustainAI · AI 永續聲明匯出", {
      x: MARGIN_X,
      y: PAGE_H - 35,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });

    p.drawText(`批次：${batchId}｜Trace：${traceId}`, {
      x: MARGIN_X,
      y: 25,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    p.drawText(`第 ${idx + 1} / ${pages.length} 頁`, {
      x: PAGE_W - MARGIN_X - 85,
      y: 25,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  });

  const bytes = await pdfDoc.save();

  // 回傳 base64 給 route.ts
  process.stdout.write(Buffer.from(bytes).toString("base64"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});