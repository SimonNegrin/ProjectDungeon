---
type: Task Brief
title: "TASK-0062: brief del intento 1"
description: "Sufijo estable por pasada real de --repeat-each en artifactPath, con pruebas y ruta documentada."
task: TASK-0062
attempt: 1
status: stable
brief_bytes: 2557
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T22:00:00Z }
---

# Objetivo

Corregir `tests/e2e/artifacts.ts` para que cada pasada de `--repeat-each=N` con
`E2E_ARTIFACTS_DIR` escriba en una carpeta distinta y estable, sin sobrescribir
capturas, JSON ni logs. Añadir la prueba del helper y documentar la ruta real.
Sin cambios de juego.

# No objetivos

- Rediseñar el contrato de TASK-0020 ni los nombres de archivo.
- Cambiar specs, aserciones ni cobertura.
- Tocar `src/`, `experiments/` ni dependencias.

# Invariantes

- Sin `E2E_ARTIFACTS_DIR`, la base sigue siendo `testInfo.outputPath(...)`.
- El nombre final del archivo no cambia.
- No se borran, saltan ni debilitan tests ni artefactos históricos.
- `tests/e2e/**` está excluido de Vitest: la prueba va en `tests/unit/`
  importando el helper, sin reloj real ni estado compartido.
- El runner no edita `docs/`; el lead actualiza `visual-qa.md`.

# Criterios de aceptación

`docs/tasks/TASK-0062-arnes-sufijo-repeticion-capturas.md#criterios-de-aceptación`.

# Contexto mínimo

- `tests/e2e/artifacts.ts:34-46` (`repeatEach` frente a `repeatEachIndex`).
- `tests/e2e/motion-qa.spec.ts:1102` ya usa `repeatEachIndex`: precedente.
- `playwright.config.ts` (`fullyParallel`, un proyecto).
- `docs/harness/visual-qa.md#capturas-y-baselines` (workaround a eliminar).
- Contrato: `docs/tasks/TASK-0020-artefactos-e2e.md#diseño-esperado`.

# Artefactos

`artifacts/TASK-0062/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `docs-check-output.txt`, `e2e-output.txt`,
`repeat-each-output.txt`, `find-repeat.txt`, diff y commit SHA.

# Riesgos y decisiones abiertas

- `repeatEachIndex` empieza en 0 y no hay total público: la pasada 0 de una
  repetición no se distingue de una corrida única sin otra señal. Es válido
  incluir `repeat-<índice>` siempre (incluida `repeat-0`) si se documenta el
  cambio de esquema; elige un esquema determinista y pruébalo.
- El helper lee `E2E_ARTIFACTS_DIR` al importar: para probar con y sin variable,
  léela por llamada o aísla módulos; no uses estado compartido.
- Usa una spec pequeña y determinista para las tres salidas; el E2E completo va
  aparte.
- Si `project.repeatEach` sí reflejara el flag en Playwright 1.65, demuéstralo
  con la integración; no lo asumas.
