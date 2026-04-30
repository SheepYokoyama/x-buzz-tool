'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

interface Props {
  /** サーバー側で取得した最終同期時刻（ISO 文字列）。null なら未同期。 */
  lastSyncedAt: string | null;
}

export function SyncMetricsButton({ lastSyncedAt }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string>(() =>
    formatRelative(lastSyncedAt),
  );

  // 1分ごとに「N分前」表示を更新
  useEffect(() => {
    setLastSyncedLabel(formatRelative(lastSyncedAt));
    const id = setInterval(() => setLastSyncedLabel(formatRelative(lastSyncedAt)), 60_000);
    return () => clearInterval(id);
  }, [lastSyncedAt]);

  async function handleSync() {
    setState('loading');
    setMessage('');
    try {
      const res = await apiFetch('/api/metrics/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(json.error ?? 'エラーが発生しました');
        return;
      }
      setState('done');
      const synced  = json.synced  ?? 0;
      const failed  = json.failed  ?? 0;
      const skipped = json.skipped ?? 0;
      setMessage(
        synced === 0 && failed === 0
          ? '同期対象がありませんでした'
          : `${synced}件同期${failed > 0 ? ` / ${failed}件失敗` : ''}${skipped > 0 ? ` / ${skipped}件スキップ` : ''}`,
      );
      // Server Component を再フェッチして KPI を更新（フルリロードはしない）
      router.refresh();
      // メッセージは数秒後に消す
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('error');
      setMessage('通信エラーが発生しました');
    }
  }

  const label =
    state === 'loading' ? '同期中…' :
    state === 'done'    ? '同期完了' :
    state === 'error'   ? '再試行'   :
    'メトリクス同期';

  const color =
    state === 'done'  ? 'text-neon-green' :
    state === 'error' ? 'text-red-400'    :
    'text-slate-400 hover:text-slate-200';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${color}`}
        title={lastSyncedAt ? `前回: ${new Date(lastSyncedAt).toLocaleString('ja-JP')}` : '未同期'}
      >
        <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : ''} />
        {label}
      </button>
      {message ? (
        <p className={`text-[11px] ${state === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
          {message}
        </p>
      ) : (
        <p className="text-[11px] text-slate-600">{lastSyncedLabel}</p>
      )}
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return '未同期';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '未同期';
  const diffMs  = Date.now() - t;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)    return 'たった今 同期';
  if (diffMin < 60)   return `${diffMin}分前に同期`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24)  return `${diffHour}時間前に同期`;
  const diffDay  = Math.floor(diffHour / 24);
  if (diffDay  < 7)   return `${diffDay}日前に同期`;
  return new Date(iso).toLocaleDateString('ja-JP') + ' に同期';
}
