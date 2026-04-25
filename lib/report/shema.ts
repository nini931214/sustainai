// lib/report/schema.ts
export type StandardTag =
  | "GRI-301"
  | "GRI-306"
  | "ISSB-S2"
  | "ESG"
  | "AUDIT"
  | "TRACE";

export type ReportParagraph = {
  text: string;
  tags?: StandardTag[];
};

export type ReportSection = {
  id: string;
  title: string;
  paragraphs: ReportParagraph[];
};

export type ReportDoc = {
  meta: {
    batchId: string;
    material?: string;
    generatedAt: string; // YYYY-MM-DD
    traceUrl: string;
  };
  sections: ReportSection[];
};