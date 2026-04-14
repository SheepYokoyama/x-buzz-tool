'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { dummyNotes } from '@/lib/dummy-data';
import type { Note } from '@/lib/types';
import { Star, Plus, Search } from 'lucide-react';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function NotesPage() {
  const [notes] = useState<Note[]>(dummyNotes);
  const [selected, setSelected] = useState<Note | null>(notes[0]);
  const [search, setSearch] = useState('');

  const filtered = notes.filter(
    (n) =>
      n.title.includes(search) ||
      n.content.includes(search) ||
      n.tags.some((t) => t.includes(search))
  );

  return (
    <>
      <Header title="学習メモ" subtitle="バズの法則やノウハウを記録・整理" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-200px)]">
        {/* Note List */}
        <div className="lg:col-span-1 space-y-3 overflow-y-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon-purple/50"
            />
          </div>

          <Button size="sm" className="w-full justify-center">
            <Plus size={13} />
            新しいメモ
          </Button>

          {filtered.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelected(note)}
              className={`glass-hover rounded-xl p-3 cursor-pointer border transition-all ${
                selected?.id === note.id
                  ? 'border-neon-purple/40 bg-neon-purple/5'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-medium text-white leading-snug">{note.title}</p>
                {note.isImportant && (
                  <Star size={13} className="text-yellow-400 shrink-0 mt-0.5" fill="currentColor" />
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mb-2">{note.content.replace(/[#*`]/g, '')}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {note.tags.map((tag) => (
                  <Badge key={tag} color="gray">{tag}</Badge>
                ))}
                <span className="text-xs text-slate-600 ml-auto">{formatDate(note.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Note Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card className="h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {selected.isImportant && (
                      <Star size={14} className="text-yellow-400" fill="currentColor" />
                    )}
                    <h2 className="font-semibold text-white">{selected.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{formatDate(selected.createdAt)}</span>
                    {selected.tags.map((tag) => (
                      <Badge key={tag} color="purple">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="secondary" size="sm">編集</Button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
                  {selected.content}
                </pre>
              </div>
            </Card>
          ) : (
            <div className="glass rounded-2xl h-full flex items-center justify-center">
              <p className="text-slate-500 text-sm">メモを選択してください</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
