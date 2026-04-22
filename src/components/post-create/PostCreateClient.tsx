'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { PostPreview } from './PostPreview';
import { splitPosts, type SplitMode } from '@/lib/post-splitter';
import { countXChars } from '@/lib/x-char-count';
import { apiFetch } from '@/lib/api-fetch';
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
} from 'lucide-react';

const LIMIT_OPTIONS = [
  { value: 140, label: '140カウント', note: '無料（全角70字 / 半角140字）' },
  { value: 280, label: '280カウント', note: 'X 標準（全角140字 / 半角280字）' },
  { value: 25000, label: '25,000カウント', note: 'Premium / Basic（長文投稿）' },
];

export function PostCreateClient() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SplitMode>('thread');
  const [maxCount, setMaxCount] = useState<number>(280);
  const [numbering, setNumbering] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 分割結果（リアルタイム）
  // mode === 'none' の場合は分割せず原文を単一ポストとして扱う
  const splitResult = useMemo(
    () => splitPosts(text, { maxCount, numbering }),
    [text, maxCount, numbering],
  );

  const totalXCount = useMemo(() => countXChars(text), [text]);

  const chunks = useMemo(() => {
    if (mode !== 'none') return splitResult.chunks;
    const trimmed = text.trim();
    if (!trimmed) return [];
    return [
      {
        text: trimmed,
        charCount: totalXCount,
        start: 0,
        end: trimmed.length,
      },
    ];
  }, [mode, splitResult.chunks, text, totalXCount]);

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
      const res = await apiFetch('/api/x/thread', {
        method: 'POST',
        body: JSON.stringify({
          texts: chunks.map((c) => c.text),
          // 'none' は1件なのでサーバー側では 'separate' と等価
          mode: mode === 'none' ? 'separate' : mode,
        }),
      });
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
                rows={10}
                value={text}
                onValueChange={setText}
                placeholder="ここに長文を入力してください。自動でX投稿サイズに分割されます…"
                appendMode
                showPasteButton
              />
              <div className="flex items-center justify-between mt-1.5 text-[11px]">
                <span className="text-slate-600">
                  {text.length}文字 ／ X換算 {totalXCount}カウント
                </span>
                {chunks.length > 0 && (
                  <span className="text-neon-cyan font-semibold">
                    {chunks.length}ポストに分割
                  </span>
                )}
              </div>
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
