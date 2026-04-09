import { NextResponse } from 'next/server';
import { getXClient, isXConfigured } from '@/lib/x-client';

/**
 * POST /api/x/tweet
 * Xに投稿する
 *
 * body: { text: string }
 * response: { tweetId: string; url: string }
 */
export async function POST(req: Request) {
  if (!isXConfigured()) {
    return NextResponse.json(
      { error: 'X API の認証情報が設定されていません。.env.local を確認してください。' },
      { status: 503 }
    );
  }

  const { text } = (await req.json()) as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }
  if (text.length > 280) {
    return NextResponse.json({ error: '投稿テキストが280文字を超えています' }, { status: 400 });
  }

  try {
    const client = getXClient()!;
    const { data } = await client.v2.tweet(text);

    const tweetId = data.id;
    const url = `https://x.com/i/web/status/${tweetId}`;

    return NextResponse.json({ tweetId, url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '投稿に失敗しました';
    console.error('POST /api/x/tweet error:', err);

    // X API エラーコードに応じたメッセージ
    if (message.includes('401') || message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'X API の認証に失敗しました。トークンを確認してください。' }, { status: 401 });
    }
    if (message.includes('403') || message.includes('Forbidden')) {
      return NextResponse.json({ error: 'X API の権限が不足しています。アプリの権限を "Read and Write" に設定してください。' }, { status: 403 });
    }
    if (message.includes('429') || message.includes('Too Many Requests')) {
      return NextResponse.json({ error: 'X API のレート制限に達しました。しばらくお待ちください。' }, { status: 429 });
    }
    if (message.includes('duplicate')) {
      return NextResponse.json({ error: '同じ内容の投稿は重複して投稿できません。' }, { status: 422 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
