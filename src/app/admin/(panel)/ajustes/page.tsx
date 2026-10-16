import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { loadMedia } from "@/admin/data";
import { MediaLibraryProvider } from "@/admin/media/library";
import { SettingsScreen, type PageRow, type SettingRow } from "@/admin/screens/SettingsScreen";
import { siteHost } from "@/lib/site";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/ajustes">) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  const [{ data: settings }, { data: pages }, media] = await Promise.all([
    supabase.from("site_settings").select("key, label, value, is_public, editor_can_edit").order("key"),
    supabase.from("pages").select("id, slug, kind, title, intro, blocks, seo_title, seo_description, og_media_id, updated_at").order("slug"),
    loadMedia(),
  ]);
  const isAdmin = user.role === "admin";
  // Un editor solo ve los ajustes que puede cambiar (la base de datos lo exige igualmente)
  const visible = ((settings ?? []) as SettingRow[]).filter((s) => isAdmin || s.editor_can_edit);
  return (
    <MediaLibraryProvider initial={media}>
      <SettingsScreen settings={visible} pages={(pages ?? []) as PageRow[]} isAdmin={isAdmin} host={siteHost} initialTab={typeof sp.tab === "string" ? sp.tab : null} />
    </MediaLibraryProvider>
  );
}
