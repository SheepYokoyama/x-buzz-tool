'use client';

import type { ScheduledPostStatus } from '@/lib/types';

const FILTERS: { label: string; value: ScheduledPostStatus | 'all' }[] = [
  { label: 'すべて',     value: 'all'       },
  { label: '公開済み',   value: 'published' },
  { label: '予約中',     value: 'scheduled' },
  { label: '失敗',       value: 'failed'    },
  { label: 'キャンセル', value: 'cancelled' },
];

interface Props {
  active: ScheduledPostStatus | 'all';
  onChange: (v: ScheduledPostStatus | 'all') => void;
}

export function HistoryFilters({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {FILTERS.map(({ label, value }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className="text-[13px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
            style={{
              background: isActive ? 'rgba(167,139,250,0.12)' : 'rgba(15,23,42,0.03)',
              border: isActive ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(15,23,42,0.07)',
              color: isActive ? '#7c3aed' : '#64748b',
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
