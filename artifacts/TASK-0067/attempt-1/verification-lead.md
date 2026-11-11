---
type: Task Verification
title: "TASK-0067: verificación independiente del intento 1"
description: Re-ejecución de verify y E2E, revisión del diff y comprobación manual del banco de ajuste.
task: TASK-0067
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:00:00Z }
artifacts: artifacts/TASK-0067/attempt-1/
---

# Alcance revisado

Rama `task/TASK-0067`, commits `79610fe`, `85c8991` y `d9e023a` sobre
`3d5a4e8`. El diff toca solo
`experiments/EXP-003-mesa-combate/src/{main.ts,ui.ts,bench-ui.ts,bench-ui.test.ts,experiment.css}`
y `artifacts/TASK-0067/`; no hay cambios en `src/`, `tests/` de producción,
`index.html`, `public/`, `experiment.md` ni dependencias.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 71 archivos, 945 tests, `tsc`, build y bundle OK | `verify-rerun-lead-final.txt` |
| `pnpm exec playwright test tests/e2e/experiment-combat.spec.ts` | 4/4 OK | `e2e-rerun-lead-final.txt` |

`docs:check` pasa con avisos de tamaño de handoff (brief 3005 B, report 3732 B;
tope duro 4 KB) y avisos históricos ajenos.

# Comprobación manual en Chromium (`?test=1&seed=1017`)

- 12 filas sin editor; «Ajustar» abre el editor de Centinela con los nueve
  campos requeridos.
- Escribir PV 12 recalcula 4 filas (61 ms medidos en la máquina de referencia),
  deja el foco en el campo y anuncia «Recalculado: 4 filas afectadas.».
- Objetivo 60 actualiza objetivo, delta, estado y 4-de-4 sin reejecutar duelos.
- Acierto de espada 5 recalcula 6 filas; el reset por campo vuelve a 3 y no toca
  el daño.
- Reset global deja `overrides` vacíos y objetivos 75/85/30; la medición vuelve
  a la base.
- `getDecision()` inmediato tras escribir fuerza el flush y devuelve
  `matchups`, `catalog` y `overrides` coherentes; el nombre ajustado lleva
  `bench-overrides-<id>`.
- Sin errores de consola ni de página.

# Criterios

| Criterio | Resultado | Evidencia |
|---|---|---|
| Editor expandible con PV, stats, acciones, armadura, escudo y arma | Pasa | Campos `bench-field-*`; captura `banco-ajuste-editor-campos.png` |
| Aviso de enemigo compartido y cuatro filas | Pasa | `bench-editor-shared-*`; nombres desde el catálogo |
| Tabla global de armas con acierto, daño y usuarios | Pasa | `bench-weapon-table`; captura `banco-ajuste-armas.png` |
| Objetivo editable por enemigo, guía y validación 0–100 | Pasa | `bench-target-*`; tests de validación |
| Objetivo, real, delta y dentro/fuera; 4-de-4 y filas fuera | Pasa | `bench-row-*`, `bench-four-of-four-*` |
| Avisos de dispersión, bloque y arma global no bloqueantes | Pasa | `bench-problems-*`; captura de diagnóstico |
| Recálculo diferido solo de filas afectadas, `aria-live` y foco | Pasa | 4 filas por enemigo, 6 por espada; 61 ms; foco verificado |
| Reset por campo, enemigo, arma y global | Pasa | Botones y API; tests de resets |
| Export con catálogo, objetivos, diagnóstico y overridesId | Pasa | `getDecision()` y resumen; nombre base/ajustado |
| API ampliada y `?test=1&seed=1017` determinista | Pasa | E2E 4/4; snapshot/export idénticos |
| Tests y `verify`; sin cambios fuera de alcance | Pasa | 945 tests; diff limitado a EXP-003 |

# Observaciones

- La tabla de 18 columnas exige scroll horizontal en viewports estrechos; en
  1600 px se ve completa. La QA visual final corresponde a
  [TASK-0068](../../../docs/tasks/TASK-0068-exp-003-banco-ajuste-e2e.md).
- La compatibilidad del nombre base se resolvió con `benchFileName`; queda
  documentada en el informe y en el código.
- Los 12 emparejamientos siguen fuera de la banda 40–60 %: el banco diagnostica,
  no aprueba balance.
