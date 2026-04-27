import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { AiProvider } from '@/lib/types';
import { getAuthUser } from '@/lib/auth';
import { generateWithGeminiRetry, DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL } from '@/lib/gemini';
import { getUserAIKey } from '@/lib/ai-keys';

export const maxDuration = 60;

interface HashtagInput {
  text: string;
  provider: AiProvider;
  count?: number;
}

const SYSTEM_PROMPT =
  'あなたはX（旧Twitter）のSNSマーケ専門家です。投稿テキストから、リーチが伸びやすい一般的で検索されやすいハッシュタグを提案します。出力はハッシュタグのみで、前置き・説明・記号・引用符は一切付けないでください。';

function buildPrompt(text: string, count: number): string {
  return `以下のXポスト用テキストから、リーチが伸びそうなハッシュタグを${count}個提案してください。

【ルール】
- 各ハッシュタグは「#」始まりの1単語（スペース・記号なし）
- 日本語または英語、どちらでもOK
- 投稿の主要トピックを表す、検索されやすい一般的なタグを優先
- ニッチすぎる/長すぎるタグは避ける（10文字以内目安）
- 1行に1つ、ハッシュタグだけを出力（説明や前置き不要）
- 重複なし

【テキスト】
${text}`;
}

function parseHashtags(raw: string, count: number): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // 行頭の番号・記号・引用符などを除去
      const cleaned = line.replace(/^[\s\d.\-)*"'`「『【]+/, '').trim();
      // 最初の#から始まるトークンを抽出
      const match = cleaned.match(/#[^\s#,、，。"'`」』】\\]+/);
      return match ? match[0] : '';
    })
    .filter((tag) => tag.length >= 2);

  // 重複除去
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tag of lines) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(tag);
    }
    if (unique.length >= count) break;
  }
  return unique;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { text, provider, count } = (await req.json()) as HashtagInput;
  const tagCount = Math.min(Math.max(count ?? 2, 1), 5);

  if (!text?.trim()) {
    return NextResponse.json({ error: 'テキストが空です' }, { status: 400 });
  }

  const apiKey = await getUserAIKey(user.id, provider === 'anthropic' ? 'anthropic' : 'gemini');
  if (!apiKey) {
    const providerLabel = provider === 'anthropic' ? 'Anthropic' : 'Gemini';
    return NextResponse.json(
      {
        error: `${providerLabel} API キーが未登録です。「AI API キー」ページから登録してください。`,
        errorCode: 'api_key_missing',
        provider,
      },
      { status: 400 },
    );
  }

  try {
    const raw =
      provider === 'anthropic'
        ? await generateWithAnthropic(apiKey, text, tagCount)
        : await generateWithGemini(apiKey, text, tagCount);

    const hashtags = parseHashtags(raw, tagCount);
    return NextResponse.json({ hashtags });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Anthropic APIキーが無効です' }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'レート制限に達しました。しばらく待ってから再試行してください' }, { status: 429 });
    }
    const errMsg = err instanceof Error ? err.message : '';
    if (errMsg.includes('503') || errMsg.toLowerCase().includes('service unavailable') || errMsg.toLowerCase().includes('high demand')) {
      return NextResponse.json({ error: 'サーバーが一時的に混雑しています。しばらく待ってから再試行してください。' }, { status: 503 });
    }
    console.error('Hashtag generation error:', err);
    return NextResponse.json({ error: errMsg || 'ハッシュタグ生成に失敗しました' }, { status: 500 });
  }
}

async function generateWithAnthropic(apiKey: string, text: string, count: number): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(text, count) }],
  });
  return message.content.find((b) => b.type === 'text')?.text.trim() ?? '';
}

async function generateWithGemini(apiKey: string, text: string, count: number): Promise<string> {
  const raw = await generateWithGeminiRetry({
    apiKey,
    modelName: DEFAULT_GEMINI_MODEL,
    fallbackModelName: FALLBACK_GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    prompt: buildPrompt(text, count),
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.7,
    },
  });
  return raw.trim();
}
