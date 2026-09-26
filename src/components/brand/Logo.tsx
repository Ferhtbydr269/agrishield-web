/** AgriShield işareti: kalkan + başak + yörünge yayı. Tamamen SVG, dış varlık yok. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16 2.5 27 6.6v8.2c0 7-4.6 12.4-11 14.7C9.6 27.2 5 21.8 5 14.8V6.6L16 2.5Z"
        stroke="var(--green)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="color-mix(in oklab, var(--green) 14%, transparent)"
      />
      <path d="M16 24V11" stroke="var(--wheat)" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M16 13.2c-2.2-.3-3.6-1.7-3.9-3.9 2.2.3 3.6 1.7 3.9 3.9Zm0 0c2.2-.3 3.6-1.7 3.9-3.9-2.2.3-3.6 1.7-3.9 3.9ZM16 17.6c-2.2-.3-3.6-1.7-3.9-3.9 2.2.3 3.6 1.7 3.9 3.9Zm0 0c2.2-.3 3.6-1.7 3.9-3.9-2.2.3-3.6 1.7-3.9 3.9ZM16 22c-2.2-.3-3.6-1.7-3.9-3.9 2.2.3 3.6 1.7 3.9 3.9Zm0 0c2.2-.3 3.6-1.7 3.9-3.9-2.2.3-3.6 1.7-3.9 3.9Z"
        fill="var(--wheat)"
      />
      <path
        d="M3.5 21.5c4.5 3 13.5 3.6 21 .2"
        stroke="var(--sky)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="1.5 2.5"
      />
      <circle cx="26.3" cy="20.8" r="1.6" fill="var(--sky)" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="font-display text-[1.15rem] font-extrabold tracking-tight text-text">
          Agri<span className="text-green-fg">Shield</span>
        </span>
      )}
    </span>
  );
}
