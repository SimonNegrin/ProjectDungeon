---
type: Task Brief
title: "TASK-0042: brief del intento 2"
description: Corregir la componente global de enemigos y la métrica de tiradas; conservar la v3.
task: TASK-0042
attempt: 2
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T13:05:00Z }
---

# Objetivo

El intento 1 cumple todo salvo un criterio: la componente global de enemigos.
Corrige la colocación para que **ninguna componente de 8 direcciones supere 2**
en todo el mapa, conserva el mínimo 1 por sala no-spawn y arréglala métrica de
tiradas. Mantén el resto de la v3 y regenera la evidencia.

# Evidencia del fallo

Barrido independiente A/B/C × 400 semillas (1.200 mapas):

- `bsp/104`: componente 3 con `enemy-0-0 (9,7)`, `enemy-0-1 (9,8)` y
  `enemy-2-1 (9,9)`. Las salas 0 (caja y 1-8) y 2 (caja y 9-16) se tocan sin
  muro en x=9; ambas celdas son suelo.
- `bsp/371`: mismo patrón, componente 3.
- Solo esos 2 mapas fallan; spawn, salida, LOS y reserva pasan en 1.200.
- `stats.hotspotRolls` vale `hotspotsEligible`; debería ser `hotspotsTotal` (hay
  tirada para todo punto caliente). Afecta a 144 mapas.

Hipótesis: `selectCandidates` valida componentes solo dentro de cada sala; dos
salas con cajas a gap 0 pueden tener celdas adyacentes y unir fichas de salas
distintas. Hay que validar la componente **global** al colocar.

# Invariantes

- Determinismo puro; sin `Math.random`, relojes ni estado global.
- No tocar `src/`, `tests/`, `index.html` raíz ni `public/`; sin dependencias.
- No borrar, saltar ni debilitar tests. Mantén los 617 actuales y añade
  regresión; los cambios de expectativa v3 siguen justificados por los
  requisitos.
- Se conserva el mínimo 1 por sala no-spawn: intenta **reubicar** dentro de la
  sala antes de reducir el cupo. Si es imposible, aviso honesto.
- No superar `T`, sin visión al spawn salvo aviso, salida y reserva intactas.

# Criterios de aceptación

Viven en [TASK-0042 § Criterios de aceptación](../../../docs/tasks/TASK-0042-exp-004-distribucion-emboscadas-salida.md#criterios-de-aceptación).
Los 11 deben pasar; el foco es «ninguna componente adyacente de 8 direcciones
supera 2».

# Contexto mínimo

- `src/spawn.ts`: pase secuencial de salas con las fichas ya colocadas como
  restricción global (`componentSizeWith`), o post-pase determinista de
  reubicación. Aplica también a la sustitución por interior. Recalcula
  `componentsMax`.
- `src/generate.ts`: `validateMap` ya comprueba la componente global; conserva
  esa comprobación. Corrige `hotspotRolls` a total en `buildStats` y en
  `placeEnemies`.
- Tests: añade regresión con semillas **104 y 371** (BSP) y un barrido de al
  menos 200 semillas por variante que exija `maxComponentSize(map.enemies) <= 2`,
  `validateMap` vacío, mínimo 1 por sala no-spawn y `hotspotRolls === hotspotsTotal`.
  Los tests actuales de 20 semillas no detectaban el cruce entre salas.
- Opcional defensa de raíz: si puedes, evita cajas de sala a gap 0 o añade un
  validador/aviso; no cambies la aceptación por ello. Documenta la decisión.
- Conserva `exit.ts`, render, UI, métricas y controles del intento 1.

# Artefactos

`artifacts/TASK-0042/attempt-2/`: `report.md` (anexo B, ≤4 KB), salidas de
`docs:check`/`test`/`build`/`verify`, `decision-example.json`, `capture.mjs`,
`capture-log.txt`, `logs/` y capturas 1280×720 regeneradas porque cambian las
posiciones: A/B/C, caverna, pasillo ancho, debug de spawn/hotspots/emboscados/
entrada/salida, 4 `exitMode` y 13×13. Actualiza el texto de observaciones en
`experiment-observations.md` si cambian cifras. No edites la tarea; el lead
aplica `experiment.md`.

# Riesgos y decisiones abiertas

- El barrido de 200 semillas debe seguir siendo rápido (<120 s de test).
- No conviertas la corrección en un debilitamiento: el test debe fallar con el
  código del intento 1.
- Si la reubicación no cabe, prioriza componente ≤2 y mínimo 1; documenta
  cualquier sala que quede vacía con aviso.
- Handoff ≤4 KB; salidas completas en archivos aparte.
