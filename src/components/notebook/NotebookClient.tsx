'use client';

import { useCallback, useMemo, useState } from 'react';
import { NoteListItem } from './NoteListItem';
import { NoteDetail } from './NoteDetail';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch } from '@/lib/api-fetch';
import type { Note } from '@/lib/types';
import { NotebookPen, Plus, Search } from 'lucide-react';

interface Props {
  initialNotes: Note[];
}

export function NotebookClient({ initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: '新規メモ', content: '', tags: [] }),
      });
      const data = await res.json();
      if (!res.ok || !data.note) throw new Error(data.error ?? '作成に失敗しました');
      const note = data.note as Note;
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleChange = useCallback(
    async (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'is_important'>>) => {
      setSaving(true);
      setError(null);
      // 楽観更新
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n)),
      );
      try {
        const res = await apiFetch(`/api/notes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok || !data.note) throw new Error(data.error ?? '保存に失敗しました');
        // サーバーの正規の値で上書き
        setNotes((prev) => prev.map((n) => (n.id === id ? (data.note as Note) : n)));
        setSavedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : '保存に失敗しました');
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleDelete = async (id: string) => {
    if (!confirm('このメモを削除しますか？')) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '削除に失敗しました');
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setSelectedId((prevId) => {
        if (prevId !== id) return prevId;
        const remain = notes.filter((n) => n.id !== id);
        return remain[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: 600 }}>
      {/* Left panel — list */}
      <div className="lg:col-span-1 space-y-2">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索…"
              className="pl-8"
            />
          </div>
          <Button size="sm" className="shrink-0" onClick={handleCreate} disabled={creating}>
            <Plus size={13} />
            {creating ? '作成中…' : '新規'}
          </Button>
        </div>

        {error && (
          <p
            className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </p>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={notes.length === 0 ? 'まだメモがありません' : 'メモが見つかりません'}
            iconColor="#a78bfa"
          />
        ) : (
          filtered.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isSelected={selectedId === note.id}
              onClick={() => setSelectedId(note.id)}
            />
          ))
        )}
      </div>

      {/* Right panel — detail */}
      <div className="lg:col-span-2">
        {selected ? (
          <NoteDetail
            key={selected.id}
            note={selected}
            onChange={(patch) => handleChange(selected.id, patch)}
            onDelete={() => handleDelete(selected.id)}
            saving={saving}
            savedAt={savedAt}
          />
        ) : (
          <div className="neon-card h-full flex items-center justify-center p-10">
            <EmptyState
              icon={NotebookPen}
              title={notes.length === 0 ? '「新規」からメモを作成してください' : 'ノートを選択してください'}
              iconColor="#a78bfa"
            />
          </div>
        )}
      </div>
    </div>
  );
}
