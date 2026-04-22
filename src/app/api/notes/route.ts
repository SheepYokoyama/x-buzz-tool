import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

/** GET /api/notes — ログインユーザーのノート一覧 */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ notes: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ノートの取得に失敗しました';
    console.error('GET /api/notes error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/notes — 新規ノートを作成 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { title, content, tags, is_important } = body as {
      title?: string;
      content?: string;
      tags?: unknown;
      is_important?: boolean;
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: title?.trim() || '新規メモ',
        content: content ?? '',
        tags: Array.isArray(tags) ? tags.map(String) : [],
        is_important: Boolean(is_important),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ノートの作成に失敗しました';
    console.error('POST /api/notes error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
