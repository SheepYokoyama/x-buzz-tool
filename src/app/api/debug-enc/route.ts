import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXClient } from '@/lib/x-client';

/**
 * GET /api/debug-enc
 * X連携の全チェーン診断用（確認後に削除すること）
 */
export async function GET() {
  const key = process.env.ENCRYPTION_KEY ?? '(未設定)';
  const keyPreview = key.slice(0, 4) + '...' + key.slice(-4);

  // ① ENCRYPTION_KEY の動作確認
  let encOk = false;
  try {
    encOk = decrypt(encrypt('test')) === 'test';
  } catch { /* ignore */ }

  // ② DB からアクティブアカウントのトークンを直接取得して復号を試みる
  let dbTokenPreview = '(取得失敗)';
  let decryptOk = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (getSupabaseAdmin() as any)
      .from('x_accounts')
      .select('api_key')
      .eq('is_active', true)
      .single();

    if (data?.api_key) {
      dbTokenPreview = data.api_key.slice(0, 8) + '...'; // 暗号文の先頭
      try {
        const plain = decrypt(data.api_key);
        decryptOk = plain.length > 0;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // ③ X クライアントが生成できるか
  let xClientOk = false;
  try {
    const client = await getActiveXClient();
    xClientOk = client !== null;
  } catch { /* ignore */ }

  // ④ X API 呼び出し
  let xApiUser = null;
  let xApiError = null;
  if (xClientOk) {
    try {
      const client = await getActiveXClient();
      const { data } = await client!.v2.me({ 'user.fields': ['username'] });
      xApiUser = data?.username ?? null;
    } catch (e) {
      xApiError = e instanceof Error ? e.message : String(e);
    }
  }

  // 実際に AES キーとして使われる先頭32文字のハッシュ
  const crypto = await import('crypto');
  const actualKey = key.padEnd(32, '0').slice(0, 32);
  const keyHash = crypto.createHash('sha256').update(actualKey).digest('hex').slice(0, 16);

  return NextResponse.json({
    key_preview: keyPreview,
    key_hash_first32: keyHash, // ローカルとVercelで一致すれば同じキー
    encrypt_decrypt_ok: encOk,
    db_token_preview: dbTokenPreview,
    db_decrypt_ok: decryptOk,
    x_client_ok: xClientOk,
    x_api_user: xApiUser,
    x_api_error: xApiError,
  });
}
