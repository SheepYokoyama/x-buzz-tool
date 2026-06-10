'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Eye, EyeOff, Loader2, BookOpen, CheckCircle2 } from 'lucide-react';
import type { SocialAccount } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';

interface Props {
  account?: SocialAccount;
  onClose: () => void;
  onSave: (account: SocialAccount) => void;
}

export function ThreadsAccountForm({ account, onClose, onSave }: Props) {
  const isEdit = !!account;

  const [name, setName]           = useState(account?.name ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<{ username: string; name: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessUser(null);

    if (!isEdit && !accessToken.trim()) {
      setError('アクセストークンは必須です');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name.trim()) body.name = name.trim();
      if (accessToken.trim()) body.access_token = accessToken.trim();

      const res = await apiFetch(
        isEdit ? `/api/threads-accounts/${account.id}` : '/api/threads-accounts',
        {
          method: isEdit ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '保存に失敗しました');
        setSaving(false);
        return;
      }

      const verified = json.verifiedUser as { username: string; name: string } | undefined;
      const verifiedUsernameOnly = typeof json.verifiedUsername === 'string' ? json.verifiedUsername : null;
      if (verified?.username) {
        setSuccessUser({ username: verified.username, name: verified.name ?? verified.username });
      } else if (verifiedUsernameOnly) {
        setSuccessUser({ username: verifiedUsernameOnly, name: verifiedUsernameOnly });
      }

      if (verified?.username || verifiedUsernameOnly) {
        setTimeout(() => onSave(json.account), 1500);
        return;
      }
      onSave(json.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)' }}
      >
        {/* ── ヘッダー ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
          <h2 className="text-[16px] font-semibold text-slate-800">
            {isEdit ? 'Threadsアカウントを編集' : 'Threadsアカウントを追加'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(15,23,42,0.05)', color: '#64748b' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── フォーム ── */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* アカウント名（任意） */}
          <div>
            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
              アカウント名 <span className="text-slate-600 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="空欄の場合は Threads の表示名を使用します"
              className="w-full rounded-lg px-3 py-2.5 text-[14px] text-slate-800 outline-none transition-colors"
              style={{ background: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.08)' }}
            />
            <p className="text-[12px] text-slate-500 mt-1.5">
              @ユーザー名・表示名・アイコンはトークンを検証して Threads から自動取得します
            </p>
          </div>

          {/* アクセストークン */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(15,23,42,0.02)', border: '1px solid rgba(15,23,42,0.05)' }}
          >
            <p className="text-[12px] text-slate-500">
              {isEdit
                ? 'トークンを変更する場合のみ入力してください（空欄は変更しません）'
                : 'Meta Developer Portal で取得した Threads の Long-lived アクセストークンを入力してください'}
            </p>
            {!isEdit && (
              <Link
                href="/guide/threads-account"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] text-purple-600 hover:underline"
              >
                <BookOpen size={11} />
                トークンの取得方法を見る
              </Link>
            )}
            <div>
              <label className="block text-[12px] font-medium text-slate-500 mb-1">
                Access Token{!isEdit && <span className="text-red-600 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={isEdit ? `現在: ${account?.access_token_masked ?? '未設定'}` : 'THQVJ... または EAA... 形式の Long-lived access token'}
                  className="w-full rounded-lg pl-3 pr-10 py-2 text-[13px] font-mono text-slate-700 outline-none"
                  style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.07)' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <p className="text-[13px] text-red-600 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              認証に失敗しました: {error}
            </p>
          )}

          {/* 成功 */}
          {successUser && !error && (
            <div
              className="flex items-center gap-2 text-[13px] rounded-lg px-3 py-2"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span className="text-emerald-600">
                認証成功: @{successUser.username}{' '}
                {successUser.name !== successUser.username && (
                  <span className="text-emerald-600/60">（{successUser.name}）</span>
                )}
                で連携しました
              </span>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 transition-colors"
              style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.07)' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff' }}
            >
              {saving && !successUser && <Loader2 size={14} className="animate-spin" />}
              {successUser && <CheckCircle2 size={14} />}
              {successUser
                ? '完了'
                : saving
                  ? (isEdit ? '検証中…' : '認証確認中…')
                  : (isEdit ? '更新する' : '追加する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
