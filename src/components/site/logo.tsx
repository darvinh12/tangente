export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#1d6b66" />
      <path d="M5 23.5C10 23.5 12 9 18 9s7 6 9 6" fill="none" stroke="#fffdf8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8.5 19.5 25 7.5" stroke="#f3c98b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16.4" cy="13.6" r="2.3" fill="#f3c98b" />
    </svg>
  );
}
