/**
 * AI プロバイダのメタ情報（UI表示用）。
 * 「登録すると何が使えるようになるか」を機能リストで明示する。
 */

export type AIProvider = 'gemini' | 'anthropic';

export interface ProviderMeta {
  /** プロバイダ名（API名） */
  label:        string;
  /** 役割を表す短いバッジ文言（例：「必須・全機能」） */
  roleLabel:    string;
  /** バッジ色（hex） */
  roleColor:    string;
  /** 説明（補助文） */
  desc:         string;
  /** 登録すると使える機能（チェック表示用） */
  features:     string[];
  /** Gemini を超える機能（このプロバイダ独自）— 表示で強調 */
  exclusive?:   string[];
  /** 課金体系の補足 */
  pricing:      string;
}

export const PROVIDER_META: Record<AIProvider, ProviderMeta> = {
  gemini: {
    label:     'Gemini API',
    roleLabel: '必須・全機能',
    roleColor: '#34d399',
    desc:      '画像系・テキスト系の両方を担うメインAI。Gemini 2.5-flash / Imagen 4 / Nano Banana を使用。',
    features:  [
      '投稿生成',
      'リライト',
      'ハッシュタグ提案',
      'サムネ画像生成（Imagen 4）',
      'サムネ画像合成（アップロード合成）',
      'おまかせフォント推奨',
    ],
    exclusive: [
      'サムネ画像生成（Imagen 4）',
      'サムネ画像合成（アップロード合成）',
      'おまかせフォント推奨',
    ],
    pricing:   'テキストは無料枠あり / 画像系は従量課金（Imagen 4 Fast $0.02・Standard $0.04 / 枚）',
  },
  anthropic: {
    label:     'Anthropic API',
    roleLabel: 'テキスト拡張',
    roleColor: '#f59e0b',
    desc:      'テキスト生成・リライトの高品質オプション。Claude Haiku 4.5 を使用。',
    features:  [
      '投稿生成（高品質オプション）',
      'リライト（高品質オプション）',
      'ハッシュタグ提案（高品質オプション）',
    ],
    pricing:   '従量課金（無料枠なし）',
  },
};

/** 切替UI（設定モーダル・各ページ）向けの簡易バッジ */
export interface ProviderBadge {
  label:      string;
  badge:      string;
  badgeColor: string;
}

export function providerBadge(provider: AIProvider): ProviderBadge {
  const m = PROVIDER_META[provider];
  return {
    label:      m.label,
    badge:      m.roleLabel,
    badgeColor: m.roleColor,
  };
}
