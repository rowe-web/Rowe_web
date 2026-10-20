"use client";

import { useState } from "react";
import { BLOCK_TEMPLATES, type BlockType } from "@/lib/content/blocks";
import { JsonFields, type Json } from "@/admin/ui/JsonFields";
import { AButton } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

type Block = Record<string, Json>;

/**
 * Secciones de una página interna: se añaden (de una lista de tipos), se quitan,
 * se reordenan y se editan. Cada sección se abre y cierra para no tener un formulario eterno.
 */
export function SectionsEditor({ blocks, onChange }: { blocks: Block[]; onChange: (blocks: Block[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [type, setType] = useState<BlockType>("incluye");

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    if (open === i) setOpen(j);
    else if (open === j) setOpen(i);
  };
  const remove = (i: number) => {
    onChange(blocks.filter((_, k) => k !== i));
    setOpen(null);
  };
  const add = () => {
    onChange([...blocks, structuredClone(BLOCK_TEMPLATES[type].value) as unknown as Block]);
    setOpen(blocks.length);
  };

  const btn = "flex h-8 w-8 items-center justify-center rounded text-[12px] text-muted hover:bg-[#1F1F1F] hover:text-bone disabled:opacity-30";

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className={`${mono} mb-1 text-muted`}>Secciones de la página · {blocks.length}</legend>
      <p className="text-[13px] leading-relaxed text-muted">En el orden en que se ven. Ábrelas para editar sus textos; los cambios se guardan en el borrador.</p>
      {blocks.map((b, i) => {
        const t = BLOCK_TEMPLATES[b.type as BlockType];
        const summary = [b.kicker, b.title, b.key].find((x) => typeof x === "string" && x) as string | undefined;
        const isOpen = open === i;
        return (
          <div key={i} className="rounded-md border border-line-soft">
            <div className="flex items-center gap-2 pl-3.5 pr-1.5">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className={`${mono} text-muted`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[14px]">{t?.label ?? String(b.type)}</span>
                {summary && <span className="truncate text-[13px] text-dim">{summary.replace(/\*/g, "")}</span>}
                <span aria-hidden="true" className="ml-auto text-[12px] text-muted">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <span className="flex flex-none">
                <button type="button" className={btn} aria-label={`Subir sección ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className={btn} aria-label={`Bajar sección ${i + 1}`} disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button type="button" className={`${btn} hover:!text-rec`} aria-label={`Quitar sección ${i + 1}`} onClick={() => remove(i)}>
                  ✕
                </button>
              </span>
            </div>
            {isOpen && (
              <div className="flex flex-col gap-4 border-t border-line-soft p-3.5">
                {t && <p className="text-[12px] leading-relaxed text-muted">{t.hint}</p>}
                <JsonFields value={b} onChange={(v) => onChange(blocks.map((x, k) => (k === i ? (v as Block) : x)))} hide={["type"]} />
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="add-section">
          Tipo de sección
        </label>
        <select
          id="add-section"
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
          className="h-9 rounded-md border border-line-input bg-surface-2 px-3 text-[13px] text-bone"
        >
          {(Object.keys(BLOCK_TEMPLATES) as BlockType[]).map((k) => (
            <option key={k} value={k}>
              {BLOCK_TEMPLATES[k].label}
            </option>
          ))}
        </select>
        <AButton size="sm" onClick={add}>
          + Añadir sección
        </AButton>
      </div>
    </fieldset>
  );
}
