import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  type AIProvider,
  upsertUserAIKey,
  deleteUserAIKey,
  verifyAIKey,
} from '@/lib/ai-keys';

type Params = { params: Promise<{ provider: string }> };

function parseProvider(raw: string): AIProvider | null {
  return raw === 'gemini' || raw === 'anthropic' ? raw : null;
}

/**
 * PUT /api/ai-keys/[provider]
 * body: { apiKey: string }
 * キーを検証し、通ったら暗号化して upsert。
 */
export async function PUT(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { provider: rawProvider } = await params;
  const provider = parseProvider(rawProvider);
  if (!provider) {
    return NextResponse.json({ error: '対応していないプロバイダです' }, { status: 400 });
  }

  const body = (await req.json()) as { apiKey?: string };
  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'API キーを入力してください' }, { status: 400 });
  }

  // 保存前に検証
  const verified = await verifyAIKey(provider, apiKey);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error, errorCode: verified.errorCode },
      { status: verified.errorCode === 'invalid_key' ? 401 : 400 },
    );
  }

  try {
    await upsertUserAIKey(user.id, provider, apiKey);
    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '保存に失敗しました' },
      { status: 500 },
    );
  }
}

/** DELETE /api/ai-keys/[provider] */
export async function DELETE(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { provider: rawProvider } = await params;
  const provider = parseProvider(rawProvider);
  if (!provider) {
    return NextResponse.json({ error: '対応していないプロバイダです' }, { status: 400 });
  }

  try {
    await deleteUserAIKey(user.id, provider);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '削除に失敗しました' },
      { status: 500 },
    );
  }
}
