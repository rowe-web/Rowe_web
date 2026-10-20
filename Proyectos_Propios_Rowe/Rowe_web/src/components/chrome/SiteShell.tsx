import "lenis/dist/lenis.css";
import { SiteChrome } from "@/components/chrome/SiteChrome";
import { SiteFooter } from "@/components/chrome/SiteFooter";
import { Grain } from "@/components/ui/Grain";
import {
  emptyBrand,
  emptyContact,
  emptyNavigation,
  getSetting,
  mediaUrl,
  type BrandSettings,
  type ContactSettings,
  type CookieSettings,
  type NavigationSettings,
} from "@/lib/content/settings";
import { getHablemosSettings } from "@/features/hablemos/settings";
import type { SiteSnapshot } from "@/lib/content/types";
import { supabaseConfig } from "@/lib/site";
import { MotionProvider } from "@/motion/MotionProvider";

/**
 * Se ejecuta durante el parseo del HTML, antes de pintar nada:
 *  - motion-ready: estados iniciales de los revelados (sin parpadeo de contenido)
 *  - reduced: el usuario prefiere movimiento reducido
 *  - intro-seen: el preloader ya se vio en esta sesión
 * Si el movimiento no arranca en 4 s, se quita motion-ready y todo se ve igualmente.
 */
const MOTION_BOOT = `(function(){var h=document.documentElement;h.classList.add('motion-ready');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('reduced');if(sessionStorage.getItem('rowe:intro')==='1')h.classList.add('intro-seen')}catch(e){}setTimeout(function(){if(!window.__roweMotion)h.classList.remove('motion-ready')},4000)})();`;

/** Marco común de la web (cabecera, menú, pie, movimiento). Lo usan la web pública y la vista previa. */
export function SiteShell({ site, children, banner }: { site: SiteSnapshot; children: React.ReactNode; banner?: React.ReactNode }) {
  const nav = getSetting<NavigationSettings>(site, "navigation", emptyNavigation);
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const ambient = brand.ambient_audio_media_id ? site.media[brand.ambient_audio_media_id] : null;
  const ambientUrl = ambient ? mediaUrl(supabaseConfig.url, ambient.bucket, ambient.path) : null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <a
        href="#contenido"
        className="sr-only z-[600] bg-bone px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      {banner}
      <MotionProvider>
        <SiteChrome
          nav={nav}
          contact={contact}
          brand={brand}
          hablemosSettings={getHablemosSettings(site)}
          cookies={getSetting<CookieSettings>(site, "cookies", { enabled: false, text: "", accept: "Aceptar", reject: "Rechazar", configure: "Configurar" })}
          ambientUrl={ambientUrl}
        />
        {children}
        <div className="relative z-[1]">
          <SiteFooter site={site} />
        </div>
      </MotionProvider>
      <Grain />
    </>
  );
}
