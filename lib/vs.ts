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

export function buildVcPayload(params: {
  issuerDid: string;
  role: string;
  batchId: string;
  batchVersionHash: string;
  signerName: string;
  note?: string;
  issuanceDate: string;
}) {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "BatchRoleSignature"],
    issuer: params.issuerDid,
    issuanceDate: params.issuanceDate,
    credentialSubject: {
      batchId: params.batchId,
      batchVersionHash: params.batchVersionHash,
      role: params.role,
      signerName: params.signerName,
      note: params.note || null
    }
  };
}

export function buildEmbeddedVc(params: {
  issuerDid: string;
  role: string;
  batchId: string;
  batchVersionHash: string;
  signerName: string;
  note?: string;
  issuanceDate: string;
  signature: string;
  kid: string;
}) {
  const payload = buildVcPayload({
    issuerDid: params.issuerDid,
    role: params.role,
    batchId: params.batchId,
    batchVersionHash: params.batchVersionHash,
    signerName: params.signerName,
    note: params.note,
    issuanceDate: params.issuanceDate,
  });

  return {
    ...payload,
    proof: {
      type: "RsaSignature2018",
      created: params.issuanceDate,
      proofPurpose: "assertionMethod",
      verificationMethod: `${params.issuerDid}#${params.kid}`,
      jws: params.signature
    },
    vcHash: sha256Hex(stableJson(payload))
  };
}