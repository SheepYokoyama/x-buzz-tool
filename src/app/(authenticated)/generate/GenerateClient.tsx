'use client';

import { useState, useEffect } from 'react';
import { GenerateSettings } from '@/components/generate/GenerateSettings';
import { GenerateResults } from '@/components/generate/GenerateResults';
import { useSettings } from '@/contexts/SettingsContext';
import { getXPlan, getXLimit, getDefaultMaxLength } from '@/lib/x-char-count';

import type { GenerateInput, GeneratedPattern, PostPersona } from '@/lib/types';

interface Props {
  initialPersonas: PostPersona[];
}

export function GenerateClient({ initialPersonas }: Props) {
  const { settings, xUser } = useSettings();
  const [personas]                      = useState<PostPersona[]>(initialPersonas);
  const [results, setResults]           = useState<GeneratedPattern[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // プランから初期値を決定
  const plan    = getXPlan(xUser?.verifiedType, xUser?.subscriptionType);
  const xLimit  = getXLimit(plan);

  const [input, setInput] = useState<GenerateInput>({
    theme:         '',
    selectedTopic: '',
    target:        '',
    purpose:       'engagement',
    tone:          '体験談・ストーリー',
    maxLength:     getDefaultMaxLength(plan),
    hasCta:        true,
    provider:      settings.aiProvider,
    xLimit,
  });

  // xUser が非同期で読み込まれたらプランに合わせて maxLength / xLimit を更新
  useEffect(() => {
    const p = getXPlan(xUser?.verifiedType, xUser?.subscriptionType);
    setInput((prev) => ({
      ...prev,
      maxLength: getDefaultMaxLength(p),
      xLimit:    getXLimit(p),
    }));
  }, [xUser]);

  const handleChange = (partial: Partial<GenerateInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

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
          xLimit:   getXLimit(getXPlan(xUser?.verifiedType, xUser?.subscriptionType)),
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
