"use client";

import { useEffect, useRef } from "react";
import { CornerMarks } from "@/components/ui/CornerMarks";

/**
 * Marco 4:5 de las figuras animadas (velo cálido y marcas de encuadre, como MediaFrame).
 * Las animaciones de dentro solo corren mientras el marco está a la vista (data-playing).
 * Cada vez que entra (bajando o subiendo) las líneas se vuelven a dibujar desde cero; al salir
 * del todo vuelven al estado inicial, en pausa, y fuera de pantalla no gastan batería.
 */
export function LoopFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Vuelve al primer fotograma (líneas sin dibujar, ciclos al principio, retrasos incluidos)
    const rewind = () => el.getAnimations({ subtree: true }).forEach((a) => (a.currentTime = 0));
    const io = new IntersectionObserver(
      ([e]) => {
        const playing = el.hasAttribute("data-playing");
        if (!playing && e.intersectionRatio >= 0.15) {
          rewind();
          el.setAttribute("data-playing", "");
        } else if (playing && !e.isIntersecting) {
          el.removeAttribute("data-playing");
          rewind();
        }
      },
      { threshold: [0, 0.15] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-loop-frame aria-hidden="true" className={`relative overflow-hidden bg-ph ${className}`} style={{ aspectRatio: "4 / 5" }}>
      {children}
      <CornerMarks size={12} inset={10} />
    </div>
  );
}
