import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { StatsScreen, type StatsData } from "@/admin/screens/StatsScreen";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Estadísticas" };

const PERIODS = { "7d": 7, "30d": 30, "12m": 365 } as const;

export default async function StatsPage({ searchParams }: PageProps<"/admin/estadisticas">) {
  await requirePageUser();
  const sp = await searchParams;
  const period = (typeof sp.periodo === "string" && sp.periodo in PERIODS ? sp.periodo : "7d") as keyof typeof PERIODS;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_stats", { p_days: PERIODS[period] });
  return <StatsScreen period={period} data={(data as StatsData) ?? null} error={error ? "No se han podido cargar las estadísticas." : null} />;
}
