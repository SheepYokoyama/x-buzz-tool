'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PersonaCard } from '@/components/persona/PersonaCard';
import { dummyCharacters } from '@/lib/dummy-data';
import type { Character } from '@/lib/types';
import { Plus } from 'lucide-react';

export default function PersonaPage() {
  const [personas, setPersonas] = useState<Character[]>(dummyCharacters);

  const handleActivate = (id: string) =>
    setPersonas((prev) => prev.map((p) => ({ ...p, isActive: p.id === id })));

  return (
    <>
      <Header title="ペルソナ" subtitle="投稿のトーン・スタイルを管理" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {personas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} onActivate={handleActivate} />
        ))}

        {/* Add new */}
        <button
          className="rounded-[1.375rem] flex flex-col items-center justify-center gap-3 p-8 transition-all min-h-48"
          style={{
            border: '2px dashed rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.015)',
            color: '#475569',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Plus size={20} />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium text-slate-500">新しいペルソナを追加</p>
            <p className="text-[11px] text-slate-700 mt-1">複数のペルソナを使い分けられます</p>
          </div>
        </button>
      </div>
    </>
  );
}
