import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { GuideStepCard } from '@/components/guide/GuideStepCard';
import { GuideTipCard } from '@/components/guide/GuideTipCard';
import { UserCircle, Sparkles, CalendarClock, TrendingUp, ShieldAlert, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    step: 1, color: '#60a5fa', icon: UserCircle,
    title: 'ペルソナを設定する',
    description: '「ペルソナ」ページでキャラクターのトーン・スタイル・キーワードを設定します。AIがこの設定に基づいて投稿文を生成するため、あなたらしい声になります。',
  },
  {
    step: 2, color: '#a78bfa', icon: Sparkles,
    title: 'AI投稿を生成する',
    description: '「AI投稿生成」ページでトピックを選択するだけ。AIが複数のパターンを提案します。気に入ったものをコピーするか、そのまま予約投稿へ送ることができます。',
  },
  {
    step: 3, color: '#22d3ee', icon: CalendarClock,
    title: '予約投稿をセットする',
    description: '「予約投稿」ページで投稿日時を設定します。朝6時・昼12時・夜21時の3タイムスロットが特に効果的です。',
  },
  {
    step: 4, color: '#34d399', icon: TrendingUp,
    title: '結果を分析して改善する',
    description: '「投稿履歴」でいいね・RT・インプレッションを確認します。反応が良かった投稿のパターンをノートに記録してループを回しましょう。',
  },
];

const TIPS = [
  { emoji: '🎯', title: '毎日投稿が最強', body: 'アルゴリズムは継続性を評価します。質より量より「毎日続ける」ことを最優先に。AIを使えば1日5分で運用できます。' },
  { emoji: '📊', title: '数字で話す', body: '「多い」より「3倍」、「早い」より「5分」。具体的な数字を入れるだけでエンゲージメントが上がります。' },
  { emoji: '🔁', title: 'リライトで回す', body: 'バズった投稿は形を変えて再投稿。スタイルを変えるだけで同じネタが何度も使えます。' },
  { emoji: '🧵', title: 'スレッドで深掘り', body: '単発より複数ツイートのスレッドがリーチを3〜5倍にします。バズった後のフォローアップに効果的。' },
  { emoji: '⏰', title: '投稿時間を固定する', body: '朝7時・昼12時・夜21時が黄金タイム。毎日同じ時間に投稿すると読者の習慣に組み込まれます。' },
  { emoji: '💡', title: 'ペルソナを1つに絞る', body: '複数のトピックを発信するより、1つのキャラクターで一貫した発信をする方がフォロワーが増えます。' },
];

export default function GuidePage() {
  return (
    <>
      <Header title="使い方ガイド" subtitle="Xpressoを使いこなすための4ステップ" />

      {/* Hero banner */}
      <div
        className="rounded-[1.375rem] p-6 mb-10"
        style={{
          background: 'linear-gradient(135deg, rgba(96,165,250,0.08), rgba(167,139,250,0.08))',
          border: '1px solid rgba(96,165,250,0.15)',
        }}
      >
        <p className="text-[22px] font-bold text-slate-100 leading-snug mb-2">
          AIで毎日5分、<span className="gradient-text">バズ投稿</span>を量産しよう
        </p>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-xl">
          XpressoはXでバズる投稿をAIで自動生成・管理するツールです。
          ペルソナ設定 → 生成 → 予約 → 分析のサイクルを回すことで、
          フォロワーを継続的に増やすことができます。
        </p>
      </div>

      {/* BAN 回避ガイドへの導線 */}
      <Link
        href="/guide/posting-guidelines"
        className="group rounded-2xl p-5 mb-8 flex items-center gap-4 transition-colors"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.06))',
          border: '1px solid rgba(239,68,68,0.18)',
        }}
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          <ShieldAlert size={18} className="text-rose-300" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-100">投稿ガイドライン / BAN 回避（必読）</p>
          <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
            自動投稿で凍結されないための運用ルール集。1 日上限、外部リンク戦略、EU AI Act 対応、よくある失敗まで網羅
          </p>
        </div>
        <ArrowRight size={16} className="text-slate-500 transition-transform group-hover:translate-x-0.5 shrink-0" />
      </Link>

      {/* Steps */}
      <div className="mb-3">
        <p className="section-label mb-5">はじめかた — 4ステップ</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
        {STEPS.map((s) => <GuideStepCard key={s.step} {...s} />)}
      </div>

      {/* Tips */}
      <div className="mb-3">
        <p className="section-label mb-5">バズるための6つのコツ</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIPS.map((t) => <GuideTipCard key={t.title} {...t} />)}
      </div>
    </>
  );
}
