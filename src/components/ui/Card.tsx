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
      ? { borderColor: 'rgba(37,99,235,0.3)', boxShadow: '0 0 24px rgba(37,99,235,0.08), 0 8px 28px rgba(15,23,42,0.08)' }
      : accent === 'purple'
      ? { borderColor: 'rgba(124,58,237,0.32)', boxShadow: '0 0 24px rgba(124,58,237,0.1), 0 8px 28px rgba(15,23,42,0.08)' }
      : accent === 'cyan'
      ? { borderColor: 'rgba(8,145,178,0.3)', boxShadow: '0 0 24px rgba(8,145,178,0.08), 0 8px 28px rgba(15,23,42,0.08)' }
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
