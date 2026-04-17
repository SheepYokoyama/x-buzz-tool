'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Link2, ArrowRight, X } from 'lucide-react';

/**
 * X アカウント未登録ユーザー向けの誘導バナー。
 * ダッシュボードで初回ログイン時に表示し、/x-accounts への導線を提供する。
 * 閉じるボタンはセッション内のみ有効（リロードで再表示）。
 */
export function XAccountSetupBanner({ hasXAccount }: { hasXAccount: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (hasXAccount || dismissed) return null;

  return (
    <div className="banner-glass rounded-[1.375rem] px-5 py-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-4 relative">
      {/* アイコン */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: 'rgba(167,139,250,0.12)',
          border: '1px solid rgba(167,139,250,0.2)',
        }}
      >
        <Link2 size={16} style={{ color: '#a78bfa' }} />
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-slate-200 leading-none">
          X（Twitter）アカウントを連携しましょう
        </p>
        <p className="text-[12px] text-slate-500 mt-1.5 leading-none">
          投稿・メトリクス取得・フォロー候補の発見には X API 認証が必要です
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/x-accounts"
        className="flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors pr-6 sm:pr-0"
        style={{ color: '#a78bfa' }}
      >
        アカウントを登録する <ArrowRight size={13} />
      </Link>

      {/* 閉じるボタン */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="閉じる"
        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
