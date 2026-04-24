import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ExternalLink, Sparkles, Zap, Key, CreditCard, AlertTriangle, CheckCircle2,
} from 'lucide-react';

export default function AIKeysGuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="AI API キー 登録マニュアル"
        subtitle="Gemini / Anthropic の API キーを発行して Xpresso に登録する手順"
      />

      <Link
        href="/ai-keys"
        className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-300 transition-colors mb-6"
      >
        <ArrowLeft size={12} /> AI API キー管理に戻る
      </Link>

      {/* 概要 */}
      <GuideSection icon={Key} iconColor="#60a5fa" title="はじめに">
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Xpresso の <span className="text-slate-200 font-medium">投稿生成</span> と <span className="text-slate-200 font-medium">リライト</span> 機能は、各ユーザーが自身で発行した API キーを使う
          <span className="text-slate-200 font-medium"> BYOK 方式</span> です。
          利用料金は各プロバイダから直接ご本人に請求されます。
        </p>
        <p className="text-[13px] text-slate-400 leading-relaxed">
          どちらか一方のみ登録でも構いません。基本は無料枠がある
          <span className="text-slate-200 font-medium"> Gemini </span>を推奨します。
        </p>
        <KeyRequiredFeatures />
      </GuideSection>

      {/* Gemini セクション */}
      <SectionDivider label="Gemini API（無料枠あり・推奨）" color="#34d399" />

      <GuideSection step={1} icon={CreditCard} iconColor="#34d399" title="Google AI Studio にアクセス">
        <OrderedList>
          <li>
            <ExtLink href="https://aistudio.google.com/apikey">aistudio.google.com/apikey</ExtLink> を開く
          </li>
          <li>Google アカウントでログイン（まだの場合）</li>
          <li>利用規約に同意</li>
        </OrderedList>
      </GuideSection>

      <GuideSection step={2} icon={Key} iconColor="#34d399" title="API キーを発行">
        <OrderedList>
          <li>「Create API key（API キーを作成）」ボタンをクリック</li>
          <li>Google Cloud プロジェクトを選択（既存があればそれを、無ければ新規作成）</li>
          <li>表示された API キー（<code className="text-emerald-300 font-mono text-[12px]">AIza...</code> で始まる文字列）をコピー</li>
        </OrderedList>
        <Note>
          ※ キーは発行後いつでも管理画面で確認できます。
        </Note>
      </GuideSection>

      <GuideSection step={3} icon={CheckCircle2} iconColor="#34d399" title="Xpresso に登録">
        <OrderedList>
          <li>
            Xpresso の「<Link href="/ai-keys" className="text-sky-300 hover:underline">AI API キー</Link>」ページを開く
          </li>
          <li>Gemini API カードの「API キーを登録」をクリック</li>
          <li>コピーしたキーを貼り付けて「登録する」</li>
          <li>緑の「検証成功」が出れば完了</li>
        </OrderedList>
      </GuideSection>

      <GuideSection icon={AlertTriangle} iconColor="#f59e0b" title="Gemini の無料枠について">
        <p className="text-[13px] text-slate-400 leading-relaxed">
          無料枠は <span className="text-slate-200 font-medium">1 分あたりのリクエスト数・1 日あたりのリクエスト数</span> が上限で、
          超えると一時的に生成がブロックされます。個人利用の範囲なら通常は無料で収まりますが、
          大量生成する場合は Google Cloud 課金の有効化をご検討ください。
        </p>
      </GuideSection>

      {/* Anthropic セクション */}
      <SectionDivider label="Anthropic API（有料・高品質）" color="#f59e0b" />

      <GuideSection step={1} icon={CreditCard} iconColor="#f59e0b" title="Anthropic Console にアクセス">
        <OrderedList>
          <li>
            <ExtLink href="https://console.anthropic.com/">console.anthropic.com</ExtLink> を開く
          </li>
          <li>アカウントを作成 or ログイン</li>
          <li>
            「Plans &amp; Billing」から<span className="text-slate-200 font-medium">クレジットを購入</span>
            （最低 $5 から）
          </li>
        </OrderedList>
        <Note>
          ※ Anthropic は事前課金制です。クレジットなしで API キーを発行してもすぐ 401 / 402 になります。
        </Note>
      </GuideSection>

      <GuideSection step={2} icon={Key} iconColor="#f59e0b" title="API キーを発行">
        <OrderedList>
          <li>左サイドバー「API Keys」を開く</li>
          <li>「Create Key」ボタンをクリック</li>
          <li>キー名を入力（例: Xpresso）</li>
          <li>
            表示された API キー（<code className="text-amber-300 font-mono text-[12px]">sk-ant-...</code> で始まる文字列）をコピー
          </li>
        </OrderedList>
        <Note>
          ※ Anthropic のキーは <span className="text-rose-300">発行時 1 回しか表示されません</span>。
          必ずその場で控えてください。失くした場合は削除して再発行となります。
        </Note>
      </GuideSection>

      <GuideSection step={3} icon={CheckCircle2} iconColor="#f59e0b" title="Xpresso に登録">
        <OrderedList>
          <li>
            Xpresso の「<Link href="/ai-keys" className="text-sky-300 hover:underline">AI API キー</Link>」ページを開く
          </li>
          <li>Anthropic API カードの「API キーを登録」をクリック</li>
          <li>コピーしたキーを貼り付けて「登録する」</li>
          <li>緑の「検証成功」が出れば完了</li>
        </OrderedList>
      </GuideSection>

      {/* エラーセクション */}
      <div className="neon-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-400" />
          <h2 className="text-[14px] font-semibold text-slate-200">よくあるエラー</h2>
        </div>
        <div className="space-y-3 text-[13px]">
          <ErrorRow
            code="API キーが無効です"
            solution="キーのコピーミスや、無効化されたキーを登録しようとしている可能性があります。プロバイダのコンソールでキーを再発行し、再度登録してください。"
          />
          <ErrorRow
            code="レート制限に達しました"
            solution="短時間に多く呼び出しすぎています。少し時間を空けて再試行してください。Gemini は無料枠の分/日上限があります。"
          />
          <ErrorRow
            code="401 / 402（Anthropic）"
            solution="クレジット残高が無い、または支払い方法未設定です。Anthropic Console → Billing で確認してください。"
          />
          <ErrorRow
            code="接続タイムアウト"
            solution="ネットワーク障害、またはプロバイダ側の一時的な障害です。時間をおいて再試行してください。"
          />
        </div>
      </div>
    </div>
  );
}

/* ── 共通コンポーネント ── */

function KeyRequiredFeatures() {
  return (
    <div
      className="rounded-xl p-4 mt-2"
      style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)' }}
    >
      <p className="text-[12px] font-semibold text-slate-200 mb-2">キーが必要な機能</p>
      <ul className="space-y-1.5 text-[12px] text-slate-400">
        <li className="flex items-center gap-2">
          <Sparkles size={12} className="text-neon-purple shrink-0" />
          <span>AI 投稿生成（<code className="font-mono text-[11px]">/generate</code>）</span>
        </li>
        <li className="flex items-center gap-2">
          <Zap size={12} className="text-neon-blue shrink-0" />
          <span>リライト・X向け140文字要約（<code className="font-mono text-[11px]">/rewrite</code>）</span>
        </li>
      </ul>
      <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
        ※ ポスト作成・予約投稿・フォロー候補などは AI キー不要で利用できます。
      </p>
    </div>
  );
}

function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${color}40, transparent)` }} />
      <span className="text-[12px] font-semibold px-3 py-1 rounded-lg"
        style={{ color, background: `${color}10`, border: `1px solid ${color}30` }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${color}40, transparent)` }} />
    </div>
  );
}

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
