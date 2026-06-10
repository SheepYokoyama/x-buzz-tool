'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThreadsAccountCard } from '@/components/threads-accounts/ThreadsAccountCard';
import { ThreadsAccountForm } from '@/components/threads-accounts/ThreadsAccountForm';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import type { SocialAccount } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export function ThreadsAccountsClient() {
  const [account, setAccount]   = useState<SocialAccount | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccount = async () => {
    try {
      const res = await apiFetch('/api/threads-accounts');
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

  const handleSave = async (saved: SocialAccount) => {
    setAccount(saved);
    setShowForm(false);
  };

  const handleRefresh = async (id: string) => {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/api/threads-accounts/${id}/refresh`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? '更新に失敗しました');
        return;
      }
      if (account) {
        setAccount({ ...account, ...json.account });
      }
    } catch {
      alert('更新に失敗しました。もう一度お試しください。');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このアカウントを削除しますか？\nトークン情報も完全に削除されます。')) return;
    try {
      const res = await apiFetch(`/api/threads-accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setAccount(null);
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[15px] font-semibold text-slate-700 flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center text-[13px] text-slate-800"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
          >
            <PlatformIcon platform="threads" size={11} />
          </span>
          Threads アカウント
        </h3>
        <Link
          href="/guide/threads-account"
          className="inline-flex items-center gap-1.5 text-[12px] text-purple-600 hover:underline shrink-0"
        >
          <BookOpen size={11} />
          登録方法
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center py-6 text-slate-600">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span className="text-[13px]">読み込み中…</span>
        </div>
      ) : account ? (
        <div className="max-w-xl">
          <ThreadsAccountCard
            account={account}
            isRefreshing={refreshing}
            onEdit={() => setShowForm(true)}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
          />
        </div>
      ) : (
        <div
          className="rounded-[1.375rem] flex flex-col items-center justify-center gap-3 p-8 transition-all min-h-48 max-w-xl w-full"
          style={{
            border: '2px dashed rgba(15,23,42,0.07)',
            background: 'rgba(15,23,42,0.015)',
            color: '#475569',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.25)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.07)'; }}
        >
          <button
            onClick={() => setShowForm(true)}
            className="flex flex-col items-center gap-3 cursor-pointer"
            style={{ color: '#475569' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Plus size={20} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-slate-500">Threadsアカウントを登録</p>
              <p className="text-[12px] text-slate-700 mt-1">アクセストークンを登録して Threads 投稿機能を有効化します</p>
            </div>
          </button>
          <Link
            href="/guide/threads-account"
            className="inline-flex items-center gap-1.5 text-[12px] text-purple-600 hover:underline"
          >
            <BookOpen size={11} />
            登録方法を見る
          </Link>
        </div>
      )}

      {showForm && (
        <ThreadsAccountForm
          account={account ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
