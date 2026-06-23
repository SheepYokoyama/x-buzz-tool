import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'サポート・お問い合わせ | Xpresso',
  description:
    'Xpresso のお問い合わせ・不具合報告先、データの取り扱い、データ削除方法、免責事項について。',
};

const CONTACT_EMAIL = 'xpresso@mntside.net';

/**
 * 公開ページ（ログイン不要）。
 * 不具合報告・お問い合わせ先のほか、Meta / X の API 審査で求められる
 * 「データの取り扱い」「データ削除方法」「免責事項」を記載する。
 * proxy.ts の合言葉ゲート対象外（公開アクセス可）にしてある。
 */
export default function SupportPage() {
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
            <p className="text-[13px] text-slate-500 mt-1">サポート・お問い合わせ</p>
          </div>
        </div>

        {/* ── サービス概要 ── */}
        <Section title="Xpresso について">
          <p>
            Xpresso は、X（旧 Twitter）・Threads・Instagram への投稿の作成・予約・管理を支援する
            Web ツールです。各 SNS への投稿は、利用者ご本人が公式 API 経由で連携・許可した
            アカウントに対してのみ行われます。
          </p>
        </Section>

        {/* ── お問い合わせ・不具合報告 ── */}
        <Section title="お問い合わせ・不具合報告">
          <p>
            不具合のご報告・ご質問・各種お問い合わせは、以下のメールアドレスまでご連絡ください。
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
          <p className="mt-3 text-[13px] text-slate-500">
            不具合報告の際は、発生日時・操作内容・対象アカウント（@ユーザー名）を添えていただけると
            調査がスムーズです。
          </p>
        </Section>

        {/* ── データの取り扱い ── */}
        <Section title="データの取り扱い">
          <p>本サービスは、機能の提供のために以下の情報を保存・利用します。</p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5 text-slate-600">
            <li>ログイン用の認証情報（Google アカウント）</li>
            <li>
              連携した各 SNS のアクセストークン
              <span className="text-slate-500">（暗号化して保存します）</span>
            </li>
            <li>投稿内容・予約情報・投稿履歴</li>
            <li>
              AI 生成に用いる API キー
              <span className="text-slate-500">（暗号化して保存します）</span>
            </li>
          </ul>
          <p className="mt-3">
            これらの情報は、利用者ご本人へのサービス提供（投稿の作成・予約・代理投稿・管理）の目的に
            限って利用します。第三者への販売は行いません。
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
        </Section>

        {/* ── 免責事項 ── */}
        <Section title="免責事項">
          <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
            <li>
              各 SNS（X / Meta）の利用規約・API ポリシーの範囲内でご利用ください。規約違反による
              アカウントの制限・凍結等について、当方は責任を負いかねます。
            </li>
            <li>
              各 SNS の API・仕様変更により、機能が予告なく利用できなくなる場合があります。
            </li>
            <li>
              本サービスの利用により生じた損害について、当方は一切の責任を負いかねます。
            </li>
          </ul>
        </Section>

        {/* ── 戻る ── */}
        <div className="mt-8 pt-6 border-t border-slate-900/[0.08] flex flex-wrap gap-4">
          <Link href="/privacy" className="text-[14px] underline" style={{ color: '#64748b' }}>
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="text-[14px] underline" style={{ color: '#64748b' }}>
            利用規約
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
