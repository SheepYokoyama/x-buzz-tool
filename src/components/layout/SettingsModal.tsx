'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import type { AiProvider } from '@/lib/types';

interface Props {
  onClose: () => void;
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string; desc: string; badge: string; badgeColor: string }[] = [
  {
    value: 'gemini',
    label: 'Gemini API',
    desc: 'Google製モデル（gemini-2.5-flash）',
    badge: '無料',
    badgeColor: '#34d399',
  },
  {
    value: 'anthropic',
    label: 'Anthropic API',
    desc: 'Claude モデル（claude-haiku-4-5）',
    badge: '有料',
    badgeColor: '#f59e0b',
  },
];

export function SettingsModal({ onClose }: Props) {
  const { settings, updateSettings } = useSettings();

  // ESCで閉じる
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-[1.5rem] p-6 flex flex-col gap-5"
        style={{
          background: 'rgba(15,23,42,0.98)',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 0 60px rgba(167,139,250,0.1), 0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-200">設定</h2>
            <p className="text-[11px] text-slate-500 mt-1">アプリの動作設定を変更します</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* 区切り */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* AI プロバイダー */}
        <div>
          <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            AI プロバイダー
          </p>
          <p className="text-[12px] text-slate-500 mb-3">
            投稿生成に使用する AI エンジンを選択します。
          </p>
          <div className="flex flex-col gap-2">
            {PROVIDER_OPTIONS.map(({ value, label, desc, badge, badgeColor }) => {
              const active = settings.aiProvider === value;
              return (
                <button
                  key={value}
                  onClick={() => updateSettings({ aiProvider: value })}
                  className="flex items-center gap-3 p-4 rounded-xl transition-all text-left cursor-pointer"
                  style={{
                    background: active ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.025)',
                    border: active ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* ラジオ */}
                  <span
                    className="w-4 h-4 rounded-full border-2 shrink-0 transition-all"
                    style={{
                      borderColor: active ? '#60a5fa' : '#334155',
                      background: active ? '#60a5fa' : 'transparent',
                      boxShadow: active ? '0 0 6px rgba(96,165,250,0.5)' : 'none',
                    }}
                  />
                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: active ? '#e2e8f0' : '#94a3b8' }}>
                      {label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>{desc}</p>
                  </div>
                  {/* バッジ */}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                    style={{
                      color: badgeColor,
                      background: `${badgeColor}18`,
                      border: `1px solid ${badgeColor}30`,
                    }}
                  >
                    {badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
