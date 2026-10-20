import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { loadMedia } from "@/admin/data";
import { MediaLibraryProvider } from "@/admin/media/library";
import { emptyProject } from "@/admin/projects";
import { ProjectEditor } from "@/admin/screens/ProjectEditor";

export const metadata: Metadata = { title: "Nuevo proyecto" };

export default async function NewProjectPage() {
  const user = await requirePageUser();
  const media = await loadMedia();
  return (
    <MediaLibraryProvider initial={media}>
      <ProjectEditor id={null} initial={emptyProject(new Date().getFullYear())} isAdmin={user.role === "admin"} />
    </MediaLibraryProvider>
  );
}
