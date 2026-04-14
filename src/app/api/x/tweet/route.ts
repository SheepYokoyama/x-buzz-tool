import { NextResponse } from 'next/server';
import { getActiveXClient } from '@/lib/x-client';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/x/tweet
 * Xに投稿する
 *
 * body: { text: string }
 * response: { tweetId: string; url: string }
 */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const client = await getActiveXClient(user.id);
  if (!client) {
    return NextResponse.json(
      { error: 'X API の認証情報が設定されていません。Xアカウント管理でトークンを登録してください。' },
      { status: 503 }
    );
  }

  const { text } = (await req.json()) as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }

  try {;
    const { data } = await client.v2.tweet(text);

    const tweetId = data.id;
    const url = `https://x.com/i/web/status/${tweetId}`;

    return NextResponse.json({ tweetId, url });
  } catch (err: unknown) {
    console.error('POST /api/x/tweet error:', err);

    // twitter-api-v2 の ApiResponseError から詳細を抽出
    const apiErr = err as {
      code?: number;
      data?: { detail?: string; errors?: { message?: string }[] };
      message?: string;
    };

    const httpCode  = apiErr.code ?? 500;
    const detail    = apiErr.data?.detail
      ?? apiErr.data?.errors?.[0]?.message
      ?? (err instanceof Error ? err.message : '投稿に失敗しました');

    // 重複投稿
    if (detail.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: '同じ内容の投稿は重複して投稿できません。内容を変えてから再試行してください。' }, { status: 422 });
    }
    // 認証エラー
    if (httpCode === 401) {
      return NextResponse.json({ error: 'X API の認証に失敗しました。トークンを確認してください。' }, { status: 401 });
    }
    // 権限 / ポリシー違反
    if (httpCode === 403) {
      const isPermission = detail.toLowerCase().includes('permitted') || detail.toLowerCase().includes('forbidden');
      const msg = isPermission
        ? `投稿が拒否されました（X側の制限）: ${detail}。内容を変えて再試行してください。`
        : `X API 403エラー: ${detail}`;
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    // レート制限
    if (httpCode === 429) {
      return NextResponse.json({ error: 'X API のレート制限に達しました。しばらくお待ちください。' }, { status: 429 });
    }

    return NextResponse.json({ error: detail }, { status: httpCode > 0 ? httpCode : 500 });
  }
}
