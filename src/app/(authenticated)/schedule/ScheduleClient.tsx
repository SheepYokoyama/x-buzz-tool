'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { ScheduledPostItem } from '@/components/schedule/ScheduledPostItem';
import { ScheduleStatusTabs, type TabValue } from '@/components/schedule/ScheduleStatusTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarClock, PenLine } from 'lucide-react';
import type { ScheduledPost } from '@/lib/types';

interface Props {
  initialPosts: ScheduledPost[];
}

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
        {/* ── ポスト作成への導線（新規予約はポスト作成画面で作る） ── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[13px] text-slate-500 leading-relaxed">
            新しい予約は「ポスト作成」で日時を指定して作成します。
          </p>
          <Link
            href="/post-create"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.30)',
              color: '#7c3aed',
            }}
          >
            <PenLine size={12} />
            ポスト作成へ
          </Link>
        </div>

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
                  activeTab === 'scheduled' || activeTab === 'all'
                    ? 'ポスト作成画面で本文を入力し「予約」ボタンから日時を指定してください'
                    : 'このステータスの投稿はまだありません'
                }
                iconColor="#0891b2"
              />
              {(activeTab === 'scheduled' || activeTab === 'all') && (
                <div className="px-6 pb-6 flex justify-center">
                  <Link
                    href="/post-create"
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold px-4 py-2 rounded-xl transition-all"
                    style={{
                      background: 'rgba(167,139,250,0.12)',
                      border: '1px solid rgba(167,139,250,0.35)',
                      color: '#7c3aed',
                    }}
                  >
                    <PenLine size={13} />
                    ポスト作成画面を開く
                  </Link>
                </div>
              )}
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
