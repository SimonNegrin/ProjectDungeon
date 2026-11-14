---
type: Requirement Sheet
id: REQ-032
title: Estilo visual e interacción de la UI
description: "Identidad pixel derivada de 32rogues, tipografía Pixelify Sans, línea de píxel escalado, pantalla en tres zonas, panel en tres columnas con figura de equipo, detalle del objeto en el HUD derecho con comparación y submenú contextual con Enter."
status: stable
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-13T23:44:14Z
updated_at: 2026-11-14T00:16:51Z
related_tasks: [TASK-0099, TASK-0100, TASK-0101, TASK-0102, TASK-0103]
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T23:44:14Z }
verified:
  - by: human:simon
    at: 2026-11-13T23:54:32Z
    note: >-
      Aprueba la hoja: pixel art de 32rogues con Pixelify Sans incluida, línea
      derivada del píxel escalado y bordes inset/outset, pantalla en tres zonas
      (HUD izquierdo, mapa cuadrado 13×13, HUD derecho), panel modal sobre el
      mapa en tres columnas (equipo en figura humana, mochila, suelo y cadáveres
      con scroll), navegación con flechas o `WASD` al objeto más próximo solo
      entre objetos existentes, detalle del objeto en el HUD derecho con el
      equipado, `Enter` con submenú contextual y cadáveres reservados hasta
      REQ-021.
  - by: human:simon
    at: 2026-11-14T00:16:51Z
    note: >-
      Aprueba la v2: se aclara el nombre de los tokens tras TASK-0099
      (`--ui-line-color` para el color y `--ui-line` para el grosor calculado);
      sin cambios de diseño.
---

# Contexto

El panel de inventario de [REQ-018](REQ-018-inventario-equipo.md) es funcional y
está probado, pero su aspecto no se parece al del juego: tipografía de sistema,
radios de 8 px, sombras difusas y una rejilla de tres bloques con los stats
dentro. Nunca se definió un estilo visual, así que cada pieza de UI ha crecido
por su cuenta.

Esta hoja fija la identidad visual y los patrones de interacción de la UI de
juego: HUD izquierdo, HUD derecho, panel de inventario y ayuda de controles. La
decisión técnica vive en [ADR-025](../decisions/ADR-025-estilo-visual-ui.md). El
contenido de los HUD sigue en [REQ-022](REQ-022-hud-izquierdo-jugador.md) y
[REQ-023](REQ-023-hud-derecho-detalle-cursor.md).

# Enmienda a documentos vigentes

- [REQ-018](REQ-018-inventario-equipo.md) v6: el panel deja de mostrar stats y
  traits en la rejilla, la zona de suelo deja de ocultarse cuando está vacía y
  R-015 incluye los cadáveres del tile.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) v2: la columna izquierda muestra
  la ficha del personaje activo sin inventario ni equipo resumidos.
- [REQ-023](REQ-023-hud-derecho-detalle-cursor.md) v2: el HUD derecho también
  presenta el objeto seleccionado en el panel abierto, con dos bloques.
- [REQ-002](REQ-002-encuadre-16-9.md) y [REQ-005](REQ-005-viewport-impar-13.md):
  el marco y el viewport de 13×13 no cambian; los laterales existentes se llenan
  sin robar ancho al mapa.
- [ADR-021](../decisions/ADR-021-inventario-equipo.md): su nota de vigencia
  apunta al panel nuevo y a ADR-025.

# Objetivos de experiencia

- Que la UI se lea como parte del juego y no como un formulario encima.
- Que el equipo se entienda de un vistazo, sin leer ocho etiquetas.
- Que comparar antes de equipar no exija memorizar números.
- Que gestionar el inventario sea una decisión por acción, sin atajos ocultos.
- Que la información quepa sin letra diminuta ni scroll en la resolución objetivo.
- Que teclado, foco y contraste permitan jugar sin ratón.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La UI comparte la identidad pixel de 32rogues: rejilla de píxel visible, bordes duros y color plano. No se añade arte nuevo fuera del pack y de la fuente. | Capturas a 1280×720 y 900×700 sin elementos con radios, sombras difusas ni degradados suaves ajenos al pack. |
| R-002 | La tipografía es **Pixelify Sans** (OFL 1.1), incluida en el repo como asset variable con su texto de licencia y el crédito; escalas fijas por rol (título, cuerpo, dato, ayuda). | Sin peticiones de red para la fuente; ñ, tildes, diéresis, `¿`, `¡` y `«»` se ven correctos en todas las escalas usadas. |
| R-003 | El color sale de una paleta semántica derivada del pack: fondo, panel, línea, texto, texto atenuado, acento, peligro y foco. Ningún componente inventa un color. | Cambiar un token cambia toda la UI; no hay literales de color en componentes. |
| R-004 | El grosor de línea imita el píxel de arte después del escalado del marco: se calcula, no se escribe en píxeles de CSS. Se admiten bordes inset y outset para dar relieve. | A 1280×720 y a 1920×1080 el borde se lee como un píxel del mapa, sin líneas de medio píxel ni borrones. |
| R-005 | Sin radios de esquina, sin sombras difusas y sin transiciones largas; el relieve se consigue con bordes y contraste. | Inspección visual de HUD, panel y ayuda: ningún radio distinto de cero ni sombra suave. |
| R-006 | La pantalla se compone en tres zonas: HUD izquierdo con la ficha del personaje activo, mapa cuadrado de 13×13 y HUD derecho con la información bajo el cursor. El mapa no pierde casillas. | El mapa conserva 13×13 y su tamaño; los HUD caben en las franjas laterales a 1280×720. |
| R-007 | El panel de inventario es modal **solo sobre el mapa**; los dos HUD siguen visibles y la ficha del objeto se lee en el HUD derecho. | Con el panel abierto se ven ambos HUD; el mapa queda bloqueado; `Escape`/`I` cierra. |
| R-008 | El panel tiene tres columnas de un tercio: equipamiento, mochila y suelo. El equipamiento son ocho huecos en **figura humana** con posiciones absolutas (cabeza, manos, torso, pies, dedos), no una lista. | Se distingue qué pieza va en cada hueco sin leer etiquetas; el foco recorre la figura en orden espacial. |
| R-009 | La mochila ocupa el centro con ocho casillas y la rejilla no muestra stats ni traits. | La rejilla solo presenta icono, nombre y estado; el detalle se lee en el HUD derecho. |
| R-010 | La columna derecha del panel muestra los **cadáveres del tile apilados arriba, con su nombre**, y el **suelo siempre abajo**; la zona tiene scroll propio. | Con suelo vacío la zona sigue visible; con varios cadáveres se navegan en vertical; el scroll no arrastra las otras columnas. |
| R-011 | Al navegar por el panel, el HUD derecho muestra el detalle del objeto seleccionado en **dos bloques**: el seleccionado y el equipado en ese hueco, sin delta numérico. | Se comparan stats sin memorizar; sin objeto equipado en el hueco, el segundo bloque lo dice. |
| R-012 | `Enter` sobre un objeto abre un **submenú flotante** con las acciones válidas según contexto (equipar, desequipar, soltar, recoger); el submenú se cierra con `Escape` y no ejecuta nada al abrirse. | Con mochila llena no aparece «recoger»; sobre un objeto del suelo no aparece «desequipar»; abrir y cerrar no gasta MP. |
| R-013 | La navegación sigue las reglas del apartado [Navegación del panel](#navegación-del-panel): flechas o `WASD` al objeto más próximo en cada dirección, sobre un plano único de tres columnas. El foco se ve siempre con la línea de foco del token. | Cada objeto es alcanzable; el foco no se pierde al abrir el submenú ni al refrescar el estado. |
| R-014 | El coste de 1 MP se anuncia en el submenú antes de confirmar y se cobra al ejecutar; un rechazo explica el motivo en el propio panel. | Con 0 MP la acción se ofrece como no disponible y el motivo es legible; el contador no cambia al abrir el submenú. |
| R-015 | Los cadáveres aparecen en el panel cuando [REQ-021](REQ-021-muerte-fantasma-resurreccion.md) tenga inventario; este corte reserva la zona y no implementa el trasvase. | Sin inventario de cadáver no se inventan objetos; el suelo sigue operativo. |

# Navegación del panel

El panel se recorre como un plano único: las tres columnas comparten el mismo
campo, así que el foco puede cruzar de una a otra cuando el objeto más próximo en
esa dirección está al otro lado. No hay recorrido por listas ni orden fijo de
casillas.

| ID | Regla | Aceptación |
|---|---|---|
| N-001 | Flechas y `WASD` son equivalentes; cada pulsación mueve el foco una vez. | Ambas familias producen el mismo recorrido, sin repeticiones accidentales. |
| N-002 | El foco solo se posa en objetos existentes: equipo puesto, mochila, suelo y cadáveres. Las casillas vacías se ven, pero no se seleccionan. | No hay paradas en huecos vacíos; la ficha nunca describe un objeto inexistente. |
| N-003 | Cada dirección elige el **objeto más próximo en ese sentido** desde el centro de la casilla actual, con distancia entre centros y tratando las tres columnas como un plano único. | Desde cualquier objeto, la pulsación elige el más cercano en esa dirección; el recorrido cruza de columna cuando conviene. |
| N-004 | Solo cuentan los objetos estrictamente en esa dirección; no se eligen objetos a la misma altura ni hacia atrás. | Arriba y abajo no alcanzan objetos alineados en horizontal. |
| N-005 | Empates: gana el de menor desviación perpendicular; si persiste, el orden de lectura (arriba→abajo, izquierda→derecha). | Dos objetos equidistantes producen siempre el mismo resultado. |
| N-006 | Sin destino en esa dirección, el foco no se mueve y no rebota al extremo opuesto. | En el borde, la pulsación no cambia de objeto. |
| N-007 | Al abrir el panel, el foco cae en el último objeto usado si sigue existiendo; si no, en el primero por orden de lectura. | Abrir y cerrar conserva la posición mientras el objeto exista. |
| N-008 | Tras equipar, recoger o soltar, el foco se queda en el mismo objeto si sigue en el panel; si desapareció, pasa al más próximo a su posición anterior. | Recoger no devuelve el foco al principio; soltar un equipado deja el foco cerca. |
| N-009 | En la columna derecha, el foco desplaza la lista para quedar visible; nunca se navega a ciegas. | Cadáveres y suelo se alcanzan con flechas y el scroll acompaña. |
| N-010 | `Tab` y `Shift+Tab` saltan a la siguiente zona (equipo → mochila → suelo) como atajo; no sustituyen a las flechas. | `Tab` recorre zonas sin cambiar la regla de proximidad. |
| N-011 | En el submenú, arriba/abajo recorren opciones, izquierda/derecha no hacen nada, `Enter` ejecuta y `Escape` vuelve al objeto sin ejecutar. | El submenú no atrapa el foco ni ejecuta nada al abrirse. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | Los tokens visuales viven en un único bloque de variables y los componentes los consumen; no hay literales duplicados de color, grosor ni escala. El color de línea es `--ui-line-color` y el grosor calculado, `--ui-line`. | Cambiar un token se refleja en toda la UI; `docs:check` y los tests de UI no encuentran literales fuera de la fuente. |
| T-002 | La línea se deriva del tamaño de tile y de la escala del marco en `layout.ts`; se redondea a píxel de dispositivo. | A varias escalas el grosor sigue siendo coherente con el píxel de arte; no hay saltos ni bordes de medio píxel. |
| T-003 | La UI sigue en DOM sobre el marco; el Canvas solo dibuja el mundo y conserva 13×13. | Sin cambios en el render del mapa; capturas sin desplazamiento de tiles. |
| T-004 | La fuente y su licencia se incluyen en `public/` y se sirven desde el propio build; sin dependencias nuevas ni red. | `package.json` y `pnpm-lock.yaml` no cambian; sin peticiones externas en el arranque. |
| T-005 | La selección, el foco y el submenú son estado de presentación del host: no alteran el motor, el RNG ni los costes. | Abrir, navegar y cerrar el panel no cambia snapshot; el MP solo cambia al ejecutar. |
| T-006 | Accesibilidad: foco visible, contraste suficiente, información textual además del icono y del color, y `aria` coherente con el diálogo modal. | Revisión con teclado y contraste; el color no es el único canal de estado o rechazo. |
| T-007 | Tests nuevos: tokens y línea, navegación por proximidad (incluidos empates, bordes y conservación del foco), submenú por contexto, dos bloques de detalle y E2E con capturas de 1280×720 y 900×700. | `pnpm run verify` y `pnpm run test:e2e` pasan; a 1280×720 el panel completo con mochila llena y cuatro objetos en el suelo no hace scroll. |
| T-008 | Se actualizan glosario, arquitectura, economía de turno y notas de vigencia de ADR-021; se registra ADR-025. | `docs:check` pasa; no queda documentación que declare el scroll del panel como límite aceptado. |
| T-009 | La fuente se valida a las escalas usadas: acentos, diéresis, signos de apertura, comillas angulares y cifras. | Captura de la tabla de caracteres en cada escala; sin glifos sustituidos ni recortes. |

# Requisitos no funcionales

- **Rendimiento:** la UI se refresca con el estado de presentación; navegar no
  reconstruye el mapa ni el panel completo.
- **Accesibilidad:** navegación completa por teclado, foco persistente y contraste
  suficiente en los tokens elegidos.
- **Legibilidad:** a 900×700 el texto de cuerpo no baja del tamaño mínimo fijado
  por el token; si algo no cabe, se recorta contenido, no la escala.
- **Mantenibilidad:** tokens y geometría en una fuente única; componentes sin
  valores mágicos.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.

# Dependencias

- [REQ-018](REQ-018-inventario-equipo.md): modelo de inventario, equipo y panel.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) y
  [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): contenido de los HUD.
- [REQ-019](REQ-019-traits-objetos.md): traits que se muestran en la ficha.
- [REQ-005](REQ-005-viewport-impar-13.md): viewport 13×13 y laterales del marco.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): arte, licencia y
  crédito del pack.

# Fuera de alcance

- Pantalla de inicio y configuración ([REQ-016](REQ-016-pantalla-inicio-configuracion.md)).
- `F1`, mensajes del juego y avisos de feedback existentes.
- HUD de jugadores no activos, pausa y hotseat
  ([REQ-031](REQ-031-hotseat-local.md) decide su contenido).
- Inventario de cadáveres ([REQ-021](REQ-021-muerte-fantasma-resurreccion.md)).
- Arte final de iconos, retratos y sonido.
- Otras resoluciones distintas de las dos de aceptación.

# Preguntas abiertas

1. **Retrato.** Si la columna izquierda lleva sprite, silueta o solo nombre; hoy
   el pack no tiene retratos.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-13 | Identidad pixel derivada de 32rogues, sin arte nuevo. | human:simon | aceptada |
| 2026-11-13 | Tipografía Pixelify Sans incluida como asset (OFL 1.1). | human:simon | aceptada |
| 2026-11-13 | Línea equivalente al píxel de arte escalado, con bordes inset/outset. | human:simon | aceptada |
| 2026-11-13 | Pantalla en tres zonas; el mapa conserva 13×13 y no cede ancho. | human:simon | aceptada |
| 2026-11-13 | Panel modal solo sobre el mapa, tres columnas de un tercio. | human:simon | aceptada |
| 2026-11-13 | Equipo en figura humana de ocho huecos; mochila sin stats en la rejilla. | human:simon | aceptada |
| 2026-11-13 | Cadáveres con nombre arriba y suelo siempre abajo, con scroll. | human:simon | aceptada |
| 2026-11-13 | Detalle del objeto en el HUD derecho con seleccionado y equipado, sin delta. | human:simon | aceptada |
| 2026-11-13 | `Enter` abre submenú contextual; el coste se cobra al ejecutar. | human:simon | aceptada |
| 2026-11-13 | Cadáveres reservados: sin trasvase de inventario hasta REQ-021. | human:simon | aceptada |
| 2026-11-13 | Navegación con flechas o `WASD` al objeto más próximo en cada dirección, sobre un plano único; el foco no se posa en casillas vacías ni rebota en los bordes. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [ ] El grafo de tareas está definido.
