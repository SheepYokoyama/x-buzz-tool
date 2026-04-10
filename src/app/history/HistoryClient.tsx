'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryPostItem } from '@/components/history/HistoryPostItem';
import { DraftPostItem } from '@/components/history/DraftPostItem';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ScheduledPostStatus, ScheduledPostWithMetrics, GeneratedPost } from '@/lib/types';
import { History, Bookmark } from 'lucide-react';

interface Props {
  posts: ScheduledPostWithMetrics[];
  drafts: GeneratedPost[];
}

type MainTab = 'history' | 'drafts';

export function HistoryClient({ posts, drafts: initialDrafts }: Props) {
  const [mainTab, setMainTab]   = useState<MainTab>('history');
  const [filter, setFilter]     = useState<ScheduledPostStatus | 'all'>('all');
  const [drafts, setDrafts]     = useState<GeneratedPost[]>(initialDrafts);

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  const handleDraftDeleted = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <>
      <Header
        title="投稿履歴"
        subtitle={mainTab === 'drafts' ? `下書き ${drafts.length}件` : `全${posts.length}件`}
      />

      {/* ── メインタブ ── */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setMainTab('history')}
          className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-xl font-medium transition-all"
          style={{
            background: mainTab === 'history' ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)',
            border: mainTab === 'history' ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
            color: mainTab === 'history' ? '#a78bfa' : '#64748b',
          }}
        >
          <History size={14} />
          投稿履歴
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-md ml-0.5"
            style={{
              background: mainTab === 'history' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
              color: mainTab === 'history' ? '#c4b5fd' : '#475569',
            }}
          >
            {posts.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('drafts')}
          className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-xl font-medium transition-all"
          style={{
            background: mainTab === 'drafts' ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
            border: mainTab === 'drafts' ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
            color: mainTab === 'drafts' ? '#60a5fa' : '#64748b',
          }}
        >
          <Bookmark size={14} />
          下書き
          {drafts.length > 0 && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md ml-0.5"
              style={{
                background: mainTab === 'drafts' ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.1)',
                color: mainTab === 'drafts' ? '#93c5fd' : '#fbbf24',
              }}
            >
              {drafts.length}
            </span>
          )}
        </button>
      </div>

      {/* ── 投稿履歴タブ ── */}
      {mainTab === 'history' && (
        <>
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
      )}

      {/* ── 下書きタブ ── */}
      {mainTab === 'drafts' && (
        <>
          {drafts.length === 0 ? (
            <div className="neon-card">
              <EmptyState icon={Bookmark} title="下書きはありません" iconColor="#60a5fa" />
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {drafts.map((draft) => (
                <DraftPostItem key={draft.id} draft={draft} onDeleted={handleDraftDeleted} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
