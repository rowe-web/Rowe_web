"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, requireRole } from "@/admin/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Deshace un cambio del historial en el borrador (la web cambia al publicar). */
export async function restoreChange(id: number) {
  return action(async () => {
    await requireRole("staff");
    const supabase = await createSupabaseServer();
    const { error } = await supabase.rpc("restore_change", { p_id: z.number().int().positive().parse(id) });
    if (error) {
      // Los mensajes de la base de datos ya están pensados para leerse
      if (/ya no existe|no se puede|Ya existe/.test(error.message)) throw new ActionError(error.message);
      throw new Error(error.message);
    }
    refresh();
  });
}
