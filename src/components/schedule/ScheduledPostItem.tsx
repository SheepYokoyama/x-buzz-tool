'use client';

import { useState } from 'react';
import {
  CalendarClock, Trash2, Edit2, Check, X, Send, AlertCircle,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase';
import { Textarea, Input } from '@/components/ui/Input';
import type { ScheduledPost, ScheduledPostStatus } from '@/lib/types';

interface Props {
  post: ScheduledPost;
  onDelete: (id: string) => void;
  onUpdate: (post: ScheduledPost) => void;
}

const STATUS_STYLES: Record<ScheduledPostStatus, { color: string; label: string }> = {
  scheduled:  { color: '#22d3ee', label: '予約中' },
  published:  { color: '#34d399', label: '公開済み' },
  failed:     { color: '#f87171', label: '失敗' },
  cancelled:  { color: '#64748b', label: 'キャンセル' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduledPostItem({ post, onDelete, onUpdate }: Props) {
  const [editing, setEditing]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [content, setContent]           = useState(post.content);
  const [date, setDate]                 = useState(toLocalDatetime(post.scheduled_at));
  const [tagsInput, setTagsInput]       = useState(post.tags.join(', '));
  const [saving, setSaving]             = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [editError, setEditError]       = useState<string | null>(null);

  const style = STATUS_STYLES[post.status];

  // ── 編集保存 ──────────────────────────────────
  const handleSave = async () => {
    if (!content.trim() || !date) return;
    setSaving(true);
    setEditError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from('scheduled_posts')
      .update({
        content: content.trim(),
        scheduled_at: new Date(date).toISOString(),
        tags,
      })
      .eq('id', post.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    // RLSで弾かれた場合 data が null になる（PGRST116）ため到達しないが念のため
    if (!data) {
      setEditError('更新権限がありません');
      return;
    }
    onUpdate(data as ScheduledPost);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setContent(post.content);
    setDate(toLocalDatetime(post.scheduled_at));
    setTagsInput(post.tags.join(', '));
    setEditError(null);
    setEditing(false);
  };

  // ── テスト公開（ローカルでステータスを published に変更） ──
  const handleTestPublish = async () => {
    setPublishing(true);
    const res = await fetch(`/api/cron/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    setPublishing(false);
    if (res.ok) {
      const { post: updated } = await res.json();
      onUpdate(updated as ScheduledPost);
    }
  };

  // ── キャンセル ──
  const handleCancel = async () => {
    const res = await fetch(`/api/cron/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (res.ok) {
      const { post: updated } = await res.json();
      onUpdate(updated as ScheduledPost);
    }
  };

  // ── 削除 ──
  const handleDelete = async () => {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', post.id)
      .select();
    if (error) {
      alert(`削除に失敗しました: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert('削除権限がありません');
      return;
    }
    onDelete(post.id);
  };

  return (
    <div className="neon-card p-5 space-y-3">
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: style.color, boxShadow: `0 0 6px ${style.color}88` }}
          />
          <span className="text-[11px] font-medium" style={{ color: style.color }}>
            {style.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <CalendarClock size={11} />
            {formatDate(post.scheduled_at)}
          </span>
        </div>

        {/* アクションボタン群 */}
        {!editing && (
          <div className="flex items-center gap-1.5 shrink-0">
            {post.status === 'scheduled' && (
              <>
                {/* テスト公開 */}
                <button
                  onClick={handleTestPublish}
                  disabled={publishing}
                  title="テスト公開（ローカルでステータスを published に変更）"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    color: '#34d399',
                  }}
                >
                  <Send size={11} />
                  {publishing ? '…' : 'テスト公開'}
                </button>
                {/* 編集 */}
                <button
                  onClick={() => setEditing(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-slate-500 hover:text-neon-blue"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <Edit2 size={12} />
                </button>
                {/* キャンセル */}
                <button
                  onClick={handleCancel}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-slate-500 hover:text-slate-400"
                  title="予約キャンセル"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <X size={12} />
                </button>
              </>
            )}
            {/* 削除確認 */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-slate-500 hover:text-red-400"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Trash2 size={12} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} /> 削除?
                </span>
                <button
                  onClick={handleDelete}
                  className="text-[11px] px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                >
                  削除
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] px-2 py-1 rounded-lg text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  戻る
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 本文（通常表示 or 編集フォーム） ── */}
      {editing ? (
        <div className="space-y-3">
          <Textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="投稿内容"
          />
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="タグ（カンマ区切り）例: AI, 副業"
          />
          {editError && <p className="text-[11px] text-red-400">{editError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl text-slate-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <X size={12} /> キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim() || !date}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl"
              style={{
                background: 'rgba(167,139,250,0.1)',
                border: '1px solid rgba(167,139,250,0.25)',
                color: '#a78bfa',
                opacity: saving || !content.trim() || !date ? 0.5 : 1,
              }}
            >
              <Check size={12} /> {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="text-[11px] text-slate-600">#{tag}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
