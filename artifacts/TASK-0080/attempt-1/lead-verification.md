---
type: Task Verification
title: "TASK-0080: verificación independiente del lead"
description: Re-ejecución de verify/E2E/docs, revisión de criterios, capturas y triaje de fricción.
task: TASK-0080
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T21:55:00Z }
artifacts: artifacts/TASK-0080/attempt-1/
---

# Resultado

Verificado en `task/TASK-0080` (HEAD `29bb4b8` + docs del lead). Código, tests,
E2E y QA visual pasan. Se aplican glosario, economía de turno, arquitectura,
`ADR-022` e índice; `docs:check` pasa.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (120 s) | 1044/1044; docs, config, tsc, build y bundle OK | `logs/lead-verify.txt` |
| `pnpm run test:e2e` (180 s) | 112/112 | `logs/lead-e2e.txt` |
| `pnpm run docs:check` (60 s) | OK: 408 documentos, 84 tareas, 5 experimentos | `logs/lead-docs-check.txt` |

# Criterios

| # | Criterio | Evidencia | Estado |
|---|---|---|---|
| 1 | Ataque girado, sin texto, cue propio | `replica-presentation.test.ts`; `world-effects` dx −3; `replica-qa` | OK |
| 2 | Orden fallo → réplica → siguiente acción | unitario de orden; `replica-qa` eventos; `feedback-reduced` | OK |
| 3 | Fila en matriz y excepción de 1,3 s; reduced motion | `ADR-022` y `turn-economy` (fila/exception); reduced unitario | Parcial: fila literal en `REQ-017` elevada a requirements-writer |
| 4 | QA 1280×720 y 900×700; sin indicador en HUD | 4 PNG en `tests/e2e/replica-qa/screenshots/`; HUD sin texto | OK |
| 5 | Glosario, diseño, ADR y enmiendas; docs:check | glosario, `turn-economy`, `architecture`, `ADR-022`; docs:check | OK (enmiendas declaradas en REQ-027; REQ-009/010 con nota) |
| 6 | verify y E2E; intención de REQ-010/017 | 1044/1044 y 112/112 | OK |
| 7 | Cinco expectativas E2E actualizadas sin debilitar | diff con comentarios; ninguna aserción eliminada | OK |

# Capturas

- `replica-fallo-1280x720.png`, `replica-giro-1280x720.png`,
  `replica-fallo-900x700.png`, `replica-giro-900x700.png`.
- Revisadas a zoom: el goblin defensor se desplaza ~3 px hacia el atacante en el
  cue de réplica; el `Fallo` permanece y no aparece texto ni banner de réplica.
- El escenario de la semilla 13 produce una réplica fallida (PV 20/20); el daño
  en la barra de PV se cubre en `motion-qa` y en los unitarios de estado
  intermedio.

# Tests no debilitados

- No se elimina ninguna aserción; las cinco expectativas se acotan o corrigen con
  comentario. Las derrotas a 80 turnos usan un escenario de jugador desarmado
  (sin réplica) y `motion-qa` amplía la vida del objetivo en el fixture, no en
  el bestiario.
- `src/game/` intacto; `package.json` y `pnpm-lock.yaml` intactos.

# Triaje de fricción

| Propuesta | Clase | Disposición |
|---|---|---|
| El runner no puede editar `docs/` | Arnés/permisos | `accepted`: el lead aplica diseño, glosario, ADR e índice; queda documentado. |
| `REQ-017` sin fila/nota literal de la enmienda | Documental | `deferred` a `requirements-writer`: la enmienda está declarada en `REQ-027` y la fila equivalente en `ADR-022`/`turn-economy`. |
| Derrotas a 80 turnos y `motion-qa` con escenario acotado | Local de la tarea | `accepted`: conserva la intención y no cambia reglas. |
