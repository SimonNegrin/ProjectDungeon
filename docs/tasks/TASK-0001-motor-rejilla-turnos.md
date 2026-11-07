---
type: Task
id: TASK-0001
title: Motor de partida con rejilla, turnos, combate e IA
description: Implementa el motor determinista del primer prototipo, sin UI, con tests unitarios.
status: stable
task_status: done
task_type: feature
requirement: REQ-001
requirement_ids: [T-001, R-003, R-004, R-005]
depends_on: []
unlocks: [TASK-0002]
created_at: 2026-11-07T15:24:03Z
completed_at: 2026-11-07T15:35:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0001/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
verified: { by: task-lead, at: 2026-11-07T15:35:00Z }
---

# Objetivo

Tener un motor de juego determinista y testeable que represente la sala de
32×24, el jugador, el enemigo, el movimiento, el combate, el orden de turnos, la
IA básica y las condiciones de victoria y derrota. Sin Canvas, sin teclado y sin
HUD.

# Contexto

- Requisito: [REQ-001](../requirements/REQ-001-primer-prototipo-local.md).
- Reglas: [economía de turno provisional](../design/turn-economy.md).
- Arquitectura: [motor separado del render](../design/architecture.md).
- Tests: [estrategia de tests](../quality/test-strategy.md).
- No hay código de juego todavía; se puede crear `src/game/` desde cero.

# Criterios de aceptación

- [x] Existe `src/game/` con estado serializable, comandos y una función de
      reducción pura que devuelve eventos.
- [x] La sala mide 32×24, tiene muros en el borde y suelo transitable; las
      entidades no pueden ocupar muros ni casillas ocupadas.
- [x] El movimiento es en 8 direcciones, cuesta 1 MP por casilla (también en
      diagonal), el jugador tiene 4 MP y el enemigo 3.
- [x] No se permite cortar esquinas: una diagonal requiere libres las dos
      casillas ortogonales adyacentes.
- [x] Cada unidad tiene una acción por turno. El ataque básico solo funciona en
      adyacencia (incluidas diagonales), hace 5 al enemigo y 3 al jugador.
- [x] Vida inicial: 20 del jugador y 10 del enemigo. La muerte ocurre al llegar
      a 0 y emite evento.
- [x] `EndTurn` cierra la fase del jugador, ejecuta la fase enemiga completa y
      devuelve el control al jugador restaurando MP y acción.
- [x] La IA elige al jugador más cercano; si está en rango, ataca; si no,
      avanza una casilla con un pathfinding simple y determinista; si no puede,
      espera.
- [x] La partida termina en victoria si no quedan enemigos vivos y en derrota si
      no quedan jugadores vivos. `Restart` vuelve al estado inicial.
- [x] El motor no importa DOM, Canvas, red ni teclado; no usa `Math.random` ni
      `Date.now` para reglas.
- [x] Los tests cubren movimiento, diagonal sin corte, ocupación, MP, acción,
      combate, cambio de fase, IA, victoria, derrota y determinismo.
- [x] `pnpm run verify` pasa y el informe incluye el commit SHA.

# Plan de test

- **Unitario:** movimiento ortogonal y diagonal, coste de MP, corte de esquina,
  ocupación, ataque en rango y fuera de rango, acción única, daño, muerte,
  restauración de turno, IA que ataca, IA que avanza, IA bloqueada, victoria,
  derrota y reinicio.
- **Integración:** secuencia de comandos `Move`/`Attack`/`EndTurn` produce los
  eventos y el estado esperados.
- **Determinismo:** dos ejecuciones con la misma secuencia de comandos producen
  el mismo estado serializado.
- **E2E / visual:** no aplica en esta tarea.
- **Manual:** no aplica hasta que exista host.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración del motor |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run build` | 120 s | Typecheck y build |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0001/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0001/attempt-1/test-output.txt`
- [x] Commit SHA en la rama `task/TASK-0001`
- [x] Sin capturas: esta tarea no tiene UI

# Verificación

- `task-lead` revisó el diff completo de `task/TASK-0001` (solo `src/game/`,
  `tests/unit/game/` y artefactos).
- `pnpm run verify` re-ejecutado de forma independiente: docs, config, 49 tests
  y build OK.
- 8 archivos de test, 49 tests, 0 fallos, 0 tests saltados.
- Sin cambios en UI, host, experimentos, assets, dependencias ni configuración.
- Sin tests existentes borrados, saltados o debilitados.
- Commit de implementación: `8ec0d3feffb8753994730c5e6d528b0ba31eab53`.
- Evidencia: `artifacts/TASK-0001/attempt-1/report.md` y
  `artifacts/TASK-0001/attempt-1/test-output.txt`.

# Restricciones

- No implementar Canvas, cámara, teclado, HUD ni overlays.
- No añadir dependencias nuevas sin justificarlo.
- No usar ECS ni un motor genérico.
- No leer el estado desde el DOM ni desde variables globales para las reglas.
- No debilitar tests existentes.
- Mantener el código en TypeScript estricto.

# No objetivos

- Render, arte y assets.
- Input real de teclado.
- Sonido y animaciones.
- Balance fino.

# Notas

- La IA puede usar BFS sobre la rejilla; debe ser determinista al desempatar
  (por índice de enemigo y orden fijo de direcciones).
- El estado debe incluir listas de jugadores y enemigos aunque de momento haya
  uno de cada, para no bloquear el hotseat futuro.
- La rama de trabajo es `task/TASK-0001`; el `task-lead` la crea antes de lanzar
  al runner.
