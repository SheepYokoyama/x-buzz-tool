import { NextResponse } from 'next/server';
import { getActiveXClient } from '@/lib/x-client';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** X API 呼び出しの最大待ち時間（ミリ秒） */
const TIMEOUT_MS = 3000;

type Reason = 'not_configured' | 'timeout' | 'api_error';

function errorRes(reason: Reason) {
  return NextResponse.json({ followers: null, reason });
}

/**
 * GET /api/x/followers
 * アクティブな X アカウントのフォロワー数を返す。
 * - アクティブ連携がない場合: { followers: null, reason: 'not_configured' }
 * - X API が TIMEOUT_MS を超えた場合: { followers: null, reason: 'timeout' }
 * - その他エラー: { followers: null, reason: 'api_error' }
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const client = await getActiveXClient(user.id);
  if (!client) return errorRes('not_configured');

  try {
    const meCall = client.v2.me({ 'user.fields': ['public_metrics'] });

    // タイムアウト付き race
    const result = await Promise.race([
      meCall.then((r) => ({ ok: true as const, data: r.data })),
      new Promise<{ ok: false; reason: 'timeout' }>((resolve) =>
        setTimeout(() => resolve({ ok: false, reason: 'timeout' }), TIMEOUT_MS),
      ),
    ]);

    if (!result.ok) return errorRes(result.reason);

    const metrics = result.data.public_metrics as { followers_count?: number } | undefined;
    const followers = metrics?.followers_count ?? null;
    return NextResponse.json({ followers, reason: null });
  } catch (err) {
    console.error('GET /api/x/followers error:', err);
    return errorRes('api_error');
  }
}
