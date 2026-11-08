---
type: Task
id: TASK-0020
title: "Arnés: artefactos E2E sin reescribir evidencia histórica"
description: Parametrizar la ruta base de capturas, JSON y logs de la suite E2E para que una corrida normal no modifique artifacts/ versionados y una captura explícita escriba solo en la carpeta indicada.
status: draft
task_status: in_progress
task_type: refactor
requirement: HARNESS
requirement_ids: []
depends_on: []
unlocks: []
created_at: 2026-11-08T12:10:00Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0020/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T12:10:00Z }
verified:
---

# Objetivo

Que `pnpm run test:e2e` deje de escribir en rutas versionadas fijas. Al
terminar:

- una corrida normal escribe en `test-results/` y no modifica `artifacts/`;
- una captura explícita escribe solo en `E2E_ARTIFACTS_DIR`;
- las repeticiones no compiten por el mismo PNG/JSON;
- no cambia ninguna aserción, nombre de captura, espera ni comportamiento de
  juego.

# Contexto

- Regla de inmutabilidad y convención: [QA visual](../harness/visual-qa.md),
  sección «Capturas y baselines».
- Fricción elevada desde `TASK-0018` y `TASK-0019` (`deferred`, dueño
  `requirements-writer`). No se crea una hoja de requisitos nueva:
  `requirement: HARNESS` identifica el origen. Si el validador o el tablero
  exigieran una hoja real, se usa `REQ-006` como requisito de origen.
- `docs/harness/visual-qa.md` y `docs/templates/task.md` ya recogen la
  convención nueva; los edita `requirements-writer`. El runner no toca `docs/`:
  solo comprueba que la implementación coincide con lo documentado.
- Specs afectados, todos con rutas literales:
  - `tests/e2e/experiment-shell.spec.ts` → `artifacts/EXP-000-shell-demo`.
  - `tests/e2e/game-render.spec.ts` → `artifacts/TASK-0016/.../frame.png`.
  - `tests/e2e/motion-qa.spec.ts` → `artifacts/TASK-0019/...` (capturas y
    `logs/motion-trace.log`); ya usa `testInfo.outputPath` solo para
    `repeatEachIndex > 0`.
  - `tests/e2e/frame-qa.spec.ts`, `generated-map-qa.spec.ts`,
    `cursor-qa.spec.ts`, `game-cursor.spec.ts` y `game-map.spec.ts` →
    `artifacts/TASK-0016/...` (capturas, `snapshot.json` y `performance.txt`).
  - `tests/e2e/experiment-motion.spec.ts` → `artifacts/TASK-0017/...`
    (capturas y `decision-example.json`).
  - `tests/e2e/experiment-generator.spec.ts` → `artifacts/TASK-0007/...`.
  - `tests/e2e/game-input-hud.spec.ts` → `artifacts/TASK-0010/...`.
- Helper actual: `tests/e2e/support.ts`.
- Playwright usa `fullyParallel: true`; cada test tiene su propio
  `testInfo.outputPath`.

# Diseño esperado

- Un helper único `artifactPath(testInfo, ...parts)` en
  `tests/e2e/artifacts.ts`.
- Sin `E2E_ARTIFACTS_DIR`: base `testInfo.outputPath(...)`, dentro de
  `test-results/`, que Playwright limpia por ejecución.
- Con `E2E_ARTIFACTS_DIR`: base esa carpeta, resuelta desde la raíz del repo.
- En repeticiones, añadir un subdirectorio por `repeatEachIndex` (o usar
  `testInfo.outputPath`) para que dos workers no escriban el mismo archivo. El
  primer repeat de `motion-qa` deja de escribir en `artifacts/TASK-0019`.
- Sustituir todas las rutas literales de los specs, incluidas las de JSON y
  logs, sin cambiar los nombres de archivo (`frame.png`, `snapshot.json`,
  `performance.txt`, `decision-example.json`, `motion-trace.log`, etc.).
- Si una corrida explícita de la suite completa pudiera repetir un nombre entre
  specs, añadir un subdirectorio por spec o por test dentro de la base, sin
  cambiar el nombre del archivo.
- Opcional y barato: una comprobación automática (test unitario o script) que
  falle si un spec vuelve a incluir `artifacts/TASK-` o `artifacts/EXP-`. Si
  complica la tarea, se anota como pendiente y se valida con `grep`.

# Criterios de aceptación

- [ ] `pnpm run test:e2e` pasa (baseline actual: 40/40). Al terminar, una
      corrida normal no deja cambios en artefactos históricos versionados; con
      la evidencia propia de `TASK-0020` ya commiteada,
      `git status --porcelain artifacts` está vacío.
- [ ] Ningún spec contiene rutas literales `artifacts/TASK-*` ni
      `artifacts/EXP-*`; todas pasan por `artifactPath`.
- [ ] Una captura explícita con
      `E2E_ARTIFACTS_DIR=artifacts/TASK-0020/attempt-1` escribe solo ahí y deja
      intactos los artefactos históricos (comprobado con `git status` y
      `git diff --stat artifacts` antes/después).
- [ ] `pnpm run test:e2e --repeat-each=3` no produce colisiones ni capturas
      mezcladas.
- [ ] `pnpm run verify` pasa (docs, config, tests y build).
- [ ] No se borran, saltan ni debilitan tests; no se modifica ningún artefacto
      histórico ni se toca `src/`, `index.html`, `public/`, `package.json` ni
      `pnpm-lock.yaml`.
- [ ] La tarea incluye informe, salidas de tests, `git status` antes/después y
      capturas de la corrida explícita en `artifacts/TASK-0020/attempt-1/`.
- [ ] La implementación coincide con la convención documentada en
      [QA visual](../harness/visual-qa.md); no se edita `docs/harness/**` ni
      plantillas desde el runner.

# Plan de test

- **Estático:** `grep -R -n "artifacts/\(TASK\|EXP\)-" tests/e2e` no devuelve
  coincidencias en specs. Si se añade el guard automático, ejecutarlo.
- **E2E normal:** `pnpm run test:e2e` (40/40) y comprobar
  `git status --porcelain artifacts` antes/después.
- **E2E explícito:** `E2E_ARTIFACTS_DIR=artifacts/TASK-0020/attempt-1
  pnpm run test:e2e motion-qa`; comprobar que las capturas y logs aparecen solo
  bajo esa carpeta y que `git diff --stat artifacts` no toca `TASK-0019` ni el
  resto del histórico.
- **E2E repetido:** `pnpm run test:e2e --repeat-each=3`; comprobar 120/120 y que
  no hay PNG/JSON mezclados ni archivos bloqueados.
- **Verificación completa:** `pnpm run verify`.
- **Manual:** revisar una captura explícita y confirmar que su nombre y contenido
  equivalen a los actuales.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test:e2e` | 240 s | Baseline 40/40 sin tocar artefactos |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0020/attempt-1 pnpm run test:e2e motion-qa` | 240 s | Captura explícita aislada |
| `pnpm run test:e2e --repeat-each=3` | 300 s | Sin colisiones entre repeticiones/workers |
| `pnpm run verify` | 180 s | Docs, config, unitarios y build |
| `git status --porcelain artifacts` | 30 s | Inmutabilidad del histórico |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0020/attempt-1/report.md`.
- [ ] Salidas de las corridas normal, explícita y repetida en
      `artifacts/TASK-0020/attempt-1/` o `logs/`.
- [ ] `git-status-before.txt` y `git-status-after.txt` de `artifacts/`.
- [ ] Capturas de la corrida explícita en
      `artifacts/TASK-0020/attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0020`.

# Restricciones

- No cambiar aserciones, nombres de capturas, tiempos de espera ni lógica de los
  tests; solo la ruta base donde se escriben los artefactos.
- No borrar, saltar ni debilitar tests.
- No modificar ni reorganizar artefactos históricos.
- No tocar `src/`, `index.html`, `public/`, `package.json` ni `pnpm-lock.yaml`.
- No añadir dependencias.
- No editar `docs/` desde el runner; la documentación de arnés la mantiene
  `requirements-writer`.

# No objetivos

- Cambiar la cobertura, el contenido o el nombre de las capturas.
- Cambiar el comportamiento del juego, el ritmo de la animación o la UI.
- Limpiar `test-results/` o `playwright-report/` a mano.
- Reorganizar o borrar el histórico de `artifacts/`.
- Añadir CI o publicación de artefactos.

# Notas

- `testInfo.outputPath` devuelve una ruta absoluta y segura dentro del directorio
  de salida del test; no admite segmentos que escapen de él.
- `E2E_ARTIFACTS_DIR` se interpreta relativo a la raíz del repo, que es el
  directorio de ejecución de Playwright.
- En modo explícito, conservar los nombres actuales facilita comparar con la
  evidencia histórica.
- Si el guard automático no entra en este intento, dejar anotado el `grep` como
  comprobación manual en el informe y en el log.
