'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { NoteListItem } from '@/components/notebook/NoteListItem';
import { NoteDetail } from '@/components/notebook/NoteDetail';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { dummyNotes } from '@/lib/dummy-data';
import type { Note } from '@/lib/types';
import { NotebookPen, Plus, Search } from 'lucide-react';

export default function NotebookPage() {
  const [notes]    = useState<Note[]>(dummyNotes);
  const [selected, setSelected] = useState<Note>(notes[0]);
  const [search, setSearch]     = useState('');

  const filtered = notes.filter((n) =>
    n.title.includes(search) ||
    n.content.includes(search) ||
    n.tags.some((t) => t.includes(search))
  );

  return (
    <>
      <Header title="ノート" subtitle="バズの法則・ノウハウを記録・整理" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: 600 }}>
        {/* Left panel — list */}
        <div className="lg:col-span-1 space-y-2">
          {/* Search + Add */}
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
            <Button size="sm" className="shrink-0">
              <Plus size={13} />
              新規
            </Button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={NotebookPen} title="メモが見つかりません" iconColor="#a78bfa" />
          ) : (
            filtered.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isSelected={selected?.id === note.id}
                onClick={() => setSelected(note)}
              />
            ))
          )}
        </div>

        {/* Right panel — detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <NoteDetail note={selected} />
          ) : (
            <div className="neon-card h-full flex items-center justify-center">
              <EmptyState icon={NotebookPen} title="ノートを選択してください" iconColor="#a78bfa" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
