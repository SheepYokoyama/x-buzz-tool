import { CalendarClock } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { getPostPlatforms } from '@/lib/scheduled-post-payload';
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
      <div className="neon-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock size={16} className="text-neon-cyan" />
            次の予約投稿
          </h2>
          <a href="/schedule" className="text-[14px] font-semibold text-neon-purple hover:text-neon-blue transition-colors">
            すべて見る →
          </a>
        </div>
        <div className="space-y-2">
          {upcomingPosts.length === 0 ? (
            <p className="text-[14px] text-slate-500 text-center py-2">予約投稿はありません</p>
          ) : (
            upcomingPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-slate-700 line-clamp-1">{post.content}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[14px] font-medium text-neon-cyan">{formatScheduleTime(post.scheduled_at)}</p>
                    <span className="flex items-center gap-1 text-slate-500">
                      {getPostPlatforms(post.payload).map((p) => (
                        <PlatformIcon key={p} platform={p} size={11} />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
