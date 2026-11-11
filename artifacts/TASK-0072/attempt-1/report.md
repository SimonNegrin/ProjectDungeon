---
type: Task Report
title: "TASK-0072: informe del intento 1"
description: Objetivos por par héroe–enemigo en motor, UI, API y export.
task: TASK-0072
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:15:00Z }
artifacts: artifacts/TASK-0072/attempt-1/
verified:
---

# Estado

`success`. Objetivo por par propagado a diagnóstico, tabla, API y export;
`verify` verde.

# Cambios

- **Archivos:** `src/v2/bench.ts`, `bench-ui.ts`, `main.ts`, `ui.ts` y tests;
  E2E: dos aserciones adaptadas.
- **Modelo:** claves `heroId:enemyId`, guía heredada, fallback 50, orden fijo,
  funciones puras y guía inmutable.
- **Diagnóstico:** objetivo por fila, `outside` con héroe y delta; sin
  `dispersion` ni su problem.
- **UI/API:** input por fila sin `rowspan`, refresco solo del diagnóstico y API
  por par (`getTargets`, `setTarget`, `resetTarget`).
- **Export:** `targetsVersion: 2`, `targetsId` determinista y sufijo
  `-targets-<id>` si no es guía; `overridesId` no cambia.
- **Commit SHA de código:** `63b1665`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run experiments/EXP-003-mesa-combate/src` | 11 archivos, 183 tests OK | `test-output.txt` |
| `pnpm run verify` | 72 archivos, 979 tests, tsc, vite y bundle OK | `verify-output.txt` |

# Evidencia visual

- Sin capturas: TASK-0074 cubre E2E y QA visual.

# Desviaciones

- El primer `verify` falló en `docs:check` porque el `brief-detalle.md` del lead
  no tenía frontmatter OKF. Se añadió solo la cabecera
  (`logs/brief-detalle-original-head.txt`); el segundo `verify` pasó.
- No se ejecutó `test:e2e`; solo se adaptaron dos tipos, como pedía el brief.
- Sin cambios en `docs/`, `experiment.md`, `src/`, `tests/`, `index.html`,
  `public/`, fórmulas, motor, valores base ni dependencias.

# Problemas conocidos y preguntas abiertas

- El E2E actual asume el modelo viejo; TASK-0074 debe reescribirlo.
- Los 77 avisos de longitud de `docs:check` son previos y ajenos.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `brief-detalle.md` sin frontmatter OKF bloquea `docs:check` | `logs/brief-detalle-original-head.txt` | Añadir cabecera | Se repite con `read_detail` | Incluir frontmatter | Bajo | `deferred` |

Disposición del lead: `deferred`. Es una brecha documental/arnés: la plantilla no
exige frontmatter en `brief-detalle.md` y `docs:check` sí lo valida. El workaround
local ya está aplicado; se eleva a `requirements-writer` con evidencia para que
el usuario decida si `harness-keeper` actualiza la plantilla o el validador. No
bloquea ni desbloquea TASK-0072.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2356 |
| `report_bytes` | 2539 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
