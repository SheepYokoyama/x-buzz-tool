'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { PostPreview } from './PostPreview';
import {
  splitPosts,
  stripManualSplitMarkers,
  hasManualSplitMarker,
  MANUAL_SPLIT_MARKER,
  type SplitMode,
} from '@/lib/post-splitter';
import { countXChars } from '@/lib/x-char-count';
import { apiFetch } from '@/lib/api-fetch';
import { useSettings } from '@/contexts/SettingsContext';
import {
  PenLine,
  Send,
  RefreshCw,
  MessageSquare,
  SplitSquareHorizontal,
  Hash,
  Sparkles,
  AlignLeft,
  AlertTriangle,
  Scissors,
  ImagePlus,
  X as XIcon,
} from 'lucide-react';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const LIMIT_OPTIONS = [
  { value: 140, label: '140カウント', note: '無料（全角70字 / 半角140字）' },
  { value: 280, label: '280カウント', note: 'X 標準（全角140字 / 半角280字）' },
  { value: 25000, label: '25,000カウント', note: 'Premium / Basic（長文投稿）' },
];

export function PostCreateClient() {
  const { xUser } = useSettings();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SplitMode>('thread');
  // ユーザーが LIMIT_OPTIONS で明示的に選んだ値。null の間はプランから自動判定。
  const [maxCountOverride, setMaxCountOverride] = useState<number | null>(null);
  const [numbering, setNumbering] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像のプレビュー URL を生成し、unmount / 入れ替え時に解放
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const incoming = Array.from(list);
    const errs: string[] = [];
    const accepted: File[] = [];
    for (const f of incoming) {
      if (!ALLOWED_IMAGE_MIMES.includes(f.type)) {
        errs.push(`${f.name}: 非対応の形式（${f.type || '不明'}）`);
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        errs.push(`${f.name}: 5MBを超えています`);
        continue;
      }
      accepted.push(f);
    }
    setImages((prev) => {
      const merged = [...prev, ...accepted].slice(0, MAX_IMAGES);
      if (prev.length + accepted.length > MAX_IMAGES) {
        errs.push(`画像は最大${MAX_IMAGES}枚までです`);
      }
      return merged;
    });
    if (errs.length > 0) setError(errs.join(' / '));
    // 同じファイル名を続けて選べるよう値をリセット
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // X の有料プラン契約者は長文投稿可能なので 25,000 をデフォルトに。
  // subscriptionType は 'Basic' | 'Premium' | 'PremiumPlus' | null。
  const isPaidPlan = xUser?.subscriptionType != null;
  const defaultMaxCount = isPaidPlan ? 25000 : 280;
  const maxCount = maxCountOverride ?? defaultMaxCount;
  const setMaxCount = (n: number) => setMaxCountOverride(n);

  // 分割結果（リアルタイム）
  // mode === 'none' の場合は分割せず原文を単一ポストとして扱う
  const splitResult = useMemo(
    () => splitPosts(text, { maxCount, numbering }),
    [text, maxCount, numbering],
  );

  const totalXCount = useMemo(() => countXChars(text), [text]);
  const hasMarker = useMemo(() => hasManualSplitMarker(text), [text]);

  const chunks = useMemo(() => {
    if (mode !== 'none') return splitResult.chunks;
    // none モードでは手動マーカーは投稿に出ないよう除去する
    const cleaned = stripManualSplitMarkers(text);
    if (!cleaned) return [];
    return [
      {
        text: cleaned,
        charCount: countXChars(cleaned),
        start: 0,
        end: cleaned.length,
      },
    ];
  }, [mode, splitResult.chunks, text]);

  /** カーソル位置に分割マーカーを挿入する。前後に必要な改行を補う。 */
  const insertSplitMarker = () => {
    const ta = textareaRef.current;
    const caretStart = ta?.selectionStart ?? text.length;
    const caretEnd = ta?.selectionEnd ?? text.length;
    const before = text.slice(0, caretStart);
    const after = text.slice(caretEnd);

    const leading = before.length === 0 || before.endsWith('\n\n')
      ? ''
      : before.endsWith('\n') ? '\n' : '\n\n';
    const trailing = after.length === 0 || after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n') ? '\n' : '\n\n';
    const insertion = `${leading}${MANUAL_SPLIT_MARKER}${trailing}`;
    const newText = before + insertion + after;
    setText(newText);

    // 挿入後、カーソルをマーカーの直後に置く
    const newCaret = before.length + insertion.length;
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(newCaret, newCaret);
    });
  };

  // none モードでは上限超過は「警告」扱い（ボタンは押せる）、
  // それ以外は分割不能エラー（ボタン無効）
  const splitError = mode === 'none' ? undefined : splitResult.error;
  const noneOverWarning =
    mode === 'none' && totalXCount > maxCount
      ? `X ${maxCount}カウント上限を超えています（現在 ${totalXCount}）。契約プランによっては投稿が拒否されます。`
      : null;

  const handlePost = async () => {
    if (chunks.length === 0) return;
    setIsPosting(true);
    setError(null);
    setSuccess(null);
    try {
      const texts = chunks.map((c) => c.text);
      // 'none' は1件なのでサーバー側では 'separate' と等価
      const sendMode = mode === 'none' ? 'separate' : mode;

      let res: Response;
      if (images.length > 0) {
        const fd = new FormData();
        fd.append('texts', JSON.stringify(texts));
        fd.append('mode', sendMode);
        for (const f of images) fd.append('images', f);
        res = await apiFetch('/api/x/thread', { method: 'POST', body: fd });
      } else {
        res = await apiFetch('/api/x/thread', {
          method: 'POST',
          body: JSON.stringify({ texts, mode: sendMode }),
        });
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        const posted = data.posted?.length ?? 0;
        throw new Error(
          posted > 0
            ? `${posted} 件投稿後に失敗: ${data.error}`
            : data.error ?? '投稿に失敗しました',
        );
      }
      setSuccess(`${data.posts.length} 件を投稿しました`);
      setText('');
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <Header title="ポスト作成" subtitle="長文を自動分割してスレッド / 連投にする" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Left: 入力 + 設定 ───────────────────────── */}
        <div className="space-y-5">
          {/* 本文 */}
          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none flex items-center gap-2">
                <PenLine size={15} className="text-neon-purple" />
                本文
              </h2>
              <p className="section-label mt-1.5">
                長文もOK。右プレビューで自動分割結果を確認できます
              </p>
            </div>

            <div>
              <FieldLabel>投稿テキスト</FieldLabel>
              <VoiceTextarea
                ref={textareaRef}
                rows={10}
                value={text}
                onValueChange={setText}
                placeholder={`ここに長文を入力してください。自動でX投稿サイズに分割されます…\n\n強制的に分割したい位置に「${MANUAL_SPLIT_MARKER}」を入れると、その位置で必ず分かれます。`}
                appendMode
                showPasteButton
              />
              <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] flex-wrap">
                <span className="text-slate-600">
                  {text.length}文字 ／ X換算 {totalXCount}カウント
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={insertSplitMarker}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md transition-all"
                    style={{
                      background: 'rgba(96,165,250,0.08)',
                      border: '1px solid rgba(96,165,250,0.22)',
                      color: '#93c5fd',
                    }}
                    title={`カーソル位置に「${MANUAL_SPLIT_MARKER}」を挿入（強制分割マーカー）`}
                  >
                    <Scissors size={11} />
                    ここで分割
                  </button>
                  {chunks.length > 0 && (
                    <span className="text-neon-cyan font-semibold">
                      {chunks.length}ポストに分割
                    </span>
                  )}
                </div>
              </div>
              {hasMarker && mode === 'none' && (
                <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">
                  「分割無し」モードのため、本文中の「{MANUAL_SPLIT_MARKER}」は投稿時に除去されます。
                </p>
              )}
              {hasMarker && mode !== 'none' && (
                <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">
                  本文中の「{MANUAL_SPLIT_MARKER}」位置で強制分割され、各セグメント内は自動分割されます。
                </p>
              )}
            </div>

            {/* 画像添付 */}
            <div>
              <FieldLabel>画像（任意・最大{MAX_IMAGES}枚）</FieldLabel>
              <div className="flex flex-wrap items-start gap-2">
                {imagePreviews.map((url, idx) => (
                  <div
                    key={url}
                    className="relative w-20 h-20 rounded-lg overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
                      title="削除"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
                    style={{
                      background: 'rgba(96,165,250,0.06)',
                      border: '1px dashed rgba(96,165,250,0.35)',
                      color: '#93c5fd',
                    }}
                    title="画像を追加"
                  >
                    <ImagePlus size={18} />
                    <span className="text-[10px]">追加</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_IMAGE_MIMES.join(',')}
                multiple
                onChange={handlePickImages}
                className="hidden"
              />
              <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">
                JPEG / PNG / GIF / WEBP・1枚あたり5MBまで。複数ポストの場合は1件目にのみ添付されます。
              </p>
            </div>
          </div>

          {/* 分割モード */}
          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none flex items-center gap-2">
                <SplitSquareHorizontal size={15} className="text-neon-cyan" />
                分割モード
              </h2>
              <p className="section-label mt-1.5">どのように投稿しますか？</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ModeCard
                active={mode === 'thread'}
                onClick={() => setMode('thread')}
                icon={<MessageSquare size={14} />}
                title="スレッド（リプ連結）"
                desc="1件目の返信として2件目以降を連結。文脈が繋がる読み方。"
                accent="#60a5fa"
              />
              <ModeCard
                active={mode === 'separate'}
                onClick={() => setMode('separate')}
                icon={<Sparkles size={14} />}
                title="独立投稿（連投）"
                desc="それぞれが独立したポスト。個別にバズらせやすい。"
                accent="#a78bfa"
              />
              <ModeCard
                active={mode === 'none'}
                onClick={() => setMode('none')}
                icon={<AlignLeft size={14} />}
                title="分割無し（原文そのまま）"
                desc="本文をそのまま1ポスト。長文プラン契約時向け。"
                accent="#f472b6"
              />
            </div>
          </div>

          {/* 詳細設定 */}
          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none flex items-center gap-2">
                <Hash size={15} className="text-neon-pink" />
                {mode === 'none' ? '上限チェック' : '分割設定'}
              </h2>
              <p className="section-label mt-1.5">
                {mode === 'none'
                  ? '契約プランに応じた上限カウントで警告を出します'
                  : '1ポストあたりの上限と番号付与'}
              </p>
            </div>

            {/* 文字数上限 */}
            <div>
              <FieldLabel>
                {mode === 'none' ? '警告を出す上限（カウント）' : '1ポストあたりの上限（カウント）'}
              </FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LIMIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMaxCount(opt.value)}
                    className="text-left px-3.5 py-2.5 rounded-xl transition-all"
                    style={{
                      background:
                        maxCount === opt.value ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.025)',
                      border:
                        maxCount === opt.value
                          ? '1px solid rgba(167,139,250,0.3)'
                          : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-[12px] font-semibold text-slate-200">{opt.label}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{opt.note}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 番号付与（none モードでは非表示） */}
            {mode !== 'none' && (
              <label
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <p className="text-[12px] font-semibold text-slate-200">番号を自動付与</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    「1/5」「2/5」を各ポストの先頭に自動追加
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={numbering}
                  onChange={(e) => setNumbering(e.target.checked)}
                  className="w-4 h-4 accent-neon-purple cursor-pointer"
                />
              </label>
            )}

            {splitError && (
              <p
                className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {splitError}
              </p>
            )}

            {noneOverWarning && (
              <p
                className="text-[12px] text-amber-300 px-3 py-2 rounded-xl flex items-start gap-2"
                style={{
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.25)',
                }}
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{noneOverWarning}</span>
              </p>
            )}

            {error && (
              <p
                className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {error}
              </p>
            )}

            {success && (
              <p
                className="text-[12px] text-neon-green px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                }}
              >
                ✓ {success}
              </p>
            )}

            <Button
              className="w-full justify-center"
              size="lg"
              onClick={handlePost}
              disabled={chunks.length === 0 || isPosting || !!splitError}
            >
              {isPosting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  投稿中…
                </>
              ) : (
                <>
                  <Send size={14} />
                  {chunks.length > 0
                    ? `Xに投稿（${chunks.length}ポスト・${mode === 'thread' ? 'スレッド' : mode === 'separate' ? '独立' : '分割無し'}）`
                    : 'Xに投稿'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: プレビュー ────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PostPreview chunks={chunks} mode={mode} />
        </div>
      </div>
    </>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left px-4 py-3 rounded-xl transition-all"
      style={{
        background: active ? `${accent}14` : 'rgba(255,255,255,0.025)',
        border: active ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: active ? accent : '#64748b' }}>{icon}</span>
        <p
          className="text-[12px] font-semibold"
          style={{ color: active ? '#e2e8f0' : '#94a3b8' }}
        >
          {title}
        </p>
      </div>
      <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">{desc}</p>
    </button>
  );
}
