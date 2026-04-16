'use client';

import { useState } from 'react';
import { UserPlus, SkipForward, ExternalLink, Loader2 } from 'lucide-react';
import type { FollowCandidate } from '@/lib/types';

interface Props {
  candidate: FollowCandidate;
  canFollow: boolean;
  onFollow: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}

/** bio 内のマッチキーワードをハイライトして返す（大小文字区別なし） */
function highlightKeywords(text: string, keywords: string[]): React.ReactNode[] {
  if (!text) return [''];
  if (keywords.length === 0) return [text];

  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part)
      ? <span key={i} className="text-neon-purple font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function formatCount(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function CandidateCard({ candidate, canFollow, onFollow, onSkip }: Props) {
  const [acting, setActing] = useState<'follow' | 'skip' | null>(null);

  const handleFollow = async () => {
    setActing('follow');
    try { await onFollow(candidate.id); } finally { setActing(null); }
  };

  const handleSkip = async () => {
    setActing('skip');
    try { await onSkip(candidate.id); } finally { setActing(null); }
  };

  const ffRatio = candidate.ff_ratio;
  const ffRatioColor = ffRatio && ffRatio >= 1.0 && ffRatio <= 1.5 ? '#a78bfa' : '#64748b';

  return (
    <div
      className="rounded-[1.375rem] p-5 flex flex-col gap-4 transition-all"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── ヘッダー: アバター・名前・FF比 ── */}
      <div className="flex items-start gap-3">
        {candidate.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.profile_image_url}
            alt={candidate.display_name ?? candidate.username}
            className="w-11 h-11 rounded-full shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          />
        ) : (
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
          >
            {candidate.username.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-slate-200 truncate">
              {candidate.display_name ?? candidate.username}
            </p>
            <a
              href={`https://x.com/${candidate.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
              title="X で開く"
            >
              <ExternalLink size={12} />
            </a>
          </div>
          <p className="text-[12px] text-slate-500 truncate">@{candidate.username}</p>
        </div>

        {/* FF比バッジ */}
        {ffRatio !== null && Number.isFinite(ffRatio) && (
          <div
            className="shrink-0 text-center px-2.5 py-1 rounded-lg"
            style={{
              background: 'rgba(167,139,250,0.08)',
              border: `1px solid ${ffRatioColor}33`,
            }}
            title="FF比 = フォロワー ÷ フォロー中"
          >
            <p className="text-[9px] text-slate-600 font-medium leading-tight">FF比</p>
            <p className="text-[13px] font-bold leading-tight" style={{ color: ffRatioColor }}>
              {ffRatio.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* ── フォロワー数 / フォロー中数 ── */}
      <div className="flex items-center gap-4 text-[12px]">
        <span className="text-slate-400">
          <span className="text-slate-600">フォロワー</span> {formatCount(candidate.followers_count)}
        </span>
        <span className="text-slate-400">
          <span className="text-slate-600">フォロー中</span> {formatCount(candidate.following_count)}
        </span>
      </div>

      {/* ── bio ── */}
      {candidate.bio && (
        <div
          className="text-[12px] text-slate-400 leading-relaxed rounded-lg px-3 py-2 max-h-24 overflow-y-auto"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          {highlightKeywords(candidate.bio, candidate.matched_keywords)}
        </div>
      )}

      {/* ── 直近ツイート ── */}
      {candidate.sample_tweet_text && (
        <div
          className="text-[11px] text-slate-500 leading-relaxed rounded-lg px-3 py-2"
          style={{ background: 'rgba(96,165,250,0.03)', border: '1px solid rgba(96,165,250,0.07)' }}
        >
          <p className="text-[9px] text-slate-600 mb-1 uppercase tracking-wider">直近のツイート</p>
          {highlightKeywords(candidate.sample_tweet_text, candidate.matched_keywords)}
        </div>
      )}

      {/* ── アクションボタン ── */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleFollow}
          disabled={acting !== null || !canFollow}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canFollow ? 'linear-gradient(135deg, #60a5fa, #a78bfa)' : 'rgba(255,255,255,0.04)',
            color: canFollow ? 'white' : '#64748b',
            boxShadow: canFollow ? '0 0 14px rgba(167,139,250,0.2)' : undefined,
          }}
        >
          {acting === 'follow' ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          フォロー
        </button>
        <button
          onClick={handleSkip}
          disabled={acting !== null}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#64748b',
          }}
        >
          {acting === 'skip' ? <Loader2 size={13} className="animate-spin" /> : <SkipForward size={13} />}
          スキップ
        </button>
      </div>
    </div>
  );
}
