import { NextResponse } from 'next/server';
import { syncPublishedMetrics } from '@/lib/metrics-sync';

export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/cron/sync-metrics
 *
 * 全ユーザーの公開済み投稿の X メトリクスを同期する Vercel Cron 用エンドポイント。
 * 手動同期はユーザー認証で分離した /api/metrics/sync を使うこと。
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await syncPublishedMetrics(null);
    console.log(
      `[cron sync-metrics] total=${summary.total} synced=${summary.synced} failed=${summary.failed} skipped=${summary.skipped}`,
    );
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
