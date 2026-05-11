import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, Settings, Key, UserPlus, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw,
} from 'lucide-react';

const XPRESSO_ORIGIN = 'https://xpresso-chi.vercel.app';

export default function ThreadsAccountGuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="Threads アカウント登録マニュアル"
        subtitle="Meta for Developers でアプリを作成し、Long-lived アクセストークンを Xpresso に登録する手順"
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
        icon={ShieldCheck}
        iconColor="#f59e0b"
        title="事前準備：Meta for Developers アカウントと Threads プロアカウント"
      >
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Threads API は <span className="text-slate-200 font-medium">Meta Graph API</span> 経由で提供されており、利用するには
          Meta for Developers のアプリ登録が必要です。また、投稿元の Threads アカウントは
          <span className="text-slate-200 font-medium">プロアカウント</span>（クリエイター / ビジネス）に切り替えてください。
        </p>
        <OrderedList>
          <li>
            <ExtLink href="https://developers.facebook.com/">developers.facebook.com</ExtLink> に Facebook アカウントでログイン
          </li>
          <li>Threads アプリで「設定」→「アカウント」→「プロアカウントに切り替える」を選択</li>
        </OrderedList>
        <Note>※ 個人アカウントのままでも基本機能は使えますが、API 経由の投稿はプロアカウント必須です。</Note>
      </GuideSection>

      {/* STEP 1 */}
      <GuideSection step={1} icon={Settings} iconColor="#a855f7" title="Meta for Developers でアプリを作成する">
        <OrderedList>
          <li>
            <ExtLink href="https://developers.facebook.com/apps/">developers.facebook.com/apps</ExtLink> を開く
          </li>
          <li>「アプリを作成」をクリック</li>
          <li>「ユースケース」で「他のユースケース」を選択 → 次へ</li>
          <li>「アプリのタイプ」で「ビジネス」を選択 → 次へ</li>
          <li>アプリの表示名・連絡先メールアドレスを入力して作成</li>
        </OrderedList>
      </GuideSection>

      {/* STEP 2 */}
      <GuideSection
        step={2}
        icon={Settings}
        iconColor="#c084fc"
        title="アプリに Threads 製品を追加する"
      >
        <OrderedList>
          <li>作成したアプリのダッシュボードで「製品を追加」を表示</li>
          <li>「Threads」カードの「設定」をクリック</li>
          <li>左サイドバーに「Threads API」のメニューが追加されます</li>
        </OrderedList>
      </GuideSection>

      {/* STEP 3 */}
      <GuideSection
        step={3}
        icon={Settings}
        iconColor="#ec4899"
        title="Threads API の設定を行う（重要）"
      >
        <p className="text-[13px] text-slate-400 leading-relaxed">
          OAuth 認可フローで必要な URL を登録します。Xpresso では実際にコールバックを受け取りませんが、
          フォーム仕様上の必須項目なので下記をそのまま設定してください。
        </p>
        <OrderedList>
          <li>左サイドバー「Threads API」→「設定」を開く</li>
          <li>下記を入力して保存</li>
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
                <td className="px-3 py-2 font-medium">Redirect Callback URLs</td>
                <td className="px-3 py-2 font-mono text-[11px] text-pink-300 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2 font-medium">Deauthorize Callback URL</td>
                <td className="px-3 py-2 font-mono text-[11px] text-pink-300 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-medium">Data Deletion Request URL</td>
                <td className="px-3 py-2 font-mono text-[11px] text-pink-300 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Callback URI は Xpresso では実際に使いませんが、Meta 側のフォーム必須項目です。上記をそのまま入れて構いません。
        </Note>
      </GuideSection>

      {/* STEP 4 */}
      <GuideSection step={4} icon={Key} iconColor="#a855f7" title="権限スコープを追加する">
        <OrderedList>
          <li>「Threads API」→「権限」を開く</li>
          <li>下記 2 つのスコープに「Add to App」をクリック</li>
        </OrderedList>

        <div className="rounded-xl overflow-hidden border border-white/10 mt-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">スコープ</th>
                <th className="px-3 py-2 text-left font-medium">用途</th>
                <th className="px-3 py-2 text-left font-medium w-20">必須</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-mono text-[11px]">threads_basic</td>
                <td className="px-3 py-2">プロフィール（@ユーザー名・アイコン）の読み取り</td>
                <td className="px-3 py-2 text-rose-300">必須</td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2 font-mono text-[11px]">threads_content_publish</td>
                <td className="px-3 py-2">スレッドへの投稿</td>
                <td className="px-3 py-2 text-rose-300">必須</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GuideSection>

      {/* STEP 5 */}
      <GuideSection step={5} icon={Key} iconColor="#22d3ee" title="アクセストークンを発行する">
        <p className="text-[13px] text-slate-400 leading-relaxed">
          「Threads API」→「User Token Generator」（または「テストユーザー」セクション）から
          短期トークン（1 時間有効）を発行し、続けて Long-lived access token（60 日有効）に変換します。
        </p>
        <OrderedList>
          <li>「Threads API」→「Generate access token」もしくは「User Token Generator」を開く</li>
          <li>連携したい Threads アカウントを選択して認可</li>
          <li>権限の確認ダイアログで <span className="text-slate-200 font-medium">threads_basic</span> と <span className="text-slate-200 font-medium">threads_content_publish</span> の両方を許可</li>
          <li>表示された <span className="font-mono text-[11px] text-cyan-300">User Access Token</span> をコピー（これが Xpresso に登録する文字列）</li>
        </OrderedList>

        <Note>
          ※ 短期トークンは 1 時間で失効します。Xpresso では Long-lived access token（60 日有効）を使うのが推奨です。
          長期化したい場合は次の STEP に進んでください。
        </Note>
      </GuideSection>

      {/* STEP 6 */}
      <GuideSection step={6} icon={RefreshCw} iconColor="#34d399" title="（推奨）Long-lived access token に変換する">
        <p className="text-[13px] text-slate-400 leading-relaxed">
          短期トークン（1 時間）を 60 日間有効な Long-lived access token に変換します。
          ブラウザでアドレスバーに以下の URL を貼り付け、<span className="text-slate-200 font-medium">SHORT_LIVED_TOKEN</span> と
          <span className="text-slate-200 font-medium"> CLIENT_SECRET</span> を置き換えてアクセスしてください。
        </p>
        <div
          className="rounded-lg p-3 font-mono text-[11px] text-cyan-300 break-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=<span className="text-amber-300">CLIENT_SECRET</span>&access_token=<span className="text-amber-300">SHORT_LIVED_TOKEN</span>
        </div>
        <Note>
          ※ CLIENT_SECRET は Meta アプリの「アプリの設定」→「ベーシック」→「app secret」で確認できます。
          レスポンスの <span className="font-mono">access_token</span> が Long-lived access token です。
        </Note>
        <Note>
          ※ Long-lived access token は失効する前（30 日以降）に
          <span className="font-mono text-[11px] text-cyan-300 ml-1">/refresh_access_token</span>
          エンドポイントで更新できます。Xpresso 側でも「Threads アカウント」カードの 🔄 ボタンで最新化できます。
        </Note>
      </GuideSection>

      {/* STEP 7 */}
      <GuideSection step={7} icon={UserPlus} iconColor="#c084fc" title="Xpresso に登録する">
        <OrderedList>
          <li>
            Xpresso の「<Link href="/x-accounts" className="text-sky-300 hover:underline">アカウント管理</Link>」ページを開く
          </li>
          <li>「Threadsアカウントを登録」ボタンをクリック</li>
          <li>
            モーダルで以下を入力して「追加する」
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400 pl-3">
              <li>アカウント名（任意・空欄なら Threads の表示名を自動取得）</li>
              <li>Access Token（STEP 5 または STEP 6 で取得した文字列）</li>
            </ul>
          </li>
        </OrderedList>
      </GuideSection>

      {/* STEP 8 */}
      <GuideSection step={8} icon={CheckCircle2} iconColor="#f472b6" title="動作を確認する">
        <OrderedList>
          <li>アカウントカードに Threads の @ユーザー名・アイコンが表示されれば連携成功</li>
          <li>「ポスト作成」ページの投稿先トグルで「Threads」をON</li>
          <li>テスト投稿を実行し、Threads 側に反映されれば完了</li>
        </OrderedList>
        <Note>
          ※ 現時点では Threads へはテキストのみ投稿されます。画像添付は Phase 5 で対応予定です。
        </Note>
      </GuideSection>

      {/* よくあるエラー */}
      <div className="neon-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-400" />
          <h2 className="text-[14px] font-semibold text-slate-200">よくあるエラー</h2>
        </div>
        <div className="space-y-3 text-[13px]">
          <ErrorRow
            code="401 invalid_token / Session has expired"
            solution="トークン期限切れまたは無効です。STEP 5 から再発行するか、Long-lived access token に変換してください。"
          />
          <ErrorRow
            code="403 forbidden"
            solution="権限スコープ不足。STEP 4 で threads_basic と threads_content_publish の両方が追加されているか確認してください。"
          />
          <ErrorRow
            code="App in Development mode のため第三者が使えない"
            solution="自分のアカウントで使う分には Development mode のままで OK。他のユーザーに開放する場合のみ Live mode への切替＋アプリレビューが必要です。"
          />
          <ErrorRow
            code="アクセストークンを紛失した"
            solution="STEP 5 から再発行 → Xpresso 側のアカウントを「編集」で上書き保存してください。"
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
