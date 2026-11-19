import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/*
 * Password hashing with Node's built-in scrypt (no native dependencies).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>, so parameters can be raised later
 * without invalidating existing hashes.
 */

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A real hash of a random password: verifying against it costs the same as a real check. */
let dummyHash: Promise<string> | null = null;
export function timingDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

export { PASSWORD_MAX, PASSWORD_MIN, passwordProblem, usernameProblem, USERNAME_PATTERN } from "./password-rules";
