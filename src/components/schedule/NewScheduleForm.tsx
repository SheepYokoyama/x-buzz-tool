'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea, Input, FieldLabel } from '@/components/ui/Input';
import { Plus, X } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase';
import type { ScheduledPost } from '@/lib/types';

interface Props {
  onAdd: (post: ScheduledPost) => void;
}

export function NewScheduleForm({ onAdd }: Props) {
  const [open, setOpen]           = useState(false);
  const [content, setContent]     = useState('');
  const [date, setDate]           = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim() || !date) return;
    setLoading(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError('認証情報が取得できませんでした。再ログインしてください。');
      return;
    }

    const { data, error: sbError } = await supabase
      .from('scheduled_posts')
      .insert({
        content: content.trim(),
        scheduled_at: new Date(date).toISOString(),
        tags,
        status: 'scheduled',
        user_id: user.id,
      })
      .select()
      .single();

    setLoading(false);

    if (sbError || !data) {
      setError(sbError?.message ?? '保存に失敗しました');
      return;
    }

    onAdd(data as ScheduledPost);
    setContent('');
    setDate('');
    setTagsInput('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl transition-all text-[13px] text-slate-600 hover:text-slate-400"
        style={{
          border: '2px dashed rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        <Plus size={15} />
        新しい予約投稿を追加
      </button>
    );
  }

  return (
    <div className="neon-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-slate-200">新規予約投稿</h3>
        <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
          <X size={16} />
        </button>
      </div>
      <div>
        <FieldLabel>投稿内容</FieldLabel>
        <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="投稿したい内容…" />
      </div>
      <div>
        <FieldLabel>投稿日時</FieldLabel>
        <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
      </div>
      <div>
        <FieldLabel>タグ <span className="text-slate-600 font-normal">（カンマ区切り・任意）</span></FieldLabel>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="例: AI, 副業, 生産性"
        />
      </div>
      {error && (
        <p className="text-[12px] text-red-400">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>キャンセル</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || !date || loading}>
          {loading ? '保存中…' : '予約する'}
        </Button>
      </div>
    </div>
  );
}
