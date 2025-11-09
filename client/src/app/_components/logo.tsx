export function TMobileLogoGlow() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="glow-effect h-12 w-12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="8"
        fill="#e20074"
        filter="url(#glow)"
      />
      <text
        x="50"
        y="65"
        fontSize="60"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        T
      </text>
    </svg>
  );
}
