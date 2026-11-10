---
type: Task Report Detail
title: "TASK-0061: detalle del informe"
description: Fricción del arnés al repetir E2E y detalle de la evidencia visual.
task: TASK-0061
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:20:00Z }
---

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `--repeat-each=3` sobrescribe las capturas de la corrida anterior en vez de crear `repeat-N` | `find artifacts/TASK-0061/attempt-1 -type d -name 'repeat-*'` vacío tras 33 tests con repetición; `e2e-repeat.txt` lo confirma | Correr por separado y copiar antes de repetir | Afecta a cualquier evidencia E2E repetida y contradice el comentario de `tests/e2e/artifacts.ts` | Derivar el sufijo de `testInfo.repeatEachIndex` o de una variable de entorno explícita | Bajo: solo rutas de artefactos | `pending` |

El detalle de capturas vive en `screenshots/`; los originales de las specs de
feedback se conservan en `<spec>/screenshots/`.
