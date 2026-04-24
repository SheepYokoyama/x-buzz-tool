'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Eye, EyeOff, Loader2, BookOpen } from 'lucide-react';
import type { XAccount } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';

interface Props {
  account?: XAccount;
  onClose: () => void;
  onSave: (account: XAccount) => void;
}

interface TokenField {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
}

const TOKEN_FIELDS: TokenField[] = [
  { key: 'api_key',       label: 'API Key',        required: true,  placeholder: 'Consumer Key' },
  { key: 'api_secret',    label: 'API Key Secret', required: true,  placeholder: 'Consumer Secret' },
  { key: 'access_token',  label: 'Access Token',   required: true,  placeholder: 'OAuth 1.0a Access Token' },
  { key: 'access_secret', label: 'Access Token Secret', required: true,  placeholder: 'OAuth 1.0a Access Token Secret' },
  { key: 'bearer_token',  label: 'Bearer Token',   required: false, placeholder: '任意（読み取り専用APIに使用）' },
];

export function XAccountForm({ account, onClose, onSave }: Props) {
  const isEdit = !!account;

  const [name, setName]         = useState(account?.name ?? '');
  const [username, setUsername] = useState(account?.username ?? '');
  const [tokens, setTokens]     = useState<Record<string, string>>({
    api_key: '', api_secret: '', access_token: '', access_secret: '', bearer_token: '',
  });
  const [showMap, setShowMap]   = useState<Record<string, boolean>>({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const toggleShow = (key: string) =>
    setShowMap((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('アカウント名は必須です'); return; }
    if (!isEdit) {
      for (const f of TOKEN_FIELDS.filter((f) => f.required)) {
        if (!tokens[f.key]?.trim()) {
          setError(`${f.label} は必須です`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { name: name.trim(), username: username.trim() };
      for (const f of TOKEN_FIELDS) {
        if (tokens[f.key]?.trim()) body[f.key] = tokens[f.key].trim();
      }

      const res = await apiFetch(
        isEdit ? `/api/x-accounts/${account.id}` : '/api/x-accounts',
        {
          method: isEdit ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '保存に失敗しました');
      onSave(json.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
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
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* ── ヘッダー ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-[15px] font-semibold text-slate-200">
            {isEdit ? 'Xアカウントを編集' : 'Xアカウントを追加'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── フォーム ── */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* アカウント名 */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
              アカウント名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: メインアカウント"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-200 outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* ユーザー名 */}
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
              X ユーザー名（@なし）
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: username"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-200 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* トークンフィールド */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[11px] text-slate-500">
              {isEdit ? 'トークンを変更する場合のみ入力してください（空欄は変更しません）' : 'X Developer Console から取得した認証情報を入力してください'}
            </p>
            {!isEdit && (
              <Link
                href="/guide/x-account"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[11px] text-sky-300 hover:underline"
              >
                <BookOpen size={11} />
                トークンの取得方法（登録マニュアル）を見る
              </Link>
            )}
            {TOKEN_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {f.label}
                  {f.required && !isEdit && <span className="text-red-400 ml-1">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showMap[f.key] ? 'text' : 'password'}
                    value={tokens[f.key]}
                    onChange={(e) => setTokens((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={isEdit ? `現在: ${
                      f.key === 'api_key'       ? account?.api_key_masked :
                      f.key === 'api_secret'    ? account?.api_secret_masked :
                      f.key === 'access_token'  ? account?.access_token_masked :
                      f.key === 'access_secret' ? account?.access_secret_masked :
                      account?.bearer_token_masked ?? '未設定'
                    }` : f.placeholder}
                    className="w-full rounded-lg pl-3 pr-10 py-2 text-[12px] font-mono text-slate-300 outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(f.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showMap[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* エラー */}
          {error && (
            <p className="text-[12px] text-red-400 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              {error}
            </p>
          )}

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? '保存中…' : (isEdit ? '更新する' : '追加する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
