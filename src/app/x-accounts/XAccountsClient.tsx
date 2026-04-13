'use client';

import { useState, useEffect } from 'react';
import { XAccountCard } from '@/components/x-accounts/XAccountCard';
import { XAccountForm } from '@/components/x-accounts/XAccountForm';
import { Plus, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import type { XAccount } from '@/lib/types';

export function XAccountsClient() {
  const { setXUser } = useSettings();
  const [accounts, setAccounts]         = useState<XAccount[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [formTarget, setFormTarget]     = useState<XAccount | 'new' | null>(null);

  /* ── 一覧取得 ── */
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/x-accounts');
      const d   = await res.json();
      if (Array.isArray(d.accounts)) setAccounts(d.accounts);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  /* ── サイドバーのXユーザー表示を最新化 ── */
  const refreshXUser = async () => {
    try {
      const res = await fetch('/api/x/me');
      const d = await res.json();
      if (d.user) setXUser(d.user);
      else setXUser(null);
    } catch { /* ignore */ }
  };

  /* ── アクティブ化 ── */
  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      const res = await fetch(`/api/x-accounts/${id}/activate`, { method: 'PATCH' });
      if (!res.ok) throw new Error('切り替えに失敗しました');
      setAccounts((prev) => prev.map((a) => ({ ...a, is_active: a.id === id })));
      await refreshXUser();
    } catch (err) {
      console.error(err);
      alert('アカウントの切り替えに失敗しました。もう一度お試しください。');
    } finally {
      setActivatingId(null);
    }
  };

  /* ── 保存（新規 or 編集） ── */
  const handleSave = (saved: XAccount) => {
    setAccounts((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists
        ? prev.map((a) => (a.id === saved.id ? saved : a))
        : [...prev, saved];
    });
    setFormTarget(null);
  };

  /* ── 削除 ── */
  const handleDelete = async (id: string) => {
    if (!confirm('このXアカウントを削除しますか？\nトークン情報も完全に削除されます。')) return;
    try {
      const res = await fetch(`/api/x-accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました。もう一度お試しください。');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-600">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-[13px]">読み込み中…</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {accounts.map((account) => (
          <XAccountCard
            key={account.id}
            account={account}
            isActivating={activatingId === account.id}
            onActivate={handleActivate}
            onEdit={(a) => setFormTarget(a)}
            onDelete={handleDelete}
          />
        ))}

        {/* 新規追加ボタン */}
        <button
          onClick={() => setFormTarget('new')}
          className="rounded-[1.375rem] flex flex-col items-center justify-center gap-3 p-8 transition-all min-h-48"
          style={{
            border: '2px dashed rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.015)',
            color: '#475569',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Plus size={20} />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium text-slate-500">新しいXアカウントを追加</p>
            <p className="text-[11px] text-slate-700 mt-1">複数のアカウントを切り替えられます</p>
          </div>
        </button>
      </div>

      {/* 登録/編集モーダル */}
      {formTarget !== null && (
        <XAccountForm
          account={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
