'use client';

import { useState } from 'react';
import { Copy, Check, CalendarClock, Bookmark, BookmarkCheck } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { GeneratedPattern, GenerateInput } from '@/lib/types';

interface Props {
  pattern: GeneratedPattern;
  index: number;
  generationInput: GenerateInput;
}

function buildFullText(pattern: GeneratedPattern): string {
  const parts = [pattern.body];
  if (pattern.cta) parts.push(pattern.cta);
  if (pattern.hashtags.length > 0) {
    parts.push(pattern.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
  }
  return parts.join('\n\n');
}

export function GeneratedPostCard({ pattern, index, generationInput }: Props) {
  const [copied, setCopied]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fullText = buildFullText(pattern);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    setSaveError(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from('generated_posts').insert({
      content: pattern.body + (pattern.cta ? `\n\n${pattern.cta}` : ''),
      generation_prompt: JSON.stringify(generationInput),
      ai_model: 'claude-opus-4-6',
      status: 'draft',
      tags: pattern.hashtags.map((h) => h.replace(/^#/, '')),
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
    }
  };

  return (
    <div className="neon-card p-6 space-y-4">
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}
          >
            パターン {index + 1}
          </span>
          <span
            className="text-[12px] font-medium text-slate-300 truncate max-w-[200px]"
            title={pattern.titleIdea}
          >
            {pattern.titleIdea}
          </span>
        </div>
        <span className="text-[11px] text-slate-600 shrink-0">{pattern.body.length}字</span>
      </div>

      {/* ── 冒頭フック ── */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
      >
        <p className="text-[11px] text-neon-purple mb-1.5 font-medium tracking-wide">冒頭フック</p>
        <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pattern.hook}</p>
      </div>

      {/* ── 本文 ── */}
      <div>
        <p className="text-[11px] text-slate-600 mb-1.5 font-medium tracking-wide">本文</p>
        <p className="text-[13px] text-slate-300 whitespace-pre-wrap leading-[1.75]">{pattern.body}</p>
      </div>

      {/* ── CTA ── */}
      {pattern.cta && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}
        >
          <p className="text-[11px] text-neon-blue mb-1.5 font-medium tracking-wide">CTA</p>
          <p className="text-[13px] text-slate-300">{pattern.cta}</p>
        </div>
      )}

      {/* ── ハッシュタグ ── */}
      {pattern.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pattern.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.15)' }}
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* ── アクション ── */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {/* コピー */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl transition-all"
          style={{
            background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
            border: copied ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
            color: copied ? '#34d399' : '#94a3b8',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'コピー済み' : 'コピー'}
        </button>

        {/* 保存 */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl transition-all"
          style={{
            background: saved ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.04)',
            border: saved ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(255,255,255,0.08)',
            color: saved ? '#a78bfa' : saving ? '#64748b' : '#94a3b8',
            cursor: saving || saved ? 'default' : 'pointer',
          }}
        >
          {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
          {saving ? '保存中…' : saved ? '保存済み' : '下書き保存'}
        </button>

        {/* 予約投稿 */}
        <button
          className="ml-auto flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl transition-all"
          style={{
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.2)',
            color: '#60a5fa',
          }}
        >
          <CalendarClock size={12} />
          予約投稿
        </button>
      </div>

      {/* 保存エラー */}
      {saveError && (
        <p className="text-[11px] text-red-400 mt-1">{saveError}</p>
      )}
    </div>
  );
}
