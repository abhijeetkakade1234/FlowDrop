export function FlowDropLogo() {
  return (
    <svg aria-hidden="true" className="flowdrop-logo" viewBox="0 0 100 100">
      <defs>
        <linearGradient
          id="flowdrop-liquid"
          x1="18%"
          x2="82%"
          y1="12%"
          y2="88%"
        >
          <stop offset="0%" stopColor="#6AA8FF" />
          <stop offset="55%" stopColor="#4D8EF5" />
          <stop offset="100%" stopColor="#2E74DD" />
        </linearGradient>
        <radialGradient id="flowdrop-shine" cx="35%" cy="22%" r="52%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="flowdrop-glow">
          <feGaussianBlur result="blur" stdDeviation="3" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path
        d="M50 14 C31 14, 16 29, 16 48 C16 72, 50 84, 50 84 C50 84, 84 72, 84 48 C84 29, 69 14, 50 14 Z"
        fill="url(#flowdrop-liquid)"
        filter="url(#flowdrop-glow)"
      />
      <ellipse cx="39" cy="31" fill="white" opacity="0.34" rx="12" ry="15" />
      <circle cx="50" cy="44" fill="#a8ccff" opacity="0.7" r="8" />
    </svg>
  );
}
