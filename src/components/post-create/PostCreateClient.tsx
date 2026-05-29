'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { PostPreview } from './PostPreview';
import { ThreadsPreview } from './ThreadsPreview';
import { InstagramPreview } from './InstagramPreview';
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
import { PlatformIcon } from '@/components/ui/PlatformIcon';
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
  Share2,
  Gauge,
  CalendarClock,
  X as XIcon,
} from 'lucide-react';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const LIMIT_OPTIONS_X = [
  { value: 140, label: '140カウント', note: '無料（全角70字 / 半角140字）' },
  { value: 280, label: '280カウント', note: 'X 標準（全角140字 / 半角280字）' },
  { value: 25000, label: '25,000カウント', note: 'Premium / Basic（長文投稿）' },
];

const LIMIT_OPTIONS_THREADS = [
  { value: 500, label: '500カウント', note: 'Threads 標準（500文字）' },
];

const LIMIT_OPTIONS_INSTAGRAM = [
  { value: 2200, label: '2,200カウント', note: 'Instagram キャプション上限' },
];

const THREADS_MAX_COUNT = 500;
const INSTAGRAM_CAPTION_MAX = 2200;
const INSTAGRAM_MAX_IMAGES = 10;

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
  // 予約投稿: パネル開閉 / 日時 / 送信中フラグ
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt]   = useState<string>('');
  const [isScheduling, setIsScheduling] = useState(false);
  // 投稿先プラットフォーム選択
  const [targetX, setTargetX] = useState(false);
  const [targetThreads, setTargetThreads] = useState(false);
  const [targetInstagram, setTargetInstagram] = useState(false);
  // 連携アカウントの登録状況。null は取得中。
  const [xAccountConfigured, setXAccountConfigured] = useState<boolean | null>(null);
  const [threadsAccountConfigured, setThreadsAccountConfigured] = useState<boolean | null>(null);
  const [instagramAccountConfigured, setInstagramAccountConfigured] = useState<boolean | null>(null);
  // Threads プレビュー用のアカウント情報（@ユーザー名・アイコンのみ）
  const [threadsAccount, setThreadsAccount] = useState<{
    name: string | null;
    username: string | null;
    profile_image_url: string | null;
  } | null>(null);
  // Instagram プレビュー用のアカウント情報（@ユーザー名・アイコンのみ）
  const [instagramAccount, setInstagramAccount] = useState<{
    name: string | null;
    username: string | null;
    profile_image_url: string | null;
  } | null>(null);
  // chunkImages[i] = i 件目のツイートに添付する画像
  const [chunkImages, setChunkImages] = useState<File[][]>([]);
  // 各画像に対応する object URL（プレビュー用）。chunkImages と同じ shape。
  const [chunkPreviews, setChunkPreviews] = useState<string[][]>([]);
  // 過去 24 時間の投稿数（X / Threads 別）— BAN 回避ソフトリミット判定用
  const [todayCount, setTodayCount] = useState<{
    x: number;
    threads: number;
    instagram: number;
    limits: { x: number; threads: number; instagram: number };
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── 連携アカウントの登録状況を取得し、登録済みプラットフォームをデフォルトON ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [xRes, tRes, igRes] = await Promise.all([
          apiFetch('/api/x-accounts').then((r) => r.json()).catch(() => ({ accounts: [] })),
          apiFetch('/api/threads-accounts').then((r) => r.json()).catch(() => ({ accounts: [] })),
          apiFetch('/api/instagram-accounts').then((r) => r.json()).catch(() => ({ accounts: [] })),
        ]);
        if (cancelled) return;
        const xConf = Array.isArray(xRes?.accounts) && xRes.accounts.length > 0;
        const tConf = Array.isArray(tRes?.accounts) && tRes.accounts.length > 0;
        const igConf = Array.isArray(igRes?.accounts) && igRes.accounts.length > 0;
        setXAccountConfigured(xConf);
        setThreadsAccountConfigured(tConf);
        setInstagramAccountConfigured(igConf);
        setTargetX(xConf);
        setTargetThreads(tConf);
        setTargetInstagram(igConf);
        if (tConf) {
          const ta = tRes.accounts[0];
          setThreadsAccount({
            name:              ta?.name              ?? null,
            username:          ta?.username          ?? null,
            profile_image_url: ta?.profile_image_url ?? null,
          });
        }
        if (igConf) {
          const ia = igRes.accounts[0];
          setInstagramAccount({
            name:              ia?.name              ?? null,
            username:          ia?.username          ?? null,
            profile_image_url: ia?.profile_image_url ?? null,
          });
        }
      } catch {
        if (cancelled) return;
        setXAccountConfigured(false);
        setThreadsAccountConfigured(false);
        setInstagramAccountConfigured(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 過去 24h の投稿数を取得（投稿後にも更新）
  const refreshTodayCount = async () => {
    try {
      const res = await apiFetch('/api/posts/today-count');
      const data = await res.json();
      if (res.ok && typeof data.x === 'number' && typeof data.threads === 'number') {
        setTodayCount({
          x: data.x,
          threads: data.threads,
          instagram: typeof data.instagram === 'number' ? data.instagram : 0,
          limits: data.limits,
        });
      }
    } catch { /* 表示用情報なので失敗しても無視 */ }
  };
  useEffect(() => { refreshTodayCount(); }, []);

  // 画像のプレビュー URL を生成し、unmount / 入れ替え時に解放
  useEffect(() => {
    const urls = chunkImages.map((files) => files.map((f) => URL.createObjectURL(f)));
    setChunkPreviews(urls);
    return () => {
      urls.forEach((arr) => arr.forEach((u) => URL.revokeObjectURL(u)));
    };
  }, [chunkImages]);

  const addImagesToChunk = (chunkIndex: number, files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
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
    setChunkImages((prev) => {
      const next = prev.slice();
      const current = next[chunkIndex] ?? [];
      const merged = [...current, ...accepted].slice(0, MAX_IMAGES);
      if (current.length + accepted.length > MAX_IMAGES) {
        errs.push(`1ポストあたり最大${MAX_IMAGES}枚までです`);
      }
      next[chunkIndex] = merged;
      return next;
    });
    if (errs.length > 0) setError(errs.join(' / '));
  };

  const removeImage = (chunkIndex: number, imgIndex: number) => {
    setChunkImages((prev) => {
      const next = prev.slice();
      const current = next[chunkIndex] ?? [];
      next[chunkIndex] = current.filter((_, i) => i !== imgIndex);
      return next;
    });
  };

  // X の有料プラン契約者は長文投稿可能なので 25,000 をデフォルトに。
  // subscriptionType は 'Basic' | 'Premium' | 'PremiumPlus' | null。
  const isPaidPlan = xUser?.subscriptionType != null;

  // 投稿先プラットフォームに応じて文字数上限を動的に決める。
  //   - Threads 単独: 500（Threads 標準・固定）
  //   - X 含む（単独 or 両方）: X 基準（無料280 / Premium25000）。両方投稿は短い X 側に合わせる
  // Instagram は単一投稿（分割なし・画像必須）。X/Threads と排他ではないが
  // 文字数上限は「Instagram のみ選択」のとき 2,200 に切り替える。
  const isInstagramOnly = !targetX && !targetThreads && targetInstagram;
  const isThreadsOnly = !targetX && targetThreads && !targetInstagram;
  const defaultMaxCount = isPaidPlan ? 25000 : 280;
  const maxCount = isInstagramOnly
    ? INSTAGRAM_CAPTION_MAX
    : isThreadsOnly
      ? THREADS_MAX_COUNT
      : (maxCountOverride ?? defaultMaxCount);
  const setMaxCount = (n: number) => setMaxCountOverride(n);
  const limitOptions = isInstagramOnly
    ? LIMIT_OPTIONS_INSTAGRAM
    : isThreadsOnly
      ? LIMIT_OPTIONS_THREADS
      : LIMIT_OPTIONS_X;

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

  // chunks.length 内に収まる画像のみ集計（チャンク数が減ったら超過分は送らない）
  const totalAttachedImages = useMemo(
    () => chunkImages.slice(0, chunks.length).reduce((sum, arr) => sum + arr.length, 0),
    [chunkImages, chunks.length],
  );

  // ── Instagram は単一投稿（分割なし）──
  // 全チャンクのテキストを連結して1キャプションにし、全画像を最大10枚に集約する。
  const instagramCaption = useMemo(
    () => chunks.map((c) => c.text).join('\n\n').trim(),
    [chunks],
  );
  const instagramImages = useMemo(
    () => chunkImages.slice(0, chunks.length).flat().slice(0, INSTAGRAM_MAX_IMAGES),
    [chunkImages, chunks.length],
  );
  const instagramPreviews = useMemo(
    () => chunkPreviews.slice(0, chunks.length).flat().slice(0, INSTAGRAM_MAX_IMAGES),
    [chunkPreviews, chunks.length],
  );
  const instagramNeedsImage = targetInstagram && instagramImages.length === 0;

  const handlePost = async () => {
    if (chunks.length === 0) return;
    if (!targetX && !targetThreads && !targetInstagram) {
      setError('投稿先プラットフォームを選択してください');
      return;
    }
    if (instagramNeedsImage) {
      setError('Instagram は画像が1枚以上必要です');
      return;
    }
    setIsPosting(true);
    setError(null);
    setSuccess(null);

    const texts = chunks.map((c) => c.text);
    // 'none' は1件なのでサーバー側では 'separate' と等価
    const sendMode = mode === 'none' ? 'separate' : mode;

    type PostOutcome = { platform: 'X' | 'Threads' | 'Instagram'; ok: boolean; count: number; error?: string };

    const postToX = async (): Promise<PostOutcome> => {
      try {
        let res: Response;
        if (totalAttachedImages > 0) {
          const fd = new FormData();
          fd.append('texts', JSON.stringify(texts));
          fd.append('mode', sendMode);
          for (let i = 0; i < texts.length; i++) {
            for (const f of chunkImages[i] ?? []) fd.append(`images_${i}`, f);
          }
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
          return { platform: 'X', ok: false, count: posted, error: data.error ?? '投稿に失敗しました' };
        }
        return { platform: 'X', ok: true, count: data.posts?.length ?? 0 };
      } catch (err) {
        return { platform: 'X', ok: false, count: 0, error: err instanceof Error ? err.message : '投稿に失敗しました' };
      }
    };

    const postToThreads = async (): Promise<PostOutcome> => {
      try {
        let res: Response;
        if (totalAttachedImages > 0) {
          const fd = new FormData();
          fd.append('texts', JSON.stringify(texts));
          fd.append('mode', sendMode);
          for (let i = 0; i < texts.length; i++) {
            for (const f of chunkImages[i] ?? []) fd.append(`images_${i}`, f);
          }
          res = await apiFetch('/api/threads/thread', { method: 'POST', body: fd });
        } else {
          res = await apiFetch('/api/threads/thread', {
            method: 'POST',
            body: JSON.stringify({ texts, mode: sendMode }),
          });
        }
        const data = await res.json();
        if (!res.ok || data.error) {
          const posted = data.posted?.length ?? 0;
          return { platform: 'Threads', ok: false, count: posted, error: data.error ?? '投稿に失敗しました' };
        }
        return { platform: 'Threads', ok: true, count: data.posts?.length ?? 0 };
      } catch (err) {
        return { platform: 'Threads', ok: false, count: 0, error: err instanceof Error ? err.message : '投稿に失敗しました' };
      }
    };

    const postToInstagram = async (): Promise<PostOutcome> => {
      try {
        const fd = new FormData();
        fd.append('caption', instagramCaption);
        for (const f of instagramImages) fd.append('images', f);
        const res = await apiFetch('/api/instagram/post', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || data.error) {
          return { platform: 'Instagram', ok: false, count: 0, error: data.error ?? '投稿に失敗しました' };
        }
        return { platform: 'Instagram', ok: true, count: 1 };
      } catch (err) {
        return { platform: 'Instagram', ok: false, count: 0, error: err instanceof Error ? err.message : '投稿に失敗しました' };
      }
    };

    try {
      const tasks: Promise<PostOutcome>[] = [];
      if (targetX) tasks.push(postToX());
      if (targetThreads) tasks.push(postToThreads());
      if (targetInstagram) tasks.push(postToInstagram());
      const outcomes = await Promise.all(tasks);

      const successes = outcomes.filter((o) => o.ok);
      const failures  = outcomes.filter((o) => !o.ok);

      if (successes.length > 0) {
        setSuccess(successes.map((o) => `${o.platform}: ${o.count}件`).join(' / ') + ' を投稿しました');
      }
      if (failures.length > 0) {
        setError(failures.map((o) => `${o.platform}: ${o.error}`).join(' / '));
      }
      // 全成功時のみフォームをクリアする
      if (failures.length === 0) {
        setText('');
        setChunkImages([]);
      }
      // 投稿後はカウンタを更新（失敗時も部分成功分を反映するため呼ぶ）
      refreshTodayCount();
    } finally {
      setIsPosting(false);
    }
  };

  // 予約パネルを開くときに既定値（30分後）をセット
  const openSchedulePanel = () => {
    if (!scheduledAt) {
      const d = new Date(Date.now() + 30 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setScheduledAt(local);
    }
    setScheduleOpen(true);
    setError(null);
    setSuccess(null);
  };

  // ── 予約投稿 ──
  const handleSchedule = async () => {
    if (chunks.length === 0) return;
    if (!targetX && !targetThreads && !targetInstagram) {
      setError('投稿先プラットフォームを選択してください');
      return;
    }
    if (instagramNeedsImage) {
      setError('Instagram は画像が1枚以上必要です');
      return;
    }
    if (!scheduledAt) {
      setError('予約日時を選択してください');
      return;
    }
    const scheduledIso = new Date(scheduledAt).toISOString();
    if (new Date(scheduledIso).getTime() <= Date.now()) {
      setError('予約日時は現在より未来を指定してください');
      return;
    }

    setIsScheduling(true);
    setError(null);
    setSuccess(null);

    const texts = chunks.map((c) => c.text);
    const sendMode = mode === 'none' ? 'separate' : mode;
    const platforms: ('x' | 'threads' | 'instagram')[] = [];
    if (targetX)         platforms.push('x');
    if (targetThreads)   platforms.push('threads');
    if (targetInstagram) platforms.push('instagram');

    try {
      const fd = new FormData();
      fd.append('texts',        JSON.stringify(texts));
      fd.append('mode',         sendMode);
      fd.append('platforms',    JSON.stringify(platforms));
      fd.append('numbering',    numbering ? 'true' : 'false');
      fd.append('scheduled_at', scheduledIso);
      for (let i = 0; i < texts.length; i++) {
        for (const f of chunkImages[i] ?? []) fd.append(`images_${i}`, f);
      }
      const res = await apiFetch('/api/scheduled-posts', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? '予約に失敗しました');
        return;
      }
      const when = new Date(scheduledIso).toLocaleString('ja-JP', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      const targetLabel =
        [targetX && 'X', targetThreads && 'Threads', targetInstagram && 'Instagram']
          .filter(Boolean)
          .join(' + ') || '投稿先';
      setSuccess(`${when} に ${targetLabel} へ ${chunks.length} ポスト予約しました`);
      // 投稿フォームをクリア（送信成功と同等の挙動）
      setText('');
      setChunkImages([]);
      setScheduleOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約に失敗しました');
    } finally {
      setIsScheduling(false);
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

            {/* 画像添付（ポストごと） */}
            <div>
              <FieldLabel>
                画像（任意・各ポスト最大{MAX_IMAGES}枚）
              </FieldLabel>
              {chunks.length === 0 ? (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  本文を入力すると、ポストごとに画像を添付できます。
                </p>
              ) : (
                <div className="space-y-2">
                  {chunks.map((_, i) => (
                    <ChunkImagePicker
                      key={i}
                      index={i}
                      total={chunks.length}
                      files={chunkImages[i] ?? []}
                      previews={chunkPreviews[i] ?? []}
                      onAdd={(list) => addImagesToChunk(i, list)}
                      onRemove={(imgIdx) => removeImage(i, imgIdx)}
                    />
                  ))}
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    JPEG / PNG / GIF / WEBP・1枚あたり5MBまで。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 投稿先プラットフォーム */}
          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none flex items-center gap-2">
                <Share2 size={15} className="text-neon-blue" />
                投稿先
              </h2>
              <p className="section-label mt-1.5">どのSNSに投稿しますか？（未登録は選択不可）</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PlatformToggle
                active={targetX}
                disabled={xAccountConfigured === false}
                loading={xAccountConfigured === null}
                onClick={() => setTargetX((v) => !v)}
                platform="x"
                label="X（旧 Twitter）"
                disabledNote="アカウント未登録"
              />
              <PlatformToggle
                active={targetThreads}
                disabled={threadsAccountConfigured === false}
                loading={threadsAccountConfigured === null}
                onClick={() => setTargetThreads((v) => !v)}
                platform="threads"
                label="Threads"
                disabledNote="アカウント未登録"
              />
              <PlatformToggle
                active={targetInstagram}
                disabled={instagramAccountConfigured === false}
                loading={instagramAccountConfigured === null}
                onClick={() => setTargetInstagram((v) => !v)}
                platform="instagram"
                label="Instagram"
                disabledNote="アカウント未登録"
              />
            </div>

            {(targetX || targetThreads) && targetInstagram && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Instagram は分割せず単一投稿（キャプション最大2,200文字・画像必須）として投稿します。X / Threads とは分割設定が異なる点にご注意ください。
              </p>
            )}

            {targetX && targetThreads && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                X と Threads の両方に投稿時は文字数上限を X 基準（短い方）に合わせています。
              </p>
            )}

            {instagramNeedsImage && (
              <p
                className="text-[11px] text-amber-300 px-3 py-2 rounded-xl flex items-start gap-2"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
              >
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>Instagram は画像が必須です。画像を1枚以上添付してください。</span>
              </p>
            )}

            {/* ── 過去24h投稿数（BAN回避ソフトリミット）── */}
            {todayCount && (xAccountConfigured || threadsAccountConfigured || instagramAccountConfigured) && (
              <DailyCountStrip
                showX={!!xAccountConfigured}
                showThreads={!!threadsAccountConfigured}
                showInstagram={!!instagramAccountConfigured}
                xCount={todayCount.x}
                threadsCount={todayCount.threads}
                instagramCount={todayCount.instagram}
                xLimit={todayCount.limits.x}
                threadsLimit={todayCount.limits.threads}
                instagramLimit={todayCount.limits.instagram}
              />
            )}
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
                {limitOptions.map((opt) => (
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

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <Button
                className="justify-center"
                size="lg"
                onClick={handlePost}
                disabled={chunks.length === 0 || isPosting || isScheduling || !!splitError || (!targetX && !targetThreads && !targetInstagram) || instagramNeedsImage}
              >
                {isPosting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    投稿中…
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    {(() => {
                      const targetLabel =
                        [targetX && 'X', targetThreads && 'Threads', targetInstagram && 'Instagram']
                          .filter(Boolean)
                          .join(' + ') || '投稿先未選択';
                      if (chunks.length === 0 || (!targetX && !targetThreads && !targetInstagram)) return `${targetLabel}に投稿`;
                      const modeLabel = mode === 'thread' ? 'スレッド' : mode === 'separate' ? '独立' : '分割無し';
                      return `${targetLabel}に投稿（${chunks.length}ポスト・${modeLabel}）`;
                    })()}
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={() => (scheduleOpen ? setScheduleOpen(false) : openSchedulePanel())}
                disabled={chunks.length === 0 || isPosting || isScheduling || !!splitError || (!targetX && !targetThreads && !targetInstagram) || instagramNeedsImage}
                className="inline-flex items-center justify-center gap-1.5 px-4 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: scheduleOpen ? 'rgba(34,211,238,0.18)' : 'rgba(34,211,238,0.08)',
                  border: '1px solid rgba(34,211,238,0.35)',
                  color: '#22d3ee',
                  minHeight: 44,
                }}
                title="日時を指定して予約する"
              >
                <CalendarClock size={14} />
                予約
              </button>
            </div>

            {/* 予約日時パネル */}
            {scheduleOpen && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)' }}
              >
                <div className="flex items-center gap-2">
                  <CalendarClock size={13} className="text-neon-cyan" />
                  <p className="text-[12px] font-semibold text-slate-200">予約日時</p>
                </div>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-slate-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    colorScheme: 'dark',
                  }}
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  予約は cron で順次配信されます。BAN 回避のため即時投稿との合計レートには注意してください。
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setScheduleOpen(false)}
                    disabled={isScheduling}
                    className="text-[12px] px-3 py-1.5 rounded-lg text-slate-400 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={isScheduling || !scheduledAt}
                    className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                    style={{
                      background: 'rgba(34,211,238,0.15)',
                      border: '1px solid rgba(34,211,238,0.4)',
                      color: '#22d3ee',
                    }}
                  >
                    {isScheduling ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        予約中…
                      </>
                    ) : (
                      <>
                        <CalendarClock size={12} />
                        この日時で予約する
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: プレビュー（Buffer風 — 投稿先別に並列表示）─────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-5">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-slate-300">Post Previews</h3>
            <span className="text-[11px] text-slate-600">
              {(() => {
                const label = [targetX && 'X', targetThreads && 'Threads', targetInstagram && 'Instagram']
                  .filter(Boolean)
                  .join(' / ');
                return label ? `（${label}）` : '（投稿先未選択）';
              })()}
            </span>
          </div>

          {!targetX && !targetThreads && !targetInstagram ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl p-10 text-center"
              style={{
                minHeight: 320,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-[13px] text-slate-400">投稿先を選択してください</p>
              <p className="text-[11px] text-slate-600 mt-1">
                左の「投稿先」セクションで X / Threads / Instagram をONにすると、対応するプレビューが表示されます。
              </p>
            </div>
          ) : (
            <>
              {targetX && (
                <PostPreview chunks={chunks} mode={mode} chunkPreviews={chunkPreviews} />
              )}
              {targetThreads && (
                <ThreadsPreview
                  chunks={chunks}
                  mode={mode}
                  chunkPreviews={chunkPreviews}
                  threadsAccount={threadsAccount}
                />
              )}
              {targetInstagram && (
                <InstagramPreview
                  caption={instagramCaption}
                  imagePreviews={instagramPreviews}
                  instagramAccount={instagramAccount}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ChunkImagePicker({
  index,
  total,
  files,
  previews,
  onAdd,
  onRemove,
}: {
  index: number;
  total: number;
  files: File[];
  previews: string[];
  onAdd: (list: FileList | null) => void;
  onRemove: (imgIndex: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="rounded-lg p-2 flex items-center gap-2"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span className="text-[10px] font-semibold text-slate-500 shrink-0 w-10 text-center">
        {index + 1}/{total}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {previews.map((url, idx) => (
          <div
            key={url}
            className="relative w-12 h-12 rounded-md overflow-hidden shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
              title="削除"
            >
              <XIcon size={9} />
            </button>
          </div>
        ))}
        {files.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 transition-all"
            style={{
              background: 'rgba(96,165,250,0.06)',
              border: '1px dashed rgba(96,165,250,0.3)',
              color: '#93c5fd',
            }}
            title={`${index + 1}件目に画像を追加`}
          >
            <ImagePlus size={14} />
          </button>
        )}
        {files.length > 0 && (
          <span className="text-[10px] text-slate-600 ml-auto pr-1">
            {files.length}/{MAX_IMAGES}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIMES.join(',')}
        multiple
        onChange={(e) => {
          onAdd(e.target.files);
          if (inputRef.current) inputRef.current.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}

function PlatformToggle({
  active,
  disabled,
  loading,
  onClick,
  platform,
  label,
  disabledNote,
}: {
  active: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  platform: 'x' | 'threads' | 'instagram';
  label: string;
  disabledNote: string;
}) {
  const accent = platform === 'x' ? '#60a5fa' : platform === 'instagram' ? '#ec4899' : '#c084fc';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 disabled:cursor-not-allowed"
      style={{
        background: active && !disabled ? `${accent}14` : 'rgba(255,255,255,0.025)',
        border: active && !disabled ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.06)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: active && !disabled ? `${accent}22` : 'rgba(255,255,255,0.04)',
          color: active && !disabled ? accent : '#64748b',
        }}
      >
        <PlatformIcon platform={platform} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[12px] font-semibold"
          style={{ color: active && !disabled ? '#e2e8f0' : '#94a3b8' }}
        >
          {label}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {loading ? '読み込み中…' : disabled ? disabledNote : active ? '投稿する' : '投稿しない'}
        </p>
      </div>
      <span
        className="w-4 h-4 rounded-full shrink-0"
        style={{
          background: active && !disabled ? accent : 'transparent',
          border: active && !disabled ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.15)',
        }}
      />
    </button>
  );
}

/**
 * 過去 24 時間の投稿数をプラットフォーム別に表示。
 * 80% 以上で amber、100% 以上で rose の警告色に切り替わる。
 * BAN 回避ガイド準拠のソフトリミット可視化（強制ブロックはしない）。
 */
function DailyCountStrip({
  showX, showThreads, showInstagram,
  xCount, threadsCount, instagramCount,
  xLimit, threadsLimit, instagramLimit,
}: {
  showX: boolean;
  showThreads: boolean;
  showInstagram: boolean;
  xCount: number;
  threadsCount: number;
  instagramCount: number;
  xLimit: number;
  threadsLimit: number;
  instagramLimit: number;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
        <Gauge size={11} />
        過去 24h の投稿数
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {showX && (
          <CountChip platform="X" count={xCount} limit={xLimit} />
        )}
        {showThreads && (
          <CountChip platform="Threads" count={threadsCount} limit={threadsLimit} />
        )}
        {showInstagram && (
          <CountChip platform="Instagram" count={instagramCount} limit={instagramLimit} />
        )}
      </div>
      <Link
        href="/guide/posting-guidelines"
        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors ml-auto"
      >
        ソフトリミットとは？
      </Link>
    </div>
  );
}

function CountChip({ platform, count, limit }: { platform: string; count: number; limit: number }) {
  const ratio = limit > 0 ? count / limit : 0;
  const color =
    ratio >= 1   ? { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)',  text: '#fda4af' } :
    ratio >= 0.8 ? { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', text: '#fbbf24' } :
                   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: '#94a3b8' };
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-md font-mono inline-flex items-center gap-1"
      style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}
      title={ratio >= 1 ? `${platform} 推奨上限を超過しています` : ratio >= 0.8 ? `${platform} 推奨上限に近づいています` : undefined}
    >
      {platform}: {count}/{limit}
    </span>
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
