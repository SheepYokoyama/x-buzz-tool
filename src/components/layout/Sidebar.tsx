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
import AppLogo from '@/components/ui/AppLogo';

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
  const { setActivePersona, setXUser, setThreadsUser, setInstagramUser, authUser, signOut } = useSettings();

  // ページ遷移のたびにX情報・Threads情報・ペルソナを再取得
  useEffect(() => {
    apiFetch('/api/personas/active')
      .then((r) => r.json())
      .then((d) => { if (d.persona) setActivePersona(d.persona); })
      .catch(() => {});

    apiFetch('/api/x/me')
      .then((r) => r.json())
      .then((d) => { setXUser(d.user ?? null); })
      .catch(() => {});

    apiFetch('/api/threads/me')
      .then((r) => r.json())
      .then((d) => { setThreadsUser(d.user ?? null); })
      .catch(() => {});

    apiFetch('/api/instagram/me')
      .then((r) => r.json())
      .then((d) => { setInstagramUser(d.user ?? null); })
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
          <AppLogo size={36} />
          <div>
            <p className="font-bold text-[16px] tracking-tight leading-none" style={{
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Xpresso
            </p>
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
          <div className="mx-5 border-t border-slate-900/[0.08]" />
          <div className="px-4 py-4">
            <div className="flex items-center gap-2.5">
              {authUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.name}
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ border: '1px solid rgba(15,23,42,0.12)' }}
                />
              ) : (
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}
                >
                  {authUser.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-slate-700 leading-tight truncate">
                  {authUser.name}
                </p>
                <p className="text-[13px] leading-tight truncate" style={{ color: '#64748b' }}>
                  {authUser.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg transition-colors hover:bg-slate-900/[0.06]"
                title="ログアウト"
              >
                <LogOut size={14} style={{ color: '#64748b' }} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── サポート / バージョン ────────────────── */}
      <div className="px-5 pb-4 pt-1 space-y-1">
        <Link
          href="/support"
          className="text-[12px] underline transition-colors hover:text-slate-600"
          style={{ color: '#94a3b8' }}
        >
          サポート・不具合報告
        </Link>
        <p className="text-[12px] tracking-wide" style={{ color: '#94a3b8' }}>
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
        color={active ? '#7c3aed' : undefined}
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
