'use client';

import { useState, useRef } from 'react';
import {
  Copy, Check, CalendarClock, Bookmark, BookmarkCheck, X,
  Send, AlertCircle, ExternalLink, Pencil,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase';
import { Input, FieldLabel } from '@/components/ui/Input';
import type { GeneratedPattern, GenerateInput } from '@/lib/types';
import { countXChars, X_COUNT_RULE, getXPlan, getXLimit } from '@/lib/x-char-count';
import { useSettings } from '@/contexts/SettingsContext';

interface Props {
  pattern: GeneratedPattern;
  index: number;
  generationInput: GenerateInput;
}

function buildFullText(body: string, cta: string | null, hashtags: string[]): string {
  const parts = [body];
  if (cta) parts.push(cta);
  if (hashtags.length > 0) {
    parts.push(hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
  }
  return parts.join('\n\n');
}

/** 翌日 09:00 の datetime-local 文字列（ローカル時刻） */
function defaultScheduleDatetime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

/* ── セクションヘッダー（ラベル + 編集 + 削除ボタン） ── */
function SectionLabel({
  label, color, onEdit, onDelete, editing, deleted,
}: {
  label: string;
  color: string;
  onEdit: () => void;
  onDelete?: () => void;
  editing: boolean;
  deleted: boolean;
}) {
  if (deleted) return null;
  return (
    <div className="flex items-center justify-between mb-1.5">
      <p className="text-[11px] font-medium tracking-wide" style={{ color }}>{label}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-0.5 rounded transition-colors"
          style={{ color: editing ? '#a78bfa' : '#475569' }}
          title={editing ? '編集を閉じる' : '編集'}
        >
          <Pencil size={11} />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-0.5 rounded transition-colors hover:text-red-400"
            style={{ color: '#475569' }}
            title="削除"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

export function GeneratedPostCard({ pattern, index, generationInput }: Props) {
  const { xUser } = useSettings();
  const xLimit    = getXLimit(getXPlan(xUser?.verifiedType, xUser?.subscriptionType));

  // ── 編集可能フィールド ──
  const [hookText,    setHookText]    = useState<string | null>(pattern.hook);
  const [bodyText,    setBodyText]    = useState(pattern.body);
  const [ctaText,     setCtaText]     = useState<string | null>(pattern.cta);
  const [hookEditing, setHookEditing] = useState(false);
  const [bodyEditing, setBodyEditing] = useState(false);
  const [ctaEditing,  setCtaEditing]  = useState(false);

  // ── コピー ──
  const [copied, setCopied]         = useState(false);

  // ── 下書き保存 ──
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // ── 今すぐX投稿 ──
  const [tweetConfirm, setTweetConfirm] = useState(false);
  const [tweeting, setTweeting]         = useState(false);
  const [tweeted, setTweeted]           = useState(false);
  const [tweetUrl, setTweetUrl]         = useState<string | null>(null);
  const [tweetError, setTweetError]     = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 予約投稿モーダル ──
  const [scheduleOpen, setScheduleOpen]   = useState(false);
  const [scheduleDate, setScheduleDate]   = useState('');
  const [scheduling, setScheduling]       = useState(false);
  const [scheduled, setScheduled]         = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const fullText  = buildFullText(bodyText, ctaText, pattern.hashtags);
  const charCount = countXChars(fullText);
  const overLimit = charCount > xLimit;

  // ── ハンドラ ──────────────────────────────────────────────

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
      content: fullText,
      generation_prompt: JSON.stringify(generationInput),
      ai_model: generationInput.provider === 'anthropic' ? 'claude-haiku-4-5' : 'gemini-2.5-flash',
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

  const handleTweetFirstClick = () => {
    if (overLimit || tweeting || tweeted) return;
    if (tweetConfirm) {
      executeTweet();
      return;
    }
    setTweetConfirm(true);
    confirmTimerRef.current = setTimeout(() => setTweetConfirm(false), 3000);
  };

  const executeTweet = async () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setTweetConfirm(false);
    setTweeting(true);
    setTweetError(null);

    try {
      const res = await fetch('/api/x/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setTweetError(data.error ?? '投稿に失敗しました');
      } else {
        setTweeted(true);
        setTweetUrl(data.url);
        const supabase = getSupabaseBrowser();
        const now = new Date().toISOString();
        await supabase.from('generated_posts').insert({
          content: fullText,
          generation_prompt: JSON.stringify(generationInput),
          ai_model: generationInput.provider === 'anthropic' ? 'claude-haiku-4-5' : 'gemini-2.5-flash',
          status: 'published',
          tags: pattern.hashtags.map((h) => h.replace(/^#/, '')),
        });
        await supabase.from('scheduled_posts').insert({
          content:      fullText,
          scheduled_at: now,
          published_at: now,
          status:       'published',
          x_post_id:    data.tweetId ?? null,
          x_post_url:   data.url,
          tags:         pattern.hashtags.map((h) => h.replace(/^#/, '')),
        });
      }
    } catch {
      setTweetError('ネットワークエラーが発生しました');
    } finally {
      setTweeting(false);
    }
  };

  const handleOpenSchedule = () => {
    if (scheduled) return;
    setScheduleDate(defaultScheduleDatetime());
    setScheduleError(null);
    setScheduleOpen(true);
  };

  const handleSchedule = async () => {
    if (!scheduleDate || scheduling || scheduled) return;
    setScheduling(true);
    setScheduleError(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from('scheduled_posts').insert({
      content: fullText,
      scheduled_at: new Date(scheduleDate).toISOString(),
      tags: pattern.hashtags.map((h) => h.replace(/^#/, '')),
      status: 'scheduled',
    });

    setScheduling(false);
    if (error) {
      setScheduleError(error.message);
    } else {
      setScheduled(true);
      setScheduleOpen(false);
    }
  };

  // 編集用テキストエリアの共通スタイル
  const editareaStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(167,139,250,0.3)',
    borderRadius: 8,
    padding: '8px 10px',
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: '1.75',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  };

  // ── レンダリング ──────────────────────────────────────────

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
        <span
          className={`text-[11px] shrink-0 cursor-help ${overLimit ? 'text-red-400' : 'text-slate-600'}`}
          title={X_COUNT_RULE}
        >
          {charCount}/{xLimit.toLocaleString()}
          <span className="text-[10px] ml-0.5 opacity-60">cnt</span>
        </span>
      </div>

      {/* ── 冒頭フック ── */}
      {hookText !== null && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(167,139,250,0.06)', border: `1px solid ${hookEditing ? 'rgba(167,139,250,0.35)' : 'rgba(167,139,250,0.15)'}` }}
        >
          <SectionLabel
            label="冒頭フック"
            color="#a78bfa"
            editing={hookEditing}
            deleted={false}
            onEdit={() => setHookEditing((v) => !v)}
            onDelete={() => { setHookText(null); setHookEditing(false); }}
          />
          {hookEditing ? (
            <textarea
              autoFocus
              value={hookText}
              onChange={(e) => setHookText(e.target.value)}
              rows={3}
              style={editareaStyle}
            />
          ) : (
            <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{hookText}</p>
          )}
        </div>
      )}

      {/* ── 本文 ── */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${bodyEditing ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}` }}
      >
        <SectionLabel
          label="本文"
          color="#64748b"
          editing={bodyEditing}
          deleted={false}
          onEdit={() => setBodyEditing((v) => !v)}
          /* 本文は削除不可 */
        />
        {bodyEditing ? (
          <textarea
            autoFocus
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            style={editareaStyle}
          />
        ) : (
          <p className="text-[13px] text-slate-300 whitespace-pre-wrap leading-[1.75]">{bodyText}</p>
        )}
      </div>

      {/* ── CTA ── */}
      {ctaText !== null && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(96,165,250,0.06)', border: `1px solid ${ctaEditing ? 'rgba(96,165,250,0.35)' : 'rgba(96,165,250,0.15)'}` }}
        >
          <SectionLabel
            label="CTA"
            color="#60a5fa"
            editing={ctaEditing}
            deleted={false}
            onEdit={() => setCtaEditing((v) => !v)}
            onDelete={() => { setCtaText(null); setCtaEditing(false); }}
          />
          {ctaEditing ? (
            <textarea
              autoFocus
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              rows={2}
              style={editareaStyle}
            />
          ) : (
            <p className="text-[13px] text-slate-300">{ctaText}</p>
          )}
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

      {/* ── アクションバー ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
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

        {/* 下書き保存 */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex items-center gap-1.5 text-[12px] px-4 py-1.5 rounded-xl font-medium transition-all"
          style={{
            background: 'rgba(167,139,250,0.12)',
            border: saved ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(167,139,250,0.35)',
            color: saved ? '#a78bfa' : saving ? '#64748b' : '#c4b5fd',
            cursor: saving || saved ? 'default' : 'pointer',
          }}
        >
          {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
          {saving ? '保存中…' : saved ? '保存済み' : '下書き保存'}
        </button>

        {/* 今すぐX投稿 */}
        {tweeted ? (
          <a
            href={tweetUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}
          >
            <ExternalLink size={12} />
            投稿済み ↗
          </a>
        ) : (
          <button
            onClick={handleTweetFirstClick}
            disabled={tweeting || overLimit}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: tweetConfirm ? 'rgba(251,191,36,0.12)' : overLimit || tweeting ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)',
              border: tweetConfirm ? '1px solid rgba(251,191,36,0.35)' : overLimit ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: tweetConfirm ? '#fbbf24' : overLimit || tweeting ? '#475569' : '#94a3b8',
              cursor: tweeting || overLimit ? 'not-allowed' : 'pointer',
            }}
          >
            {tweetConfirm ? <AlertCircle size={12} /> : <Send size={12} />}
            {tweeting ? '投稿中…' : tweetConfirm ? '本当に投稿？' : overLimit ? `${charCount}cnt（超過）` : 'X投稿'}
          </button>
        )}

        {/* 予約投稿 */}
        <button
          onClick={handleOpenSchedule}
          disabled={scheduled}
          className="flex items-center gap-1.5 text-[12px] px-4 py-1.5 rounded-xl font-medium transition-all ml-auto"
          style={{
            background: scheduled ? 'rgba(52,211,153,0.12)' : 'rgba(96,165,250,0.15)',
            border: scheduled ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(96,165,250,0.4)',
            color: scheduled ? '#34d399' : '#93c5fd',
            cursor: scheduled ? 'default' : 'pointer',
          }}
        >
          {scheduled ? <Check size={12} /> : <CalendarClock size={12} />}
          {scheduled ? '予約済み' : '予約投稿'}
        </button>
      </div>

      {/* エラー表示 */}
      {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
      {tweetError && <p className="text-[11px] text-red-400">{tweetError}</p>}

      {/* ── 予約投稿モーダル（インライン） ── */}
      {scheduleOpen && (
        <div
          className="rounded-2xl p-4 space-y-3 mt-1"
          style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.18)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-neon-blue">投稿日時を選択</p>
            <button onClick={() => setScheduleOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[11px] text-slate-600 mb-1">投稿内容プレビュー</p>
            <p className="text-[12px] text-slate-400 whitespace-pre-wrap line-clamp-3 leading-relaxed">{fullText}</p>
          </div>

          <div>
            <FieldLabel>投稿日時</FieldLabel>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {scheduleError && <p className="text-[11px] text-red-400">{scheduleError}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setScheduleOpen(false)}
              className="text-[12px] px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSchedule}
              disabled={!scheduleDate || scheduling}
              className="flex items-center gap-1.5 text-[12px] px-4 py-1.5 rounded-xl font-medium transition-all"
              style={{
                background: !scheduleDate || scheduling ? 'rgba(96,165,250,0.1)' : 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.3)',
                color: !scheduleDate || scheduling ? '#475569' : '#60a5fa',
                cursor: !scheduleDate || scheduling ? 'default' : 'pointer',
              }}
            >
              <Send size={11} />
              {scheduling ? '予約中…' : '予約する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
