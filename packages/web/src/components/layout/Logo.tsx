/**
 * SVG logomark for STR Renovator.
 * House silhouette with sparkle accent — renders inline for sidebar use.
 */
export function LogoMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <path
        d="M24 6L5 22h4v18h12v-12h6v12h12V22h4L24 6z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M37 5l1.5 4.5L43 11l-4.5 1.5L37 17l-1.5-4.5L31 11l4.5-1.5L37 5z"
        className="text-accent"
        fill="currentColor"
      />
    </svg>
  );
}
