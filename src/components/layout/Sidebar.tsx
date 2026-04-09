'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Repeat2,
  CalendarClock,
  History,
  NotebookPen,
  UserCircle,
  BookOpenCheck,
  Zap,
} from 'lucide-react';

const mainNav = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/generate',  label: 'AI投稿生成',     icon: Sparkles       },
  { href: '/rewrite',   label: 'リライト',         icon: Repeat2        },
  { href: '/schedule',  label: '予約投稿',         icon: CalendarClock  },
  { href: '/history',   label: '投稿履歴',         icon: History        },
];

const subNav = [
  { href: '/notebook', label: 'ノート',       icon: NotebookPen   },
  { href: '/persona',  label: 'ペルソナ',     icon: UserCircle    },
  { href: '/guide',    label: '使い方ガイド', icon: BookOpenCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <aside className="sidebar-glass fixed left-0 top-0 z-30 h-screen w-[260px] flex-col hidden md:flex">

      {/* ── Logo ─────────────────────────────────── */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[18px] select-none"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ec4899, #a78bfa)',
              boxShadow: '0 0 18px rgba(236,72,153,0.45), 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            🔥
          </div>
          <div>
            <p className="font-bold text-[15px] tracking-tight leading-none" style={{
              background: 'linear-gradient(90deg, #fbbf24, #f472b6, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              メガバズX
            </p>
            <p className="text-[11px] text-slate-600 mt-1 tracking-wide">X バズ投稿ツール</p>
          </div>
        </div>
      </div>

      {/* ── Main nav ─────────────────────────────── */}
      <div className="px-5 pb-2">
        <p className="section-label">メイン</p>
      </div>
      <nav className="px-3 space-y-0.5">
        {mainNav.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
        ))}
      </nav>

      {/* ── Sub nav ──────────────────────────────── */}
      <div className="px-5 pt-5 pb-2">
        <p className="section-label">ツール</p>
      </div>
      <nav className="px-3 space-y-0.5 flex-1 overflow-y-auto pb-4">
        {subNav.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
        ))}
      </nav>

      {/* ── Divider ──────────────────────────────── */}
      <div className="mx-5 border-t border-white/[0.04]" />

      {/* ── Active persona chip ───────────────────── */}
      <div className="px-4 py-5">
        <p className="section-label mb-3 px-1">使用中のペルソナ</p>
        <div
          className="rounded-2xl p-3.5 flex items-center gap-3"
          style={{
            background: 'rgba(96,165,250,0.05)',
            border: '1px solid rgba(96,165,250,0.1)',
          }}
        >
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.15)' }}
          >
            🚀
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate-200 leading-tight truncate">
              テック起業家
            </p>
            <p className="text-[11px] text-neon-green flex items-center gap-1.5 mt-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block"
                style={{ boxShadow: '0 0 5px #34d399' }}
              />
              アクティブ
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── NavLink atom ──────────────────────────────────────── */
function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  active: boolean;
}) {
  return (
    <Link href={href} className={`nav-item${active ? ' active' : ''}`}>
      <Icon
        size={16}
        className="shrink-0 transition-colors"
        color={active ? '#a78bfa' : undefined}
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
