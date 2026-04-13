'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function SyncMetricsButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSync() {
    setState('loading');
    setMessage('');
    try {
      const res = await fetch('/api/cron/sync-metrics');
      const json = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(json.error ?? 'エラーが発生しました');
        return;
      }
      setState('done');
      setMessage(`${json.synced} 件のメトリクスを同期しました`);
      // 3秒後にページ全体をリロードして最新データを反映
      setTimeout(() => window.location.reload(), 3000);
    } catch {
      setState('error');
      setMessage('通信エラーが発生しました');
    }
  }

  const label =
    state === 'loading' ? '同期中…' :
    state === 'done'    ? '同期完了' :
    state === 'error'   ? 'エラー'   :
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
      >
        <RefreshCw
          size={12}
          className={state === 'loading' ? 'animate-spin' : ''}
        />
        {label}
      </button>
      {message && (
        <p className={`text-[11px] ${state === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
