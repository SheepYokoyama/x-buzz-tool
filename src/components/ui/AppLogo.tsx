/**
 * アプリロゴアイコン（favicon の icon.svg と同じ珈琲カップデザイン）。
 * ブランドグラデーション（neon-blue → neon-purple）の角丸ボックスに白い珈琲カップ。
 * サイズは px 指定で可変（サイドバー 36 / 公開ページ 44 / ログイン 56 など）。
 */
export default function AppLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.29,
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        boxShadow: '0 0 18px rgba(124,58,237,0.4), 0 2px 8px rgba(15,23,42,0.25)',
      }}
    >
      <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78} aria-hidden="true">
        {/* 湯気 */}
        <g stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85">
          <path d="M25 11c-2.5 3 2.5 5.5 0 8.5" />
          <path d="M35 9c-2.5 3 2.5 5.5 0 8.5" />
        </g>
        {/* カップ本体 */}
        <path d="M15 26h28v10a11 11 0 0 1-11 11h-6a11 11 0 0 1-11-11z" fill="#ffffff" />
        {/* 取っ手 */}
        <path d="M43 29h2.5a6.5 6.5 0 0 1 0 13H43" stroke="#ffffff" strokeWidth="4" fill="none" />
        {/* ソーサー */}
        <path d="M14 53h32" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  );
}
