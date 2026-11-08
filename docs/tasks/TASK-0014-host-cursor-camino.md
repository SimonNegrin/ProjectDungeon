---
type: Task
id: TASK-0014
title: "Host: cursor, input, camino y feedback"
description: Integra el cursor de selección en el host, mapea el teclado, dibuja estados y camino, actualiza HUD/debug y sustituye el resaltado de casilla activa.
status: stable
task_status: done
task_type: feature
requirement: REQ-004
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-012, R-013, R-014, R-015, R-016, R-017, R-018, T-001, T-005, T-006, T-007, T-008, T-009, T-010, T-011, T-012]
depends_on: [TASK-0013]
unlocks: [TASK-0015]
created_at: 2026-11-08T01:27:27Z
completed_at: 2026-11-08T02:00:19Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0014/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:27:27Z }
verified:
  - by: task-lead
    at: 2026-11-08T02:00:19Z
    note: "Verificación independiente: diff completo de host, `index.html` y tests; `pnpm run verify` OK (83 documentos, 3 agentes/9 skills, 305 tests en 27 archivos, build 47 módulos) y `pnpm run test:e2e` OK (19 tests). Revisados los 12 criterios: cursor sobre jugador, movimiento sin MP/acción/cámara, clamp al viewport, estados y patrones, camino fuerte/atenuado, `Espacio`/`Enter`/`F`/`E`, avisos, persistencia/reinicio, ausencia de `active-tile`, snapshot/debug y feedback de ataque intacto. Sin tests borrados, saltados o debilitados; los E2E de `Espacio`-atacar se migraron a `F`/Moverse. Sin cambios en `src/game/`, `docs/`, requisitos ni dependencias. Commit de implementación `2e60eea`, informe `269671d`, evidencia del lead `45cf52b`, fusión `f6dc8fd`. Fricción de capturas E2E que ensucian artefactos históricos: triada como cambio de arnés/documentación, elevada a `requirements-writer`, disposición `deferred`."
---

# Objetivo

Que el juego muestre el cursor de `REQ-004` y se pueda jugar con él: aparece
sobre el jugador al empezar el turno, se mueve en 4 direcciones sin gastar MP ni
mover la cámara, colorea el destino, dibuja el camino, envía **Moverse** y
**Atacar**, se oculta en la fase enemiga y muestra avisos cuando una acción no es
válida. El resaltado de casilla activa se sustituye por el cursor.

# Contexto

- Requisito: [REQ-004](../requirements/REQ-004-cursor-seleccion.md).
- Planificación y clasificación: TASK-0012.
- Comando de movimiento por destino: TASK-0013.
- Host actual: `src/host/main.ts`, `input.ts`, `renderer.ts`, `hud.ts`,
  `debug.ts`, `feedback.ts`, `geometry.ts`, `camera.ts`, `session.ts`.
- Estructura y estilos: `index.html`.
- Tests existentes de input, HUD, cámara y E2E de encuadre.
- El E2E actual ataca con `Espacio`; con el nuevo mapa de teclas debe atacar con
  `F` o con **Moverse** sobre un enemigo adyacente.

# Diseño técnico de referencia

## Estado del cursor

- Añadir un módulo de host, por ejemplo `src/host/cursor.ts`, con el estado
  `{ x, y }` y funciones puras para inicializar, mover, limitar y reiniciar.
- Al arrancar y al recibir `PlayerTurnStarted`, `GameRestarted` o una
  regeneración (`F2`), colocarlo en el tile del jugador activo.
- Al moverse o atacar no se recentra.
- Limitar el cursor al rango de tiles que intersecta el viewport de la cámara.
  Si la cámara se desplaza por el movimiento del jugador, recolocarlo al tile
  visible más cercano. Mover el cursor nunca debe mover la cámara.
- Ocultarlo cuando la fase no sea `player` o la partida haya terminado. Las
  teclas de cursor y acción no deben cambiar el estado en esos casos.
- Ignorar la repetición automática de teclas: cada pulsación mueve un tile.

## Input

- Extender `translateKey` para recibir el cursor y devolver una intención de
  movimiento de cursor (`{ type: 'cursor', dx, dy }`) para flechas/`WASD`.
- `Espacio`/`Enter` envían el comando de movimiento por destino con el tile del
  cursor.
- `F` busca un enemigo vivo en el tile del cursor y envía `Attack`; si no hay
  enemigo, no despacha y muestra aviso.
- `E`, `R`, `F1` y `F2` conservan su comportamiento.
- Añadir `F` a `isManagedKey` y actualizar las razones de ignorado si hace falta.
- El input sigue siendo puro; el host aplica el movimiento del cursor sin pasar
  por el motor.

## Render

- Dibujar el cursor como un cuadrado de un tile con borde y relleno translúcido:
  verde sólido, ámbar discontinuo, rojo doble, blanco neutro y rojo con marca de
  objetivo para enemigo. La marca puede ser una cruz o cuatro esquinas;
  placeholder, no arte final.
- Dibujar el camino con puntos blancos semitransparentes en cada tile del plan,
  sin el tile del jugador. Los primeros `min(coste, MP)` pasos van en tono fuerte
  y el resto atenuado. No dibujar puntos en `player` o `blocked`.
- El camino de un enemigo termina en su tile de ataque, nunca en el tile del
  enemigo.
- Recortar cursor y puntos al viewport. El marco ya tiene `overflow: hidden`; si
  se usa DOM, no interceptar clics (`pointer-events: none`).
- Mantener la nitidez del pixel art, el encuadre 16:9, la cámara y el feedback de
  ataque. Eliminar el `active-tile` y su actualización para no dibujar dos marcos
  sobre el jugador.
- Para E2E, exponer atributos estables: por ejemplo
  `[data-testid="cursor"]` con `data-cursor-state` y
  `[data-testid="cursor-path"]` con un hijo por punto. Si el camino se dibuja en
  Canvas, el snapshot debe cubrir la misma información.

## HUD, debug y snapshot

- Actualizar `KEYS_HELP`: flechas/`WASD` cursor; `Espacio`/`Enter` moverse (sobre
  enemigo, acercarse y atacar); `F` atacar; `E` terminar; `R` reiniciar; `F1`
  debug.
- Añadir un aviso breve en el HUD (nuevo `data-testid`, por ejemplo
  `hud-message`) para `Destino no válido`, `Enemigo fuera de alcance`,
  `Sin acción` y `Sin MP`. Se deriva de `CommandRejected` o del input; no cambia
  el estado y no bloquea la siguiente pulsación.
- Extender `GameSnapshot` con `cursor: { x, y, visible, kind, state, path,
  attackTile? }`. El snapshot debe ser serializable.
- El overlay de debug muestra coordenadas y estado del cursor.
- `window.__game.dispatch` acepta el comando de movimiento por destino.

# Criterios de aceptación

- [ ] El cursor aparece sobre el jugador al arrancar, en blanco neutro, y se
      mueve un tile por pulsación con flechas/`WASD` en 4 direcciones.
- [ ] Mover el cursor no cambia MP, acción, turno ni cámara; puede cruzar muros y
      unidades; en el borde no se mueve.
- [ ] El cursor queda limitado al viewport y se recoloca si la cámara se desplaza
      al mover al jugador.
- [ ] Los estados verde/ámbar/rojo/enemigo/jugador se ven con color y patrón de
      borde; el enemigo muestra marca de objetivo.
- [ ] El camino se dibuja con puntos fuertes/atenuados según el MP, no aparece en
      rojo/jugador y se actualiza al mover cursor, jugador, MP o atacar.
- [ ] `Espacio`/`Enter` envían **Moverse** al tile del cursor; `F` ataca al
      enemigo bajo el cursor; `E` termina el turno; no hay botones clicables
      nuevos y la ayuda del HUD refleja el mapa.
- [ ] Los rechazos muestran aviso breve y no alteran el estado.
- [ ] El cursor permanece tras moverse o atacar, se reinicia al empezar turno,
      reiniciar o cambiar semilla y se oculta en fase enemiga/partida terminada.
- [ ] El resaltado `active-tile` desaparece; el flash y el número de daño se
      mantienen.
- [ ] `window.__game.snapshot()` expone cursor, estado, camino y tile de ataque;
      el debug muestra la información.
- [ ] Tests unitarios de cursor, input, clasificación, camino y HUD; E2E de humo
      de cursor, camino y movimiento. Se actualizan los E2E existentes sin
      debilitarlos.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- **Unitario:** inicialización, movimiento, clamp, reset y ocultación del cursor;
  mapeo de teclas a intención/comando; clasificación y camino a partir del plan;
  modelo del HUD y mensajes de rechazo; snapshot con cursor.
- **Integración:** input -> cursor/MoveTo -> motor -> eventos -> render/HUD;
  reinicio y cambio de semilla.
- **E2E / visual:** humo con cursor sobre el jugador, movimiento, camino verde,
  `Espacio` para moverse, `F` para atacar y captura de cursor/path. La cobertura
  amplia es TASK-0015.
- **Manual:** revisar legibilidad de colores, patrones, puntos y avisos.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Cursor, input, HUD y snapshot |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Cursor, camino, teclado y flujo jugable |
| `pnpm run build` | 120 s | Build final |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0014/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0014/attempt-1/test-output.txt`
- [ ] Salida E2E en `artifacts/TASK-0014/attempt-1/e2e-output.txt`
- [ ] Capturas de cursor y camino en `artifacts/TASK-0014/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0014`

# Restricciones

- No cambiar reglas del motor, economía, combate, mapa ni IA.
- Usar la planificación de TASK-0012 y el comando de TASK-0013; no duplicar
  pathfinding ni clasificación en el host.
- No añadir dependencias.
- No añadir botones clicables de Moverse/Atacar/Terminar.
- No romper el encuadre 16:9, la cámara, el HUD, el debug ni el feedback de
  ataque.
- No debilitar tests; actualizar las expectativas de teclas es parte de la tarea.

# No objetivos

- Planificación y comando del motor (TASK-0012/TASK-0013).
- E2E exhaustivo y QA visual amplia (TASK-0015).
- Arte final del cursor, animaciones o audio.
- Ratón, táctil, botones clicables, ataque a distancia o línea de visión.
- Hotseat, multijugador, objetos nuevos o guardado.

# Notas

- El DOM es la opción más simple para testear estados y patrones; Canvas es
  aceptable si el snapshot cubre la misma información y la QA visual lo valida.
- Reutilizar `mapXToFramePercent`, `mapYToFramePercent`,
  `mapWidthToFramePercent` y `mapHeightToFramePercent` para posicionar cursor y
  puntos.
- El aviso del HUD debe ser transitorio y no competir con la ayuda de teclas.
- Si el cursor está sobre un enemigo adyacente, el camino está vacío pero la
  marca de objetivo debe verse; **Moverse** ataca.
- Actualizar `tests/e2e/frame-qa.spec.ts` y cualquier otro E2E que use
  `Espacio` para atacar; el ataque directo pasa a `F`.
