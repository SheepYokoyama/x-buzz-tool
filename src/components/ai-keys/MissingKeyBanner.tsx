'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

type Provider = 'gemini' | 'anthropic';

interface Props {
  /** チェック対象のプロバイダ */
  provider: Provider;
}

const LABELS: Record<Provider, string> = {
  gemini:    'Gemini',
  anthropic: 'Anthropic',
};

/**
 * 現在選択中の AI プロバイダの API キーが未登録のとき警告バナーを表示する。
 * 登録済みなら何も描画しない。
 */
export function MissingKeyBanner({ provider }: Props) {
  const [status, setStatus] = useState<'loading' | 'registered' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/ai-keys');
        const d = await res.json();
        if (cancelled) return;
        const registered = Array.isArray(d.keys) && d.keys.some((k: { provider: string }) => k.provider === provider);
        setStatus(registered ? 'registered' : 'missing');
      } catch {
        if (!cancelled) setStatus('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [provider]);

  if (status !== 'missing') return null;

  return (
    <Link
      href="/ai-keys"
      className="group flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-amber-500/[0.08]"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-amber-200 leading-tight">
          {LABELS[provider]} API キーが未登録です
        </p>
        <p className="text-[11px] text-amber-300/60 mt-0.5">
          登録すると生成・リライトが利用できます
        </p>
      </div>
      <ArrowRight size={13} className="text-amber-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
