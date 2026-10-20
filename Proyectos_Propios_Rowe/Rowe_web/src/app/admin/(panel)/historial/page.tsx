import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { HistoryScreen, type AuditRow, type ReleaseRow } from "@/admin/screens/HistoryScreen";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Historial" };

const PAGE = 200;

export default async function HistoryPage({ searchParams }: PageProps<"/admin/historial">) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const before = typeof sp.antes === "string" && /^\d+$/.test(sp.antes) ? Number(sp.antes) : null;
  const supabase = await createSupabaseServer();
  let q = supabase.from("audit_log").select("id, table_name, action, category, summary, before, after, actor_name, created_at").order("id", { ascending: false }).limit(PAGE);
  if (before) q = q.lt("id", before);
  const [{ data: rows }, { data: rel }, { data: profiles }] = await Promise.all([
    q,
    supabase.from("releases").select("version, note, published_at, published_by").order("version", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, email, full_name"),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  const releases: ReleaseRow[] = (rel ?? []).map((r) => ({ version: r.version, note: r.note, published_at: r.published_at, who: (r.published_by && names.get(r.published_by)) || "Sistema" }));
  const list = (rows ?? []) as AuditRow[];
  return (
    <HistoryScreen
      rows={list}
      releases={releases}
      isAdmin={user.role === "admin"}
      liveVersion={releases[0]?.version ?? null}
      more={list.length === PAGE ? `/admin/historial?antes=${list.at(-1)!.id}` : null}
    />
  );
}
