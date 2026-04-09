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
  blue:   { hex: '#60a5fa', bg: 'rgba(96,165,250,0.09)',   topLine: 'linear-gradient(90deg, #60a5fa, #818cf8)' },
  purple: { hex: '#a78bfa', bg: 'rgba(167,139,250,0.09)',  topLine: 'linear-gradient(90deg, #a78bfa, #ec4899)' },
  cyan:   { hex: '#22d3ee', bg: 'rgba(34,211,238,0.09)',   topLine: 'linear-gradient(90deg, #22d3ee, #60a5fa)' },
  green:  { hex: '#34d399', bg: 'rgba(52,211,153,0.09)',   topLine: 'linear-gradient(90deg, #34d399, #22d3ee)' },
  pink:   { hex: '#f472b6', bg: 'rgba(244,114,182,0.09)',  topLine: 'linear-gradient(90deg, #f472b6, #a78bfa)' },
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
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${
              isPositive
                ? 'bg-neon-green/10 text-neon-green'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-[1.75rem] font-bold text-slate-100 leading-none tracking-tight mb-2">
        {value}
      </p>

      {/* Title */}
      <p className="text-[13px] text-slate-400 leading-none">{title}</p>

      {/* Change label */}
      {changeLabel && (
        <p className="text-[11px] text-slate-600 mt-1.5">{changeLabel}</p>
      )}
    </div>
  );
}
