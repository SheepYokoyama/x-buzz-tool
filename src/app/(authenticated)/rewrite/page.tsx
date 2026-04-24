'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { RewriteStyleSelector } from '@/components/rewrite/RewriteStyleSelector';
import { RewriteResultCard } from '@/components/rewrite/RewriteResultCard';
import { Button } from '@/components/ui/Button';
import { VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { TokenCostHint } from '@/components/ui/TokenCostHint';
import { useSettings } from '@/contexts/SettingsContext';
import { apiFetch } from '@/lib/api-fetch';
import { Repeat2, RefreshCw, Settings, Copy, Check } from 'lucide-react';

const PROVIDER_LABELS: Record<string, { label: string; badge: string; badgeColor: string }> = {
  gemini:    { label: 'Gemini API',    badge: '無料', badgeColor: '#34d399' },
  anthropic: { label: 'Anthropic API', badge: '有料', badgeColor: '#f59e0b' },
};

const X_CHAR_LIMIT = 140;

export default function RewritePage() {
  const { settings, activePersona } = useSettings();
  const [original, setOriginal]         = useState('');
  const [style, setStyle]               = useState('shorter');
  const [result, setResult]             = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // X向け要約
  const [xSummary, setXSummary]         = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);

  const providerInfo = PROVIDER_LABELS[settings.aiProvider] ?? PROVIDER_LABELS.gemini;

  const callRewrite = async (text: string, rewriteStyle: string) => {
    const res = await apiFetch('/api/rewrite', {
      method: 'POST',
      body: JSON.stringify({
        originalText: text,
        style: rewriteStyle,
        provider: settings.aiProvider,
        ...(rewriteStyle === 'persona' && activePersona
          ? { persona: { name: activePersona.name, tone: activePersona.tone, style: activePersona.style, keywords: activePersona.keywords, description: activePersona.description } }
          : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error ?? '失敗しました');
    return data.text as string;
  };

  const handleRewrite = async () => {
    if (!original.trim()) return;
    setIsLoading(true);
    setResult('');
    setXSummary('');
    setSummaryError(null);
    setError(null);
    try {
      const text = await callRewrite(original, style);
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リライトに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleXSummary = async () => {
    if (!result.trim()) return;
    setIsSummarizing(true);
    setXSummary('');
    setSummaryError(null);
    try {
      const text = await callRewrite(result, 'x_summary');
      setXSummary(text);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : '要約に失敗しました');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopyXSummary = () => {
    navigator.clipboard.writeText(xSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const xCharCount = xSummary.length;
  const xOverLimit = xCharCount > X_CHAR_LIMIT;

  return (
    <>
      <Header title="リライト" subtitle="既存の投稿をAIでブラッシュアップ" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — Input */}
        <div className="space-y-5">
          <div className="neon-card p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none">元の投稿</h2>
              <p className="section-label mt-1.5">リライトしたい投稿をペーストしてください</p>
            </div>
            <div>
              <FieldLabel>投稿テキスト</FieldLabel>
              <VoiceTextarea
                rows={6}
                value={original}
                onValueChange={setOriginal}
                placeholder="リライトしたい投稿文をここに貼り付けてください…"
                appendMode
                showPasteButton
              />
              <p className="text-[11px] text-slate-600 mt-1.5 text-right">{original.length}文字</p>
            </div>
          </div>

          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none">リライトスタイル</h2>
              <p className="section-label mt-1.5">どのように書き直しますか？</p>
            </div>
            <RewriteStyleSelector
              selected={style}
              onChange={setStyle}
              hasActivePersona={!!activePersona}
              personaName={activePersona?.name}
              personaAvatar={activePersona?.avatar}
            />

            {/* AIプロバイダー表示 */}
            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate-500">使用中のAI:</span>
                <span className="text-[12px] font-medium text-slate-300">{providerInfo.label}</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ color: providerInfo.badgeColor, background: `${providerInfo.badgeColor}18`, border: `1px solid ${providerInfo.badgeColor}30` }}
                >
                  {providerInfo.badge}
                </span>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <Settings size={10} />設定で変更
              </span>
            </div>

            {error && (
              <p className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <Button className="w-full justify-center" size="lg" onClick={handleRewrite} disabled={!original.trim() || isLoading}>
              {isLoading
                ? <><RefreshCw size={14} className="animate-spin" />リライト中…</>
                : <><Repeat2 size={14} />リライトする</>
              }
            </Button>
            <div className="flex justify-center">
              <TokenCostHint />
            </div>
          </div>
        </div>

        {/* Right — Result */}
        <div>
          {result ? (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-slate-200">リライト結果</p>
              <RewriteResultCard text={result} label={style} />

              {/* ── X向け要約ボタン ── */}
              <button
                onClick={handleXSummary}
                disabled={isSummarizing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: isSummarizing ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: isSummarizing ? '#475569' : '#94a3b8',
                  cursor: isSummarizing ? 'not-allowed' : 'pointer',
                }}
              >
                {isSummarizing ? (
                  <><RefreshCw size={13} className="animate-spin" />要約中…</>
                ) : (
                  <>
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                    >
                      X
                    </span>
                    X向けに140文字へ要約
                  </>
                )}
              </button>
              <div className="flex justify-center">
                <TokenCostHint />
              </div>

              {/* ── X要約エラー ── */}
              {summaryError && (
                <p className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {summaryError}
                </p>
              )}

              {/* ── X向け要約結果 ── */}
              {xSummary && (
                <div
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${xOverLimit ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black"
                        style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                      >
                        X
                      </span>
                      <span className="text-[12px] font-semibold text-slate-300">X 投稿用</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {/* 文字数カウンター */}
                      <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{ color: xOverLimit ? '#f87171' : xCharCount > 120 ? '#fbbf24' : '#64748b' }}
                      >
                        {xCharCount}
                        <span className="text-[11px] font-normal" style={{ color: '#334155' }}>/{X_CHAR_LIMIT}</span>
                      </span>
                      {/* コピーボタン */}
                      <button
                        onClick={handleCopyXSummary}
                        className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-lg transition-all"
                        style={{
                          background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                          border: copied ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.09)',
                          color: copied ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? '済み' : 'コピー'}
                      </button>
                    </div>
                  </div>

                  {/* テキスト */}
                  <p className="text-[13px] text-slate-200 whitespace-pre-wrap leading-[1.75]">
                    {xSummary}
                  </p>

                  {/* 文字数オーバー警告 */}
                  {xOverLimit && (
                    <p className="text-[11px] text-red-400">
                      ⚠ 140文字を超えています（{xCharCount - X_CHAR_LIMIT}文字オーバー）。再度要約を実行してください。
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="neon-card h-full flex items-center justify-center" style={{ minHeight: 320 }}>
              <EmptyState
                icon={Repeat2}
                title="リライト結果がここに表示されます"
                description="元の投稿を入力してスタイルを選択してください"
                iconColor="#22d3ee"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
