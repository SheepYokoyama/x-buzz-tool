import Link from 'next/link';
import { Sparkles, CalendarClock, UserCircle, BookOpen, ArrowRight } from 'lucide-react';

const actions = [
  {
    href: '/generate',
    label: 'AI投稿を生成',
    description: '今日のバズ投稿を自動作成',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    borderColor: 'rgba(96,165,250,0.18)',
    glowColor: 'rgba(96,165,250,0.07)',
  },
  {
    href: '/schedule',
    label: '予約投稿を追加',
    description: '投稿日時を事前にセット',
    icon: CalendarClock,
    gradient: 'linear-gradient(135deg, #22d3ee, #60a5fa)',
    borderColor: 'rgba(34,211,238,0.16)',
    glowColor: 'rgba(34,211,238,0.06)',
  },
  {
    href: '/character',
    label: 'キャラを変更',
    description: '投稿スタイルを切り替える',
    icon: UserCircle,
    gradient: 'linear-gradient(135deg, #a78bfa, #f472b6)',
    borderColor: 'rgba(167,139,250,0.18)',
    glowColor: 'rgba(167,139,250,0.07)',
  },
  {
    href: '/notes',
    label: '学習メモを書く',
    description: 'バズの法則を記録・整理',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #34d399, #22d3ee)',
    borderColor: 'rgba(52,211,153,0.16)',
    glowColor: 'rgba(52,211,153,0.06)',
  },
];

export function QuickActions() {
  return (
    <div className="neon-card p-6">
      <div className="mb-6">
        <h2 className="text-[15px] font-semibold text-slate-200 leading-none">クイックアクション</h2>
        <p className="section-label mt-1.5">よく使う操作へ素早くアクセス</p>
      </div>

      <div className="space-y-2.5">
        {actions.map(({ href, label, description, icon: Icon, gradient, borderColor }) => (
          <Link
            key={href}
            href={href}
            className="action-item group"
            style={{ border: `1px solid ${borderColor}` }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: gradient }}
            >
              <Icon size={15} className="text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-200 leading-none">{label}</p>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-none">{description}</p>
            </div>

            {/* Arrow */}
            <ArrowRight
              size={13}
              className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
