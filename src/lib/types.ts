// =============================================
// AI生成機能の入出力型
// =============================================

export type AiProvider = 'gemini' | 'anthropic';

export interface GenerateInput {
  theme: string;           // テーマ（自由入力）
  selectedTopic: string;   // クイックトピック選択
  target: string;          // ターゲット読者
  purpose: string;         // 投稿の目的
  tone: string;            // トーン・スタイル
  maxLength: number;       // 本文文字数目安
  hasCta: boolean;         // CTA有無
  provider: AiProvider;    // 使用するAI API
  xLimit: number;          // 連携アカウントの合計上限cnt（プラン依存）
  personaDescription?: string; // ペルソナの説明（システムプロンプト用）
}

export interface GeneratedPattern {
  titleIdea: string;    // タイトル案
  hook: string;         // 冒頭フック
  body: string;         // 本文（CTAを除く）
  cta: string | null;   // CTA
  hashtags: string[];   // ハッシュタグ
}

export interface GenerateResponse {
  patterns: GeneratedPattern[];
  error?: string;
}

// =============================================
// Enum types（DBのENUMと対応）
// =============================================

export type GeneratedPostStatus = 'draft' | 'approved' | 'rejected' | 'published';
export type ScheduledPostStatus = 'scheduled' | 'published' | 'failed' | 'cancelled';

// =============================================
// DB行型（Supabase から返ってくる生データ）
// =============================================

/** X アカウント（DBから取得・トークンはマスク済み） */
export interface XAccount {
  id: string;
  name: string;
  username: string | null;
  profile_image_url: string | null;
  /** マスク表示用（例: "abcd...wxyz"）。実際のトークンはサーバー側のみ */
  api_key_masked: string;
  api_secret_masked: string;
  access_token_masked: string;
  access_secret_masked: string;
  bearer_token_masked: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostPersona {
  id: string;
  user_id: string | null;
  name: string;
  avatar: string;
  tone: string;
  style: string;
  keywords: string[];
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** フォロー候補のステータス */
export type FollowCandidateStatus = 'pending' | 'followed' | 'skipped' | 'failed';

/** フォロー候補（Follow Hunt 機能） */
export interface FollowCandidate {
  id: string;
  user_id: string;
  persona_id: string;
  x_user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  followers_count: number | null;
  following_count: number | null;
  ff_ratio: number | null;
  last_tweeted_at: string | null;
  matched_keywords: string[];
  sample_tweet_id: string | null;
  sample_tweet_text: string | null;
  status: FollowCandidateStatus;
  created_at: string;
  followed_at: string | null;
}

/** Follow Hunt 機能のユーザー別設定 */
export interface FollowHuntSettings {
  user_id: string;
  banned_words: string[];
  min_ff_ratio: number;
  max_ff_ratio: number;
  min_followers: number;
  max_followers: number;
  active_days: number;
  daily_follow_cap: number;
  /** 1 回の探索で取得する tweets の最大数 (10〜100) */
  max_results: number;
  updated_at: string;
}

export interface PostIdea {
  id: string;
  user_id: string | null;
  persona_id: string | null;
  title: string;
  content: string;
  tags: string[];
  source: string | null;
  is_used: boolean;
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedPost {
  id: string;
  user_id: string | null;
  persona_id: string | null;
  idea_id: string | null;
  content: string;
  generation_prompt: string | null;
  ai_model: string | null;
  status: GeneratedPostStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ScheduledPost {
  id: string;
  user_id: string | null;
  generated_post_id: string | null;
  persona_id: string | null;
  x_account_id: string | null;
  content: string;
  tags: string[];
  scheduled_at: string;
  published_at: string | null;
  status: ScheduledPostStatus;
  x_post_id: string | null;
  x_post_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMetrics {
  id: string;
  scheduled_post_id: string;
  measured_at: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  bookmarks: number;
  engagement_rate: number | null;
  created_at: string;
}

// =============================================
// JOIN 付き拡張型（UI で使いやすい形）
// =============================================

export type ScheduledPostWithPersona = ScheduledPost & {
  persona: Pick<PostPersona, 'id' | 'name' | 'avatar'> | null;
};

export type GeneratedPostWithPersona = GeneratedPost & {
  persona: Pick<PostPersona, 'id' | 'name' | 'avatar'> | null;
};

export type ScheduledPostWithMetrics = ScheduledPost & {
  latest_metrics: PostMetrics | null;
};

// =============================================
// ダッシュボード集計型
// =============================================

export interface DashboardStats {
  totalPosts: number;
  totalLikes: number;
  totalImpressions: number;
  avgEngagementRate: number;
  scheduledCount: number;
  followersGrowth: number;
  /** 先月比（%）。先月データが0件の場合は null */
  changes: {
    totalPosts: number | null;
    totalLikes: number | null;
    totalImpressions: number | null;
    avgEngagementRate: number | null;
  };
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_important: boolean;
  created_at: string;
  updated_at: string;
}
