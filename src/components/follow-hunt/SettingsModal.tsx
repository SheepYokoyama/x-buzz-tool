'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { FollowHuntSettings } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';

interface Props {
  settings: FollowHuntSettings;
  onClose: () => void;
  onSaved: (updated: FollowHuntSettings) => void;
}

export function SettingsModal({ settings, onClose, onSaved }: Props) {
  const [minFfRatio,    setMinFfRatio]    = useState(settings.min_ff_ratio);
  const [maxFfRatio,    setMaxFfRatio]    = useState(settings.max_ff_ratio);
  const [minFollowers,  setMinFollowers]  = useState(settings.min_followers);
  const [maxFollowers,  setMaxFollowers]  = useState(settings.max_followers);
  const [maxResults,    setMaxResults]    = useState(settings.max_results);
  const [dailyCap,      setDailyCap]      = useState(settings.daily_follow_cap);
  const [bannedWordsText, setBannedWordsText] = useState(settings.banned_words.join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const estimatedCost = Math.round((0.005 * maxResults + 0.01 * maxResults) * 100) / 100;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const banned_words = bannedWordsText.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const res = await apiFetch('/api/follow-hunt/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          min_ff_ratio:     minFfRatio,
          max_ff_ratio:     maxFfRatio,
          min_followers:    minFollowers,
          max_followers:    maxFollowers,
          max_results:      maxResults,
          daily_follow_cap: dailyCap,
          banned_words,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '保存に失敗しました');
      onSaved(d.settings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[1.5rem] p-6 my-8"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── ヘッダー ── */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold text-slate-200">フォロー候補の設定</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* ── 1回の探索件数 ── */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-2">
              1回の探索で取得する件数
              <span className="ml-2 text-[10px] text-slate-600">
                ≈ ${estimatedCost.toFixed(2)}
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-[13px] font-mono text-slate-300 w-12 text-right">{maxResults}</span>
            </div>
          </div>

          {/* ── FF比範囲 ── */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-2">
              FF比の範囲（フォロワー ÷ フォロー中）
            </label>
            <div className="flex items-center gap-2">
              <NumberField value={minFfRatio} onChange={setMinFfRatio} step={0.1} min={0} />
              <span className="text-slate-500">〜</span>
              <NumberField value={maxFfRatio} onChange={setMaxFfRatio} step={0.1} min={0} />
            </div>
          </div>

          {/* ── フォロワー数範囲 ── */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-2">
              フォロワー数の範囲
            </label>
            <div className="flex items-center gap-2">
              <NumberField value={minFollowers} onChange={setMinFollowers} step={100} min={0} />
              <span className="text-slate-500">〜</span>
              <NumberField value={maxFollowers} onChange={setMaxFollowers} step={100} min={0} />
            </div>
          </div>

          {/* ── 日次フォロー上限 ── */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-2">
              1日のフォロー上限
            </label>
            <NumberField value={dailyCap} onChange={setDailyCap} step={1} min={1} max={100} />
          </div>

          {/* ── 禁止ワード ── */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-2">
              bio 除外ワード（改行で区切る）
            </label>
            <textarea
              value={bannedWordsText}
              onChange={(e) => setBannedWordsText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-[12px] text-slate-200 rounded-lg font-mono resize-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}
        </div>

        {/* ── アクションボタン ── */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              boxShadow: '0 0 14px rgba(167,139,250,0.2)',
            }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  value, onChange, step, min, max,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-3 py-1.5 text-[12px] text-slate-200 rounded-lg font-mono"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    />
  );
}
