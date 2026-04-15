import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import type { GenerateInput, GeneratedPattern } from '@/lib/types';
import { getAuthUser } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const input = (await req.json()) as GenerateInput;

  const effectiveTheme = input.theme.trim() || input.selectedTopic.trim();
  if (!effectiveTheme) {
    return NextResponse.json({ error: 'テーマを入力してください' }, { status: 400 });
  }

  try {
    const patterns =
      input.provider === 'anthropic'
        ? await generateWithAnthropic(input, effectiveTheme)
        : await generateWithGemini(input, effectiveTheme);

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

async function generateWithAnthropic(input: GenerateInput, theme: string): Promise<GeneratedPattern[]> {
  const apiKey = process.env.MEGA_BUZZ_AI_KEY;
  if (!apiKey) {
    throw new Error('MEGA_BUZZ_AI_KEY が設定されていません。.env.local を確認してください。');
  }

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

async function generateWithGemini(input: GenerateInput, theme: string): Promise<GeneratedPattern[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。.env.local を確認してください。');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystem(input),
  });

  const result = await model.generateContent(buildPrompt(input, theme));
  const rawText = result.response.text();
  return parsePatterns(rawText);
}

// ── 共通ユーティリティ ─────────────────────────────────────────────────────

function parsePatterns(rawText: string): GeneratedPattern[] {
  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)```/) ??
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    console.error('No JSON found in response:', rawText);
    throw new Error('AI応答の解析に失敗しました');
  }

  const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]) as { patterns: GeneratedPattern[] };
  return parsed.patterns;
}

function buildSystem(input: GenerateInput): string {
  const base = `あなたはXのバズ投稿専門家です。指定された条件に基づき、必ずJSON形式のみで回答します。
JSONの前後に説明文・前置き・コードブロック記法は一切不要です。純粋なJSONオブジェクトのみ出力してください。`;

  if (input.personaDescription) {
    return `${base}\n\nペルソナ設定: ${input.personaDescription}`;
  }
  return base;
}

function buildPrompt(input: GenerateInput, theme: string): string {
  const { target, purpose, tone, maxLength, hasCta, xLimit } = input;

  const purposeMap: Record<string, string> = {
    awareness:   '認知拡大（新しい読者に届ける）',
    engagement:  'エンゲージメント向上（いいね・RT・返信を増やす）',
    followers:   'フォロワー増加（フォローしてもらう）',
    promotion:   '商品・サービス告知',
  };
  const purposeLabel = purposeMap[purpose] ?? purpose;

  const ctaNote = hasCta
    ? 'CTAを文末に追加する（例：「フォローお願いします」「コメントで教えてください」など）'
    : 'CTAは不要。cta フィールドは null にすること';

  const totalLimit = xLimit ?? 280;

  return `以下の条件でX投稿を3パターン生成してください。

【X文字カウントルール（厳守）】
・全角文字（ひらがな・カタカナ・漢字・全角記号）= 2カウント
・半角文字（英数字・半角スペース・半角記号）= 1カウント
・body + CTA + ハッシュタグ の合計カウントが必ず${totalLimit}cnt以内に収まること（絶対条件）
・bodyのカウントは${maxLength}cnt以内を目標とする

【条件】
・テーマ: ${theme}
・ターゲット読者: ${target || '副業・情報発信に興味がある20〜40代'}
・目的: ${purposeLabel}
・トーン: ${tone}
・CTA: ${ctaNote}

【バズる投稿の鉄則】
1. 冒頭1〜2行でスクロールを止める（数字・問いかけ・驚きの事実）
2. 具体的な数字・期間・体験を入れる
3. 読者が「自分のことだ」と思える切り口
4. 改行・箇条書きで読みやすくする
5. 各パターンは異なるアプローチ・切り口にする

【文字数の考え方】
・日本語（全角）は1文字=2カウントなので、全角文字のみの場合body上限は約${Math.floor(maxLength / 2)}文字
・ハッシュタグ3個で約30〜50cnt消費することを考慮して本文を調整すること
・合計${totalLimit}cntを超える投稿は X に投稿できないため、必ずカウント内に収めること

以下の JSON スキーマで3パターン分を出力してください:

{
  "patterns": [
    {
      "titleIdea": "この投稿の核心メッセージ（20字以内）",
      "hook": "冒頭フック（スクロールを止める最初の1〜2行）",
      "body": "本文（冒頭フックを含む投稿テキスト全体。CTAとハッシュタグは含めない。全角換算で${maxLength}cnt以内）",
      "cta": "CTA文 または null",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
    },
    { },
    { }
  ]
}`;
}
