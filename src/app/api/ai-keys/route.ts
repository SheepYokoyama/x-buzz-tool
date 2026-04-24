import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listUserAIKeys } from '@/lib/ai-keys';

/** GET /api/ai-keys — ログインユーザーの登録済みキー一覧（マスク済み） */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const keys = await listUserAIKeys(user.id);
    return NextResponse.json({ keys });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '取得に失敗しました' },
      { status: 500 },
    );
  }
}
