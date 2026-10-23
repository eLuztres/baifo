import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt$';
const SALT_BYTES = 16;
const KEY_BYTES = 64;
// OWASP's scrypt minimum for 16 MiB of memory. Stored hashes don't record these,
// so changing them needs a new prefix.
const SCRYPT_OPTIONS = { N: 2 ** 14, r: 8, p: 5 };

function deriveKey(plainPassword: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plainPassword, salt, KEY_BYTES, SCRYPT_OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key)
    );
  });
}

// Accounts created before the switch to scrypt: unsalted HMAC-SHA256 keyed with ENCRYPTION_KEY.
function legacyHash(plainPassword: string): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set, so passwords from before the scrypt switch cannot be checked');
  }
  return createHmac('sha256', key).update(plainPassword).digest();
}

function isSameBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Hashes a password as 'scrypt$<salt>$<hash>' (hex), with a random salt per password. */
export const hash = async (plainPassword: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(plainPassword, salt);
  return `${SCRYPT_PREFIX}${salt.toString('hex')}$${key.toString('hex')}`;
};

/** True for hashes from before the switch to scrypt: re-hash them after a successful sign-in. */
export const needsRehash = (storedHash: string): boolean => !storedHash.startsWith(SCRYPT_PREFIX);

export const compare = async (plainPassword: string, storedHash: string): Promise<boolean> => {
  if (needsRehash(storedHash)) {
    return isSameBytes(legacyHash(plainPassword), Buffer.from(storedHash, 'hex'));
  }

  const [salt, key] = storedHash.slice(SCRYPT_PREFIX.length).split('$');
  if (!salt || !key) return false;

  const expected = Buffer.from(key, 'hex');
  const actual = await deriveKey(plainPassword, Buffer.from(salt, 'hex'));
  return isSameBytes(actual, expected);
};
