import Link from 'next/link';
import { ExternalLink, Info } from 'lucide-react';

/**
 * X API の料金プラン案内アコーディオン。
 * 2026年2月以降 Free では投稿・検索が使えないため、Pay-per-use への誘導を行う。
 * <details> ネイティブで state 不要・SSR 完結。
 */
export function XApiPricingNotice() {
  return (
    <details
      className="mb-6 group rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none hover:bg-white/[0.02] transition-colors text-[12px]">
        <Info size={14} className="text-amber-400/70 shrink-0" />
        <span className="text-slate-400 font-medium">
          投稿・検索機能を使うには X API の料金プランを確認してください
        </span>
        <span className="ml-auto text-slate-500 text-[11px] group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>

      <div className="px-4 pb-4 pt-1 text-[12px] text-slate-400 space-y-3">
        <p>
          2026年2月以降、X API は
          <span className="text-slate-200 font-medium"> Pay-per-use </span>
          が標準プランになりました。
          <span className="text-slate-200 font-medium">
            {' '}Free プランのままでは投稿・検索・メトリクス取得などの書き込み・取得系 API が利用できません。
          </span>
        </p>

        <div className="rounded-lg overflow-hidden border border-white/10">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">プラン</th>
                <th className="px-3 py-2 text-left font-medium">投稿</th>
                <th className="px-3 py-2 text-left font-medium">検索・メトリクス</th>
                <th className="px-3 py-2 text-left font-medium">費用</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-medium text-slate-300">Free</td>
                <td className="px-3 py-2 text-rose-300/70">不可</td>
                <td className="px-3 py-2 text-rose-300/70">読み取り500件/月のみ</td>
                <td className="px-3 py-2">無料</td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2 font-medium text-emerald-300">Pay-per-use</td>
                <td className="px-3 py-2 text-emerald-300/80">可</td>
                <td className="px-3 py-2 text-emerald-300/80">可</td>
                <td className="px-3 py-2">使った分だけ（クレジット前払い）</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5">
          <p className="text-slate-500 text-[11px]">設定手順:</p>
          <ol className="list-decimal list-inside text-[12px] space-y-1 text-slate-400">
            <li>
              <Link
                href="https://console.x.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-300 hover:underline inline-flex items-center gap-0.5"
              >
                console.x.com
                <ExternalLink size={10} />
              </Link>
              {' '}にログイン
            </li>
            <li>左サイドバーの「Billing」（または「Usage & billing」）を開く</li>
            <li>Pay-per-use を有効化してクレジットを購入</li>
            <li>このツールに戻って、投稿や検索を実行</li>
          </ol>
        </div>

        <p className="text-slate-500 text-[11px]">
          ※ 既に Basic / Pro プランに加入している場合はそのまま利用できます。Free のまま投稿しようとすると 403 エラー「must use keys from App attached to a Project」が返ります。
        </p>
      </div>
    </details>
  );
}
