interface Props {
  emoji: string;
  title: string;
  body: string;
}

export function GuideTipCard({ emoji, title, body }: Props) {
  return (
    <div className="neon-card p-5">
      <span className="text-3xl">{emoji}</span>
      <h3 className="text-[14px] font-semibold text-slate-800 mt-3 mb-1.5">{title}</h3>
      <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}
