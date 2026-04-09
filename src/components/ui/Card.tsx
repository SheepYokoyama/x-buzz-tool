import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** 常時表示するアクセントカラー */
  accent?: 'blue' | 'purple' | 'cyan' | 'none';
  /** ホバーで発光するだけ（デフォルト） */
  hover?: boolean;
}

export function Card({
  children,
  className = '',
  accent = 'none',
  hover = true,
}: CardProps) {
  const accentStyle =
    accent === 'blue'
      ? { borderColor: 'rgba(96,165,250,0.3)', boxShadow: '0 0 24px rgba(96,165,250,0.1), 0 8px 40px rgba(0,0,0,0.5)' }
      : accent === 'purple'
      ? { borderColor: 'rgba(167,139,250,0.35)', boxShadow: '0 0 24px rgba(167,139,250,0.12), 0 8px 40px rgba(0,0,0,0.5)' }
      : accent === 'cyan'
      ? { borderColor: 'rgba(34,211,238,0.3)', boxShadow: '0 0 24px rgba(34,211,238,0.1), 0 8px 40px rgba(0,0,0,0.5)' }
      : undefined;

  return (
    <div
      className={`neon-card p-5 ${hover ? 'hover:cursor-default' : ''} ${className}`}
      style={accentStyle}
    >
      {children}
    </div>
  );
}
