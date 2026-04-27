'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Zap, Plus, Pencil, Trash2, CheckCircle2, Check, Star } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { AIKeyForm } from '@/components/ai-keys/AIKeyForm';
import { PROVIDER_META, type AIProvider as Provider } from '@/lib/ai-providers';

interface AIKeyRow {
  provider:  Provider;
  keyMasked: string;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_ICONS: Record<Provider, React.ComponentType<{ size?: number; className?: string }>> = {
  gemini:    Sparkles,
  anthropic: Zap,
};

export function AIKeysClient() {
  const [keys, setKeys]         = useState<AIKeyRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await apiFetch('/api/ai-keys');
      const d   = await res.json();
      setKeys(Array.isArray(d.keys) ? d.keys : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleSaved = async () => {
    setEditingProvider(null);
    await fetchKeys();
  };

  const handleDelete = async (provider: Provider) => {
    if (!confirm(`${PROVIDER_META[provider].label} のキーを削除しますか？\nこのプロバイダを選んで生成・リライトができなくなります。`)) return;
    try {
      const res = await apiFetch(`/api/ai-keys/${provider}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      await fetchKeys();
    } catch {
      alert('削除に失敗しました。もう一度お試しください。');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-600">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-[13px]">読み込み中…</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['gemini', 'anthropic'] as Provider[]).map((provider) => {
          const meta = PROVIDER_META[provider];
          const existing = keys.find((k) => k.provider === provider);
          const Icon = PROVIDER_ICONS[provider];
          const exclusiveSet = new Set(meta.exclusive ?? []);

          return (
            <div
              key={provider}
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${meta.roleColor}18`, border: `1px solid ${meta.roleColor}35` }}
                >
                  <Icon size={18} className="text-slate-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14px] font-semibold text-slate-200">{meta.label}</h3>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                      style={{
                        color: meta.roleColor,
                        background: `${meta.roleColor}18`,
                        border: `1px solid ${meta.roleColor}30`,
                      }}
                    >
                      {meta.roleLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{meta.desc}</p>
                </div>
              </div>

              {/* 登録すると使える機能 */}
              <div
                className="rounded-xl p-3 space-y-1.5"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">登録すると使える機能</p>
                <ul className="space-y-1">
                  {meta.features.map((feature) => {
                    const isExclusive = exclusiveSet.has(feature);
                    return (
                      <li key={feature} className="flex items-center gap-1.5">
                        {isExclusive
                          ? <Star size={10} style={{ color: meta.roleColor }} />
                          : <Check size={10} style={{ color: meta.roleColor }} />
                        }
                        <span className="text-[12px] text-slate-300">{feature}</span>
                        {isExclusive && (
                          <span
                            className="text-[9px] font-semibold px-1 py-px rounded"
                            style={{ color: meta.roleColor, background: `${meta.roleColor}15`, border: `1px solid ${meta.roleColor}30` }}
                          >
                            専用
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[10px] text-slate-600 leading-relaxed mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  料金: {meta.pricing}
                </p>
              </div>

              {existing ? (
                <>
                  <div
                    className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}
                  >
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span className="text-[12px] text-emerald-300 font-medium">登録済み</span>
                    <span className="text-[11px] text-slate-500 font-mono ml-auto">{existing.keyMasked}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingProvider(provider)}
                      className="flex-1 py-2 rounded-lg text-[12px] font-medium text-slate-300 flex items-center justify-center gap-1.5 transition-colors hover:bg-white/[0.04]"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <Pencil size={12} />
                      更新
                    </button>
                    <button
                      onClick={() => handleDelete(provider)}
                      className="py-2 px-3 rounded-lg text-[12px] text-red-400 flex items-center gap-1.5 transition-colors hover:bg-red-500/10"
                      style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <Trash2 size={12} />
                      削除
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setEditingProvider(provider)}
                  className="w-full py-3 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: `linear-gradient(135deg, ${meta.roleColor}, ${meta.roleColor}aa)` }}
                >
                  <Plus size={14} />
                  API キーを登録
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editingProvider && (
        <AIKeyForm
          provider={editingProvider}
          isEdit={keys.some((k) => k.provider === editingProvider)}
          onClose={() => setEditingProvider(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
