'use client';

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ImageOff } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface InstagramPreviewProps {
  /** キャプション本文（分割せず1投稿。最大2,200文字）*/
  caption: string;
  /** 添付画像の object URL（1〜10枚。Instagram は画像必須）*/
  imagePreviews: string[];
  /** ログイン中の Instagram アカウント。未登録時は null */
  instagramAccount: {
    name: string | null;
    username: string | null;
    profile_image_url: string | null;
  } | null;
}

/**
 * Instagram フィード投稿風プレビュー（単一投稿）。
 * Instagram は画像が必須・リプライ連結が無いため、X/Threads と異なり
 * 常に1枚カード（複数画像はカルーセル）として表示する。
 */
export function InstagramPreview({ caption, imagePreviews, instagramAccount }: InstagramPreviewProps) {
  const displayName = instagramAccount?.name ?? 'あなた';
  const username    = instagramAccount?.username ?? 'you';
  const avatarUrl   = instagramAccount?.profile_image_url ?? null;

  if (!caption && imagePreviews.length === 0) {
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
          style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}
        >
          <PlatformIcon platform="instagram" size={20} />
        </div>
        <p className="text-[14px] font-semibold text-slate-300">Instagram プレビュー</p>
        <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
          左のフォームにテキストを入力し<br />画像を1枚以上添付すると投稿イメージが表示されます
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
          background: 'rgba(236,72,153,0.04)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-200"
            style={{ background: 'rgba(236,72,153,0.18)', border: '1px solid rgba(236,72,153,0.3)' }}
          >
            <PlatformIcon platform="instagram" size={12} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-slate-300 leading-none">
              Instagram フィード投稿 プレビュー
            </p>
            <p className="text-[10px] text-slate-600 leading-none mt-1">
              単一投稿 ·{' '}
              {imagePreviews.length === 0
                ? '画像が必要です'
                : imagePreviews.length === 1
                ? '画像1枚'
                : `カルーセル ${imagePreviews.length}枚`}
            </p>
          </div>
        </div>
      </div>

      {/* 投稿カード */}
      <article className="px-4 pt-4 pb-3">
        {/* ユーザー行 */}
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
          ) : (
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
              style={{
                background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)',
                color: '#fff',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-[13px] font-bold text-slate-100 truncate">{username}</span>
          <span className="ml-auto">
            <MoreHorizontal size={16} style={{ color: '#64748b' }} />
          </span>
        </div>

        {/* メディア（正方形） */}
        <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {imagePreviews.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 aspect-square text-slate-600"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <ImageOff size={28} />
              <p className="text-[11px]">画像が必要です（Instagram は画像必須）</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreviews[0]}
              alt=""
              className="w-full aspect-square object-cover"
            />
          )}
        </div>

        {/* アクション行 */}
        <div className="flex items-center gap-4 mt-3 text-slate-300">
          <Heart size={20} />
          <MessageCircle size={20} />
          <Send size={20} />
          <Bookmark size={20} className="ml-auto" />
        </div>

        {/* キャプション */}
        {caption && (
          <p
            className="text-[13px] text-slate-100 whitespace-pre-wrap mt-2.5 leading-[1.55]"
            style={{ wordBreak: 'break-word' }}
          >
            <span className="font-bold mr-1.5">{username}</span>
            {caption}
          </p>
        )}

        {/* メタ行 */}
        <p className="text-[11px] text-slate-600 mt-2">{caption.length} / 2,200 文字</p>
      </article>

      {!instagramAccount && (
        <div
          className="px-4 py-2.5 text-[11px] text-slate-500 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          プレビューは仮表示です。Instagram アカウントを登録するとアバター・@ユーザー名が反映されます。
        </div>
      )}
    </div>
  );
}
