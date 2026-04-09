'use client';

import { Button } from '@/components/ui/Button';
import { PersonaKeywords } from './PersonaKeywords';
import { Check, Edit2 } from 'lucide-react';
import type { Character } from '@/lib/types';

interface Props {
  persona: Character;
  onActivate: (id: string) => void;
}

export function PersonaCard({ persona, onActivate }: Props) {
  return (
    <div
      className="neon-card p-6 flex flex-col gap-4 transition-all duration-300"
      style={persona.is_active ? {
        borderColor: 'rgba(167,139,250,0.3)',
        boxShadow: '0 0 40px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 56px rgba(0,0,0,0.45)',
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.15)',
            }}
          >
            {persona.avatar}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-slate-200 leading-tight">{persona.name}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{persona.tone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {persona.is_active && (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" style={{ boxShadow: '0 0 4px #34d399' }} />
              使用中
            </span>
          )}
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-slate-600 hover:text-neon-blue"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Edit2 size={12} />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-slate-500 leading-relaxed">{persona.description}</p>

      {/* Style */}
      <div>
        <p className="section-label mb-2">スタイル</p>
        <p
          className="text-[12px] text-slate-400 rounded-xl px-3.5 py-2.5 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {persona.style}
        </p>
      </div>

      {/* Keywords */}
      <div>
        <p className="section-label mb-2">キーワード</p>
        <PersonaKeywords keywords={persona.keywords} />
      </div>

      {/* Activate */}
      {!persona.is_active && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-center mt-auto"
          onClick={() => onActivate(persona.id)}
        >
          <Check size={13} />
          このペルソナを使用
        </Button>
      )}
    </div>
  );
}
