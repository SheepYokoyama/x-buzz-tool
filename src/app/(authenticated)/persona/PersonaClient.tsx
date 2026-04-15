'use client';

import { useState } from 'react';
import { PersonaCard } from '@/components/persona/PersonaCard';
import { PersonaForm } from '@/components/persona/PersonaForm';
import { Plus } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { apiFetch } from '@/lib/api-fetch';
import type { PostPersona } from '@/lib/types';

interface Props {
  initialPersonas: PostPersona[];
}

export function PersonaClient({ initialPersonas }: Props) {
  const { setActivePersona } = useSettings();
  const [personas, setPersonas]       = useState<PostPersona[]>(initialPersonas);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  // モーダル制御: null=非表示, 'new'=新規作成, PostPersona=編集対象
  const [formTarget, setFormTarget]   = useState<PostPersona | 'new' | null>(null);

  /* ── アクティブ化 ─────────────────────────────── */
  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      const res = await apiFetch('/api/personas/activate', {
        method: 'PATCH',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('切り替えに失敗しました');
      setPersonas((prev) => prev.map((p) => ({ ...p, is_active: p.id === id })));
      // サイドバーのペルソナ表示を即時更新
      const activated = personas.find((p) => p.id === id);
      if (activated) setActivePersona({ id: activated.id, name: activated.name, avatar: activated.avatar, tone: activated.tone, style: activated.style, keywords: activated.keywords, description: activated.description });
    } catch (err) {
      console.error(err);
      alert('ペルソナの切り替えに失敗しました。もう一度お試しください。');
    } finally {
      setActivatingId(null);
    }
  };

  /* ── 保存（新規 or 編集） ─────────────────────── */
  const handleSave = (saved: PostPersona) => {
    setPersonas((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      return exists
        ? prev.map((p) => (p.id === saved.id ? saved : p))   // 更新
        : [...prev, saved];                                    // 新規追加
    });
    setFormTarget(null);
  };

  /* ── 削除 ────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm('このペルソナを削除しますか？')) return;
    try {
      const res = await apiFetch(`/api/personas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert('ペルソナの削除に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            isActivating={activatingId === persona.id}
            onActivate={handleActivate}
            onEdit={(p) => setFormTarget(p)}
            onDelete={handleDelete}
          />
        ))}

        {/* 新規追加ボタン */}
        <button
          onClick={() => setFormTarget('new')}
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

      {/* 登録/編集モーダル */}
      {formTarget !== null && (
        <PersonaForm
          persona={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
