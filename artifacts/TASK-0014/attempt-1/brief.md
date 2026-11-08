---
type: Task Brief
title: "TASK-0014: brief del intento 1"
description: Cursor de selección en el host, teclado, estados/patrón, camino, HUD y snapshot.
task: TASK-0014
attempt: 1
status: stable
brief_bytes: 4123
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:44:56Z }
---

# Objetivo

Integrar en `src/host/` el cursor de `REQ-004`: estado de presentación,
movimiento con flechas/`WASD`, **Moverse** con `Espacio`/`Enter`, **Atacar** con
`F`, estados y camino dibujados, avisos de rechazo, snapshot/debug ampliados y
eliminación del `active-tile`. Actualizar los E2E existentes a `F`/Moverse sin
perder cobertura.

# No objetivos

Fuera de alcance según la tarea: reglas/pathfinding/comandos del motor
(TASK-0012/0013 hechos), E2E exhaustivo y QA amplia (TASK-0015), arte final,
animaciones, audio, ratón, táctil, botones clicables, ataque a distancia,
objetos, guardado o red. Sin dependencias nuevas.

# Invariantes

- Cursor = estado del host; `src/game/` no importa DOM/input.
- Reutilizar `planCursorTarget` y `MoveTo`; no duplicar pathfinding ni
  clasificación en el host.
- `translateKey` puro; el host mueve el cursor sin pasar por el motor. Ignorar
  repetición automática y modificadores.
- Mover cursor no cambia MP, acción, turno ni cámara; cruza muros/unidades; en el
  borde del viewport no se mueve.
- El cursor no se recentra al moverse/atacar. Solo vuelve al jugador al arrancar,
  `PlayerTurnStarted`, `GameRestarted` y `F2`.
- Oculto e inerte en fase enemiga o partida terminada.
- Camino exacto al de `planCursorTarget`; el de enemigo termina en `attackTile`,
  nunca en el tile del enemigo.
- Recorte al viewport; cursor DOM con `pointer-events: none`.
- Mantener 16:9, cámara, pixel art, HUD, debug y feedback de ataque. Sin botones
  clicables nuevos.
- No borrar, saltar ni debilitar tests; actualizar las teclas esperadas es parte
  de la tarea (`Espacio` deja de atacar).

# Criterios de aceptación

Viven en `docs/tasks/TASK-0014-host-cursor-camino.md`, sección «Criterios de
aceptación»; cubrir también su «Plan de test». Enlazar con ancla; no copiar.

# Contexto mínimo

- `src/host/main.ts`: bucle, cámara, `applyCommand`, teclado y `active-tile`.
- `src/host/input.ts`: `translateKey`, `isManagedKey`, intenciones.
- `src/host/renderer.ts` + `layout.ts`: render y mapeo mapa→marco.
- `src/host/hud.ts`: `KEYS_HELP`, modelos y vistas HUD/debug.
- `src/host/debug.ts`: `GameSnapshot`, `createDebugApi`, `dispatch`.
- `src/host/session.ts`, `camera.ts`, `geometry.ts`, `feedback.ts`.
- `src/game/path.ts` (`CursorTargetPlan`/`planCursorTarget`),
  `src/game/types.ts` (`MoveTo`, `RejectionReason`, `CommandRejected`).
- `index.html`: HUD, `active-tile`, overlay; añadir `cursor`, `cursor-path` y
  `hud-message` con `data-testid` estables.
- Tests: `tests/unit/host/*` y `tests/e2e/{game-input-hud,frame-qa}.spec.ts`;
  `tests/e2e/support.ts` (`walkTo`/`approachEnemy` usan `Move` y siguen válidos).
- Requisito: [REQ-004](../../../docs/requirements/REQ-004-cursor-seleccion.md),
  R-001..R-018 y T-001/T-005..T-012.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run test:e2e` | 240 s |
| `pnpm run build` | 120 s |

Servidores solo vía `webServer` de Playwright o puerto fijo con salud y cierre.

# Artefactos

- `report.md` según `docs/templates/task-report.md`.
- `test-output.txt`, `verify-output.txt`, `e2e-output.txt`.
- `screenshots/`: cursor jugador, camino verde, ámbar, enemigo con marca,
  rojo/bloqueado, aviso HUD y ataque con flash/daño.
- Commit(s) en `task/TASK-0014`; SHA en el informe.

# Riesgos y decisiones abiertas

- DOM o Canvas para cursor/path: si es Canvas, snapshot y `data-testid` deben
  cubrir la misma información y la QA visual lo valida.
- Derivar el estado del plan (`player`, `floor` con/sin MP, `blocked`, `enemy`)
  sin inventar reglas.
- Avisos desde `CommandRejected`/input con los cuatro textos aprobados,
  transitorios y sin bloquear la siguiente pulsación.

# Desbordamiento

Sin anexo. `read_detail: false`.
