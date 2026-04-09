import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export async function PATCH(req: Request) {
  try {
    const { id } = (await req.json()) as { id: string };
    if (!id) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // 全ペルソナを非アクティブ → 指定IDのみアクティブ
    const { error: resetError } = await supabase
      .from('post_personas')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .not('id', 'is', null);  // 全行対象（id は NOT NULL なので必ず全行マッチ）

    if (resetError) throw resetError;

    const { data, error: activateError } = await supabase
      .from('post_personas')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
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
