"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      {children}
      <span className="label-mono text-[10px] text-muted">{label}</span>
    </div>
  );
}

export function ButtonShowcase() {
  const [loading, setLoading] = useState(false);
  const send = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
  };

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-start gap-10">
        <Item label="Primario · hover: relleno + rodillo · magnético">
          <Button>Pide tu propuesta</Button>
        </Item>
        <Item label="Primario · clic: estado de carga">
          <Button onClick={send} loading={loading} loadingLabel="Grabando…" arrow={loading ? false : "→"}>
            Enviar solicitud
          </Button>
        </Item>
        <Item label="Deshabilitado">
          <Button disabled>Enviar solicitud</Button>
        </Item>
        <Item label="Atenuado (sigue siendo pulsable)">
          <Button dimmed>Enviar y hablemos</Button>
        </Item>
      </div>
      <div className="flex flex-wrap items-start gap-10">
        <Item label="REC · hover: el punto late">
          <Button variant="rec">Pide tu propuesta</Button>
        </Item>
        <Item label="Contorno · cabecera">
          <Button variant="outline" size="sm">
            Hablemos
          </Button>
        </Item>
        <Item label="Secundario · hover: subrayado + flecha">
          <Button variant="link" href="/proyectos" arrow="→">
            Ver proyectos
          </Button>
        </Item>
        <Item label="Ancho completo (móvil)">
          <div className="w-[350px]">
            <Button fullWidth size="lg">
              Pide tu propuesta
            </Button>
          </div>
        </Item>
      </div>
    </div>
  );
}
