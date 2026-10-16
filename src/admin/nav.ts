import type { Role } from "./auth";

/** Iconos del diseño (trazos SVG 16×16). */
export const ICONS = {
  dashboard: "M2 7.5 8 2.5l6 5V14H2z",
  leads: "M2 3.5h12v9H2z M2 4l6 5 6-5",
  stats: "M3 13V8 M8 13V3 M13 13V6",
  texts: "M3 4h10 M3 8h10 M3 12h6",
  projects: "M2 2h5v5H2z M9 2h5v5H9z M2 9h5v5H2z M9 9h5v5H9z",
  prices: "M8 1.5v13 M11.5 4.5h-5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4h-5",
  media: "M2 3h12v10H2z M2 11l4-4 3 3 2-2 3 3",
  users: "M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5",
  history: "M2.5 8a5.5 5.5 0 1 0 1.6-3.9 M2.5 2.5v2.5H5 M8 5v3.5l2 1.5",
  settings: "M2 4h12 M2 8h12 M2 12h12 M5 2.5v3 M11 6.5v3 M7 10.5v3",
  more: "M3 8h.01 M8 8h.01 M13 8h.01",
} as const;

export interface NavItem {
  id: keyof typeof ICONS;
  label: string;
  href: string;
  /** Roles que lo ven. */
  roles: Role[];
}

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "General",
    items: [
      { id: "dashboard", label: "Inicio", href: "/admin", roles: ["admin", "editor"] },
      { id: "leads", label: "Mensajes", href: "/admin/mensajes", roles: ["admin", "editor"] },
      { id: "stats", label: "Estadísticas", href: "/admin/estadisticas", roles: ["admin", "editor"] },
    ],
  },
  {
    label: "Contenido",
    items: [
      { id: "texts", label: "Textos y escenas", href: "/admin/textos", roles: ["admin", "editor"] },
      { id: "projects", label: "Proyectos", href: "/admin/proyectos", roles: ["admin", "editor"] },
      { id: "prices", label: "Precios", href: "/admin/precios", roles: ["admin"] },
      { id: "media", label: "Medios", href: "/admin/medios", roles: ["admin", "editor"] },
    ],
  },
  {
    label: "Equipo",
    items: [
      { id: "users", label: "Usuarios", href: "/admin/usuarios", roles: ["admin"] },
      { id: "history", label: "Historial", href: "/admin/historial", roles: ["admin", "editor"] },
      { id: "settings", label: "Ajustes", href: "/admin/ajustes", roles: ["admin", "editor"] },
    ],
  },
];

export function navFor(role: Role) {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
}

/** Título de la sección actual a partir de la ruta. */
export function sectionFor(pathname: string) {
  const all = NAV.flatMap((g) => g.items);
  return [...all].sort((a, b) => b.href.length - a.href.length).find((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href))) ?? all[0];
}
