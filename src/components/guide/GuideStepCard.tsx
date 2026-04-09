import { LucideIcon } from 'lucide-react';

interface Props {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export function GuideStepCard({ step, title, description, icon: Icon, color }: Props) {
  return (
    <div className="neon-card p-6 flex gap-5">
      {/* Step number */}
      <div className="shrink-0 flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-[15px] text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
        >
          {step}
        </div>
        <div className="w-px flex-1 min-h-4" style={{ background: `${color}20` }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={15} style={{ color }} />
          <h3 className="text-[14px] font-semibold text-slate-200">{title}</h3>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
