import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft, ShieldCheck, ShieldAlert, TrendingDown, MessageSquare, Sparkles,
  AlertTriangle, BookOpenCheck, Gauge, LinkIcon, FileWarning,
} from 'lucide-react';

export default function PostingGuidelinesPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Header
        title="投稿ガイドライン / BAN 回避"
        subtitle="X / Threads / Instagram 自動投稿で凍結されないための運用ルール（2026 年 5 月時点の調査ベース）"
      />

      <Link
        href="/guide"
        className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-300 transition-colors mb-6"
      >
        <ArrowLeft size={12} /> 使い方ガイドに戻る
      </Link>

      {/* ── イントロ ─────────────────────────────── */}
      <section
        className="rounded-2xl p-5 mb-6 flex items-start gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.06))',
          border: '1px solid rgba(239,68,68,0.18)',
        }}
      >
        <ShieldAlert size={20} className="text-rose-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-semibold text-slate-100 mb-1">
            自動投稿ツールは BAN 1 件で全資産が消える
          </p>
          <p className="text-[12px] text-slate-400 leading-relaxed">
            アカウント・投稿履歴・トークン・API クォータが一括失効するため、規約遵守を最優先で運用してください。
            Xpresso は公式 API のみを使用するため最大のリスクは回避済みですが、運用側の振る舞いで凍結に至るケースは残ります。
          </p>
        </div>
      </section>

      {/* ── 絶対 NG リスト ─────────────────────── */}
      <Section icon={ShieldAlert} iconColor="#ef4444" title="絶対にやらないこと（両プラットフォーム共通）">
        <div className="rounded-xl overflow-hidden border border-white/10">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">NG 行為</th>
                <th className="px-3 py-2 text-left font-medium">根拠</th>
                <th className="px-3 py-2 text-left font-medium">罰則</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <NGRow
                act="Selenium / Playwright / Puppeteer でログイン投稿"
                src="X Developer Policy / Meta Platform Policy"
                penalty="永久凍結。2026-03 X ban wave で大量摘発"
              />
              <NGRow alt act="同一文面を複数アカウントに横展開" src="X Automation Rules / Meta CIB 条項" penalty="スパム認定 → shadowban → 凍結" />
              <NGRow act="非公式 pip（agent-twitter-client / threads-api 非公式版）依存" src="TOS 違反" penalty="ban wave で実装が一夜で失効" />
              <NGRow alt act="AI 生成プロフィール画像の使い回し" src="X Authenticity Policy / Meta" penalty="関連アカウント削除" />
              <NGRow act="同意なき自動 DM / 自動リプライ" src="X Automation Rules" penalty="API 停止" />
              <NGRow alt act="「人間が画面をタップしていない」全自動・無人運用" src="X プロダクト責任者 Nikita Bier が 2026-02 明言" penalty="関連アカウントごと一括凍結" />
            </tbody>
          </table>
        </div>

        <Note color="rose">
          Xpresso はブラウザ自動化・非公式 SDK を一切使用していません。残るのは <span className="text-slate-200 font-medium">運用側のリスク</span> です。
        </Note>
      </Section>

      {/* ── X の現実 ──────────────────────────── */}
      <Section icon={TrendingDown} iconColor="#60a5fa" title="X 側の現実（2026 年）">
        <ul className="space-y-2 text-[13px] text-slate-300">
          <Bullet>
            公式 API + OAuth + <span className="text-slate-100 font-medium">1 日 100 投稿以内</span> なら shadowban 対象外
          </Bullet>
          <Bullet>
            新規開発者は <span className="text-slate-100 font-medium">Pay-Per-Use 強制</span>：書込 $0.015/件、URL 含有 $0.20/件（2026-04 改定）
          </Bullet>
          <Bullet>
            旧 Basic ($200/月, 3,000 投稿) は既存ユーザーのみ継続。新規受付終了
          </Bullet>
        </ul>

        <div className="rounded-xl overflow-hidden border border-white/10 mt-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">リーチ減衰要因</th>
                <th className="px-3 py-2 text-left font-medium w-32">影響</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">外部リンクを本文に含める</td>
                <td className="px-3 py-2 text-amber-300 font-mono">−30〜50%</td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2">ハッシュタグの多用</td>
                <td className="px-3 py-2 text-amber-300 font-mono">−40%</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">スパム通報 1 件</td>
                <td className="px-3 py-2 text-rose-300 font-mono">−369x（実質配信停止）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 推奨フロー ──────────────────────── */}
      <Section icon={MessageSquare} iconColor="#34d399" title="推奨：「最初のコメント」にリンクを置く">
        <p className="text-[13px] text-slate-400 leading-relaxed">
          外部リンクは投稿本文に直接書かず、<span className="text-slate-200 font-medium">スレッドの 2 件目（リプライ）として送る</span> のがリーチ減衰を回避する定番テクニックです。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div
            className="rounded-xl p-3.5"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <p className="text-[11px] font-semibold text-rose-300 mb-2 flex items-center gap-1.5">
              <LinkIcon size={12} /> 悪い例（−30〜50%）
            </p>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              「新しいツールを作りました ✨<br />
              https://example.com/my-tool 是非どうぞ」
            </p>
          </div>
          <div
            className="rounded-xl p-3.5"
            style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)' }}
          >
            <p className="text-[11px] font-semibold text-emerald-300 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} /> 良い例（リーチ減なし）
            </p>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              本文: 「新しいツールを作りました ✨ 詳細はリプ欄に👇」<br />
              <span className="text-slate-500 text-[10px]">↓ リプライ（スレッド 2 件目）</span><br />
              「https://example.com/my-tool」
            </p>
          </div>
        </div>
        <Note>
          Xpresso の「ポスト作成」ページで <span className="text-slate-200 font-medium">スレッド（リプ連結）</span> モードを使えばこの形を簡単に作れます。
        </Note>
      </Section>

      {/* ── Threads の現実 ───────────────────── */}
      <Section icon={ShieldCheck} iconColor="#c084fc" title="Threads 側の現実（緩い・無料）">
        <ul className="space-y-2 text-[13px] text-slate-300">
          <Bullet>
            API は <span className="text-slate-100 font-medium">完全無料</span>。1 プロファイル <span className="text-slate-100 font-medium">250 投稿/24h</span>・返信 <span className="text-slate-100 font-medium">1,000/24h</span>
          </Bullet>
          <Bullet>
            テキスト上限 <span className="text-slate-100 font-medium">500 文字</span>、メディアは公開アクセス可能な URL 必須
          </Bullet>
          <Bullet>
            「API だから降格」は <span className="text-slate-100 font-medium">公式・実測ともに根拠なし</span>。差はあっても API/ネイティブで 10% 程度
          </Bullet>
          <Bullet>
            支配的要因は <span className="text-slate-100 font-medium">投稿直後 30 分のエンゲージメント速度と返信の深さ</span>
          </Bullet>
        </ul>
        <Note>
          → 予約投稿で「自分が反応できる時間」に投稿時刻を合わせるのが Threads では特に効きます。
        </Note>
      </Section>

      {/* ── ソフトリミット ────────────────────── */}
      <Section icon={Gauge} iconColor="#f59e0b" title="1 日の投稿数ソフトリミット">
        <div className="rounded-xl overflow-hidden border border-white/10">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-slate-500">
                <th className="px-3 py-2 text-left font-medium w-32">プラットフォーム</th>
                <th className="px-3 py-2 text-left font-medium">推奨上限</th>
                <th className="px-3 py-2 text-left font-medium">根拠</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-semibold">X</td>
                <td className="px-3 py-2 text-amber-300 font-mono">100 投稿 / 日</td>
                <td className="px-3 py-2">これを超えると shadowban 検知対象に入りやすい</td>
              </tr>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-3 py-2 font-semibold">Threads</td>
                <td className="px-3 py-2 text-amber-300 font-mono">250 投稿 / 24h</td>
                <td className="px-3 py-2">Meta 公式の API ハードリミット</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2 font-semibold">Instagram</td>
                <td className="px-3 py-2 text-amber-300 font-mono">25 投稿 / 24h</td>
                <td className="px-3 py-2">Meta 公式のコンテンツ公開 API 上限（content publishing limit）</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          Xpresso の「ポスト作成」ページに本日の投稿数カウンタが表示されます。上限が近づくと警告が出ます。
        </Note>
      </Section>

      {/* ── EU AI Act ───────────────────────── */}
      <Section icon={FileWarning} iconColor="#a78bfa" title="EU AI Act Article 50（2026-08 施行）">
        <p className="text-[13px] text-slate-400 leading-relaxed">
          2026 年 8 月 2 日から、AI 生成テキスト・画像・音声・動画は以下 2 層の表示義務が課されます。違反責任は投稿主体に及びます。
        </p>
        <ul className="space-y-2 text-[13px] text-slate-300">
          <Bullet>① <span className="text-slate-100 font-medium">視覚的開示</span>: 投稿に「AI 生成」と分かるラベルを付与</Bullet>
          <Bullet>② <span className="text-slate-100 font-medium">機械可読メタデータ</span>: C2PA 等の標準形式</Bullet>
        </ul>
        <Note color="amber">
          Xpresso では AI で生成・リライトしたテキストに「AI 下書き」フラグを自動付与し、投稿時に視覚ラベルとメタデータを付ける機能を順次実装予定です。
        </Note>
      </Section>

      {/* ── ベストプラクティス ─────────────── */}
      <Section icon={Sparkles} iconColor="#22d3ee" title="運用ベストプラクティス（凍結回避＋伸び）">
        <ul className="space-y-2 text-[13px] text-slate-300">
          <Bullet>
            <span className="text-slate-100 font-medium">毎日同じ時間帯に投稿</span>。アルゴリズムは継続性を評価します
          </Bullet>
          <Bullet>
            <span className="text-slate-100 font-medium">投稿前に自分で軽く読み直す</span>。完全無人運用は X ban wave の主要ターゲット
          </Bullet>
          <Bullet>
            <span className="text-slate-100 font-medium">同じ文章を複数アカウントで使わない</span>。Xpresso が重複検知警告を出します
          </Bullet>
          <Bullet>
            <span className="text-slate-100 font-medium">AI 生成プロフィール画像を使わない</span>。実在感のあるアイコンを 1 つ用意
          </Bullet>
          <Bullet>
            <span className="text-slate-100 font-medium">通報されないこと</span> が最大の防御策。煽り投稿・規約スレスレの表現は避ける
          </Bullet>
        </ul>
      </Section>

      {/* ── 出典 ────────────────────────────── */}
      <Section icon={BookOpenCheck} iconColor="#94a3b8" title="出典（2026-05 調査）">
        <ul className="space-y-1.5 text-[12px] text-slate-400 list-disc list-inside">
          <li>X Developer Agreement and Policy / X Automation Rules</li>
          <li>X (Twitter) API Pricing 2026（複数ソース）/ X Suspension Wave 2026</li>
          <li>Threads API Get Started (Meta for Developers) / Meta Automated Bans 2026</li>
          <li>Threads Algorithm Explained 2026（Mosseri, Buffer, Metricool 各社）</li>
          <li>EU AI Act Article 50 / EU Code of Practice on AI-generated content</li>
        </ul>
      </Section>

      {/* ── 戻る ───────────────────────────── */}
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/guide"
          className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={12} /> 使い方ガイドに戻る
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */

function Section({
  icon: Icon, iconColor, title, children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="neon-card p-6 mb-4">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon size={16} style={{ color: iconColor }} />
        <h2 className="text-[14px] font-semibold text-slate-200">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function NGRow({ act, src, penalty, alt }: { act: string; src: string; penalty: string; alt?: boolean }) {
  return (
    <tr className={`border-t border-white/10 ${alt ? 'bg-white/[0.02]' : ''}`}>
      <td className="px-3 py-2.5 font-medium">
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-rose-300 shrink-0" />
          {act}
        </span>
      </td>
      <td className="px-3 py-2.5 text-slate-500">{src}</td>
      <td className="px-3 py-2.5 text-rose-300">{penalty}</td>
    </tr>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-relaxed">
      <span className="text-neon-cyan mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Note({ children, color = 'slate' }: { children: React.ReactNode; color?: 'slate' | 'amber' | 'rose' }) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    slate: { bg: 'rgba(255,255,255,0.02)',  border: 'rgba(255,255,255,0.06)',  text: '#94a3b8' },
    amber: { bg: 'rgba(245,158,11,0.05)',   border: 'rgba(245,158,11,0.2)',    text: '#fbbf24' },
    rose:  { bg: 'rgba(239,68,68,0.04)',    border: 'rgba(239,68,68,0.15)',    text: '#fda4af' },
  };
  const s = styles[color];
  return (
    <p
      className="text-[11px] leading-relaxed px-3 py-2 rounded-lg"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {children}
    </p>
  );
}
