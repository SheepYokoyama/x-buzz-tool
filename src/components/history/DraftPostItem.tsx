'use client';

import { useState } from 'react';
import { Copy, Check, Trash2, Send, AlertCircle, ExternalLink } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { GeneratedPost } from '@/lib/types';
import { countXChars, X_COUNT_RULE, getXPlan, getXLimit } from '@/lib/x-char-count';
import { useSettings } from '@/contexts/SettingsContext';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  draft: GeneratedPost;
  onDeleted: (id: string) => void;
}

export function DraftPostItem({ draft, onDeleted }: Props) {
  const { xUser } = useSettings();
  const xLimit    = getXLimit(getXPlan(xUser?.verifiedType, xUser?.subscriptionType));
  const [copied, setCopied]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // X投稿
  const [tweetConfirm, setTweetConfirm] = useState(false);
  const [tweeting, setTweeting]         = useState(false);
  const [tweeted, setTweeted]           = useState(false);
  const [tweetUrl, setTweetUrl]         = useState<string | null>(null);
  const [tweetError, setTweetError]     = useState<string | null>(null);

  const charCount = countXChars(draft.content);
  const overLimit = charCount > xLimit;

  const handleCopy = () => {
    navigator.clipboard.writeText(draft.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    const supabase = getSupabaseBrowser();
    await supabase.from('generated_posts').delete().eq('id', draft.id);
    onDeleted(draft.id);
  };

  const handleTweetClick = () => {
    if (overLimit || tweeting || tweeted) return;
    if (tweetConfirm) {
      executeTweet();
      return;
    }
    setTweetConfirm(true);
    setTimeout(() => setTweetConfirm(false), 3000);
  };

  const executeTweet = async () => {
    setTweetConfirm(false);
    setTweeting(true);
    setTweetError(null);
    try {
      const res = await fetch('/api/x/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.content }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setTweetError(data.error ?? '投稿に失敗しました');
      } else {
        setTweeted(true);
        setTweetUrl(data.url);
        // ステータスを published に更新
        const supabase = getSupabaseBrowser();
        const now = new Date().toISOString();
        await supabase
          .from('generated_posts')
          .update({ status: 'published' })
          .eq('id', draft.id);
        await supabase.from('scheduled_posts').insert({
          content:      draft.content,
          scheduled_at: now,
          published_at: now,
          status:       'published',
          x_post_id:    data.tweetId ?? null,
          x_post_url:   data.url,
          tags:         draft.tags,
        });
      }
    } catch {
      setTweetError('ネットワークエラーが発生しました');
    } finally {
      setTweeting(false);
    }
  };

  return (
    <div className="post-item flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-2.5">
        {/* Top row */}
        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            下書き
          </span>
          <span className="text-[11px] text-slate-600">{fmtDate(draft.created_at)}</span>
          <span
            className={`text-[11px] ml-auto cursor-help ${overLimit ? 'text-red-400' : 'text-slate-600'}`}
            title={X_COUNT_RULE}
          >
            {charCount}/{xLimit.toLocaleString()} cnt
          </span>
        </div>

        {/* Content */}
        <p className="text-[13px] text-slate-300 leading-[1.65] whitespace-pre-wrap line-clamp-4">
          {draft.content}
        </p>

        {/* Tags */}
        {draft.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {draft.tags.map((t) => (
              <span key={t} className="text-[11px] text-slate-600">#{t}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {/* コピー */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: copied ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
              border: copied ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.07)',
              color: copied ? '#34d399' : '#64748b',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'コピー済み' : 'コピー'}
          </button>

          {/* X投稿 */}
          {tweeted ? (
            <a
              href={tweetUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}
            >
              <ExternalLink size={11} />
              投稿済み ↗
            </a>
          ) : (
            <button
              onClick={handleTweetClick}
              disabled={tweeting || overLimit}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl transition-all"
              style={{
                background: tweetConfirm ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                border: tweetConfirm
                  ? '1px solid rgba(251,191,36,0.3)'
                  : overLimit
                    ? '1px solid rgba(239,68,68,0.2)'
                    : '1px solid rgba(255,255,255,0.07)',
                color: tweetConfirm ? '#fbbf24' : overLimit || tweeting ? '#475569' : '#64748b',
                cursor: tweeting || overLimit ? 'not-allowed' : 'pointer',
              }}
            >
              {tweetConfirm ? <AlertCircle size={11} /> : <Send size={11} />}
              {tweeting ? '投稿中…' : tweetConfirm ? '本当に投稿？' : overLimit ? `${charCount}cnt（超過）` : 'X投稿'}
            </button>
          )}

          {/* 削除 */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl transition-all ml-auto"
            style={{
              background: confirmDelete ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
              border: confirmDelete ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
              color: confirmDelete ? '#f87171' : '#475569',
              cursor: deleting ? 'default' : 'pointer',
            }}
          >
            <Trash2 size={11} />
            {deleting ? '削除中…' : confirmDelete ? '本当に削除？' : '削除'}
          </button>
        </div>

        {tweetError && (
          <p className="text-[11px] text-red-400">{tweetError}</p>
        )}
      </div>
    </div>
  );
}
