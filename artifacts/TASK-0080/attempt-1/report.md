---
type: Task Report
title: "TASK-0080: informe de ejecución"
description: Réplica visible con cue propio, giro y sin texto; E2E actualizado y QA visual. Docs bloqueados por permisos.
task: TASK-0080
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T21:52:00Z }
artifacts: artifacts/TASK-0080/attempt-1/
verified:
---

# Estado

`blocked` por docs: el runner no puede editar `docs/`. Código, tests y QA visual
están verdes. Propuesta en `docs-proposal.txt`; detalle en `report-detalle`.

# Cambios

- Host: beat `replica` de 300 ms, cue propio con atacante/objetivo, PV retrasados
  a su cue, animación de ataque reutilizada y sin texto. Los PV previos de un
  golpe letal ya no se inflan con el daño sobrante.
- Tests: 11 unitarios nuevos, cinco expectativas E2E actualizadas y QA visual.
- Commits: `b98f0ff` (host + unitarios), `d493251` (E2E + capturas).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | verde: 1044/1044, build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 112/112 | `test-output.txt` |
| `E2E_ARTIFACTS_DIR=tests/e2e pnpm run test:e2e tests/e2e/replica-qa.spec.ts` | 2/2 | `logs/replica-qa-output.txt` |
| `pnpm run docs:check` | verde | `verify-output.txt` |

# Evidencia visual

- `tests/e2e/replica-qa/screenshots/replica-{fallo,giro}-{1280x720,900x700}.png`.
- Mirar: `Fallo` conservado; el defensor embiste sin texto ni banner nuevos; el
  HUD no muestra aviso ni probabilidad.

# Desviaciones

- Docs bloqueados; no se edita `docs/**` ni `docs/requirements/**`.
- Derrotas a 80 turnos: setup con jugador desarmado y centinela alerta.
- `motion-qa`: bruto con vida ampliada en el setup para que el tercer golpe no
  sea letal; se conserva la intención.
- `combat-equipment`: la réplica del jugador ocurre en la fase enemiga, no en el
  fallo inicial (enemigo dormido); el último ataque se muestrea en su cue.

# Problemas conocidos y preguntas abiertas

- Criterios documentales sin aplicar; ver fricción.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| La ficha pide editar docs; el runner no puede. | `Permission denied` en `docs/`. | `docs-proposal.txt`. | Toda tarea mixta host+docs. | Permitirlo o asignarlo al lead. | Bajo. | `pending` |
| `REQ-027` enmienda `REQ-017` sin nota; REQ-009/010 sí. | `grep` sin REQ-027. | Propuesta. | Trazabilidad de la matriz. | Nota y fila aprobadas. | Bajo. | `pending` |
