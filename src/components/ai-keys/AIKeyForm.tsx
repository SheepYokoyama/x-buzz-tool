'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Eye, EyeOff, Loader2, BookOpen, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

type Provider = 'gemini' | 'anthropic';

interface Props {
  provider: Provider;
  isEdit:   boolean;
  onClose:  () => void;
  onSaved:  () => void;
}

const PROVIDER_LABELS: Record<Provider, { label: string; placeholder: string; hint: string }> = {
  gemini: {
    label:       'Gemini API',
    placeholder: 'AIza...',
    hint:        'Google AI Studio で発行した API キー',
  },
  anthropic: {
    label:       'Anthropic API',
    placeholder: 'sk-ant-...',
    hint:        'Anthropic Console で発行した API キー',
  },
};

export function AIKeyForm({ provider, isEdit, onClose, onSaved }: Props) {
  const meta = PROVIDER_LABELS[provider];

  const [apiKey, setApiKey] = useState('');
  const [show, setShow]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!apiKey.trim()) {
      setError('API キーを入力してください');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/ai-keys/${provider}`, {
        method: 'PUT',
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '保存に失敗しました');
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => onSaved(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-[15px] font-semibold text-slate-200">
            {meta.label} キーを{isEdit ? '更新' : '登録'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
              API キー <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={meta.placeholder}
                className="w-full rounded-lg pl-3 pr-10 py-2.5 text-[13px] font-mono text-slate-200 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                tabIndex={-1}
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{meta.hint}</p>
            <Link
              href="/guide/ai-keys"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-[11px] text-sky-300 hover:underline mt-2"
            >
              <BookOpen size={11} />
              キーの取得方法（マニュアル）を見る
            </Link>
          </div>

          {error && (
            <p className="text-[12px] text-red-400 rounded-lg px-3 py-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              認証に失敗しました: {error}
            </p>
          )}

          {success && !error && (
            <div
              className="flex items-center gap-2 text-[12px] rounded-lg px-3 py-2"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span className="text-emerald-300">
                キーの検証に成功しました。{isEdit ? '更新' : '登録'}を完了します。
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
            >
              {saving && !success && <Loader2 size={14} className="animate-spin" />}
              {success && <CheckCircle2 size={14} />}
              {success
                ? '完了'
                : saving
                  ? '検証中…'
                  : (isEdit ? '更新する' : '登録する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
