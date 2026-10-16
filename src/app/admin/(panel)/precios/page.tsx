import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { AdminOnly } from "@/admin/shell/AdminOnly";
import { PricesScreen, type OptionRow, type SectionRow } from "@/admin/screens/PricesScreen";
import { defaultEngineSettings, type EngineSettings } from "@/features/configurator/engine";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Precios" };

export default async function PricesPage() {
  const user = await requirePageUser();
  if (user.role !== "admin") return <AdminOnly what="Los precios del configurador solo los cambia un administrador." />;
  const supabase = await createSupabaseServer();
  const [{ data: sections }, { data: options }, { data: setting }] = await Promise.all([
    supabase.from("config_sections").select("*").order("position"),
    supabase.from("config_options").select("*").order("position"),
    supabase.from("site_settings").select("value").eq("key", "configurator").maybeSingle(),
  ]);
  const strip = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "updated_at" && k !== "updated_by"));
  const v = (setting?.value ?? {}) as Partial<EngineSettings>;
  const engine: EngineSettings = {
    round_once: v.round_once ?? defaultEngineSettings.round_once,
    round_monthly: v.round_monthly ?? defaultEngineSettings.round_monthly,
    min_weeks: v.min_weeks ?? defaultEngineSettings.min_weeks,
    levels: v.levels ?? defaultEngineSettings.levels,
    vu_bars: v.vu_bars ?? defaultEngineSettings.vu_bars,
    vu_max: v.vu_max ?? defaultEngineSettings.vu_max,
  };
  return (
    <PricesScreen
      sections={(sections ?? []).map(strip) as unknown as SectionRow[]}
      options={(options ?? []).map((o) => strip({ ...o, weeks_factor: o.weeks_factor === null ? null : Number(o.weeks_factor) })) as unknown as OptionRow[]}
      engine={engine}
    />
  );
}
