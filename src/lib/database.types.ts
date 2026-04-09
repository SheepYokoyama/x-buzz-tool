// Supabase の型安全クライアント用スキーマ定義
// `supabase gen types typescript` で自動生成することも可能

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      post_personas: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          avatar: string;
          tone: string;
          style: string;
          keywords?: string[];
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          avatar?: string;
          tone?: string;
          style?: string;
          keywords?: string[];
          description?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      post_ideas: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          persona_id?: string | null;
          title: string;
          content?: string;
          tags?: string[];
          source?: string | null;
          is_used?: boolean;
          is_important?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          persona_id?: string | null;
          title?: string;
          content?: string;
          tags?: string[];
          source?: string | null;
          is_used?: boolean;
          is_important?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_ideas_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'post_personas';
            referencedColumns: ['id'];
          },
        ];
      };

      generated_posts: {
        Row: {
          id: string;
          user_id: string | null;
          persona_id: string | null;
          idea_id: string | null;
          content: string;
          generation_prompt: string | null;
          ai_model: string | null;
          status: 'draft' | 'approved' | 'rejected' | 'published';
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          persona_id?: string | null;
          idea_id?: string | null;
          content: string;
          generation_prompt?: string | null;
          ai_model?: string | null;
          status?: 'draft' | 'approved' | 'rejected' | 'published';
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          persona_id?: string | null;
          idea_id?: string | null;
          content?: string;
          generation_prompt?: string | null;
          ai_model?: string | null;
          status?: 'draft' | 'approved' | 'rejected' | 'published';
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'generated_posts_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'post_personas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'generated_posts_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: false;
            referencedRelation: 'post_ideas';
            referencedColumns: ['id'];
          },
        ];
      };

      scheduled_posts: {
        Row: {
          id: string;
          user_id: string | null;
          generated_post_id: string | null;
          persona_id: string | null;
          content: string;
          tags: string[];
          scheduled_at: string;
          published_at: string | null;
          status: 'scheduled' | 'published' | 'failed' | 'cancelled';
          x_post_id: string | null;
          x_post_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          generated_post_id?: string | null;
          persona_id?: string | null;
          content: string;
          tags?: string[];
          scheduled_at: string;
          published_at?: string | null;
          status?: 'scheduled' | 'published' | 'failed' | 'cancelled';
          x_post_id?: string | null;
          x_post_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          generated_post_id?: string | null;
          persona_id?: string | null;
          content?: string;
          tags?: string[];
          scheduled_at?: string;
          published_at?: string | null;
          status?: 'scheduled' | 'published' | 'failed' | 'cancelled';
          x_post_id?: string | null;
          x_post_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scheduled_posts_generated_post_id_fkey';
            columns: ['generated_post_id'];
            isOneToOne: false;
            referencedRelation: 'generated_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_posts_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'post_personas';
            referencedColumns: ['id'];
          },
        ];
      };

      post_metrics: {
        Row: {
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
        };
        Insert: {
          id?: string;
          scheduled_post_id: string;
          measured_at?: string;
          likes?: number;
          retweets?: number;
          replies?: number;
          impressions?: number;
          bookmarks?: number;
          engagement_rate?: number | null;
          created_at?: string;
        };
        Update: {
          scheduled_post_id?: string;
          measured_at?: string;
          likes?: number;
          retweets?: number;
          replies?: number;
          impressions?: number;
          bookmarks?: number;
          engagement_rate?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'post_metrics_scheduled_post_id_fkey';
            columns: ['scheduled_post_id'];
            isOneToOne: false;
            referencedRelation: 'scheduled_posts';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

    Enums: {
      generated_post_status: 'draft' | 'approved' | 'rejected' | 'published';
      scheduled_post_status: 'scheduled' | 'published' | 'failed' | 'cancelled';
    };

    CompositeTypes: Record<string, never>;
  };
}

// =============================================
// テーブルの Row 型を取り出すユーティリティ
// 例: TableRow<'post_personas'>
// =============================================
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
