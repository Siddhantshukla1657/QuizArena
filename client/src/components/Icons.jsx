/**
 * client/src/components/Icons.jsx
 *
 * Unified SVG Icon System for QuizArena
 * Solid fills, 24x24 grid, 2px optical stroke weight.
 * Zero emoji usage across the entire application.
 */

// ── 1. Answer Shape Icons ───────────────────────────────────────────────────

export function ShapeTriangle({ size = 24, className = '', fill = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} className={className} aria-hidden="true">
      <path d="M12 3.5L21.5 19.5H2.5L12 3.5Z" />
    </svg>
  );
}

export function ShapeDiamond({ size = 24, className = '', fill = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} className={className} aria-hidden="true">
      <path d="M12 2.5L21.5 12L12 21.5L2.5 12L12 2.5Z" />
    </svg>
  );
}

export function ShapeCircle({ size = 24, className = '', fill = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function ShapeSquare({ size = 24, className = '', fill = 'currentColor' }) {
  // Square with 3px corner radius per design spec
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    </svg>
  );
}

// Array export indexed by 0..3 matching answers A, B, C, D
export const ANSWER_SHAPES = [ShapeTriangle, ShapeDiamond, ShapeCircle, ShapeSquare];

// ── 2. Brand & Logo Glyph ───────────────────────────────────────────────────

export function IconLogo({ size = 24, className = '', color = 'var(--color-primary)' }) {
  return (
    <img
      src="/logo.png"
      alt="QuizArena logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', display: 'inline-block' }}
    />
  );
}

// ── 3. Host Control Icons ───────────────────────────────────────────────────

export function IconPause({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1.5" />
      <rect x="14" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}

export function IconPlay({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 4.5V19.5L19 12L7 4.5Z" />
    </svg>
  );
}

export function IconSkip({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 4.5V19.5L14.5 12L5 4.5Z" />
      <rect x="16" y="4.5" width="3" height="15" rx="1" />
    </svg>
  );
}

export function IconEnd({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconSignal({ size = 20, className = '', color = 'var(--color-live)' }) {
  // 3-bar signal glyph in Live Cyan per design spec
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} aria-hidden="true">
      <rect x="4" y="14" width="3.5" height="6" rx="1" />
      <rect x="10.25" y="9" width="3.5" height="11" rx="1" />
      <rect x="16.5" y="4" width="3.5" height="16" rx="1" />
    </svg>
  );
}

// ── 4. Feedback & Status Glyphs ─────────────────────────────────────────────

export function IconCheck({ size = 24, className = '', strokeWidth = 3 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 12.5L9.5 17.5L19.5 6.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCross({ size = 24, className = '', strokeWidth = 3 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClock({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7V12L15.5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrophy({ size = 24, className = '', color = '#FFD700' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3H18V8C18 11.3137 15.3137 14 12 14C8.68629 14 6 11.3137 6 8V3Z"
        fill={color}
      />
      <path d="M6 5H3C2.44772 5 2 5.44772 2 6C2 8.5 4 10.5 6 10.5V5Z" fill={color} />
      <path d="M18 5H21C21.5523 5 22 5.44772 22 6C22 8.5 20 10.5 18 10.5V5Z" fill={color} />
      <path d="M10 14V18H14V14" stroke={color} strokeWidth="2" />
      <rect x="7" y="18" width="10" height="3" rx="1.5" fill={color} />
    </svg>
  );
}

export function IconMedal({ rank = 1, size = 24, className = '' }) {
  const colors = {
    1: '#FFD700', // Gold
    2: '#D1D5DB', // Silver
    3: '#CD7F32', // Bronze
  };
  const c = colors[rank] || colors[1];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="14" r="7" fill={c} />
      <path d="M8 3L10.5 9H13.5L16 3H13L12 5.5L11 3H8Z" fill={c} opacity="0.8" />
      <text x="12" y="17" fill="#14121F" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="Space Grotesk, sans-serif">
        {rank}
      </text>
    </svg>
  );
}

export function IconArrowUp({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 19V5M12 5L6 11M12 5L18 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowDown({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5V19M12 19L18 13M12 19L6 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDash({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 12H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── 5. Standard Action Glyphs ───────────────────────────────────────────────

export function IconCopy({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8V6C16 4.89543 15.1046 4 14 4H6C4.89543 4 4 4.89543 4 6V14C4 15.1046 4.89543 16 6 16H8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconPlus({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEdit({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M11 4H4C3 4 2 5 2 6V20C2 21 3 22 4 22H18C19 22 20 21 20 20V13M18.5 2.5C19.3 1.7 20.7 1.7 21.5 2.5C22.3 3.3 22.3 4.7 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUsers({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M17 21V19C17 17.3431 15.6569 16 14 16H6C4.34315 16 3 17.3431 3 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21V19C21 17.6 19.8 16.4 18.5 16.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 4.1C16.3 4.5 17.2 5.6 17.2 7C17.2 8.4 16.3 9.5 15 9.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSparkle({ size = 16, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} aria-hidden="true">
      <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
    </svg>
  );
}

export function IconUpload({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFileCode({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 13L8 15L10 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 13L16 15L14 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
