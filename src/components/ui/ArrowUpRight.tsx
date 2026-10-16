/**
 * Flecha ↗ dibujada en SVG (trazo fino, color del texto). Sustituye al carácter «↗», que
 * iOS y Android pueden pintar como emoji (con fondo azul) en lugar de como tipografía.
 */
export function ArrowUpRight({ className = "", strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      vectorEffect="non-scaling-stroke"
      className={`inline-block ${className}`}
    >
      <path d="M6.5 17.5 17.5 6.5M8.5 6.5h9v9" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
