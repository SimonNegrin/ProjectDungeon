---
type: Verification
title: "TASK-0163: verificación del intento 1"
description: Resultado de verify:task y alcance del filtro de artefactos E2E por spec.
task: TASK-0163
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T13:08:00Z }
---

# Resultado

`ok`. `verify:task TASK-0163 --base harness/2agentes` en verde: estado, 6
criterios firmados, informe `success`, 16 archivos dentro de `test` y `pnpm run
verify` completo. Salida en `verify-task.txt`.

# Criterios

Los seis firmados:

- `E2E_ARTIFACTS_SPECS` limita capturas, JSON y logs; vacía o ausente mantiene el
  comportamiento anterior. La comparación es por nombre normalizado del spec.
- La suite completa con `E2E_ARTIFACTS_SPECS=inventory` dejó bajo
  `attempt-1/e2e` solo `inventory/` (3 directorios, 9 archivos); los specs
  excluidos escribieron en `test-results/` (245 carpetas, efímeras).
- Prueba del helper con sin variable, lista vacía, uno, varios, guiones, acentos,
  nombre desconocido, repetición y lectura por llamada.
- `docs/harness/visual-qa.md` documenta la variable y su uso por tarea.
- `pnpm run test:e2e` (282/282) y `pnpm run verify` (1803 tests) pasan; `src/`,
  `index.html` y `experiments/` intactos.

# Diff revisado

`tests/e2e/artifacts.ts` (+32/−4) y `tests/unit/artifacts-helper.test.ts`
(+101/−4), más la documentación y la evidencia. El fallback no borra ni mueve
artefactos históricos: solo evita que se escriban.

# Notas de verificación

- La ficha declaraba `task_type: harness`, pero el cambio son el helper y sus
  pruebas; con `harness` el alcance del script no admite `tests/`. Se corrige a
  `test` (mismo trabajo, tipo coherente con el diff). La documentación se landó
  primero en `harness/2agentes` (`ca7fcc9`) y se fusionó en la rama, así que el
  diff de la tarea queda en código y pruebas.
- Fricción nueva para revisión: un solo task_type no puede cubrir a la vez
  `tests/` y `docs/`; se ha resuelto con el landado en la rama del arnés.

# Qué debe probar el usuario

- Nada visual: el cambio no toca el juego. En la próxima tarea con capturas,
  comprobar que `E2E_ARTIFACTS_SPECS` deja solo la carpeta del spec.
