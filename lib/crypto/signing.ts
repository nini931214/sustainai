// lib/crypto/signing.ts
import crypto from "node:crypto";

/**
 * 建議用 ENV 放 key（最簡單）
 * - PRIVATE_KEY_PEM：私鑰（PKCS8 PEM）
 * - PUBLIC_KEY_PEM：公鑰（SPKI PEM）可選；沒有也會從私鑰推導
 * - SIGN_KEY_ID：例如 "auditor-v1"
 * - SIGNER_NAME：例如 "ESG Auditor"
 */

function stableJson(obj: any) {
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

export function getKeyId() {
  return process.env.SIGN_KEY_ID || "default";
}

export function getSignerName() {
  return process.env.SIGNER_NAME || "Auditor";
}

export function getPrivateKeyPem(): string | null {
  const pem = process.env.PRIVATE_KEY_PEM;
  return pem && pem.trim() ? pem : null;
}

export function getPublicKeyPem(): string | null {
  const pem = process.env.PUBLIC_KEY_PEM;
  if (pem && pem.trim()) return pem;

  const priv = getPrivateKeyPem();
  if (!priv) return null;

  try {
    const pub = crypto.createPublicKey(priv);
    return pub.export({ type: "spki", format: "pem" }).toString();
  } catch {
    return null;
  }
}

export function signPayload(payload: any): { signature: string; keyId: string; signer: string } | null {
  const priv = getPrivateKeyPem();
  if (!priv) return null;

  const keyId = getKeyId();
  const signer = getSignerName();

  // 讓簽章穩定：hash 的輸入是排序後 JSON 字串
  const message = stableJson(payload);

  // RSA / ECDSA 都可：這裡用 SHA256 + sign/verify（最通用）
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  sign.end();

  const signature = sign.sign(priv).toString("base64");
  return { signature, keyId, signer };
}

export async function verifySignature(payload: any, signatureBase64: string): Promise<boolean> {
  try {
    const pub = getPublicKeyPem();
    if (!pub) return false;

    const message = stableJson(payload);

    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(message);
    verify.end();

    return verify.verify(pub, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}