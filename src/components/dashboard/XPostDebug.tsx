'use client';

import { useState } from 'react';
import { Send, ExternalLink } from 'lucide-react';
import { VoiceTextarea } from '@/components/ui/Input';
import { getSupabaseBrowser } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';
import { countXChars, X_COUNT_RULE, getXPlan, getXLimit } from '@/lib/x-char-count';
import { useSettings } from '@/contexts/SettingsContext';

export function XPostDebug() {
  const { xUser } = useSettings();
  const xLimit    = getXLimit(getXPlan(xUser?.verifiedType, xUser?.subscriptionType));

  const [text, setText]       = useState('');
  const [posting, setPosting] = useState(false);
  const [result, setResult]   = useState<{ ok: true; url: string } | { ok: false; error: string } | null>(null);

  const charCount = countXChars(text);

  const handlePost = async () => {
    if (!text.trim() || posting || charCount > xLimit) return;
    setPosting(true);
    setResult(null);

    try {
      const res  = await apiFetch('/api/x/tweet', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setResult({ ok: false, error: data.error ?? '投稿失敗' });
      } else {
        setResult({ ok: true, url: data.url });
        setText('');
        // ダッシュボード「最近のバズ投稿」に表示されるよう scheduled_posts に保存
        const now = new Date().toISOString();
        const supabase = getSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('scheduled_posts').insert({
            content:      text,
            scheduled_at: now,
            published_at: now,
            status:       'published',
            x_post_id:    data.tweetId ?? null,
            x_post_url:   data.url,
            tags:         [],
            user_id:      user.id,
          });
        }
      }
    } catch {
      setResult({ ok: false, error: 'ネットワークエラー' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="neon-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-slate-600 tracking-wide">X に直接投稿</p>
        <span
          className="text-[12px] px-2 py-0.5 rounded-lg cursor-help"
          style={{ background: 'rgba(15,23,42,0.04)', color: '#64748b', border: '1px solid rgba(15,23,42,0.08)' }}
          title={X_COUNT_RULE}
        >
          全角2 / 半角1 cnt
        </span>
      </div>

      <VoiceTextarea
        value={text}
        onValueChange={setText}
        appendMode
        rows={3}
        placeholder="投稿テキストを入力…"
      />

      <div className="flex items-center justify-between">
        <span
          className={`text-[13px] cursor-help ${charCount > xLimit ? 'text-red-600' : 'text-slate-500'}`}
          title={X_COUNT_RULE}
        >
          {charCount} / {xLimit.toLocaleString()} cnt
        </span>

        <button
          onClick={handlePost}
          disabled={!text.trim() || posting || charCount > xLimit}
          className="flex items-center gap-1.5 text-[14px] px-4 py-1.5 rounded-xl font-medium transition-all"
          style={{
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.25)',
            color: !text.trim() || posting || charCount > xLimit ? '#94a3b8' : '#2563eb',
            cursor: !text.trim() || posting || charCount > xLimit ? 'not-allowed' : 'pointer',
          }}
        >
          <Send size={12} />
          {posting ? '投稿中…' : 'X に投稿'}
        </button>
      </div>

      {result && (
        result.ok ? (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] text-neon-green"
          >
            <ExternalLink size={12} />
            投稿成功 — ツイートを確認 ↗
          </a>
        ) : (
          <p className="text-[14px] text-red-600">{result.error}</p>
        )
      )}
    </div>
  );
}
