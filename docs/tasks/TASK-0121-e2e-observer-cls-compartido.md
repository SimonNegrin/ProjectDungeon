---
type: Task
id: TASK-0121
title: "E2E: observer de CLS compartido y alineado con P-006"
description: "Extraer a un único helper Node-side el observer de layout-shift que hoy copian cuatro specs de QA visual, con un esquema común y un filtro que solo prohíbe el armazón, el panel, las columnas, los títulos y los slots de Equipo/Bolsa."
status: stable
task_status: done
task_type: test
requirement: REQ-033
requirement_ids: [P-006]
depends_on: []
unlocks: []
created_at: 2026-11-14T20:37:07Z
completed_at: 2026-11-14T20:52:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0121/
priority: P2
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T20:37:07Z }
verified:
  - by: task-lead
    at: 2026-11-14T20:52:00Z
    note: >-
      Intento 1 verificado (test `8ab2b98`; informe `e960e6a`). Diff revisado:
      helper único en `support.ts`, cuatro specs sin copias inline ni aserciones
      debilitadas. Reejecutados los cuatro specs (32/32), `pnpm run test:e2e`
      (215/215) y `pnpm run verify` (94 archivos, 1332/1332, build y bundle);
      salidas en `lead-verify/`. Log de recogida de 4 objetos sin ningún
      `forbidden: true`.
---

# Objetivo

Una sola implementación del observer de CLS en `tests/e2e`, con un esquema de
registro común para los cuatro specs de QA visual. El filtro de prohibición debe
reflejar [P-006](../requirements/REQ-033-revision-visual-hud-panel.md#requisitos-creativos-decididos)
y [T-013](../requirements/REQ-033-revision-visual-hud-panel.md#requisitos-técnicos):
solo el armazón, el panel, su body, el contenedor de columnas, los títulos y los
slots de Equipo/Bolsa ya colocados tienen presupuesto 0; el contenido del Suelo
pertenece a su zona. No cambia la regla P-006 ni la UI.

# Contexto

Las cuatro copias inline y su esquema divergente:

- `tests/e2e/panel-cursor-cls-qa.spec.ts:495`
- `tests/e2e/qa-visual-revision-ui.spec.ts:890`
- `tests/e2e/qa-visual-correccion-ui-v7.spec.ts:1081`
- `tests/e2e/panel-top-alignment-qa.spec.ts:344`

Las dos primeras deciden la prohibición con `closest()` sobre
`.inventory-column`, de modo que marcan como prohibido cualquier movimiento
dentro de la columna Suelo, incluidos objetos y cadáveres, que P-006 permite. Las
otras dos ya usan `matches` para las cajas estables y `closest` solo para títulos
y slots. Además, `sources` es un objeto en dos specs y un string en las otras dos,
y `hadRecentInput` falta en el spec v7.

Evidencia: `artifacts/TASK-0114/attempt-1/report.md:58` (fricción `deferred`).

# Criterios de aceptación

- [x] Existe un único helper Node-side (`startLayoutShiftAudit`,
      `readLayoutShifts`, `resetLayoutShifts`, `expectNoForbiddenShifts`) en
      `tests/e2e/support.ts` o en un módulo propio; no queda ninguna copia
      inline del observer.
- [x] El callback inyectado con `page.evaluate` es autocontenido: no captura
      imports ni closures del módulo; usa un único nombre de global para los
      shifts.
- [x] Se considera prohibido solo un shift cuyo nodo sea el armazón, el panel, su
      body, el contenedor de columnas, un título o un slot de Equipo/Bolsa ya
      colocado. El contenido del Suelo (objetos y cadáveres) no es prohibido por
      sí mismo.
- [x] El registro conserva `value`, `hadRecentInput` y `sources`, con el mismo
      esquema en los cuatro specs.
- [x] Los cuatro specs importan el helper y siguen pasando; no se borran,
      saltan ni debilitan aserciones.
- [x] Hay cobertura E2E de recoger con 4 objetos en el Suelo sin shifts
      prohibidos.
- [x] Si al corregir el filtro aparece un shift real prohibido, no se silencia:
      se registra y se escala como otra tarea.
- [x] `pnpm exec playwright test` sobre los cuatro specs y `pnpm run verify`
      pasan; `task-lead` reejecuta ambos.

# Plan de test

- Unitario: `pnpm run verify`.
- Integración: comprobar que el callback inyectado no referencia ningún símbolo
  del módulo y que los cuatro specs consumen el mismo tipo de registro.
- E2E: los cuatro specs migrados y la suite completa con `pnpm run test:e2e`;
  incluir una recogida con 4 objetos en el Suelo y comprobar que no hay shifts
  prohibidos.
- Manual: no aplica; no hay cambio visual.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0121/attempt-1/report.md`
- [x] Salida del E2E de los cuatro specs y de `pnpm run test:e2e`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec playwright test tests/e2e/panel-cursor-cls-qa.spec.ts tests/e2e/qa-visual-revision-ui.spec.ts tests/e2e/qa-visual-correccion-ui-v7.spec.ts tests/e2e/panel-top-alignment-qa.spec.ts` | 240 s |
| `pnpm run test:e2e` | 240 s |
| `pnpm run verify` | 240 s |
| `git diff --stat` | 15 s |

# Restricciones

- No tocar `src/`, `index.html`, `public/` ni `docs/` de producto. No cambiar
  P-006 ni REQ-033.
- No reescribir artefactos existentes; el intento nuevo va en
  `artifacts/TASK-0121/`.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- Timeout como parámetro de la herramienta de shell; pnpm, nunca npm ni npx.

# No objetivos

- Refactorizar otros helpers de `tests/e2e/support.ts`.
- Corregir la UI si aparece un CLS real.
- Añadir reglas o documentación de arnés; `visual-qa.md` y `workflow.md` ya están
  corregidos.
