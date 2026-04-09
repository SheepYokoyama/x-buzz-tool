import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

/** GET /api/personas/active — 現在アクティブなペルソナを返す */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('post_personas')
      .select('id, name, avatar, tone, style, keywords, description')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ persona: data ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '取得に失敗しました';
    console.error('GET /api/personas/active error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
