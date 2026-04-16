import { Header } from '@/components/layout/Header';
import { FollowHuntClient } from './FollowHuntClient';

export default function FollowHuntPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Header
        title="フォロー候補"
        subtitle="アクティブペルソナの属性と近い X ユーザーを提案します"
      />

      <div
        className="mb-6 rounded-xl px-4 py-3 text-[12px] text-slate-500"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-slate-400 font-medium">スパム対策:</span>{' '}
        フォローは1件ずつ手動承認制です。スキップした候補は再提案されません。1日のフォロー上限は設定で変更できます。
      </div>

      <FollowHuntClient />
    </div>
  );
}
