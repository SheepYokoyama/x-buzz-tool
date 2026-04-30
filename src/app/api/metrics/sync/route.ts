import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { syncPublishedMetrics } from '@/lib/metrics-sync';

export const maxDuration = 60;

/**
 * POST /api/metrics/sync
 *
 * 認証済みユーザー自身の公開済み投稿のメトリクスを同期する。
 * ダッシュボードの「メトリクス同期」ボタンから呼び出される。
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const summary = await syncPublishedMetrics(user.id);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '同期に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
