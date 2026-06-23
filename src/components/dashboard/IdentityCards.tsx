'use client';

import Link from 'next/link';
import { UserCircle, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { getXPlan, getPlanLabel } from '@/lib/x-char-count';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

/**
 * ダッシュボード上部に表示する識別カード3枚。
 * - X アカウント / Threads アカウント / 使用中ペルソナ
 * いずれも SettingsContext 由来（Sidebar の useEffect で fetch 済み）。
 * 3カラム表示でも幅が破綻しないようコンパクトサイズに統一。
 */
export function IdentityCards() {
  const { xUser, threadsUser, instagramUser, activePersona } = useSettings();

  const xPlan      = getXPlan(xUser?.verifiedType, xUser?.subscriptionType);
  const xPlanText  = getPlanLabel(xPlan);

  /** 連携アカウントの実プロフィールURL（別ウィンドウで開く用） */
  const profileUrl = (platform: 'x' | 'threads' | 'instagram', username: string): string => {
    const handle = username.replace(/^@/, '');
    switch (platform) {
      case 'x':         return `https://x.com/${handle}`;
      case 'threads':   return `https://www.threads.net/@${handle}`;
      case 'instagram': return `https://www.instagram.com/${handle}`;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* ── X アカウントカード ── */}
      {xUser ? (
        <ConnectedCard
          avatar={xUser.profileImageUrl}
          fallbackInitial={xUser.name.charAt(0).toUpperCase()}
          platformBadge="x"
          platformTitle="X (旧 Twitter)"
          name={xUser.name}
          username={xUser.username}
          tagText={xPlan !== 'free' ? xPlanText : undefined}
          profileUrl={profileUrl('x', xUser.username)}
          settingsHref="/x-accounts"
          settingsTitle="X アカウント管理"
        />
      ) : (
        <EmptyCard
          icon={<PlatformIcon platform="x" size={14} />}
          label="X 未連携"
          hint="登録すると投稿可能に"
          href="/x-accounts"
        />
      )}

      {/* ── Threads アカウントカード ── */}
      {threadsUser ? (
        <ConnectedCard
          avatar={threadsUser.profileImageUrl}
          fallbackInitial={threadsUser.name.charAt(0).toUpperCase()}
          platformBadge="threads"
          platformTitle="Threads"
          name={threadsUser.name}
          username={threadsUser.username}
          accent="purple"
          profileUrl={profileUrl('threads', threadsUser.username)}
          settingsHref="/x-accounts"
          settingsTitle="Threads アカウント管理"
        />
      ) : (
        <EmptyCard
          icon={<PlatformIcon platform="threads" size={14} />}
          label="Threads 未連携"
          hint="登録すると投稿可能に"
          href="/x-accounts"
        />
      )}

      {/* ── Instagram アカウントカード ── */}
      {instagramUser ? (
        <ConnectedCard
          avatar={instagramUser.profileImageUrl}
          fallbackInitial={instagramUser.name.charAt(0).toUpperCase()}
          platformBadge="instagram"
          platformTitle="Instagram"
          name={instagramUser.name}
          username={instagramUser.username}
          accent="pink"
          profileUrl={profileUrl('instagram', instagramUser.username)}
          settingsHref="/x-accounts"
          settingsTitle="Instagram アカウント管理"
        />
      ) : (
        <EmptyCard
          icon={<PlatformIcon platform="instagram" size={14} />}
          label="Instagram 未連携"
          hint="登録すると投稿可能に"
          href="/x-accounts"
        />
      )}

      {/* ── ペルソナカード ── */}
      {activePersona ? (
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
          style={{
            background: 'rgba(37,99,235,0.05)',
            border: '1px solid rgba(37,99,235,0.15)',
          }}
        >
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[20px] shrink-0"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            {activePersona.avatar}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-semibold text-slate-800 truncate">{activePersona.name}</p>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#059669', boxShadow: '0 0 5px #059669' }}
              />
            </div>
            <p className="text-[12px] text-slate-500 truncate mt-0.5">使用中のペルソナ</p>
          </div>
          <Link
            href="/persona"
            className="p-1 rounded-md transition-colors hover:bg-slate-900/[0.06]"
            title="ペルソナ設定"
          >
            <SettingsIcon size={13} style={{ color: '#64748b' }} />
          </Link>
        </div>
      ) : (
        <EmptyCard
          icon={<UserCircle size={16} className="text-slate-600" />}
          label="ペルソナ未設定"
          hint="設定するとトーンが統一されます"
          href="/persona"
        />
      )}
    </div>
  );
}

/* ── 連携済みカード ────────────────────────────── */
function ConnectedCard({
  avatar,
  fallbackInitial,
  platformBadge,
  platformTitle,
  name,
  username,
  tagText,
  accent,
  profileUrl,
  settingsHref,
  settingsTitle,
}: {
  avatar: string | null;
  fallbackInitial: string;
  platformBadge: 'x' | 'threads' | 'instagram';
  platformTitle: string;
  name: string;
  username: string;
  tagText?: string;
  accent?: 'purple' | 'pink';
  profileUrl: string;
  settingsHref: string;
  settingsTitle: string;
}) {
  const accentBg =
    accent === 'purple' ? 'rgba(168,85,247,0.06)'
    : accent === 'pink' ? 'rgba(236,72,153,0.06)'
    : 'rgba(37,99,235,0.05)';
  const accentBorder =
    accent === 'purple' ? 'rgba(168,85,247,0.2)'
    : accent === 'pink' ? 'rgba(236,72,153,0.2)'
    : 'rgba(37,99,235,0.15)';

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
      style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
    >
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`${platformTitle} のプロフィールを開く`}
        className="flex items-center gap-2.5 flex-1 min-w-0 transition-opacity hover:opacity-80"
      >
      <div className="relative shrink-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={name}
            className="w-9 h-9 rounded-full"
            style={{ border: '1px solid rgba(15,23,42,0.1)' }}
          />
        ) : (
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold"
            style={{ background: 'rgba(15,23,42,0.06)', color: '#64748b' }}
          >
            {fallbackInitial}
          </span>
        )}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] rounded-full flex items-center justify-center"
          style={{
            // プラットフォームごとにバッジ背景色を変えて一目で判別できるようにする
            // （Instagram はブランドグラデーション。X / Threads はブランドの黒）
            background:
              platformBadge === 'instagram'
                ? 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)'
                : '#0f172a',
            border: '1.5px solid #ffffff',
            color: '#fff',
          }}
          title={platformTitle}
        >
          <PlatformIcon platform={platformBadge} size={8} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-semibold text-slate-800 truncate">{name}</p>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: '#059669', boxShadow: '0 0 5px #059669' }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[12px] text-slate-500 truncate">@{username}</p>
          {tagText && (
            <span
              className="text-[11px] font-semibold px-1 py-px rounded shrink-0"
              style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.25)' }}
            >
              {tagText}
            </span>
          )}
        </div>
      </div>
      </a>
      <Link
        href={settingsHref}
        className="p-1 rounded-md transition-colors hover:bg-slate-900/[0.06]"
        title={settingsTitle}
      >
        <SettingsIcon size={13} style={{ color: '#64748b' }} />
      </Link>
    </div>
  );
}

/* ── 未連携カード ──────────────────────────────── */
function EmptyCard({
  icon,
  label,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl px-3 py-2.5 flex items-center gap-2.5"
      style={{ background: 'rgba(15,23,42,0.02)', border: '1px solid rgba(15,23,42,0.08)' }}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(15,23,42,0.03)', border: '1px dashed rgba(15,23,42,0.18)', color: '#64748b' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-slate-600 font-semibold truncate">{label}</p>
        <p className="text-[12px] text-slate-500 mt-0.5 truncate">{hint}</p>
      </div>
      <ArrowRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
    </Link>
  );
}
