---
type: Lead Verification
title: "TASK-0137: verificación independiente"
description: Revisión del diff, reejecución de tests y triaje de fricción.
task: TASK-0137
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:12:00Z }
---

# Diff

Revisado `git diff main...HEAD`: 10 archivos añadidos, ningún test existente
modificado ni borrado, `package.json` y `pnpm-lock.yaml` intactos.

- `src/host/save-zip.ts`: escritor determinista `deflate-raw` (método 8, CRC-32,
  fecha DOS fija) y lector de ZIP clásico con `store`/`deflate`, `bit 3` por
  directorio central y `SaveZipError` tipado.
- `tests/unit/host/save-zip.test.ts`: 33 tests con constructor binario propio,
  `store`/`deflate`, `unzip` del sistema, corrupción, estructura, límites y bomba
  deflate.
- Sin red, `eval`, dependencias nuevas ni cambios de motor. Los nombres y límites
  se comprueban antes de descomprimir; la descompresión se acota por chunks.

# Comandos

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/save-zip.test.ts` | 33/33 OK | `save-zip-test.txt` |
| `pnpm run verify` | 95 archivos / 1377 tests OK; tsc, build y bundle OK | `verify-lead-1.txt` |
| `unzip -t` / `unzip -p` | OK dentro del test; muestra 362 B, sha256 `9cb03d36…79e199e` | `test-output.txt` |

La primera pasada del runner falló solo por el flake conocido de EXP-004
(`verify-output.txt`); EXP-004 aislado 20/20 y `--maxWorkers=1` 1377/1377. La
reejecución del lead pasó limpia, así que el gate queda satisfecho sin tocar
EXP-004.

# Criterios

| Criterio | Evidencia |
|---|---|
| `.zip` válido con las dos entradas en la raíz | `unzip -t`/`-p` y round-trip |
| Acepta `store`/`deflate` y rechaza carpetas, rutas, extras y nombres ajenos | tests de estructura y `it.each` de rutas |
| Límites 5/20 MB, 4 entradas y 5 MB por archivo antes de descomprimir | tests de límites y bomba deflate |
| Errores tipados sin estado parcial | `SaveZipError` + `expectZipError` |
| Sin dependencias, red ni `eval`; manifiestos intactos | diff y `rg` sin `fetch`/`eval` |
| Tests y `pnpm run verify` | 33/33 y 95 archivos/1377 tests |

# Fricción

| Propuesta | Clase | Disposición | Motivo |
|---|---|---|---|
| Aclarar que el límite de 20 MB total es defensa en profundidad | local/documental | `rejected` | REQ-024 T-006 ya fija el total y el brief-detalle ya lo describe; el test comprueba el guard antes del límite por archivo. No requiere cambio. |

# Cierre

Verificado y apto para fusionar. La documentación de arquitectura, glosario,
visión y ADR-028 queda en TASK-0145; esta tarea no edita `docs/`.
