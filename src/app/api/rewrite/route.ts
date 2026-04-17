import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { AiProvider } from '@/lib/types';
import { getAuthUser } from '@/lib/auth';
import { generateWithGeminiRetry, DEFAULT_GEMINI_MODEL } from '@/lib/gemini';

export const maxDuration = 60;

interface PersonaInfo {
  name: string;
  tone: string;
  style: string;
  keywords: string[];
  description: string;
}

interface RewriteInput {
  originalText: string;
  style: string;
  provider: AiProvider;
  persona?: PersonaInfo;  // style === 'persona' のとき使用
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  x_summary: 'X（旧Twitter）への投稿用に140文字以内に要約してください。インパクトのある冒頭、核心メッセージ、必要であれば行動を促す一言の構成にしてください。ハッシュタグは含めないでください。必ず140文字以内に収めてください。',
  shorter:   '元の投稿を140文字以内に圧縮してください。重要なメッセージだけを残し、冗長な表現を削除してください。',
  emotional: '感情・共感を強めたトーンにリライトしてください。読者の感情に訴えかけ、「自分のことだ」と感じさせる表現にしてください。',
  numbered:  '箇条書き（番号付きリスト）形式にリライトしてください。情報を整理して読みやすくしてください。絵文字も活用してください。',
  hook:      '冒頭の1文（フック）を強化してリライトしてください。スクロールを止めるような強力な書き出しにしてください。',
  casual:    'カジュアルで親しみやすいトーンにリライトしてください。友達に話しかけるような自然な口語表現にしてください。',
  authority: '実績・数字・権威感を前面に出したトーンにリライトしてください。信頼性を高め、説得力のある表現にしてください。',
};

function buildPersonaInstruction(persona: PersonaInfo): string {
  const parts = [
    `ペルソナ「${persona.name}」として投稿をリライトしてください。`,
    persona.description ? `【キャラクター】${persona.description}` : '',
    persona.tone        ? `【トーン】${persona.tone}` : '',
    persona.style       ? `【文体・スタイル】${persona.style}` : '',
    persona.keywords?.length
      ? `【よく使うキーワード・言い回し】${persona.keywords.join('、')}`
      : '',
    'このペルソナが自然に書くような口調・視点・表現でリライトしてください。内容のエッセンスは保ちながら、そのペルソナらしい語り口にしてください。',
  ];
  return parts.filter(Boolean).join('\n');
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { originalText, style, provider, persona } = (await req.json()) as RewriteInput;

  if (!originalText?.trim()) {
    return NextResponse.json({ error: '元の投稿を入力してください' }, { status: 400 });
  }

  if (style === 'persona' && !persona) {
    return NextResponse.json({ error: 'ペルソナが選択されていません' }, { status: 400 });
  }

  const styleInstruction =
    style === 'persona' && persona
      ? buildPersonaInstruction(persona)
      : (STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.shorter);

  try {
    const rewritten =
      provider === 'anthropic'
        ? await rewriteWithAnthropic(originalText, styleInstruction)
        : await rewriteWithGemini(originalText, styleInstruction);

    return NextResponse.json({ text: rewritten });
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
    console.error('Rewrite error:', err);
    return NextResponse.json({ error: errMsg || 'リライト中にエラーが発生しました' }, { status: 500 });
  }
}

async function rewriteWithAnthropic(originalText: string, styleInstruction: string): Promise<string> {
  const apiKey = process.env.MEGA_BUZZ_AI_KEY;
  if (!apiKey) throw new Error('MEGA_BUZZ_AI_KEY が設定されていません');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: 'あなたはXのバズ投稿専門家です。与えられた投稿テキストを指示に従ってリライトします。リライト後のテキストのみを出力してください。前置きや説明は一切不要です。',
    messages: [
      {
        role: 'user',
        content: `以下の投稿テキストをリライトしてください。\n\n【リライト指示】\n${styleInstruction}\n\n【元の投稿】\n${originalText}`,
      },
    ],
  });

  return message.content.find((b) => b.type === 'text')?.text.trim() ?? '';
}

async function rewriteWithGemini(originalText: string, styleInstruction: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');

  const rawText = await generateWithGeminiRetry({
    apiKey,
    modelName: DEFAULT_GEMINI_MODEL,
    systemInstruction: 'あなたはXのバズ投稿専門家です。与えられた投稿テキストを指示に従ってリライトします。リライト後のテキストのみを出力してください。前置きや説明は一切不要です。',
    prompt: `以下の投稿テキストをリライトしてください。\n\n【リライト指示】\n${styleInstruction}\n\n【元の投稿】\n${originalText}`,
  });
  return rawText.trim();
}
