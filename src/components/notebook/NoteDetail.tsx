import { Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Note } from '@/lib/types';

interface Props { note: Note; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function NoteDetail({ note }: Props) {
  return (
    <div className="neon-card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-white/[0.05]">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            {note.isImportant && <Star size={14} className="text-yellow-400" fill="currentColor" />}
            <h2 className="text-[17px] font-semibold text-slate-100 leading-snug">{note.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-slate-600">{fmtDate(note.createdAt)}</span>
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Button variant="secondary" size="sm">編集</Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <pre className="text-[13px] text-slate-300 whitespace-pre-wrap leading-[1.8] font-sans">
          {note.content}
        </pre>
      </div>
    </div>
  );
}
