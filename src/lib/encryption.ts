/**
 * AES-256-CBC によるトークン暗号化ユーティリティ
 * サーバーサイド専用（Node.js crypto モジュール使用）
 *
 * 環境変数 ENCRYPTION_KEY に 32 文字以上のランダム文字列を設定してください。
 * 例: openssl rand -hex 32
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? '';
  if (!raw) {
    console.warn('[encryption] ENCRYPTION_KEY が未設定です。本番環境では必ず設定してください。');
  }
  // 32バイトに調整（長い場合は切り詰め、短い場合は0パディング）
  return Buffer.from(raw.padEnd(32, '0').slice(0, 32), 'utf8');
}

export function encrypt(plaintext: string): string {
  const iv  = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  if (!ivHex || !encHex) return ciphertext; // 未暗号化テキストはそのまま返す
  const iv  = Buffer.from(ivHex, 'hex');
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

/** トークンをマスク表示 (先頭4文字 + *** + 末尾4文字) */
export function maskToken(token: string | null | undefined): string {
  if (!token) return '';
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
