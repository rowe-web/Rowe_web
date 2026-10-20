import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { loadMedia } from "@/admin/data";
import { MediaLibraryProvider } from "@/admin/media/library";
import { TextsScreen, type SceneRow } from "@/admin/screens/TextsScreen";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Textos y escenas" };

export default async function TextsPage({ searchParams }: PageProps<"/admin/textos">) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  const [{ data: scenes }, media] = await Promise.all([
    supabase.from("scenes").select("id, key, position, visible, name, kicker, title, body, cta_label, cta_href, media_id, poster_id, data").order("position"),
    loadMedia(),
  ]);
  return (
    <MediaLibraryProvider initial={media}>
      <TextsScreen scenes={(scenes ?? []) as SceneRow[]} initialKey={typeof sp.escena === "string" ? sp.escena : null} isAdmin={user.role === "admin"} />
    </MediaLibraryProvider>
  );
}
