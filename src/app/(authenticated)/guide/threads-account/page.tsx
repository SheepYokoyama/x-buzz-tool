import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, Settings, Key, UserPlus, CheckCircle2, AlertTriangle, ShieldCheck, Send, Briefcase, MousePointerClick,
} from 'lucide-react';
import {
  ConsoleFrame, Hotspot, Btn, Field, MockLegend,
} from '@/components/guide/ConsoleMock';

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

      {/* 図の見方 */}
      <div
        className="rounded-2xl p-4 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}
      >
        <MousePointerClick size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[13px] text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Meta for Developers の画面は日本語表示です。</span>
          各ステップの図の
          <span className="inline-flex items-center justify-center w-4 h-4 mx-1 rounded-full bg-rose-500 text-white text-[10px] font-bold align-middle">1</span>
          <span className="font-medium text-rose-600">赤い丸</span>がクリック・入力する場所です。
        </div>
      </div>

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

        {/* 図：アプリの詳細 */}
        <ConsoleFrame url="developers.facebook.com/apps/creation">
          <div className="space-y-3">
            <WizardSteps current={0} />
            <p className="text-[13px] font-semibold text-slate-700">アプリの詳細を入力</p>
            <div className="space-y-2">
              <Field label="アプリ名を追加">Xpresso</Field>
              <Field label="アプリの連絡先メールアドレス">you@example.com</Field>
            </div>
            <div className="flex justify-end">
              <Hotspot n={1}><Btn primary>次へ</Btn></Hotspot>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <>アプリ名（例: <code className="font-mono text-[12px]">Xpresso</code>）とメールアドレスを入力して「次へ」</>,
          ]}
        />

        {/* 図：ユースケース選択 */}
        <ConsoleFrame url="developers.facebook.com/apps/creation">
          <div className="space-y-3">
            <WizardSteps current={1} />
            <p className="text-[13px] font-semibold text-slate-700">ユースケースを追加</p>
            <div className="space-y-2">
              <UseCaseRow>アプリをFacebookログインにリンク</UseCaseRow>
              <Hotspot n={1}><UseCaseRow checked>Threads APIにアクセス</UseCaseRow></Hotspot>
              <UseCaseRow>Instagram APIにアクセス</UseCaseRow>
            </div>
            <div className="flex justify-end">
              <Hotspot n={2}><Btn primary>次へ</Btn></Hotspot>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <>一覧から「<span className="font-medium text-slate-800">Threads APIにアクセス</span>」<b>だけ</b>にチェックを入れる</>,
            <>「次へ」をクリック（必要な権限が一括で追加されます）</>,
          ]}
        />

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

        {/* 図：ビジネスステップの警告 */}
        <ConsoleFrame url="developers.facebook.com/apps/creation">
          <div className="space-y-3">
            <WizardSteps current={2} />
            <p className="text-[13px] font-semibold text-slate-700">ビジネスポートフォリオをリンク</p>
            <div
              className="rounded-lg px-3 py-2.5 text-[12px] text-slate-600 leading-relaxed"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <span className="font-medium text-amber-700">⚠ 表示できるビジネスがありません。</span>
              <Hotspot n={1}><span className="text-sky-600 underline px-0.5">ビジネス設定</span></Hotspot>
              でビジネスポートフォリオを作成してください。
            </div>
            <div className="flex justify-end">
              <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-100 text-slate-400">
                次へ
              </span>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <>警告文の中の「<span className="font-medium text-slate-800">ビジネス設定</span>」リンクを開く（「次へ」はグレーのまま押せません）</>,
          ]}
        />

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

        {/* 図：ポートフォリオ作成モーダル */}
        <ConsoleFrame url="business.facebook.com/billing_hub/accounts">
          <div className="max-w-sm mx-auto rounded-xl border border-slate-900/[0.12] shadow-sm bg-white p-4 space-y-2.5">
            <p className="text-[13px] font-semibold text-slate-700">
              ビジネスマネージャでビジネスポートフォリオを作成
            </p>
            <Field label="ビジネスおよびアカウントの名前">Xpresso Lab（特殊文字は使用不可）</Field>
            <Field label="あなたの名前">山田 太郎</Field>
            <Field label="仕事用メールアドレス">you@example.com</Field>
            <div className="flex justify-end pt-1">
              <Hotspot n={1}><Btn primary>送信</Btn></Hotspot>
            </div>
          </div>
        </ConsoleFrame>
        <MockLegend
          items={[
            <>3 項目を入力して「送信」→ 届いた確認メールで認証を完了する</>,
          ]}
        />

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
          以下 3 つの権限が <span className="text-slate-800 font-medium">「テスト準備完了」</span> ステータスになっていることを確認します。
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
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-mono text-[12px]">threads_manage_replies</td>
                <td className="px-3 py-2">ツリー投稿（長文分割時の2件目以降のリプライ連結）</td>
                <td className="px-3 py-2 text-emerald-600">テスト準備完了</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ STEP 1 で「Threads API にアクセス」ユースケースを選択していれば自動で追加されています。
          表示されていない場合は同画面で個別に「追加」してください。
        </Note>

        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <p className="text-[13px] text-amber-700 font-medium mb-1">⚠️ threads_manage_replies を忘れずに</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            この権限が無いと、長文を分割したツリー投稿の<span className="text-slate-800 font-medium">2件目以降が
            「Media Not Found」エラーで投稿できません</span>（1件目だけは成功するため気づきにくい）。
            トークン発行<span className="text-slate-800 font-medium">前</span>に追加されていることを必ず確認してください。
            トークン発行後に権限を追加した場合は、トークンを再発行して Xpresso に登録し直す必要があります。
          </p>
        </div>
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
          <li>Threads の認可ダイアログで <span className="font-mono text-[12px] text-slate-800">threads_basic</span>・<span className="font-mono text-[12px] text-slate-800">threads_content_publish</span>・<span className="font-mono text-[12px] text-slate-800">threads_manage_replies</span> をすべて許可</li>
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
            solution="権限スコープ不足。STEP 3 で threads_basic / threads_content_publish / threads_manage_replies が「テスト準備完了」になっているか確認してください。"
          />
          <ErrorRow
            code="Media Not Found / The media with id ... cannot be found（ツリー投稿の2件目以降だけ失敗）"
            solution="トークンに threads_manage_replies 権限が含まれていません。STEP 3 で権限を追加 → STEP 6 でトークンを再発行（認可ダイアログで3つすべて許可）→ Xpresso のアカウントを「編集」で上書き保存してください。"
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

/* ── 模式図用のローカル部品 ── */

// アプリ作成ウィザードのステップバー（アプリの詳細→ユースケース→ビジネス→要件→概要）
function WizardSteps({ current }: { current: number }) {
  const steps = ['アプリの詳細', 'ユースケース', 'ビジネス', '要件', '概要'];
  return (
    <div className="flex items-center flex-wrap gap-y-1 pb-2.5 border-b border-slate-900/[0.08]">
      {steps.map((label, i) => (
        <span key={label} className="inline-flex items-center">
          {i > 0 && <span className="text-slate-300 text-[10px] mx-1">›</span>}
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              i === current ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                i < current
                  ? 'bg-emerald-500 text-white'
                  : i === current
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </span>
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}

// ユースケース選択行（チェックボックス付き）
function UseCaseRow({ checked = false, children }: { checked?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${
        checked ? 'border-blue-500/50 bg-blue-500/[0.04]' : 'border-slate-900/[0.1]'
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center text-[9px] font-bold ${
          checked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span className={`text-[12px] ${checked ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
        {children}
      </span>
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
