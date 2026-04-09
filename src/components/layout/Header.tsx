'use client';

import { useState } from 'react';
import { Bell, Settings, Menu } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex items-start justify-between mb-10">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button className="md:hidden w-9 h-9 neon-card flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors">
            <Menu size={15} />
          </button>

          <div>
            <h1 className="text-[1.625rem] font-semibold text-slate-100 tracking-tight leading-none">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-slate-500 mt-2 leading-none">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <button className="w-9 h-9 neon-card flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors">
            <Bell size={14} />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 neon-card flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Settings size={14} />
          </button>
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-semibold text-white cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              boxShadow: '0 0 14px rgba(167,139,250,0.28)',
            }}
          >
            Y
          </div>
        </div>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
