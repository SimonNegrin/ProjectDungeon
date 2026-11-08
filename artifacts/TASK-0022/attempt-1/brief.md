---
type: Task Brief
title: "TASK-0022: brief del intento 1"
description: Verificación E2E y QA visual del damero y la decoración de REQ-007.
task: TASK-0022
attempt: 1
status: stable
brief_bytes: 2555
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:00:00Z }
---

# Objetivo

Añadir la verificación E2E y la QA visual de TASK-0022: un spec nuevo que
compruebe en navegador damero, decoración, exclusiones, densidades, apilado,
`MoveTo` y determinismo, con capturas en `artifacts/TASK-0022/attempt-1/`.
Sin cambios de producción.

# No objetivos

Implementar damero/decals (TASK-0021), cambiar reglas, arte o assets, añadir
dependencias o tocar specs existentes.

# Invariantes

- Solo `tests/e2e/**` y `artifacts/**`; `src/`, `index.html` y `public/` intactos.
- No borrar, saltar, renombrar ni debilitar aserciones, capturas o esperas
  existentes. Spec nuevo y aislado.
- Semilla `279837264`; 1280×720; `E2E_ARTIFACTS_DIR` para capturas. Sin
  `waitForTimeout`; usa `settle` y esperas de estado.
- Misma semilla ⇒ buffers idénticos; otra semilla ⇒ algún decal distinto y mismo
  damero. Sin red ni relojes reales.
- `pnpm` y timeouts explícitos de la herramienta; macOS no tiene `timeout`.
- Detalle operativo y rutas: [`brief-detalle.md`](brief-detalle.md).

# Criterios de aceptación

En [TASK-0022 § Criterios](../../../docs/tasks/TASK-0022-e2e-qa-damero-decoracion.md#criterios-de-aceptación);
no copiar.

# Contexto mínimo

- [REQ-007](../../../docs/requirements/REQ-007-damero-decoracion-suelo.md),
  [ADR-010](../../../docs/decisions/ADR-010-damero-decoracion-presentacion.md),
  [QA visual](../../../docs/harness/visual-qa.md).
- Implementación: `src/host/floor.ts`, `renderer.ts`, `debug.ts`, `assets.ts`.
- Patrones: `tests/e2e/generated-map-qa.spec.ts`, `frame-qa.spec.ts`,
  `support.ts`, `artifacts.ts`.

# Artefactos

`artifacts/TASK-0022/attempt-1/`: `report.md`, `test-e2e-output.txt`,
`verify-output.txt`, capturas (`damero-sala.png`, `damero-pasillo.png`,
`camino-sobre-decal.png`, `gris.png`, `semilla-distinta.png`), `snapshot.json`,
logs y commit SHA.

# Riesgos y decisiones abiertas

- El apilado camino/cursor sobre decals se mide por capas y píxeles/estado, no
  por juicio estético; elige un encuadre con camino visible sobre un decal.
- La escala de grises se deriva de la captura por luminancia y debe conservar el
  contraste; guarda el cálculo.
- Si un criterio no se puede medir sin cambiar producción, devuelve `blocked`
  con evidencia; no lo sustituyas por un unitario.