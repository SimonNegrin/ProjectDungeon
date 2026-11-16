---
type: Task Verification
title: "TASK-0173: verificación del lead"
description: "Firma de los cuatro criterios del test del gate del brief."
task: TASK-0173
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:35:08Z }
---

# Resultado

`ok`. Intento 1 aceptado: `verify:task TASK-0173` en verde con los cuatro
criterios firmados. La salida completa está en `verify-task.txt`.

# Diff revisado

`main...task/TASK-0173`: dos archivos, ambos dentro de `scope: [tests/]`.

- `tests/unit/verify-task-brief.test.ts` (nuevo, 48 líneas): importa `briefCheck`
  de `scripts/lib/attempt.mjs` y cubre las dos rutas del gate —intento 2 sin
  `brief.md` y con `brief.md`— más el intento 1 y la ausencia de carpeta o
  intento. Los fixtures viven en `mkdtempSync` y se borran en `afterAll`.
- `docs/tasks/TASK-0173-arnes-test-gate-brief.md`: la ficha, con los criterios
  firmados.

Sin cambios en `src/`, `scripts/` ni `docs/` fuera de la ficha. El ejecutable
`verify-task.mjs` no se toca: el test ataca la función pura extraída antes.

# Comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/verify-task-brief.test.ts` | 4/4 |
| `pnpm run verify:task TASK-0173` | ok (incluye `pnpm run verify`) |
| Alcance del diff | 2 archivos, dentro de `tests/` y la ficha |

# Qué debe probar el usuario

Nada visual: la tarea no tiene UI. Para comprobar el efecto, basta con un
relanzamiento real de cualquier tarea: `verify:task` debe mostrar la fila `Brief`
con el tamaño del fichero y fallar cuando falte desde el intento 2.

# Fricción

Ninguna del runner. Del lead: `verify:task` escribe `attempt-N/lead-verify/`
también en tareas `blocked` o sin intento, y el directorio creado cambia las
comprobaciones de la siguiente ejecución (detectado con TASK-0052). Queda
registrado para una tarea de arnés si molesta.
