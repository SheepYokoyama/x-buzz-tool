'use client';

import { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { MissingKeyBanner } from '@/components/ai-keys/MissingKeyBanner';
import { apiFetch } from '@/lib/api-fetch';
import {
  Image as ImageIcon,
  RefreshCw,
  Download,
  Sparkles,
  Zap,
  Gem,
  Upload,
  X as XIcon,
  Package,
  Mountain,
  BadgeCheck,
  Type,
  Plus,
} from 'lucide-react';

type Target = 'x' | 'youtube';
type ImagenModel = 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
type UploadRole = 'item' | 'background' | 'logo';

const ROLE_LABELS: Record<UploadRole, string> = {
  item:       'アイテム',
  background: '背景',
  logo:       'ロゴ',
};

type GridPosition =
  | 'top-left' | 'top' | 'top-right'
  | 'left'    | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

const POSITION_LABEL: Record<GridPosition, string> = {
  'top-left':     '左上', 'top':    '上', 'top-right':    '右上',
  'left':         '左',   'center': '中央', 'right':       '右',
  'bottom-left':  '左下', 'bottom': '下', 'bottom-right': '右下',
};

type TextSize = 'sm' | 'md' | 'lg' | 'xl';
type ConcreteFont = 'sans-jp' | 'rounded-jp' | 'mincho-jp' | 'handwritten-jp' | 'serif-en' | 'sans-en';
type TextFont = ConcreteFont | 'auto';

const TEXT_FONTS: { id: TextFont; label: string; family: string; sample: string }[] = [
  { id: 'auto',           label: 'おまかせ',       family: '"Noto Sans JP", sans-serif',           sample: '✨ AI' },
  { id: 'sans-jp',        label: 'ゴシック',       family: '"Noto Sans JP", sans-serif',           sample: 'あア亜Ag' },
  { id: 'rounded-jp',     label: '丸ゴ',           family: '"M PLUS Rounded 1c", sans-serif',       sample: 'あア亜Ag' },
  { id: 'mincho-jp',      label: '明朝',           family: '"Noto Serif JP", serif',                sample: 'あア亜Ag' },
  { id: 'handwritten-jp', label: '手書き風',       family: '"Yusei Magic", cursive',                sample: 'あア亜Ag' },
  { id: 'serif-en',       label: '英字 Serif',     family: '"Playfair Display", serif',             sample: 'Aa Bb' },
  { id: 'sans-en',        label: '英字 Sans',      family: '"Bebas Neue", sans-serif',              sample: 'AA BB' },
];

const TEXT_SIZES: { id: TextSize; label: string; pctOfWidth: number }[] = [
  { id: 'sm', label: '小',   pctOfWidth: 0.045 },
  { id: 'md', label: '中',   pctOfWidth: 0.072 },
  { id: 'lg', label: '大',   pctOfWidth: 0.110 },
  { id: 'xl', label: '特大', pctOfWidth: 0.165 },
];

interface TextItem {
  id:           string;
  text:         string;
  font:         TextFont;
  size:         TextSize;
  color:        string;
  stroke:       boolean;
  strokeColor:  string;
  position:     GridPosition;
}

const MAX_TEXT_ITEMS = 3;

interface UploadEntry {
  id:        string;
  base64:    string;       // base64 (no data: prefix)
  dataUrl:   string;       // for preview
  mimeType:  string;
  role:      UploadRole;
  fileName:  string;
}

const TARGETS: { id: Target; label: string; emoji: string; desc: string }[] = [
  { id: 'x',       label: 'X 用',       emoji: '𝕏',  desc: 'SNS映え／洗練・余白重視' },
  { id: 'youtube', label: 'YouTube 用', emoji: '▶️', desc: 'クリック誘導／高コントラスト' },
];

const MODELS: { id: ImagenModel; label: string; price: string; icon: typeof Zap; color: string; desc: string }[] = [
  {
    id:    'imagen-4.0-fast-generate-001',
    label: 'Imagen 4 Fast',
    price: '$0.02/枚',
    icon:  Zap,
    color: '#34d399',
    desc:  '速い・安い（試行錯誤向き）',
  },
  {
    id:    'imagen-4.0-generate-001',
    label: 'Imagen 4 Standard',
    price: '$0.04/枚',
    icon:  Gem,
    color: '#a78bfa',
    desc:  '高品質（本番投稿向き）',
  },
];

const MAX_UPLOADS = 3;
const MAX_BYTES   = 5 * 1024 * 1024;
const ACCEPT      = 'image/jpeg,image/png,image/webp';

export default function ThumbnailPage() {
  const [prompt, setPrompt]       = useState('');
  const [target, setTarget]       = useState<Target>('x');
  const [model, setModel]         = useState<ImagenModel>('imagen-4.0-fast-generate-001');
  const [uploads, setUploads]     = useState<UploadEntry[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成後のテキストオーバーレイ
  const [textItems, setTextItems] = useState<TextItem[]>([]);

  // Google Fonts ロード（テキストオーバーレイ用）
  useEffect(() => {
    const href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=M+PLUS+Rounded+1c:wght@400;700&family=Noto+Serif+JP:wght@400;700&family=Yusei+Magic&family=Playfair+Display:wght@400;700&family=Bebas+Neue&display=swap';
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, []);

  const addTextItem = () => {
    if (textItems.length >= MAX_TEXT_ITEMS) return;
    setTextItems((prev) => [
      ...prev,
      {
        id:          crypto.randomUUID(),
        text:        '',
        font:        'sans-jp',
        size:        'md',
        color:       '#ffffff',
        stroke:      true,
        strokeColor: '#000000',
        position:    'bottom',
      },
    ]);
  };
  const updateTextItem = (id: string, patch: Partial<TextItem>) =>
    setTextItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTextItem = (id: string) =>
    setTextItems((prev) => prev.filter((t) => t.id !== id));

  const isComposeMode = uploads.length > 0;

  // 各ロールの順序に応じて A/B/C のラベルを付与（同じロールが1枚なら無印）
  const labelsById = (() => {
    const map = new Map<string, string>();
    const counts: Record<UploadRole, number> = { item: 0, background: 0, logo: 0 };
    const totals: Record<UploadRole, number> = {
      item:       uploads.filter((u) => u.role === 'item').length,
      background: uploads.filter((u) => u.role === 'background').length,
      logo:       uploads.filter((u) => u.role === 'logo').length,
    };
    for (const u of uploads) {
      const idx    = counts[u.role]++;
      const suffix = totals[u.role] > 1 ? String.fromCharCode(65 + idx) : '';
      map.set(u.id, `${ROLE_LABELS[u.role]}${suffix}`);
    }
    return map;
  })();

  const itemLabels       = uploads.filter((u) => u.role === 'item').map((u) => labelsById.get(u.id)!).filter(Boolean);
  const placeholderHint  = uploads.length === 0
    ? '例：朝焼けのビル群を背景に、エネルギッシュにジャンプしているビジネスパーソンのシルエット。配色は紫とオレンジ。'
    : itemLabels.length >= 2
      ? `例：${itemLabels[0]}を左に、${itemLabels[1]}を右に配置。背景は宇宙空間の雰囲気で。配色は紫とオレンジ。`
      : '例：アップロードしたアイテムを中央に配置。背景は宇宙空間の雰囲気で。配色は紫とオレンジ。';

  const handleAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const remaining = MAX_UPLOADS - uploads.length;
    const list = Array.from(files).slice(0, remaining);
    const next: UploadEntry[] = [];

    for (const file of list) {
      if (!ACCEPT.split(',').includes(file.type)) {
        setError(`未対応の画像形式です: ${file.name}（JPEG/PNG/WebPのみ）`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`画像が大きすぎます: ${file.name}（5MB以下にしてください）`);
        continue;
      }
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.split(',')[1] ?? '';
      next.push({
        id:       crypto.randomUUID(),
        base64,
        dataUrl,
        mimeType: file.type,
        role:     'item',
        fileName: file.name,
      });
    }
    if (next.length > 0) setUploads((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateRole = (id: string, role: UploadRole) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));

  const removeUpload = (id: string) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setImageDataUrl(null);
    try {
      const res = await apiFetch('/api/thumbnail', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          target,
          model,
          uploads: uploads.map((u) => ({
            base64:   u.base64,
            mimeType: u.mimeType,
            role:     u.role,
            label:    labelsById.get(u.id) ?? '',
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? '生成に失敗しました');
      const { base64, mimeType } = data.image as { base64: string; mimeType: string };
      setImageDataUrl(`data:${mimeType};base64,${base64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!imageDataUrl) return;
    try {
      setIsExporting(true);

      // 「おまかせ」フォントを実フォントに置換（背景画像をAIに見せて推奨を取得）
      let resolvedItems = textItems;
      const autoIndices = textItems
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.font === 'auto' && t.text.trim());
      if (autoIndices.length > 0) {
        const [, b64] = imageDataUrl.split(',');
        const mime = imageDataUrl.match(/^data:(.*?);/)?.[1] ?? 'image/png';
        const suggestions = await Promise.all(
          autoIndices.map(({ t }) =>
            apiFetch('/api/thumbnail/suggest-font', {
              method: 'POST',
              body: JSON.stringify({ imageBase64: b64, mimeType: mime, text: t.text }),
            })
              .then((r) => r.json())
              .then((d) => (d.font as ConcreteFont) ?? 'sans-jp')
              .catch(() => 'sans-jp' as ConcreteFont),
          ),
        );
        resolvedItems = textItems.map((t) => {
          const idx = autoIndices.findIndex(({ t: tt }) => tt.id === t.id);
          if (idx === -1) return t;
          return { ...t, font: suggestions[idx] };
        });
      }

      const finalUrl = resolvedItems.length > 0
        ? await composeImageWithTexts(imageDataUrl, resolvedItems)
        : imageDataUrl;
      const a = document.createElement('a');
      a.href  = finalUrl;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `xpresso-thumbnail-${target}-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Header title="サムネ生成" subtitle="X / YouTube 用のアイキャッチ画像を AI で生成" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — Input */}
        <div className="space-y-5">
          {/* アップロード画像 */}
          <div className="neon-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-200 leading-none">アップロード画像（任意）</h2>
                <p className="section-label mt-1.5">商品・人物・背景などを最大{MAX_UPLOADS}枚まで</p>
              </div>
              <span className="text-[10px] tabular-nums text-slate-600">{uploads.length}/{MAX_UPLOADS}</span>
            </div>

            {uploads.length > 0 && (
              <div className="space-y-2">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.dataUrl}
                      alt={u.fileName}
                      className="w-14 h-14 rounded-lg shrink-0"
                      style={{ objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0"
                          style={roleChipStyle(u.role)}
                        >
                          {labelsById.get(u.id)}
                        </span>
                        <p className="text-[12px] text-slate-400 truncate">{u.fileName}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <RolePill
                          active={u.role === 'item'}
                          onClick={() => updateRole(u.id, 'item')}
                          icon={Package}
                          label="アイテム"
                          color="#a78bfa"
                        />
                        <RolePill
                          active={u.role === 'background'}
                          onClick={() => updateRole(u.id, 'background')}
                          icon={Mountain}
                          label="背景"
                          color="#22d3ee"
                        />
                        <RolePill
                          active={u.role === 'logo'}
                          onClick={() => updateRole(u.id, 'logo')}
                          icon={BadgeCheck}
                          label="ロゴ"
                          color="#fbbf24"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 shrink-0"
                      title="削除"
                    >
                      <XIcon size={14} style={{ color: '#64748b' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              onChange={(e) => handleAddFiles(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploads.length >= MAX_UPLOADS}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium transition-all"
              style={{
                background: uploads.length >= MAX_UPLOADS ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                border:     '1px dashed rgba(255,255,255,0.15)',
                color:      uploads.length >= MAX_UPLOADS ? '#475569' : '#94a3b8',
                cursor:     uploads.length >= MAX_UPLOADS ? 'not-allowed' : 'pointer',
              }}
            >
              <Upload size={13} />
              {uploads.length >= MAX_UPLOADS ? '上限に達しました' : '画像を追加（JPEG/PNG/WebP・5MB以下）'}
            </button>
          </div>

          {/* プロンプト */}
          <div className="neon-card p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none">プロンプト</h2>
              <p className="section-label mt-1.5">どんな画像を作りたいか日本語または英語で記述</p>
            </div>
            <div>
              <FieldLabel>イメージの内容</FieldLabel>
              <VoiceTextarea
                rows={5}
                value={prompt}
                onValueChange={setPrompt}
                placeholder={placeholderHint}
                appendMode
              />
              <p className="text-[11px] text-slate-600 mt-1.5 text-right">{prompt.length}文字</p>
            </div>
          </div>

          {/* ターゲット */}
          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none">ターゲット</h2>
              <p className="section-label mt-1.5">用途に合わせてスタイルが調整されます</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TARGETS.map(({ id, label, emoji, desc }) => {
                const active = target === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTarget(id)}
                    className="text-left p-3.5 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: active ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.025)',
                      border:     active ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span className="text-lg">{emoji}</span>
                    <p className="text-[13px] font-medium mt-1.5" style={{ color: active ? '#c4b5fd' : '#cbd5e1' }}>
                      {label}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* モデル */}
          <div className="neon-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-200 leading-none">モデル</h2>
                <p className="section-label mt-1.5">
                  {isComposeMode
                    ? 'アップロード時は Gemini 2.5 Flash Image を自動使用'
                    : '速度と品質のトレードオフを選択'}
                </p>
              </div>
              {isComposeMode && (
                <span
                  className="text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap"
                  style={{ color: '#67e8f9', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)' }}
                >
                  自動: Nano Banana
                </span>
              )}
            </div>

            <div
              className={`grid grid-cols-1 gap-2 transition-opacity ${isComposeMode ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {MODELS.map(({ id, label, price, icon: Icon, color, desc }) => {
                const active = model === id;
                return (
                  <button
                    key={id}
                    onClick={() => setModel(id)}
                    className="flex items-center gap-3 text-left p-3.5 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: active ? `${color}15` : 'rgba(255,255,255,0.025)',
                      border:     active ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <Icon size={18} style={{ color: active ? color : '#64748b' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium" style={{ color: active ? color : '#cbd5e1' }}>
                          {label}
                        </p>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums"
                          style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                        >
                          {price}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <MissingKeyBanner provider="gemini" />

            <Button className="w-full justify-center" size="lg" onClick={handleGenerate} disabled={!prompt.trim() || isLoading}>
              {isLoading
                ? <><RefreshCw size={14} className="animate-spin" />生成中…</>
                : <><Sparkles size={14} />サムネを生成</>
              }
            </Button>
            <p className="text-[11px] text-slate-600 text-center">
              アスペクト比 16:9 ・ Gemini API キーで生成（料金は Google 側に課金）
            </p>
          </div>
        </div>

        {/* Right — Result */}
        <div>
          {imageDataUrl ? (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-slate-200">生成結果</p>

              {/* プレビュー（テキストオーバーレイ表示） */}
              <div
                className="neon-card p-3"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div
                  className="relative w-full rounded-xl overflow-hidden"
                  style={{ aspectRatio: '16 / 9', containerType: 'inline-size' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataUrl}
                    alt="生成されたサムネイル"
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: 'cover' }}
                  />
                  {textItems.map((t) => (
                    <TextOverlay key={t.id} item={t} />
                  ))}
                </div>
              </div>

              {/* テキスト追加エディタ */}
              <div className="neon-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type size={14} style={{ color: '#fbbf24' }} />
                    <h3 className="text-[14px] font-semibold text-slate-200">テキストを追加</h3>
                  </div>
                  <span className="text-[10px] tabular-nums text-slate-600">{textItems.length}/{MAX_TEXT_ITEMS}</span>
                </div>

                {textItems.length > 0 && (
                  <div className="space-y-3">
                    {textItems.map((t, idx) => (
                      <TextEditor
                        key={t.id}
                        index={idx}
                        item={t}
                        onChange={(patch) => updateTextItem(t.id, patch)}
                        onRemove={() => removeTextItem(t.id)}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={addTextItem}
                  disabled={textItems.length >= MAX_TEXT_ITEMS}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{
                    background: textItems.length >= MAX_TEXT_ITEMS ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    border:     '1px dashed rgba(255,255,255,0.15)',
                    color:      textItems.length >= MAX_TEXT_ITEMS ? '#475569' : '#94a3b8',
                    cursor:     textItems.length >= MAX_TEXT_ITEMS ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Plus size={12} />
                  {textItems.length >= MAX_TEXT_ITEMS ? `上限${MAX_TEXT_ITEMS}個に達しました` : 'テキストを追加'}
                </button>
              </div>

              <button
                onClick={handleDownload}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  border:     '1px solid rgba(34,211,238,0.3)',
                  color:      isExporting ? '#475569' : '#67e8f9',
                }}
              >
                {isExporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                {isExporting ? '書き出し中…' : 'PNG をダウンロード'}
              </button>
            </div>
          ) : (
            <div className="neon-card h-full flex items-center justify-center" style={{ minHeight: 320 }}>
              <EmptyState
                icon={ImageIcon}
                title={isLoading ? '生成中…' : 'サムネがここに表示されます'}
                description={isLoading
                  ? (isComposeMode
                      ? 'Gemini 2.5 Flash Image が画像を合成しています（最大数十秒）'
                      : 'Imagen が画像を生成しています（最大数十秒）')
                  : 'プロンプトを入力してターゲットとモデルを選択してください'}
                iconColor="#22d3ee"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const ROLE_CHIP_COLORS: Record<UploadRole, { bg: string; fg: string; border: string }> = {
  item:       { bg: 'rgba(167,139,250,0.18)', fg: '#c4b5fd', border: 'rgba(167,139,250,0.4)' },
  background: { bg: 'rgba(34,211,238,0.18)',  fg: '#67e8f9', border: 'rgba(34,211,238,0.4)'  },
  logo:       { bg: 'rgba(251,191,36,0.18)',  fg: '#fcd34d', border: 'rgba(251,191,36,0.4)'  },
};

function roleChipStyle(role: UploadRole) {
  const c = ROLE_CHIP_COLORS[role];
  return {
    background: c.bg,
    color:      c.fg,
    border:     `1px solid ${c.border}`,
  };
}

// ── テキストオーバーレイ ─────────────────────────────────────

function fontFamilyOf(font: TextFont): string {
  return TEXT_FONTS.find((f) => f.id === font)?.family ?? '"Noto Sans JP", sans-serif';
}

function sizePctOf(size: TextSize): number {
  return TEXT_SIZES.find((s) => s.id === size)?.pctOfWidth ?? 0.072;
}

function alignOf(pos: GridPosition): 'left' | 'center' | 'right' {
  if (pos.endsWith('left')) return 'left';
  if (pos.endsWith('right')) return 'right';
  return 'center';
}

/** プレビュー用：HTMLオーバーレイ（cqwベース） */
function TextOverlay({ item }: { item: TextItem }) {
  const family    = fontFamilyOf(item.font);
  const sizeCqw   = `${sizePctOf(item.size) * 100}cqw`;
  const align     = alignOf(item.position);
  const margin    = '4cqw';
  const isVMid    = item.position === 'left' || item.position === 'center' || item.position === 'right';
  const isVTop    = item.position.startsWith('top');
  const isHCenter = align === 'center';
  const isHLeft   = align === 'left';

  const positionStyle: React.CSSProperties = {
    position:   'absolute',
    fontFamily: family,
    fontWeight: 700,
    fontSize:   sizeCqw,
    color:      item.color,
    lineHeight: 1.15,
    whiteSpace: 'pre-wrap',
    textAlign:  align,
    pointerEvents: 'none',
    textShadow: item.stroke
      ? `-2px -2px 0 ${item.strokeColor}, 2px -2px 0 ${item.strokeColor}, -2px 2px 0 ${item.strokeColor}, 2px 2px 0 ${item.strokeColor}, 0 0 4px ${item.strokeColor}`
      : 'none',
    maxWidth:   '92%',
  };

  if (isVTop)  positionStyle.top    = margin;
  if (!isVTop && !isVMid) positionStyle.bottom = margin;
  if (isVMid)  positionStyle.top    = '50%';
  if (isHLeft)   positionStyle.left  = margin;
  if (align === 'right') positionStyle.right = margin;
  if (isHCenter) {
    positionStyle.left      = '50%';
    positionStyle.transform = isVMid ? 'translate(-50%, -50%)' : 'translateX(-50%)';
  } else if (isVMid) {
    positionStyle.transform = 'translateY(-50%)';
  }

  return <div style={positionStyle}>{item.text || ' '}</div>;
}

/** Canvas 合成（ダウンロード用） */
async function composeImageWithTexts(imageDataUrl: string, items: TextItem[]): Promise<string> {
  await document.fonts.ready;

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload  = () => resolve(i);
    i.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    i.src = imageDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context が取得できませんでした');

  ctx.drawImage(img, 0, 0);

  for (const item of items) {
    if (!item.text.trim()) continue;
    drawTextOnCanvas(ctx, item, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/png');
}

function drawTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  item: TextItem,
  w: number,
  h: number,
): void {
  const fontSizePx = sizePctOf(item.size) * w;
  const family     = fontFamilyOf(item.font);
  const margin     = w * 0.04;
  const lineHeight = fontSizePx * 1.15;
  const lines      = item.text.split('\n');

  ctx.font         = `bold ${fontSizePx}px ${family}`;
  ctx.textAlign    = alignOf(item.position);
  ctx.textBaseline = 'top';

  // X座標（基準点）
  let x: number;
  if (ctx.textAlign === 'left')   x = margin;
  else if (ctx.textAlign === 'right') x = w - margin;
  else                             x = w / 2;

  // Y座標（最初の行の上端）
  let y0: number;
  const blockHeight = lineHeight * lines.length;
  if (item.position.startsWith('top')) {
    y0 = margin;
  } else if (item.position === 'left' || item.position === 'center' || item.position === 'right') {
    y0 = h / 2 - blockHeight / 2;
  } else {
    y0 = h - margin - blockHeight;
  }

  // 縁取り
  if (item.stroke) {
    ctx.strokeStyle = item.strokeColor;
    ctx.lineWidth   = Math.max(2, fontSizePx * 0.10);
    ctx.lineJoin    = 'round';
    ctx.miterLimit  = 2;
    lines.forEach((line, idx) => ctx.strokeText(line, x, y0 + idx * lineHeight));
  }

  // 塗り
  ctx.fillStyle = item.color;
  lines.forEach((line, idx) => ctx.fillText(line, x, y0 + idx * lineHeight));
}

// ── テキストエディタ ───────────────────────────────────────

function TextEditor({
  index,
  item,
  onChange,
  onRemove,
}: {
  index:    number;
  item:     TextItem;
  onChange: (patch: Partial<TextItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">テキスト {index + 1}</span>
        <button
          onClick={onRemove}
          className="p-1 rounded-md transition-colors hover:bg-red-500/10"
          title="削除"
        >
          <XIcon size={12} style={{ color: '#64748b' }} />
        </button>
      </div>

      <textarea
        value={item.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={2}
        placeholder="ここに文字を入力（改行可）"
        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[rgba(251,191,36,0.4)] resize-none leading-relaxed"
      />

      {/* フォント */}
      <div>
        <p className="text-[10px] text-slate-500 mb-1">フォント</p>
        <div className="grid grid-cols-3 gap-1">
          {TEXT_FONTS.map(({ id, label, family, sample }) => {
            const active = item.font === id;
            return (
              <button
                key={id}
                onClick={() => onChange({ font: id })}
                className="text-left p-1.5 rounded-md transition-all"
                style={{
                  background: active ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.02)',
                  border:     active ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p
                  className="text-[13px]"
                  style={{ fontFamily: family, fontWeight: 700, color: active ? '#fcd34d' : '#cbd5e1' }}
                >
                  {sample}
                </p>
                <p className="text-[9px] text-slate-600 leading-tight">{label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* サイズ */}
      <div>
        <p className="text-[10px] text-slate-500 mb-1">サイズ</p>
        <div className="grid grid-cols-4 gap-1">
          {TEXT_SIZES.map(({ id, label }) => {
            const active = item.size === id;
            return (
              <button
                key={id}
                onClick={() => onChange({ size: id })}
                className="py-1.5 rounded-md text-[11px] font-semibold transition-all"
                style={{
                  background: active ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.02)',
                  border:     active ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  color:      active ? '#fcd34d' : '#cbd5e1',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 色 + 縁取り */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-[10px] text-slate-500 shrink-0">文字色</span>
          <input
            type="color"
            value={item.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer bg-transparent"
            style={{ border: 'none', padding: 0 }}
          />
          <span className="text-[10px] text-slate-400 tabular-nums uppercase">{item.color}</span>
        </label>

        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer"
          style={{
            background: item.stroke ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.025)',
            border:     item.stroke ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <input
            type="checkbox"
            checked={item.stroke}
            onChange={(e) => onChange({ stroke: e.target.checked })}
            className="w-3.5 h-3.5 rounded accent-amber-400 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 shrink-0">縁取り</span>
          <input
            type="color"
            value={item.strokeColor}
            onChange={(e) => onChange({ strokeColor: e.target.value })}
            disabled={!item.stroke}
            className="w-6 h-6 rounded cursor-pointer bg-transparent disabled:opacity-30"
            style={{ border: 'none', padding: 0 }}
          />
        </label>
      </div>

      {/* 配置（ドットで位置を示すコンパクト 3x3 セレクタ） */}
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-slate-500 shrink-0">配置</p>
        <div
          className="inline-grid grid-cols-3 gap-0.5 p-1 rounded-md"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(Object.keys(POSITION_LABEL) as GridPosition[]).map((pos) => {
            const active = item.position === pos;
            return (
              <button
                key={pos}
                onClick={() => onChange({ position: pos })}
                className="w-6 h-6 rounded relative transition-all"
                style={{
                  background: active ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.03)',
                  border:     active ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.05)',
                }}
                title={POSITION_LABEL[pos]}
                aria-label={POSITION_LABEL[pos]}
              >
                <PositionDot position={pos} active={active} />
              </button>
            );
          })}
        </div>
        <span className="text-[10px] text-slate-500 ml-auto tabular-nums">
          {POSITION_LABEL[item.position]}
        </span>
      </div>
    </div>
  );
}

/** 各セルの中で position に応じた位置に小さな点を描画 */
function PositionDot({ position, active }: { position: GridPosition; active: boolean }) {
  const map: Record<GridPosition, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
    'top-left':     { top: '15%',  left: '15%' },
    'top':          { top: '15%',  left: '50%', transform: 'translateX(-50%)' },
    'top-right':    { top: '15%',  right: '15%' },
    'left':         { top: '50%',  left: '15%', transform: 'translateY(-50%)' },
    'center':       { top: '50%',  left: '50%', transform: 'translate(-50%, -50%)' },
    'right':        { top: '50%',  right: '15%', transform: 'translateY(-50%)' },
    'bottom-left':  { bottom: '15%', left: '15%' },
    'bottom':       { bottom: '15%', left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: '15%', right: '15%' },
  };
  const p = map[position];
  return (
    <span
      className="absolute block rounded-full"
      style={{
        width:  6,
        height: 6,
        background: active ? '#fcd34d' : '#64748b',
        ...p,
      }}
    />
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

function RolePill({
  active,
  onClick,
  icon: Icon,
  label,
  color,
}: {
  active:  boolean;
  onClick: () => void;
  icon:    typeof Package;
  label:   string;
  color:   string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-all"
      style={{
        background: active ? `${color}1a` : 'rgba(255,255,255,0.04)',
        border:     active ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.08)',
        color:      active ? color : '#94a3b8',
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}
