import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

/** GET /api/personas/active — 現在アクティブなペルソナを返す */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('post_personas')
      .select('id, name, avatar, tone, style, keywords, description')
      .eq('is_active', true)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ persona: data ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '取得に失敗しました';
    console.error('GET /api/personas/active error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
