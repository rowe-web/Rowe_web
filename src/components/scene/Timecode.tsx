/**
 * Timecode global. Todos los elementos [data-tc] los actualiza un único ticker
 * ligado al scroll (src/motion), escribiendo texto directamente: sin re-renders de React.
 */
export function Timecode({ className = "", initial = "00:00:00:00" }: { className?: string; initial?: string }) {
  return (
    <span data-tc="" className={`tabular-nums ${className}`} aria-hidden="true" suppressHydrationWarning>
      {initial}
    </span>
  );
}
