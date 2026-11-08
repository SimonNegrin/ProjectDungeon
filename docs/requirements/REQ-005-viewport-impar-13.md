---
type: Requirement Sheet
id: REQ-005
title: Viewport impar 13×13 con jugador centrado y tiles completos
description: Cambiar el sub-viewport cuadrado del mapa de 12×12 a 13×13 tiles para que el jugador ocupe el tile central y los bordes muestren tiles completos, sin medios tiles.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T09:12:11Z
updated_at: 2026-11-08T09:30:52Z
related_tasks: [TASK-0016]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:12:11Z }
verified:
  - by: human:simon
    at: 2026-11-08T09:12:11Z
    note: Aprueba cambiar el viewport a 13×13 tiles para que el jugador quede centrado y los bordes muestren tiles completos.
  - by: human:simon
    at: 2026-11-08T09:30:52Z
    note: Playtest aprobado; el viewport 13×13 centra al jugador y los bordes muestran tiles completos. REQ-005 completada.
---

# Contexto

El sub-viewport del mapa mide 12×12 tiles (384×384 px lógicos). Al ser par, no
tiene un tile central: para centrar al jugador la cámara queda desplazada medio
tile y los bordes del recuadro muestran medios tiles. El resultado se lee como un
tablero cortado y dificulta juzgar distancias y límites.

Con un lado impar el jugador ocupa el tile central y quedan 6 tiles completos a
cada lado, arriba y abajo. El cambio mantiene el tile de 32 px lógicos y el marco
16:9; como consecuencia, la altura lógica del marco pasa de 384 a 416 px y todo
el encuadre se presenta un 8 % más pequeño en la misma ventana. El usuario ha
elegido 13×13 frente a 11×11 para no perder campo de visión.

`REQ-005` sustituye el tamaño del sub-viewport de `REQ-002` (R-003, R-005 y R-007)
y las referencias equivalentes de `REQ-003` y `REQ-004`. No cambia el resto del
encuadre, la cámara, el HUD, el cursor, la economía de turno ni la generación del
mapa.

# Objetivos de experiencia

- Que el jugador se vea exactamente en el centro del tablero visible.
- Que los cuatro bordes del recuadro muestren tiles completos, sin cortes a
  mitad de tile.
- Que moverse y calcular distancias siga siendo intuitivo con el tile central
  como referencia.
- Que el cursor siga teniendo el mismo alcance relativo: ahora cubre 13×13 tiles.
- Que el cambio no introduzca borrosidad ni desplazamientos de pixel art.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El sub-viewport del mapa es cuadrado y muestra exactamente 13×13 tiles de 32 px lógicos (416×416 px lógicos), centrado en el marco 16:9. | Se cuentan 13 columnas y 13 filas completas dentro del recuadro del mapa; el recuadro sigue siendo 1:1 y está centrado horizontal y verticalmente. |
| R-002 | Cuando la cámara no está limitada por un borde del mapa, el tile del jugador es el tile central: quedan 6 tiles completos a izquierda, derecha, arriba y abajo. | El centro del sprite del jugador coincide con el centro del sub-viewport (±1 px de presentación); no se ve medio tile en ningún borde. |
| R-003 | En los bordes del mapa la cámara se detiene como hasta ahora y los tiles siguen alineados a la rejilla; el tile del jugador deja de estar centrado solo cuando el clamp lo impide. | En las cuatro esquinas y bordes del mapa no aparecen medios tiles; el jugador permanece visible y la cámara no supera los límites. |
| R-004 | El campo de visión aumenta de 12×12 a 13×13 tiles. Se mantienen el marco 16:9, los laterales negros, el HUD, el feedback de ataque y el aspecto del cursor. | El área visible crece en una fila y una columna; los laterales siguen negros y el HUD/feedback no se recortan. |
| R-005 | El cursor puede recorrerse por los 13×13 tiles visibles y su camino se recorta al sub-viewport como antes. | En el centro del mapa el cursor alcanza los 13 tiles por eje; en el borde del viewport se detiene y los puntos fuera se recortan. |
| R-006 | El enemigo sigue apareciendo fuera del viewport inicial y a una distancia de camino mínima de 12 tiles. | Un BFS confirma distancia ≥12 y el enemigo no cae dentro del rectángulo inicial de 13×13. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | `MAP_TILES_PER_AXIS` pasa a 13 y `MAP_VIEWPORT` a 416×416. La altura lógica del marco es 13×32 = 416 px y la anchura se deriva de 16:9 (739,55… px). | Las constantes derivadas, el canvas de respaldo, el offset del mapa y los porcentajes del overlay se recalculan desde el nuevo viewport; no quedan literales de 12 tiles en producción. |
| T-002 | La cámara centra al jugador sin casos especiales: con viewport impar, `centro del tile − viewport/2` cae en múltiplos de 32 px cuando no hay clamp. | Tests unitarios comprueban cámara centrada, rango visible de exactamente 13×13 y alineación de la cámara a múltiplos de 32 px; el clamp en los cuatro bordes sigue funcionando. |
| T-003 | La comprobación de aparición del BSP usa un rectángulo 13×13 simétrico respecto al jugador. El origen debe calcularse con `floor(13/2) = 6`, no con una división fraccionaria. | El enemigo de la semilla de referencia sigue fuera del viewport inicial; los tests de spawn y el E2E de mapa generado lo verifican. |
| T-004 | El render de respaldo conserva la nitidez del pixel art. Se eligen dimensiones y offsets enteros que eviten desplazamientos subpíxel de tiles y sprites, aunque la proporción interna difiera de 16:9 en menos del 0,05 %. | La QA visual no muestra bordes borrosos ni tiles de distinto grosor; el mapa sigue centrado y los laterales negros miden lo mismo a ambos lados (±1 px de respaldo). |
| T-005 | Se actualizan todas las expectativas unitarias y E2E afectadas: layout, cámara, renderer, cursor, debug, HUD, mapa, BSP, encuadre, render y QA visual. No se borran, saltan ni debilitan tests. | `pnpm run verify` y `pnpm run test:e2e` pasan con las nuevas dimensiones; los tests existentes conservan su intención. |
| T-006 | El motor no cambia reglas de movimiento, combate, turnos, IA ni generación, salvo la comprobación del rectángulo inicial de aparición. No se añaden dependencias. | `pnpm-lock.yaml` y `package.json` no cambian; los tests de motor siguen pasando. |
| T-007 | La documentación de estado actual (diseño de economía de turno y README) refleja el viewport de 13×13. Las hojas históricas de requisitos no se reescriben; `REQ-005` registra la sustitución. | `pnpm run docs:check` pasa; no quedan referencias vigentes a 12×12 fuera de documentos históricos. |

# Requisitos no funcionales

- **Rendimiento:** el área visible crece un 17 %; el render debe mantener los
  60 fps objetivo sin nuevas dependencias.
- **Accesibilidad:** el HUD, los avisos y el cursor siguen siendo legibles; el
  estado del cursor no depende solo del color.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** el tamaño del viewport tiene una única fuente de verdad y
  las dimensiones derivadas se calculan a partir de ella.

# Dependencias

- `REQ-001`, `REQ-002`, `REQ-003` y `REQ-004` cerradas.
- [REQ-002](REQ-002-encuadre-16-9.md): marco 16:9, cámara, laterales y render
  interno.
- [REQ-003](REQ-003-generacion-mapa.md): mapa BSP y aparición fuera del
  viewport.
- [REQ-004](REQ-004-cursor-seleccion.md): cursor limitado al viewport.
- No se requiere ADR nuevo: el cambio de tamaño del viewport es una decisión
  técnica rutinaria dentro del encuadre existente.
- No se propone experimento: el usuario ya ha elegido 13×13 y el resultado es
  determinista.

# Fuera de alcance

- Cambiar el tamaño de tile (32 px), la relación 16:9 o la disposición del HUD.
- Cambiar la distancia mínima de aparición del enemigo (12 tiles de camino).
- Rediseñar la cámara, el cursor, los laterales o el feedback de ataque.
- Cambiar el tamaño del mapa (32×32), la generación BSP o la economía de turno.
- Zoom, viewport no cuadrado o viewports distintos por eje.
- Arte final, animaciones o audio.

# Preguntas abiertas

Ninguna. El usuario ha elegido 13×13 y el resto son consecuencias técnicas
rutinarias del encuadre actual.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Sub-viewport cuadrado de 13×13 tiles en lugar de 12×12. | human:simon | aceptada |
| 2026-11-08 | Mantener tiles de 32 px lógicos: el marco crece a 416 px de alto y se presenta un 8 % más pequeño. | requirements-writer | aceptada |
| 2026-11-08 | Mantener la distancia mínima de camino de 12 tiles y exigir que el enemigo quede fuera del viewport de 13×13. | requirements-writer | aceptada |
| 2026-11-08 | Ajustar el render de respaldo para conservar offsets enteros y pixel art nítido, aunque la proporción interna difiera de 16:9 en menos del 0,05 %. | requirements-writer | aceptada |
| 2026-11-08 | Playtest aprobado: el viewport 13×13 está bien; jugador centrado y bordes con tiles completos. `REQ-005` completada. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas.
- [x] El usuario ha hecho el playtest y ha aprobado el viewport de 13×13.
