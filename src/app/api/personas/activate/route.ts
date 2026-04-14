import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const { id } = (await req.json()) as { id: string };
    if (!id) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();

    // 該当ユーザーの全ペルソナを非アクティブ → 指定IDのみアクティブ
    const { error: resetError } = await supabase
      .from('post_personas')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (resetError) throw resetError;

    const { data, error: activateError } = await supabase
      .from('post_personas')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (activateError) throw activateError;

    return NextResponse.json({ persona: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ペルソナの切り替えに失敗しました';
    console.error('activate persona error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
