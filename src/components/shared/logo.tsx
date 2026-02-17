'use client'

interface LogoProps {
  variant?: 'full' | 'compact' | 'mark'
  className?: string
  color?: string
}

export function Logo({ variant = 'full', className = '', color = 'currentColor' }: LogoProps) {
  if (variant === 'mark') {
    // Single "H" lettermark for collapsed sidebar, favicons, small contexts
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Halo Dental Lab"
        role="img"
      >
        <path
          d="M8 4h7.5v17.5h17V4H40v40h-7.5V28.5h-17V44H8V4Z"
          fill={color}
        />
      </svg>
    )
  }

  if (variant === 'compact') {
    // "HALO" wordmark only -- for sidebar header, nav bars, smaller contexts
    return (
      <svg
        viewBox="0 0 172 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Halo Dental Lab"
        role="img"
      >
        {/* H - clean geometric straight lines */}
        <path
          d="M0 2h6.8v18.8h19.4V2H33v44h-6.8V26.6H6.8V46H0V2Z"
          fill={color}
        />
        {/* A - geometric triangle with minimal crossbar */}
        <path
          d="M52 46L68.5 2h5L90 46h-7.2l-4.6-11H63.8L59.2 46H52Zm14.4-17h19.2L76 8.4 66.4 29Z"
          fill={color}
        />
        {/* L - clean straight lines */}
        <path
          d="M96 2h6.8v38.2h21.2V46H96V2Z"
          fill={color}
        />
        {/* O - perfect circle (open ring) */}
        <circle
          cx="149"
          cy="24"
          r="20.5"
          stroke={color}
          strokeWidth="6.8"
          fill="none"
        />
      </svg>
    )
  }

  // Full logo: "HALO" large wordmark + "D E N T A L   L A B" subtitle
  return (
    <svg
      viewBox="0 0 280 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Halo Dental Lab"
      role="img"
    >
      {/* ===== HALO main wordmark ===== */}

      {/* H - geometric, clean straight strokes */}
      <path
        d="M10 4h8v23h28V4h8v56h-8V33H18v27h-8V4Z"
        fill={color}
      />

      {/* A - geometric triangle, minimal crossbar */}
      <path
        d="M82 60L101.5 4h7L128 60h-8.5l-5.5-14H96L90.5 60H82Zm16.5-20h23L110.5 13 98.5 40Z"
        fill={color}
      />

      {/* L - clean straight lines */}
      <path
        d="M135 4h8v50h27v6h-35V4Z"
        fill={color}
      />

      {/* O - perfect circle (open, not filled) */}
      <circle
        cx="203"
        cy="32"
        r="27"
        stroke={color}
        strokeWidth="8"
        fill="none"
      />

      {/* ===== D E N T A L   L A B subtitle ===== */}
      {/* Geometric letterforms rendered as SVG paths for crisp rendering */}
      {/* Each letter is approximately 8 units wide, with 6 unit gaps between */}

      <g fill={color}>
        {/* D */}
        <path d="M56 72h5.8c4.8 0 7.8 3 7.8 7.5s-3 7.5-7.8 7.5H56V72Zm5.8 13c3.5 0 5.6-2.2 5.6-5.5s-2.1-5.5-5.6-5.5h-3.6v11h3.6Z" />

        {/* E */}
        <path d="M77 72h10v2H79.2v4.5h7v2h-7v4.5H87v2H77V72Z" />

        {/* N */}
        <path d="M94 72h2.3l8 11.2V72h2.2v15h-2.3l-8-11.2V87H94V72Z" />

        {/* T */}
        <path d="M113.5 72h10.5v2h-4.1v13h-2.3V74h-4.1V72Z" />

        {/* A */}
        <path d="M131.5 72h2.5l6 15h-2.4l-1.5-3.8h-6.7l-1.5 3.8h-2.4l6-15Zm1.2 3.5l-2.6 5.7h5.3l-2.7-5.7Z" />

        {/* L */}
        <path d="M146 72h2.2v13h7.3v2H146V72Z" />

        {/* (extra spacing gap between "DENTAL" and "LAB") */}

        {/* L */}
        <path d="M168 72h2.2v13h7.3v2H168V72Z" />

        {/* A */}
        <path d="M184.5 72h2.5l6 15h-2.4l-1.5-3.8h-6.7l-1.5 3.8h-2.4l6-15Zm1.2 3.5l-2.6 5.7h5.3l-2.7-5.7Z" />

        {/* B */}
        <path d="M199 72h5.8c2.6 0 4.2 1.4 4.2 3.5 0 1.5-0.8 2.7-2.2 3.2 1.7 0.5 2.7 1.8 2.7 3.5 0 2.3-1.8 3.8-4.5 3.8H199V72Zm5.5 6c1.5 0 2.4-0.8 2.4-2.1 0-1.2-0.9-1.9-2.4-1.9h-3.3v4h3.3Zm0.4 7c1.6 0 2.6-0.9 2.6-2.2 0-1.3-1-2.2-2.6-2.2h-3.7v4.4h3.7Z" />
      </g>
    </svg>
  )
}
