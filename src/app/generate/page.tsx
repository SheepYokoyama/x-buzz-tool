'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { GenerateSettings } from '@/components/generate/GenerateSettings';
import { GenerateResults } from '@/components/generate/GenerateResults';
import { dummyCharacters } from '@/lib/dummy-data';
import type { GenerateInput, GeneratedPattern } from '@/lib/types';

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

export default function GeneratePage() {
  const [input, setInput]           = useState<GenerateInput>(DEFAULT_INPUT);
  const [results, setResults]       = useState<GeneratedPattern[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleChange = (partial: Partial<GenerateInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResults([]);
    setError(null);

    // アクティブなペルソナの description を付与
    const activePersona = dummyCharacters.find((c) => c.is_active);

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
    <>
      <Header title="AI投稿生成" subtitle="条件を設定してバズ投稿を自動生成" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2">
          <GenerateSettings
            input={input}
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
    </>
  );
}
