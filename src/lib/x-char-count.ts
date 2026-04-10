/**
 * X (Twitter) 準拠の文字カウント
 * 全角（CJK・ひらがな・カタカナ等）= 2カウント
 * 半角（ASCII・ラテン文字等）       = 1カウント
 */

/** X が「2カウント」とみなすコードポイント範囲 */
function isDoubleCount(cp: number): boolean {
  return (
    (cp >= 0x1100  && cp <= 0x115F)  ||
    (cp >= 0x2E80  && cp <= 0x303F)  ||
    (cp >= 0x3040  && cp <= 0x33FF)  ||
    (cp >= 0x3400  && cp <= 0x4DBF)  ||
    (cp >= 0x4E00  && cp <= 0xA4CF)  ||
    (cp >= 0xA960  && cp <= 0xA97F)  ||
    (cp >= 0xAC00  && cp <= 0xD7FF)  ||
    (cp >= 0xF900  && cp <= 0xFAFF)  ||
    (cp >= 0xFE10  && cp <= 0xFE1F)  ||
    (cp >= 0xFE30  && cp <= 0xFE6F)  ||
    (cp >= 0xFF00  && cp <= 0xFFEF)  ||
    (cp >= 0x1B000 && cp <= 0x1B0FF) ||
    (cp >= 0x1B100 && cp <= 0x1B12F) ||
    (cp >= 0x20000 && cp <= 0x2A6DF) ||
    (cp >= 0x2A700 && cp <= 0x2CEAF) ||
    (cp >= 0x2CEB0 && cp <= 0x2EBEF) ||
    (cp >= 0x30000 && cp <= 0x3134F)
  );
}

/** X 準拠の文字カウントを返す */
export function countXChars(text: string): number {
  let count = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    count += isDoubleCount(cp) ? 2 : 1;
  }
  return count;
}

// ── プラン定義 ────────────────────────────────────────────────

export type XPlan = 'free' | 'basic' | 'premium' | 'premiumPlus';

/** verified_type + subscription_type から XPlan を判定 */
export function getXPlan(
  verifiedType: string | null | undefined,
  subscriptionType: string | null | undefined,
): XPlan {
  const sub = (subscriptionType ?? '').toLowerCase();
  if (sub === 'basic') return 'basic';
  if (sub === 'premiumplus' || sub === 'premium_plus') return 'premiumPlus';
  if (sub === 'premium') return 'premium';
  // subscriptionType が取れない場合は verifiedType で判定（premium扱い）
  if (verifiedType === 'blue') return 'premium';
  return 'free';
}

/** プランに応じた合計上限カウント */
export function getXLimit(plan: XPlan): number {
  switch (plan) {
    case 'basic':      return 4000;
    case 'premium':    return 25000;
    case 'premiumPlus': return 25000;
    default:           return 280;
  }
}

/** プラン表示名 */
export function getPlanLabel(plan: XPlan): string {
  switch (plan) {
    case 'basic':      return 'ベーシック';
    case 'premium':    return 'プレミアム';
    case 'premiumPlus': return 'プレミアムプラス';
    default:           return '無料';
  }
}

/** プランに応じた本文カウント選択肢（CTA+hashtags分のバッファを引いた値） */
export function getLengthOptions(plan: XPlan): { value: number; label: string; note: string }[] {
  switch (plan) {
    case 'basic':
      return [
        { value: 500,  label: '500cnt（短め）',   note: '≈全角250字' },
        { value: 1500, label: '1,500cnt（標準）', note: '≈全角750字' },
        { value: 3500, label: '3,500cnt（長め）', note: '≈全角1,750字' },
      ];
    case 'premium':
    case 'premiumPlus':
      return [
        { value: 1000,  label: '1,000cnt（短め）',  note: '≈全角500字' },
        { value: 5000,  label: '5,000cnt（標準）',  note: '≈全角2,500字' },
        { value: 20000, label: '20,000cnt（長め）', note: '≈全角10,000字' },
      ];
    default: // free
      return [
        { value: 100, label: '100cnt（短め）', note: '≈全角50字' },
        { value: 160, label: '160cnt（標準）', note: '≈全角80字' },
        { value: 210, label: '210cnt（長め）', note: '≈全角105字' },
      ];
  }
}

/** プランのデフォルト本文カウント（標準選択肢の値） */
export function getDefaultMaxLength(plan: XPlan): number {
  const opts = getLengthOptions(plan);
  return opts[1].value; // 中間の標準を返す
}

/** ツールチップ用の説明文 */
export const X_COUNT_RULE = '全角（ひらがな・漢字・カタカナ等）= 2カウント\n半角（英数字・記号等）= 1カウント\n（X準拠）';
