import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, Settings, Key, UserPlus, CheckCircle2, AlertTriangle, ShieldCheck, Send, Image as ImageIcon,
} from 'lucide-react';

const XPRESSO_ORIGIN = 'https://xpresso-chi.vercel.app';

export default function InstagramAccountGuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="Instagram アカウント登録方法"
        subtitle="Meta for Developers でアプリを作成し、Instagram の Long-lived アクセストークンを Xpresso に登録する手順"
      />

      {/* 戻るリンク */}
      <Link
        href="/x-accounts"
        className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft size={12} /> アカウント管理に戻る
      </Link>

      {/* 重要な前提 */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)' }}
      >
        <p className="text-[13px] text-pink-200 font-medium mb-1">公式 API（Instagram Graph API）のみを使用します</p>
        <p className="text-[12px] text-slate-600 leading-relaxed">
          Xpresso の Instagram 連携は Meta 公式の <span className="text-slate-800 font-medium">Instagram API with Instagram Login</span>（<span className="font-mono text-[12px]">graph.instagram.com</span>）だけを使います。
          ログイン情報（ID / パスワード）を直接扱う非公式な自動化は行いません。アカウント保護の観点から、必ず本手順の公式トークン方式で連携してください。
        </p>
      </div>

      {/* 事前準備 */}
      <GuideSection
        icon={ShieldCheck}
        iconColor="#f59e0b"
        title="事前準備：プロアカウント + Meta for Developers"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          Instagram への投稿 API は <span className="text-slate-800 font-medium">プロアカウント（ビジネス / クリエイター）</span>でのみ利用できます。
          まず連携したい Instagram アカウントをプロアカウントに切り替えてください。
        </p>
        <OrderedList>
          <li>Instagram アプリ →「設定とプライバシー」→「アカウントの種類とツール」→「プロアカウントに切り替える」を実行</li>
          <li>
            <ExtLink href="https://developers.facebook.com/">developers.facebook.com</ExtLink> に Facebook アカウントでログインし、開発者登録（電話番号・メール認証）を完了
          </li>
        </OrderedList>
        <Note>
          ※ 開発者アカウントが恒久的に制限されている場合は、利用可能な別名義の Meta 開発者アカウントでアプリを作成してください（Threads 連携で使用したアプリに Instagram 権限を追加する形でも構いません）。
        </Note>
      </GuideSection>

      {/* STEP 1 */}
      <GuideSection step={1} icon={Settings} iconColor="#7c3aed" title="Meta for Developers でアプリを用意する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          新規にアプリを作るか、Threads 連携で作成済みのアプリをそのまま使います。
        </p>
        <OrderedList>
          <li>
            <ExtLink href="https://developers.facebook.com/apps/">developers.facebook.com/apps</ExtLink> を開く
          </li>
          <li>新規の場合は「アプリを作成」→ ユースケースで <span className="text-slate-800 font-medium">「Instagram API のアクセスを許可する」</span> を選択</li>
          <li>アプリの表示名（例: <span className="font-mono text-[12px] text-slate-700">Xpresso</span>）・連絡先メールアドレスを入力して作成</li>
        </OrderedList>
        <Note>
          ※ Threads 用に作成済みのアプリがある場合は、そのアプリの製品一覧に「Instagram」を追加するだけで OK です（アプリを増やす必要はありません）。
        </Note>
      </GuideSection>

      {/* STEP 2 */}
      <GuideSection
        step={2}
        icon={Settings}
        iconColor="#7c3aed"
        title="Instagram の権限スコープを確認する"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          左サイドバー「<span className="text-slate-800 font-medium">Instagram</span>」→「API setup with Instagram login」を開き、
          以下 2 つの権限が利用可能になっていることを確認します。
        </p>

        <div className="rounded-xl overflow-hidden border border-slate-900/10 mt-3">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">スコープ</th>
                <th className="px-3 py-2 text-left font-medium">用途</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-900/10">
                <td className="px-3 py-2 font-mono text-[12px]">instagram_business_basic</td>
                <td className="px-3 py-2">プロフィール（@ユーザー名・アイコン）の読み取り</td>
              </tr>
              <tr className="border-t border-slate-900/10 bg-slate-900/[0.02]">
                <td className="px-3 py-2 font-mono text-[12px]">instagram_business_content_publish</td>
                <td className="px-3 py-2">フィードへの画像投稿（公開）</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ これらは Instagram プロダクトを追加すると自動で候補に入ります。表示されない場合は同画面で個別に追加してください。
        </Note>
      </GuideSection>

      {/* STEP 3 */}
      <GuideSection
        step={3}
        icon={Settings}
        iconColor="#db2777"
        title="OAuth リダイレクト URI を設定する"
      >
        <p className="text-[14px] text-slate-600 leading-relaxed">
          「API setup with Instagram login」→「<span className="text-slate-800 font-medium">Business login settings</span>」を開き、
          <span className="text-slate-800 font-medium"> OAuth redirect URI</span> に以下を入力して保存します。
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
                <td className="px-3 py-2 font-medium">OAuth redirect URI</td>
                <td className="px-3 py-2 font-mono text-[12px] text-pink-600 break-all">
                  {XPRESSO_ORIGIN}/auth/callback
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Note>
          ※ Xpresso はトークン手動コピペ方式のため、この URI は実際には使いませんが、Meta 側のフォーム必須項目です。上記をそのまま入れて構いません。
        </Note>
      </GuideSection>

      {/* STEP 4 */}
      <GuideSection step={4} icon={UserPlus} iconColor="#db2777" title="Instagram テスターを招待する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          アクセストークンを発行するには、対象の Instagram アカウントを
          <span className="text-slate-800 font-medium"> 「Instagram テスター」</span> として登録する必要があります。
          <span className="text-slate-800 font-medium">アプリ作成者本人のアカウントでもこの招待は必要</span> です。
        </p>
        <OrderedList>
          <li>
            左サイドバー <span className="text-slate-800 font-medium">「アプリの役割」→「役割」</span> を開く
          </li>
          <li>「Instagram テスター」を選択し、「メンバーを追加」をクリック</li>
          <li>連携したい Instagram の <span className="font-mono text-[12px] text-slate-800">@ユーザー名</span> を入力 → 送信</li>
        </OrderedList>

        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)' }}
        >
          <p className="text-[13px] text-sky-200 font-medium mb-1">招待の承認場所（通知に来ません）</p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            招待を受けた本人で以下にアクセスして承認してください：
          </p>
          <ol className="list-decimal list-inside text-[12px] text-slate-700 mt-1 space-y-0.5 pl-1">
            <li>Instagram アプリ →「設定とプライバシー」→「ウェブサイトの許可」→「アプリとウェブサイト」を開く</li>
            <li>「テスター招待」タブにアプリ名（例: Xpresso）の招待が表示される</li>
            <li>「承認」をタップ</li>
          </ol>
        </div>
      </GuideSection>

      {/* STEP 5 */}
      <GuideSection step={5} icon={Key} iconColor="#0891b2" title="Long-lived アクセストークンを発行する">
        <p className="text-[14px] text-slate-600 leading-relaxed">
          ふたたび <span className="text-slate-800 font-medium">「Instagram」→「API setup with Instagram login」</span> を開きます。
          <span className="text-slate-800 font-medium">「Generate access token（アクセストークンを生成）」</span> から、
          STEP 4 で承認済みの Instagram アカウント用にトークンを発行できます。
        </p>
        <OrderedList>
          <li>承認済みアカウントの行で「Generate token」をクリック</li>
          <li>Instagram の認可ダイアログで <span className="font-mono text-[12px] text-slate-800">instagram_business_basic</span> と <span className="font-mono text-[12px] text-slate-800">instagram_business_content_publish</span> の両方を許可</li>
          <li>表示された <span className="font-mono text-[12px] text-cyan-600">アクセストークン</span>（<span className="font-mono text-[12px]">IGAA…</span> 形式）をコピー</li>
        </OrderedList>

        <Note>
          ※ このツールから発行されるトークンは <span className="text-slate-800 font-medium">Long-lived（約 60 日有効）</span> です。
          失効前に Xpresso のアカウントカードの 🔄 ボタンで最新化するか、同ツールから再発行 → 上書き登録してください。
        </Note>
      </GuideSection>

      {/* STEP 6 */}
      <GuideSection step={6} icon={UserPlus} iconColor="#7c3aed" title="Xpresso に登録する">
        <OrderedList>
          <li>
            Xpresso の「<Link href="/x-accounts" className="text-sky-600 hover:underline">アカウント管理</Link>」ページを開く
          </li>
          <li>「Instagram アカウントを登録」ボタンをクリック</li>
          <li>
            モーダルで以下を入力して「追加する」
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 pl-3">
              <li>アカウント名（任意・空欄なら Instagram の表示名を自動取得）</li>
              <li>Access Token（STEP 5 でコピーした文字列）</li>
            </ul>
          </li>
        </OrderedList>
      </GuideSection>

      {/* STEP 7 */}
      <GuideSection step={7} icon={CheckCircle2} iconColor="#db2777" title="動作を確認する">
        <OrderedList>
          <li>アカウントカードに Instagram の @ユーザー名・アイコンが表示されれば連携成功</li>
          <li>「ポスト作成」ページの投稿先トグルで「Instagram」を ON</li>
          <li>画像を1枚以上添付し、テスト投稿を実行して Instagram 側に反映されれば完了</li>
        </OrderedList>
        <div
          className="rounded-lg p-3 mt-2 flex items-start gap-2"
          style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)' }}
        >
          <ImageIcon size={14} className="text-pink-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Instagram は <span className="text-slate-800 font-medium">画像が必須</span> です（テキストのみの投稿はできません）。
            1枚は単独投稿、2〜10枚はカルーセル投稿になります。本文はキャプション（最大 2,200 文字）として1投稿にまとめられ、X / Threads のような分割・スレッド化は行いません。
          </p>
        </div>
      </GuideSection>

      {/* よくあるエラー */}
      <div className="neon-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-600" />
          <h2 className="text-[15px] font-semibold text-slate-800">よくあるエラー</h2>
        </div>
        <div className="space-y-3 text-[14px]">
          <ErrorRow
            code="アクセストークン生成画面にアカウントが表示されない"
            solution="Instagram テスターとして招待 → 承認まで完了していません。STEP 4 を確認してください。"
          />
          <ErrorRow
            code="401 invalid_token / トークンが無効です"
            solution="トークン期限切れまたは無効です。STEP 5 から再発行 → Xpresso 側のアカウントを「編集」で上書き保存してください。"
          />
          <ErrorRow
            code="403 forbidden / 権限不足"
            solution="instagram_business_basic と instagram_business_content_publish の両方が許可されているか確認してください（STEP 2 / STEP 5）。"
          />
          <ErrorRow
            code="投稿時に画像が必須というエラーになる"
            solution="Instagram はテキストのみ投稿できません。ポスト作成画面で画像を1枚以上添付してください。"
          />
          <ErrorRow
            code="プロアカウントではないため利用できない"
            solution="Instagram アカウントをビジネス / クリエイター（プロアカウント）に切り替えてください（事前準備を参照）。"
          />
        </div>
      </div>

      {/* 最後の補足 */}
      <div className="rounded-xl p-4 mt-4 flex items-center gap-3" style={{ background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.15)' }}>
        <Send size={16} style={{ color: '#db2777' }} />
        <p className="text-[13px] text-slate-600 leading-relaxed">
          登録が完了したら「<Link href="/post-create" className="text-sky-600 hover:underline">ポスト作成</Link>」ページで投稿先トグルから Instagram を選び、画像付きでテスト投稿してみましょう。
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
