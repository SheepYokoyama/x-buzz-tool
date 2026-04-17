import { GoogleGenerativeAI } from '@google/generative-ai';

/** Gemini が返す一時的なエラー（503・高負荷・ネットワーク系）を判定 */
function isTransientGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    lower.includes('service unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('rate limit') ||
    lower.includes('fetch failed') ||
    lower.includes('timeout')
  );
}

/** 指定ミリ秒待機 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gemini 生成を「タイムアウト + 指数バックオフリトライ」で包む。
 * 一時的なエラー（503 など）を自動再試行する。永続エラー・タイムアウト上限到達時は例外を送出。
 *
 * @param apiKey     GEMINI_API_KEY
 * @param modelName  利用するモデル名（例: 'gemini-2.0-flash'）
 * @param systemInstruction  system プロンプト
 * @param prompt     user プロンプト
 * @param options    タイムアウト・リトライ上限の上書き
 */
export async function generateWithGeminiRetry(params: {
  apiKey: string;
  modelName: string;
  systemInstruction: string;
  prompt: string;
  perAttemptTimeoutMs?: number;
  maxAttempts?: number;
}): Promise<string> {
  const {
    apiKey,
    modelName,
    systemInstruction,
    prompt,
    perAttemptTimeoutMs = 20_000,
    maxAttempts = 3,
  } = params;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`gemini timeout after ${perAttemptTimeoutMs}ms`)), perAttemptTimeoutMs),
        ),
      ]);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      const transient = isTransientGeminiError(err);
      console.warn(`[gemini] attempt ${attempt}/${maxAttempts} failed`, {
        transient,
        message: err instanceof Error ? err.message : String(err),
      });
      if (!transient || attempt === maxAttempts) throw err;
      // 指数バックオフ: 1s, 2s, 4s （+ ±25% ジッター）
      const base = 1000 * 2 ** (attempt - 1);
      const jitter = base * 0.25 * (Math.random() * 2 - 1);
      await sleep(Math.round(base + jitter));
    }
  }
  // 到達しないはず
  throw lastErr ?? new Error('gemini unknown error');
}

/** デフォルトで使用する Gemini モデル。安定性重視で 2.0-flash。 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
