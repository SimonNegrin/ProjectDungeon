---
type: Task Brief
title: "Brief — TASK-0010: host con mapa generado, semilla, muros y debug"
description: Integrar el mapa BSP 32×32 en la partida, semilla por URL/R/F2, regla de muros por borde, variantes de suelo deterministas, snapshot ampliado y capa de debug.
task: TASK-0010
attempt: 1
status: stable
branch: task/TASK-0010
created_at: 2026-11-07T23:15:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:15:00Z }
---

# Objetivo

Sustituir la sala fija del host por el mapa generado de `REQ-003` v2:

- La partida arranca con `createInitialState({ seed, options })`; jugador y
  enemigo salen de `state.map.spawns`; el mundo es 32×32.
- La semilla se fija por URL (`?seed=<entero>`), por defecto `279837264`.
  `R` reinicia con **la misma** semilla; `F2` genera una semilla nueva en el host
  y regenera el mapa.
- `GameSession` conserva semilla, opciones y generador y reconstruye el estado
  con ellos al reiniciar.
- Los muros usan una función pura `wallTileFor(grid, x, y)` con la regla por
  borde: `wallSide1` solo si el sur es suelo; `wallTop` en el resto;
  `wallSide2` nunca.
- El suelo usa variantes deterministas (sin `Math.random`, sin flicker).
- `F1` muestra semilla, salas (límites y rol), huecos con orientación, spawns y
  pasillos anchos con anchura. Oculta por defecto; no altera la partida.
- `window.__game.snapshot()` expone `seed`, `rooms`, `corridors`, `doors` y
  `spawns` desde `state.map`, además de lo actual.
- Se mantienen marco 16:9, cámara, HUD y feedback de ataque.

Esta tarea **no** implementa puertas físicas, barricadas, escaleras ni pasillos
de 3 tiles. **No** cambia el generador ni los validadores de TASK-0008/0009,
REQ-003, EXP-001, ADR-007 ni el alcance.

# Contexto obligatorio

- Tarea: `docs/tasks/TASK-0010-host-mapa-generado-muros-debug.md`.
- Requisito: `docs/requirements/REQ-003-generacion-mapa.md` (v2, `stable`),
  especialmente R-005 a R-011, T-003, T-005, T-006, T-008 y T-010.
- Interfaz/modelo: `docs/decisions/ADR-007-map-generator.md`.
- Motor: `src/game/map.ts`, `src/game/bsp.ts`, `src/game/engine.ts`,
  `src/game/types.ts`, `src/game/index.ts`.
- Host actual: `src/host/main.ts`, `session.ts`, `renderer.ts`, `hud.ts`,
  `input.ts`, `debug.ts`, `camera.ts`, `geometry.ts`, `layout.ts`, `assets.ts`.
- Informes previos: `artifacts/TASK-0008/attempt-1/report.md` y
  `artifacts/TASK-0009/attempt-1/report.md`.
- Snapshot de referencia: `artifacts/TASK-0009/attempt-1/map-seed-279837264.json`
  y `.txt`.
- Semilla por defecto `279837264`; opciones de referencia 32×32, 9 salas,
  mínimo 4, máximo 11, `loopRatio 20`.
- Con esa semilla el mapa tiene 9 salas, 10 corredores, 18 huecos, 1 pasillo
  ancho, spawns jugador `(6,8)` y enemigo `(23,28)`.
- Host actual usa sala 20×20, spawn `(4,4)`, cámara con `bounds.max = 256` y
  muros alternos por paridad. Todo eso cambia.

# Estado de partida y Definition of Ready

- `main` estaba limpio en `5557e55`; la rama `task/TASK-0010` se creó desde ahí
  e incluye el commit documental `79e5915` que marca la tarea como `ready` y
  regenera el tablero.
- `TASK-0009` está `done`; su implementación y tests pasan en `main`.
- No hay decisión creativa abierta. Las decisiones técnicas de esta tarea están
  fijadas abajo.

# Decisiones técnicas que debe respetar el runner

## 1. Muros: `src/host/wall.ts` (nuevo)

- Exporta una función pura:

  ```ts
  export type WallTile = 'wallTop' | 'wallSide1';
  export function wallTileFor(
    grid: { readonly width: number; readonly height: number; readonly tiles: readonly Tile[] },
    x: number,
    y: number,
  ): WallTile;
  ```

- Devuelve `'wallSide1'` **solo** si `y + 1` está dentro de la rejilla y el tile
  del sur es `'floor'`. En cualquier otro caso devuelve `'wallTop'`.
- Regla explícita para los casos límite:
  - sur fuera de la rejilla (fila `height - 1`) → `'wallTop'`;
  - sur muro → `'wallTop'`;
  - norte/este/oeste con suelo pero sur muro → `'wallTop'`;
  - muro aislado → `'wallTop'`;
  - nunca devuelve `'wallSide2'` (el tipo ni siquiera lo permite).
- No importa DOM, Canvas ni nada de `src/host/`. Solo tipos de `src/game/types`.
- El renderer sustituye `wallRectFor` por `TILE_RECTS[wallTileFor(...)]`.
- Tests por tabla en `tests/unit/host/wall.test.ts` con vecinos y bordes.

## 2. Suelo determinista

- Variantes `floor1/floor2/floor3` elegidas por una función pura y determinista
  que combine coordenada y, si existe, `state.map.seed`. Sin `Math.random`.
- La misma semilla y estado deben producir exactamente los mismos draws en dos
  renders consecutivos. Semillas distintas pueden variar el patrón.
- Puedes exportar `floorTileFor(x, y, seed)` para testearlo, pero no es
  obligatorio; sí lo es que el render sea reproducible.

## 3. Semilla: `src/host/seed.ts` (nuevo)

- `parseSeedParam(search: string)` (o equivalente) devuelve
  `{ seed: number; warning?: string }`:
  - sin `?seed` → `279837264`, sin aviso;
  - entero válido (opcional signo `+`/`-`, solo dígitos) → se normaliza a
    entero sin signo de 32 bits (puedes reutilizar `normalizeSeed` de
    `src/game/map.ts`);
  - valor inválido (`abc`, `1.5`, `1e9`, vacío, espacios, etc.) → semilla por
    defecto **y** `warning` no vacío con el valor recibido.
- El host registra el aviso con `console.warn` (no `console.error`) y no rompe
  la carga.
- `nextSeed(previous, random?)` elige una semilla nueva **en el host**:
  - devuelve un entero sin signo de 32 bits distinto de `previous`;
  - por defecto usa `crypto.getRandomValues` si está disponible y, si no,
    `Date.now()`; no uses `Math.random` en el render ni en el motor;
  - acepta un `random` inyectable para testear (por ejemplo `() => 0`).
- Tests en `tests/unit/host/seed.test.ts`: parámetro ausente, válido, negativo,
  fuera de rango, inválidos, `nextSeed` distinto y en rango, y que el host no
  usa la semilla por defecto cuando la URL es válida.

## 4. `GameSession`

- Amplía el constructor para aceptar `GameState | CreateInitialStateConfig`.
  Mantén la compatibilidad con `new GameSession(makeState())` de los tests
  actuales.
- Guarda `seed`, `options` y `generator` (los del config; si arranca con un
  `GameState` manual, usa `state.map?.seed ?? DEFAULT_MAP_SEED` y opciones
  `undefined`).
- `dispatch({ type: 'Restart' })` debe reconstruir con
  `createInitialState({ seed, options, generator })`, **no** delegar en el
  `Restart` por defecto de `reduce` (que vuelve a la semilla por defecto). Emite
  `{ type: 'GameRestarted' }`.
- Añade `regenerate(seed: number): void` que reconstruye el estado con la nueva
  semilla y las mismas opciones/generador. Expón `seed` como getter si hace
  falta para el host.
- `move`, `attack`, `endTurn` y comandos rechazados siguen delegando en `reduce`.
- Tests: `R` conserva semilla/mapa exactos; `regenerate` cambia semilla y mapa;
  una sesión manual sigue reiniciando al estado por defecto; no se rompen los
  tests de movimiento/ataque/turno.

## 5. Host (`main.ts`) y URL

- Lee `window.location.search` al arrancar y crea
  `new GameSession({ seed })`. No pases opciones de dificultad: se usan las de
  referencia.
- `window`/URL: `?seed=<entero>`; sin parámetro, `279837264`; inválido, por
  defecto con aviso.
- Recalcula `world`, `bounds` y cámara con el estado actual tras arrancar, `R` y
  `F2`. Lo más simple y correcto es recalcular `world`/`bounds` dentro de
  `render()` a partir de `state.grid` antes de centrar la cámara; evita valores
  obsoletos.
- `R` sigue limpiando feedback; `F2` no debe cerrar el overlay de debug (el
  usuario está mirando el mapa nuevo) y debe limpiar feedback y eventos.
- `F2` no debe regenerar si ya se está regenerando dos veces por la misma
  pulsación; una pulsación = una semilla nueva.
- El HUD no cambia. No añadas texto de ayuda al HUD; menciona `F2` en la capa de
  debug.

## 6. Input

- `translateKey` añade la intención `{ type: 'new-seed' }` para `F2`.
- `F2` funciona también con la partida terminada (es una acción de host, no un
  comando del motor).
- Añade `f2` a `MANAGED_KEYS` para bloquear el comportamiento del navegador.
- Actualiza `tests/unit/host/input.test.ts`: F2 produce `new-seed`; con partida
  terminada reaccionan R, F1 y F2. No borres las demás comprobaciones.

## 7. Render

- `renderScene` sigue siendo de solo lectura y no importa reglas del motor.
- Sustituye `wallRectFor` por `wallTileFor`; no uses `wallSide2`.
- No dibujes muros como suelo ni al revés. El borde del mapa debe verse cerrado.
- Mantén el clip del sub-viewport, el fondo negro del marco, la escala 3× y el
  offset 448 px de respaldo. No cambies layout ni encuadre.
- Tests de renderer: mantén los existentes adaptados si hace falta y añade:
  - el muro del borde superior usa `wallTop` (`sx 0`);
  - un muro con suelo al sur usa `wallSide1` (`sx 32`);
  - ningún draw usa `wallSide2` (`sx 64`, `sy 64`);
  - dos renders del mismo estado producen exactamente la misma secuencia de
    draws (suelo determinista);
  - el estado no se muta.

## 8. Debug y snapshot

- `GameSnapshot` añade:
  - `seed: number | null`;
  - `rooms: readonly Room[]`;
  - `corridors: readonly Corridor[]`;
  - `doors: readonly Door[]`;
  - `spawns: Spawns | null`.
- Se copian desde `state.map` (objetos planos, JSON-safe) para que
  `JSON.parse(JSON.stringify(snapshot))` conserve los datos. Si el estado no
  tiene mapa (tests con `makeState`), usa `null` y arrays vacíos; el juego real
  siempre tendrá mapa.
- `buildDebugModel` debe mostrar, como mínimo:
  - `Semilla: <seed>` (o `n/a` sin mapa);
  - una línea `Salas:` con límites y rol de cada sala;
  - una línea `Huecos:` con coordenadas y orientación;
  - una línea `Spawns:` con jugador, enemigo y distancia;
  - una línea `Pasillos anchos:` con `from→to`, anchura y longitud real/tiles;
  - un recordatorio `F2 nueva semilla`.
- No metas el overlay en el Canvas ni alteres el estado al abrirlo/cerrarlo. Que
  `F1` no cambie el snapshot (salvo la propia visibilidad DOM) y que al apagarlo
  el juego se vea igual.
- Tests de `debug.test.ts` y `hud.test.ts` con un estado generado
  (`createInitialState({ seed: 279837264 })`) para comprobar seed, rooms,
  corridors, doors y spawns; conserva el caso sin mapa.

# Plan de tests exigido

## Unitarios / integración

- `tests/unit/host/wall.test.ts` (nuevo): tabla de vecinos y bordes; `wallSide1`
  solo con sur suelo; `wallTop` en el resto; nunca `wallSide2`.
- `tests/unit/host/seed.test.ts` (nuevo): parseo y normalización; aviso en
  inválidos; `nextSeed` distinto y en rango.
- `tests/unit/host/session.test.ts`: arranque con semilla, `R` conserva
  semilla/mapa, `regenerate` cambia semilla/mapa, sesión manual sigue
  reiniciando, y los tests actuales de input/ataque/turno siguen pasando.
- `tests/unit/host/camera.test.ts`: bounds de 32×32 (`max 640`), cámara inicial
  para spawn `(6,8)` = `(16,80)`, clamp en los cuatro bordes del mundo 1024×1024,
  y que el jugador queda centrado salvo bordes.
- `tests/unit/host/renderer.test.ts`: muros por borde, sin `wallSide2`, suelo
  determinista entre frames.
- `tests/unit/host/debug.test.ts`: snapshot con seed/rooms/corridors/doors/
  spawns y round-trip JSON.
- `tests/unit/host/hud.test.ts`: `buildDebugModel` con mapa generado muestra
  semilla, salas, huecos, spawns y pasillos anchos.
- `tests/unit/host/input.test.ts`: F2 y partida terminada.

## E2E

- Añade `tests/e2e/game-map.spec.ts` (o equivalente) con capturas en
  `artifacts/TASK-0010/attempt-1/screenshots/`:
  - carga `/?seed=279837264`;
  - snapshot: `grid 32×32`, `seed 279837264`, `rooms` 9, `corridors` 10,
    `doors` 18, spawns `(6,8)`/`(23,28)`, `camera` inicial `(16,80)` y
    `max 640`;
  - un movimiento válido y la cámara sigue al jugador/clampa;
  - `F1`: overlay visible con `Semilla: 279837264`, `Salas:`, `Huecos:`,
    `Spawns:` y `Pasillos anchos:`; captura `debug-on.png`;
  - `F1` de nuevo: overlay oculto; captura `debug-off.png`; snapshot sin
    cambios;
  - `R`: misma semilla y mismos spawns;
  - `F2`: semilla distinta y mapa regenerado;
  - capturas de detalle `wall-corner.png` y `wide-corridor.png` (recorte de
    Canvas centrado en una esquina de sala y en el pasillo ancho de la semilla).
- Actualiza los E2E existentes afectados:
  - `tests/e2e/game-render.spec.ts`: 32×32, 1024 tiles, spawns del snapshot,
    cámara inicial `(16,80)`, `max 640`, enemigo fuera del viewport.
  - `tests/e2e/game-input-hud.spec.ts`: spawn `(6,8)`, reinicio a `(6,8)`,
    texto de debug con semilla real y `F2`.
  - `tests/e2e/frame-qa.spec.ts`: adapta las expectativas de mapa/cámara al
    32×32. **No debilites**: en lugar de teletransportar o borrar los casos de
    borde, calcula rutas con BFS sobre `snapshot.grid.tiles` (o usa comandos
    reales aceptados) para llegar a tiles de suelo cerca de cada borde y sigue
    comprobando centrado, clamp y visibilidad. Si un caso concreto ya no tiene
    sentido por el mapa generado, sustitúyelo por una aserción equivalente de
    cámara/visibilidad, no por `expect(true)`.
  - Si modificas capturas de specs antiguos, guarda las nuevas en
    `artifacts/TASK-0010/attempt-1/screenshots/` para no sobrescribir la
    evidencia histórica de TASK-0003/0005/0006.
- No uses `Math.random` en tests para decidir rutas; usa el estado y BFS.

## Manual / visual

- Revisa que no haya huecos ni parches de muro, que las esquinas se lean y que
  el pasillo ancho se vea de 2 tiles.
- Revisa que el HUD y el feedback de ataque sigan funcionando.

# Archivos previstos

```text
src/host/wall.ts                 # nuevo: wallTileFor
src/host/seed.ts                 # nuevo: parseSeedParam, nextSeed
src/host/main.ts                 # URL, F2, world/bounds/cámara, render
src/host/session.ts              # semilla/opciones/generador, restart, regenerate
src/host/renderer.ts             # muros por borde y suelo determinista
src/host/hud.ts                  # debug con mapa generado
src/host/debug.ts                # snapshot ampliado
src/host/input.ts                # F2
tests/unit/host/*.test.ts        # wall, seed, session, camera, renderer, debug, hud, input
tests/e2e/*.spec.ts              # game-map nuevo + ajustes de los existentes
index.html                       # solo si hace falta un data-testid; no cambies el HUD
artifacts/TASK-0010/attempt-1/
```

No toques:

```text
src/game/map.ts
src/game/bsp.ts
src/game/engine.ts               # salvo que sea imprescindible; no cambies el Restart por defecto
docs/requirements/REQ-003-*
docs/decisions/ADR-007-*
experiments/EXP-001-*
package.json / pnpm-lock.yaml
```

No añadas dependencias. No cambies el HUD, el encuadre 16:9 ni la economía de
turno. No implementes puertas físicas, barricadas, escaleras ni ancho 3.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración |
| `pnpm run verify` | 180 s | Docs, config, tests, typecheck y build |
| `pnpm run build` | 120 s | Build con el host integrado (dentro de verify) |
| `pnpm run test:e2e` | 240 s | Carga, cámara, debug y capturas |

- Usa `pnpm`, no `npm` ni `npx`.
- Todo comando en primer plano con timeout explícito; regístralo en el informe.
- `pnpm run test:e2e` usa el `webServer` de Playwright (puerto 4173) y lo cierra
  solo. No dejes servidores ni procesos en background.
- Si un comando agota el timeout, para, guarda evidencia y devuelve bloqueo; no
  lo repitas sin una hipótesis nueva.

# Artefactos y respuesta

Crea en `artifacts/TASK-0010/attempt-1/`:

```text
brief.md
report.md
test-output.txt
verify-output.txt
e2e-output.txt
screenshots/debug-on.png
screenshots/debug-off.png
screenshots/wall-corner.png
screenshots/wide-corridor.png
snapshot.json            # snapshot de window.__game con seed/rooms/... (opcional pero recomendado)
```

El informe debe incluir frontmatter OKF (`type: Task Report`, `task:
TASK-0010`, `attempt: 1`, `report_status`, `generated`), resumen, cambios,
commit SHA, comandos/resultados con timeout, tabla de criterios con evidencia,
capturas, desviaciones y limitaciones.

**No marques la tarea como `done` ni fusiones**: eso lo hace el lead.

Devuelve al lead un resumen breve con: estado, commit SHA, tests ejecutados y
resultado, artefactos/capturas, semilla y métricas del mapa (salas, corredores,
huecos, pasillos anchos, spawns), y cualquier limitación o pregunta. Si no puedes
cumplir un criterio, para y devuelve un bloqueo con evidencia en lugar de
falsear datos.
