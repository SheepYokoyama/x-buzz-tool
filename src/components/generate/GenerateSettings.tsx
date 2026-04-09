'use client';

import { Button } from '@/components/ui/Button';
import { VoiceTextarea, VoiceInput, FieldLabel } from '@/components/ui/Input';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { AiProvider, GenerateInput, PostPersona } from '@/lib/types';

const PROVIDER_OPTIONS: { value: AiProvider; label: string; badge: string; badgeColor: string }[] = [
  {
    value: 'gemini',
    label: 'Gemini API',
    badge: '無料',
    badgeColor: '#34d399',
  },
  {
    value: 'anthropic',
    label: 'Anthropic API',
    badge: '有料',
    badgeColor: '#f59e0b',
  },
];

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

const LENGTH_OPTIONS = [
  { value: 140, label: '140文字（短め）' },
  { value: 280, label: '280文字（標準）' },
  { value: 500, label: '500文字（長め）' },
];

interface Props {
  input: GenerateInput;
  personas: PostPersona[];
  isGenerating: boolean;
  onChange: (partial: Partial<GenerateInput>) => void;
  onGenerate: () => void;
  onActivatePersona: (id: string) => void;
}

export function GenerateSettings({ input, personas, isGenerating, onChange, onGenerate, onActivatePersona }: Props) {
  const canGenerate = (input.theme.trim() || input.selectedTopic) && !isGenerating;

  return (
    <div className="neon-card p-6 space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-200 leading-none">生成設定</h2>
        <p className="section-label mt-1.5">条件を設定してバズ投稿を生成</p>
      </div>

      {/* ── AIプロバイダー ── */}
      <div>
        <FieldLabel>AI プロバイダー</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_OPTIONS.map(({ value, label, badge, badgeColor }) => {
            const active = input.provider === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ provider: value })}
                className="flex items-center gap-2.5 p-3 rounded-xl transition-all text-left cursor-pointer"
                style={{
                  background: active ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.025)',
                  border: active ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all"
                  style={{
                    borderColor: active ? '#60a5fa' : '#334155',
                    background: active ? '#60a5fa' : 'transparent',
                    boxShadow: active ? '0 0 6px rgba(96,165,250,0.5)' : 'none',
                  }}
                />
                <span className="text-[12px] font-medium flex-1" style={{ color: active ? '#e2e8f0' : '#64748b' }}>
                  {label}
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{
                    color: badgeColor,
                    background: `${badgeColor}18`,
                    border: `1px solid ${badgeColor}30`,
                  }}
                >
                  {badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ペルソナ（横スクロール・クリック切り替え）── */}
      <div>
        <FieldLabel>ペルソナ</FieldLabel>
        {/* 横スクロールコンテナ：高さ固定でレイアウトを圧迫しない */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {personas.map((char) => (
            <button
              key={char.id}
              onClick={() => !char.is_active && onActivatePersona(char.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all shrink-0"
              style={{
                background: char.is_active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)',
                border: char.is_active
                  ? '1px solid rgba(167,139,250,0.35)'
                  : '1px solid rgba(255,255,255,0.07)',
                cursor: char.is_active ? 'default' : 'pointer',
                boxShadow: char.is_active ? '0 0 12px rgba(167,139,250,0.15)' : 'none',
              }}
            >
              <span className="text-base leading-none">{char.avatar}</span>
              <div className="text-left min-w-0">
                <p
                  className="text-[12px] font-medium leading-none truncate max-w-[100px]"
                  style={{ color: char.is_active ? '#c4b5fd' : '#94a3b8' }}
                >
                  {char.name}
                </p>
                {char.is_active && (
                  <p className="text-[10px] mt-0.5 leading-none" style={{ color: '#a78bfa' }}>
                    使用中
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
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
        <FieldLabel>文字数目安</FieldLabel>
        <div className="flex gap-2">
          {LENGTH_OPTIONS.map(({ value, label }) => {
            const active = input.maxLength === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ maxLength: value })}
                className="flex-1 text-[12px] py-2 rounded-xl transition-all cursor-pointer"
                style={{
                  background: active ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: active ? '#22d3ee' : '#64748b',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {label}
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
    </div>
  );
}
