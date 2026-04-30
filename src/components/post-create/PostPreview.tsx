'use client';

import { useSettings } from '@/contexts/SettingsContext';
import { Heart, MessageCircle, Repeat2, BarChart3, Upload, MoreHorizontal } from 'lucide-react';
import type { PostChunk, SplitMode } from '@/lib/post-splitter';

interface PostPreviewProps {
  chunks: PostChunk[];
  mode: SplitMode;
  /** chunkPreviews[i] = i 件目のツイートに添付する画像の object URL */
  chunkPreviews?: string[][];
}

/**
 * 右ペインのXタイムライン風プレビュー。
 * thread モード: 連結インジケーター線で繋がったリプライ風
 * separate モード: 独立したカード
 */
export function PostPreview({ chunks, mode, chunkPreviews }: PostPreviewProps) {
  const { xUser, authUser } = useSettings();

  const displayName = xUser?.name ?? authUser?.name ?? 'あなた';
  const username = xUser?.username ?? 'you';
  const avatarUrl = xUser?.profileImageUrl ?? authUser?.avatarUrl ?? null;

  if (chunks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl p-10 text-center"
        style={{
          minHeight: 420,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          🧵
        </div>
        <p className="text-[14px] font-semibold text-slate-300">Xタイムライン プレビュー</p>
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
      {/* ヘッダー: タイムライン風ラベル */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-black"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          >
            X
          </span>
          <div>
            <p className="text-[12px] font-semibold text-slate-300 leading-none">
              {mode === 'thread' ? 'スレッド プレビュー' : '独立投稿 プレビュー'}
            </p>
            <p className="text-[10px] text-slate-600 leading-none mt-1">
              {chunks.length} ポスト ·{' '}
              {mode === 'thread' ? '1件目にリプライで連結' : 'それぞれ別投稿として公開'}
            </p>
          </div>
        </div>
      </div>

      {/* スクロール領域 */}
      <div className="max-h-[720px] overflow-y-auto">
        {chunks.map((chunk, i) => (
          <PostCard
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
    </div>
  );
}

function PostCard({
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
                background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(236,72,153,0.3))',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          {/* 下方向の連結線 */}
          {connected && (
            <div
              className="flex-1 mt-1 mb-[-8px]"
              style={{
                width: 2,
                minHeight: 40,
                background: 'rgba(100,116,139,0.35)',
              }}
            />
          )}
        </div>

        {/* 本文 */}
        <div className="flex-1 min-w-0">
          {/* 名前行 */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-bold text-slate-100 truncate">{displayName}</span>
            <span className="text-slate-600 truncate">@{username}</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600 text-[12px]">今</span>
            <span className="ml-auto">
              <MoreHorizontal size={14} style={{ color: '#64748b' }} />
            </span>
          </div>

          {/* 返信先（スレッド2件目以降） */}
          {isReply && (
            <p className="text-[11px] text-slate-600 mt-0.5">
              返信先: <span style={{ color: '#60a5fa' }}>@{username}</span>
            </p>
          )}

          {/* ポスト本文 */}
          <p
            className="text-[14px] text-slate-100 whitespace-pre-wrap mt-1 leading-[1.55]"
            style={{ wordBreak: 'break-word' }}
          >
            {chunk.text}
          </p>

          {/* 添付画像 */}
          {imagePreviews.length > 0 && (
            <div
              className={`mt-2 grid gap-1 rounded-2xl overflow-hidden ${
                imagePreviews.length === 1
                  ? 'grid-cols-1'
                  : imagePreviews.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2'
              }`}
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
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
          )}

          {/* メタ行 */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-600">
              {index + 1} / {total} · {chunk.charCount} カウント
            </span>
          </div>

          {/* アクション行（ダミー） */}
          <div className="flex items-center justify-between mt-2 pr-6 max-w-md text-slate-600">
            <ActionIcon icon={<MessageCircle size={14} />} />
            <ActionIcon icon={<Repeat2 size={14} />} />
            <ActionIcon icon={<Heart size={14} />} />
            <ActionIcon icon={<BarChart3 size={14} />} />
            <ActionIcon icon={<Upload size={14} />} />
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[11px] hover:text-slate-400 transition-colors cursor-default">
      {icon}
    </span>
  );
}
