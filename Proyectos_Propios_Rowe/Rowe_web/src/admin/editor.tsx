"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Coordinación entre la barra superior del panel y el editor activo:
 *  - «Deshacer»: el editor registra su función de deshacer.
 *  - Cambios sin guardar: el editor los declara; la barra avisa antes de salir y el
 *    navegador también (cerrar pestaña, recargar). Nunca se pierde lo escrito.
 */
interface EditorApi {
  undo: (() => void) | null;
  setUndo: (fn: (() => void) | null) => void;
  unsaved: boolean;
  setUnsaved: (key: string, value: boolean) => void;
}

const Ctx = createContext<EditorApi | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [undo, setUndoState] = useState<(() => void) | null>(null);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const setUndo = useCallback((fn: (() => void) | null) => setUndoState(() => fn), []);
  const setUnsaved = useCallback((key: string, value: boolean) => {
    setDirtyKeys((prev) => {
      if (prev.has(key) === value) return prev;
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const unsaved = dirtyKeys.size > 0;

  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  return <Ctx.Provider value={{ undo, setUndo, unsaved, setUnsaved }}>{children}</Ctx.Provider>;
}

export function useEditor(): EditorApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditor fuera de <EditorProvider>");
  return ctx;
}

/**
 * Estado con «deshacer» (como el diseño: agrupa los cambios rápidos en una sola
 * instantánea cada 1,2 s, y guarda hasta 30). Se conecta solo con la barra superior.
 */
export function useUndoable<T>(initial: T, key: string) {
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const stack = useRef<T[]>([]);
  const lastSnap = useRef(0);
  const [depth, setDepth] = useState(0);
  const { setUndo, setUnsaved } = useEditor();

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        const now = Date.now();
        if (now - lastSnap.current > 1200) {
          stack.current = [...stack.current.slice(-29), prev];
          setDepth(stack.current.length);
        }
        lastSnap.current = now;
        return next;
      });
    },
    [],
  );

  const undo = useCallback(() => {
    const prev = stack.current.pop();
    setDepth(stack.current.length);
    if (prev !== undefined) setState(prev);
  }, []);

  /** Tras guardar (o al cargar datos nuevos del servidor): este es el nuevo punto de partida. */
  const commit = useCallback((value: T) => {
    setSaved(value);
    setState(value);
  }, []);

  const dirty = JSON.stringify(state) !== JSON.stringify(saved);

  useEffect(() => {
    setUndo(depth > 0 ? undo : null);
    return () => setUndo(null);
  }, [depth, undo, setUndo]);

  useEffect(() => {
    setUnsaved(key, dirty);
    return () => setUnsaved(key, false);
  }, [key, dirty, setUnsaved]);

  // Copia de seguridad local: si se cierra el navegador sin guardar, se ofrece recuperar
  useEffect(() => {
    try {
      if (dirty) localStorage.setItem(`rowe-admin:${key}`, JSON.stringify(state));
      else localStorage.removeItem(`rowe-admin:${key}`);
    } catch {}
  }, [key, state, dirty]);

  return { state, set, undo, canUndo: depth > 0, dirty, commit, saved };
}

/** Borrador local de una sesión anterior (si existe y es distinto de lo guardado). */
export function readBackup<T>(key: string, saved: T): T | null {
  try {
    const raw = localStorage.getItem(`rowe-admin:${key}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as T;
    return JSON.stringify(value) === JSON.stringify(saved) ? null : value;
  } catch {
    return null;
  }
}

export function clearBackup(key: string) {
  try {
    localStorage.removeItem(`rowe-admin:${key}`);
  } catch {}
}
