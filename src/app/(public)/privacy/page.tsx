import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Xpresso',
  description:
    'Xpresso のプライバシーポリシー。取得する情報・利用目的・第三者提供・外部サービス連携・データの保存と削除について。',
};

const CONTACT_EMAIL = 'xpresso@mntside.net';
const LAST_UPDATED = '2026年6月23日';

/**
 * 公開ページ（ログイン不要）。
 * Meta / X の API 審査で必須の「Privacy Policy URL」に登録する独立ページ。
 * データ削除手順・お問い合わせ先は /support にも記載し相互リンクする。
 * proxy.ts の合言葉ゲート対象外（公開アクセス可）にしてある。
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-12 flex justify-center">
      <main
        className="w-full max-w-2xl rounded-3xl p-8 md:p-10"
        style={{
          background: '#f8fafc',
          border: '1px solid rgba(15,23,42,0.09)',
          boxShadow: '0 8px 40px rgba(15,23,42,0.08)',
        }}
      >
        {/* ── ヘッダー ── */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl select-none shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ec4899, #a78bfa)',
              boxShadow: '0 0 18px rgba(236,72,153,0.4)',
            }}
          >
            🔥
          </div>
          <div>
            <h1
              className="text-2xl font-bold leading-none"
              style={{
                background: 'linear-gradient(90deg, #fbbf24, #f472b6, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Xpresso
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">プライバシーポリシー</p>
          </div>
        </div>

        <p className="text-[13px] text-slate-500 mb-8">最終更新日: {LAST_UPDATED}</p>

        {/* ── はじめに ── */}
        <Section title="はじめに">
          <p>
            Xpresso（以下「本サービス」）は、X（旧 Twitter）・Threads・Instagram への投稿の作成・予約・
            管理を支援する Web ツールです。本ポリシーは、本サービスが取得する情報と、その利用・管理・
            削除の方法について定めます。本サービスを利用することで、本ポリシーに同意したものとみなします。
          </p>
        </Section>

        {/* ── 取得する情報 ── */}
        <Section title="取得する情報">
          <p>本サービスは、機能の提供のために以下の情報を取得・保存します。</p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5 text-slate-600">
            <li>ログイン用の認証情報（Google アカウントのメールアドレス・表示名・プロフィール画像）</li>
            <li>
              利用者ご本人が連携した各 SNS（X / Threads / Instagram）のアクセストークン
              <span className="text-slate-500">（暗号化して保存します）</span>
            </li>
            <li>連携アカウントの公開プロフィール情報（表示名・ユーザー名・アイコン）</li>
            <li>本サービス上で作成した投稿内容・予約情報・投稿履歴</li>
            <li>公開済み投稿の公開指標（インプレッション・いいね数など、各 SNS の API から取得）</li>
            <li>
              AI 生成機能で用いる外部 AI サービスの API キー
              <span className="text-slate-500">（暗号化して保存します）</span>
            </li>
          </ul>
        </Section>

        {/* ── 利用目的 ── */}
        <Section title="情報の利用目的">
          <p>取得した情報は、以下の目的にのみ利用します。</p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5 text-slate-600">
            <li>利用者ご本人へのサービス提供（投稿の作成・予約・代理投稿・管理）</li>
            <li>連携アカウントの識別・表示、および投稿先の選択</li>
            <li>公開指標の集計・ダッシュボードでの表示</li>
            <li>不具合対応・お問い合わせへの回答</li>
          </ul>
          <p className="mt-3">
            これらの情報を、本人の同意なく目的外で利用すること、第三者へ販売・提供することはありません。
          </p>
        </Section>

        {/* ── 第三者提供・外部サービス ── */}
        <Section title="外部サービスとの連携">
          <p>
            本サービスは、機能の提供のために以下の外部サービスと連携します。各サービスへ送信される情報は、
            その機能の実行に必要な範囲に限られます。
          </p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5 text-slate-600">
            <li>
              <strong className="text-slate-700">Google</strong>: ログイン認証のため
            </li>
            <li>
              <strong className="text-slate-700">X（X Corp.）</strong>: X への投稿・指標取得のため
            </li>
            <li>
              <strong className="text-slate-700">Meta（Threads / Instagram）</strong>:
              Threads・Instagram への投稿のため
            </li>
            <li>
              <strong className="text-slate-700">AI 生成サービス（Google Gemini / Anthropic）</strong>:
              投稿文・画像の生成のため。利用者ご自身が登録した API キーを用います
            </li>
            <li>
              <strong className="text-slate-700">Supabase / Vercel</strong>:
              データベース・認証基盤・ホスティングのため
            </li>
          </ul>
          <p className="mt-3">
            各 SNS への投稿は、利用者ご本人が公式 API 経由で連携・許可したアカウントに対してのみ行われます。
          </p>
        </Section>

        {/* ── データの保存・セキュリティ ── */}
        <Section title="データの保存とセキュリティ">
          <p>
            アクセストークンおよび AI の API キーは暗号化して保存します。データは、サービス提供に必要な
            期間に限り保管し、利用者からの削除依頼または連携解除に応じて速やかに削除します。
          </p>
        </Section>

        {/* ── データの削除 ── */}
        <Section title="データの削除・連携解除">
          <p>保存されたデータは、いつでも削除・解除できます。</p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5 text-slate-600">
            <li>
              SNS 連携の解除（トークンの削除）は、アプリ内の「アカウント管理」から行えます。
            </li>
            <li>
              アカウント全体および保存データの削除をご希望の場合は、{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline" style={{ color: '#7c3aed' }}>
                {CONTACT_EMAIL}
              </a>{' '}
              までご依頼ください。確認のうえ速やかに削除します。
            </li>
          </ul>
          <p className="mt-3 text-[13px] text-slate-500">
            削除方法の詳細は{' '}
            <Link href="/support" className="underline" style={{ color: '#7c3aed' }}>
              サポートページ
            </Link>{' '}
            にも記載しています。
          </p>
        </Section>

        {/* ── お問い合わせ ── */}
        <Section title="お問い合わせ">
          <p>
            本ポリシーに関するお問い合わせ・データ削除のご依頼は、以下までご連絡ください。
          </p>
          <p className="mt-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center font-semibold text-[15px] px-4 py-2.5 rounded-xl transition-colors"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
                color: '#7c3aed',
              }}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        {/* ── 改定 ── */}
        <Section title="本ポリシーの改定">
          <p>
            本サービスは、必要に応じて本ポリシーを改定することがあります。重要な変更がある場合は、
            本ページ上で告知します。
          </p>
        </Section>

        {/* ── 戻る ── */}
        <div className="mt-8 pt-6 border-t border-slate-900/[0.08] flex gap-4">
          <Link href="/support" className="text-[14px] underline" style={{ color: '#64748b' }}>
            サポート・お問い合わせ
          </Link>
          <Link href="/login" className="text-[14px] underline" style={{ color: '#64748b' }}>
            ログインへ戻る →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-[16px] font-semibold text-slate-800 mb-2">{title}</h2>
      <div className="text-[14px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
