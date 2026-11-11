---
type: Task Verification
title: "TASK-0073: verificación del lead"
description: Revisión independiente de los filtros de vista de EXP-003.
task: TASK-0073
attempt: 1
status: stable
generated: { by: task-lead, at: 2026-11-11T23:26:00Z }
---

# Resultado

`accepted`. La implementación cumple los diez criterios de aceptación. El
runner no autoevalúa: el lead revisó el diff completo, re-ejecutó la verificación
y comprobó la UI en Chromium real.

# Evidencia

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 73 archivos, 993 tests, tsc, vite y bundle OK | `verify-output-lead.txt` |
| Smoke DOM (12 filas, rowspan, filtros, foco, aviso, overflow) | 19/19 OK | `logs/dom-check.txt` |
| Smoke DOM (export, resultados, 4-de-4, resets) | 8/8 OK | `logs/dom-check-export-reset.txt` |

# Criterios

- Cabeceras con etiqueta visible, inputs y botones de limpiar en las tres tablas.
- Búsqueda por subcadena normalizada: tildes, mayúsculas, «ñ» y vacío.
- Combates: filtro de héroe deja 3 filas con `rowspan` 1; enemigo deja 4;
  intersección, orden y bloques vacíos correctos.
- Sin resultados: aviso `role="status"` visible y foco conservado; limpiar
  restaura las filas.
- Armas filtra por nombre y por unidades; Héroes por nombre.
- Filtrar no altera `% real`, 4-de-4, resultados ni export; editar un stat con
  filtro activo conserva filtro y filas; resets no limpian filtros.
- Sin overflow de documento a 1280×720. Sin cambios en motor, fórmulas, valores
  base, `src/`, `tests/`, `index.html` ni `public/`.

# Límites

- No se ejecutó `pnpm run test:e2e`: TASK-0074 reescribe los E2E del modelo
  anterior y formaliza foco, `rowspan` y capturas.
- No se editó `experiment.md`; queda para `requirements-writer`.
