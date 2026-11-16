---
type: Task Verification
title: "TASK-0148: verificación independiente del intento 2"
description: Consumo del cadáver, recuperación de equipo y mochila y segunda muerte.
task: TASK-0148
attempt: 2
status: stable
verified_by: task-lead
generated: { by: task-lead, at: 2026-11-16T00:26:00Z }
---

# Diff revisado

- `src/game/death.ts`: `reclaimPlayerCorpse` retira los contenedores con
  `corpseOf` de la unidad y reparte cada instancia por `ITEMS[].slot` si el
  hueco está libre; el resto va a la mochila. Conserva equipo y mochila que el
  fantasma ya llevaba. Sin hueco devuelve `null` sin mutar el estado.
- `src/game/magic.ts`: la resurrección llama a `reclaimPlayerCorpse` antes de
  consumir maná/acción y de retirar el contenedor; con `null` rechaza
  `inventory-full`. `revivePlayer` sigue quitando `ghost`.
- `death.ts` ya no encuentra cadáver al morir por segunda vez y crea uno nuevo
  con el equipo y la mochila restaurados.
- Tests nuevos: 4 en `magic.test.ts` (contenedor retirado y huecos, saqueado no
  duplicado, huecos vacíos no borran equipo, intento inválido) y 1 en
  `engine.test.ts` (muerte → resurrección → segunda muerte). No se ha borrado
  ni debilitado ninguna línea de test.
- Sin cambios en `docs/requirements/**`, `docs/harness/**`, `AGENTS.md`,
  `.opencode/**`, `src/host/**`, dependencias, IA, combate, botín ni RNG.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/{magic,engine,turn}.test.ts` | 3 archivos, 135 tests OK | `test-output.txt` |
| `pnpm run verify` | 109 archivos, 1751 tests; docs 738, config, tsc, build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e --workers=1` | 273 tests OK, 4,3 min, un worker | `e2e-output.txt` |

# Criterios

1-8 ya verificados en el intento 1 y sin cambios de comportamiento.
9. Cadáver consumido, equipo y mochila recuperados, saqueado no duplicado y
   segunda muerte con cadáver nuevo. OK: tests de `reclaimPlayerCorpse`, ciclo
   muerte → resurrección → muerte y `allInstances`/`locateInstance`; 135/135.

# Riesgos abiertos

- Capacidad: si la mochila del fantasma más lo que queda en el cadáver supera
  los huecos, la resurrección se rechaza con `inventory-full` sin consumir ni
  retirar el cadáver. REQ-021 no fija ese caso; es un guard técnico coherente
  con la atomicidad de REQ-018 T-005. Requiere aprobación del usuario si quiere
  otra salida (por ejemplo, soltar el exceso).
- El contenedor aplana el origen: un arma que estaba en la mochila del cadáver
  puede recuperarse equipada si su hueco está libre. El modelo de TASK-0131 no
  conserva la procedencia.
