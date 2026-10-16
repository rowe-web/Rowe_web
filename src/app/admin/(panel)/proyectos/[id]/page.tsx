import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ProjectInput } from "@/admin/actions/projects";
import { requirePageUser } from "@/admin/auth";
import { loadMedia } from "@/admin/data";
import { MediaLibraryProvider } from "@/admin/media/library";
import { ProjectEditor } from "@/admin/screens/ProjectEditor";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar proyecto" };

export default async function EditProjectPage({ params }: PageProps<"/admin/proyectos/[id]">) {
  const user = await requirePageUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSupabaseServer();
  const [{ data: p }, { data: gallery }, media] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_media").select("media_id").eq("project_id", id).order("position"),
    loadMedia(),
  ]);
  if (!p) notFound();
  const initial: ProjectInput = {
    title: p.title,
    slug: p.slug,
    client: p.client,
    sector: p.sector,
    year: p.year,
    category: p.category,
    summary: p.summary,
    challenge: p.challenge,
    solution: p.solution,
    result: p.result,
    metrics: Array.isArray(p.metrics) && p.metrics.length ? p.metrics : [{ value: "", label: "" }],
    cover_id: p.cover_id,
    video_id: p.video_id,
    client_url: p.client_url,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
    status: p.status,
    featured: p.featured,
    gallery: (gallery ?? []).map((g) => g.media_id as string),
  };
  return (
    <MediaLibraryProvider initial={media}>
      <ProjectEditor key={id} id={id} initial={initial} isAdmin={user.role === "admin"} isPlaceholder={p.is_placeholder} />
    </MediaLibraryProvider>
  );
}
