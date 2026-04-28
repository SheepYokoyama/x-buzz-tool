'use client';

import Link from 'next/link';
import { UserCircle, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { X_COUNT_RULE, getXPlan, getXLimit, getPlanLabel } from '@/lib/x-char-count';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

/**
 * ダッシュボード上部に表示する「アクティブな X アカウント」と「使用中ペルソナ」の 2 枚カード。
 * どちらも SettingsContext 由来（サイドバーの useEffect で fetch 済み）。
 */
export function IdentityCards() {
  const { xUser, activePersona } = useSettings();

  const plan     = getXPlan(xUser?.verifiedType, xUser?.subscriptionType);
  const planText = getPlanLabel(plan);
  const planLimit = getXLimit(plan);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* ── X アカウントカード ── */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {xUser ? (
          <>
            <div className="relative shrink-0">
              {xUser.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={xUser.profileImageUrl}
                  alt={xUser.name}
                  className="w-10 h-10 rounded-full"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                />
              ) : (
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                >
                  {xUser.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span
                className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                style={{
                  background: '#000',
                  border: '1.5px solid rgba(2,6,23,1)',
                  color: '#fff',
                }}
                title="X (旧 Twitter)"
              >
                <PlatformIcon platform="x" size={9} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-slate-200 truncate">{xUser.name}</p>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: '#34d399', boxShadow: '0 0 5px #34d399' }}
                />
              </div>
              <p className="text-[11px] text-slate-500 truncate">@{xUser.username}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={plan !== 'free'
                    ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {planText}
                </span>
                <span className="text-[10px] cursor-help" style={{ color: '#475569' }} title={X_COUNT_RULE}>
                  {planLimit.toLocaleString()} cnt
                </span>
              </div>
            </div>
            <Link
              href="/x-accounts"
              className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
              title="X アカウント管理"
            >
              <SettingsIcon size={14} style={{ color: '#64748b' }} />
            </Link>
          </>
        ) : (
          <Link
            href="/x-accounts"
            className="group flex items-center gap-3 w-full"
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: '#475569' }}
            >
              <PlatformIcon platform="x" size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-slate-400 font-medium">X アカウント未連携</p>
              <p className="text-[11px] text-slate-600 mt-0.5">登録すると投稿機能が有効化されます</p>
            </div>
            <ArrowRight size={14} className="text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* ── ペルソナカード ── */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: activePersona ? 'rgba(96,165,250,0.05)' : 'rgba(255,255,255,0.03)',
          border: activePersona ? '1px solid rgba(96,165,250,0.12)' : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {activePersona ? (
          <>
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0"
              style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)' }}
            >
              {activePersona.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate">{activePersona.name}</p>
              <p className="text-[11px] text-neon-green flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block"
                  style={{ boxShadow: '0 0 5px #34d399' }}
                />
                使用中のペルソナ
              </p>
            </div>
            <Link
              href="/persona"
              className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
              title="ペルソナ設定"
            >
              <SettingsIcon size={14} style={{ color: '#64748b' }} />
            </Link>
          </>
        ) : (
          <Link
            href="/persona"
            className="group flex items-center gap-3 w-full"
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}
            >
              <UserCircle size={18} className="text-slate-600" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-slate-400 font-medium">ペルソナ未設定</p>
              <p className="text-[11px] text-slate-600 mt-0.5">設定すると投稿のトーンが統一されます</p>
            </div>
            <ArrowRight size={14} className="text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
