import { Zap } from 'lucide-react';

interface TokenCostHintProps {
  /** ツールチップに表示する追加説明（省略時は汎用文言） */
  detail?: string;
  className?: string;
}

export function TokenCostHint({
  detail = 'このアクションはあなたが登録した AI API キーを使用し、選択中のプロバイダ（Gemini 無料枠 / Anthropic 有料）のトークンを消費します。課金・クォータはあなたのアカウントに計上されます。',
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
