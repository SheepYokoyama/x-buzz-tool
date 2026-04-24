'use client';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { GeneratedPostCard } from './GeneratedPostCard';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { GeneratedPattern, GenerateInput } from '@/lib/types';

interface Props {
  results: GeneratedPattern[];
  generationInput: GenerateInput;
  isGenerating: boolean;
  error: string | null;
  onRegenerate: () => void;
}

export function GenerateResults({ results, generationInput, isGenerating, error, onRegenerate }: Props) {
  if (isGenerating) {
    return (
      <div className="neon-card p-8 flex flex-col items-center justify-center gap-5 min-h-72">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
        >
          <Sparkles size={24} className="text-neon-purple animate-pulse" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-[15px] font-semibold text-slate-200">AIが投稿を生成しています</p>
          <p className="text-[13px] text-slate-500">バズ投稿を用意しています…</p>
          <p className="text-[12px] text-slate-600">通常 10〜20 秒かかります</p>
        </div>
        {/* ローディングバー */}
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
              animation: 'loading-bar 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="neon-card p-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <span className="text-red-400 text-[15px]">!</span>
          </div>
          <div>
            <p className="text-[14px] font-medium text-red-400">生成に失敗しました</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{error}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onRegenerate}>
          <RefreshCw size={13} />
          再試行
        </Button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="neon-card">
        <EmptyState
          icon={Sparkles}
          title="投稿案がまだありません"
          description="左のパネルでテーマや条件を設定し「投稿を生成する」を押してください"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[15px] font-semibold text-slate-200">生成結果</span>
          <span className="text-[13px] text-slate-500 ml-2">{results.length}パターン</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw size={13} />
          再生成
        </Button>
      </div>

      {results.map((pattern, i) => (
        <GeneratedPostCard
          key={i}
          pattern={pattern}
          index={i}
          generationInput={generationInput}
        />
      ))}
    </div>
  );
}
