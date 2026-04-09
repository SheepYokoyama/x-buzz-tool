import { Badge } from '@/components/ui/Badge';
import { Heart, Repeat2, Eye, MessageCircle } from 'lucide-react';
import type { ScheduledPostWithMetrics } from '@/lib/types';

const statusConfig = {
  published: { label: '公開済み', color: 'green'  as const },
  scheduled: { label: '予約中',   color: 'blue'   as const },
  failed:    { label: '失敗',     color: 'red'    as const },
  cancelled: { label: 'キャンセル', color: 'gray' as const },
};

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

export function HistoryPostItem({ post }: { post: ScheduledPostWithMetrics }) {
  const cfg = statusConfig[post.status];
  const m = post.latest_metrics;
  const engRate = m && m.impressions > 0
    ? (((m.likes + m.retweets + m.replies) / m.impressions) * 100).toFixed(1)
    : null;

  return (
    <div className="post-item flex items-start gap-4">
      <div className="flex-1 min-w-0">
        {/* Top row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <Badge color={cfg.color}>{cfg.label}</Badge>
          <span className="text-[11px] text-slate-600">{fmtDate(post.published_at)}</span>
          {engRate && (
            <span className="text-[11px] text-neon-green ml-auto font-medium">
              ENG {engRate}%
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-[13px] text-slate-300 leading-[1.65] whitespace-pre-wrap line-clamp-3">
          {post.content}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex gap-2 mt-2.5">
            {post.tags.map((t) => (
              <span key={t} className="text-[11px] text-slate-600">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Metrics block */}
      {m && post.status === 'published' && (
        <div
          className="shrink-0 rounded-xl p-3 space-y-2"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 72 }}
        >
          {[
            { icon: Heart,         color: '#f472b6', val: fmt(m.likes)       },
            { icon: Repeat2,       color: '#34d399', val: fmt(m.retweets)    },
            { icon: Eye,           color: '#60a5fa', val: fmt(m.impressions) },
            { icon: MessageCircle, color: '#22d3ee', val: fmt(m.replies)     },
          ].map(({ icon: Icon, color: c, val }) => (
            <div key={c} className="flex items-center gap-1.5 text-[12px]">
              <Icon size={11} style={{ color: c }} />
              <span className="text-slate-300 font-medium tabular-nums">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
