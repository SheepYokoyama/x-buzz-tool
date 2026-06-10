import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, Settings, Key, UserPlus, CheckCircle2, AlertTriangle, ShieldCheck, Send, Briefcase,
} from 'lucide-react';

const XPRESSO_ORIGIN = 'https://xpresso-chi.vercel.app';

export default function ThreadsAccountGuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="Threads アカウント登録方法"
        subtitle="Meta for Developers でアプリを作成し、Long-lived アクセストークンを Xpresso に登録する手順"
      />

      {/* 戻るリンク */}
      <Link
        href="/x-accounts"
        className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft size={12} /> アカウント管理に戻る
      </Link>

      {/* 事前準備 */}
      <GuideSection
        icon={ShieldCheck}
        iconColor="#f59e0b"
        title="事前準備：Meta for Developers アカウント"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          Threads API は <span className="text-slate-800 font-medium">Meta Graph API</span> 経由で提供されており、利用するには
          Meta for Developers のアプリ登録が必要です。
        </p>
        <OrderedList>
          <li>
            <ExtLink href="https://developers.facebook.com/">developers.facebook.com</ExtLink> に Facebook アカウントでログイン
          </li>
          <li>右上の「<span className="text-slate-800 font-medium">開始する</span>」から開発者登録（電話番号・メール認証）を完了</li>
        </OrderedList>
        <Note>
          ※ Threads API は個人アカウントでも利用可能です（以前はプロアカウント必須でしたが、現在は不要）。
          Threads アプリ側での切替操作は不要なまま進めて構いません。
        </Note>
      </GuideSection>

      {/* STEP 1 */}
      <GuideSection step={1} icon={Settings} iconColor="#7c3aed" title="Meta for Developers でアプリを作成する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          アプリ作成は画面上部のステップバーに沿って
          <span className="text-slate-800 font-medium">「アプリの詳細」→「ユースケース」→「ビジネス」→「要件」→「概要」</span>
          の順に進むウィザード形式です。
        </p>
        <OrderedList>
          <li>
            <ExtLink href="https://developers.facebook.com/apps/">developers.facebook.com/apps</ExtLink> を開く
          </li>
          <li>「アプリを作成」をクリック</li>
          <li>
            【アプリの詳細】<span className="text-slate-800 font-medium">アプリ名</span>（例: <span className="font-mono text-[12px] text-slate-700">Xpresso</span>）と
            <span className="text-slate-800 font-medium">アプリの連絡先メールアドレス</span>を入力 → 「次へ」
          </li>
          <li>
            【ユースケース】一覧から <span className="text-slate-800 font-medium">「Threads API にアクセス」だけ</span>を選択 → 「次へ」
          </li>
          <li>
            【ビジネス】アプリにリンクするビジネスポートフォリオを選択 → 「次へ」
            <span className="block text-[12px] text-slate-500 mt-0.5 pl-5">
              ※ ポートフォリオを持っていないと「次へ」が押せません。その場合は STEP 2 へ
            </span>
          </li>
          <li>【要件】【概要】の内容を確認して進み、アプリを作成</li>
        </OrderedList>
        <Note>
          ※ 以前はユースケース選択が先でしたが、現在は<span className="text-slate-800 font-medium">アプリ名・メールアドレスの入力が先</span>に変わっています。
          「Threads API にアクセス」を選ぶだけで必要な権限（認証・投稿・返信・インサイト取得）が一括で追加されます。
        </Note>
      </GuideSection>

      {/* STEP 2 */}
      <GuideSection step={2} icon={Briefcase} iconColor="#f59e0b" title="ビジネスポートフォリオを作成する（持っていない場合）">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          「ビジネス」ステップで
          <span className="text-slate-800 font-medium">「表示できるビジネスがありません」</span>
          と表示されて「次へ」が押せない場合は、ビジネスポートフォリオの新規作成が必要です。
        </p>
        <OrderedList>
          <li>警告文の中の <span className="text-slate-800 font-medium">「ビジネス設定」</span> リンクを開く</li>
          <li>
            「ビジネスマネージャでビジネスポートフォリオを作成」画面で以下を入力
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 pl-3">
              <li>ビジネスおよびアカウントの名前（特殊文字は使用不可）</li>
              <li>あなたの名前</li>
              <li>仕事用メールアドレス</li>
            </ul>
          </li>
          <li>「送信」をクリック → 届いた確認メールで認証を完了</li>
          <li>アプリ作成画面に戻り、作成したポートフォリオを選択して「次へ」</li>
        </OrderedList>

        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <p className="text-[13px] text-amber-700 font-medium mb-1">⚠️ 「ビジネスのアカウントはすでに登録されています」と出る場合</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            会社ドメインのメールアドレスを入力すると、同じドメインで作成済みのビジネスマネージャがある場合に新規作成できません。
            既存のビジネス管理者に依頼して自分を追加してもらうか、
            <span className="text-slate-800 font-medium">別のメールアドレス（個人の Gmail など）</span>に変更して送信してください。
          </p>
        </div>

        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <p className="text-[13px] text-rose-600 font-medium mb-1">🚫 「Unable to Create Account（広告の利用が制限されています）」と出る場合</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Facebook アカウント自体に広告機能の制限がかかっているとポートフォリオを作成できず、
            「送信」を押しても同じ画面に戻り続けます（無限ループ）。この場合は
            <ExtLink href="https://accountquality.facebook.com/">アカウントクオリティ</ExtLink>
            で制限内容を確認して審査をリクエストするか、
            <span className="text-slate-800 font-medium">制限のかかっていない別の Facebook アカウント</span>で最初からやり直してください。
          </p>
        </div>
      </GuideSection>

      {/* STEP 3 */}
      <GuideSection
        step={3}
        icon={Settings}
        iconColor="#7c3aed"
        title="権限スコープが追加されたか確認する"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          左サイドバー「<span className="text-slate-800 font-medium">ユースケース</span>」→「Threads API にアクセス」→「アクセス許可と機能」を開き、
          以下 2 つの権限が <span className="text-slate-800 font-medium">「テスト準備完了」</span> ステータスになっていることを確認します。
        </p>

        <div className="rounded-xl overflow-hidden border border-slate-900/10 mt-3">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">スコープ</th>
                <th className="px-3 py-2 text-left font-medium">用途</th>
                <th className="px-3 py-2 text-left font-medium w-24">ステータス</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-mono text-[12px]">threads_basic</td>
                <td className="px-3 py-2">プロフィール（@ユーザー名・アイコン）の読み取り</td>
                <td className="px-3 py-2 text-emerald-600">テスト準備完了</td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-mono text-[12px]">threads_content_publish</td>
                <td className="px-3 py-2">スレッドへの投稿</td>
                <td className="px-3 py-2 text-emerald-600">テスト準備完了</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ STEP 1 で「Threads API にアクセス」ユースケースを選択していれば、上記 2 つは自動で追加されています。
          表示されていない場合は同画面で個別に「追加」してください。
        </Note>
      </GuideSection>

      {/* STEP 4 */}
      <GuideSection
        step={4}
        icon={Settings}
        iconColor="#db2777"
        title="コールバック URL を設定する（重要）"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          左サイドバー「ユースケース」→「Threads API にアクセス」→ <span className="text-slate-800 font-medium">「設定」</span> タブを開き、
          以下 3 つの URL を入力して保存します。
        </p>

        <div className="rounded-xl overflow-hidden border border-slate-900/10 mt-3">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium w-2/5">項目</th>
                <th className="px-3 py-2 text-left font-medium">入力値</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-medium">Threads 表示名</td>
                <td className="px-3 py-2 font-mono text-[12px] text-slate-800">Xpresso<span className="text-slate-500">（任意の名前）</span></td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-medium">コールバック URL をリダイレクト</td>
                <td className="px-3 py-2 font-mono text-[12px] text-pink-600 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-medium">コールバック URL をアンインストール</td>
                <td className="px-3 py-2 font-mono text-[12px] text-pink-600 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-medium">コールバック URL を削除</td>
                <td className="px-3 py-2 font-mono text-[12px] text-pink-600 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Callback URL は Xpresso では実際に使いません（トークン手動コピペ方式のため）が、Meta 側のフォーム必須項目です。上記をそのまま入れて構いません。
        </Note>

        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <p className="text-[13px] text-amber-700 font-medium mb-1">⚠️ URL 入力後に必ず Enter キーで確定</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            URL を貼り付けた直後はテキスト入力のままで、Meta 側は「未入力」と判定します。
            入力欄内で <span className="font-mono text-slate-800">Enter</span> を押して URL が
            <span className="text-slate-800 font-medium">チップ（青枠タグ）</span>に変わったことを確認してから保存してください。
            チップ化されていないと「Redirect URIs: OAuthリダイレクトURIを記入してください」エラーで保存できません。
            <span className="block mt-1 text-slate-500">
              ※ 3 項目それぞれで Enter 確定が必要です（リダイレクト用が特に見落としやすい）。
            </span>
          </p>
        </div>
      </GuideSection>

      {/* STEP 5 */}
      <GuideSection step={5} icon={UserPlus} iconColor="#db2777" title="Threads テスターを招待する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          Long-lived アクセストークンを発行するには、対象の Threads アカウントを
          <span className="text-slate-800 font-medium"> 「Threads テスター」</span> として登録する必要があります。
          <span className="text-slate-800 font-medium">アプリ作成者本人のアカウントでもこの招待は必要</span> です。
        </p>
        <OrderedList>
          <li>
            左サイドバー <span className="text-slate-800 font-medium">「アプリの役割」→「役割」</span> を開く
          </li>
          <li>画面上部のタブから <span className="text-slate-800 font-medium">「Threads テスター」</span> を選択</li>
          <li>右上の「メンバーを追加」をクリック</li>
          <li>連携したい Threads の <span className="font-mono text-[12px] text-slate-800">@ユーザー名</span> を入力 → 送信</li>
        </OrderedList>

        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)' }}
        >
          <p className="text-[13px] text-sky-200 font-medium mb-1">招待の承認場所（通知に来ません）</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Threads には招待通知が届かないため、招待を受けた本人で以下にアクセスして承認してください：
          </p>
          <ol className="list-decimal list-inside text-[12px] text-slate-700 mt-1 space-y-0.5 pl-1">
            <li>
              <ExtLink href="https://www.threads.net/settings/privacy">Threads → 設定 → プライバシー</ExtLink> を開く
            </li>
            <li>「ウェブサイトのアクセス許可」を選択</li>
            <li>「招待」タブにアプリ名（例: Xpresso）の招待が表示される</li>
            <li>「同意する」をクリック</li>
          </ol>
        </div>
      </GuideSection>

      {/* STEP 6 */}
      <GuideSection step={6} icon={Key} iconColor="#0891b2" title="Long-lived アクセストークンを発行する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          ふたたび <span className="text-slate-800 font-medium">「ユースケース」→「Threads API にアクセス」→「設定」</span> タブを開きます。
          ページ下部の <span className="text-slate-800 font-medium">「ユーザートークン生成ツール」</span> から、
          STEP 5 で承認済みの Threads アカウント用に <span className="text-slate-800 font-medium">60 日有効な Long-lived アクセストークン</span> を直接発行できます。
        </p>
        <OrderedList>
          <li>「ユーザートークン生成ツール」セクションの「名前」欄に承認済みアカウントが表示されていることを確認</li>
          <li>該当行の「アクション」から <span className="text-slate-800 font-medium">トークン生成</span> を選択</li>
          <li>Threads の認可ダイアログで <span className="font-mono text-[12px] text-slate-800">threads_basic</span> と <span className="font-mono text-[12px] text-slate-800">threads_content_publish</span> の両方を許可</li>
          <li>表示された <span className="font-mono text-[12px] text-cyan-600">アクセストークン</span> をコピー（これが Xpresso に登録する文字列）</li>
        </OrderedList>

        <Note>
          ※ このツールから発行されるトークンは最初から <span className="text-slate-800 font-medium">Long-lived（60 日有効）</span> です。
          短期→長期の変換ステップは不要です。
        </Note>
        <Note>
          ※ 失効する前（30 日以降）に Xpresso のアカウントカードの 🔄 ボタンで最新化できます。
          または同ツールから再発行→再登録でも OK です。
        </Note>
      </GuideSection>

      {/* STEP 7 */}
      <GuideSection step={7} icon={UserPlus} iconColor="#7c3aed" title="Xpresso に登録する">
        <OrderedList>
          <li>
            Xpresso の「<Link href="/x-accounts" className="text-sky-600 hover:underline">アカウント管理</Link>」ページを開く
          </li>
          <li>「Threads アカウントを登録」ボタンをクリック</li>
          <li>
            モーダルで以下を入力して「追加する」
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 pl-3">
              <li>アカウント名（任意・空欄なら Threads の表示名を自動取得）</li>
              <li>Access Token（STEP 6 でコピーした文字列）</li>
            </ul>
          </li>
        </OrderedList>
      </GuideSection>

      {/* STEP 8 */}
      <GuideSection step={8} icon={CheckCircle2} iconColor="#db2777" title="動作を確認する">
        <OrderedList>
          <li>アカウントカードに Threads の @ユーザー名・アイコンが表示されれば連携成功</li>
          <li>ダッシュボード上部の識別カードにも Threads アカウントが表示される</li>
          <li>「ポスト作成」ページの投稿先トグルで「Threads」を ON</li>
          <li>テスト投稿を実行し、Threads 側に反映されれば完了</li>
        </OrderedList>
        <Note>
          ※ 画像添付にも対応しています（1枚は単独投稿、2〜4枚はカルーセル投稿）。
          画像は投稿時に Xpresso 側で一時的に公開ストレージへアップロードし、Threads への反映後に自動削除されます。
        </Note>
      </GuideSection>

      {/* よくあるエラー */}
      <div className="neon-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-600" />
          <h2 className="text-[15px] font-semibold text-slate-800">よくあるエラー</h2>
        </div>
        <div className="space-y-3 text-[14px]">
          <ErrorRow
            code="フォームを保存できません / Redirect URIs: OAuthリダイレクトURIを記入してください"
            solution="URL を入力欄に貼り付けただけだと「未入力」扱いです。Enter キーで青いチップ化してから保存してください（STEP 4 参照）。"
          />
          <ErrorRow
            code="ビジネスのアカウントはすでに登録されています"
            solution="同じメールドメインで作成済みのビジネスマネージャがあります。既存の管理者に追加してもらうか、別のメールアドレス（個人の Gmail など）で作成してください（STEP 2 参照）。"
          />
          <ErrorRow
            code="Unable to Create Account / 広告の利用が制限されています（「送信」が無限ループ）"
            solution="Facebook アカウント自体に広告制限がかかっています。アカウントクオリティで審査をリクエストするか、制限のない別の Facebook アカウントでやり直してください（STEP 2 参照）。"
          />
          <ErrorRow
            code="ユーザートークン生成ツールに名前が表示されない"
            solution="Threads テスターとして招待 → 承認まで完了していません。STEP 5 を確認してください。"
          />
          <ErrorRow
            code="401 invalid_token / Session has expired"
            solution="トークン期限切れまたは無効です。STEP 6 から再発行 → Xpresso 側のアカウントを「編集」で上書き保存してください。"
          />
          <ErrorRow
            code="403 forbidden"
            solution="権限スコープ不足。STEP 3 で threads_basic と threads_content_publish が「テスト準備完了」になっているか確認してください。"
          />
          <ErrorRow
            code="App in Development mode のため第三者が使えない"
            solution="自分のアカウントで使う分には Development mode のままで OK。他のユーザーに開放する場合のみ Live mode への切替＋アプリレビューが必要です。"
          />
        </div>
      </div>

      {/* 最後の補足 */}
      <div className="rounded-xl p-4 mt-4 flex items-center gap-3" style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)' }}>
        <Send size={16} style={{ color: '#2563eb' }} />
        <p className="text-[13px] text-slate-600 leading-relaxed">
          登録が完了したら「<Link href="/post-create" className="text-sky-600 hover:underline">ポスト作成</Link>」ページで投稿先トグルから Threads を選んでテスト投稿してみましょう。
        </p>
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
