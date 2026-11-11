---
type: Task Brief
title: "TASK-0073: brief del intento 1"
description: Filtros de vista en las tres tablas de EXP-003, sin tocar medición ni export.
task: TASK-0073
attempt: 1
status: stable
brief_bytes: 2495
read_detail: true
generated: { by: task-lead, at: 2026-11-12T09:10:00Z }
---

# Objetivo

Añadir filtros de texto solo de vista a las tres tablas de EXP-003: héroe y
enemigo en Combates, nombre y unidades en Armas, y nombre en Héroes. Al filtrar,
las filas no coincidentes se ocultan, el `rowspan` del enemigo se ajusta a las
filas visibles, los bloques vacíos desaparecen y un aviso explica la ausencia de
resultados.

# No objetivos

- Fórmulas, motor de duelo, valores base, `src/`, `tests/`, `index.html` o
  `public/` de producción; `experiment.md`; dependencias nuevas.
- Objetivos por par (TASK-0072), E2E/QA visual (TASK-0074), export, resets,
  persistencia de filtros y filtros por stats, rangos o arma.
- No ejecutes `pnpm run test:e2e`: los E2E actuales son del modelo antiguo.

# Invariantes

- Los filtros viven solo en memoria de vista: no entran en `results`,
  `diagnosis`, `overrides`, `targets`, export ni resets.
- Escribir en un filtro no mide ni relanza duelos; solo actualiza la vista.
- Se conservan el orden y el foco del campo; un bloque sin filas visibles no se
  renderiza y los demás ajustan `rowspan` a las filas visibles.

# Criterios de aceptación

En `docs/tasks/TASK-0073-exp-003-filtros-tablas.md`, sección «Criterios de
aceptación». Enlaza; no copies.

# Contexto mínimo

- `src/bench-ui.ts`: añade normalización, coincidencia y filtros puros; ya tiene
  `weaponRows`, `groupMatchupsByEnemy` y el catálogo.
- `src/main.ts`: toolbars, `render*`/`sync*` de las tres tablas y `renderAll`.
- `src/experiment.css`: `.panel-toolbar`, inputs y avisos.
- Requisito: R-021–R-024 y T-011 en
  `docs/requirements/REQ-028-ajuste-interactivo-balance.md#filtros`.
- Diseño, helpers y tests: `brief-detalle.md`.

# Artefactos

`artifacts/TASK-0073/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `logs/`. Sin capturas: TASK-0074.

# Riesgos y decisiones abiertas

- No hay jsdom ni DOM de test y no se añaden dependencias: cubre la lógica de
  vista (filas visibles, `rowspan`, bloques vacíos) con helpers puros y tests
  Node; la DOM real (foco, `rowspan` renderizado) queda para TASK-0074.
- Al reconstruir filas visibles, no pierdas el foco del filtro ni el de los
  inputs de stats.
- Sin decisiones creativas abiertas.
