import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { loadMedia, mediaUsage } from "@/admin/data";
import { MediaLibraryProvider } from "@/admin/media/library";
import { MediaScreen } from "@/admin/screens/MediaScreen";

export const metadata: Metadata = { title: "Medios" };

export default async function MediaPage() {
  await requirePageUser();
  const [media, usage] = await Promise.all([loadMedia(), mediaUsage()]);
  return (
    <MediaLibraryProvider initial={media}>
      <MediaScreen usage={usage} />
    </MediaLibraryProvider>
  );
}
