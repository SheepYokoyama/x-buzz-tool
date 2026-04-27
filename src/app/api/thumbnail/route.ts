import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserAIKey } from '@/lib/ai-keys';

export const maxDuration = 60;

type Target = 'x' | 'youtube';
type ImagenModel = 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
type UploadRole  = 'item' | 'background';

const GEMINI_IMAGE_MODEL          = 'gemini-2.5-flash-image';
const GEMINI_IMAGE_FALLBACK_MODEL = 'gemini-2.5-flash-image-preview';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOADS   = 3;
const MAX_INLINE_BYTES = 5 * 1024 * 1024; // 5MB / image

interface UploadedImage {
  base64:   string;
  mimeType: string;
  role:     UploadRole;
}

interface ThumbnailInput {
  prompt:   string;
  target:   Target;
  model:    ImagenModel;
  uploads?: UploadedImage[];
}

const TARGET_SUFFIX: Record<Target, string> = {
  x:       'X (Twitter) post header image, clean composition, eye-catching, modern and stylish, balanced negative space',
  youtube: 'YouTube thumbnail style, high contrast, dramatic lighting, click-worthy, bold colors, attention-grabbing focal point',
};

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { prompt, target, model, uploads } = (await req.json()) as ThumbnailInput;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'プロンプトを入力してください' }, { status: 400 });
  }
  if (target !== 'x' && target !== 'youtube') {
    return NextResponse.json({ error: 'target が不正です' }, { status: 400 });
  }
  if (model !== 'imagen-4.0-generate-001' && model !== 'imagen-4.0-fast-generate-001') {
    return NextResponse.json({ error: 'model が不正です' }, { status: 400 });
  }

  const safeUploads = Array.isArray(uploads) ? uploads.filter((u) => u && u.base64 && u.mimeType) : [];
  if (safeUploads.length > MAX_UPLOADS) {
    return NextResponse.json({ error: `アップロード画像は最大${MAX_UPLOADS}枚までです` }, { status: 400 });
  }
  for (const u of safeUploads) {
    if (!ALLOWED_MIMES.includes(u.mimeType)) {
      return NextResponse.json({ error: `画像形式が未対応です: ${u.mimeType}` }, { status: 400 });
    }
    if (u.role !== 'item' && u.role !== 'background') {
      return NextResponse.json({ error: 'アップロード画像の役割が不正です' }, { status: 400 });
    }
    // base64 のおおよそのバイト数 = length * 3/4
    if (u.base64.length * 0.75 > MAX_INLINE_BYTES) {
      return NextResponse.json({ error: '画像が大きすぎます（1枚あたり最大5MB）' }, { status: 400 });
    }
  }

  const apiKey = await getUserAIKey(user.id, 'gemini');
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Gemini API キーが未登録です。「AI API キー」ページから登録してください。',
        errorCode: 'api_key_missing',
        provider: 'gemini',
      },
      { status: 400 },
    );
  }

  try {
    // アップロードがあれば Gemini Image（Nano Banana）、無ければ Imagen
    if (safeUploads.length > 0) {
      const result = await generateWithGeminiImage(apiKey, prompt, target, safeUploads);
      return NextResponse.json({ image: result, mode: 'gemini-image' });
    }
    const result = await generateWithImagen(apiKey, prompt, target, model);
    return NextResponse.json({ image: result, mode: 'imagen' });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: '生成がタイムアウトしました。再試行してください。' }, { status: 504 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Thumbnail generation error:', err);
    const message = err instanceof Error ? err.message : '画像生成中にエラーが発生しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function generateWithImagen(
  apiKey: string,
  prompt: string,
  target: Target,
  model: ImagenModel,
): Promise<{ base64: string; mimeType: string }> {
  const fullPrompt = `${prompt.trim()}\n\nStyle: ${TARGET_SUFFIX[target]}`;
  const endpoint   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 50_000);

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances:  [{ prompt: fullPrompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' },
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) throw await classifyApiError(res, 'Imagen');

  const data       = await res.json();
  const prediction = Array.isArray(data?.predictions) ? data.predictions[0] : null;
  const base64     = prediction?.bytesBase64Encoded;
  const mimeType   = prediction?.mimeType ?? 'image/png';

  if (!base64) {
    const reason = prediction?.raiFilteredReason ?? data?.error?.message;
    throw new HttpError(422, reason ? `生成がブロックされました: ${reason}` : '画像が生成されませんでした。プロンプトを変えて再試行してください。');
  }
  return { base64, mimeType };
}

async function generateWithGeminiImage(
  apiKey: string,
  prompt: string,
  target: Target,
  uploads: UploadedImage[],
): Promise<{ base64: string; mimeType: string }> {
  const items       = uploads.filter((u) => u.role === 'item');
  const backgrounds = uploads.filter((u) => u.role === 'background');

  const directives: string[] = [];
  if (items.length > 0) {
    directives.push(`The image${items.length > 1 ? 's' : ''} labeled [Item] must be incorporated prominently and remain clearly recognizable (do not distort the product/subject).`);
  }
  if (backgrounds.length > 0) {
    directives.push(`The image${backgrounds.length > 1 ? 's' : ''} labeled [Background] should be used as the backdrop or scene reference.`);
  }
  directives.push(`Output a single 16:9 landscape thumbnail.`);
  directives.push(`Style: ${TARGET_SUFFIX[target]}.`);

  const parts: Array<Record<string, unknown>> = [
    { text: `User prompt:\n${prompt.trim()}\n\n${directives.join('\n')}\n\nReference images follow:` },
  ];
  for (const u of uploads) {
    parts.push({ text: u.role === 'item' ? '[Item]' : '[Background]' });
    parts.push({ inline_data: { mime_type: u.mimeType, data: u.base64 } });
  }

  const body = JSON.stringify({
    contents:         [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  });

  // primary が見つからない / 未対応の場合は fallback モデル名で再試行
  const res = await callGeminiImageEndpoint(apiKey, GEMINI_IMAGE_MODEL, body, async (status, message) => {
    const isModelMissing =
      status === 404 ||
      /not\s*found/i.test(message) ||
      /not\s*supported/i.test(message) ||
      /unsupported/i.test(message);
    if (!isModelMissing) return null;
    return callGeminiImageEndpoint(apiKey, GEMINI_IMAGE_FALLBACK_MODEL, body);
  });

  if (!res.ok) throw await classifyApiError(res, 'Gemini Image');

  const data         = await res.json();
  const candidate    = data?.candidates?.[0];
  const responseParts = candidate?.content?.parts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imagePart    = responseParts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
  const inline       = imagePart?.inlineData ?? imagePart?.inline_data;

  if (!inline?.data) {
    const reason = candidate?.finishReason ?? data?.error?.message;
    throw new HttpError(422, reason ? `生成がブロックされました: ${reason}` : '画像が生成されませんでした。プロンプトを変えて再試行してください。');
  }
  return { base64: inline.data, mimeType: inline.mimeType ?? inline.mime_type ?? 'image/png' };
}

async function callGeminiImageEndpoint(
  apiKey: string,
  modelName: string,
  body: string,
  onError?: (status: number, message: string) => Promise<Response | null>,
): Promise<Response> {
  const endpoint   = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 50_000);

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal:  controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok && onError) {
    const peek    = await res.clone().text();
    let message   = peek;
    try {
      const errJson = JSON.parse(peek);
      message = errJson?.error?.message ?? peek;
    } catch { /* keep raw */ }
    const fallback = await onError(res.status, message);
    if (fallback) return fallback;
  }
  return res;
}

async function classifyApiError(res: Response, label: string): Promise<HttpError> {
  const errText = await res.text();
  let message = errText;
  try {
    const errJson = JSON.parse(errText);
    message = errJson?.error?.message ?? errText;
  } catch { /* keep raw */ }

  if (res.status === 401 || res.status === 403 || /api[_ ]?key/i.test(message)) {
    return new HttpError(401, `Gemini API キーが無効、または ${label} 利用権限がありません`);
  }
  if (res.status === 429) {
    return new HttpError(429, 'レート制限に達しました。しばらく待ってから再試行してください');
  }
  if (res.status === 503) {
    return new HttpError(503, `${label} サーバーが一時的に混雑しています。しばらく待ってから再試行してください。`);
  }
  console.error(`${label} error:`, res.status, message);
  return new HttpError(res.status, message || '画像生成に失敗しました');
}
