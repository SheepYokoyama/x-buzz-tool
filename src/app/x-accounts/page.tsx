import { Header } from '@/components/layout/Header';
import { XAccountsClient } from './XAccountsClient';

export default function XAccountsPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Header
        title="X アカウント管理"
        subtitle="投稿に使用するXアカウントのトークンを安全に管理します"
      />

      {/* 注意事項 */}
      <div
        className="mb-6 rounded-xl px-4 py-3 text-[12px] text-slate-500"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-slate-400 font-medium">セキュリティについて:</span>{' '}
        トークンはAES-256-CBCで暗号化してデータベースに保存されます。画面上ではマスク表示のみ行い、平文は一切表示されません。
      </div>

      <XAccountsClient />
    </div>
  );
}
