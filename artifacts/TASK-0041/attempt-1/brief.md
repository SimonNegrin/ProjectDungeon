---
type: Task Brief
title: "TASK-0041: brief del intento 1"
description: Actualizar EXP-004 a la v2 de puertas, spawn en el acceso y enemigos por superficie y jugadores.
task: TASK-0041
attempt: 1
status: stable
brief_bytes: 3089
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T11:05:00Z }
---

# Objetivo

Actualizar `experiments/EXP-004-salas-irregulares/` para que A, B y C apliquen
las reglas v2 de puertas, spawn alrededor del acceso y presupuesto de enemigos
por superficie y jugadores. Sigue siendo puro, determinista y serializable. No
se toca producción.

# No objetivos

- No tocar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No decidir la variante ni cerrar `REQ-011`/`REQ-012`.
- No implementar puertas funcionales, combate, IA, HUD ni promocionar código.

# Invariantes

- Misma semilla + opciones ⇒ mismo mapa; sin `Math.random`, relojes ni estado
  global.
- Contrato serializable; conserva `spawns.player` y no borres, saltes ni
  debilites tests.
- Conectividad intacta en A/B/C y misma forma de datos.
- Hueco sin puerta válida ⇒ boca abierta con motivo; nunca puerta inválida.

# Criterios de aceptación

En [la tarea](../../../docs/tasks/TASK-0041-exp-004-puertas-spawn-enemigos.md#criterios-de-aceptación).
No se copian ni se reinterpretan.

# Contexto mínimo

- [REQ-011 v2](../../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos)
  (R-009/T-014 puertas) y [REQ-012 v2](../../../docs/requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos)
  (R-002/R-006/R-007/R-008 spawn y enemigos).
- v1: `experiments/EXP-004-salas-irregulares/src/` (`generate.ts`, `spawn.ts`,
  `render.ts`, `main.ts`, `metrics.ts`, `types.ts` y tests).
- Evidencia previa: `artifacts/TASK-0040/attempt-2/report.md` y capturas.
- Página y manifest existentes: se actualizan, no se rehacen.

# Alcance

- Puertas: validador puro con puertas válidas y bocas con motivo, expuesto en
  modelo, métricas y debug.
- Spawn: acceso junto a la puerta más cercana al centro; `party[0]` en el
  acceso; radio 2, separación ≥2 y vecinos libres; fallback con `warnings`.
- Enemigos: `T = ceil(enemySurfaceFactor × N) + ceil(enemyPlayersFactor × P)`;
  reparto por área con mayor resto, mínimo 1 por sala no-spawn, 0 en spawn,
  tipos 60/20/20 y separación ≥2.
- UI: tres controles con rango y valores por defecto; panel y JSON con desglose.
- Render/debug: puertas, bocas, accesos, huecos y enemigos; 13×13 coherente.

# Artefactos

En `artifacts/TASK-0041/attempt-1/`: `report.md`, `test-output.txt`,
`docs-check-output.txt`, `build-output.txt`, `screenshots/` (1280×720, A/B/C,
≥4 semillas, caverna y pasillo ancho; normal, debug y 13×13),
`decision-example.json`, `logs/` si hay captura, y commit en `task/TASK-0041`.
Actualiza `experiment.md` sin cerrar la decisión.

# Riesgos

- Puerta incompatible con la geometría ⇒ boca abierta y `warning`; no relajes la
  regla.
- Fallback de spawn sin 6 huecos ⇒ documenta el aviso.
- Dudas creativas: exporta datos, no decidas por el usuario.
