---
type: Task Report
title: "TASK-0049: informe del intento 2"
description: Captura determinista estabilizada, salida del playtest reforzada y bestiario intacto.
task: TASK-0049
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:40:00Z }
artifacts: artifacts/TASK-0049/attempt-2/
verified:
---

# Estado

`success`. Suite repetida 228/228 y determinismo 100/100 sin relajar comparaciones.

# Cambios

- `support.ts`: espera canvas/fuentes, capa del HUD y captura consecutiva idéntica; `Buffer.compare` exacto.
- `floor-qa.spec.ts`: aplica las esperas antes de cada captura.
- `host-growth-render-qa.spec.ts`: `MoveTo` real al tile de salida `door`; rechazo, sin `UnitMoved`, overlay, semilla, estado y posición intactos.
- `motion-qa.spec.ts`: objetivo = bruto del bestiario (12 PV), sin sobrescribir `hp/maxHp`.
- Commit SHA: `5fa4fcfc6323be2ecc5027f5047c470641d7ac43`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 732 unitarias, build y guarda | `verify-output.txt` |
| `pnpm run test:e2e` | 76/76 | `e2e-output.txt` |
| `pnpm run test:e2e --repeat-each=3` | 228/228 | `e2e-repeat-output.txt` |
| determinismo, `--repeat-each=20` | 20/20 | `floor-repeat-output.txt` |
| `check:bundle` | OK | `bundle-output.txt` |

Extra: 100/100. Canvas/fuentes solos dejaban 1/80; el delta eran 4 píxeles en
la esquina del HUD (rects y canvas idénticos). La capa dio 0/150.

# Evidencia visual

- `host-growth-render-qa/screenshots/growth-playtest-{normal,debug,exit}.png`.
- `motion-qa/screenshots/attack-{approach,after-walk,damage-detail}.png`.
- `floor-qa/screenshots/`.

# Desviaciones

- `EXP-004/experiment.md` sin actualizar: el arnés deniega
  `experiments/**/experiment.md` a `task-runner`. Texto exacto en
  `report-detalle.md`.
- La capa del HUD solo actúa en la captura; no cambia contenido, estado ni el
  criterio byte a byte.

# Problemas conocidos y preguntas abiertas

- Playtest de producto pendiente de revisión del usuario.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El brief ordena editar `experiment.md` y el permiso lo deniega | `task-runner.md:21-23` | Texto al lead | Cualquier QA que toque un experimento choca igual | Alinear brief/permisos | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3173 |
| `report_bytes` | 2552 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
