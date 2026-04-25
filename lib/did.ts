// lib/did.ts
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function loadDid(role: string) {
  const p = path.join(process.cwd(), "data", "did", `${role}.json`);
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

export function verifyWithDid({
  message,
  signature,
  didDoc,
}: {
  message: string;
  signature: string;
  didDoc: any;
}) {
  const vm = didDoc.verificationMethod?.[0];
  if (!vm?.publicKeyPem) return false;

  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(message, "utf8"),
    vm.publicKeyPem,
    Buffer.from(signature, "base64")
  );
}