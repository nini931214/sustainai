// lib/vc.ts
import crypto from "crypto";

export function stableJson(obj: any) {
  const sortKeys = (x: any): any => {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === "object") {
      return Object.keys(x)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = sortKeys(x[k]);
          return acc;
        }, {});
    }
    return x;
  };

  return JSON.stringify(sortKeys(obj));
}

export function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function signVc(payload: any) {
  return {
    ok: true,
    payload,
    hash: sha256Hex(stableJson(payload)),
    issuedAt: new Date().toISOString(),
    issuer: "SustainAI",
  };
}

export function verifyVc(payload: any, expectedHash?: string) {
  const hash = sha256Hex(stableJson(payload));

  return {
    ok: expectedHash ? hash === expectedHash : true,
    hash,
    expectedHash: expectedHash || null,
  };
}

export function buildEmbeddedVc(input: any) {
  const vc = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "SustainAIVerificationCredential"],
    issuer: input.issuerDid || input.issuer || "SustainAI",
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      role: input.role,
      batchId: input.batchId,
      hash: input.hash,
      signature: input.signature,
      ...input,
    },
  };

  return {
    ...vc,
    vcHash: sha256Hex(stableJson(vc)),
  };
}