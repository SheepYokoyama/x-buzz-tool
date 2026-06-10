import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, CreditCard, Settings, Key, UserPlus, CheckCircle2, AlertTriangle, Languages,
} from 'lucide-react';
import {
  ConsoleFrame, Hotspot, SideItem, Btn, Tab, Field, MockLegend,
} from '@/components/guide/ConsoleMock';

const XPRESSO_ORIGIN = 'https://xpresso-chi.vercel.app';

export default function XAccountGuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="X アカウント登録方法"
        subtitle="X Developer Console（console.x.com）から API キー／トークンを発行して Xpresso に登録する手順"
      />

      {/* 戻るリンク */}
      <Link
        href="/x-accounts"
        className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft size={12} /> アカウント管理に戻る
      </Link>

      {/* 画面はすべて英語、という最重要の注意 */}
      <div
        className="rounded-2xl p-4 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}
      >
        <Languages size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[13px] text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">console.x.com の画面はすべて英語表示です。</span>
          このマニュアルでは、画面に出てくる英語のボタン名・メニュー名を
          <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Keys and tokens</code>
          のように<span className="font-medium text-slate-700">コード体</span>で表記しています。
          画面上で同じ英語を探してクリックしてください。各ステップの図の
          <span className="inline-flex items-center justify-center w-4 h-4 mx-1 rounded-full bg-rose-500 text-white text-[10px] font-bold align-middle">1</span>
          <span className="font-medium text-rose-600">赤い丸</span>がクリックする場所です。
        </div>
      </div>

      {/* 事前準備：Pay-per-use */}
      <GuideSection
        icon={CreditCard}
        iconColor="#f59e0b"
        title="事前準備：従量課金（Pay-per-use）を有効化する"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          2026 年以降、<span className="text-slate-800 font-medium">無料（Free）プランは廃止</span>され、投稿・検索・メトリクス取得には
          従量課金（Pay-per-use）のクレジット購入が必須になりました（<span className="text-slate-800 font-medium">最低 $5 から</span>）。
        </p>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          ※ 以前は左メニューが「Billing」でしたが、現在は
          <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Credits</code>
          に名称変更されています（「Billing が見つからない」と迷う原因はこれです）。
        </p>

        <ConsoleFrame>
          <div className="flex gap-4">
            {/* 左サイドバー */}
            <div className="w-36 shrink-0 space-y-1 border-r border-slate-900/[0.08] pr-2">
              <SideItem>Dashboard</SideItem>
              <SideItem>Projects &amp; Apps</SideItem>
              <Hotspot n={1}><SideItem active>Credits</SideItem></Hotspot>
              <SideItem>Docs</SideItem>
            </div>
            {/* 本文 */}
            <div className="flex-1 space-y-3 pt-1">
              <p className="text-[13px] font-semibold text-slate-700">Credits</p>
              <p className="text-[12px] text-slate-500">Add credits to start using the API (min $5).</p>
              <Hotspot n={2}><Btn primary>Buy credits</Btn></Hotspot>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <>左メニューの <code className="font-mono text-[12px]">Credits</code> をクリック</>,
            <><code className="font-mono text-[12px]">Buy credits</code> から $5 以上をチャージ（使った分だけ課金）</>,
          ]}
        />

        <Note>※ Basic / Pro プランに既に加入している場合はこの手順は不要です。</Note>
      </GuideSection>

      {/* STEP 1 */}
      <GuideSection step={1} icon={Settings} iconColor="#2563eb" title="App（アプリ）を用意する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          <ExtLink href="https://console.x.com/">console.x.com</ExtLink> に、API を使いたい X アカウントでログインします。
        </p>

        <ConsoleFrame>
          <div className="flex gap-4">
            <div className="w-36 shrink-0 space-y-1 border-r border-slate-900/[0.08] pr-2">
              <SideItem>Dashboard</SideItem>
              <Hotspot n={1}><SideItem active>Projects &amp; Apps</SideItem></Hotspot>
              <SideItem>Credits</SideItem>
              <SideItem>Docs</SideItem>
            </div>
            <div className="flex-1 space-y-2 pt-1">
              <p className="text-[13px] font-semibold text-slate-700">Projects &amp; Apps</p>
              <div className="rounded-lg border border-slate-900/[0.1] px-3 py-2 flex items-center justify-between">
                <span className="text-[12px] text-slate-600">My Project / My App</span>
                <Hotspot n={2}><Btn>Open</Btn></Hotspot>
              </div>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <>左メニューの <code className="font-mono text-[12px]">Projects &amp; Apps</code> を開く</>,
            <>対象の App を開く（無ければ <code className="font-mono text-[12px]">+ Create App</code> から新規作成）</>,
          ]}
        />
      </GuideSection>

      {/* STEP 2 */}
      <GuideSection
        step={2}
        icon={Settings}
        iconColor="#7c3aed"
        title="User authentication settings を設定する（最重要）"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          この設定をしないと、投稿用の <span className="text-slate-800 font-medium">Read and Write 権限付き</span> の
          Access Token を発行できません。App 画面を下にスクロールして
          <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">User authentication settings</code>
          を探します。
        </p>

        <ConsoleFrame>
          <div className="space-y-3">
            {/* タブ */}
            <div className="flex gap-1 border-b border-slate-900/[0.08] -mt-1">
              <Tab active>Settings</Tab>
              <Tab>Keys and tokens</Tab>
            </div>
            <div className="rounded-lg border border-slate-900/[0.1] px-3 py-2.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-700">User authentication settings</span>
              <Hotspot n={1}><Btn>Set up</Btn></Hotspot>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <><code className="font-mono text-[12px]">Settings</code> タブ内の <code className="font-mono text-[12px]">User authentication settings</code> で <code className="font-mono text-[12px]">Set up</code>（設定済みなら <code className="font-mono text-[12px]">Edit</code>）をクリック</>,
          ]}
        />

        <p className="text-[14px] text-slate-600 leading-relaxed mt-2">
          開いたフォームに以下を入力して、最後に
          <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Save</code>
          をクリックします。
        </p>

        <div className="rounded-xl overflow-hidden border border-slate-900/10 mt-1">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium w-1/3">項目（画面の英語表記）</th>
                <th className="px-3 py-2 text-left font-medium">入力値</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-mono text-[12px]">App permissions</td>
                <td className="px-3 py-2">
                  <span className="text-emerald-600 font-medium">Read and write</span>
                  <span className="text-slate-500 text-[12px] ml-1">
                    （DM も使う場合は Read and write and Direct message）
                  </span>
                </td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-mono text-[12px]">Type of App</td>
                <td className="px-3 py-2">Web App, Automated App or Bot</td>
              </tr>
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-mono text-[12px]">Callback URI / Redirect URL</td>
                <td className="px-3 py-2 font-mono text-[12px] text-sky-600 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-mono text-[12px]">Website URL</td>
                <td className="px-3 py-2 font-mono text-[12px] text-sky-600 break-all">
                  {XPRESSO_ORIGIN}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Callback URI は Xpresso では実際に使いませんが、フォーム仕様上の必須項目です。上記をそのまま入れて構いません。
        </Note>
        <Note>
          ※ Save 後に <code className="px-1 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Client ID</code> /
          <code className="px-1 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Client Secret</code>
          が表示されますが、<span className="text-slate-700 font-medium">これらは Xpresso では使いません</span>。次の STEP 3 で発行する 4 つのキーを使います。
        </Note>
      </GuideSection>

      {/* STEP 3 */}
      <GuideSection step={3} icon={Key} iconColor="#0891b2" title="Keys and tokens でキーを発行する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          App 画面上部の
          <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Keys and tokens</code>
          タブを開き、2 つのセクションから合計 4 つ（＋任意 1 つ）を発行します。
        </p>

        <ConsoleFrame>
          <div className="space-y-3">
            <div className="flex gap-1 border-b border-slate-900/[0.08] -mt-1">
              <Tab>Settings</Tab>
              <Hotspot n={1}><Tab active>Keys and tokens</Tab></Hotspot>
            </div>

            {/* Consumer Keys */}
            <div className="rounded-lg border border-slate-900/[0.1] px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-slate-700">Consumer Keys</p>
                <p className="text-[11px] text-slate-500">API Key &amp; Secret</p>
              </div>
              <Hotspot n={2}><Btn>Regenerate</Btn></Hotspot>
            </div>

            {/* Authentication Tokens */}
            <div className="rounded-lg border border-slate-900/[0.1] px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-slate-700">Authentication Tokens</p>
                <p className="text-[11px] text-slate-500">Access Token &amp; Secret</p>
              </div>
              <Hotspot n={3}><Btn primary>Generate</Btn></Hotspot>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <><code className="font-mono text-[12px]">Keys and tokens</code> タブを開く</>,
            <><code className="font-mono text-[12px]">Consumer Keys</code> の <code className="font-mono text-[12px]">Regenerate</code>（初回は表示済み）で <b>API Key</b> / <b>API Key Secret</b> を取得</>,
            <><code className="font-mono text-[12px]">Authentication Tokens</code> の <code className="font-mono text-[12px]">Generate</code> で <b>Access Token</b> / <b>Access Token Secret</b> を取得</>,
          ]}
        />

        <p className="text-[14px] text-slate-600 leading-relaxed mt-2">
          発行した値と、Xpresso の入力欄の対応は以下のとおりです。
        </p>
        <div className="rounded-xl overflow-hidden border border-slate-900/10 mt-1">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">セクション（X 画面）</th>
                <th className="px-3 py-2 text-left font-medium">X 画面の名称</th>
                <th className="px-3 py-2 text-left font-medium">Xpresso での名称</th>
                <th className="px-3 py-2 text-left font-medium w-16">必須</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 text-[12px] text-slate-500" rowSpan={2}>Consumer Keys</td>
                <td className="px-3 py-2 font-mono text-[12px]">API Key</td>
                <td className="px-3 py-2 font-mono text-[12px]">API Key</td>
                <td className="px-3 py-2 text-rose-600">必須</td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-mono text-[12px]">API Key Secret</td>
                <td className="px-3 py-2 font-mono text-[12px]">API Key Secret</td>
                <td className="px-3 py-2 text-rose-600">必須</td>
              </tr>
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 text-[12px] text-slate-500" rowSpan={3}>Authentication Tokens</td>
                <td className="px-3 py-2 font-mono text-[12px]">Access Token</td>
                <td className="px-3 py-2 font-mono text-[12px]">Access Token</td>
                <td className="px-3 py-2 text-rose-600">必須</td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-mono text-[12px]">Access Token Secret</td>
                <td className="px-3 py-2 font-mono text-[12px]">Access Token Secret</td>
                <td className="px-3 py-2 text-rose-600">必須</td>
              </tr>
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-mono text-[12px]">Bearer Token</td>
                <td className="px-3 py-2 font-mono text-[12px]">Bearer Token</td>
                <td className="px-3 py-2 text-slate-500">任意</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Access Token / Access Token Secret は <span className="text-slate-700 font-medium">発行時の 1 回だけ画面に表示</span>されます。必ずその場でコピーしてください。
        </Note>
        <Note>
          ※ 以前に Access Token を発行していた場合、STEP 2 で権限を変更した後に必ず
          <code className="mx-1 px-1 py-0.5 rounded bg-slate-900/[0.06] text-slate-700 font-mono text-[12px]">Regenerate</code>
          で再発行してください（古いトークンは Read-only のままです）。
        </Note>
      </GuideSection>

      {/* STEP 4 */}
      <GuideSection step={4} icon={UserPlus} iconColor="#059669" title="Xpresso に登録する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          ここからは Xpresso の画面です。「<Link href="/x-accounts" className="text-sky-600 hover:underline">アカウント管理</Link>」ページを開きます。
        </p>

        <ConsoleFrame url="xpresso-chi.vercel.app/x-accounts">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-slate-700">X アカウント</p>
              <Hotspot n={1}><Btn primary>＋ X アカウントを追加</Btn></Hotspot>
            </div>
            <div className="rounded-lg border border-slate-900/[0.1] p-3 space-y-2">
              <Field label="アカウント名（任意）">空欄なら X の表示名を自動取得</Field>
              <Field label="API Key / API Key Secret / Access Token / Access Token Secret">
                STEP 3 でコピーした値を貼り付け
              </Field>
              <div className="flex justify-end">
                <Hotspot n={2}><Btn primary>追加する</Btn></Hotspot>
              </div>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <><code className="font-mono text-[12px]">＋ X アカウントを追加</code> をクリック</>,
            <>STEP 3 で取得した 4 つのトークンを貼り付けて <code className="font-mono text-[12px]">追加する</code></>,
          ]}
        />
      </GuideSection>

      {/* STEP 5 */}
      <GuideSection step={5} icon={CheckCircle2} iconColor="#db2777" title="動作を確認する">
        <OrderedList>
          <li>アカウントカードに @ユーザー名・アイコンが表示されれば連携成功</li>
          <li>ダッシュボード上部の識別カードにも X アカウントが表示される</li>
          <li>「ポスト作成」または「予約投稿」からテスト投稿を実行</li>
          <li>X 側で投稿が反映されれば完了</li>
        </OrderedList>
      </GuideSection>

      {/* よくあるエラー */}
      <div className="neon-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-600" />
          <h2 className="text-[15px] font-semibold text-slate-800">よくあるエラー</h2>
        </div>
        <div className="space-y-3 text-[14px]">
          <ErrorRow
            code="左メニューに Billing が見つからない"
            solution="現在は「Credits」に名称変更されています。Credits → Buy credits からチャージしてください（事前準備を参照）。"
          />
          <ErrorRow
            code="403 must use keys from App attached to a Project"
            solution="従量課金（Pay-per-use）未加入が原因。Credits 画面でクレジットを購入してください。"
          />
          <ErrorRow
            code="403 Forbidden（投稿のみ失敗）"
            solution="Access Token が Read-only のまま。STEP 2 で権限を Read and write に変更後、STEP 3 で Access Token を Regenerate してください。"
          />
          <ErrorRow
            code="Client ID / Client Secret を入力しても認証できない"
            solution="Xpresso は OAuth 1.0a のキーを使います。Client ID/Secret ではなく、STEP 3 の API Key・API Key Secret・Access Token・Access Token Secret を入力してください。"
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
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[14px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${iconColor}, ${iconColor}99)` }}
          >
            {step}
          </div>
        )}
        <Icon size={16} style={{ color: iconColor }} />
        <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function OrderedList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal list-inside text-[14px] text-slate-700 space-y-1.5 leading-relaxed">
      {children}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-slate-500 leading-relaxed">{children}</p>;
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-600 hover:underline inline-flex items-center gap-0.5"
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
      <p className="font-mono text-[13px] text-rose-600 mb-1">{code}</p>
      <p className="text-slate-600 text-[13px]">{solution}</p>
    </div>
  );
}
