import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  color?: 'blue' | 'purple' | 'cyan' | 'green' | 'pink';
}

const colorConfig = {
  blue:   { hex: '#2563eb', bg: 'rgba(37,99,235,0.08)',    topLine: 'linear-gradient(90deg, #2563eb, #6366f1)' },
  purple: { hex: '#7c3aed', bg: 'rgba(124,58,237,0.08)',   topLine: 'linear-gradient(90deg, #7c3aed, #db2777)' },
  cyan:   { hex: '#0891b2', bg: 'rgba(8,145,178,0.08)',    topLine: 'linear-gradient(90deg, #0891b2, #2563eb)' },
  green:  { hex: '#059669', bg: 'rgba(5,150,105,0.08)',    topLine: 'linear-gradient(90deg, #059669, #0891b2)' },
  pink:   { hex: '#db2777', bg: 'rgba(219,39,119,0.08)',   topLine: 'linear-gradient(90deg, #db2777, #7c3aed)' },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  color = 'purple',
}: StatsCardProps) {
  const cfg = colorConfig[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="neon-card p-6 relative overflow-hidden">
      {/* Top accent line — 2px wide, full width */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{ background: cfg.topLine }}
      />

      {/* Background atmosphere blob */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
        style={{
          background: cfg.hex,
          opacity: 0.055,
          filter: 'blur(32px)',
        }}
      />

      {/* Icon + badge row */}
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: cfg.bg,
            border: `1px solid ${cfg.hex}1a`,
          }}
        >
          <Icon size={18} style={{ color: cfg.hex }} />
        </div>

        {change !== undefined && (
          <span
            className={`flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-lg ${
              isPositive
                ? 'bg-neon-green/12 text-neon-green'
                : 'bg-red-500/12 text-red-600'
            }`}
          >
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-[2rem] font-bold text-slate-900 leading-none tracking-tight mb-2">
        {value}
      </p>

      {/* Title */}
      <p className="text-[15px] text-slate-600 leading-none">{title}</p>

      {/* Change label */}
      {changeLabel && (
        <p className="text-[13px] text-slate-500 mt-1.5">{changeLabel}</p>
      )}
    </div>
  );
}
