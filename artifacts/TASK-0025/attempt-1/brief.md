---
type: Task Brief
title: "TASK-0025: brief del intento 1"
description: Mesa de combate configurable de EXP-003.
task: TASK-0025
attempt: 1
status: stable
brief_bytes: 3071
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:48:54Z }
---

# Objetivo

Construir `experiments/EXP-003-mesa-combate/` con roster editable, presets
A/B/C/D, cálculo de ataque, duelo por semilla, métricas y export JSON, registrada
en el manifiesto y el índice, con tests unitarios y E2E. Sin tocar `src/`.

# No objetivos

- Implementar combate/equipo en `src/`; cambiar REQ-009/010, ADR, alcance,
  dependencias o `package.json`; decidir valores o marcar EXP-003 `decided`.
- Crear tareas, usar `Math.random` o importar entre producción y experimentos.

# Invariantes

- Fórmulas exactas de [REQ-010](../../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos):
  impacto `modAcc + armaAcc + 1d6 > modDef + escudo + 1d6` (empate falla); daño
  `max(1, (modDmg + armaDmg + 1d6) − (armadura + 1d6))`.
- Reutiliza `_shell/` (`styles.css`, `rng.ts`, `export.ts`); no dupliques RNG ni
  exportación. Misma semilla + roster + N ⇒ mismo resultado.
- A = tabla de REQ-010. B = mods +0, mismo equipo/PV. C = tanque (+PV/+armadura,
  −daño). D = letal (−PV/+daño). Documenta C/D sin presentarlos como aprobados.
- Roster: añadir, duplicar, editar y eliminar; nombre, bando, PV, mods, arma,
  escudo y armadura, con IDs estables.
- UI en español, `data-testid` estables. La página mide; no decide.

# Criterios de aceptación

Viven en [la tarea](../../../docs/tasks/TASK-0025-mesa-combate-exp-003.md#criterios-de-aceptación);
enlázalos, no los copies.

# Contexto mínimo

- [EXP-003](../../../experiments/EXP-003-mesa-combate/experiment.md) y REQ-010.
  Shell en `experiments/_shell/`; patrones en
  `EXP-002-ritmo-movimiento/src/main.ts` y `tests/e2e/experiment-motion.spec.ts`.
- `?test=1&seed=1017` fija la semilla. `window.__experiment` debe leer/fijar
  roster y preset, calcular ataque, simular duelo, leer métricas y exportar.
- Duelo: atacante primero, alternancia hasta que uno cae, N duelos con semilla
  derivada por duelo; define y testea orden y redondeo.

# Artefactos

En `artifacts/TASK-0025/attempt-1/`: `report.md`, salidas de tests y E2E,
`screenshots/`, `logs/` y SHA. Export de prueba en
`experiments/EXP-003-mesa-combate/results/export-<ISO>.json` con `decision`
vacío y notas «pendiente de playtest»; no es una decisión.

# Riesgos y decisiones abiertas

- `experiment.md` describe parámetros de una unidad; el roster los sustituye.
- C y D no tienen números en REQ: elige valores plausibles; quedan al playtest.
- Marca `experiment_status: ready` y el índice como listo para playtest; nunca
  `decided`. No actualices `task_status` ni REQ-010.
- Timeouts del [workflow](../../../docs/harness/workflow.md#timeouts-y-procesos);
  sin procesos en background. No debilites specs; el E2E nuevo debe entrar en
  `pnpm run test:e2e`.
- Si no cabe, recorta métricas decorativas antes que criterios.
