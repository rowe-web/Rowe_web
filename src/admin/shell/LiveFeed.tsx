"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { checkInbox } from "@/admin/actions/leads";
import { useFeedback } from "@/admin/ui/feedback";
import { supabaseBrowser } from "@/lib/supabase/browser";

/** Cada cuánto se lee el buzón mientras el panel está abierto y a la vista. */
const INBOX_EVERY_MS = 60_000;

/**
 * Avisos en tiempo real del panel (esquina inferior derecha):
 *  - Mensaje nuevo desde la web (formulario o configurador).
 *  - Respuesta de un cliente por email.
 * Llegan por Supabase Realtime (con RLS: solo el equipo los recibe). Las respuestas por
 * email entran al leer el buzón: el panel lo pide cada minuto mientras está a la vista (y
 * la tarea programada lo hace aunque esté cerrado). Al llegar algo, la página se actualiza
 * sola (contador de mensajes, bandeja, conversación).
 */
export function LiveFeed() {
  const { alert } = useFeedback();
  const router = useRouter();

  // --- Realtime ---------------------------------------------------------------------
  // La conexión en tiempo real va con la sesión del panel: sin ella, Supabase avisa del
  // cambio pero sin los datos (RLS). Se autentica antes de suscribirse y al renovar la sesión.
  useEffect(() => {
    const sb = supabaseBrowser();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;
    const { data: auth } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) sb.realtime.setAuth(session.access_token);
    });

    (async () => {
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (data.session) await sb.realtime.setAuth(data.session.access_token);
      channel = sb
        .channel("panel-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, ({ new: lead }) => {
          const l = lead as Partial<{ id: string; name: string; company: string; need: string; origin: string; message: string }>;
          alert({
            kicker: l.origin === "configurador" ? "Nuevo presupuesto" : "Nuevo mensaje",
            title: l.name ? `${l.name}${l.company ? ` · ${l.company}` : ""}` : "Ha llegado un mensaje nuevo",
            body: [l.need, l.message].filter(Boolean).join(" — ") || undefined,
            href: l.id ? `/admin/mensajes?lead=${l.id}` : "/admin/mensajes",
            cta: "Ver mensaje",
          });
          router.refresh();
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_inbound" }, ({ new: row }) => {
          const r = row as Partial<{ lead_id: string; from_name: string; from_email: string; body: string }>;
          const who = r.from_name || r.from_email;
          alert({
            kicker: "Respuesta por email",
            title: who ? `${who} ha respondido` : "Un cliente ha respondido",
            body: r.body || undefined,
            href: r.lead_id ? `/admin/mensajes?lead=${r.lead_id}` : "/admin/mensajes",
            cta: "Ver conversación",
          });
          router.refresh();
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      auth.subscription.unsubscribe();
      if (channel) sb.removeChannel(channel);
    };
  }, [alert, router]);

  // --- Buzón: cada minuto, solo con el panel a la vista ---------------------------------
  useEffect(() => {
    let stopped = false;
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const res = await checkInbox();
        // Sin configurar, no se vuelve a intentar en esta visita
        if (res.ok && res.data && !res.data.configured) stopped = true;
      } finally {
        busy = false;
      }
    };
    const first = window.setTimeout(() => !stopped && tick(), 4000);
    const timer = window.setInterval(() => !stopped && tick(), INBOX_EVERY_MS);
    const onVisible = () => !document.hidden && !stopped && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
