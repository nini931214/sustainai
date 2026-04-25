import crypto from "crypto";

export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashJson(obj: any) {
  return sha256Hex(stableStringify(obj));
}