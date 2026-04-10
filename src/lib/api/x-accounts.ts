import type { XAccount } from '@/lib/types';

export async function getXAccounts(): Promise<XAccount[]> {
  const { getSupabaseServer } = await import('@/lib/supabase');
  const { maskToken, decrypt } = await import('@/lib/encryption');

  const supabase = getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('x_accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  function tryDecrypt(s: string): string {
    try { return decrypt(s); } catch { return s; }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id:                   row.id,
    name:                 row.name,
    username:             row.username ?? null,
    api_key_masked:       maskToken(row.api_key ? tryDecrypt(row.api_key) : null),
    api_secret_masked:    maskToken(row.api_secret ? tryDecrypt(row.api_secret) : null),
    access_token_masked:  maskToken(row.access_token ? tryDecrypt(row.access_token) : null),
    access_secret_masked: maskToken(row.access_secret ? tryDecrypt(row.access_secret) : null),
    bearer_token_masked:  row.bearer_token ? maskToken(tryDecrypt(row.bearer_token)) : null,
    is_active:            row.is_active,
    created_at:           row.created_at,
    updated_at:           row.updated_at,
  }));
}
