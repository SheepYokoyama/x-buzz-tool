'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { dummyCharacters } from '@/lib/dummy-data';
import type { Character } from '@/lib/types';
import { Plus, Edit2, Check } from 'lucide-react';

export default function CharacterPage() {
  const [characters, setCharacters] = useState<Character[]>(dummyCharacters);
  const [editing, setEditing] = useState<string | null>(null);

  const handleActivate = (id: string) => {
    setCharacters((prev) =>
      prev.map((c) => ({ ...c, is_active: c.id === id }))
    );
  };

  return (
    <>
      <Header title="キャラ設定" subtitle="投稿のトーンやスタイルを管理します" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {characters.map((char) => (
          <Card key={char.id} accent={char.is_active ? 'purple' : 'none'}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-white/10 flex items-center justify-center text-2xl">
                  {char.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{char.name}</h3>
                  <p className="text-xs text-slate-400">{char.tone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {char.is_active && <Badge color="green">アクティブ</Badge>}
                <button className="w-7 h-7 glass rounded-lg flex items-center justify-center text-slate-400 hover:text-neon-blue transition-all">
                  <Edit2 size={13} />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">{char.description}</p>

            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">スタイル</p>
              <p className="text-xs text-slate-300 glass rounded-lg p-2">{char.style}</p>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1.5">キーワード</p>
              <div className="flex flex-wrap gap-1.5">
                {char.keywords.map((kw) => (
                  <Badge key={kw} color="purple">{kw}</Badge>
                ))}
              </div>
            </div>

            {!char.is_active && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleActivate(char.id)}
                className="w-full justify-center"
              >
                <Check size={13} />
                このキャラを使用する
              </Button>
            )}
          </Card>
        ))}

        {/* Add new character */}
        <div className="glass glass-hover rounded-2xl p-5 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 cursor-pointer min-h-48 hover:border-neon-purple/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
            <Plus size={20} className="text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400">新しいキャラを追加</p>
            <p className="text-xs text-slate-600 mt-0.5">複数のキャラで投稿を使い分けられます</p>
          </div>
        </div>
      </div>
    </>
  );
}
