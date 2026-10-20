import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { loadMedia } from "@/admin/data";
import { MediaLibraryProvider } from "@/admin/media/library";
import { ProjectsScreen, type ProjectListRow } from "@/admin/screens/ProjectsScreen";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProjectsPage() {
  await requirePageUser();
  const supabase = await createSupabaseServer();
  const [{ data }, media] = await Promise.all([
    supabase.from("projects").select("id, slug, title, sector, year, category, status, featured, is_placeholder, cover_id, position").order("position").order("year", { ascending: false }),
    loadMedia(),
  ]);
  return (
    <MediaLibraryProvider initial={media}>
      <ProjectsScreen projects={(data ?? []) as ProjectListRow[]} />
    </MediaLibraryProvider>
  );
}
