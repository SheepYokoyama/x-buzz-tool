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
  AtSign,
} from 'lucide-react';
import { X_COUNT_RULE, getXPlan, getXLimit, getPlanLabel } from '@/lib/x-char-count';

const mainNav = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/generate',  label: 'AI投稿生成',     icon: Sparkles       },
  { href: '/rewrite',   label: 'リライト',         icon: Repeat2        },
  { href: '/schedule',  label: '予約投稿',         icon: CalendarClock  },
  { href: '/history',   label: '投稿履歴',         icon: History        },
];

const subNav = [
  { href: '/notebook',   label: 'ノート',           icon: NotebookPen   },
  { href: '/persona',    label: 'ペルソナ',         icon: UserCircle    },
  { href: '/x-accounts', label: 'Xアカウント管理',  icon: AtSign        },
  { href: '/guide',      label: '使い方ガイド',     icon: BookOpenCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activePersona, setActivePersona, xUser, setXUser } = useSettings();

  // ページ遷移のたびにX情報・ペルソナを再取得
  // /api/x/me は 25回/15分（無料）の制限内なので遷移ごとの呼び出しは問題なし
  useEffect(() => {
    fetch('/api/personas/active')
      .then((r) => r.json())
      .then((d) => { if (d.persona) setActivePersona(d.persona); })
      .catch(() => {});

    fetch('/api/x/me')
      .then((r) => r.json())
      .then((d) => { setXUser(d.user ?? null); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // pathname 変化 = ページ遷移のたびに実行

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
      <nav className="px-3 space-y-0.5 flex-1 overflow-y-auto pb-4">
        {subNav.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
        ))}
      </nav>

      {/* ── Divider ──────────────────────────────── */}
      <div className="mx-5 border-t border-white/[0.04]" />

      {/* ── X アカウント ─────────────────────────── */}
      {xUser && (
        <div className="px-4 pt-4 pb-2">
          <p className="section-label mb-2.5 px-1">X アカウント</p>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* アバター */}
            {xUser.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={xUser.profileImageUrl}
                alt={xUser.name}
                className="w-7 h-7 rounded-full shrink-0"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
              >
                {xUser.name.charAt(0).toUpperCase()}
              </span>
            )}
            {/* 名前 */}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-slate-300 leading-tight truncate">
                {xUser.name}
              </p>
              <p className="text-[11px] leading-tight truncate" style={{ color: '#475569' }}>
                @{xUser.username}
              </p>
              {/* プラン・文字数制限バッジ */}
              {(() => {
                const plan  = getXPlan(xUser.verifiedType, xUser.subscriptionType);
                const label = getPlanLabel(plan);
                const limit = getXLimit(plan);
                const isPaid = plan !== 'free';
                return (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={isPaid
                        ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[10px] cursor-help"
                      style={{ color: '#475569' }}
                      title={X_COUNT_RULE}
                    >
                      {limit.toLocaleString()} cnt
                    </span>
                  </div>
                );
              })()}
            </div>
            {/* 連携バッジ */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: '#34d399', boxShadow: '0 0 5px #34d399' }}
            />
          </div>
        </div>
      )}

      {/* ── Active persona chip ───────────────────── */}
      <div className="px-4 py-4">
        <p className="section-label mb-2.5 px-1">使用中のペルソナ</p>
        {activePersona ? (
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
              {activePersona.avatar}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-200 leading-tight truncate">
                {activePersona.name}
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
        ) : (
          <div
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              👤
            </span>
            <p className="text-[12px] text-slate-600">未設定</p>
          </div>
        )}
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
