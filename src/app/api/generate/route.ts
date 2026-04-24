import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { SchemaType, type Schema } from '@google/generative-ai';
import type { GenerateInput, GeneratedPattern } from '@/lib/types';
import { getAuthUser } from '@/lib/auth';
import { generateWithGeminiRetry, DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL } from '@/lib/gemini';
import { getUserAIKey } from '@/lib/ai-keys';

export const maxDuration = 60;

const PATTERN_COUNT = 2;

const PATTERN_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    patterns: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          titleIdea: { type: SchemaType.STRING },
          hook:      { type: SchemaType.STRING },
          body:      { type: SchemaType.STRING },
          cta:       { type: SchemaType.STRING, nullable: true },
          hashtags:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['titleIdea', 'hook', 'body', 'hashtags'],
      },
    },
  },
  required: ['patterns'],
};

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const input = (await req.json()) as GenerateInput;

  const effectiveTheme = input.theme.trim() || input.selectedTopic.trim();
  if (!effectiveTheme) {
    return NextResponse.json({ error: 'テーマを入力してください' }, { status: 400 });
  }

  // ユーザー登録済み API キーを取得（BYOK）
  const apiKey = await getUserAIKey(user.id, input.provider === 'anthropic' ? 'anthropic' : 'gemini');
  if (!apiKey) {
    const providerLabel = input.provider === 'anthropic' ? 'Anthropic' : 'Gemini';
    return NextResponse.json(
      {
        error: `${providerLabel} API キーが未登録です。「AI API キー」ページから登録してください。`,
        errorCode: 'api_key_missing',
        provider: input.provider,
      },
      { status: 400 },
    );
  }

  try {
    const patterns =
      input.provider === 'anthropic'
        ? await generateWithAnthropic(apiKey, input, effectiveTheme)
        : await generateWithGemini(apiKey, input, effectiveTheme);

    return NextResponse.json({ patterns });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Anthropic APIキーが無効です' }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'レート制限に達しました。しばらく待ってから再試行してください' }, { status: 429 });
    }
    // Gemini 503 / 一時的な高負荷
    const errMsg = err instanceof Error ? err.message : '';
    if (errMsg.includes('503') || errMsg.toLowerCase().includes('service unavailable') || errMsg.toLowerCase().includes('high demand')) {
      return NextResponse.json({ error: 'サーバーが一時的に混雑しています。しばらく待ってから再試行してください。' }, { status: 503 });
    }
    console.error('Generate error:', err);
    return NextResponse.json({ error: errMsg || '生成中にエラーが発生しました' }, { status: 500 });
  }
}

// ── Anthropic ──────────────────────────────────────────────────────────────

async function generateWithAnthropic(apiKey: string, input: GenerateInput, theme: string): Promise<GeneratedPattern[]> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: buildSystem(input),
    messages: [{ role: 'user', content: buildPrompt(input, theme) }],
  });

  const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';
  return parsePatterns(rawText);
}

// ── Gemini ─────────────────────────────────────────────────────────────────

async function generateWithGemini(apiKey: string, input: GenerateInput, theme: string): Promise<GeneratedPattern[]> {
  const rawText = await generateWithGeminiRetry({
    apiKey,
    modelName: DEFAULT_GEMINI_MODEL,
    fallbackModelName: FALLBACK_GEMINI_MODEL,
    systemInstruction: buildSystem(input),
    prompt: buildPrompt(input, theme),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: PATTERN_SCHEMA,
      // 2 パターン × body(最大25,000cnt≒12,500字≒12,500token) + JSON 足回り分の余裕を確保
      maxOutputTokens: 8192,
      temperature: 0.9,
    },
  });
  return parsePatterns(rawText);
}

// ── 共通ユーティリティ ─────────────────────────────────────────────────────

function parsePatterns(rawText: string): GeneratedPattern[] {
  // JSON モード時は純粋な JSON が返る。念のため ```json ... ``` も剥がす
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const jsonMatch = cleaned.startsWith('{') ? cleaned : cleaned.match(/(\{[\s\S]*\})/)?.[1];
  if (!jsonMatch) {
    console.error('No JSON found in response:', rawText);
    throw new Error('AI応答の解析に失敗しました');
  }
  const parsed = JSON.parse(jsonMatch) as { patterns: GeneratedPattern[] };
  return parsed.patterns;
}

function buildSystem(input: GenerateInput): string {
  const base = 'あなたはXのバズ投稿専門家です。指定された条件のJSONスキーマに沿って出力します。';
  return input.personaDescription
    ? `${base}\nペルソナ: ${input.personaDescription}`
    : base;
}

function buildPrompt(input: GenerateInput, theme: string): string {
  const { target, purpose, tone, maxLength, hasCta, xLimit } = input;

  const purposeMap: Record<string, string> = {
    awareness:   '認知拡大',
    engagement:  'エンゲージメント向上',
    followers:   'フォロワー増加',
    promotion:   '商品・サービス告知',
  };
  const purposeLabel = purposeMap[purpose] ?? purpose;
  const totalLimit   = xLimit ?? 280;
  const targetLine   = target || '指定なし（テーマから自然に想定される層）';
  const ctaNote      = hasCta ? 'CTAを文末に1行追加' : 'CTA不要（cta は null）';

  return `X投稿を${PATTERN_COUNT}パターン生成。各パターンは異なる切り口にする。

【条件】
テーマ: ${theme}
ターゲット: ${targetLine}
目的: ${purposeLabel} / トーン: ${tone} / ${ctaNote}

【文字数ルール（厳守）】
全角=2cnt・半角=1cnt。body+CTA+hashtags合計≤${totalLimit}cnt、bodyは${maxLength}cnt以内。

【バズの鉄則】
冒頭で数字/問いかけ/驚きを入れてスクロールを止める。具体的な数字・体験を入れ、「自分のことだ」と思わせる。改行で読みやすく。

出力スキーマ:
{
  "patterns": [
    { "titleIdea": "核心メッセージ20字", "hook": "冒頭フック", "body": "投稿本文（${maxLength}cnt以内）", "cta": "CTA or null", "hashtags": ["タグ1","タグ2","タグ3"] }
  ]
}`;
}
