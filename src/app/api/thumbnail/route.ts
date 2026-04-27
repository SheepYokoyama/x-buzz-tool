import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserAIKey } from '@/lib/ai-keys';

export const maxDuration = 60;

type Target = 'x' | 'youtube';
type ImagenModel = 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
type UploadRole  = 'item' | 'background' | 'logo';
type LogoStyle    = 'simple' | 'badge' | 'ribbon' | 'monogram' | 'handwritten' | 'emblem';
type LogoPosition = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
type LogoSize     = 'small' | 'medium' | 'large';

interface LogoConfig {
  text:     string;
  style:    LogoStyle;
  position: LogoPosition;
  size:     LogoSize;
}

const LOGO_STYLE_DESC: Record<LogoStyle, string> = {
  simple:      'clean modern sans-serif text logo, minimalist',
  badge:       'circular or shield-shaped emblem badge with the text inside',
  ribbon:      'ribbon-banner / tape style with the text on the band',
  monogram:    'stylized monogram or initial mark, geometric',
  handwritten: 'natural handwritten / calligraphy script logo',
  emblem:      'classic heraldic emblem, ornamental crest',
};

const LOGO_POSITION_DESC: Record<LogoPosition, string> = {
  'top-left':     'top-left corner',
  'top':          'top center',
  'top-right':    'top-right corner',
  'left':         'middle-left edge',
  'center':       'center',
  'right':        'middle-right edge',
  'bottom-left':  'bottom-left corner',
  'bottom':       'bottom center',
  'bottom-right': 'bottom-right corner',
};

const LOGO_SIZE_DESC: Record<LogoSize, string> = {
  small:  'small (about 6-8% of the image width)',
  medium: 'medium (about 12-15% of the image width)',
  large:  'large (about 22-28% of the image width)',
};

const GEMINI_IMAGE_MODEL          = 'gemini-2.5-flash-image';
const GEMINI_IMAGE_FALLBACK_MODEL = 'gemini-2.5-flash-image-preview';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOADS   = 3;
const MAX_INLINE_BYTES = 5 * 1024 * 1024; // 5MB / image

interface UploadedImage {
  base64:   string;
  mimeType: string;
  role:     UploadRole;
  /** クライアント側で計算された表示ラベル（例：「アイテムA」「背景」）。プロンプト内の参照名と一致させる */
  label?:   string;
}

interface ThumbnailInput {
  prompt:   string;
  target:   Target;
  model:    ImagenModel;
  uploads?: UploadedImage[];
  logo?:    LogoConfig;
}

function buildLogoDirective(logo: LogoConfig): string {
  const styleDesc    = LOGO_STYLE_DESC[logo.style]       ?? LOGO_STYLE_DESC.simple;
  const positionDesc = LOGO_POSITION_DESC[logo.position] ?? LOGO_POSITION_DESC['top-right'];
  const sizeDesc     = LOGO_SIZE_DESC[logo.size]         ?? LOGO_SIZE_DESC.small;
  return `Add a ${styleDesc} that reads exactly "${logo.text}". Place it at the ${positionDesc} of the image, ${sizeDesc}. The logo must be clearly readable, well-rendered, with the exact spelling and casing as given. Keep it visually distinct from the rest of the scene (use contrast or a subtle background plate if needed).`;
}

function isValidLogo(logo: unknown): logo is LogoConfig {
  if (!logo || typeof logo !== 'object') return false;
  const l = logo as Partial<LogoConfig>;
  if (typeof l.text !== 'string' || !l.text.trim()) return false;
  if (!['simple', 'badge', 'ribbon', 'monogram', 'handwritten', 'emblem'].includes(l.style as string)) return false;
  if (!['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'].includes(l.position as string)) return false;
  if (!['small', 'medium', 'large'].includes(l.size as string)) return false;
  return true;
}

const TARGET_SUFFIX: Record<Target, string> = {
  x:       'X (Twitter) post header image, clean composition, eye-catching, modern and stylish, balanced negative space',
  youtube: 'YouTube thumbnail style, high contrast, dramatic lighting, click-worthy, bold colors, attention-grabbing focal point',
};

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { prompt, target, model, uploads, logo } = (await req.json()) as ThumbnailInput;

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
    if (u.role !== 'item' && u.role !== 'background' && u.role !== 'logo') {
      return NextResponse.json({ error: 'アップロード画像の役割が不正です' }, { status: 400 });
    }
    // base64 のおおよそのバイト数 = length * 3/4
    if (u.base64.length * 0.75 > MAX_INLINE_BYTES) {
      return NextResponse.json({ error: '画像が大きすぎます（1枚あたり最大5MB）' }, { status: 400 });
    }
  }

  const safeLogo: LogoConfig | null = logo && isValidLogo(logo) ? logo : null;

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
      const result = await generateWithGeminiImage(apiKey, prompt, target, safeUploads, safeLogo);
      return NextResponse.json({ image: result, mode: 'gemini-image' });
    }
    const result = await generateWithImagen(apiKey, prompt, target, model, safeLogo);
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
  logo: LogoConfig | null,
): Promise<{ base64: string; mimeType: string }> {
  const logoLine   = logo ? `\n\n${buildLogoDirective(logo)}` : '';
  const fullPrompt = `${prompt.trim()}\n\nStyle: ${TARGET_SUFFIX[target]}${logoLine}`;
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
  logo: LogoConfig | null,
): Promise<{ base64: string; mimeType: string }> {
  const ROLE_LABEL_BASE: Record<UploadRole, string> = { item: 'アイテム', background: '背景', logo: 'ロゴ' };

  // ロール別のサーバー側フォールバックラベル（クライアントが label を送らない場合に備える）
  const roleCounters: Record<UploadRole, number> = { item: 0, background: 0, logo: 0 };
  const roleTotals: Record<UploadRole, number> = {
    item:       uploads.filter((u) => u.role === 'item').length,
    background: uploads.filter((u) => u.role === 'background').length,
    logo:       uploads.filter((u) => u.role === 'logo').length,
  };
  const labeled = uploads.map((u) => {
    if (u.label?.trim()) return { ...u, displayLabel: u.label.trim() };
    const idx    = roleCounters[u.role]++;
    const suffix = roleTotals[u.role] > 1 ? String.fromCharCode(65 + idx) : '';
    return { ...u, displayLabel: `${ROLE_LABEL_BASE[u.role]}${suffix}` };
  });

  const itemList = labeled.filter((u) => u.role === 'item').map((u) => u.displayLabel).join(', ');
  const bgList   = labeled.filter((u) => u.role === 'background').map((u) => u.displayLabel).join(', ');
  const logoList = labeled.filter((u) => u.role === 'logo').map((u) => u.displayLabel).join(', ');

  const directives: string[] = [];
  if (itemList) {
    directives.push(`Items (${itemList}): each labeled image must be incorporated prominently and remain clearly recognizable. Do not distort the product/subject. When the user prompt references a label by name (e.g. "${labeled.find((u) => u.role === 'item')?.displayLabel}"), use the corresponding image.`);
  }
  if (bgList) {
    directives.push(`Background (${bgList}): use as the backdrop or scene reference.`);
  }
  if (logoList) {
    directives.push(`Logo (${logoList}): place as a small overlay (typically a corner). Keep the original logo design crisp and undistorted, preserve transparency if present, do not crop, do not redraw the logo.`);
  }
  if (logo) {
    directives.push(buildLogoDirective(logo));
  }
  directives.push(`Output a single 16:9 landscape thumbnail.`);
  directives.push(`Style: ${TARGET_SUFFIX[target]}.`);

  const parts: Array<Record<string, unknown>> = [
    { text: `User prompt:\n${prompt.trim()}\n\n${directives.join('\n')}\n\nReference images follow (each image is preceded by its label name):` },
  ];
  for (const u of labeled) {
    parts.push({ text: `Label: 「${u.displayLabel}」` });
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
