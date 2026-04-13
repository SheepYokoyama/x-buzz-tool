export const dynamic = 'force-dynamic';

import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentPosts } from '@/components/dashboard/RecentPosts';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { getDashboardStats, getFollowersCount } from '@/lib/api/stats';
import { XPostDebug } from '@/components/dashboard/XPostDebug';
import { SyncMetricsButton } from '@/components/dashboard/SyncMetricsButton';
import { getRecentPublishedPosts, getUpcomingScheduledPosts } from '@/lib/api/scheduled-posts';
import { FileText, Heart, Eye, TrendingUp, Users, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function DashboardPage() {
  const [stats, recentPosts, upcomingPosts, followers] = await Promise.all([
    getDashboardStats(),
    getRecentPublishedPosts(4),
    getUpcomingScheduledPosts(3),
    getFollowersCount(),
  ]);

  return (
    <>
      <Header
        title="ダッシュボード"
        subtitle="今月のパフォーマンス概要"
      />

      {/* ── バナー ────────────────────────────────── */}
      <div className="banner-glass rounded-[1.375rem] px-5 py-4 mb-10 flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(96,165,250,0.12)',
            border: '1px solid rgba(96,165,250,0.2)',
          }}
        >
          <Sparkles size={16} style={{ color: '#60a5fa' }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-slate-200 leading-none">
            AIが本日のバズ投稿候補を{' '}
            <span style={{ color: '#60a5fa' }}>3件</span> 生成しました
          </p>
          <p className="text-[12px] text-slate-500 mt-1.5 leading-none">
            テック起業家キャラで「AI活用」トピックの投稿案が揃っています
          </p>
        </div>

        <Link
          href="/generate"
          className="flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors"
          style={{ color: '#60a5fa' }}
        >
          投稿案を確認する <ArrowRight size={13} />
        </Link>
      </div>

      {/* ── KPI 4枚 ──────────────────────────────── */}
      <div className="mb-2 flex items-center justify-between">
        <p className="section-label">今月の成果</p>
        <SyncMetricsButton />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <StatsCard
          title="総投稿数"
          value={stats.totalPosts}
          icon={FileText}
          change={stats.changes.totalPosts ?? undefined}
          changeLabel="先月比"
          color="blue"
        />
        <StatsCard
          title="総いいね数"
          value={fmt(stats.totalLikes)}
          icon={Heart}
          change={stats.changes.totalLikes ?? undefined}
          changeLabel="先月比"
          color="pink"
        />
        <StatsCard
          title="インプレッション"
          value={fmt(stats.totalImpressions)}
          icon={Eye}
          change={stats.changes.totalImpressions ?? undefined}
          changeLabel="先月比"
          color="cyan"
        />
        <StatsCard
          title="エンゲージメント率"
          value={`${stats.avgEngagementRate}%`}
          icon={TrendingUp}
          change={stats.changes.avgEngagementRate ?? undefined}
          changeLabel="先月比"
          color="green"
        />
        <StatsCard
          title="フォロワー数"
          value={followers !== null ? fmt(followers) : '—'}
          icon={Users}
          color="purple"
        />
      </div>

      {/* ── 投稿一覧 + クイックアクション ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RecentPosts posts={recentPosts} />
        </div>
        <div className="space-y-5">
          <ActivityFeed upcomingPosts={upcomingPosts} />
          <QuickActions />
          <XPostDebug />
        </div>
      </div>
    </>
  );
}
