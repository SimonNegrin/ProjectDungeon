---
type: Task
id: TASK-0137
title: "Host: contenedor .zip"
description: "Implementar lectura y escritura de un `.zip` propio con `deflate`/`store`, sin dependencias ni red, con límites de entradas y tamaño."
status: stable
task_status: done
task_type: feature
requirement: REQ-024
requirement_ids: [R-004, T-003, T-006]
depends_on: []
unlocks: [TASK-0140, TASK-0141]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T00:12:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0137/
priority: P2
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T00:12:00Z
    note: >-
      Intento 1 verificado (código `501e623`, tests `5ceeddd`, artefactos
      `e674b8e`). Diff revisado: solo `src/host/save-zip.ts`, el test nuevo y
      artefactos; sin tests debilitados ni cambios de dependencias. `pnpm run
      verify` reejecutado: 95 archivos/1377 tests, tsc, build y bundle OK; la
      pasada del runner falló solo por el flake de EXP-004, aislado 20/20.
      33/33 tests del zip, `unzip -t`/`-p` y límites antes de descomprimir.
      Evidencia en `attempt-1/lead-verify/`. TASK-0145 cubre la documentación.
---

# Objetivo

Que el host pueda escribir y leer un `.zip` con `manifiesto.json` y
`partida.json` usando solo APIs del navegador, con validación de límites y sin
dependencias nuevas.

# Contexto

REQ-024
[T-003](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos)
exige un contenedor propio con `CompressionStream`/`DecompressionStream`; los
límites están en
[T-006](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos).
Esta tarea es infraestructura de archivo: no define el esquema de la partida
(TASK-0138) ni la UI de guardar/cargar (TASK-0140 y TASK-0141).

# Criterios de aceptación

- [x] El escritor produce un `.zip` válido, legible por un lector estándar, con
      `manifiesto.json` y `partida.json` en la raíz.
- [x] El lector acepta entradas `store` y `deflate`; rechaza carpetas, rutas,
      entradas extra y nombres fuera de los dos permitidos.
- [x] Se aplican los límites: 5 MB comprimido, 20 MB descomprimido, 4 entradas y
      5 MB por archivo; el rechazo ocurre antes de descomprimir cuando aplica.
- [x] Los errores son tipados y no dejan estado parcial ni consumen memoria
      desmedida.
- [x] No se usan dependencias nuevas, red ni `eval`; `package.json` y
      `pnpm-lock.yaml` no cambian.
- [x] Tests con zip válido, corrupto, entradas extra, rutas, exceso de tamaño y
      round-trip; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/save-zip.test.ts` nuevo con fixtures binarios.
- Integración: escribir un zip y leerlo con el mismo módulo; abrir una copia con
  una herramienta estándar.
- E2E / visual: no aplica.
- Manual: inspeccionar el contenido del zip descargado.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0137/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/save-zip.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No definir el manifiesto ni el esquema de partida.
- No implementar descarga, selector de archivo ni menús.
- No añadir dependencias, red, cifrado ni firmas.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Guardar o cargar desde la UI.
- Migraciones de formato.
- Comprimir presentación, cámara o cursor.
- Sincronización entre dispositivos.
