import { Suspense } from "react";
import { requirePageUser } from "@/admin/auth";
import { AdminShell, type DraftStatus } from "@/admin/shell/AdminShell";
import { PanelSkeleton } from "@/admin/shell/PanelSkeleton";
import { NoAccess } from "@/admin/shell/NoAccess";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Panel: la sesión se lee detrás de un Suspense (requisito de Cache Components). */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}

async function Panel({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  if (!user.role) return <NoAccess email={user.email} />;

  const supabase = await createSupabaseServer();
  const [status, leads] = await Promise.all([
    supabase.rpc("draft_status"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "nuevo"),
  ]);

  return (
    <AdminShell user={{ ...user, role: user.role }} status={(status.data as DraftStatus) ?? { dirty: false, version: null, published_at: null, published_by: null, last_change_at: null, last_change_by: null, last_change: null }} newLeads={leads.count ?? 0}>
      {children}
    </AdminShell>
  );
}
