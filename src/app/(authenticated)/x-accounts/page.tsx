import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { XAccountsClient } from './XAccountsClient';
import { ThreadsAccountsClient } from './ThreadsAccountsClient';
import { XApiPricingNotice } from '@/components/x-accounts/XApiPricingNotice';

export default function XAccountsPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Header
        title="アカウント管理"
        subtitle="投稿に使用する外部サービスアカウントのトークンを安全に管理します"
      />

      {/* 注意事項 */}
      <div
        className="mb-6 rounded-xl px-4 py-3 text-[12px] text-slate-500"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-slate-400 font-medium">セキュリティについて:</span>{' '}
        トークンはAES-256-CBCで暗号化してデータベースに保存されます。画面上ではマスク表示のみ行い、平文は一切表示されません。
      </div>

      {/* 登録マニュアルへの導線（X / Threads） */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/guide/x-account"
          className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04]"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.18)' }}
        >
          <BookOpen size={16} className="text-sky-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-200">
              X 登録マニュアル
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              X Developer Console での App 設定からトークン発行・Xpresso 登録まで
            </p>
          </div>
          <ArrowRight size={14} className="text-sky-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/guide/threads-account"
          className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04]"
          style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.22)' }}
        >
          <BookOpen size={16} className="text-purple-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-200">
              Threads 登録マニュアル
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Meta for Developers のアプリ作成からアクセストークン発行まで
            </p>
          </div>
          <ArrowRight size={14} className="text-purple-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* X API 料金プラン案内 */}
      <XApiPricingNotice />

      <XAccountsClient />

      <ThreadsAccountsClient />
    </div>
  );
}
