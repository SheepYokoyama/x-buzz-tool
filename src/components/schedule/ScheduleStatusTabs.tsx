'use client';

import type { ScheduledPostStatus } from '@/lib/types';

export type TabValue = ScheduledPostStatus | 'all';

interface Props {
  active: TabValue;
  counts: Record<TabValue, number>;
  onChange: (tab: TabValue) => void;
}

const TABS: { value: TabValue; label: string; dotColor: string }[] = [
  { value: 'all',       label: '全て',    dotColor: '#94a3b8' },
  { value: 'scheduled', label: '予約中',  dotColor: '#22d3ee' },
  { value: 'published', label: '公開済み', dotColor: '#34d399' },
  { value: 'failed',    label: '失敗',    dotColor: '#f87171' },
  { value: 'cancelled', label: 'キャンセル', dotColor: '#64748b' },
];

export function ScheduleStatusTabs({ active, counts, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {TABS.map(({ value, label, dotColor }) => {
        const isActive = active === value;
        const count = counts[value] ?? 0;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex-1 justify-center"
            style={{
              background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: isActive ? '#e2e8f0' : '#64748b',
              border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
            }}
          >
            {value !== 'all' && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: dotColor, opacity: isActive ? 1 : 0.5 }}
              />
            )}
            {label}
            {count > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md min-w-[18px] text-center leading-none"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#94a3b8' : '#475569',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
