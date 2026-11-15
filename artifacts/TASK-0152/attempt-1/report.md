---
type: Task Report
title: "TASK-0152: informe de ejecución"
description: Fase enemiga con aviso condicional, cámara y HUD de actor/objetivo.
task: TASK-0152
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T22:55:00Z }
artifacts: artifacts/TASK-0152/attempt-1/
verified:
---

# Estado

`success`. Fase enemiga presentada; `enemyPhase` propagada; tests y
`pnpm run verify` pasan.

# Cambios

- `session.ts` reenvía `enemyPhase`; `presentation.ts` decide si hay acciones y
  qué actor/objetivo se presenta.
- `motion.ts`: sin acciones no hay cue de fase; con acciones el pre-beat dura
  800 ms y los atacantes inmóviles reciben foco de cámara.
- `hud.ts`/`hud-detail.ts`/`main.ts`: HUD derecho con el actor y ficha compacta
  del objetivo en el izquierdo (miniatura, nombre, PV, MP/acciones y stats; sin
  arma, traits ni inventario). Sin objetivo muestra «Sin objetivo».
- `feedback-events.ts`: «El master mueve» sustituye `FASE ENEMIGA`.
- Commits: `0c4a321` (implementación), `75a5061` (tests y capturas).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 108 archivos/1727 tests, build y bundle | `verify-output.txt` |
| Vitest HUD + presentación | 54 tests OK | `test-output.txt` |
| E2E nueva `host-enemy-phase-qa` | 1 test OK | `logs/e2e-host-enemy-phase.txt` |
| E2E sensibles (offscreen, feedback, motion, marks, hotseat, relevo) | 3+6+8+4+5+4 OK | `logs/e2e-*.txt` |

# Evidencia visual

- `tests/e2e/host-enemy-phase-qa/screenshots/master-mueve.png`: aviso con
  acciones.
- `.../hud-actor-objetivo.png`: actor a la derecha; ficha compacta del objetivo
  a la izquierda, sin zona de arma.
- `.../vuelta-ronda-2.png`: vuelta al jugador y ronda siguiente.

# Desviaciones

- El pre-beat de fase con acciones pasa de 400 a 800 ms para que el aviso
  desaparezca antes de actuar (R-007). Se ajustaron las esperas de
  `enemy-phase-offscreen-qa` y `motion-qa` sin relajar aserciones.
- `feedback-inventory-perception-qa` usaba una fase sin acciones y esperaba
  banner; ahora verifica el criterio nuevo (sin acciones no hay aviso).
- El HUD compacto conserva MP y Acciones del layout; no publica equipo ni
  inventario.

# Problemas conocidos y preguntas abiertas

- Suite E2E completa pendiente para TASK-0154; aquí se ejecutaron las specs
  sensibles por separado.
- El aviso se apaga al empezar la primera acción; no hay temporizadores reales.

# Fricción reutilizable

Ninguna entrada; los fallos eran de la propia tarea.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2555 |
| `report_bytes` | 2678 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
