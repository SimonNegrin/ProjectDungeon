---
type: Task Brief
title: "TASK-0103: brief del intento 1"
description: QA visual y suites del cierre del hito UI; la documentación ya la cerró el lead.
task: TASK-0103
attempt: 1
status: stable
brief_bytes: 2588
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T03:00:00Z }
---

# Objetivo

Verificar y evidenciar el cierre del hito UI: ejecutar `docs:check`, `verify` y
`test:e2e`, generar las capturas finales a 1280×720 y 900×700 y dejar un informe
honesto en `artifacts/TASK-0103/attempt-1/report.md`. La edición de
`docs/design/**`, `docs/glossary.md`, ADRs, tarea y log ya está hecha por el lead
en `94c9988`; no la repitas ni la modifiques.

# No objetivos

- No edites `docs/**` ni `index.html`, `src/**`, `tests/**` ni configuración.
- No cambies requisitos, criterios, costes, reglas ni catálogo.
- No añadas tests si los specs existentes cubren los criterios; no debilites ni
  saltes tests.
- No reescribas artefactos de tareas anteriores.

# Invariantes

- Solo QA, capturas y suites. Cualquier fallo se reporta con evidencia; no se
  parchea código de producción.
- Comandos con timeout explícito; sin procesos huérfanos. Playwright gestiona
  Vite con su `webServer`.
- Copia las capturas clave a la raíz `screenshots/` del intento; los specs las
  dejan bajo `<spec>/screenshots/`.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0103-cierre-hito-ui-docs-qa.md#criterios-de-aceptación`.
Céntrate en el criterio de QA visual y en las suites; la documentación ya está
revisada por el lead.

# Contexto mínimo

- `tests/e2e/hud-three-zones-qa.spec.ts`: tres zonas y panel sobre el mapa.
- `tests/e2e/panel-three-columns-qa.spec.ts`: tres columnas, mochila llena,
  scroll y métricas.
- `tests/e2e/panel-submenu-hud-qa.spec.ts`: ficha de dos bloques y submenú.
- `tests/e2e/artifacts.ts`: `E2E_ARTIFACTS_DIR` escribe bajo `<spec>/`.

# Artefactos

En `artifacts/TASK-0103/attempt-1/`: `report.md`, `docs-check-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `e2e-focused-output.txt`, `screenshots/`
(1280×720 y 900×700 de tres zonas, panel con mochila llena, ficha de dos bloques
y submenú) y commit en `task/TASK-0103`.

# Riesgos y decisiones del lead

- Usa `E2E_ARTIFACTS_DIR=artifacts/TASK-0103/attempt-1` solo para los tres specs
  de QA; la suite E2E completa va sin esa variable.
- Revisa que a 1280×720 el panel no haga scroll global y que a 900×700 solo se
  desplace la columna derecha; los logs de los specs ya lo comprueban.
- Si un comando agota el timeout, para, guarda evidencia y devuelve `blocked`.
