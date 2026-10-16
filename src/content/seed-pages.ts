/**
 * Páginas internas y legales: contenido inicial (Fase 5). Se edita en el panel
 * (Ajustes → Páginas y legal). Ver los tipos de sección en src/lib/content/blocks.ts.
 *
 * En los textos legales, las marcas {titular}, {nif}, {domicilio}, {email}, {alojamiento},
 * {actualizado} se rellenan con Ajustes → Datos legales, y {web} / {dominio} con la
 * dirección real de la web (NEXT_PUBLIC_SITE_URL). Nunca se escribe el dominio a mano.
 */
import type { SeedPage } from "./seed-data";

const PRESUPUESTO = { label: "Calcula tu presupuesto", href: "/#presupuesto" };
const HABLEMOS = { label: "Hablemos", href: "/contacto" };
const PROPUESTA = { label: "Pide tu propuesta", href: "/contacto" };
const NONE = { label: "", href: "" };

export const pages: SeedPage[] = [
  {
    slug: "web",
    kind: "service",
    title: "Desarrollo *web*",
    intro: "Webs a medida, rápidas y pensadas para que quien llegue sepa en segundos qué haces y cómo contactarte.",
    seoTitle: "Desarrollo web a medida — ROWE",
    seoDescription: "Diseño y desarrollo de webs a medida para empresas y negocios: rápidas, claras, fáciles de editar y preparadas para Google.",
    blocks: [
      { type: "cabecera", kicker: "WE — Desarrollo web", meta: ["Diseño", "Desarrollo", "SEO"], image_media_id: null, video_media_id: null, caption: "Fig. 01 — Web en movimiento · sustituir", cta: PRESUPUESTO, secondary: HABLEMOS },
      { type: "servicios", kicker: "Escaleta — Qué construimos", title: "Una web para *cada momento.*", discipline: "web" },
      { type: "escena", key: "web", kicker: "Ficha técnica — WE" },
      {
        type: "incluye",
        kicker: "Incluido siempre",
        title: "En todas *las webs.*",
        items: [
          { title: "Diseño a medida", body: "Sin plantillas: diseñada para tu negocio, tu marca y tus clientes." },
          { title: "Responsive", body: "Se ve y funciona bien en móvil, tablet y escritorio." },
          { title: "Formulario de contacto", body: "Los mensajes te llegan al correo en el momento." },
          { title: "Panel para editar", body: "Cambias textos, fotos y proyectos sin depender de nadie." },
          { title: "Velocidad", body: "Optimizada para cargar rápido, también con mala cobertura." },
          { title: "SEO básico", body: "Títulos, descripciones y estructura listos para Google." },
        ],
      },
      { type: "escena", key: "proceso", kicker: "Proceso — Del briefing al estreno" },
      { type: "proyectos", kicker: "Trabajos — WE", title: "Webs *recientes.*", category: "Web", limit: 4, all_label: "Ver todos los proyectos" },
      {
        type: "preguntas",
        kicker: "Preguntas",
        title: "Antes de *empezar.*",
        items: [
          { q: "¿Cuánto cuesta una web?", a: "Depende del tamaño y de las funciones. En el configurador tienes un rango orientativo al momento; después del briefing te enviamos un presupuesto cerrado." },
          { q: "¿Cuánto se tarda?", a: "Una web de hasta 5 páginas suele estar lista en 3–4 semanas desde el briefing. El calendario te lo damos el primer día." },
          { q: "¿Podré editarla yo?", a: "Sí. Todas las webs incluyen un panel sencillo para cambiar textos y fotos. Te enseñamos a usarlo el día del estreno." },
          { q: "¿Qué necesito tener preparado?", a: "Tu logo y una idea de lo que quieres conseguir. Los textos y las fotos podemos prepararlos nosotros." },
          { q: "¿Os encargáis del dominio y del alojamiento?", a: "Te ayudamos a contratarlos a tu nombre y lo dejamos todo configurado." },
          { q: "¿Y después del estreno?", a: "Puedes contratar el mantenimiento mensual (actualizaciones, copias de seguridad y cambios menores) o pedirnos cambios puntuales cuando los necesites." },
        ],
      },
      { type: "cierre", kicker: "Fin de la secuencia", title: "¿Construimos *tu web?*", body: "Cuéntanos qué necesitas y te enviamos una propuesta en menos de 24 h.", cta: PROPUESTA, secondary: PRESUPUESTO },
    ],
  },
  {
    slug: "audiovisual",
    kind: "service",
    title: "Producción *audiovisual*",
    intro: "Reels, vídeo corporativo y fotografía para redes y comunicación comercial. Piezas cortas y cuidadas que hacen que se fijen en ti.",
    seoTitle: "Producción audiovisual — ROWE",
    seoDescription: "Reels para redes, vídeo corporativo y fotografía para negocios. Rodaje, edición y entrega lista para publicar.",
    blocks: [
      { type: "cabecera", kicker: "RO — Producción audiovisual", meta: ["Reels", "Vídeo", "Foto"], image_media_id: null, video_media_id: null, caption: "Fig. 01 — Showreel · sustituir", cta: PRESUPUESTO, secondary: HABLEMOS },
      { type: "servicios", kicker: "Escaleta — Qué rodamos", title: "Contenido que *se queda.*", discipline: "audiovisual" },
      { type: "escena", key: "audiovisual", kicker: "Formatos — RO" },
      {
        type: "incluye",
        kicker: "En cada rodaje",
        title: "Cómo *trabajamos.*",
        items: [
          { title: "Guion previo", body: "Antes de grabar sabemos qué contar, a quién y en qué red." },
          { title: "Rodaje en tu negocio", body: "Grabamos donde trabajas, con tu equipo y tu forma de hacer las cosas." },
          { title: "Edición y color", body: "Montaje, color y subtítulos con la estética de tu marca." },
          { title: "Formatos para cada red", body: "Vertical, cuadrado u horizontal: cada pieza en su formato." },
          { title: "Fotografía", body: "Aprovechamos la jornada para sacar fotos de equipo, espacio y producto." },
          { title: "Calendario cerrado", body: "Fechas de rodaje y de entrega claras desde el principio." },
        ],
      },
      { type: "escena", key: "ecosistema", kicker: "Web + Audiovisual" },
      { type: "proyectos", kicker: "Trabajos — RO", title: "Rodajes *recientes.*", category: "Audiovisual", limit: 4, all_label: "Ver todos los proyectos" },
      {
        type: "preguntas",
        kicker: "Preguntas",
        title: "Antes de *rodar.*",
        items: [
          { q: "¿Cuánto cuesta?", a: "Trabajamos con packs mensuales de 4, 8 o 12 reels, o por pieza en vídeos corporativos y sesiones de fotos. En el configurador tienes un rango orientativo al momento." },
          { q: "¿Dónde se graba?", a: "Normalmente en tu negocio: así el contenido muestra tu espacio, tu equipo y tu forma de trabajar." },
          { q: "¿Cuánto dura una jornada de rodaje?", a: "Unas 4–6 horas. Con una jornada bien planificada sacamos contenido para varias semanas." },
          { q: "¿Tengo que salir en cámara?", a: "No es obligatorio. Si quieres salir te guiamos; si no, contamos tu negocio a través del equipo, el producto o el espacio." },
          { q: "¿Publicáis vosotros los vídeos?", a: "Te entregamos las piezas listas para publicar, con textos y subtítulos. Si lo prefieres, te ayudamos con el calendario de publicación." },
          { q: "¿Puedo usar los vídeos en la web y en anuncios?", a: "Sí. Las piezas se entregan para que las uses en redes, en tu web y en campañas." },
        ],
      },
      { type: "cierre", kicker: "Fin de la secuencia", title: "¿Grabamos tu próxima *escena?*", body: "Cuéntanos qué quieres contar y te enviamos una propuesta en menos de 24 h.", cta: PROPUESTA, secondary: PRESUPUESTO },
    ],
  },
  {
    slug: "proyectos",
    kind: "projects",
    title: "Trabajos *recientes.*",
    intro: "Webs a medida y producción audiovisual para negocios que querían verse a su altura.",
    seoTitle: "Proyectos — ROWE",
    seoDescription: "Casos de estudio de webs a medida y producción audiovisual: el reto, la solución y el resultado de cada proyecto.",
    blocks: [
      { type: "cabecera", kicker: "Archivo — Proyectos", meta: ["Web", "Audiovisual"], image_media_id: null, video_media_id: null, caption: "", cta: NONE, secondary: NONE },
      { type: "listado", all_label: "Todos", empty_text: "Todavía no hay proyectos publicados en esta categoría.", cta_label: "Ver proyecto" },
      { type: "escena", key: "filosofia", kicker: "Cómo trabajamos" },
      { type: "cierre", kicker: "Fin del archivo", title: "¿Quieres un *resultado así?*", body: "Cuéntanos tu proyecto. Te respondemos en menos de 24 h.", cta: HABLEMOS, secondary: PRESUPUESTO },
    ],
  },
  {
    slug: "contacto",
    kind: "contact",
    title: "*Hablemos.*",
    intro: "Cuéntanos qué necesitas. Te respondemos en menos de 24 h.",
    seoTitle: "Contacto — ROWE",
    seoDescription: "Pide tu propuesta de web o vídeo: escríbenos, llámanos o rellena el formulario. Respuesta en menos de 24 h.",
    blocks: [
      { type: "cabecera", kicker: "Escena 10 — Hablemos", meta: ["Respuesta en 24 h"], image_media_id: null, video_media_id: null, caption: "", cta: NONE, secondary: NONE },
      { type: "contacto", kicker: "Hoja de rodaje", title: "", channels_label: "Contacto directo", form_label: "Formulario · 5 tomas" },
      {
        type: "preguntas",
        kicker: "Preguntas",
        title: "Lo que *suelen preguntarnos.*",
        items: [
          { q: "¿Cuándo me respondéis?", a: "En menos de 24 h en días laborables, normalmente el mismo día." },
          { q: "¿La primera reunión tiene coste?", a: "No. El briefing inicial es gratuito y sin compromiso." },
          { q: "¿Necesito tener claro el presupuesto?", a: "No. Si quieres una referencia, prueba el configurador; si no, cuéntanos tu idea y te orientamos." },
          { q: "¿Qué hacéis con mis datos?", a: "Solo los usamos para responder a tu solicitud. Tienes todos los detalles en la política de privacidad." },
        ],
      },
    ],
  },
  {
    slug: "aviso-legal",
    kind: "legal",
    title: "Aviso *legal*",
    intro: "En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), estos son los datos del titular de {dominio} y las condiciones de uso de la web.",
    seoTitle: "Aviso legal — ROWE",
    seoDescription: "Datos del titular y condiciones de uso de la web de ROWE.",
    blocks: [
      { title: "Titular de la web", body: "Titular: {titular}\nNIF: {nif}\nDomicilio: {domicilio}\nEmail: {email}\nWeb: {web}" },
      { title: "Objeto", body: "Esta web presenta los servicios de diseño y desarrollo web y de producción audiovisual de ROWE, y permite pedir información y calcular presupuestos orientativos." },
      { title: "Condiciones de uso", body: "El acceso a la web es libre y gratuito. Quien la usa se compromete a hacerlo de forma lícita, sin dañar la web ni a terceros, y a facilitar datos veraces en los formularios." },
      { title: "Propiedad intelectual e industrial", body: "Los textos, diseños, logotipos, fotografías, vídeos y el código de esta web pertenecen a {titular}, a sus clientes o a sus autores, y están protegidos por la normativa de propiedad intelectual e industrial. No se permite reproducirlos, distribuirlos ni transformarlos sin autorización expresa." },
      { title: "Presupuestos orientativos", body: "Los importes que muestra el configurador son rangos orientativos, sin IVA, y no constituyen una oferta vinculante. El precio definitivo se fija en un presupuesto cerrado tras el briefing." },
      { title: "Responsabilidad y enlaces", body: "{titular} no se hace responsable de los daños derivados de un uso indebido de la web, de interrupciones técnicas ajenas a su control ni del contenido de las webs de terceros a las que se enlace." },
      { title: "Legislación aplicable", body: "Estas condiciones se rigen por la legislación española. Cualquier controversia se resolverá ante los juzgados y tribunales que correspondan conforme a la ley.\n\nÚltima actualización: {actualizado}." },
    ],
  },
  {
    slug: "privacidad",
    kind: "legal",
    title: "Política de *privacidad*",
    intro: "Qué datos personales recogemos en {dominio}, para qué los usamos y qué derechos tienes, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).",
    seoTitle: "Política de privacidad — ROWE",
    seoDescription: "Cómo trata ROWE los datos personales de quien escribe o pide presupuesto desde la web.",
    blocks: [
      { title: "Responsable del tratamiento", body: "{titular} · NIF {nif}\n{domicilio}\nEmail: {email}" },
      { title: "Qué datos tratamos", body: "Los que nos das en el formulario «Hablemos» o al enviar tu presupuesto: nombre, empresa, email, teléfono, sector, lo que necesitas y tu mensaje, además de la configuración que elijas en el configurador.\n\nSi aceptas la analítica, datos de navegación: páginas vistas, origen de la visita y tiempo en la página, asociados a un identificador aleatorio que se borra al cerrar la pestaña. No guardamos tu dirección IP: para frenar envíos abusivos usamos una huella cifrada e irreversible de ella." },
      { title: "Para qué y con qué base legal", body: "Responder a tu solicitud y prepararte una propuesta o un presupuesto: aplicación de medidas precontractuales a petición tuya (art. 6.1.b RGPD).\n\nMedir y mejorar la web: tu consentimiento en el aviso de cookies (art. 6.1.a RGPD), que puedes retirar cuando quieras.\n\nEvitar el spam y los abusos: nuestro interés legítimo en proteger la web (art. 6.1.f RGPD).\n\nNo tomamos decisiones automatizadas ni hacemos perfiles, y no te enviaremos publicidad sin tu permiso." },
      { title: "Cuánto tiempo los guardamos", body: "Los datos de tu solicitud, mientras la gestionamos y, si no llega a contratarse, un máximo de 12 meses. Si pasas a ser cliente, durante la relación y los plazos que exija la ley (por ejemplo, fiscales). Los datos de analítica, un máximo de 26 meses." },
      { title: "Con quién los compartimos", body: "No vendemos ni cedemos tus datos. Solo acceden a ellos, como encargados del tratamiento y con contrato, los proveedores que necesitamos para que la web funcione: alojamiento web ({alojamiento}), base de datos y archivos (Supabase, con servidores en la Unión Europea) y correo electrónico (Google).\n\nSi algún proveedor trata datos fuera del Espacio Económico Europeo, la transferencia se ampara en el Marco de Privacidad de Datos UE–EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea." },
      { title: "Tus derechos", body: "Puedes pedir el acceso, la rectificación, la supresión, la oposición, la limitación del tratamiento y la portabilidad de tus datos, y retirar tu consentimiento en cualquier momento, escribiendo a {email}.\n\nSi crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es)." },
      { title: "Seguridad", body: "Aplicamos medidas técnicas y organizativas para proteger tus datos: conexión cifrada, acceso al panel solo para el personal autorizado y copias de seguridad." },
      { title: "Cambios en esta política", body: "Si la cambiamos, publicaremos la nueva versión en esta página.\n\nÚltima actualización: {actualizado}." },
    ],
  },
  {
    slug: "cookies",
    kind: "legal",
    title: "Política de *cookies*",
    intro: "{dominio} usa muy pocas cookies y tecnologías similares (el almacenamiento del navegador). No usamos cookies publicitarias ni de terceros.",
    seoTitle: "Política de cookies — ROWE",
    seoDescription: "Qué cookies y qué almacenamiento del navegador usa la web de ROWE y cómo cambiar tu decisión.",
    blocks: [
      { title: "Qué son", body: "Las cookies y el almacenamiento del navegador son pequeños datos que una web guarda en tu dispositivo para recordar información entre páginas o entre visitas." },
      { title: "Necesarias · siempre activas", body: "rowe-consent — Guarda tu decisión sobre la analítica. Almacenamiento local, hasta que lo borres.\nrowe:intro — Recuerda que ya has visto la presentación inicial. Se borra al cerrar la pestaña.\nrowe:cfg — Guarda tu configuración del presupuesto mientras navegas. Se borra al cerrar la pestaña." },
      { title: "Analítica propia · solo si la aceptas", body: "rowe-sid — Identificador aleatorio de la visita para contar páginas vistas sin identificarte. Se borra al cerrar la pestaña.\n\nLos datos se guardan en nuestra propia base de datos y no se comparten con terceros." },
      { title: "Área privada", body: "Si accedes al panel de administración (solo personal de ROWE), se usan cookies técnicas de sesión para mantenerte identificado: sb-…-auth-token y rowe-remember." },
      { title: "Cómo cambiar tu decisión", body: "Cuando quieras, desde «Preferencias de cookies» en el pie de la web, o borrando los datos de este sitio en tu navegador." },
      { title: "Más información", body: "Para cualquier duda, escríbenos a {email}.\n\nÚltima actualización: {actualizado}." },
    ],
  },
];

/**
 * Títulos y entradillas provisionales de la Fase 1. La actualización de contenido solo
 * los sustituye si siguen tal cual (lo editado desde el panel nunca se pisa).
 */
export const legacyPageText = {
  titles: ["Proyectos", "Aviso legal", "Política de privacidad", "Política de cookies"],
  intros: [
    "[Texto legal pendiente de completar]",
    "Webs a medida, rápidas y pensadas para convertir visitas en clientes.",
    "Vídeo y foto para redes y comunicación comercial.",
    "Trabajos recientes de web y audiovisual.",
  ],
};
