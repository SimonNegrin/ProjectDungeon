---
type: Requirement Sheet
id: REQ-022
title: HUD izquierdo del jugador activo
description: "Columna izquierda del marco 16:9 con la ficha del jugador activo: nombre, arquetipo, PV, MP, acciones, atributos con efecto, traits activos y maná cuando el personaje lo tenga; inventario y equipo se consultan en el panel con I."
status: draft
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T13:00:00Z
updated_at: 2026-11-13T23:54:32Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T13:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-13T23:54:32Z
    note: >-
      Aprueba la v2: la columna muestra nombre, arquetipo, PV, MP, acciones,
      atributos con efecto, traits activos y maná actual/máximo solo cuando el
      personaje lo necesita; inventario y equipo se consultan en el panel con
      `I`. El retrato sigue abierto.
---

# Contexto

El HUD actual vive fuera del marco 16:9. El usuario quiere aprovechar los
laterales negros: la columna izquierda representa al jugador activo y la derecha
detalla lo que hay bajo el cursor. Esta hoja cubre la columna izquierda y la
geometría compartida; el detalle del cursor es
[REQ-023](REQ-023-hud-derecho-detalle-cursor.md).

La decisión creativa está tomada. Quedan abiertos el nivel de detalle de los
atributos y si el inventario del panel es interactivo o solo informativo.

# Enmienda a documentos vigentes

- [REQ-002](REQ-002-encuadre-16-9.md) aprobó el HUD **fuera del marco**. Esta
  hoja lo mueve dentro de los laterales y retira el HUD anterior.
- [REQ-005](REQ-005-viewport-impar-13.md) fija el viewport de 13×13 y los
  laterales negros. Esta hoja los ocupa sin cambiar el viewport ni el marco.
- [REQ-017](REQ-017-feedback-visual-eventos.md) coloca textos y banners respecto
  al mapa y al HUD exterior. Esta hoja redefine su anclaje dentro del marco.
- [REQ-032](REQ-032-estilo-visual-interaccion-ui.md) fija la identidad visual y
  retira el inventario y el equipo resumidos de esta columna: el detalle y la
  gestión viven en el panel de `I`.

# Geometría compartida

- Marco lógico 16:9 de 416 px de alto y 739,55 px de ancho, según `REQ-005`.
- Mapa de 13×13 tiles de 32 px (416×416 px) centrado.
- Columnas laterales de 161,77 px lógicos cada una (≈5 tiles de ancho).
- La columna izquierda pertenece a esta hoja; la derecha, a `REQ-023`. Ninguna
  puede cambiar el tamaño del mapa ni del marco.
- El HUD anterior, fuera del marco, se elimina al implementar esta hoja.

# Objetivos de experiencia

- Saber de un vistazo quién juega, cómo está y qué lleva.
- Que el cambio de jugador en hotseat sea evidente sin leer un banner.
- Que el panel no robe atención al mapa ni tape información de juego.
- Que la información quepa en una columna estrecha sin letra diminuta.
- Que el estado fantasma se entienda desde el mismo panel.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El HUD del jugador vive en la columna izquierda del marco 16:9 y sustituye al HUD exterior. | No queda HUD de juego fuera del marco; la columna izquierda muestra al jugador activo. |
| R-002 | La columna muestra el nombre y el arquetipo del jugador activo, con miniatura o retrato cuando se decida su forma. | Al cambiar de jugador activo, nombre y arquetipo cambian en el mismo turno. |
| R-003 | La columna muestra PV, MP, **acciones restantes**, los atributos con efecto vigente y los **traits activos** del personaje. Muestra **maná actual/máximo** solo cuando el personaje tiene maná (máximo mayor que cero); si no, la línea se omite sin dejar hueco. | Los valores coinciden con el estado del motor; los traits activos y sus suelos se leen sin abrir el panel; un personaje sin maná no muestra una línea vacía ni un cero engañoso. |
| R-004 | El inventario y el equipo **no** se muestran en esta columna: se consultan en el panel de `I` ([REQ-018](REQ-018-inventario-equipo.md), [REQ-032](REQ-032-estilo-visual-interaccion-ui.md)). | La columna no lista objetos ni huecos; la gestión completa ocurre en el panel. |
| R-005 | En estado fantasma, la columna indica la condición y muestra el MP intrínseco; el inventario y el equipo ya no forman parte de esta columna. | Un jugador muerto ve su estado fantasma y su MP; no hay objetos que ocultar o revelar aquí. |
| R-006 | En hotseat, la columna sigue automáticamente al jugador activo. | Cada turno muestra al jugador correcto sin acción manual. |
| R-007 | La información se lee en una columna de ~162 px lógicos sin texto ilegible. | QA visual a 1280×720 y 1920×1080: texto legible, sin recortes ni solapes. |
| R-008 | La columna es informativa: no tiene comandos propios. Equipar, recoger y soltar ocurren en el panel de `I`. | Ninguna tecla nueva actúa sobre la columna; el panel se abre con `I` desde cualquier punto del turno. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El host deriva el panel del snapshot del motor; no guarda estado propio de juego. | El panel coincide con el snapshot en cada turno y tras cargar partida. |
| T-002 | Las constantes de marco, mapa y columnas se derivan de una única fuente; no hay literales duplicados. | Cambiar el viewport o el alto lógico recalcula columnas y anclajes; los tests lo cubren. |
| T-003 | El panel se dibuja en la capa de HUD del host (Canvas o DOM alineado al marco) sin alterar la resolución lógica ni el render del mapa. | Capturas sin desplazamiento de tiles; el mapa conserva 13×13 y el 16:9. |
| T-004 | El cambio de jugador activo se refleja sin parpadeo ni reconstrucción completa del marco. | Test de presentación: cambio de turno actualiza el panel en el beat de turno. |
| T-005 | El estado fantasma del panel se alimenta de `REQ-021` y no inventa stats ni equipo. | Tests con jugador vivo, muerto y fantasma; el panel oculta lo que no existe. |
| T-006 | Tests nuevos: geometría, contenido por estado, cambio de turno, fantasma, legibilidad y E2E de captura. | `pnpm run verify` pasa; los tests de `REQ-002` y `REQ-005` conservan su intención. |
| T-007 | Se actualizan arquitectura, glosario y `REQ-002`/`REQ-005`; se registra la decisión de HUD interior. | `docs:check` pasa; no queda documentación que diga que el HUD vive fuera del marco. |
| T-008 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian; el motor sigue sin DOM. |

# Requisitos no funcionales

- **Rendimiento:** el panel se actualiza solo cuando cambia el snapshot o el turno;
  no recalcula el mapa.
- **Accesibilidad:** texto legible y contraste suficiente; la información no
  depende solo de iconos, colores o miniaturas.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Mantenibilidad:** geometría en una fuente única; contenido del panel separado
  del render del mundo.

# Dependencias

- [REQ-002](REQ-002-encuadre-16-9.md) y [REQ-005](REQ-005-viewport-impar-13.md):
  marco, viewport y laterales.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): atributos y MP.
- [REQ-015](REQ-015-roster-arquetipos.md): nombre, arquetipo y variantes de sprite.
- [REQ-018](REQ-018-inventario-equipo.md): inventario y huecos de equipo; esta
  hoja solo los presenta.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): estado fantasma.
- [REQ-016](REQ-016-pantalla-inicio-configuracion.md): jugadores de la partida en
  hotseat.

# Fuera de alcance

- El panel derecho del cursor (`REQ-023`).
- La gestión de inventario y equipo, que vive en el panel de `I`
  ([REQ-018](REQ-018-inventario-equipo.md), [REQ-032](REQ-032-estilo-visual-interaccion-ui.md)).
- Pantalla completa de inventario o personaje.
- Rediseño del mapa, del viewport o del marco 16:9.
- Arte final de retratos e iconos.
- HUD de otros jugadores no activos.

# Preguntas abiertas

1. **Miniatura.** ¿Sprite del personaje, retrato propio o silueta por arquetipo?
   El pack no trae retratos.
2. **Suelos de traits.** Cómo se indica un trait recortado por el suelo (MP ≥ 0,
   acciones ≥ 1) sin que parezca activo.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | El HUD del jugador activo ocupa la columna izquierda del marco y sustituye al HUD exterior. | human:simon | aceptada |
| 2026-11-13 | La columna muestra nombre, arquetipo, PV, MP, acciones, atributos con efecto y traits activos; el inventario y el equipo se consultan en el panel con `I`. | human:simon | aceptada |
| 2026-11-13 | El maná se añade a la columna solo cuando el personaje lo necesita (máximo mayor que cero); sin maná, la línea se omite. | human:simon | aceptada |
| 2026-11-13 | El panel es informativo en lo que respecta a esta columna; la interacción vive en el panel de inventario. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [ ] El grafo de tareas es posible sin cerrar `REQ-018`; el orden se decide al abrirlo.
