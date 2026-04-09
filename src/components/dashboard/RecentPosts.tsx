import { Badge } from '@/components/ui/Badge';
import { Heart, Repeat2, Eye, MessageCircle } from 'lucide-react';
import type { ScheduledPostWithMetrics } from '@/lib/types';

const statusConfig = {
  published: { label: '公開済み', color: 'green'  as const },
  scheduled: { label: '予約中',   color: 'blue'   as const },
  failed:    { label: '失敗',     color: 'red'    as const },
  cancelled: { label: 'キャンセル', color: 'gray' as const },
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  posts: ScheduledPostWithMetrics[];
}

export function RecentPosts({ posts }: Props) {
  return (
    <div className="neon-card p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-200 leading-none">最近のバズ投稿</h2>
          <p className="section-label mt-1.5">直近4件のパフォーマンス</p>
        </div>
        <a
          href="/history"
          className="text-[12px] text-neon-purple/80 hover:text-neon-purple transition-colors font-medium"
        >
          すべて見る →
        </a>
      </div>

      <div className="space-y-3">
        {posts.map((post) => {
          const { label, color } = statusConfig[post.status];
          const m = post.latest_metrics;
          return (
            <div key={post.id} className="post-item">
              {/* Status + content */}
              <div className="flex items-start justify-between gap-4 mb-3.5">
                <p className="text-[13px] text-slate-300 leading-[1.6] line-clamp-2 flex-1">
                  {post.content}
                </p>
                <div className="shrink-0 pt-0.5">
                  <Badge color={color}>{label}</Badge>
                </div>
              </div>

              {/* Metrics row */}
              {post.status === 'published' && m && (
                <div className="flex items-center gap-6">
                  <Metric icon={Heart}         color="#f472b6" value={formatNumber(m.likes)} />
                  <Metric icon={Repeat2}       color="#34d399" value={formatNumber(m.retweets)} />
                  <Metric icon={Eye}           color="#60a5fa" value={formatNumber(m.impressions)} />
                  <Metric icon={MessageCircle} color="#22d3ee" value={formatNumber(m.replies)} />
                </div>
              )}

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-[11px] text-slate-600 tracking-wide">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  color,
  value,
}: {
  icon: typeof Heart;
  color: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[12px]">
      <Icon size={11} style={{ color }} />
      <span className="text-slate-300 font-medium tabular-nums">{value}</span>
    </span>
  );
}
