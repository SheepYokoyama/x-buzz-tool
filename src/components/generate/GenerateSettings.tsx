'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { VoiceTextarea, VoiceInput, FieldLabel } from '@/components/ui/Input';
import { TokenCostHint } from '@/components/ui/TokenCostHint';
import { Sparkles, RefreshCw, Settings } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import type { GenerateInput, PostPersona } from '@/lib/types';
import { getXPlan, getXLimit, getLengthOptions, getPlanLabel } from '@/lib/x-char-count';

const QUICK_TOPICS = [
  'AI活用', '生産性', 'X運用', '副業', 'マインドセット',
  '朝活', '読書', 'プログラミング', 'ビジネス', 'キャリア',
];

const PURPOSE_OPTIONS = [
  { value: 'awareness',  label: '認知拡大' },
  { value: 'engagement', label: 'エンゲージメント向上' },
  { value: 'followers',  label: 'フォロワー増加' },
  { value: 'promotion',  label: '商品・サービス告知' },
];

const TONE_OPTIONS = [
  { value: 'カジュアル',         label: 'カジュアル' },
  { value: 'プロフェッショナル', label: 'プロフェッショナル' },
  { value: '体験談・ストーリー', label: '体験談・ストーリー' },
  { value: 'ユーモア・共感',     label: 'ユーモア・共感' },
  { value: '教育・ノウハウ系',   label: '教育・ノウハウ系' },
];


interface Props {
  input: GenerateInput;
  personas: PostPersona[];
  isGenerating: boolean;
  onChange: (partial: Partial<GenerateInput>) => void;
  onGenerate: () => void;
}

const PROVIDER_LABELS: Record<string, { label: string; badge: string; badgeColor: string }> = {
  gemini:    { label: 'Gemini API',    badge: '無料', badgeColor: '#34d399' },
  anthropic: { label: 'Anthropic API', badge: '有料', badgeColor: '#f59e0b' },
};

export function GenerateSettings({ input, personas, isGenerating, onChange, onGenerate }: Props) {
  const { settings, xUser } = useSettings();
  const plan          = getXPlan(xUser?.verifiedType, xUser?.subscriptionType);
  const xLimit        = getXLimit(plan);
  const planLabel     = getPlanLabel(plan);
  const lengthOptions = getLengthOptions(plan);
  const canGenerate = (input.theme.trim() || input.selectedTopic) && !isGenerating;
  const providerInfo = PROVIDER_LABELS[settings.aiProvider] ?? PROVIDER_LABELS.gemini;

  const activePersona = personas.find((p) => p.is_active);

  return (
    <div className="neon-card p-6 space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-200 leading-none">生成設定</h2>
        <p className="section-label mt-1.5">条件を設定してバズ投稿を生成</p>
      </div>

      {/* ── AIプロバイダー（コンパクト表示） ── */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-slate-500">使用中のAI:</span>
          <span className="text-[12px] font-medium text-slate-300">{providerInfo.label}</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              color: providerInfo.badgeColor,
              background: `${providerInfo.badgeColor}18`,
              border: `1px solid ${providerInfo.badgeColor}30`,
            }}
          >
            {providerInfo.badge}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-slate-600">
          <Settings size={10} />
          設定で変更
        </span>
      </div>

      {/* ── ペルソナ（アクティブ1件を表示のみ）── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel className="mb-0">ペルソナ</FieldLabel>
          <Link
            href="/persona"
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            変更するには設定へ
          </Link>
        </div>
        {activePersona ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.35)',
              boxShadow: '0 0 14px rgba(167,139,250,0.15)',
            }}
          >
            <span className="text-2xl leading-none shrink-0">{activePersona.avatar}</span>
            <div className="text-left min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#c4b5fd' }}>
                {activePersona.name}
              </p>
              <p className="text-[11px] mt-0.5 leading-tight truncate" style={{ color: '#475569' }}>
                {activePersona.tone}
              </p>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
              >
                <span className="w-1 h-1 rounded-full bg-current" />
                使用中
              </span>
            </div>
          </div>
        ) : (
          <div
            className="px-4 py-3 rounded-xl text-[12px] text-slate-500"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            アクティブなペルソナがありません。
            <Link href="/persona" className="ml-1 text-neon-purple hover:underline">
              ペルソナ設定
            </Link>
            から選択してください。
          </div>
        )}
      </div>

      {/* ── テーマ ── */}
      <div>
        <FieldLabel>テーマ <span className="text-red-400">*</span></FieldLabel>
        <VoiceTextarea
          rows={2}
          value={input.theme}
          onValueChange={(v) => onChange({ theme: v })}
          placeholder="例：AIを使った副業で月5万円稼ぐ方法…"
          appendMode
        />
      </div>

      {/* ── クイックトピック ── */}
      <div>
        <FieldLabel>クイックトピック</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TOPICS.map((t) => {
            const active = t === input.selectedTopic;
            return (
              <button
                key={t}
                onClick={() => onChange({ selectedTopic: active ? '' : t })}
                className="text-[12px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  background: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: active ? '#a78bfa' : '#64748b',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ターゲット ── */}
      <div>
        <FieldLabel>ターゲット読者</FieldLabel>
        <VoiceInput
          value={input.target}
          onValueChange={(v) => onChange({ target: v })}
          placeholder="例：副業を始めたい20〜30代の会社員"
        />
      </div>

      {/* ── 目的 ── */}
      <div>
        <FieldLabel>投稿の目的</FieldLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {PURPOSE_OPTIONS.map(({ value, label }) => {
            const active = input.purpose === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ purpose: value })}
                className="text-[12px] px-3 py-2 rounded-xl transition-all text-left cursor-pointer"
                style={{
                  background: active ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: active ? '#60a5fa' : '#64748b',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── トーン ── */}
      <div>
        <FieldLabel>トーン・スタイル</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {TONE_OPTIONS.map(({ value, label }) => {
            const active = input.tone === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ tone: value })}
                className="text-[12px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  background: active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: active ? '#34d399' : '#64748b',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 文字数 ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel className="mb-0">本文カウント目安</FieldLabel>
          <span
            className="text-[10px] px-2 py-0.5 rounded-lg cursor-help"
            style={{ background: 'rgba(34,211,238,0.06)', color: '#475569', border: '1px solid rgba(34,211,238,0.15)' }}
            title={`全角（ひらがな・漢字等）= 2カウント\n半角（英数字等）= 1カウント\nCTA+ハッシュタグ込みで合計${xLimit.toLocaleString()}cnt以内に生成（${planLabel}プラン）`}
          >
            {planLabel} · 合計{xLimit.toLocaleString()}cnt以内
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {lengthOptions.map(({ value, label, note }) => {
            const active = input.maxLength === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ maxLength: value })}
                className="flex-1 min-w-[30%] py-2 rounded-xl transition-all cursor-pointer"
                style={{
                  background: active ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: active ? '#22d3ee' : '#64748b',
                  fontWeight: active ? 500 : 400,
                }}
              >
                <p className="text-[12px] leading-tight">{label}</p>
                <p className="text-[10px] mt-0.5 opacity-60">{note}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-[13px] font-medium text-slate-300">CTA（行動喚起）</p>
          <p className="text-[11px] text-slate-600 mt-0.5">フォロー・コメント促進など</p>
        </div>
        <button
          onClick={() => onChange({ hasCta: !input.hasCta })}
          className="relative w-10 h-5 rounded-full transition-all cursor-pointer shrink-0"
          style={{
            background: input.hasCta ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.1)',
            border: input.hasCta ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
            style={{
              background: input.hasCta ? '#a78bfa' : '#64748b',
              left: input.hasCta ? '1.25rem' : '0.125rem',
            }}
          />
        </button>
      </div>

      {/* ── 生成ボタン ── */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full justify-center"
        size="lg"
      >
        {isGenerating
          ? <><RefreshCw size={14} className="animate-spin" />生成中…</>
          : <><Sparkles size={14} />投稿を生成する</>
        }
      </Button>
      <div className="flex justify-center">
        <TokenCostHint />
      </div>
    </div>
  );
}
