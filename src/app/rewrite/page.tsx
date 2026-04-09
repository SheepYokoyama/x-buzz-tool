'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { RewriteStyleSelector } from '@/components/rewrite/RewriteStyleSelector';
import { RewriteResultCard } from '@/components/rewrite/RewriteResultCard';
import { Button } from '@/components/ui/Button';
import { Textarea, FieldLabel } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Repeat2, RefreshCw } from 'lucide-react';

const DUMMY_REWRITES: Record<string, string> = {
  shorter:   `AIで毎日投稿。フォロワーが3ヶ月で10倍になった。\n\nツールより「習慣」が大事だと気づいた。`,
  emotional: `もし3ヶ月前の自分に戻れるなら、最初に教えたかった。\n\nAIを使えば、毎日投稿が「5分」でできる。\n\nその積み重ねが、今のフォロワー数をつくった。諦めなくてよかった。`,
  numbered:  `AIでX運用を自動化した結果👇\n\n① 毎朝5分で1週間分の投稿を作成\n② スケジュール設定で自動投稿\n③ 3ヶ月でフォロワー10倍\n\n道具を使えば誰でも再現できます。`,
  hook:      `「今日も投稿ネタが思いつかない…」\n\nその悩み、AIが解決してくれます。\n\n私がやっている毎朝5分の投稿作成術を公開します。`,
  casual:    `ぶっちゃけAI使ってX運用してます笑\n\n毎朝5分だけ。それだけでフォロワーがどんどん増えてる。\n\nやってみる価値、めちゃくちゃありますよ。`,
  authority: `【実績】AIを活用したX運用戦略を3ヶ月実施。\nフォロワー数：×10倍達成。\n\n毎朝5分の投稿生成ルーティンが鍵でした。再現性100%の手法を公開します。`,
};

export default function RewritePage() {
  const [original, setOriginal]   = useState('');
  const [style, setStyle]         = useState('shorter');
  const [result, setResult]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRewrite = async () => {
    if (!original.trim()) return;
    setIsLoading(true);
    setResult('');
    await new Promise((r) => setTimeout(r, 1200));
    setResult(DUMMY_REWRITES[style] ?? DUMMY_REWRITES.shorter);
    setIsLoading(false);
  };

  return (
    <>
      <Header title="リライト" subtitle="既存の投稿をAIでブラッシュアップ" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — Input */}
        <div className="space-y-5">
          <div className="neon-card p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none">元の投稿</h2>
              <p className="section-label mt-1.5">リライトしたい投稿をペーストしてください</p>
            </div>
            <div>
              <FieldLabel>投稿テキスト</FieldLabel>
              <Textarea
                rows={6}
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="リライトしたい投稿文をここに貼り付けてください…"
              />
              <p className="text-[11px] text-slate-600 mt-1.5 text-right">{original.length}文字</p>
            </div>
          </div>

          <div className="neon-card p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-200 leading-none">リライトスタイル</h2>
              <p className="section-label mt-1.5">どのように書き直しますか？</p>
            </div>
            <RewriteStyleSelector selected={style} onChange={setStyle} />
            <Button
              className="w-full justify-center"
              size="lg"
              onClick={handleRewrite}
              disabled={!original.trim() || isLoading}
            >
              {isLoading
                ? <><RefreshCw size={14} className="animate-spin" />リライト中…</>
                : <><Repeat2 size={14} />リライトする</>
              }
            </Button>
          </div>
        </div>

        {/* Right — Result */}
        <div>
          {result ? (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-slate-200">リライト結果</p>
              <RewriteResultCard text={result} label={style} />
            </div>
          ) : (
            <div className="neon-card h-full flex items-center justify-center" style={{ minHeight: 320 }}>
              <EmptyState
                icon={Repeat2}
                title="リライト結果がここに表示されます"
                description="元の投稿を入力してスタイルを選択してください"
                iconColor="#22d3ee"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
