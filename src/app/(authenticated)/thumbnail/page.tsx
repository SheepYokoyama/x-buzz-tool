'use client';

import { useRef, useState } from 'react';
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
} from 'lucide-react';

type Target = 'x' | 'youtube';
type ImagenModel = 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
type UploadRole = 'item' | 'background';

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

  const isComposeMode = uploads.length > 0;

  // アイテム/背景それぞれの順序に応じて A/B/C のラベルを付与（同じロールが1枚なら無印）
  const labelsById = (() => {
    const map = new Map<string, string>();
    const counts = { item: 0, background: 0 };
    const totals = {
      item:       uploads.filter((u) => u.role === 'item').length,
      background: uploads.filter((u) => u.role === 'background').length,
    };
    for (const u of uploads) {
      const idx     = counts[u.role]++;
      const base    = u.role === 'item' ? 'アイテム' : '背景';
      const suffix  = totals[u.role] > 1 ? String.fromCharCode(65 + idx) : '';
      map.set(u.id, `${base}${suffix}`);
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

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement('a');
    a.href = imageDataUrl;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `xpresso-thumbnail-${target}-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
                          style={{
                            background: u.role === 'item' ? 'rgba(167,139,250,0.18)' : 'rgba(34,211,238,0.18)',
                            color:      u.role === 'item' ? '#c4b5fd' : '#67e8f9',
                            border:     u.role === 'item' ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(34,211,238,0.4)',
                          }}
                        >
                          {labelsById.get(u.id)}
                        </span>
                        <p className="text-[12px] text-slate-400 truncate">{u.fileName}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
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
              <div
                className="neon-card p-3"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="生成されたサムネイル"
                  className="w-full h-auto rounded-xl"
                  style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                />
              </div>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  border:     '1px solid rgba(34,211,238,0.3)',
                  color:      '#67e8f9',
                }}
              >
                <Download size={13} />PNG をダウンロード
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
