'use client';

import { useState, useEffect } from 'react';
import { XAccountCard } from '@/components/x-accounts/XAccountCard';
import { XAccountForm } from '@/components/x-accounts/XAccountForm';
import { Plus, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import type { XAccount } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';

export function XAccountsClient() {
  const { setXUser } = useSettings();
  const [account, setAccount]   = useState<XAccount | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ── 取得（1件のみ） ── */
  const fetchAccount = async () => {
    try {
      const res = await apiFetch('/api/x-accounts');
      const d   = await res.json();
      const accounts = Array.isArray(d.accounts) ? d.accounts : [];
      setAccount(accounts[0] ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccount(); }, []);

  /* ── サイドバーのXユーザー表示を最新化 ── */
  const refreshXUser = async () => {
    try {
      const res = await apiFetch('/api/x/me');
      const d = await res.json();
      if (d.user) setXUser(d.user);
      else setXUser(null);
    } catch { /* ignore */ }
  };

  /* ── 保存（新規 or 編集） ── */
  const handleSave = async (saved: XAccount) => {
    setAccount(saved);
    setShowForm(false);
    await refreshXUser();
  };

  /* ── X 最新情報で更新 ── */
  const handleRefresh = async (id: string) => {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/api/x-accounts/${id}/refresh`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? '更新に失敗しました');
        return;
      }
      // 既存の account にマスク済みトークンを維持しつつ新情報で上書き
      if (account) {
        setAccount({ ...account, ...json.account });
      }
      await refreshXUser();
    } catch {
      alert('更新に失敗しました。もう一度お試しください。');
    } finally {
      setRefreshing(false);
    }
  };

  /* ── 削除 ── */
  const handleDelete = async (id: string) => {
    if (!confirm('このアカウントを削除しますか？\nトークン情報も完全に削除されます。')) return;
    try {
      const res = await apiFetch(`/api/x-accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setAccount(null);
      setXUser(null);
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
      {/* ── X アカウント セクション ── */}
      <div className="mb-8">
        <h3 className="text-[14px] font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[12px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            𝕏
          </span>
          X（Twitter）アカウント
        </h3>

        {account ? (
          <div className="max-w-xl">
            <XAccountCard
              account={account}
              isActivating={false}
              isRefreshing={refreshing}
              onActivate={() => {}}
              onEdit={() => setShowForm(true)}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[1.375rem] flex flex-col items-center justify-center gap-3 p-8 transition-all min-h-48 max-w-xl w-full"
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
              <p className="text-[13px] font-medium text-slate-500">Xアカウントを登録</p>
              <p className="text-[11px] text-slate-700 mt-1">APIトークンを登録して投稿機能を有効化します</p>
            </div>
          </button>
        )}
      </div>

      {/* 登録/編集モーダル */}
      {showForm && (
        <XAccountForm
          account={account ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
