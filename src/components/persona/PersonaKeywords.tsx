export function PersonaKeywords({ keywords }: { keywords: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw) => (
        <span
          key={kw}
          className="text-[11px] px-2.5 py-1 rounded-lg"
          style={{
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.16)',
            color: '#93c5fd',
          }}
        >
          {kw}
        </span>
      ))}
    </div>
  );
}
