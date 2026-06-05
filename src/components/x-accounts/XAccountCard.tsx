'use client';

import { CheckCircle2, Pencil, Trash2, User, RefreshCw } from 'lucide-react';
import type { XAccount } from '@/lib/types';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface Props {
  account: XAccount;
  isActivating: boolean;
  isRefreshing?: boolean;
  onActivate: (id: string) => void;
  onEdit: (account: XAccount) => void;
  onDelete: (id: string) => void;
  onRefresh?: (id: string) => void;
}

export function XAccountCard({ account, isActivating, isRefreshing, onActivate, onEdit, onDelete, onRefresh }: Props) {
  return (
    <div
      className="rounded-[1.375rem] p-5 flex flex-col gap-4 relative"
      style={{
        background: account.is_active
          ? 'rgba(96,165,250,0.06)'
          : 'rgba(15,23,42,0.025)',
        border: account.is_active
          ? '1px solid rgba(96,165,250,0.2)'
          : '1px solid rgba(15,23,42,0.07)',
      }}
    >
      {/* ── アクティブバッジ ── */}
      {account.is_active && (
        <span
          className="absolute top-4 right-4 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: 'rgba(96,165,250,0.15)', color: '#2563eb', border: '1px solid rgba(96,165,250,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" style={{ boxShadow: '0 0 5px #059669' }} />
          使用中
        </span>
      )}

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-3 pr-16">
        <div className="relative shrink-0">
          {account.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.profile_image_url}
              alt={account.name}
              className="w-10 h-10 rounded-full"
              style={{ border: '1px solid rgba(15,23,42,0.1)' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold"
              style={{
                background: account.is_active ? 'rgba(96,165,250,0.15)' : 'rgba(15,23,42,0.05)',
                border: account.is_active ? '1px solid rgba(96,165,250,0.2)' : '1px solid rgba(15,23,42,0.08)',
                color: account.is_active ? '#2563eb' : '#64748b',
              }}
            >
              <User size={18} />
            </div>
          )}
          {/* プラットフォームバッジ（アバター右下に重ねる） */}
          <span
            className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{
              background: '#000',
              border: '1.5px solid #ffffff',
              color: '#fff',
            }}
            title="X (旧 Twitter)"
          >
            <PlatformIcon platform="x" size={9} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-800 truncate">{account.name}</p>
          {account.username && (
            <p className="text-[13px] text-slate-500 truncate">@{account.username}</p>
          )}
        </div>
      </div>

      {/* ── トークン情報 ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'API Key',       value: account.api_key_masked       },
          { label: 'API Secret',    value: account.api_secret_masked    },
          { label: 'Access Token',  value: account.access_token_masked  },
          { label: 'Access Secret', value: account.access_secret_masked },
          ...(account.bearer_token_masked ? [{ label: 'Bearer Token', value: account.bearer_token_masked }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg px-3 py-2" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.05)' }}>
            <p className="text-[11px] text-slate-600 mb-0.5">{label}</p>
            <p className="text-[12px] text-slate-600 font-mono">{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* ── アクションボタン ── */}
      <div className="flex items-center gap-2 pt-1">
        {!account.is_active && (
          <button
            onClick={() => onActivate(account.id)}
            disabled={isActivating}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.2)',
              color: '#2563eb',
            }}
          >
            <CheckCircle2 size={13} />
            {isActivating ? '切替中…' : 'このアカウントを使用'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {onRefresh && (
            <button
              onClick={() => onRefresh(account.id)}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
              style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)', color: '#2563eb' }}
              title="X の最新情報（表示名・@・アイコン）に更新"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
          <button
            onClick={() => onEdit(account)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.07)', color: '#64748b' }}
            title="編集"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
            title="削除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
