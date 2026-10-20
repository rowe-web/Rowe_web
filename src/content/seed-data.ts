/**
 * Contenido inicial de la web, extraído de los archivos de diseño (design/*.dc.html).
 * Lo carga `npm run db:seed`. A partir de ahí, todo se edita desde el panel.
 *
 * Convenciones de texto editable:
 *   *texto*  → cursiva serif (Instrument Serif), como en los titulares del diseño
 *   \n       → salto de línea en titulares
 *   [ … ]    → dato provisional que hay que sustituir (teléfono, ciudad…)
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface SeedSetting {
  key: string;
  label: string;
  value: Json;
  isPublic: boolean;
  editorCanEdit: boolean;
}

export interface SeedScene {
  key: string;
  name: string;
  kicker: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  visible?: boolean;
  data: Json;
}

export interface SeedService {
  discipline: "web" | "audiovisual";
  slug: string;
  title: string;
  description: string;
}

export interface SeedPage {
  slug: string;
  kind: "service" | "projects" | "contact" | "legal" | "system";
  title: string;
  intro: string;
  blocks: Json;
  seoTitle: string;
  seoDescription: string;
}

export interface SeedProject {
  slug: string;
  title: string;
  client: string;
  sector: string;
  year: number;
  category: "Web" | "Audiovisual" | "Web + Audiovisual";
  summary: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: { value: string; label: string }[];
  status: "borrador" | "publicado";
  featured: boolean;
}

export interface SeedConfigSection {
  key: string;
  takeLabel: string;
  title: string;
  description?: string;
  requires?: Json;
  lockedTitle?: string;
  lockedBody?: string;
  lockedCta?: string;
  lockedSelect?: string;
}

export interface SeedConfigOption {
  section: string;
  key: string;
  control: "card" | "segment" | "toggle" | "stepper";
  setKey?: string;
  setLabel?: string;
  setDescription?: string;
  badge?: string;
  label: string;
  description?: string;
  lineLabel?: string;
  priceMin: number;
  priceMax: number;
  priceMode?: "once" | "monthly" | "percent_once";
  unitLabel?: string;
  track?: "WE" | "RO";
  isBase?: boolean;
  components?: { label: string; track: "WE" | "RO"; min: number; max: number; base?: boolean }[];
  modifiesBase?: boolean;
  baseSuffix?: string;
  weeksMin?: number;
  weeksMax?: number;
  weeksFactor?: number;
  stepper?: { min: number; max: number; included: number };
  isDefault?: boolean;
  /** Solo cuenta (y solo se puede pulsar) si se cumple: p. ej. mantenimiento ⇢ hay web. */
  requires?: Json;
}

export interface SeedLead {
  name: string;
  company: string;
  sector: string;
  need: string;
  budgetLabel: string;
  origin: "formulario" | "configurador";
  items: string;
  message: string;
  email: string;
  phone: string;
  hoursAgo: number;
  status: "nuevo" | "contactado" | "cerrado";
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

/** SEO de la home: el h1 es el eslogan; título y descripción dicen qué hacemos y dónde. */
export const HOME_SEO = {
  title: "ROWE — Diseño web a medida y vídeo para empresas",
  description: "Webs a medida para negocios de toda España y vídeo para redes grabado en el Camp de Tarragona: Tarragona, Reus, Salou y Cambrils. Pide tu presupuesto.",
};

/** Hero: frase de posicionamiento (encima del texto) y texto corto que ya no la repite. */
export const HERO_TEXT = {
  claim: "Diseñamos *webs a medida* para negocios de toda España y grabamos su contenido en el Camp de Tarragona.",
  body: "Estudio boutique de web y audiovisual. Un solo equipo, sin intermediarios ni plantillas.",
};

/** Dónde trabajamos (Ajustes → Contacto): webs 100 % online; rodajes solo en el Camp de Tarragona. */
export const SERVICE_AREA = {
  service_area_web: "Webs para toda España, 100 % online",
  service_area_video: "Rodajes en el Camp de Tarragona",
  service_area_cities: ["Tarragona", "Reus", "Salou", "Cambrils", "Vila-seca"],
  service_area_note: "Fuera de la zona, consúltanos el desplazamiento",
};

export const settings: SeedSetting[] = [
  {
    key: "contact",
    label: "Contacto y redes",
    isPublic: true,
    editorCanEdit: false,
    value: {
      email_contact: "rowe.web.contacto@gmail.com",
      email_admin: "rowe.web.agency@gmail.com",
      email_social: "rowe.web.redes@gmail.com",
      phone: "[+34 600 000 000]",
      whatsapp: "[+34 600 000 000]",
      address: "[Ciudad, Provincia]",
      hours: "L–V · 9:00–18:00",
      instagram: "@rowe.estudio",
      tiktok: "@rowe.estudio",
      linkedin: "linkedin.com/company/rowe",
      youtube: "youtube.com/@rowe",
      ...SERVICE_AREA,
    },
  },
  {
    key: "seo",
    label: "SEO general",
    isPublic: true,
    editorCanEdit: false,
    value: {
      title: HOME_SEO.title,
      description: HOME_SEO.description,
      og_media_id: null,
    },
  },
  {
    key: "brand",
    label: "Marca y textos generales",
    isPublic: true,
    editorCanEdit: true,
    value: {
      tagline: "Web & Audiovisual",
      year: "2026",
      city: "Camp de Tarragona · Toda España",
      legend: ["RO — Rodaje", "WE — Web"],
      credits: "Dirección: ROWE · Web: ROWE · Audiovisual: ROWE",
      tab_away_title: "ROWE en pausa — vuelve pronto",
      ambient_on: "Sonido ambiente · On",
      ambient_off: "Sonido ambiente · Off",
      ambient_audio_media_id: null,
      not_found_title: "Escena eliminada *en el montaje.*",
      not_found_body: "Esta página no ha llegado al corte final. Vuelve al inicio o pide tu propuesta.",
    },
  },
  {
    key: "cookies",
    label: "Banner de cookies",
    isPublic: true,
    editorCanEdit: false,
    value: {
      enabled: true,
      text: "Usamos cookies para medir visitas y mejorar la web. Tú decides.",
      accept: "Aceptar",
      reject: "Rechazar",
      configure: "Configurar",
    },
  },
  {
    key: "configurator",
    label: "Configurador de presupuesto (textos y reglas)",
    isPublic: true,
    editorCanEdit: false,
    value: {
      kicker: "Escena 09 — Tu presupuesto",
      meta: "Web · Audiovisual",
      title: "Calcula tu\n*presupuesto.*",
      lead: "Elige lo que necesitas y te damos un rango orientativo al momento. Después lo afinamos contigo y te enviamos un presupuesto cerrado.",
      promise: "Sin compromiso · Presupuesto cerrado · Respuesta en 24 h",
      monitor_label: "Presupuesto orientativo",
      rec_label: "Rec",
      standby_label: "Standby",
      empty_text: "Elige qué necesitas para empezar.",
      once_text: "Pago único",
      level_label: "Nivel de proyecto",
      levels: [
        { below: 1440, label: "Esencial" },
        { below: 2880, label: "Completo" },
        { below: null, label: "A medida" },
      ],
      vu_bars: 28,
      vu_max: 4480,
      round_once: 50,
      round_monthly: 10,
      min_weeks: 1,
      weeks_label: "Plazo estimado",
      includes_label: "Incluye siempre",
      includes: "Diseño a medida · Responsive · Formulario · Panel para editar · Velocidad · SEO básico",
      includes_content: "Guion · Rodaje vertical 9:16 · Edición y color · Subtítulos · Música con licencia",
      cta_send: "Enviar y hablemos",
      cta_pdf: "Descargar PDF",
      need_first: "Elige primero qué necesitas",
      disclaimer: "Precios orientativos de ejemplo · sustituir por tarifas ROWE. IVA no incluido.",
      empty_track: "Sin clips",
      add_content_hint: "Añade contenido",
      add_web_hint: "Añade web",
      mobile_label: "Orientativo",
      mobile_cta: "Resumen ↓",
      pdf: {
        title: "Tu proyecto, *en cifras.*",
        label: "Presupuesto orientativo",
        note: "Rango orientativo, IVA no incluido. Tras el briefing te enviamos un presupuesto cerrado. Validez: 30 días.",
        validity_days: 30,
        file_name: "Presupuesto_ROWE.pdf",
      },
    },
  },
  {
    key: "hablemos",
    label: "Formulario «Hablemos»",
    isPublic: true,
    editorCanEdit: true,
    value: {
      kicker: "Escena 10 — Hablemos",
      title: "¿Empezamos tu próximo *proyecto?*",
      lead: "Cuéntanos qué necesitas. Te respondemos en menos de 24 h.",
      promise: "Sin compromiso · Presupuesto cerrado · Respuesta en 24 h",
      overlay_title: "*Hablemos.*",
      overlay_lead: "Cinco tomas cortas. La primera es de un clic. Te respondemos en menos de 24 h.",
      prefill_label: "Viene del configurador",
      prefill_overlay_label: "Tu configuración",
      prefill_edit: "Editar ↑",
      steps: [
        { kicker: "Pregunta 01", title: "¿Qué *necesitas?*", hint: "Un clic y seguimos" },
        { kicker: "Pregunta 02", title: "¿A qué se dedica *tu negocio?*", hint: "Un clic y seguimos" },
        { kicker: "Pregunta 03", title: "Presupuesto *aproximado*", hint: "Sin compromiso" },
        { kicker: "Pregunta 04", title: "Cuéntanos *un poco más*", hint: "Opcional" },
        { kicker: "Pregunta 05", title: "¿Cómo *te contactamos?*", hint: "Respuesta en 24 h" },
      ],
      needs: [
        { key: "A", label: "Web" },
        { key: "B", label: "Audiovisual" },
        { key: "C", label: "Las dos cosas" },
      ],
      sectors: ["Salud", "Restauración", "Despacho profesional", "Comercio", "Bienestar", "Inmobiliaria", "Empresa B2B", "Otro"],
      budgets: ["Menos de 1.000 €", "1.000 – 2.500 €", "2.500 – 5.000 €", "Más de 5.000 €", "Aún no lo sé"],
      budget_from_configurator: "Del configurador",
      message_placeholder: "Qué haces, qué te gustaría conseguir, si tienes web actual, plazos…",
      message_max: 600,
      optional: "Opcional",
      fields: {
        name: "Nombre *",
        name_placeholder: "Tu nombre",
        company: "Empresa",
        company_placeholder: "Nombre del negocio",
        email: "Email *",
        email_placeholder: "tu@negocio.es",
        phone: "Teléfono",
        phone_placeholder: "[+34 600 000 000]",
        city: "Ubicación / Ciudad *",
        city_placeholder: "Ej. Madrid, Barcelona...",
        privacy: "He leído y acepto la política de privacidad.",
        privacy_link: "Leer la política de privacidad",
      },
      errors: {
        name: "Necesitamos tu nombre para dirigirnos a ti.",
        email: "Revisa el email: parece incompleto.",
        privacy: "Acepta la política de privacidad para continuar.",
        city: "Indícanos tu ciudad para valorar el desplazamiento.",
        send_title: "No se ha podido enviar.",
        send_body: "Revisa tu conexión e inténtalo de nuevo, o escríbenos a {email}.",
      },
      next: "Siguiente →",
      back: "← Atrás",
      submit: "Enviar solicitud",
      loading: "Grabando…",
      retry: "Reintentar",
      success_meta: "Toma 01 · Corten · 00:00:05:24",
      success_title: "Toma 1. *Grabado.*",
      success_body: "Gracias{name}. Te respondemos en menos de 24 h en {email}.",
      success_reset: "Enviar otra solicitud",
      copy: "Copiar",
      copied: "Copiado ✓",
    },
  },
  {
    key: "navigation",
    label: "Menú y pie de página",
    isPublic: true,
    editorCanEdit: true,
    value: {
      menu_label: "Menú",
      close_label: "Cerrar",
      cta_label: "Hablemos",
      cta_href: "/#hablemos",
      menu_kicker: "Índice de escenas",
      items: [
        { label: "Inicio", href: "/", caption: "Fig. 00 — Showreel", summary: "El showreel y el método ROWE de un vistazo: web, contenido y tráfico trabajando juntos." },
        { label: "Desarrollo web", href: "/web", caption: "Fig. 01 — Web en movimiento", summary: "Webs a medida, rápidas y pensadas para convertir: diseño, desarrollo, SEO y mantenimiento." },
        { label: "Producción audiovisual", href: "/audiovisual", caption: "Fig. 02 — Rodaje", summary: "Guion, rodaje y edición: reels verticales, vídeo corporativo y fotografía para tu marca." },
        { label: "Proyectos", href: "/proyectos", caption: "Fig. 03 — Trabajos recientes", summary: "Trabajos recientes de web y audiovisual: el reto, la solución y lo que consiguieron." },
        { label: "Presupuesto", href: "/#presupuesto", caption: "Fig. 04 — Calcula tu presupuesto", summary: "Elige lo que necesitas y ve al momento un precio orientativo, sin compromiso." },
        { label: "Hablemos", href: "/#hablemos", caption: "Fig. 05 — ¿Empezamos tu próximo proyecto?", summary: "Cuéntanos tu idea por formulario, WhatsApp o email. Te respondemos en menos de 24 h." },
      ],
      footer_title: "¿Empezamos tu próximo *proyecto?*",
      footer_end: "Fin",
      legal: [
        { label: "Aviso legal", href: "/aviso-legal" },
        { label: "Privacidad", href: "/privacidad" },
        { label: "Cookies", href: "/cookies" },
      ],
      preloader_label: "Escena 00 — Hero",
      preloader_meta: "2.39:1 · 25 fps",
      preloader_steps: ["npm run build", "render · 2.39:1 · 25 fps", "deploy → producción"],
    },
  },
  {
    key: "legal",
    label: "Datos legales (titular de la web)",
    isPublic: true,
    editorCanEdit: false,
    value: {
      owner: "[Nombre y apellidos o razón social]",
      nif: "[NIF / CIF]",
      address: "[Dirección completa, CP, ciudad]",
      email: "rowe.web.contacto@gmail.com",
      hosting: "[Vercel Inc. · por confirmar]",
      updated: "16 de octubre de 2026",
    },
  },
  {
    key: "notifications",
    label: "Avisos por email (interno)",
    isPublic: false,
    editorCanEdit: false,
    value: {
      lead_recipients: ["rowe.web.agency@gmail.com", "rowe.web.contacto@gmail.com"],
    },
  },
];

// ---------------------------------------------------------------------------
// Escenas de la home (orden = posición)
// Las escenas 02–08 no tienen diseño todavía: textos del panel del diseño
// (ROWE Admin) y estructura provisional que se cerrará al diseñarlas (Fase 2).
// ---------------------------------------------------------------------------
export const scenes: SeedScene[] = [
  {
    key: "hero",
    name: "Hero",
    kicker: "Escena 00",
    title: "Que te vean.\nQue *confíen.*\nQue te *elijan.*",
    body: HERO_TEXT.body,
    ctaLabel: "Pide tu propuesta",
    ctaHref: "#presupuesto",
    data: {
      claim: HERO_TEXT.claim,
      secondary_cta: { label: "Ver proyectos", href: "/proyectos" },
      reel_label: "Showreel",
      sound_label: "Sonido off · R",
      scroll_hint: "Desliza",
      photo_caption: "Fig. 01 — Proceso ROWE · web, contenido y tráfico",
      process_video_media_id: null,
      process_steps: [
        { key: "WE", label: "Web" },
        { key: "RO", label: "Contenido" },
        { key: "↗", label: "Tráfico" },
      ],
      video_caption: "Fig. 02 — Showreel 2026 · 2.39:1",
      program_label: "PGM — Showreel_v12",
      format_label: "2.39:1 · 25 fps",
      sequence_label: "Secuencia · Home",
      // Pistas de la línea de tiempo bajo el showreel (1b). Cada clip es un enlace.
      tracks: [
        {
          key: "RO",
          label: "Rodaje",
          clips: [
            { label: "Showreel_v12", href: "#hero-reel", size: 3 },
            { label: "Clinica_Mar", href: "/proyectos/clinica-dental-mar", size: 2.6 },
            { label: "Brasa_reel_15s", href: "/proyectos/restaurante-brasa", size: 3.2 },
            { label: "Opticas_Luz", href: "/proyectos/opticas-luz", size: 2.2 },
          ],
        },
        {
          key: "WE",
          label: "Web",
          clips: [
            { label: "Home", href: "/", size: 2.4 },
            { label: "Servicios", href: "/web", size: 2.8 },
            { label: "Proyectos", href: "/proyectos", size: 3.2 },
            { label: "Contacto", href: "/contacto", size: 2.1 },
          ],
        },
      ],
    },
  },
  {
    key: "estudio",
    name: "El estudio",
    kicker: "Escena 01 — El estudio",
    title: "Somos ROWE.",
    body: "Un estudio pequeño *a propósito.* Rodamos los vídeos que hacen que *se fijen en ti* y construimos la web que hace que *te elijan.* Sin intermediarios, sin plantillas, sin procesos eternos.",
    ctaLabel: "",
    ctaHref: "",
    data: {
      stats: [
        { value: "2", label: "disciplinas" },
        { value: "1", label: "equipo" },
        { value: "0", label: "plantillas" },
      ],
      tracks: [
        { key: "V1", word: "RO", label: "Rodaje", hover: "Vídeo de rodaje en la máscara" },
        { key: "V2", word: "WE", label: "Web", hover: "Web en movimiento" },
      ],
      master: { key: "Master", word: "ROWE", label: "Web & Audiovisual" },
    },
  },
  {
    key: "servicios",
    name: "Servicios",
    kicker: "Escena 02 — Servicios",
    title: "Web y *audiovisual.*",
    body: "Dos disciplinas, un mismo equipo.",
    ctaLabel: "Ver servicio",
    ctaHref: "/web",
    data: {},
  },
  {
    key: "web",
    name: "Desarrollo web",
    kicker: "Escena 03 — WE · Web",
    title: "Webs que *trabajan por ti.*",
    body: "Diseñamos y desarrollamos webs a medida, rápidas y pensadas para que quien llegue sepa en segundos qué haces y cómo contactarte.",
    ctaLabel: "Ver servicio",
    ctaHref: "/web",
    data: {
      url_label: "tu-negocio.es",
      screen_caption: "Fig. 03 — Web en movimiento",
      view_desktop: "Escritorio",
      view_mobile: "Móvil",
      mobile_media_id: null,
      specs: [
        { label: "Velocidad", value: "Carga en menos de 1,5 s" },
        { label: "Responsive", value: "Móvil · tablet · escritorio" },
        { label: "Panel", value: "Editas tú, sin depender de nadie" },
        { label: "SEO", value: "Básico incluido · local opcional" },
      ],
    },
  },
  {
    key: "audiovisual",
    name: "Audiovisual",
    kicker: "Escena 04 — RO · Rodaje",
    title: "Vídeos que *paran el scroll.*",
    body: "Rodamos y editamos contenido para redes y comunicación comercial. Piezas cortas, cuidadas y pensadas para que tu cliente se quede mirando.",
    ctaLabel: "Ver servicio",
    ctaHref: "/audiovisual",
    data: {
      reels: [
        { label: "Reel 01 — Cocina", duration: "00:00:15:00", sector: "Restauración" },
        { label: "Reel 02 — Consulta", duration: "00:00:24:00", sector: "Salud" },
        { label: "Reel 03 — Apertura", duration: "00:00:12:00", sector: "Comercio" },
      ],
      formats: ["4–12 reels al mes", "Vídeo corporativo 60–90 s", "Sesión de fotografía", "Jornadas de rodaje"],
    },
  },
  {
    key: "ecosistema",
    name: "Ecosistema",
    kicker: "Escena 05 — Ecosistema",
    title: "Uno atrae.\n*El otro convierte.*",
    body: "Mismo equipo, misma estética, mismo mensaje. Así tu marca se ve igual de profesional en todas partes.",
    ctaLabel: "Quiero el pack completo",
    ctaHref: "#presupuesto",
    data: {
      steps: [
        { key: "01", track: "RO", title: "Rodamos", body: "Vídeos cortos que muestran tu negocio tal y como es." },
        { key: "02", track: "RO", title: "Publicas", body: "Reels que paran el scroll y hacen que se fijen en ti." },
        { key: "03", track: "WE", title: "Te visitan", body: "Llegan a una web rápida, clara y con tu misma estética." },
        { key: "04", track: "WE", title: "Te eligen", body: "Reservan, llaman o escriben. Un cliente más." },
      ],
    },
  },
  {
    key: "proceso",
    name: "Proceso",
    kicker: "Escena 06 — Proceso",
    title: "Del briefing *al estreno.*",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    data: {
      steps: [
        { key: "01", title: "Briefing", body: "Una reunión para entender tu negocio, tus clientes y tus objetivos.", duration: "Día 1" },
        { key: "02", title: "Guion y diseño", body: "Estructura, textos, estética y plan de rodaje. Lo validas antes de seguir.", duration: "Semana 1" },
        { key: "03", title: "Rodaje y desarrollo", body: "Grabamos y construimos en paralelo, con el mismo equipo.", duration: "Semanas 2–4" },
        { key: "04", title: "Estreno", body: "Publicamos, medimos y te enseñamos a editar tu web.", duration: "Día de estreno" },
      ],
    },
  },
  {
    key: "proyectos",
    name: "Proyectos",
    kicker: "Escena 07 — Proyectos",
    title: "Trabajos *recientes.*",
    body: "",
    ctaLabel: "¿Quieres un resultado así?",
    ctaHref: "#hablemos",
    data: { all_label: "Ver todos los proyectos", all_href: "/proyectos", drag_label: "Arrastra ←→" },
  },
  {
    key: "filosofia",
    name: "Filosofía",
    kicker: "Escena 08 — Filosofía",
    title: "Lo que nos *diferencia.*",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    data: {
      points: [
        { key: "01", title: "Pequeños a propósito", body: "Hablas siempre con quien rueda y con quien programa. Sin intermediarios." },
        { key: "02", title: "Cero plantillas", body: "Cada web y cada vídeo se diseñan para tu negocio, no para cualquiera." },
        { key: "03", title: "Un solo equipo", body: "La web y el vídeo comparten estética y mensaje desde el primer día." },
        { key: "04", title: "Plazos claros", body: "Presupuesto cerrado y calendario de rodaje y entrega desde el principio." },
      ],
    },
  },
  {
    key: "presupuesto",
    name: "Presupuesto",
    kicker: "Escena 09 — Tu presupuesto",
    title: "Calcula tu *presupuesto.*",
    body: "Elige lo que necesitas y te damos un rango orientativo al momento.",
    ctaLabel: "Enviar y hablemos",
    ctaHref: "#hablemos",
    data: {},
  },
  {
    key: "hablemos",
    name: "Hablemos",
    kicker: "Escena 10 — Hablemos",
    title: "¿Empezamos tu próximo *proyecto?*",
    body: "Cuéntanos qué necesitas. Te respondemos en menos de 24 h.",
    ctaLabel: "Enviar solicitud",
    ctaHref: "",
    data: {},
  },
];

// ---------------------------------------------------------------------------
// Servicios (derivados de las opciones del configurador)
// ---------------------------------------------------------------------------
export const services: SeedService[] = [
  { discipline: "web", slug: "web-a-medida", title: "Web a medida", description: "Diseño y desarrollo desde cero, con tu marca y tus objetivos." },
  { discipline: "web", slug: "rediseno", title: "Rediseño", description: "Tu web actual, a la altura de tu negocio actual." },
  { discipline: "web", slug: "reservas", title: "Reservas y citas online", description: "Agenda online para clínicas, restaurantes y servicios." },
  { discipline: "web", slug: "tienda-online", title: "Tienda online", description: "Catálogo, carrito y pagos seguros." },
  { discipline: "web", slug: "seo-local", title: "SEO local", description: "Que te encuentren en Google en tu zona." },
  { discipline: "web", slug: "idiomas", title: "Webs en varios idiomas", description: "Tu web en los idiomas de tus clientes." },
  { discipline: "web", slug: "mantenimiento", title: "Mantenimiento", description: "Actualizaciones, copias de seguridad y cambios menores." },
  { discipline: "audiovisual", slug: "reels", title: "Reels para redes", description: "Rodaje y edición de piezas cortas cada mes." },
  { discipline: "audiovisual", slug: "video-corporativo", title: "Vídeo corporativo", description: "Una pieza de 60–90 s que cuenta quién eres." },
  { discipline: "audiovisual", slug: "fotografia", title: "Sesión de fotografía", description: "Fotos profesionales de tu negocio, equipo y producto." },
  { discipline: "audiovisual", slug: "jornada-de-rodaje", title: "Jornadas de rodaje", description: "Un día de grabación para sacar contenido para meses." },
];

// ---------------------------------------------------------------------------
// Páginas internas y legales: ver seed-pages.ts
// ---------------------------------------------------------------------------
export { pages } from "./seed-pages";

// ---------------------------------------------------------------------------
// Proyectos de EJEMPLO del diseño (is_placeholder = true).
// Son ficticios: hay que sustituirlos por trabajos reales antes del lanzamiento.
// ---------------------------------------------------------------------------
export const projects: SeedProject[] = [
  {
    slug: "clinica-dental-mar", title: "Clínica Dental Mar", client: "Clínica Dental Mar", sector: "Salud", year: 2026,
    category: "Web + Audiovisual", status: "publicado", featured: true,
    summary: "Web a medida con reservas online y reels del equipo en consulta.",
    challenge: "Una clínica con buena reputación local pero sin presencia digital a su altura.",
    solution: "Web a medida con reservas online y una serie de reels del equipo en consulta.",
    result: "Más citas desde la web y una imagen coherente en redes y en Google.",
    metrics: [{ value: "+38 %", label: "citas online" }, { value: "12", label: "reels publicados" }, { value: "1,2 s", label: "tiempo de carga" }],
  },
  {
    slug: "bufete-ferrer-asociados", title: "Bufete Ferrer & Asociados", client: "Ferrer & Asociados", sector: "Despacho profesional", year: 2026,
    category: "Web", status: "publicado", featured: false,
    summary: "Una web sobria y clara con las áreas de práctica y consulta online.",
    challenge: "Un despacho con mucha experiencia y una web que no la transmitía.",
    solution: "Web sobria, con las áreas de práctica bien explicadas y un formulario de consulta.",
    result: "Consultas mejor cualificadas desde el primer mes.",
    metrics: [{ value: "6", label: "áreas de práctica" }, { value: "+24 %", label: "consultas" }, { value: "0,9 s", label: "tiempo de carga" }],
  },
  {
    slug: "restaurante-brasa", title: "Restaurante Brasa", client: "Restaurante Brasa", sector: "Restauración", year: 2025,
    category: "Audiovisual", status: "publicado", featured: true,
    summary: "Reels mensuales de cocina y sala para Instagram.",
    challenge: "Un restaurante con una cocina espectacular que no se veía en redes.",
    solution: "Jornadas de rodaje mensuales y reels de cocina y sala.",
    result: "Más reservas en fin de semana y una cuenta de Instagram con identidad propia.",
    metrics: [{ value: "8", label: "reels al mes" }, { value: "x3", label: "alcance" }, { value: "15 s", label: "duración media" }],
  },
  {
    slug: "estudio-pilates-norte", title: "Estudio Pilates Norte", client: "Estudio Pilates Norte", sector: "Bienestar", year: 2025,
    category: "Web + Audiovisual", status: "publicado", featured: false,
    summary: "Web con reservas de clases y sesión de fotos del estudio.",
    challenge: "Las reservas se gestionaban por WhatsApp y la web no mostraba el estudio.",
    solution: "Web con reservas de clases, fotografía del espacio y una jornada de rodaje.",
    result: "Reservas automatizadas y menos tiempo al teléfono.",
    metrics: [{ value: "70 %", label: "reservas online" }, { value: "24", label: "fotos" }, { value: "1", label: "jornada de rodaje" }],
  },
  {
    slug: "opticas-luz", title: "Ópticas Luz", client: "Ópticas Luz", sector: "Comercio", year: 2025,
    category: "Audiovisual", status: "publicado", featured: false,
    summary: "Campaña de vídeo para la apertura de la segunda tienda.",
    challenge: "Dar a conocer la apertura de una segunda tienda en otra zona de la ciudad.",
    solution: "Campaña de vídeo corto para redes y una pieza principal de 45 s.",
    result: "Cola en la puerta el día de la inauguración.",
    metrics: [{ value: "45 s", label: "pieza principal" }, { value: "6", label: "piezas cortas" }, { value: "2", label: "tiendas" }],
  },
  {
    slug: "logistica-vela", title: "Logística Vela", client: "Logística Vela", sector: "Empresa B2B", year: 2026,
    category: "Web", status: "borrador", featured: false,
    summary: "Web corporativa en español e inglés para captar clientes B2B.",
    challenge: "Una empresa B2B que necesitaba captar clientes internacionales.",
    solution: "Web corporativa bilingüe con SEO y casos de cliente.",
    result: "En curso.",
    metrics: [{ value: "2", label: "idiomas" }, { value: "10", label: "páginas" }, { value: "B2B", label: "enfoque" }],
  },
];

// ---------------------------------------------------------------------------
// Configurador (ROWE Presupuesto.dc.html · Escena 09). Precios de ejemplo del diseño.
// ---------------------------------------------------------------------------
/** Tipos de proyecto que llevan web (los que no, «Solo contenido», bloquean tamaño y funciones). */
export const WEB_TYPES = ["nueva", "rediseno", "contenido"];
/** Tipos de proyecto que llevan rodaje. */
export const CONTENT_TYPES = ["contenido", "redes"];

export const configSections: SeedConfigSection[] = [
  { key: "tipo", takeLabel: "Toma 01", title: "¿Qué necesitas?" },
  {
    key: "tamano",
    takeLabel: "Toma 02",
    title: "Tamaño de la web",
    requires: { set: "tipo", in: WEB_TYPES },
    lockedTitle: "Sin web, *de momento.*",
    lockedBody: "Este presupuesto es solo de contenido. Si también quieres la web, la hacemos con el mismo equipo y la misma estética.",
    lockedCta: "Añadir web",
    lockedSelect: "contenido",
  },
  { key: "funciones", takeLabel: "Toma 03", title: "Funciones", requires: { set: "tipo", in: WEB_TYPES } },
  {
    key: "audiovisual",
    takeLabel: "Toma 04",
    title: "Contenido audiovisual",
    requires: { set: "tipo", in: CONTENT_TYPES },
    lockedTitle: "El vídeo atrae. *La web convierte.*",
    lockedBody: "Añade contenido y trabajamos las dos patas con el mismo equipo y la misma estética.",
    lockedCta: "Añadir contenido",
    lockedSelect: "contenido",
  },
  { key: "post", takeLabel: "Toma 05", title: "Después del estreno" },
];

export const configOptions: SeedConfigOption[] = [
  // Toma 01 · Tipo de proyecto (opción base, excluyente)
  { section: "tipo", key: "nueva", control: "card", setKey: "tipo", badge: "A", label: "Web nueva", lineLabel: "Web nueva", description: "Empezamos de cero, con tu marca y tus objetivos.", priceMin: 720, priceMax: 1120, isBase: true, weeksMin: 3, weeksMax: 4 },
  { section: "tipo", key: "rediseno", control: "card", setKey: "tipo", badge: "B", label: "Rediseño", lineLabel: "Rediseño", description: "Tu web actual, a la altura de tu negocio actual.", priceMin: 560, priceMax: 880, isBase: true, weeksMin: 2, weeksMax: 3 },
  {
    section: "tipo", key: "contenido", control: "card", setKey: "tipo", badge: "C", label: "Web + contenido", lineLabel: "Web + contenido",
    description: "Web y vídeo con el mismo equipo y la misma estética.", priceMin: 860, priceMax: 1320, isBase: true, weeksMin: 4, weeksMax: 5,
    components: [
      { label: "Web a medida", track: "WE", min: 720, max: 1120, base: true },
      { label: "Jornada de rodaje", track: "RO", min: 140, max: 200 },
    ],
  },
  {
    section: "tipo", key: "redes", control: "card", setKey: "tipo", badge: "D", label: "Solo contenido", lineLabel: "Rodaje para redes",
    description: "Sin web: guion, rodaje y edición de vídeo vertical para tus redes.", priceMin: 140, priceMax: 200, track: "RO", isBase: true, weeksMin: 1, weeksMax: 2,
  },
  // Toma 02 · Tamaño (excluyente)
  { section: "tamano", key: "landing", control: "segment", setKey: "paginas", label: "Landing · 1 página", priceMin: -240, priceMax: -360, modifiesBase: true, baseSuffix: " · landing", weeksMin: -1, weeksMax: -1 },
  { section: "tamano", key: "p5", control: "segment", setKey: "paginas", label: "Hasta 5 páginas", priceMin: 0, priceMax: 0, isDefault: true },
  { section: "tamano", key: "p10", control: "segment", setKey: "paginas", label: "Hasta 10 páginas", lineLabel: "Hasta 10 páginas", priceMin: 320, priceMax: 480, weeksMin: 1, weeksMax: 1 },
  { section: "tamano", key: "p10p", control: "segment", setKey: "paginas", label: "Más de 10", lineLabel: "Más de 10", priceMin: 720, priceMax: 1120, weeksMin: 2, weeksMax: 2 },
  // Toma 03 · Funciones
  { section: "funciones", key: "reservas", control: "toggle", label: "Reservas / citas", lineLabel: "Reservas / citas", description: "Agenda online para clínicas, restaurantes y servicios.", priceMin: 240, priceMax: 400, weeksMin: 0, weeksMax: 1 },
  { section: "funciones", key: "tienda", control: "toggle", label: "Tienda online", lineLabel: "Tienda online", description: "Catálogo, carrito y pagos seguros.", priceMin: 720, priceMax: 1200, weeksMin: 2, weeksMax: 2 },
  { section: "funciones", key: "seo", control: "toggle", label: "SEO local", lineLabel: "SEO local", description: "Que te encuentren en Google en tu zona.", priceMin: 200, priceMax: 320 },
  { section: "funciones", key: "idiomas", control: "stepper", label: "Idiomas", lineLabel: "Idiomas ×{n}", description: "El primero va incluido. Cada idioma extra suma.", priceMin: 160, priceMax: 240, unitLabel: "c/u", stepper: { min: 1, max: 4, included: 1 } },
  // Toma 04 · Audiovisual (con «Web + contenido» o «Solo contenido»)
  { section: "audiovisual", key: "reels0", control: "segment", setKey: "reels", setLabel: "Reels al mes", setDescription: "Rodaje y edición de piezas cortas para redes. Cuota mensual.", label: "No", priceMin: 0, priceMax: 0, priceMode: "monthly", track: "RO", isDefault: true },
  { section: "audiovisual", key: "reels4", control: "segment", setKey: "reels", setLabel: "Reels al mes", label: "4", lineLabel: "4 reels/mes", priceMin: 110, priceMax: 150, priceMode: "monthly", unitLabel: "/mes", track: "RO" },
  { section: "audiovisual", key: "reels8", control: "segment", setKey: "reels", setLabel: "Reels al mes", label: "8", lineLabel: "8 reels/mes", priceMin: 190, priceMax: 260, priceMode: "monthly", unitLabel: "/mes", track: "RO" },
  { section: "audiovisual", key: "reels12", control: "segment", setKey: "reels", setLabel: "Reels al mes", label: "12", lineLabel: "12 reels/mes", priceMin: 270, priceMax: 360, priceMode: "monthly", unitLabel: "/mes", track: "RO" },
  { section: "audiovisual", key: "fotos", control: "toggle", label: "Sesión de fotografía", lineLabel: "Sesión de fotos", description: "Fotos profesionales de tu negocio, equipo y producto.", priceMin: 100, priceMax: 160, track: "RO" },
  { section: "audiovisual", key: "video", control: "toggle", label: "Vídeo corporativo", lineLabel: "Vídeo corporativo", description: "Una pieza de 60–90 s que cuenta quién eres.", priceMin: 240, priceMax: 440, track: "RO", weeksMin: 0, weeksMax: 1 },
  // Toma 05 · Después del estreno
  { section: "post", key: "mant", control: "toggle", label: "Mantenimiento mensual", lineLabel: "Mantenimiento", description: "Actualizaciones, copias de seguridad y cambios menores.", priceMin: 30, priceMax: 50, priceMode: "monthly", unitLabel: "/mes", requires: { set: "tipo", in: WEB_TYPES } },
  { section: "post", key: "urgente", control: "toggle", label: "Entrega urgente", lineLabel: "Entrega urgente", description: "Priorizamos tu proyecto. Plazo ~40 % más corto.", priceMin: 20, priceMax: 20, priceMode: "percent_once", unitLabel: "%", weeksFactor: 0.6 },
];

// ---------------------------------------------------------------------------
// Mensajes de ejemplo del panel (solo con `npm run db:seed -- --demo`)
// ---------------------------------------------------------------------------
export const demoLeads: SeedLead[] = [
  { name: "Lucía Martín", company: "Clínica Dental Mar", sector: "Salud", need: "Las dos cosas", budgetLabel: "1.800 – 2.400 € + 480 – 640 €/mes", origin: "configurador", items: "Web a medida · Jornada de rodaje · Reservas / citas · SEO local · 8 reels/mes", message: "Queremos renovar la web y empezar a publicar vídeos del equipo y de los tratamientos. Ahora casi todos los pacientes nos llegan por recomendación.", email: "lucia@clinicamar.es", phone: "[+34 600 111 222]", hoursAgo: 2, status: "nuevo" },
  { name: "Javier Ferrer", company: "Ferrer & Asociados", sector: "Despacho profesional", need: "Web", budgetLabel: "1.000 – 2.500 €", origin: "formulario", items: "", message: "Necesitamos una web sobria y clara, con las áreas de práctica y un formulario de consulta.", email: "jferrer@ferrerasociados.es", phone: "[+34 600 333 444]", hoursAgo: 4, status: "nuevo" },
  { name: "Marta Gil", company: "Restaurante Brasa", sector: "Restauración", need: "Audiovisual", budgetLabel: "Menos de 1.000 €", origin: "formulario", items: "", message: "Buscamos reels mensuales para Instagram, sobre todo de cocina y sala.", email: "marta@brasa.es", phone: "[+34 600 555 666]", hoursAgo: 20, status: "contactado" },
  { name: "Pablo Ortega", company: "Estudio Pilates Norte", sector: "Bienestar", need: "Las dos cosas", budgetLabel: "2.050 – 2.900 €", origin: "configurador", items: "Web a medida · Jornada de rodaje · Reservas / citas · Sesión de fotos", message: "", email: "pablo@pilatesnorte.es", phone: "", hoursAgo: 52, status: "contactado" },
  { name: "Elena Ruiz", company: "Ópticas Luz", sector: "Comercio", need: "Audiovisual", budgetLabel: "1.000 – 2.500 €", origin: "formulario", items: "", message: "Campaña de vídeo para la apertura de la segunda tienda.", email: "elena@opticasluz.es", phone: "[+34 600 777 888]", hoursAgo: 96, status: "cerrado" },
  { name: "Sergio Vela", company: "Logística Vela", sector: "Empresa B2B", need: "Web", budgetLabel: "2.500 – 5.000 €", origin: "configurador", items: "Web nueva · Hasta 10 páginas · Idiomas ×1 · SEO local · Mantenimiento", message: "Web corporativa en español e inglés para captar clientes B2B.", email: "s.vela@logisticavela.com", phone: "[+34 600 999 000]", hoursAgo: 148, status: "cerrado" },
];
