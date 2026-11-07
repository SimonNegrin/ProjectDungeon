---
type: Task Brief
title: "Brief — TASK-0011: E2E y QA visual del mapa generado"
description: Añadir generated-map-qa.spec.ts y capturas para verificar semilla, salas, huecos, pasillos anchos, muros por borde, spawns, cámara, F1/F2/R, HUD, encuadre y rendimiento del mapa 32×32.
task: TASK-0011
attempt: 1
status: stable
branch: task/TASK-0011
created_at: 2026-11-07T23:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:30:00Z }
---

# Objetivo

Demostrar con Playwright y capturas que el mapa generado de `REQ-003` v2 cumple
lo observable en el host:

- carga determinista con `?seed=279837264`;
- snapshot 32×32, 8-12 salas, huecos de puerta, 1-2 pasillos anchos y spawns
  distintos;
- jugador en sala con salida, enemigo fuera del viewport y cámara centrada y
  limitada;
- `F1` muestra semilla, salas, huecos, spawns y pasillos anchos; `R` conserva la
  semilla; `F2` cambia semilla y mapa;
- muros con la regla por borde (`wallTop`/`wallSide1`, sin `wallSide2`) en una
  muestra de tiles y en capturas;
- pasillos anchos de 2 tiles sin puertas y cada sala con un acceso estrecho con
  hueco;
- HUD y encuadre 16:9 siguen funcionando;
- generación <100 ms y sin tirones detectables en el E2E.

La tarea es de **tests y QA visual**. No se espera código de producción nuevo.
Si el E2E descubre un fallo real, no se relaja la aserción: se documenta el caso,
se guarda evidencia y se devuelve bloqueo. Solo se corrige producción si el fallo
es inequívoco y está dentro del alcance de `REQ-003` (sin cambiar requisitos,
criterios, HUD, encuadre ni economía de turno).

# Contexto obligatorio

- Tarea: `docs/tasks/TASK-0011-e2e-qa-mapa-generado.md`.
- Requisito: `docs/requirements/REQ-003-generacion-mapa.md` v2 (`stable`).
- Arquitectura: `docs/design/architecture.md`.
- Calidad: `docs/quality/test-strategy.md`,
  `docs/quality/definition-of-ready-done.md` y `docs/harness/visual-qa.md`.
- Informes previos:
  - `artifacts/TASK-0008/attempt-1/report.md` (BSP y validadores),
  - `artifacts/TASK-0009/attempt-1/report.md` (huecos y pasillos anchos),
  - `artifacts/TASK-0010/attempt-1/report.md` (host, muros, semilla y debug).
- Snapshot y mapa de referencia:
  - `artifacts/TASK-0009/attempt-1/map-seed-279837264.json`,
  - `artifacts/TASK-0010/attempt-1/snapshot.json`.
- E2E existentes que **no** se deben debilitar:
  `tests/e2e/game-render.spec.ts`, `game-input-hud.spec.ts`, `frame-qa.spec.ts`,
  `game-map.spec.ts`, `experiment-shell.spec.ts`, `experiment-generator.spec.ts`.
- Host: `src/host/main.ts`, `session.ts`, `debug.ts`, `renderer.ts`, `wall.ts`,
  `hud.ts`, `input.ts`, `camera.ts`, `layout.ts`, `geometry.ts`, `assets.ts`.
- Motor y modelo: `src/game/map.ts`, `src/game/bsp.ts`, `src/game/engine.ts`,
  `src/game/types.ts`, `src/game/index.ts`.

# Estado y Definition of Ready

- `main` estaba limpio en `562216a` antes de esta tarea. La rama
  `task/TASK-0011` se creó desde ahí e incluye el commit documental `d060e43`
  que marca TASK-0011 como `ready` y regenera el tablero.
- Dependencia `TASK-0010` está `done`; `REQ-003` v2 está aprobada y estable.
- Criterios, plan de test, archivos, comandos y ruta de artefactos están
  definidos. No hay decisión creativa abierta: la sensación final la aprueba el
  usuario en el playtest, no el runner ni el lead.
- La tarea queda en `review` hasta ese playtest; el runner **no** toca
  `docs/tasks/` ni marca `done`.

# Datos de referencia (semilla 279837264, 32×32, 9/4/11/20)

Valores esperados del mapa actual, ya verificados en TASK-0010:

- 9 salas (2 large, 4 medium, 3 small), 10 corredores, 18 huecos.
- 1 pasillo ancho `0→1`, `width: 2`, `doorEligible: false`, 26 puntos de path
  (25 tiles de longitud), carril real 8, tramo recto 20.
- Spawns: jugador `(6,8)`, enemigo `(23,28)`, distancia de camino 59.
- Cámara inicial `(16,80)`, límites `(640,640)`; viewport 384×384 (12×12 tiles).
- Enemigo fuera del viewport inicial.
- `wallSide2` no se usa en el render; `TILE_RECTS.wallSide2` existe en los
  assets pero el renderer no lo selecciona.

No conviertas estos valores en la única verdad: las aserciones de rangos
(8-12 salas, 1-2 pasillos anchos, 1-3 huecos por sala) deben cumplirse también
tras `F2`. Si una semilla aleatoria de `F2` incumple un rango, guarda el caso y
devuelve bloqueo; no relajes el requisito.

# Tests exigidos

## 1. `tests/e2e/generated-map-qa.spec.ts` (nuevo)

Debe ser autocontenido y determinista. Usa `/?seed=279837264`, viewport
1280×720 y `window.__game.snapshot()`. No inyectes estado ni teletransportes;
para moverte usa comandos reales aceptados (`Move`/`EndTurn`) como en
`tests/e2e/support.ts`.

Cubre, como mínimo:

### Carga, determinismo y snapshot

- La página carga sin errores de consola ni `pageerror`.
- `grid.width === 32`, `grid.height === 32`, `grid.tiles.length === 1024`.
- Dos cargas de la misma URL producen el mismo snapshot estructural: mismos
  `grid.tiles`, `seed`, `rooms`, `corridors`, `doors`, `spawns` y cámara.
- `JSON.parse(JSON.stringify(snapshot))` conserva `rooms`, `corridors`, `doors`
  y `spawns`.

### Salas, huecos y pasillos

- Entre 8 y 12 salas; sin solapes y con al menos 1 tile de muro entre salas
  (comprueba los rectángulos con margen 1). Con la semilla de referencia, al
  menos 2 grandes (7×7 a 11×11) y 3 pequeñas (3×3 a 5×5).
- Cada sala tiene entre 1 y 3 huecos (`doors` con su `roomId`), ningún hueco
  duplicado, todos sobre `floor` y con orientación `horizontal`/`vertical`.
  Cada sala conserva al menos un corredor estrecho (`width: 1`) incidente y al
  menos un hueco.
- Pasillos anchos: 1-2 por mapa, `width === 2`, `doorEligible === false`,
  `path.length >= 4`. Comprueba de forma independiente sobre `grid.tiles` que
  existe un tramo de al menos 4 tiles consecutivos del path con un vecino
  ortogonal de suelo fuera del path (ancho real 2). No basta con leer
  `wideCorridorStretch` de producción: si lo usas como apoyo, añade la
  comprobación geométrica propia.
- Ningún `Door` cae dentro de la huella del pasillo ancho (path + vecinos
  ortogonales de suelo). Si el cálculo independiente de huella es demasiado
  ambiguo en cruces, documenta la limitación y al menos comprueba que ningún
  hueco está en el path y que todos los corredores anchos tienen
  `doorEligible: false`.

### Spawns, cámara y enemigo

- Jugador y enemigo están sobre `floor`, no sobre un hueco de puerta, en salas
  distintas, y el jugador está en una sala con al menos una salida/hueco.
- BFS propio en el spec sobre `snapshot.grid.tiles` confirma distancia de camino
  >= 12 y coherente con `spawns.distance`.
- El enemigo no intersecta el viewport inicial (`camera` + `viewport` en px).
- La cámara cumple la fórmula de centrado con clamp a `[0, maxX]`/`[0, maxY]`;
  `maxX`/`maxY` son 640. Un movimiento real del jugador actualiza la cámara.
- Los cuatro bordes de cámara ya están cubiertos por `frame-qa.spec.ts`; no
  dupliques el recorrido completo si no aporta, pero el criterio de la tarea
  incluye la suite completa.

### `F1`, `R`, `F2`, HUD y encuadre

- `F1` abre `debug-overlay` visible y `debug-content` contiene `Semilla:
  279837264`, `Salas:`, `Huecos:`, `Spawns:` y `Pasillos anchos:` con la
  anchura 2. Al cerrar `F1`, el overlay queda oculto y el snapshot no cambia.
- `R` conserva `seed`, `grid.tiles`, `spawns` y devuelve jugador a `(6,8)` con
  MP/HP/acción iniciales.
- `F2` cambia la semilla y el mapa (`grid.tiles` y `rooms` distintos), mantiene
  `debug-overlay` visible si estaba abierto, reinicia turno/estado y recalcula
  cámara/límites. Con la semilla nueva, vuelve a comprobar 32×32, 8-12 salas y
  1-2 pasillos anchos.
- HUD: `hud`, `hud-player-hp` (`20/20`), `hud-player-mp` (`6/6`), `hud-action`
  (`Sí`), `hud-phase` (`Jugador`), `hud-turn` (`Turno 1`), `hud-enemy-hp`
  (`10/10`) visibles y correctos. El ataque y el feedback (`attack-flash`,
  `damage-feedback`) siguen cubiertos por `game-input-hud.spec.ts` y
  `frame-qa.spec.ts`; no los reimplementes si la suite completa ya pasa.
- Encuadre: `frame` y `#game-canvas` mantienen proporción 16:9 y el canvas
  interno 2048×1152. La cobertura completa de layout sigue en `frame-qa.spec.ts`.

### Muros por borde: muestra y capturas

- Comprueba la regla por borde en una muestra de tiles visibles: para cada tile
  de muro, `wallSide1` solo si el sur es `floor`; `wallTop` en el resto.
  Puedes importar `wallTileFor` de `../../src/host/wall` para la comprobación
  estructural, pero además verifica **al menos un muro `wallTop` y uno
  `wallSide1` a nivel de píxel**:
  - localiza la posición de respaldo del tile en el canvas (offset 448 px,
    escala 3×, cámara del snapshot);
  - compara el bloque de 96×96 px con el sprite de `tiles.png` que corresponde a
    la regla (`wallTop` = sx 0, sy 64; `wallSide1` = sx 32, sy 64), dibujado a
    la misma escala o comparando la firma de píxeles;
  - elige tiles sin unidades encima (por ejemplo `(2,6)` para `wallTop` y
    `(3,3)` para `wallSide1` en la cámara inicial; confirma con el snapshot).
- La muestra y las capturas deben demostrar que no hay `wallSide2`, no hay caras
  verticales sobre muros y no hay huecos. El detalle visual de esquina es
  evidencia para el playtest, no sustituye a la aserción.

## 2. Rendimiento

- Mide la generación de 32×32 con la semilla de referencia en el navegador.
  Preferible: `await import('/src/game/index.ts')` o el generador expuesto por
  Vite en el page context, calienta una vez y mide 5-10 generaciones con
  `performance.now()`. Registra `min`, `median`, `max` y umbral.
- Alternativa aceptable si el import dinámico en page no es viable: mide en Node
  importando `createInitialState` desde el spec, documentando que es el mismo
  código puro y que el E2E comprueba que el render no se bloquea. No falsees la
  medición.
- Comprueba “sin tirones” con `requestAnimationFrame`: calienta varios frames y
  mide una ventana de 30-60 frames tras la carga. Fija umbrales generosos y
  justificados (por ejemplo p95 < 50 ms y máximo < 100 ms) para no crear un test
  frágil por el headless. Si el entorno produce un pico aislado, repite una vez
  tras calentar y documenta el valor; no ocultes el pico.
- Guarda la medición en `artifacts/TASK-0011/attempt-1/performance.txt`.

## 3. Capturas obligatorias

En `artifacts/TASK-0011/attempt-1/screenshots/`:

- `map-debug-on.png`: mapa generado con `F1` activo.
- `map-debug-off.png`: mismo estado con `F1` oculto.
- `alternative-seed.png`: mapa tras `F2` (y, si aporta, también con debug).
- `wall-corner.png`: detalle de esquina de muro.
- `wide-corridor.png`: detalle del pasillo ancho de 2 tiles.

Puedes reutilizar el helper de recorte de `game-map.spec.ts` (cópialo en la spec
nueva o extráelo a `tests/e2e/support.ts` si no rompes nada). Las capturas deben
ser deterministas y adjuntarse con `testInfo.attach`.

# Reglas de ejecución y restricciones

- No borres, saltes, comentes ni debilites tests existentes. Si un test antiguo
  falla por el cambio de expectativas, se corrige con una aserción equivalente
  más fuerte, nunca con `expect(true)` ni omitiendo el caso.
- No uses `Math.random` en tests para decidir rutas o semillas; usa el estado y
  BFS. `F2` sí es aleatorio por diseño; solo comprueba que cambia.
- No teletransportes al jugador ni inyectes estado en `window.__game`. Usa
  comandos aceptados.
- No cambies requisitos, criterios, dependencias, `package.json`,
  `pnpm-lock.yaml`, HUD, encuadre ni economía de turno.
- No añadas features nuevas ni hooks de producción. El snapshot y `F1` actuales
  deben bastar. Si falta un dato imprescindible, escala en vez de ampliar el
  contrato.
- No dejes servidores ni procesos en background. Playwright usa su `webServer`
  (puerto 4173) y lo cierra solo.
- Al ejecutar `pnpm run test:e2e`, algunos specs existentes reescriben capturas
  históricas de TASK-0007/TASK-0010. Después de la ejecución, restaura esas
  capturas con `git checkout -- <rutas>` si el contenido no forma parte del
  cambio, para no alterar evidencia histórica. Las capturas nuevas van solo a
  `artifacts/TASK-0011/attempt-1/screenshots/`.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm exec tsc --noEmit` | 130 s | Tipos del spec nuevo y del proyecto |
| `pnpm run test` | 120 s | Unitarios e integración |
| `pnpm run verify` | 180 s | Docs, config, tests, typecheck y build |
| `pnpm run test:e2e` | 300 s | Suite E2E completa, incluida la spec nueva |
| `pnpm exec playwright test tests/e2e/generated-map-qa.spec.ts` | 240 s | Validación intermedia de la spec nueva |
| `pnpm run build` | 120 s | Build final (dentro de verify) |

- Usa `pnpm`, nunca `npm` ni `npx`.
- Todo comando en primer plano lleva timeout explícito. Regístralo en el
  informe.
- Si un comando agota el timeout: para el proceso, guarda salida/evidencia y
  devuelve bloqueo. No repitas el mismo comando sin hipótesis nueva.

# Artefactos

Crea en `artifacts/TASK-0011/attempt-1/`:

```text
brief.md                  # este brief
report.md                 # informe OKF del runner
test-output.txt           # pnpm run test
verify-output.txt         # pnpm run verify
e2e-output.txt            # pnpm run test:e2e
performance.txt           # generación y frames
screenshots/
  map-debug-on.png
  map-debug-off.png
  alternative-seed.png
  wall-corner.png
  wide-corridor.png
```

`tests/e2e/generated-map-qa.spec.ts` debe quedar commiteado en
`task/TASK-0011`.

# Qué debe devolver el runner

Un informe breve con:

1. estado (`completed` o `blocked`) y commit SHA en `task/TASK-0011`;
2. archivos cambiados y justificación;
3. comandos ejecutados, timeout y resultado;
4. tabla de criterios de aceptación con evidencia concreta;
5. métricas de la semilla de referencia y de la semilla tras `F2`;
6. medición de rendimiento y de frames;
7. capturas y artefactos;
8. desviaciones, limitaciones y preguntas para el lead.

**No marques la tarea como `done`, no fusiones y no toques `docs/tasks/`.** Eso lo
hace el lead tras verificar y tras el playtest del usuario. Si no puedes cumplir
un criterio, devuelve bloqueo con evidencia en lugar de falsear datos o relajar
la aserción.
