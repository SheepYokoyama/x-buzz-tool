'use client';

import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import type { PostChunk, SplitMode } from '@/lib/post-splitter';

interface ThreadsPreviewProps {
  chunks: PostChunk[];
  mode: SplitMode;
  /** chunkPreviews[i] = i 件目に添付する画像の object URL（表示プレビューのみ。投稿APIには現状未送信）*/
  chunkPreviews?: string[][];
  /** ログイン中の Threads アカウント。未登録時は null */
  threadsAccount: {
    name: string | null;
    username: string | null;
    profile_image_url: string | null;
  } | null;
}

/**
 * Threads タイムライン風プレビュー。
 * X の PostPreview と並列で表示することを想定し、ヘッダー文言と配色を Threads 風にした。
 */
export function ThreadsPreview({ chunks, mode, chunkPreviews, threadsAccount }: ThreadsPreviewProps) {
  const displayName = threadsAccount?.name ?? 'あなた';
  const username    = threadsAccount?.username ?? 'you';
  const avatarUrl   = threadsAccount?.profile_image_url ?? null;

  if (chunks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl p-10 text-center"
        style={{
          minHeight: 320,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-slate-300"
          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
        >
          <PlatformIcon platform="threads" size={20} />
        </div>
        <p className="text-[14px] font-semibold text-slate-300">Threads プレビュー</p>
        <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
          左のフォームにテキストを入力すると<br />ここに投稿イメージが表示されます
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(12,16,28,0.65)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(168,85,247,0.04)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-200"
            style={{ background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            <PlatformIcon platform="threads" size={12} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-slate-300 leading-none">
              {mode === 'thread' ? 'Threads スレッド プレビュー' : 'Threads 独立投稿 プレビュー'}
            </p>
            <p className="text-[10px] text-slate-600 leading-none mt-1">
              {chunks.length} ポスト ·{' '}
              {mode === 'thread' ? '1件目に reply で連結' : 'それぞれ別投稿として公開'}
            </p>
          </div>
        </div>
      </div>

      {/* スクロール領域 */}
      <div className="max-h-[720px] overflow-y-auto">
        {chunks.map((chunk, i) => (
          <ThreadsCard
            key={i}
            chunk={chunk}
            index={i}
            total={chunks.length}
            displayName={displayName}
            username={username}
            avatarUrl={avatarUrl}
            connected={mode === 'thread' && i < chunks.length - 1}
            isReply={mode === 'thread' && i > 0}
            imagePreviews={chunkPreviews?.[i] ?? []}
          />
        ))}
      </div>

      {!threadsAccount && (
        <div
          className="px-4 py-2.5 text-[11px] text-slate-500 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          プレビューは仮表示です。Threads アカウントを登録するとアバター・@ユーザー名が反映されます。
        </div>
      )}
    </div>
  );
}

function ThreadsCard({
  chunk,
  index,
  total,
  displayName,
  username,
  avatarUrl,
  connected,
  isReply,
  imagePreviews,
}: {
  chunk: PostChunk;
  index: number;
  total: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  connected: boolean;
  isReply: boolean;
  imagePreviews: string[];
}) {
  return (
    <article
      className="relative px-4 pt-4 pb-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex gap-3">
        {/* アバター列（スレッド接続線付き） */}
        <div className="relative flex flex-col items-center shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full shrink-0 z-10"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
          ) : (
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 z-10"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(236,72,153,0.35))',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          {connected && (
            <div
              className="flex-1 mt-1 mb-[-8px]"
              style={{
                width: 2,
                minHeight: 40,
                background: 'rgba(168,85,247,0.35)',
              }}
            />
          )}
        </div>

        {/* 本文 */}
        <div className="flex-1 min-w-0">
          {/* 名前行 */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-bold text-slate-100 truncate">{username}</span>
            <span className="text-slate-600 truncate">·</span>
            <span className="text-slate-600 text-[12px]">今</span>
            <span className="ml-auto">
              <MoreHorizontal size={14} style={{ color: '#64748b' }} />
            </span>
          </div>

          {/* 返信先（スレッド2件目以降） */}
          {isReply && (
            <p className="text-[11px] text-slate-600 mt-0.5">
              返信先: <span style={{ color: '#c084fc' }}>@{username}</span>
            </p>
          )}

          {/* ポスト本文 */}
          <p
            className="text-[14px] text-slate-100 whitespace-pre-wrap mt-1 leading-[1.55]"
            style={{ wordBreak: 'break-word' }}
          >
            {chunk.text}
          </p>

          {/* 添付画像（Threadsには投稿されない旨をうっすら表示） */}
          {imagePreviews.length > 0 && (
            <div className="mt-2">
              <div
                className={`grid gap-1 rounded-2xl overflow-hidden ${
                  imagePreviews.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
                }`}
                style={{ border: '1px solid rgba(255,255,255,0.08)', opacity: 0.55 }}
              >
                {imagePreviews.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className={`w-full object-cover ${
                      imagePreviews.length === 3 && idx === 0 ? 'row-span-2 h-full' : 'h-32'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-amber-400/70 mt-1">
                ※ Threads には画像は投稿されません（テキストのみ）
              </p>
            </div>
          )}

          {/* メタ行 */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-600">
              {index + 1} / {total} · {chunk.charCount} カウント
            </span>
          </div>

          {/* アクション行（Threadsの操作: ハート/コメント/リポスト/共有） */}
          <div className="flex items-center gap-5 mt-2 pr-6 max-w-md text-slate-600">
            <Heart size={15} />
            <MessageCircle size={15} />
            <Repeat2 size={15} />
            <Send size={15} />
          </div>
        </div>
      </div>
    </article>
  );
}
