/** Tablero de revisión de diseño (Fase 2). Cada entrada se ve a 1440 y a 390 px. */
export const boards = [
  { key: "preloader", title: "Preloader", note: "Timecode y registro de build ligados a la carga real · logo como etiqueta de código < ROWE /> · apertura letterbox al terminar · solo primera visita por sesión.", desk: 900, mob: 844 },
  { key: "header", title: "Cabecera", note: "De ROWE Presupuesto: se oculta al bajar, reaparece al subir, fondo desenfocado tras 40 px.", desk: 120, mob: 100 },
  { key: "hero", title: "Escena 00 · Hero (mezcla d)", note: "1c titular + Fig. 01 + Fig. 02 · al hacer scroll el showreel crece hasta el letterbox 2.39:1 (1a) con pistas RO/WE y cabezal (1b).", desk: 1800, mob: 1700 },
  { key: "estudio", title: "Escena 01 · El estudio (mezcla d)", note: "Pin + manifiesto que se ilumina palabra a palabra con el cabezal (aquí a mitad) · hover RO: vídeo en las letras · hover WE: web en movimiento.", desk: 900, mob: 1500 },
  { key: "servicios", title: "Escena 02 · Servicios", note: "Diseño nuevo · dos pistas WE / RO · hover (o scroll en móvil) ilumina una y apaga la otra · revelado por máscara.", desk: 1500, mob: 2400 },
  { key: "web", title: "Escena 03 · Desarrollo web", note: "Diseño nuevo · la web del visor se desplaza con el scroll (scrub) · ficha técnica editable.", desk: 1100, mob: 1800 },
  { key: "audiovisual", title: "Escena 04 · Audiovisual", note: "Diseño nuevo · reels 9:16 con parallax a distinta velocidad · en móvil fila deslizable nativa.", desk: 1500, mob: 1500 },
  { key: "ecosistema", title: "Escena 05 · Ecosistema (pin, 4 pasos)", note: "Diseño nuevo · pinneado: cada tramo de scroll activa un paso y la señal REC viaja de RO a WE (aquí paso 02).", desk: 900, mob: 1900 },
  { key: "proceso", title: "Escena 06 · Proceso", note: "Diseño nuevo · el cabezal avanza con el scroll e ilumina cada toma (aquí a mitad) · vertical en móvil.", desk: 1000, mob: 1500 },
  { key: "proyectos", title: "Escena 07 · Proyectos", note: "Diseño nuevo · carrusel horizontal arrastrable (cursor «Arrastra ←→») · deslizar nativo en móvil.", desk: 1100, mob: 1200 },
  { key: "filosofia", title: "Escena 08 · Filosofía", note: "Diseño nuevo · revelado por máscara fila a fila · hover: desplazamiento + punto REC.", desk: 1200, mob: 1600 },
  { key: "menu", title: "Menú a pantalla completa", note: "Diseño nuevo · abre con corte desde el centro · índice numerado, la figura cambia con el hover · bloquea el scroll.", desk: 900, mob: 1200 },
  { key: "footer", title: "Pie · créditos finales", note: "Amplía el pie de ROWE Presupuesto · todos los datos salen de Ajustes.", desk: 700, mob: 1100 },
] as const;

export type BoardKey = (typeof boards)[number]["key"];
