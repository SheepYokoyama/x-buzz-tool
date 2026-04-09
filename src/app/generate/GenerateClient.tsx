'use client';

import { useState } from 'react';
import { GenerateSettings } from '@/components/generate/GenerateSettings';
import { GenerateResults } from '@/components/generate/GenerateResults';
import type { GenerateInput, GeneratedPattern, PostPersona } from '@/lib/types';

const DEFAULT_INPUT: GenerateInput = {
  theme:         '',
  selectedTopic: '',
  target:        '',
  purpose:       'engagement',
  tone:          '体験談・ストーリー',
  maxLength:     280,
  hasCta:        true,
  provider:      'gemini',
};

interface Props {
  initialPersonas: PostPersona[];
}

export function GenerateClient({ initialPersonas }: Props) {
  const [personas, setPersonas]         = useState<PostPersona[]>(initialPersonas);
  const [input, setInput]               = useState<GenerateInput>(DEFAULT_INPUT);
  const [results, setResults]           = useState<GeneratedPattern[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleChange = (partial: Partial<GenerateInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  /* ── ペルソナ切り替え ─────────────────────────── */
  const handleActivatePersona = async (id: string) => {
    // 楽観的UI更新（API完了前にすぐ反映）
    setPersonas((prev) => prev.map((p) => ({ ...p, is_active: p.id === id })));
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
