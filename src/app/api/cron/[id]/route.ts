import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

function isAuthorized(req: Request): boolean {
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

/** PATCH /api/cron/[id] — 投稿ステータスを更新（published / failed） */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status: string = body.status ?? 'published';

  if (status !== 'published' && status !== 'failed' && status !== 'cancelled') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { status };
  if (status === 'published') update.published_at = new Date().toISOString();
  if (body.x_post_id)    update.x_post_id    = body.x_post_id;
  if (body.x_post_url)   update.x_post_url   = body.x_post_url;
  if (body.x_account_id) update.x_account_id = body.x_account_id;

  const { data, error } = await supabase
    .from('scheduled_posts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
