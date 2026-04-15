'use client';

import { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, VoiceInput, VoiceTextarea, FieldLabel } from '@/components/ui/Input';
import { X, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import type { PostPersona } from '@/lib/types';

const AVATAR_GROUPS = [
  {
    label: '人物',
    emojis: [
      '\uD83E\uDDD1','\uD83D\uDC68','\uD83D\uDC69','\uD83E\uDDD4','\uD83D\uDC71',
      '\uD83D\uDC82','\uD83D\uDC77','\uD83D\uDC73','\uD83E\uDDB8','\uD83E\uDDB9',
      '\uD83E\uDD78','\uD83D\uDC6E','\uD83E\uDD77','\uD83E\uDDD9','\uD83E\uDDDA',
      '\uD83E\uDDDB','\uD83D\uDC7C','\uD83D\uDC70','\uD83D\uDC64','\uD83D\uDC65',
      '\uD83D\uDC7E','\uD83D\uDC7B','\uD83D\uDC80','\uD83D\uDC7D','\uD83E\uDD20','\uD83E\uDD21',
    ],
  },
  {
    label: '動物',
    emojis: [
      '\uD83D\uDC36','\uD83D\uDC31','\uD83D\uDC2D','\uD83D\uDC39','\uD83D\uDC30',
      '\uD83E\uDD8A','\uD83D\uDC3B','\uD83D\uDC3C','\uD83D\uDC28','\uD83D\uDC2F',
      '\uD83E\uDD81','\uD83D\uDC2E','\uD83D\uDC37','\uD83D\uDC38','\uD83D\uDC35',
      '\uD83E\uDD84','\uD83D\uDC3A','\uD83E\uDD9D','\uD83E\uDD8B','\uD83E\uDD85',
      '\uD83E\uDD89','\uD83D\uDC2C','\uD83D\uDC33','\uD83E\uDD88','\uD83D\uDC19',
      '\uD83D\uDC32','\uD83E\uDD95','\uD83E\uDD96','\uD83D\uDC09','\uD83E\uDD93',
    ],
  },
  {
    label: 'その他',
    emojis: [
      '\uD83D\uDE80','\uD83D\uDCCA','\uD83D\uDCA1','\uD83C\uDFAF','\uD83D\uDD25',
      '\uD83D\uDCBC','\uD83C\uDF1F','\uD83E\uDD16','\uD83D\uDCF1','\u26A1',
      '\uD83C\uDFB8','\uD83C\uDFAE','\uD83C\uDFAC','\uD83D\uDCF8','\uD83C\uDFC6',
      '\uD83D\uDC8E','\uD83C\uDF08','\uD83C\uDF40','\uD83C\uDFA9','\uD83D\uDD2E',
    ],
  },
];

interface Props {
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

  const initialTab = persona?.avatar
    ? (AVATAR_GROUPS.find((g) => g.emojis.includes(persona.avatar))?.label ?? 'その他')
    : '人物';

  const [form, setForm] = useState<FormState>({
    name:         persona?.name        ?? '',
    avatar:       persona?.avatar      ?? '\uD83E\uDDD1',
    tone:         persona?.tone        ?? '',
    style:        persona?.style       ?? '',
    description:  persona?.description ?? '',
    keywordInput: '',
    keywords:     persona?.keywords    ?? [],
  });
  const [avatarTab, setAvatarTab] = useState(initialTab);
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
    if (kw && !form.keywords.includes(kw)) set('keywords', [...form.keywords, kw]);
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
      const res    = await apiFetch(url, {
        method,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
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
          <div className="flex items-center justify-between mb-2.5">
            <FieldLabel>アバター</FieldLabel>
            <span className="text-2xl leading-none">{form.avatar}</span>
          </div>

          <div className="flex gap-1.5 mb-2.5">
            {AVATAR_GROUPS.map((g) => (
              <button
                key={g.label}
                onClick={() => { setAvatarTab(g.label); gridRef.current?.scrollTo(0, 0); }}
                className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: avatarTab === g.label ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                  border: avatarTab === g.label ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  color: avatarTab === g.label ? '#c4b5fd' : '#64748b',
                  fontWeight: avatarTab === g.label ? 600 : 400,
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div
            ref={gridRef}
            className="flex flex-wrap gap-1.5 overflow-y-auto rounded-xl p-2"
            style={{
              maxHeight: '120px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            }}
          >
            {AVATAR_GROUPS.find((g) => g.label === avatarTab)?.emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => set('avatar', emoji)}
                className="w-9 h-9 rounded-lg text-xl transition-all flex items-center justify-center"
                style={{
                  background: form.avatar === emoji ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.03)',
                  border: form.avatar === emoji ? '1px solid rgba(167,139,250,0.5)' : '1px solid transparent',
                  boxShadow: form.avatar === emoji ? '0 0 8px rgba(167,139,250,0.3)' : 'none',
                  transform: form.avatar === emoji ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {emoji}
              </button>
            ))}
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
