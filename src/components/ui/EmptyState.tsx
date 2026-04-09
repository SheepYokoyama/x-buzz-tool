import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconColor?: string;
}

export function EmptyState({ icon: Icon, title, description, iconColor = '#a78bfa' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: `${iconColor}12`,
          border: `1px solid ${iconColor}20`,
        }}
      >
        <Icon size={24} style={{ color: iconColor }} />
      </div>
      <p className="text-[14px] font-medium text-slate-400">{title}</p>
      {description && (
        <p className="text-[12px] text-slate-600 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
    </div>
  );
}
