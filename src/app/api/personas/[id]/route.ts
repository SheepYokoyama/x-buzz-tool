import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/personas/[id] — ペルソナを更新 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, avatar, tone, style, keywords, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'ペルソナ名は必須です' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('post_personas')
      .update({
        name: name.trim(),
        avatar: avatar?.trim() || '🙂',
        tone: tone?.trim() || '',
        style: style?.trim() || '',
        keywords: Array.isArray(keywords) ? keywords : [],
        description: description?.trim() || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ persona: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ペルソナの更新に失敗しました';
    console.error('PATCH /api/personas/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/personas/[id] — ペルソナを削除 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('post_personas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ペルソナの削除に失敗しました';
    console.error('DELETE /api/personas/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
