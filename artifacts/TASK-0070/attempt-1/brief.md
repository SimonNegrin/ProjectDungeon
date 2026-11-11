---
type: Task Brief
title: "TASK-0070: brief del intento 1"
description: Tres tablas inline a ancho completo con edición, agrupación y recálculo quirúrgico.
task: TASK-0070
attempt: 1
status: stable
brief_bytes: 3803
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:00:00Z }
---

# Objetivo

Sustituir el editor expandible y la tabla de 18 columnas de EXP-003 por tres
tablas inline (combates, armas y héroes) a ancho completo, con edición en celda,
celdas `rowspan` del enemigo compartido, recálculo quirúrgico y detalle ampliado.
El motor y la API de TASK-0069 ya existen.

# No objetivos

- E2E, QA visual o capturas: TASK-0071. No ejecutes `pnpm run test:e2e` ni
  Playwright; no toques `tests/e2e/experiment-bench.spec.ts`.
- Fórmulas, reglas, `src/` de producción, `tests/` de producción,
  `index.html`, `public/`, `experiment.md` ni dependencias nuevas.

# Invariantes

- `CATALOG` inmutable; overrides y catálogo de trabajo de `v2/bench.ts`.
- Enemigo = bloque compartido: 4 filas (Guerrero, Pícaro, Mago, Clérigo).
- Campos: PV=`maxHp`, Acierto=`habilidad`, Daño=`fuerza`, Defensa=`defensa`,
  Resistencia=`resistencia`, Acciones=`maxActions`, Armadura=`armorId`,
  Escudo=`shieldId`, Arma=`weaponId`.
- Recálculo: enemigo 4 filas, héroe 3, arma todas sus filas, objetivo solo
  diagnóstico; estado `aria-live` con el recuento. Sin resets por campo ni
  dentro de celdas; solo por tabla y global. Sin tablas duplicadas.

# Criterios de aceptación

En `docs/tasks/TASK-0070-exp-003-tres-tablas-ui.md`, sección «Criterios de
aceptación». Enlaza; no copies.

# Contexto mínimo

- `experiments/EXP-003-mesa-combate/src/main.ts`: DOM, editor, detalle, export
  y API; reescribe la composición.
- `.../src/bench-ui.ts`: validación y formato; añade helpers puros de tabla.
- `.../src/experiment.css`: full-width, `table-layout` estable, inputs compactos
  y scroll interno a 900 px.
- `.../src/v2/bench.ts`: `affectedRows`, `recalculateMatchups`, resets y export.
- Requisito: R-001–R-007, R-008–R-010, R-011–R-014, R-015–R-020, T-004–T-007.

# Notas de implementación

- Tabla 1, 15 columnas exactas: Héroe, Enemigo, Victorias héroe, Victorias
  enemigo, % objetivo, % real, PV, Acierto, Daño, Defensa, Resistencia,
  Acciones, Armadura, Escudo, Arma. Agrupa 4 filas por enemigo con `rowspan` en
  Enemigo, % objetivo y los 9 stats; un input/select por stat compartido.
- `% real`: win %, delta y dentro/fuera en la celda. El bloque del enemigo
  muestra «4/4 dentro» o «3/4; <Héroe> fuera por …» y conserva los avisos de
  dispersión y arma global sin duplicar la tabla.
- Al enfocar un stat compartido, resalta las 4 filas; el input conserva foco y
  valor tras recalcular (actualiza en sitio o restaura el foco).
- Tabla 2: Arma, Acierto, Daño; unidades bajo el nombre. Tabla 3: Héroe, Arma
  inicial (con «sin arma»), PV, Acierto, Daño, Defensa, Resistencia, Acciones,
  Armadura, Escudo, Nivel de magia; armadura/escudo con «sin …».
- Seleccionar fila actualiza el detalle; conserva acciones, hechizos, maná, PV,
  réplicas y duración y añade banda, TTK, turnos/rondas y daño.
- Export: catálogo ajustado, objetivos, diagnóstico y `overridesId`; nombre base
  sin overrides y `bench-overrides-<id>` con ajustes.
- Tests: helpers puros de agrupación, formato, selección y resets; integración de
  estado para enemigo/héroe/arma y export determinista. Sin jsdom.

# Artefactos

- `artifacts/TASK-0070/attempt-1/report.md`, `test-output.txt`,
  `verify-output.txt`, `logs/`. La captura queda para TASK-0071; anótalo.

# Riesgos y decisiones abiertas

- Inputs y foco estables al actualizar resultados.
- No romper `window.__experiment`; el E2E de 0071 se adaptará.
- Sin decisiones creativas abiertas.
