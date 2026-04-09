'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { ScheduledPostItem } from '@/components/schedule/ScheduledPostItem';
import { NewScheduleForm } from '@/components/schedule/NewScheduleForm';
import { ScheduleStatusTabs, type TabValue } from '@/components/schedule/ScheduleStatusTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarClock } from 'lucide-react';
import type { ScheduledPost, ScheduledPostStatus } from '@/lib/types';

interface Props {
  initialPosts: ScheduledPost[];
}

const ALL_STATUSES: ScheduledPostStatus[] = ['scheduled', 'published', 'failed', 'cancelled'];

export function ScheduleClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<TabValue>('scheduled');

  // タブごとの件数
  const counts = useMemo(() => {
    const c: Record<TabValue, number> = { all: posts.length, scheduled: 0, published: 0, failed: 0, cancelled: 0 };
    for (const p of posts) c[p.status]++;
    return c;
  }, [posts]);

  // 表示する投稿
  const visiblePosts = useMemo(
    () => (activeTab === 'all' ? posts : posts.filter((p) => p.status === activeTab)),
    [posts, activeTab],
  );

  const handleAdd = (post: ScheduledPost) =>
    setPosts((prev) =>
      [...prev, post].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      ),
    );

  const handleDelete = (id: string) =>
    setPosts((prev) => prev.filter((p) => p.id !== id));

  const handleUpdate = (updated: ScheduledPost) =>
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const scheduledCount = counts['scheduled'];

  return (
    <>
      <Header
        title="予約投稿"
        subtitle={`${scheduledCount}件が予約中 / 合計${posts.length}件`}
      />
      <div className="max-w-2xl space-y-4">
        {/* ステータスタブ */}
        <ScheduleStatusTabs
          active={activeTab}
          counts={counts}
          onChange={setActiveTab}
        />

        {/* 投稿リスト */}
        <div className="space-y-3">
          {visiblePosts.length === 0 ? (
            <div className="neon-card">
              <EmptyState
                icon={CalendarClock}
                title={activeTab === 'all' ? '投稿がありません' : `「${getTabLabel(activeTab)}」の投稿はありません`}
                description={
                  activeTab === 'scheduled'
                    ? '下の「追加」ボタンから予約投稿を作成してください'
                    : 'このステータスの投稿はまだありません'
                }
                iconColor="#22d3ee"
              />
            </div>
          ) : (
            visiblePosts.map((post) => (
              <ScheduledPostItem
                key={post.id}
                post={post}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))
          )}
        </div>

        {/* 新規追加フォーム（全てタブ or 予約中タブのみ表示） */}
        {(activeTab === 'all' || activeTab === 'scheduled') && (
          <NewScheduleForm onAdd={handleAdd} />
        )}
      </div>
    </>
  );
}

function getTabLabel(tab: TabValue): string {
  const map: Record<TabValue, string> = {
    all: '全て', scheduled: '予約中', published: '公開済み', failed: '失敗', cancelled: 'キャンセル',
  };
  return map[tab];
}
