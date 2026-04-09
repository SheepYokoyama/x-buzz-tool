'use client';

import { useState } from 'react';
import { GenerateSettings } from '@/components/generate/GenerateSettings';
import { GenerateResults } from '@/components/generate/GenerateResults';
import { useSettings } from '@/contexts/SettingsContext';

import type { GenerateInput, GeneratedPattern, PostPersona } from '@/lib/types';

const DEFAULT_INPUT: Omit<GenerateInput, 'provider'> = {
  theme:         '',
  selectedTopic: '',
  target:        '',
  purpose:       'engagement',
  tone:          '体験談・ストーリー',
  maxLength:     280,
  hasCta:        true,
};

interface Props {
  initialPersonas: PostPersona[];
}

export function GenerateClient({ initialPersonas }: Props) {
  const { settings, setActivePersona } = useSettings();
  const [personas, setPersonas]         = useState<PostPersona[]>(initialPersonas);
  const [input, setInput]               = useState<GenerateInput>({ ...DEFAULT_INPUT, provider: settings.aiProvider });
  const [results, setResults]           = useState<GeneratedPattern[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleChange = (partial: Partial<GenerateInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  /* ── ペルソナ切り替え ─────────────────────────── */
  const handleActivatePersona = async (id: string) => {
    // 楽観的UI更新（API完了前にすぐ反映）
    setPersonas((prev) => prev.map((p) => ({ ...p, is_active: p.id === id })));
    // サイドバーのペルソナ表示を即時更新
    const activated = personas.find((p) => p.id === id);
    if (activated) setActivePersona({ id: activated.id, name: activated.name, avatar: activated.avatar, tone: activated.tone, style: activated.style, keywords: activated.keywords, description: activated.description });
    try {
      const res = await fetch('/api/personas/activate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // 失敗したら元に戻す
      setPersonas(initialPersonas);
      const prev = initialPersonas.find((p) => p.is_active);
      if (prev) setActivePersona({ id: prev.id, name: prev.name, avatar: prev.avatar, tone: prev.tone, style: prev.style, keywords: prev.keywords, description: prev.description });
      alert('ペルソナの切り替えに失敗しました');
    }
  };

  /* ── 投稿生成 ────────────────────────────────── */
  const handleGenerate = async () => {
    setIsGenerating(true);
    setResults([]);
    setError(null);

    const activePersona = personas.find((p) => p.is_active);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          provider: settings.aiProvider,
          personaDescription: activePersona
            ? `${activePersona.name}：${activePersona.description}（トーン: ${activePersona.tone}）`
            : undefined,
        } satisfies GenerateInput),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? '生成に失敗しました');
      } else {
        setResults(data.patterns);
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2">
        <GenerateSettings
          input={input}
          personas={personas}
          isGenerating={isGenerating}
          onChange={handleChange}
          onGenerate={handleGenerate}
          onActivatePersona={handleActivatePersona}
        />
      </div>
      <div className="lg:col-span-3">
        <GenerateResults
          results={results}
          generationInput={input}
          isGenerating={isGenerating}
          error={error}
          onRegenerate={handleGenerate}
        />
      </div>
    </div>
  );
}
