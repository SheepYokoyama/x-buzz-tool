import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * GET /api/debug-enc
 * ENCRYPTION_KEY の動作確認用（確認後に削除すること）
 */
export async function GET() {
  const key = process.env.ENCRYPTION_KEY ?? '(未設定)';
  const keyLength = key.length;
  const keyPreview = key.slice(0, 4) + '...' + key.slice(-4);

  try {
    const testText = 'hello';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    const ok = decrypted === testText;

    return NextResponse.json({
      key_length: keyLength,
      key_preview: keyPreview,
      encrypt_decrypt_ok: ok,
    });
  } catch (err) {
    return NextResponse.json({
      key_length: keyLength,
      key_preview: keyPreview,
      encrypt_decrypt_ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
