import type { gsap } from "../gsap";

export interface SceneEnv {
  /** Sección de la escena ([data-scene]). Todos los selectores se buscan dentro. */
  root: HTMLElement;
  /** gsap.matchMedia con ámbito en la escena: cada rama se limpia sola al cambiar de breakpoint. */
  mm: gsap.MatchMedia;
}

/** Configura el movimiento de una escena. Devuelve (opcional) una limpieza extra. */
export type SceneSetup = (env: SceneEnv) => void | (() => void);

export const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
export const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
