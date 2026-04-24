import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { encrypt, decrypt, maskToken } from '@/lib/encryption';

export type AIProvider = 'gemini' | 'anthropic';

export interface AIKeyRow {
  provider:   AIProvider;
  keyMasked:  string;
  createdAt:  string;
  updatedAt:  string;
}

export type VerifyErrorCode = 'invalid_key' | 'rate_limit' | 'network' | 'unknown';

export interface VerifyResult {
  ok: boolean;
  errorCode?: VerifyErrorCode;
  error?:     string;
}

const VERIFY_TIMEOUT_MS = 10_000;

/** ログインユーザーの登録済みキー一覧（マスク済み） */
export async function listUserAIKeys(userId: string): Promise<AIKeyRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from('user_ai_keys')
    .select('provider, encrypted_key, created_at, updated_at')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    provider:  row.provider as AIProvider,
    keyMasked: maskToken(tryDecrypt(row.encrypted_key)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** サーバー側で API 呼び出し用に平文の API キーを取り出す */
export async function getUserAIKey(
  userId: string,
  provider: AIProvider,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('user_ai_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();
  if (!data?.encrypted_key) return null;
  try {
    return decrypt(data.encrypted_key);
  } catch {
    return null;
  }
}

/** 登録または更新（upsert）。保存前にキーの有効性を検証する。 */
export async function upsertUserAIKey(
  userId: string,
  provider: AIProvider,
  apiKey: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from('user_ai_keys')
    .upsert(
      {
        user_id:       userId,
        provider,
        encrypted_key: encrypt(apiKey),
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );
  if (error) throw new Error(error.message);
}

export async function deleteUserAIKey(userId: string, provider: AIProvider): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from('user_ai_keys')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);
  if (error) throw new Error(error.message);
}

/** 与えられた API キーが有効かを実際の軽量 API 呼び出しで検証 */
export async function verifyAIKey(provider: AIProvider, apiKey: string): Promise<VerifyResult> {
  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), VERIFY_TIMEOUT_MS),
      );
      await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'ok' }] }],
          generationConfig: { maxOutputTokens: 1, temperature: 0 },
        }),
        timeout,
      ]);
      return { ok: true };
    }

    // anthropic
    const client = new Anthropic({ apiKey });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), VERIFY_TIMEOUT_MS),
    );
    await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
      timeout,
    ]);
    return { ok: true };
  } catch (err) {
    return classifyVerifyError(err);
  }
}

function classifyVerifyError(err: unknown): VerifyResult {
  const message = err instanceof Error ? err.message : String(err);
  const lower   = message.toLowerCase();
  const status  = (err as { status?: number; code?: number })?.status
               ?? (err as { code?: number })?.code;

  if (message === 'timeout' || lower.includes('fetch failed') || lower.includes('econnrefused')) {
    return {
      ok: false,
      errorCode: 'network',
      error: 'API への接続がタイムアウトしました。時間をおいて再試行してください。',
    };
  }
  if (status === 401 || lower.includes('api key') || lower.includes('unauthorized') || lower.includes('permission_denied') || lower.includes('api_key_invalid')) {
    return {
      ok: false,
      errorCode: 'invalid_key',
      error: 'API キーが無効です。プロバイダのコンソールでキーを再発行してください。',
    };
  }
  if (status === 429 || lower.includes('rate limit')) {
    return {
      ok: false,
      errorCode: 'rate_limit',
      error: 'API のレート制限に達しました。しばらく待ってから再試行してください。',
    };
  }
  return {
    ok: false,
    errorCode: 'unknown',
    error: `API キーの検証に失敗しました: ${message}`,
  };
}

function tryDecrypt(s: string): string {
  try { return decrypt(s); } catch { return s; }
}
