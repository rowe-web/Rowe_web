@AGENTS.md

## Estado actual

_Actualizado el 21 de octubre de 2026._

### Fase

Cambios y revisiones (ajustes finos tras la Fase 5). **No se pasa a la Fase 6** (dominio, despliegue, indexación en Google, tareas programadas, lanzamiento) hasta que Raúl lo diga expresamente.

### Hecho el 20 y 21 de octubre

- Escena 02: figuras animadas en bucle.
- Lista de lanzamiento en el inicio del panel y aviso de bloqueantes antes de publicar.
- «Dónde trabajamos»: webs para toda España y rodajes en el Camp de Tarragona; nada vacío ni entre corchetes a la vista (`hasRealValue`).
- Hero: frase de posicionamiento y SEO de la home.
- Textos legales adaptados a ROWE, `npm run db:legal` (datos del titular desde `.env.local`) y `/vista-previa/aviso-legal`, `/privacidad` y `/cookies`.
- Email de confirmación automático al cliente tras «Hablemos» (ajuste interno `confirmation_email`, con el PDF del presupuesto si viene del configurador).
- En el borrador: contacto sin teléfono, WhatsApp ni dirección; datos legales del titular; configurador sin «de ejemplo» ni IVA. Publicado como versión 14.

### Pendiente

- Alojamiento en Datos legales (sigue «[Vercel Inc. · por confirmar]»: no hay despliegue configurado).
- Proyectos reales que sustituyan a los 5 de ejemplo, con portada; showreel del Hero; imágenes de las cabeceras de /web y /audiovisual.
- Borrado automático para cumplir los plazos de conservación de la privacidad (12 meses solicitudes, 26 meses analítica): hoy no se borra nada. Propuesta: función SQL + ruta cron (programarla es de la Fase 6).
- Que un gestor confirme: datos del aviso legal (LSSI), no aplicar IVA, plazos de conservación y contratos de encargado del tratamiento.
- Opcional: vista previa del borrador para /web, /audiovisual, /proyectos y /contacto.

### Reglas de trabajo

- Cada cambio se deja en el borrador y se para para que Raúl lo revise. Nada de commit ni de publicar antes de su visto bueno; si no le gusta, se deshace por completo (código y datos), guardando antes una copia para poder hacerlo.
- Con el visto bueno: commit solo con los archivos de ese cambio (`git status`/`git diff` revisados y `npm run check` en verde), subirlo al repo oficial (remoto `rowe-web`, carpeta `Proyectos_Propios_Rowe/Rowe_web`, conservando lo que ya haya en ella) y publicar el borrador desde el panel aunque salgan bloqueantes.
- localhost usa la misma base de Supabase que la web real: publicar en local es publicar de verdad.
- No tocar los proyectos de ejemplo: se sustituirán por trabajos reales cuando Raúl los tenga.
- Los datos en la base se cambian con el sistema del panel o con scripts idempotentes de `scripts/db/`, nunca con SQL a mano.
- Arrancar el servidor de desarrollo desde PowerShell (desde Git Bash, Turbopack falla al compilar el CSS).
