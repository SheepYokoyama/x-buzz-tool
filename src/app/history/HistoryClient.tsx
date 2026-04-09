'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryPostItem } from '@/components/history/HistoryPostItem';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ScheduledPostStatus, ScheduledPostWithMetrics } from '@/lib/types';
import { History } from 'lucide-react';

interface Props {
  posts: ScheduledPostWithMetrics[];
}

export function HistoryClient({ posts }: Props) {
  const [filter, setFilter] = useState<ScheduledPostStatus | 'all'>('all');

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  return (
    <>
      <Header title="投稿履歴" subtitle={`全${posts.length}件`} />

      <div className="flex items-center justify-between mb-6">
        <HistoryFilters active={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="neon-card">
          <EmptyState icon={History} title="該当する投稿はありません" iconColor="#60a5fa" />
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {filtered.map((post) => <HistoryPostItem key={post.id} post={post} />)}
        </div>
      )}
    </>
  );
}
