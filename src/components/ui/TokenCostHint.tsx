import { Zap } from 'lucide-react';

interface TokenCostHintProps {
  /** ツールチップに表示する追加説明（省略時は汎用文言） */
  detail?: string;
  className?: string;
}

export function TokenCostHint({
  detail = 'このアクションは AI API のトークンを消費します。設定で選択中のプロバイダ（Gemini 無料 / Anthropic 有料）に応じて課金・クォータが発生します。',
  className = '',
}: TokenCostHintProps) {
  return (
    <span
      role="note"
      title={detail}
      className={`inline-flex items-center gap-1 text-[11px] text-amber-300/80 ${className}`}
    >
      <Zap size={11} className="flex-shrink-0" aria-hidden />
      <span>AIトークンを消費します</span>
    </span>
  );
}
