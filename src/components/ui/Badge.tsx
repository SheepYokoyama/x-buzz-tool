type Color = 'blue' | 'purple' | 'cyan' | 'green' | 'pink' | 'gray' | 'red';

interface BadgeProps {
  children: React.ReactNode;
  color?: Color;
}

const colorStyles: Record<Color, string> = {
  blue: 'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
  purple: 'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
  cyan: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30',
  green: 'bg-neon-green/15 text-neon-green border-neon-green/30',
  pink: 'bg-neon-pink/15 text-neon-pink border-neon-pink/30',
  gray: 'bg-white/5 text-slate-400 border-white/10',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
        ${colorStyles[color]}
      `}
    >
      {children}
    </span>
  );
}
