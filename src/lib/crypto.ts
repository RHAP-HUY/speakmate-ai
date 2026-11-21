import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer | null {
  const secret = process.env.APP_ENCRYPTION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return null;
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function isServerEncryptionAvailable(): boolean {
  return getEncryptionKey() !== null;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      'APP_ENCRYPTION_SECRET chưa được cấu hình (tối thiểu 16 ký tự) để mã hóa API key trên server.'
    );
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error('APP_ENCRYPTION_SECRET chưa được cấu hình để giải mã API key.');
  }
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('Định dạng dữ liệu mã hóa không hợp lệ.');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 10) {
    return '****';
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}
