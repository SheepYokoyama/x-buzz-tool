import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserAIKey } from '@/lib/ai-keys';

export const maxDuration = 30;

type FontId = 'sans-jp' | 'rounded-jp' | 'mincho-jp' | 'handwritten-jp' | 'serif-en' | 'sans-en';

const VALID_FONTS: FontId[] = ['sans-jp', 'rounded-jp', 'mincho-jp', 'handwritten-jp', 'serif-en', 'sans-en'];

const FONT_DESCRIPTIONS = `
- sans-jp: modern gothic / neutral / clean (good for tech, news, business)
- rounded-jp: rounded / friendly / playful (good for lifestyle, cute, casual)
- mincho-jp: serif / formal / elegant (good for traditional, premium, gourmet)
- handwritten-jp: handwritten brush / casual (good for emotional, personal, food)
- serif-en: English serif / sophisticated (only when text is mostly English)
- sans-en: bold English sans / impactful (only when text is mostly English/numbers)
`.trim();

interface Body {
  imageBase64: string;
  mimeType:    string;
  text:        string;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { imageBase64, mimeType, text } = (await req.json()) as Body;

  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: '画像が指定されていません' }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'テキストが指定されていません' }, { status: 400 });
  }

  const apiKey = await getUserAIKey(user.id, 'gemini');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API キーが未登録です', errorCode: 'api_key_missing', provider: 'gemini' },
      { status: 400 },
    );
  }

  const prompt = `あなたはサムネイル制作のフォント選択専門家です。以下の画像と、その上に乗せるテキスト「${text.trim()}」に最も合うフォントを下記から1つだけ選んでください。

【選択肢】
${FONT_DESCRIPTIONS}

【ルール】
- 画像のテイスト（カラー・雰囲気・主題）とテキストのトーンを考慮する
- テキストが日本語を含むなら必ず日本語フォント（sans-jp / rounded-jp / mincho-jp / handwritten-jp）から選ぶ
- 必ず JSON で回答する: {"font": "<id>"}
- id は上のリストの1つだけ。説明や前置きは一切不要。`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model:             'gemini-2.5-flash',
      systemInstruction: 'You output only a single JSON object: {"font": "<id>"}.',
      generationConfig:  { maxOutputTokens: 50, temperature: 0.3, responseMimeType: 'application/json' },
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 15_000),
    );

    const result = await Promise.race([
      model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: imageBase64, mimeType } },
          ],
        }],
      }),
      timeout,
    ]);

    const raw = result.response.text();

    let font: FontId = 'sans-jp';
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.font === 'string' && VALID_FONTS.includes(parsed.font as FontId)) {
        font = parsed.font as FontId;
      }
    } catch {
      const match = raw.match(/(sans-jp|rounded-jp|mincho-jp|handwritten-jp|serif-en|sans-en)/);
      if (match) font = match[1] as FontId;
    }
    return NextResponse.json({ font });
  } catch (err) {
    console.error('suggest-font error:', err);
    // 失敗時は無難な既定値で返す（ダウンロードを止めない）
    return NextResponse.json({ font: 'sans-jp' as FontId, fallback: true });
  }
}
