type P = { className?: string };

export const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cg transform='rotate(-30 12 12)'%3E%3Ccircle cx='7.3' cy='3.2' r='1.45'/%3E%3Crect x='5.5' y='4.7' width='3.6' height='14.6' rx='1.8'/%3E%3Crect x='14.9' y='4.7' width='3.6' height='14.6' rx='1.8'/%3E%3Ccircle cx='16.7' cy='20.8' r='1.45'/%3E%3C/g%3E%3C/svg%3E";

export function LogoMark({ className = "logo-mark" }: P) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(-30 12 12)">
        <circle cx="7.3" cy="3.2" r="1.45" />
        <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <circle cx="16.7" cy="20.8" r="1.45" />
      </g>
    </svg>
  );
}

export function Sparkle({ className = "badge-star" }: P) {
  return (
    <svg className={className} width="18" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </svg>
  );
}

export function StatWorkflow({ className = "stat-icon" }: P) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="stat-pill-l" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0.38" stopColor="#ffffff" />
          <stop offset="0.62" stopColor="#3a3a3a" />
        </linearGradient>
        <linearGradient id="stat-pill-r" x1="13" y1="2" x2="24" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0.38" stopColor="#3a3a3a" />
          <stop offset="0.62" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#stat-pill-l)" />
      <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#stat-pill-r)" />
      <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
    </svg>
  );
}

export function StatDownload({ className = "stat-icon" }: P) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
      <g fill="none" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 7.1v7.4" />
        <path d="M8.15 12.35L12 16.2l3.85-3.85" />
      </g>
    </svg>
  );
}

export function StatAvatars({ className = "stat-icon stat-icon-wide" }: P) {
  return (
    <svg className={className} width="38" height="21" viewBox="0 0 40 22" aria-hidden="true">
      <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
      <path d="M6.3 10.4 7.2 6.9 9.4 9.2Z" fill="#f4f4f4" />
      <path d="M14.1 10.4 13.2 6.9 11 9.2Z" fill="#f4f4f4" />
      <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
      <circle cx="8.7" cy="11.8" r="0.7" fill="#1a1a1a" />
      <circle cx="11.7" cy="11.8" r="0.7" fill="#1a1a1a" />

      <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
      <circle cx="17.6" cy="9.9" r="1.7" fill="#111" />
      <circle cx="22.8" cy="9.9" r="1.7" fill="#111" />
      <ellipse cx="20.2" cy="12.7" rx="0.95" ry="0.65" fill="#111" />
      <path d="M17.7 14.6q2.5 2.2 5 0" fill="none" stroke="#111" strokeWidth="1.2" strokeLinecap="round" />

      <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
      <text x="30.2" y="15.1" fontSize="12.5" textAnchor="middle" fill="#ffffff" fontFamily="Inter, system-ui, sans-serif" fontWeight="700">
        e
      </text>
    </svg>
  );
}

export function Lock({ className }: P) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
  );
}

export function Grain() {
  return (
    <div className="grain" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
    </div>
  );
}
