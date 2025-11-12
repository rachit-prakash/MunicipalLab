import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// this helper file creates some helper functions to encrypt and decrypt data.

const KEY_ENV_VAR = 'TOKEN_VAULT_KEY'; // the environment variable that contains the key.
const IV_LENGTH = 12; // the length of the initialization vector.
const TAG_LENGTH = 16; // the length of the authentication tag.
const EXPECTED_KEY_LENGTH = 32; // the expected length of the key.

// this is how AES-256-GCM works:
// 1. The key is used to encrypt the data.
// 2. The initialization vector is used to encrypt the data.
// 3. The authentication tag is used to verify the integrity of the data.
// 4. The data is encrypted and authenticated.
// 5. The data is decrypted and authenticated.

// we're using symmetric encryption because javascript bundles won't return anything related to the token so it is near impossible to reverse engineer the token.
let cachedKey: Buffer | null = null; // this is a cached key to avoid re-reading the environment variable every time.

function getVaultKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const rawKey = process.env[KEY_ENV_VAR];
  if (!rawKey) {
    throw new Error(`Environment variable ${KEY_ENV_VAR} is required for TokenVault.`);
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(rawKey, 'base64');
  } catch (error) {
    throw new Error(`${KEY_ENV_VAR} must be valid base64.`);
  }

  if (decoded.length !== EXPECTED_KEY_LENGTH) {
    throw new Error(`${KEY_ENV_VAR} must decode to ${EXPECTED_KEY_LENGTH} bytes.`);
  }

  cachedKey = decoded;
  return cachedKey;
}

// the function that encrypts the refresh token.
export function seal(plain: string): Buffer {
  if (typeof plain !== 'string') {
    throw new Error('TokenVault.seal expects a string.');
  }

  const key = getVaultKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]);
}

// decrypts the refresh token.
export function open(blob: Buffer): string {
  if (!Buffer.isBuffer(blob)) {
    throw new Error('TokenVault.open expects a Buffer.');
  }

  if (blob.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('TokenVault.open received malformed payload (too short).');
  }

  const key = getVaultKey();

  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

