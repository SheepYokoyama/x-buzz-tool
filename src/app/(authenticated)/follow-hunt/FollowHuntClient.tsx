'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Settings as SettingsIcon, Loader2, Sparkles, Tag, AlertTriangle, Plus, X as XIcon, RotateCcw } from 'lucide-react';
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
  // フリーキーワード（このセッションのみ有効、ペルソナには保存しない）
  const [extraKeywords, setExtraKeywords] = useState<string[]>([]);
  // ペルソナキーワードのうちこのセッションで除外するもの
  const [excludedPersonaKeywords, setExcludedPersonaKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput]   = useState('');
  const [showKeywordInput, setShowKeywordInput] = useState(false);

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

  /* ── 実際に検索に使うキーワード（ペルソナ−除外 + 追加） ── */
  const effectivePersonaKeywords = (activePersona?.keywords ?? [])
    .filter((k) => !excludedPersonaKeywords.includes(k));
  const totalKeywordCount = effectivePersonaKeywords.length + extraKeywords.length;

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
      // ペルソナの除外済みを除いたキーワードを extra_keywords に含めることで
      // サーバー側の「ペルソナ keywords 全部を取る」動作を上書きする。
      // API 側は extra_keywords とペルソナ keywords をマージするので、
      // 除外したい場合は API がペルソナ keywords を参照しないようにする必要がある。
      // → ここでは single source として全部まとめて送る（後述 API 変更）。
      const res = await apiFetch('/api/follow-hunt/discover', {
        method: 'POST',
        body: JSON.stringify({
          keywords: [...effectivePersonaKeywords, ...extraKeywords],
          extra_keywords: extraKeywords, // 後方互換
        }),
      });
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

  /* ── フリーキーワード追加/削除 ── */
  const addExtraKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    if (kw.length < 2 || kw.length > 40) {
      alert('キーワードは 2〜40 文字で入力してください');
      return;
    }
    // ペルソナ既存・追加済みと重複チェック
    const all = [...(activePersona?.keywords ?? []), ...extraKeywords];
    if (all.some((k) => k.toLowerCase() === kw.toLowerCase())) {
      setKeywordInput('');
      return;
    }
    setExtraKeywords((prev) => [...prev, kw]);
    setKeywordInput('');
  };

  const removeExtraKeyword = (kw: string) => {
    setExtraKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const excludePersonaKeyword = (kw: string) => {
    setExcludedPersonaKeywords((prev) => prev.includes(kw) ? prev : [...prev, kw]);
  };

  const resetKeywords = () => {
    setExtraKeywords([]);
    setExcludedPersonaKeywords([]);
    setKeywordInput('');
    setShowKeywordInput(false);
  };

  /* ── フォロー実行 ── */
  const handleFollow = async (id: string) => {
    try {
      const res = await apiFetch(`/api/follow-hunt/candidates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'follow' }),
      });
      const d = await res.json();
      if (!res.ok) {
        // クレジット枯渇は失敗扱いの候補をリストから外し、メッセージで案内
        if (d.reason === 'credits_depleted') {
          setCandidates((prev) => prev.filter((c) => c.id !== id));
          setMessage(d.error);
          return;
        }
        throw new Error(d.error ?? 'フォローに失敗しました');
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setFollowedToday((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'フォローに失敗しました');
    }
  };

  /* ── いいね＆フォロー実行（サーバー側でいいね→ディレイ→フォロー） ── */
  const handleLikeAndFollow = async (id: string) => {
    try {
      const res = await apiFetch(`/api/follow-hunt/candidates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'like_and_follow' }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.reason === 'credits_depleted') {
          setCandidates((prev) => prev.filter((c) => c.id !== id));
          setMessage(d.error);
          return;
        }
        throw new Error(d.error ?? 'いいね＆フォローに失敗しました');
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setFollowedToday((prev) => prev + 1);
      if (d.like_status === 'like_failed') {
        setMessage('フォローは成功しましたが、いいねは失敗しました（ツイート削除や非公開等の可能性）');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'いいね＆フォローに失敗しました');
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
            disabled={discovering || totalKeywordCount === 0}
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

      {/* ── 検索キーワード表示 ── */}
      <div
        className="rounded-[1.375rem] p-4 mb-6"
        style={{ background: 'rgba(167,139,250,0.03)', border: '1px solid rgba(167,139,250,0.1)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-[#a78bfa]" />
            <p className="text-[12px] font-medium text-slate-300">検索に使うキーワード</p>
            <span className="text-[11px] text-slate-600">
              OR 条件 ({totalKeywordCount}個)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {(extraKeywords.length > 0 || excludedPersonaKeywords.length > 0) && (
              <button
                onClick={resetKeywords}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                title="ペルソナ登録時の状態に戻す（除外・追加を取り消し）"
              >
                <RotateCcw size={11} />
                リセット
              </button>
            )}
            {!showKeywordInput && (
              <button
                onClick={() => setShowKeywordInput(true)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all"
                style={{
                  background: 'rgba(167,139,250,0.1)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(167,139,250,0.2)',
                }}
              >
                <Plus size={11} />
                追加キーワード
              </button>
            )}
          </div>
        </div>

        {/* キーワード chip 一覧（ペルソナ + 追加） */}
        <div className="flex flex-wrap gap-1.5">
          {effectivePersonaKeywords.map((kw) => (
            <span
              key={`persona-${kw}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium"
              style={{
                background: 'rgba(167,139,250,0.12)',
                color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.25)',
              }}
              title="ペルソナから取得（× で今回の検索から除外）"
            >
              {kw}
              <button
                onClick={() => excludePersonaKeyword(kw)}
                className="hover:text-white transition-colors"
                title="今回の検索から除外（ペルソナの登録は消えません）"
              >
                <XIcon size={10} />
              </button>
            </span>
          ))}
          {extraKeywords.map((kw) => (
            <span
              key={`extra-${kw}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium"
              style={{
                background: 'rgba(96,165,250,0.12)',
                color: '#93c5fd',
                border: '1px solid rgba(96,165,250,0.25)',
              }}
              title="追加キーワード（このセッションのみ）"
            >
              {kw}
              <button
                onClick={() => removeExtraKeyword(kw)}
                className="hover:text-white transition-colors"
                title="削除"
              >
                <XIcon size={10} />
              </button>
            </span>
          ))}

          {/* インライン入力（+ ボタン押下時に展開） */}
          {showKeywordInput && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addExtraKeyword(); }
                  if (e.key === 'Escape') { setShowKeywordInput(false); setKeywordInput(''); }
                }}
                autoFocus
                placeholder="キーワード"
                maxLength={40}
                className="px-2 py-1 text-[12px] text-slate-200 rounded-lg w-32"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(96,165,250,0.3)',
                }}
              />
              <button
                onClick={addExtraKeyword}
                className="px-2 py-1 text-[11px] font-medium rounded-md"
                style={{
                  background: 'rgba(96,165,250,0.15)',
                  color: '#93c5fd',
                  border: '1px solid rgba(96,165,250,0.3)',
                }}
              >
                追加
              </button>
              <button
                onClick={() => { setShowKeywordInput(false); setKeywordInput(''); }}
                className="text-slate-500 hover:text-slate-300 px-1"
                title="閉じる"
              >
                <XIcon size={13} />
              </button>
            </div>
          )}
        </div>

        {/* キーワードが何もない場合 */}
        {totalKeywordCount === 0 && !showKeywordInput && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-amber-300 mt-2"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}
          >
            <AlertTriangle size={13} />
            キーワードがありません。
            <Link href="/persona" className="underline hover:text-amber-200">
              ペルソナに登録
            </Link>
            するか、「追加キーワード」ボタンから入力してください。
          </div>
        )}

        {/* 除外中のペルソナキーワード（取り消し線） */}
        {excludedPersonaKeywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-slate-600">今回除外:</span>
            {excludedPersonaKeywords.map((kw) => (
              <button
                key={`excluded-${kw}`}
                onClick={() => setExcludedPersonaKeywords((prev) => prev.filter((k) => k !== kw))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] line-through hover:no-underline transition-all"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  color: '#475569',
                  border: '1px dashed rgba(255,255,255,0.08)',
                }}
                title="クリックして復活"
              >
                {kw}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
          紫=ペルソナ登録済み、青=その場追加（保存されません）。× で除外可。リセットで遷移直後の状態に戻ります。
        </p>
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
              onLikeAndFollow={handleLikeAndFollow}
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
