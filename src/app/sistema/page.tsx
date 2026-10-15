import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { Grain } from "@/components/ui/Grain";
import { RecDot } from "@/components/ui/RecDot";
import { RichText } from "@/components/ui/RichText";
import { formatTimecode } from "@/lib/timecode";
import { ButtonShowcase } from "./ButtonShowcase";

export const metadata: Metadata = { title: "Sistema de diseño", robots: { index: false, follow: false } };

const colors = [
  ["ink", "#0A0A0A", "Fondo"],
  ["bone", "#EDEAE4", "Texto / primario"],
  ["white", "#FFFFFF", "Hover primario"],
  ["muted", "#8A8780", "Texto secundario"],
  ["dim", "#6B6862", "Placeholders"],
  ["ghost", "#4A4844", "Decorativo"],
  ["rec", "#FF3B1F", "REC · único acento"],
  ["surface", "#121212", "Superficie"],
  ["surface-2", "#1A1A1A", "Campos"],
  ["ph", "#171615", "Placeholder medios"],
];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-8 border-t border-line py-14">
      <p className="label-mono text-muted">{label}</p>
      {children}
    </section>
  );
}

export default function SistemaPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "true") notFound();

  return (
    <main className="relative gutter-x pb-32 pt-16">
      <header className="flex flex-wrap items-center justify-between gap-6 pb-14">
        <Logo height={20} priority />
        <span className="label-mono text-muted">Sistema de diseño · Fase 1</span>
      </header>

      <h1 className="headline pb-16 text-[clamp(56px,10vw,168px)]">
        <RichText text={"Sistema\n*de diseño.*"} />
      </h1>

      <Section label="Logo · pasa el ratón: RO + WE se separan">
        <div className="flex flex-wrap items-end gap-16">
          <Logo height={40} href={null} />
          <Logo height={20} href={null} />
          <Logo height={15} href={null} />
          <div className="bg-bone p-6">
            <Logo height={24} tone="dark" href={null} interactive={false} rec={false} />
          </div>
        </div>
      </Section>

      <Section label="Color">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {colors.map(([name, hex, use]) => (
            <div key={name} className="flex flex-col gap-2">
              <div className="h-20 border border-line" style={{ background: hex }} />
              <span className="text-sm">{name}</span>
              <span className="label-mono text-[10px] text-muted">
                {hex} · {use}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Tipografía">
        <div className="flex flex-col gap-10">
          <p className="headline text-[clamp(48px,7vw,112px)]">
            <RichText text="Calcula tu *presupuesto.*" />
          </p>
          <p className="headline-serif text-[clamp(44px,6vw,96px)]">
            <RichText text="¿Grabamos tu próxima *escena?*" />
          </p>
          <p className="max-w-[44ch] text-lg leading-relaxed text-muted">
            Inter Tight 300/400/500 para texto. Estudio boutique de web y audiovisual para empresas y negocios que quieren verse profesionales en
            internet.
          </p>
          <p className="label-mono">JetBrains Mono · Escena 00 — Hero · 2.39:1 · 25 fps</p>
        </div>
      </Section>

      <Section label="Botones · todos los estados (prueba hover, clic, Tab)">
        <ButtonShowcase />
      </Section>

      <Section label="REC · timecode · encuadre · grano">
        <div className="flex flex-wrap items-center gap-12">
          <span className="flex items-center gap-3 label-mono">
            <RecDot /> Rec
          </span>
          <span className="flex items-center gap-3 label-mono text-muted">
            <RecDot off /> Standby
          </span>
          <span className="flex items-center gap-3 label-mono">
            <RecDot pulse /> Pulso
          </span>
          <span className="label-mono text-bone">{formatTimecode(308)}</span>
        </div>
        <div className="relative aspect-[2.39/1] w-full max-w-3xl overflow-hidden media-placeholder">
          <CornerMarks size={24} inset={24} />
          <span className="absolute bottom-6 left-14 label-mono text-muted">[ Vídeo · Showreel · 2.39:1 · sustituir ]</span>
          <span className="absolute right-14 top-6 label-mono text-muted">Sonido off · R</span>
          <Grain mode="absolute" opacity={0.07} />
        </div>
        <div className="flex items-end gap-4">
          <span className="label-mono text-muted">Desliza</span>
          <span className="block h-10 w-px bg-bone animate-drawy" />
        </div>
      </Section>

      <Grain />
    </main>
  );
}
