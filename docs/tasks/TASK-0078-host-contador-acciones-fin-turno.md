---
type: Task
id: TASK-0078
title: "Host: contador de acciones, fin de turno y beats"
description: "Mostrar acciones restantes/máximas en HUD y debug, mantener el cierre manual con E con sugerencia sin auto-terminar y presentar un beat por acción en secuencia."
status: stable
task_status: done
task_type: feature
requirement: REQ-026
requirement_ids: [R-001, R-008, T-006, T-007, T-008]
depends_on: [TASK-0077]
unlocks: [TASK-0079]
created_at: 2026-11-12T14:40:00Z
completed_at: 2026-11-12T19:26:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0078/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:40:00Z }
verified:
  - by: task-lead
    at: 2026-11-12T19:26:00Z
    note: >-
      Verificación independiente en `task/TASK-0078` (implementación `19b12ca`,
      evidencia `7a50d18`/`6d0692d`, merge `944f5fe`). Diff completo revisado:
      solo `index.html`, `src/host/hud.ts`, `src/host/motion.ts` y tests; sin
      motor, fórmulas, balance, dependencias ni HUD lateral. Criterios
      comprobados: HUD 2/2→1/2→0/2, debug de jugador y enemigos, `E` único
      cierre sin auto-terminación, sugerencia con 0 acciones y 0 MP, beats
      separados por ataque con orden 2→1→0 y aserción de `cursor-qa` corregida a
      0. `pnpm run verify` re-ejecutado OK (1014/1014, tsc, build y bundle); dos
      ejecuciones previas fallaron solo por el timeout de 5 s de `EXP-004` bajo
      carga (ya registrado en TASK-0077), y el test aislado pasó. `pnpm run
      test:e2e` 110/110. Capturas 1280×720 y 900×700 revisadas. Sin tests
      borrados, saltados ni debilitados. Fricción del enlace del brief,
      `deferred` a `harness-keeper`. Sin resultado creativo pendiente.
---

# Objetivo

Que el jugador vea sus acciones de un vistazo, cierre el turno solo con `E` y vea
una secuencia de beats por acción, sin que gastar la última acción cambie de
turno ni agrupe ataques. El HUD y el debug exponen acciones máximas y restantes.

# Contexto

- `src/host/hud.ts`: `HudModel.action` es hoy un booleano; `buildHudModel` y
  `buildDebugModel` son los puntos de exposición.
- `src/host/input.ts`: `E` ya cierra el turno; revisar que no haya
  auto-terminación al agotar acciones.
- `src/host/feedback.ts` y `src/host/motion.ts`: timeline de eventos y
  reconstrucción de la presentación; cada acción debe producir su beat en orden.
- `index.html`: nodo `hud-action`; se conserva el HUD actual, sin rediseñar las
  columnas laterales de `REQ-022`/`REQ-023`.
- Requisito: [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md).
  Depende de `TASK-0076` (contador) y `TASK-0077` (varias acciones enemigas).

# Criterios de aceptación

- [x] El HUD muestra `acciones restantes/máximas` del jugador activo y se
      actualiza tras cada ataque o interacción; el debug muestra lo mismo para
      jugador y enemigos.
- [x] `E` es la única forma de cerrar el turno; con 0 acciones el turno sigue
      activo y el jugador puede moverse con MP. No hay auto-terminación.
- [x] Cuando no quedan acciones y no hay MP útil, el HUD muestra una sugerencia
      discreta de terminar; no bloquea ni fuerza el cierre.
- [x] Cada acción produce un beat propio en la timeline, en orden, sin agrupar
      por defecto y sin adelantar ni perder acciones; el techo de `REQ-017` se
      mantiene y el turno completo se mide.
- [x] El E2E verifica dos ataques seguidos, el contador bajando de 2 a 0, el
      cierre con `E`, la sugerencia y la ausencia de auto-terminación.
- [x] `pnpm run verify` y la QA visual pasan; capturas 1280×720 y 900×700.
- [x] Se corrige la aserción de `cursor-qa` «enemigo alcanzable sin acción»:
      tras dos `F` el contador de acciones queda en 0, no en 1 (regresión de
      TASK-0076); el test conserva su intención y el E2E completo queda verde.
- [x] Sin cambios en las fórmulas, en el contador del motor ni en los valores de
      balance.

# Plan de test

- Unitario: modelo del HUD y debug con 2/2, 1/2 y 0/2; sugerencia visible solo
  con 0 acciones y sin MP útil.
- Integración: dos ataques generan dos beats y dos eventos en orden; el segundo
  no se agrupa con el primero.
- E2E / visual: contador, `E`, sugerencia, movimiento con 0 acciones y capturas.
- Manual: comprobar que el HUD no parpadea ni reinicia beats al moverse.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0078/attempt-1/report.md`
- [x] Salida de `pnpm run verify` y del E2E
- [x] Capturas en `tests/e2e/<spec>/screenshots/`
- [x] Commit SHA en la rama `task/TASK-0078`

# Restricciones

- No implementar el HUD lateral de `REQ-022`/`REQ-023`; solo extender el actual.
- No añadir auto-terminación ni atajos nuevos.
- No cambiar la duración de los beats de `REQ-017` sin decisión.
- No añadir dependencias.

# No objetivos

- Iconos, arte o texto definitivo de acciones.
- Guardado de la partida (`REQ-024` sigue en borrador).
- Hechizos, réplica o rebalanceo.
