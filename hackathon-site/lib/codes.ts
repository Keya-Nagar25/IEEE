import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { event } from "./event";

// No 0/O, 1/I/L — codes get read aloud and copied off paper chits.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const BODY_LENGTH = 6;

function secret() {
  const s = process.env.CODE_SECRET;
  if (!s || s.length < 32) throw new Error("CODE_SECRET must be set to at least 32 characters.");
  return s;
}

function deriveKey(label: string) {
  return Buffer.from(hkdfSync("sha256", secret(), "hackathon-login-code", label, 32));
}

/** e.g. HK-X7P2M9 */
export function generateCode() {
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return `${event.codePrefix}-${body}`;
}

/** Accepts "hk x7p2m9", "X7P2M9", "HK-X7P2M9" … and returns "HK-X7P2M9". */
export function normalizeCode(input: string) {
  const prefix = event.codePrefix.toUpperCase();
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.length === prefix.length + BODY_LENGTH && raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  return `${prefix}-${body}`;
}

export function hashCode(code: string) {
  return createHmac("sha256", deriveKey("hash")).update(normalizeCode(code)).digest("hex");
}

export function verifyCode(input: string, storedHash: string) {
  const a = Buffer.from(hashCode(input), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reversible copy so organizers can read a code back to a team that lost it (plan §7). */
export function encryptCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("encrypt"), iv);
  const ct = Buffer.concat([cipher.update(normalizeCode(code), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function decryptCode(enc: string) {
  try {
    const [iv, tag, ct] = enc.split(".").map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", deriveKey("encrypt"), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null; // CODE_SECRET changed since import
  }
}

export function newCredential() {
  const code = generateCode();
  return { code, hash: hashCode(code), enc: encryptCode(code) };
}
