import type { Metadata } from 'next';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export const metadata: Metadata = {
  title: '利用規約 | Xpresso',
  description:
    'Xpresso の利用規約。サービスの利用条件・禁止事項・各SNSの規約遵守・免責事項・規約の変更について。',
};

const CONTACT_EMAIL = 'xpresso@mntside.net';
const LAST_UPDATED = '2026年6月23日';

/**
 * 公開ページ（ログイン不要）。
 * Meta / X の API 審査で「Terms of Service URL」に登録する独立ページ。
 * proxy.ts の合言葉ゲート対象外（公開アクセス可）にしてある。
 */
export default function TermsPage() {
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
          <AppLogo size={44} />
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
            <p className="text-[13px] text-slate-500 mt-1">利用規約</p>
          </div>
        </div>

        <p className="text-[13px] text-slate-500 mb-8">最終更新日: {LAST_UPDATED}</p>

        {/* ── 第1条 適用 ── */}
        <Section title="第1条（適用）">
          <p>
            本規約は、Xpresso（以下「本サービス」）の提供条件および本サービスの利用に関する
            運営者と利用者との間の権利義務関係を定めるものです。利用者は、本サービスを利用することで
            本規約に同意したものとみなします。
          </p>
        </Section>

        {/* ── 第2条 サービス内容 ── */}
        <Section title="第2条（サービス内容）">
          <p>
            本サービスは、X（旧 Twitter）・Threads・Instagram への投稿の作成・予約・管理を支援する
            Web ツールです。各 SNS への投稿は、利用者ご本人が公式 API 経由で連携・許可した
            アカウントに対してのみ行われます。
          </p>
        </Section>

        {/* ── 第3条 アカウントと連携 ── */}
        <Section title="第3条（アカウントと連携）">
          <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
            <li>
              利用者は、本サービスの利用にあたり、自身が正当な権限を持つ SNS アカウントのみを
              連携するものとします。
            </li>
            <li>
              連携に用いるアクセストークン等の認証情報の管理は利用者の責任で行うものとします。
            </li>
            <li>
              本サービスは、各 SNS の公式 API の仕様・ポリシーの範囲内でのみ動作します。
            </li>
          </ul>
        </Section>

        {/* ── 第4条 禁止事項 ── */}
        <Section title="第4条（禁止事項）">
          <p>利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5 text-slate-600">
            <li>各 SNS（X / Meta 等）の利用規約・API ポリシー・自動化に関する規約に違反する行為</li>
            <li>スパム行為、同一・類似内容の過剰な大量投稿、その他のプラットフォームを濫用する行為</li>
            <li>法令または公序良俗に反する内容の投稿・送信</li>
            <li>第三者の権利を侵害する行為、なりすまし行為</li>
            <li>本サービスの運営を妨害する行為、不正アクセス、リバースエンジニアリング</li>
            <li>権限のない他人のアカウントを連携・操作する行為</li>
          </ul>
        </Section>

        {/* ── 第5条 AI生成コンテンツ ── */}
        <Section title="第5条（AI 生成コンテンツ）">
          <p>
            本サービスは AI による投稿文・画像の生成を補助しますが、生成結果の最終的な確認・編集・
            投稿の判断は利用者が行うものとします。生成・投稿された内容に関する責任は利用者が負います。
            各 SNS が AI 生成物の開示を求める場合は、利用者の責任で適切に表示してください。
          </p>
        </Section>

        {/* ── 第6条 免責事項 ── */}
        <Section title="第6条（免責事項）">
          <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
            <li>
              各 SNS の規約違反による利用者アカウントの制限・凍結等について、運営者は責任を負いません。
            </li>
            <li>
              各 SNS の API・仕様変更により、本サービスの機能が予告なく利用できなくなる場合があります。
            </li>
            <li>
              本サービスの利用により利用者または第三者に生じた損害について、運営者は一切の責任を
              負いません。
            </li>
            <li>本サービスは、提供する情報・機能の完全性・正確性・有用性を保証しません。</li>
          </ul>
        </Section>

        {/* ── 第7条 データの取り扱い ── */}
        <Section title="第7条（データの取り扱い）">
          <p>
            利用者の情報の取得・利用・管理・削除については、{' '}
            <Link href="/privacy" className="underline" style={{ color: '#7c3aed' }}>
              プライバシーポリシー
            </Link>{' '}
            に定めるとおりとします。データの削除・連携解除の方法は{' '}
            <Link href="/support" className="underline" style={{ color: '#7c3aed' }}>
              サポートページ
            </Link>{' '}
            をご確認ください。
          </p>
        </Section>

        {/* ── 第8条 規約の変更 ── */}
        <Section title="第8条（規約の変更）">
          <p>
            運営者は、必要に応じて本規約を変更することがあります。重要な変更がある場合は、本ページ上で
            告知します。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。
          </p>
        </Section>

        {/* ── お問い合わせ ── */}
        <Section title="お問い合わせ">
          <p>本規約に関するお問い合わせは、以下までご連絡ください。</p>
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

        {/* ── 戻る ── */}
        <div className="mt-8 pt-6 border-t border-slate-900/[0.08] flex flex-wrap gap-4">
          <Link href="/privacy" className="text-[14px] underline" style={{ color: '#64748b' }}>
            プライバシーポリシー
          </Link>
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
