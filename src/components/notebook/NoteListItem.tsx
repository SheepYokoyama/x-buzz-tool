import { Star } from 'lucide-react';
import type { Note } from '@/lib/types';

interface Props {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

export function NoteListItem({ note, isSelected, onClick }: Props) {
  const displayTitle = note.title.trim() || '（無題）';
  const previewText = note.content.replace(/[#*`\n]/g, ' ').trim() || '本文なし';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl transition-all"
      style={{
        background: isSelected ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(167,139,250,0.22)' : '1px solid transparent',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-medium text-slate-200 leading-snug line-clamp-1">{displayTitle}</p>
        {note.is_important && <Star size={12} className="text-yellow-400 shrink-0 mt-0.5" fill="currentColor" />}
      </div>
      <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
        {previewText}
      </p>
      <div className="flex items-center gap-2">
        {note.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}
          >
            {tag}
          </span>
        ))}
        <span className="text-[11px] text-slate-700 ml-auto">{fmtDate(note.updated_at)}</span>
      </div>
    </button>
  );
}
