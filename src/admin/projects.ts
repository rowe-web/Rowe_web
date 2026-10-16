import type { ProjectInput } from "@/admin/actions/projects";

/** Proyecto en blanco para «+ Nuevo proyecto». */
export function emptyProject(year: number): ProjectInput {
  return {
    title: "",
    slug: "",
    client: "",
    sector: "",
    year,
    category: "Web",
    summary: "",
    challenge: "",
    solution: "",
    result: "",
    metrics: [
      { value: "", label: "" },
      { value: "", label: "" },
      { value: "", label: "" },
    ],
    cover_id: null,
    video_id: null,
    client_url: "",
    seo_title: "",
    seo_description: "",
    status: "borrador",
    featured: false,
    gallery: [],
  };
}
