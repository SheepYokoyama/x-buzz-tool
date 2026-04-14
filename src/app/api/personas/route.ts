import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

/** POST /api/personas — 新規ペルソナを作成 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const body = await req.json();
    const { name, avatar, tone, style, keywords, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'ペルソナ名は必須です' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('post_personas')
      .insert({
        name: name.trim(),
        avatar: avatar?.trim() || '🙂',
        tone: tone?.trim() || '',
        style: style?.trim() || '',
        keywords: Array.isArray(keywords) ? keywords : [],
        description: description?.trim() || '',
        is_active: false,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ persona: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ペルソナの作成に失敗しました';
    console.error('POST /api/personas error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
