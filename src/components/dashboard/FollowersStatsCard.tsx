'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { apiFetch } from '@/lib/api-fetch';
import { StatsCard } from './StatsCard';

type Reason = 'not_configured' | 'timeout' | 'api_error' | null;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * フォロワー数カード（クライアントサイド非同期取得）。
 * アクティブな X 連携がある場合のみ /api/x/followers を呼ぶ。
 * X API のレスポンスを待たずにダッシュボードは即描画される。
 */
export function FollowersStatsCard() {
  const { xUser } = useSettings();
  const [followers, setFollowers] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<Reason>(null);

  useEffect(() => {
    // アクティブな X 連携がないときは API を叩かない
    if (!xUser) {
      setFollowers(null);
      setReason('not_configured');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReason(null);

    apiFetch('/api/x/followers')
      .then((r) => r.json())
      .then((d: { followers: number | null; reason: Reason }) => {
        if (cancelled) return;
        setFollowers(d.followers);
        setReason(d.reason);
      })
      .catch(() => {
        if (cancelled) return;
        setReason('api_error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [xUser]);

  const display =
    followers !== null ? fmt(followers) : loading ? '…' : '—';

  return (
    <div
      title={
        reason === 'timeout'
          ? 'X API の応答が遅いため取得を中断しました'
          : reason === 'api_error'
          ? 'X API の呼び出しでエラーが発生しました'
          : reason === 'not_configured'
          ? 'X アカウント未連携'
          : undefined
      }
    >
      <StatsCard title="フォロワー数" value={display} icon={Users} color="purple" />
    </div>
  );
}
