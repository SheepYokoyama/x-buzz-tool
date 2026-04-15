'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Settings as SettingsIcon, Loader2, Sparkles } from 'lucide-react';
import { useSettings, type ActivePersonaInfo } from '@/contexts/SettingsContext';
import { apiFetch } from '@/lib/api-fetch';
import { CandidateCard } from '@/components/follow-hunt/CandidateCard';
import { SettingsModal } from '@/components/follow-hunt/SettingsModal';
import type { FollowCandidate, FollowHuntSettings } from '@/lib/types';

export function FollowHuntClient() {
  const { activePersona: contextPersona, setActivePersona } = useSettings();
  const [localPersona, setLocalPersona] = useState<ActivePersonaInfo | null>(contextPersona);
  const [candidates, setCandidates]   = useState<FollowCandidate[]>([]);
  const [settings,   setSettings]     = useState<FollowHuntSettings | null>(null);
  const [followedToday, setFollowedToday] = useState(0);
  const [loading,    setLoading]      = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message,    setMessage]      = useState<string | null>(null);

  // context のペルソナが更新されたらローカルに反映
  useEffect(() => {
    if (contextPersona) setLocalPersona(contextPersona);
  }, [contextPersona]);

  /* ── 初期取得（candidates・settings・active persona を並列） ── */
  const loadData = useCallback(async () => {
    try {
      const [resC, resS, resP] = await Promise.all([
        apiFetch('/api/follow-hunt/candidates'),
        apiFetch('/api/follow-hunt/settings'),
        apiFetch('/api/personas/active'),
      ]);
      const dataC = await resC.json();
      const dataS = await resS.json();
      const dataP = await resP.json();
      setCandidates(Array.isArray(dataC.candidates) ? dataC.candidates : []);
      setFollowedToday(dataC.followed_today ?? 0);
      if (dataS.settings) setSettings(dataS.settings);
      if (dataP.persona) {
        setLocalPersona(dataP.persona);
        setActivePersona(dataP.persona); // context にも同期
      } else {
        setLocalPersona(null);
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [setActivePersona]);

  useEffect(() => { loadData(); }, [loadData]);

  const activePersona = localPersona;

  /* ── 探索実行 ── */
  const handleDiscover = async () => {
    if (!settings) return;
    const cost = Math.round((0.005 * settings.max_results + 0.01 * settings.max_results) * 100) / 100;
    const ok = confirm(
      `候補を探します。\n\n件数: 最大 ${settings.max_results} 件\n想定コスト: 約 $${cost.toFixed(2)}（X API pay-per-use）\n\n実行しますか？`
    );
    if (!ok) return;

    setDiscovering(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/follow-hunt/discover', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '探索に失敗しました');
      setMessage(
        d.inserted > 0
          ? `${d.inserted}件の新しい候補が見つかりました。`
          : (d.message ?? '条件に合うユーザーが見つかりませんでした。')
      );
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '探索に失敗しました');
    } finally {
      setDiscovering(false);
    }
  };

  /* ── フォロー実行 ── */
  const handleFollow = async (id: string) => {
    try {
      const res = await apiFetch(`/api/follow-hunt/candidates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'follow' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'フォローに失敗しました');
      // リストから削除
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setFollowedToday((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'フォローに失敗しました');
    }
  };

  /* ── スキップ ── */
  const handleSkip = async (id: string) => {
    try {
      const res = await apiFetch(`/api/follow-hunt/candidates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'skip' }),
      });
      if (!res.ok) throw new Error('スキップに失敗しました');
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'スキップに失敗しました');
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

  const dailyCap = settings?.daily_follow_cap ?? 20;
  const canFollow = followedToday < dailyCap;

  /* ── アクティブペルソナ未設定の警告 ── */
  if (!activePersona) {
    return (
      <div
        className="rounded-[1.375rem] p-8 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[13px] text-slate-400 mb-4">
          アクティブなペルソナが設定されていません。
        </p>
        <Link
          href="/persona"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] text-[#a78bfa] rounded-lg transition-all"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.22)' }}
        >
          <Sparkles size={13} />
          ペルソナ設定へ
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ── コントロールバー ── */}
      <div
        className="rounded-[1.375rem] p-4 mb-6 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.15)' }}
          >
            {activePersona.avatar}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-600 leading-tight">使用中のペルソナ</p>
            <p className="text-[13px] font-medium text-slate-200 truncate leading-tight">
              {activePersona.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            本日 <span className="text-slate-200 font-medium">{followedToday}</span> / {dailyCap}
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#64748b',
            }}
            title="設定"
          >
            <SettingsIcon size={13} />
          </button>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white rounded-lg transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              boxShadow: '0 0 14px rgba(167,139,250,0.2)',
            }}
          >
            {discovering ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            候補を探す
          </button>
        </div>
      </div>

      {/* ── メッセージ ── */}
      {message && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-[12px] text-slate-300"
          style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}
        >
          {message}
        </div>
      )}

      {/* ── 空状態 ── */}
      {candidates.length === 0 && (
        <div
          className="rounded-[1.375rem] p-10 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[13px] text-slate-500 mb-2">
            表示できる候補がありません
          </p>
          <p className="text-[11px] text-slate-600">
            「候補を探す」を押すと、ペルソナのキーワードで検索して候補を追加します。
          </p>
        </div>
      )}

      {/* ── 候補一覧 ── */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              canFollow={canFollow}
              onFollow={handleFollow}
              onSkip={handleSkip}
            />
          ))}
        </div>
      )}

      {/* ── 設定モーダル ── */}
      {showSettings && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => setSettings(updated)}
        />
      )}
    </>
  );
}
