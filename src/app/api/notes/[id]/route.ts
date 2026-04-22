import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/notes/[id] — ノートを更新 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { title, content, tags, is_important } = body as {
      title?: string;
      content?: string;
      tags?: unknown;
      is_important?: boolean;
    };

    // undefined のフィールドは更新対象から除外
    const update: {
      title?: string;
      content?: string;
      tags?: string[];
      is_important?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof title === 'string') update.title = title.trim();
    if (typeof content === 'string') update.content = content;
    if (Array.isArray(tags)) update.tags = tags.map(String);
    if (typeof is_important === 'boolean') update.is_important = is_important;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notes')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ノートの更新に失敗しました';
    console.error('PATCH /api/notes/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/notes/[id] — ノートを削除 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ノートの削除に失敗しました';
    console.error('DELETE /api/notes/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
