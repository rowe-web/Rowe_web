import type { ComponentType } from "react";
import { AudiovisualScene } from "./AudiovisualScene";
import { EcosistemaScene } from "./EcosistemaScene";
import { EstudioScene } from "./EstudioScene";
import { FilosofiaScene } from "./FilosofiaScene";
import { HablemosScene } from "./HablemosScene";
import { HeroScene } from "./HeroScene";
import { ProcesoScene } from "./ProcesoScene";
import { PresupuestoScene } from "./PresupuestoScene";
import { ProyectosScene } from "./ProyectosScene";
import { ServiciosScene } from "./ServiciosScene";
import { WebScene } from "./WebScene";
import type { SceneProps } from "./types";

/**
 * Registro de escenas: clave de la tabla `scenes` → componente.
 * El ORDEN y la VISIBILIDAD vienen de la base de datos (panel «Textos y escenas»).
 * Para añadir una escena nueva: crea el componente, regístralo aquí y añade la fila en el panel/seed.
 * Una escena sin componente registrado simplemente no se muestra.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sceneRegistry: Record<string, ComponentType<SceneProps<any>>> = {
  hero: HeroScene,
  estudio: EstudioScene,
  servicios: ServiciosScene,
  web: WebScene,
  audiovisual: AudiovisualScene,
  ecosistema: EcosistemaScene,
  proceso: ProcesoScene,
  proyectos: ProyectosScene,
  filosofia: FilosofiaScene,
  presupuesto: PresupuestoScene,
  hablemos: HablemosScene,
};
