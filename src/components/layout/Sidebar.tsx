'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import {
  LayoutDashboard,
  Sparkles,
  Repeat2,
  CalendarClock,
  History,
  NotebookPen,
  UserCircle,
  BookOpenCheck,
  Settings,
  LogOut,
  UserPlus,
  PenLine,
  KeyRound,
  Image as ImageIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

const mainNav = [
  { href: '/dashboard',   label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/post-create', label: 'ポスト作成',     icon: PenLine        },
  { href: '/generate',    label: 'AI投稿生成',     icon: Sparkles       },
  { href: '/rewrite',     label: 'リライト',         icon: Repeat2        },
  { href: '/schedule',    label: '予約投稿',         icon: CalendarClock  },
  { href: '/history',     label: '投稿履歴',         icon: History        },
];

const subNav = [
  { href: '/thumbnail',   label: 'サムネ生成',       icon: ImageIcon     },
  { href: '/notebook',    label: 'ノート',           icon: NotebookPen   },
  { href: '/persona',     label: 'ペルソナ',         icon: UserCircle    },
  { href: '/follow-hunt', label: 'フォロー候補',     icon: UserPlus      },
  { href: '/x-accounts',  label: 'アカウント管理',   icon: Settings      },
  { href: '/ai-keys',     label: 'AI API キー',      icon: KeyRound      },
  { href: '/guide',       label: '使い方ガイド',     icon: BookOpenCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { setActivePersona, setXUser, authUser, signOut } = useSettings();

  // ページ遷移のたびにX情報・ペルソナを再取得
  useEffect(() => {
    apiFetch('/api/personas/active')
      .then((r) => r.json())
      .then((d) => { if (d.persona) setActivePersona(d.persona); })
      .catch(() => {});

    apiFetch('/api/x/me')
      .then((r) => r.json())
      .then((d) => { setXUser(d.user ?? null); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
              Xpresso
            </p>
            <p className="text-[11px] text-slate-500 mt-1 tracking-wide">X バズ投稿ツール</p>
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
      <nav className="px-3 space-y-0.5 pb-4">
        {subNav.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
        ))}
      </nav>

      {/* spacer（下部のログイン情報を底に寄せるため） */}
      <div className="flex-1" />

      {/* ── ログインユーザー ─────────────────────── */}
      {authUser && (
        <>
          <div className="mx-5 border-t border-white/[0.04]" />
          <div className="px-4 py-4">
            <div className="flex items-center gap-2.5">
              {authUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.name}
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                />
              ) : (
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                >
                  {authUser.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-slate-300 leading-tight truncate">
                  {authUser.name}
                </p>
                <p className="text-[11px] leading-tight truncate" style={{ color: '#475569' }}>
                  {authUser.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                title="ログアウト"
              >
                <LogOut size={14} style={{ color: '#64748b' }} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Version ──────────────────────────────── */}
      <div className="px-5 pb-4 pt-1">
        <p className="text-[10px] tracking-wide" style={{ color: '#334155' }}>
          v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_GIT_SHA}
        </p>
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
