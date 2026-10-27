// FormSaathi brand mark: geometric "F" monogram + teal spark on a navy badge.
// Inline SVG so it stays crisp from 16px favicon up to navbar size.
export default function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="FormSaathi logo" className={className}>
      <title>FormSaathi</title>
      <circle cx="20" cy="20" r="19" fill="#0A1F44" />
      <circle cx="20" cy="20" r="18.25" fill="none" stroke="#14B8A6" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Geometric F */}
      <rect x="12.5" y="10.5" width="3.6" height="19" rx="1.8" fill="#FFFFFF" />
      <rect x="12.5" y="10.5" width="13" height="3.6" rx="1.8" fill="#FFFFFF" />
      <rect x="12.5" y="18.8" width="10.5" height="3.4" rx="1.7" fill="#FFFFFF" />
      {/* Four-point spark: opportunities lighting up */}
      <path d="M29.5 7.3 Q30.2 9.8 32.7 10.5 Q30.2 11.2 29.5 13.7 Q28.8 11.2 26.3 10.5 Q28.8 9.8 29.5 7.3 Z" fill="#14B8A6" />
    </svg>
  )
}
