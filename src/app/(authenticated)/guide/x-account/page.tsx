import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, CreditCard, Settings, Key, UserPlus, CheckCircle2, AlertTriangle,
} from 'lucide-react';

const XPRESSO_ORIGIN = 'https://xpresso-chi.vercel.app';

export default function XAccountGuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="X アカウント登録マニュアル"
        subtitle="X Developer Console から API トークンを発行して Xpresso に登録する手順"
      />

      {/* 戻るリンク */}
      <Link
        href="/x-accounts"
        className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-300 transition-colors mb-6"
      >
        <ArrowLeft size={12} /> アカウント管理に戻る
      </Link>

      {/* 事前準備 */}
      <GuideSection
        icon={CreditCard}
        iconColor="#f59e0b"
        title="事前準備：Pay-per-use の有効化"
      >
        <p className="text-[13px] text-slate-400 leading-relaxed">
          2026 年 2 月以降、<span className="text-slate-200 font-medium">Free プランでは投稿・検索・メトリクス取得が利用できません</span>。
          Xpresso の主要機能を使うには Pay-per-use（従量課金）を有効化してください。
        </p>
        <OrderedList>
          <li>
            <ExtLink href="https://console.x.com/">console.x.com</ExtLink> にログイン
          </li>
          <li>左サイドバー「Billing」→ Pay-per-use を有効化</li>
          <li>クレジットを購入（使った分だけ課金）</li>
        </OrderedList>
        <Note>※ Basic / Pro プランに既に加入している場合はこの手順は不要です。</Note>
      </GuideSection>

      {/* STEP 1 */}
      <GuideSection step={1} icon={Settings} iconColor="#60a5fa" title="App を用意する">
        <OrderedList>
          <li>
            <ExtLink href="https://console.x.com/">console.x.com</ExtLink> にログイン
          </li>
          <li>「Projects &amp; Apps」から対象 App を開く（無ければ新規作成）</li>
        </OrderedList>
      </GuideSection>

      {/* STEP 2 */}
      <GuideSection
        step={2}
        icon={Settings}
        iconColor="#a78bfa"
        title="User authentication settings を設定する（重要）"
      >
        <p className="text-[13px] text-slate-400 leading-relaxed">
          この設定をしないと、投稿用の <span className="text-slate-200 font-medium">Read and Write 権限付き</span> の
          Access Token を発行できません。
        </p>
        <OrderedList>
          <li>App 画面の「User authentication settings」→「Set up」をクリック</li>
          <li>以下の項目を入力して保存します</li>
        </OrderedList>

        <div className="rounded-xl overflow-hidden border border-white/10 mt-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium w-1/3">項目</th>
                <th className="px-3 py-2 text-left font-medium">入力値</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-medium">App permissions</td>
                <td className="px-3 py-2">
                  <span className="text-emerald-300">Read and Write</span>
                  <span className="text-slate-500 text-[11px] ml-1">
                    （DM も使う場合は Read, Write and Direct Messages）
                  </span>
                </td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2 font-medium">Type of App</td>
                <td className="px-3 py-2">Web App, Automated App or Bot</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-medium">Callback URI / Redirect URL</td>
                <td className="px-3 py-2 font-mono text-[11px] text-sky-300 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2 font-medium">Website URL</td>
                <td className="px-3 py-2 font-mono text-[11px] text-sky-300 break-all">
                  {XPRESSO_ORIGIN}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Callback URI は Xpresso では実際に使いませんが、フォーム仕様上の必須項目です。上記をそのまま入れて構いません。
        </Note>
      </GuideSection>

      {/* STEP 3 */}
      <GuideSection step={3} icon={Key} iconColor="#22d3ee" title="Keys and tokens を発行する（5 つ）">
        <OrderedList>
          <li>App 画面の「Keys and tokens」タブを開く</li>
          <li>下記 5 つを発行・コピーします</li>
        </OrderedList>

        <div className="rounded-xl overflow-hidden border border-white/10 mt-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">項目（X 側）</th>
                <th className="px-3 py-2 text-left font-medium">Xpresso での名称</th>
                <th className="px-3 py-2 text-left font-medium w-20">必須</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">Consumer Key</td>
                <td className="px-3 py-2 font-mono text-[11px]">API Key</td>
                <td className="px-3 py-2 text-rose-300">必須</td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2">Consumer Secret</td>
                <td className="px-3 py-2 font-mono text-[11px]">API Key Secret</td>
                <td className="px-3 py-2 text-rose-300">必須</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">Access Token</td>
                <td className="px-3 py-2 font-mono text-[11px]">Access Token</td>
                <td className="px-3 py-2 text-rose-300">必須</td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2">Access Token Secret</td>
                <td className="px-3 py-2 font-mono text-[11px]">Access Token Secret</td>
                <td className="px-3 py-2 text-rose-300">必須</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">Bearer Token</td>
                <td className="px-3 py-2 font-mono text-[11px]">Bearer Token</td>
                <td className="px-3 py-2 text-slate-500">任意</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Access Token は初回生成時のみ画面に表示されます。必ずその場で控えてください。
        </Note>
        <Note>
          ※ 以前に Access Token を発行していた場合、STEP 2 で権限を変更した後に必ず
          <span className="text-slate-300 font-medium"> Regenerate </span>
          で再発行してください（古いトークンは Read-only のままです）。
        </Note>
      </GuideSection>

      {/* STEP 4 */}
      <GuideSection step={4} icon={UserPlus} iconColor="#34d399" title="Xpresso に登録する">
        <OrderedList>
          <li>
            Xpresso の「<Link href="/x-accounts" className="text-sky-300 hover:underline">アカウント管理</Link>」ページを開く
          </li>
          <li>「X アカウントを追加」ボタンをクリック</li>
          <li>
            モーダルで以下を入力して「追加する」
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400 pl-3">
              <li>アカウント名（必須・任意の表示名）</li>
              <li>X ユーザー名（@ なし）</li>
              <li>STEP 3 で取得した 5 つのトークンを貼り付け</li>
            </ul>
          </li>
        </OrderedList>
      </GuideSection>

      {/* STEP 5 */}
      <GuideSection step={5} icon={CheckCircle2} iconColor="#f472b6" title="動作を確認する">
        <OrderedList>
          <li>サイドバーにアカウント名・@ユーザー名が表示されれば連携成功</li>
          <li>ダッシュボードからテスト投稿または予約投稿を実行</li>
          <li>X 側で投稿が反映されれば完了</li>
        </OrderedList>
      </GuideSection>

      {/* よくあるエラー */}
      <div className="neon-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-400" />
          <h2 className="text-[14px] font-semibold text-slate-200">よくあるエラー</h2>
        </div>
        <div className="space-y-3 text-[13px]">
          <ErrorRow
            code="403 must use keys from App attached to a Project"
            solution="Pay-per-use 未加入が原因。Billing 画面で有効化してください。"
          />
          <ErrorRow
            code="403 Forbidden（投稿のみ失敗）"
            solution="Access Token が Read-only のまま。STEP 2 で権限変更後、STEP 3 で Access Token を Regenerate してください。"
          />
          <ErrorRow
            code="トークンが分からなくなった"
            solution="Keys and tokens 画面で Regenerate → Xpresso 側のアカウントを「編集」で上書き保存してください。"
          />
        </div>
      </div>
    </div>
  );
}

/* ── 共通コンポーネント ── */

function GuideSection({
  step, icon: Icon, iconColor, title, children,
}: {
  step?: number;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="neon-card p-6 mb-4">
      <div className="flex items-center gap-3 mb-4">
        {step != null && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[13px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${iconColor}, ${iconColor}99)` }}
          >
            {step}
          </div>
        )}
        <Icon size={16} style={{ color: iconColor }} />
        <h2 className="text-[14px] font-semibold text-slate-200">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function OrderedList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal list-inside text-[13px] text-slate-300 space-y-1.5 leading-relaxed">
      {children}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-slate-500 leading-relaxed">{children}</p>;
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-300 hover:underline inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink size={10} />
    </a>
  );
}

function ErrorRow({ code, solution }: { code: string; solution: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}
    >
      <p className="font-mono text-[12px] text-rose-300 mb-1">{code}</p>
      <p className="text-slate-400 text-[12px]">{solution}</p>
    </div>
  );
}
