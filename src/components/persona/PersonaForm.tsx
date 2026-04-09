'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, VoiceInput, VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { X, Plus } from 'lucide-react';
import type { PostPersona } from '@/lib/types';

const AVATAR_OPTIONS = ['🚀', '📊', '✍️', '💡', '🎯', '🔥', '💼', '🌟', '🤖', '📱'];

interface Props {
  /** 編集時は既存ペルソナを渡す。新規作成時は undefined */
  persona?: PostPersona;
  onClose: () => void;
  onSave: (persona: PostPersona) => void;
}

interface FormState {
  name: string;
  avatar: string;
  tone: string;
  style: string;
  description: string;
  keywordInput: string;
  keywords: string[];
}

export function PersonaForm({ persona, onClose, onSave }: Props) {
  const isEdit = !!persona;

  const [form, setForm] = useState<FormState>({
    name:         persona?.name        ?? '',
    avatar:       persona?.avatar      ?? '🚀',
    tone:         persona?.tone        ?? '',
    style:        persona?.style       ?? '',
    description:  persona?.description ?? '',
    keywordInput: '',
    keywords:     persona?.keywords    ?? [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const set = (key: keyof FormState, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addKeyword = () => {
    const kw = form.keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) {
      set('keywords', [...form.keywords, kw]);
    }
    set('keywordInput', '');
  };

  const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }
  };

  const removeKeyword = (kw: string) =>
    set('keywords', form.keywords.filter((k) => k !== kw));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('ペルソナ名は必須です'); return; }
    setIsSaving(true);
    setError(null);

    const body = {
      name:        form.name,
      avatar:      form.avatar,
      tone:        form.tone,
      style:       form.style,
      description: form.description,
      keywords:    form.keywords,
    };

    try {
      const url    = isEdit ? `/api/personas/${persona!.id}` : '/api/personas';
      const method = isEdit ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '保存に失敗しました');
      onSave(data.persona);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    /* オーバーレイ */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* モーダル本体 */}
      <div
        className="w-full max-w-lg rounded-[1.5rem] p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 0 60px rgba(167,139,250,0.1), 0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-200">
              {isEdit ? 'ペルソナを編集' : '新しいペルソナを作成'}
            </h2>
            <p className="section-label mt-1">投稿のトーン・スタイルを設定します</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* アバター選択 */}
        <div>
          <FieldLabel>アバター</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => set('avatar', emoji)}
                className="w-10 h-10 rounded-xl text-xl transition-all"
                style={{
                  background: form.avatar === emoji ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                  border: form.avatar === emoji
                    ? '1px solid rgba(167,139,250,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: form.avatar === emoji ? '0 0 8px rgba(167,139,250,0.3)' : 'none',
                }}
              >
                {emoji}
              </button>
            ))}
            {/* カスタム絵文字入力 */}
            <input
              type="text"
              maxLength={2}
              value={!AVATAR_OPTIONS.includes(form.avatar) ? form.avatar : ''}
              onChange={(e) => set('avatar', e.target.value || form.avatar)}
              placeholder="✏️"
              className="w-10 h-10 rounded-xl text-center text-xl bg-white/[0.03] border border-white/[0.08] text-slate-200 focus:outline-none focus:border-[rgba(167,139,250,0.4)]"
            />
          </div>
        </div>

        {/* ペルソナ名 */}
        <div>
          <FieldLabel>ペルソナ名 <span className="text-red-400">*</span></FieldLabel>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="例：テック起業家キャラ"
          />
        </div>

        {/* トーン */}
        <div>
          <FieldLabel>トーン</FieldLabel>
          <VoiceInput
            value={form.tone}
            onValueChange={(v) => set('tone', v)}
            placeholder="例：カジュアル・前向き"
          />
        </div>

        {/* スタイル */}
        <div>
          <FieldLabel>スタイル</FieldLabel>
          <VoiceInput
            value={form.style}
            onValueChange={(v) => set('style', v)}
            placeholder="例：体験談ベース、数字を使う、短文を多用"
          />
        </div>

        {/* 説明 */}
        <div>
          <FieldLabel>説明</FieldLabel>
          <VoiceTextarea
            rows={3}
            value={form.description}
            onValueChange={(v) => set('description', v)}
            placeholder="例：テクノロジーを使って生活を豊かにする方法を発信するキャラクター。"
            appendMode
          />
        </div>

        {/* キーワード */}
        <div>
          <FieldLabel>キーワード</FieldLabel>
          <div className="flex gap-2">
            <Input
              value={form.keywordInput}
              onChange={(e) => set('keywordInput', e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder="例：AI（Enterで追加）"
            />
            <button
              onClick={addKeyword}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}
            >
              <Plus size={14} />
            </button>
          </div>
          {form.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {form.keywords.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}
                >
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* エラー */}
        {error && (
          <p className="text-[12px] text-red-400 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        {/* フッターボタン */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" size="md" className="flex-1 justify-center" onClick={onClose}>
            キャンセル
          </Button>
          <Button size="md" className="flex-1 justify-center" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? '保存中…' : isEdit ? '変更を保存' : 'ペルソナを作成'}
          </Button>
        </div>
      </div>
    </div>
  );
}
