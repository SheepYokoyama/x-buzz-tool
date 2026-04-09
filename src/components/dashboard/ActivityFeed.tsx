import { CalendarClock } from 'lucide-react';
import type { ScheduledPost } from '@/lib/types';

interface Props {
  upcomingPosts: ScheduledPost[];
}

function formatScheduleTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityFeed({ upcomingPosts }: Props) {
  return (
    <div className="space-y-4">
      {/* Upcoming Scheduled */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <CalendarClock size={16} className="text-neon-cyan" />
            次の予約投稿
          </h2>
          <a href="/schedule" className="text-xs text-neon-purple hover:text-neon-blue transition-colors">
            すべて見る →
          </a>
        </div>
        <div className="space-y-2">
          {upcomingPosts.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">予約投稿はありません</p>
          ) : (
            upcomingPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 line-clamp-1">{post.content}</p>
                  <p className="text-xs text-neon-cyan mt-0.5">{formatScheduleTime(post.scheduled_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
