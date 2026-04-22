'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, Trash2, Tag as TagIcon, X as XIcon, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Note } from '@/lib/types';

interface Props {
  note: Note;
  onChange: (patch: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'is_important'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
  savedAt: number | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NoteDetail({ note, onChange, onDelete, saving, savedAt }: Props) {
  // ローカル編集バッファ（保存は onBlur で実行）
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState('');
  const noteIdRef = useRef(note.id);

  // 別のノートに切り替わったらバッファをリセット
  useEffect(() => {
    if (noteIdRef.current !== note.id) {
      setTitle(note.title);
      setContent(note.content);
      setTagInput('');
      noteIdRef.current = note.id;
    }
  }, [note.id, note.title, note.content]);

  const commitTitle = async () => {
    if (title === note.title) return;
    await onChange({ title });
  };

  const commitContent = async () => {
    if (content === note.content) return;
    await onChange({ content });
  };

  const addTag = async () => {
    const t = tagInput.trim();
    if (!t) return;
    if (note.tags.includes(t)) {
      setTagInput('');
      return;
    }
    await onChange({ tags: [...note.tags, t] });
    setTagInput('');
  };

  const removeTag = async (tag: string) => {
    await onChange({ tags: note.tags.filter((t) => t !== tag) });
  };

  const toggleImportant = async () => {
    await onChange({ is_important: !note.is_important });
  };

  return (
    <div className="neon-card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.05]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={toggleImportant}
              className="shrink-0 p-1 rounded hover:bg-white/5 transition-colors"
              title={note.is_important ? '重要を外す' : '重要としてマーク'}
            >
              <Star
                size={16}
                className={note.is_important ? 'text-yellow-400' : 'text-slate-600'}
                fill={note.is_important ? 'currentColor' : 'none'}
              />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              placeholder="無題のメモ"
              className="flex-1 bg-transparent text-[17px] font-semibold text-slate-100 leading-snug outline-none placeholder-slate-700"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
            <span>作成: {fmtDate(note.created_at)}</span>
            <span>更新: {fmtDate(note.updated_at)}</span>
            <span className="flex items-center gap-1">
              {saving ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  保存中…
                </>
              ) : savedAt ? (
                <>
                  <Check size={11} className="text-neon-green" />
                  保存済み
                </>
              ) : null}
            </span>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 size={13} />
          削除
        </Button>
      </div>

      {/* Tags */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <TagIcon size={13} className="text-slate-600" />
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="text-[11px] pl-2 pr-1 py-0.5 rounded-md flex items-center gap-1"
            style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="p-0.5 hover:text-neon-pink transition-colors"
              title="タグを削除"
            >
              <XIcon size={10} />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="タグを追加…"
          className="text-[11px] bg-white/[0.02] border border-white/[0.06] rounded-md px-2 py-0.5 outline-none focus:border-neon-purple/40 text-slate-300 placeholder-slate-700 w-28"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={commitContent}
          placeholder="ここにメモを入力…"
          className="w-full h-full min-h-[300px] bg-transparent text-[13px] text-slate-300 leading-[1.8] resize-none outline-none placeholder-slate-700"
        />
      </div>
    </div>
  );
}
