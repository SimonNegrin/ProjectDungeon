---
type: Task Brief
title: "Brief — TASK-0008: interfaz MapGenerator, BSP, salas y pasillos estrechos"
description: Implementar en src/game/ el generador BSP determinista de 32×32, el modelo GeneratedMap serializable, la interfaz MapGenerator, las apariciones y los tests de producción.
task: TASK-0008
attempt: 1
status: stable
branch: task/TASK-0008
created_at: 2026-11-07T22:40:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:40:00Z }
---

# Objetivo

Sustituir la sala fija de `src/game/engine.ts` por una generación BSP determinista
detrás de la interfaz `MapGenerator`. El resultado debe ser un `GeneratedMap`
serializable de 32×32 con 8-12 salas con roles, pasillos estrechos de 1 tile
conectados, 1-3 bucles, callejones cortos y apariciones jugador/enemigo válidas.
La configuración por defecto es la de `EXP-001`: semilla `279837264`,
`roomTarget 9`, `roomMin 4`, `roomMax 11`, `loopRatio 20`.

Esta tarea **no** implementa puertas ni pasillos anchos (TASK-0009), **no** toca el
host/render/HUD/encuadre (TASK-0010) y **no** toca `index.html` ni `public/`.

# Contexto obligatorio

- Tarea: `docs/tasks/TASK-0008-motor-generador-bsp.md`.
- Requisito: `docs/requirements/REQ-003-generacion-mapa.md` (v2, estable).
- Decisión: `experiments/EXP-001-generador-mazmorra/experiment.md` (A · BSP,
  semilla `279837264`, 9/4/11/20).
- Interfaz y modelo: `docs/decisions/ADR-007-map-generator.md`.
- Prototipo de referencia: `experiments/EXP-001-generador-mazmorra/src/dungeon.ts`.
  **No se importa desde producción.** Sirve para entender BSP, roles, slots de
  puerta y validaciones; se puede portar y optimizar, no copiar literalmente.
- Código actual: `src/game/engine.ts`, `types.ts`, `grid.ts`, `movement.ts`,
  `combat.ts`, `turn.ts`, `ai.ts`.
- Tests actuales que se ven afectados:
  `tests/unit/game/engine.test.ts`, `tests/unit/host/renderer.test.ts`,
  `tests/unit/host/hud.test.ts`, `tests/unit/host/session.test.ts`.
- Regla de muros y render: fuera de alcance (TASK-0010).
- `window.__game`: fuera de alcance (TASK-0010). Ver “Conflicto conocido”.

# Decisiones de diseño que debe respetar el runner

## Modelo e interfaz

Crea los tipos en `src/game/map.ts` (o `src/game/map-types.ts` si prefieres separar
tipos y algoritmo; el nombre exacto lo decide el runner, pero debe ser estable y
exportarse desde `src/game/index.ts`):

```ts
export type RoomRole = 'large' | 'small' | 'medium';
export type CorridorKind = 'tree' | 'loop';
export type DoorOrientation = 'horizontal' | 'vertical';

export interface Room {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly role: RoomRole;
}

export interface Corridor {
  readonly fromRoomId: number;
  readonly toRoomId: number;
  readonly kind: CorridorKind;
  readonly width: 1;
  readonly doorEligible: boolean;
  readonly path: readonly Position[];
}

export interface Door {
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  readonly roomId: number;
}

export interface Spawns {
  readonly player: Position;
  readonly enemy: Position;
  readonly distance: number;
}

export interface MapOptions {
  readonly mapWidth?: number;
  readonly mapHeight?: number;
  readonly roomTarget?: number;
  readonly roomMin?: number;
  readonly roomMax?: number;
  readonly loopRatio?: number;
  /** Reservado para TASK-0009; en esta tarea se acepta y se ignora. */
  readonly wideCorridorCount?: number;
  /** Reservado para TASK-0009; en esta tarea se acepta y se ignora. */
  readonly wideCorridorWidth?: number;
}

export interface ResolvedMapOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly roomTarget: number;
  readonly roomMin: number;
  readonly roomMax: number;
  readonly loopRatio: number;
  readonly wideCorridorCount: number;
  readonly wideCorridorWidth: number;
}

export interface GeneratedMap {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** `Tile[]` de `src/game/types.ts` (`'floor' | 'wall'`). */
  readonly tiles: readonly Tile[];
  readonly rooms: readonly Room[];
  readonly corridors: readonly Corridor[];
  /** Vacío en esta tarea. TASK-0009 lo rellena. */
  readonly doors: readonly Door[];
  readonly spawns: Spawns;
  readonly warnings: readonly string[];
  readonly options: ResolvedMapOptions;
}

export interface MapGenerator {
  readonly id: string;
  generate(seed: number, options?: MapOptions): GeneratedMap;
}
```

- `BspMapGenerator` implementa `MapGenerator` con `id = 'bsp'`.
- `GeneratedMap` debe ser JSON-safe: sin `Set`, `Map`, `Uint8Array` ni clases.
  Internamente se puede usar `Uint8Array` para rendimiento, pero la salida son
  arrays de objetos planos.
- `tiles` usa el tipo `Tile` existente (`'floor' | 'wall'`), no `0/1`, para que
  `state.grid.tiles` sea directamente el mapa generado.
- `Corridor.width` es literal `1` en esta tarea y `doorEligible` es `true` en
  todos los corredores estrechos. `doors` queda vacío.
- `MapOptions` y `ResolvedMapOptions` deben incluir `wideCorridorCount` y
  `wideCorridorWidth` reservados. Si el llamador pide `wideCorridorCount > 0`,
  se normaliza a 0 y se añade un aviso a `warnings` (TASK-0009 lo implementa).

## `createInitialState`

- Debe aceptar un generador y opciones. Implementa una firma flexible:
  - Principal: `createInitialState({ seed?, options?, generator? })`.
  - Compatibilidad con ADR-007: si el primer argumento es un `MapGenerator`
    (tiene `generate`), úsalo como generador y acepta `options` como segundo
    argumento.
- Por defecto: `new BspMapGenerator()`, semilla `279837264` y opciones de
  referencia 32×32 / 9 / 4 / 11 / 20.
- Construye `grid` con `{ width: map.width, height: map.height, tiles: map.tiles }`
  y coloca `players[0]` y `enemies[0]` en `map.spawns.player` y
  `map.spawns.enemy`.
- Añade `map: GeneratedMap` al `GameState`. Puede ser opcional (`readonly map?`)
  para no romper estados construidos a mano en tests, pero **`createInitialState`
  siempre lo incluye**. Si lo haces obligatorio, actualiza `tests/unit/game/helpers.ts`
  y cualquier construcción manual; no debilites tests.
- Exporta `DEFAULT_MAP_SEED = 279837264` y `DEFAULT_MAP_OPTIONS` (o equivalente)
  para que TASK-0009/TASK-0010 los reutilicen.
- `reduce(state, { type: 'Restart' })` sigue devolviendo `createInitialState()`.
  TASK-0010 se encargará de conservar semilla/generador en la sesión; en esta
  tarea el comportamiento por defecto es suficiente.

## Semilla y PRNG

- PRNG local tipo `mulberry32` sembrado con un entero de 32 bits. No uses
  `Math.random`, `Date.now` ni `performance.now` dentro del generador.
- La misma semilla y opciones deben producir estructuras profundamente iguales
  (`JSON.stringify` igual); semillas distintas deben producir al menos una
  diferencia estructural (tiles o salas).
- No dependas de orden de iteración de `Object`, `Set` o `Map` para el resultado.
  Usa arrays y bucles deterministas.

# Algoritmo requerido

## 1. Resolución de opciones

- Por defecto: `mapWidth 32`, `mapHeight 32`, `roomTarget 9`, `roomMin 4`,
  `roomMax 11`, `loopRatio 20`, `wideCorridorCount 0`, `wideCorridorWidth 2`.
- Normaliza con avisos, sin romper:
  - `mapWidth`/`mapHeight`: enteros, mínimo 20 (24×24 y 40×40 deben funcionar).
  - `roomTarget`: 8-12.
  - `roomMin`: 3-6; `roomMax`: 8-11; si `roomMin > roomMax`, normaliza.
  - `loopRatio`: redondea a múltiplos de 5, 0-40.
  - `wideCorridorCount`: 0-2; en esta tarea fuerza 0 con aviso si se pide >0.
- `GeneratedMap.options` son las opciones resueltas.

## 2. Salas y roles (BSP)

- Partición BSP recursiva del rectángulo interior (margen 2 para el muro de
  borde). Divide la hoja de mayor área que pueda dividirse, con un mínimo de
  hoja que permita una sala de `roomMin` más 2 tiles de margen.
- Detén la partición al llegar a `roomTarget` hojas o cuando ninguna pueda
  dividirse; si no se alcanza el objetivo, reduce y avisa.
- Programa de roles para la configuración de referencia: **2 grandes, 3
  pequeñas y el resto medianas**.
  - Grande: lado 7-9 (dentro del rango aceptado 7×7-11×11; 7-9 es más fácil de
    encajar en BSP).
  - Pequeña: lado `max(3, roomMin)`-`min(5, roomMax)` (con `roomMin 4` salen 4-5,
    que siguen siendo pequeñas).
  - Mediana: lado `max(6, roomMin)`-`min(8, roomMax)`.
- Asigna roles a hojas con capacidad suficiente (`min(w,h) - 2`), empezando por
  los roles que exigen más lado y eligiendo la hoja más justa que quepa. Si no
  hay asignación válida, reintenta la partición de forma determinista (el PRNG
  avanza) hasta un máximo razonable.
- Coloca cada sala dentro de su hoja con 1 tile de margen interior. Así no hay
  solapes y entre salas de hojas adyacentes quedan al menos 2 tiles de muro
  (cumple “al menos 1 tile de muro entre salas”).
- Dimensiones dentro de `[roomMin, roomMax]` y clasificación correcta.
- Si tras los reintentos no se puede, usa un empaquetado determinista de respaldo
  que garantice al menos 2 grandes y 3 pequeñas con la configuración de
  referencia, y registra el ajuste en `warnings`. No reduzcas los roles con la
  configuración por defecto ni falsees dimensiones.

## 3. Pasillos estrechos, conectividad, bucles y callejones

- Conecta las salas siguiendo la estructura BSP (una conexión por nodo interno,
  entre una sala del subárbol izquierdo y una del derecho). Si un par falla, prueba
  otros pares deterministamente.
- Añade un paso de `ensureConnected` con union-find: si alguna sala queda fuera
  del componente principal, conéctala con el mejor candidato válido.
- Añade **1-3 bucles** según `loopRatio`. Con 9 salas y 20 % el objetivo es 2.
  Los bucles son conexiones adicionales entre salas no conectadas directamente.
- Todos los corredores son de **1 tile**, ortogonales (cada paso consecutivo es
  Manhattan 1), con `width: 1`, `doorEligible: true`, `kind: 'tree' | 'loop'`.
- Cada corredor debe empezar y terminar en un acceso válido de una sala (slot de
  puerta): celda de muro adyacente a la sala, con la sala detrás, muro a ambos
  lados perpendiculares y sin tocar otra sala. TASK-0009 reutilizará esos slots
  para calcular huecos; no los destruyas.
- Prohibido crear zonas de 2×2 de suelo fuera de salas (eso serían pasillos
  anchos). Valida cada ruta contra el suelo existente y rechaza las que formen un
  bloque 2×2.
- Los corredores nuevos no deben reutilizar suelo de corredor existente: así el
  grafo queda como árbol + bucles explícitos. Si un par no encuentra ruta nueva,
  prueba otro par.
- Debe existir **al menos un tramo recto de 5 tiles o más** en algún corredor y
  **al menos un corredor con 2 o más esquinas**. Si el mapa generado no los tiene,
  reintenta de forma determinista o fuerza que una conexión (por ejemplo un bucle)
  use una ruta en Z con 2 esquinas. No falsees la métrica.
- **Ningún callejón sin salida** puede superar 4 tiles desde la última
  bifurcación. Con el esquema de rutas que empiezan y acaban en salas no debería
  haber callejones; valídalo y, si aparece alguno, reintenta.
- La conectividad debe ser total: un BFS desde la celda del jugador debe alcanzar
  todas las celdas de suelo (100 %).

## 4. Optimización de rendimiento

El prototipo mide ~114 ms en Node y 250,9 ms en navegador con la semilla de
referencia. El objetivo es **<100 ms en CI**. Optimiza sin cambiar la estructura:

- Usa `Uint8Array` para `tiles`, `roomCells`, `nearRoom` (celdas adyacentes a
  salas), `reserved` (paredes perpendiculares de slots) y máscaras temporales.
- Precalcula `nearRoom` una sola vez tras colocar las salas.
- Para conectar salas, **no enumeres todos los pares de slots × 6 rutas** como el
  prototipo. Usa un BFS multi-fuente sobre las celdas exteriores:
  - Fuentes: celdas `slot + out` de los slots válidos de la sala A.
  - Objetivos: celdas `slot + out` de los slots válidos de la sala B.
  - Pasable: dentro del margen 1, no sala, no `nearRoom`, no `reserved`, no
    suelo existente y no bloqueada por 2×2.
  - Reconstruye el camino más corto y valida el camino completo (slot A, ruta,
    slot B) con las comprobaciones estrictas de slot y 2×2.
  - El BFS es O(32×32) por conexión y elimina la mayor parte del coste.
- Para garantizar el corredor con 2 esquinas, usa rutas en Z explícitas (fila o
  columna intermedia) al menos en una conexión; valídalas con la misma función.
- Evita `Set`/`Map` en bucles calientes; usa índices numéricos y arrays.
- No midas el tiempo dentro del generador. La medición va en tests/artefactos con
  `performance.now()` **fuera** de la función pura.
- Registra la medición real (varias repeticiones, mediana y máximo) en
  `artifacts/TASK-0008/attempt-1/performance.txt` y en el informe. No falsees ni
  redondees a la baja.

## 5. Apariciones

- **Jugador:** centro de una sala con al menos una salida (una conexión de
  corredor). Debe ser suelo.
- Calcula distancias BFS sobre suelo desde el jugador.
- **Enemigo:** en la sala más lejana por camino (máximo de distancia BFS entre sus
  celdas), distinta de la del jugador. Dentro de esa sala elige una celda que:
  - esté a distancia ≥12 del jugador;
  - quede fuera del viewport inicial de 12×12;
  - sea suelo.
  Desempata de forma determinista (mayor distancia, luego y, luego x).
- Viewport inicial: cámara de 12×12 centrada en el jugador y limitada al mapa.
  En tiles, el origen es `clamp(player.x - 6, 0, width - 12)` y
  `clamp(player.y - 6, 0, height - 12)` (equivalente al redondeo de píxeles del
  host con tiles de 32 px). El enemigo debe quedar fuera de
  `[originX, originX + 11] × [originY, originY + 11]`.
- `spawns.distance` es la distancia BFS real. Si no se puede cumplir ≥12 o fuera
  de viewport con la semilla de referencia, reintenta la generación; no inventes
  la distancia ni muevas al enemigo a una sala que no sea la más lejana. Como
  último recurso, devuelve un aviso honesto.

# Integración con el motor y tests existentes

- Añade `map?: GeneratedMap` a `GameState` y exporta los tipos nuevos desde
  `src/game/index.ts`.
- `createInitialState` usa el generador y las opciones; el estado inicial ya no es
  una sala fija de 20×20.
- **No modifiques `src/host/`, `index.html` ni `public/`.** Los tests de host que
  dependen de `createInitialState()` para probar el render/HUD pueden adaptarse
  para usar `makeState()` (que sigue creando una sala fija de 20×20) y así seguir
  probando el render aislado. Es un cambio solo de tests, no de producción.
- `tests/unit/game/engine.test.ts` debe adaptarse al mapa generado:
  - 32×32, borde de muro, `state.map` presente, spawns en `map.spawns`.
  - serialización JSON del estado y del mapa;
  - determinismo de dos `createInitialState()`;
  - `Restart` sigue volviendo al estado inicial.
  No borres cobertura: conserva las comprobaciones de HP/MP/acción/fase/turno.
- `tests/unit/host/renderer.test.ts`, `hud.test.ts` y `session.test.ts`: si fallan
  por el cambio de mapa, usa `makeState()` o un estado fijo para las pruebas de
  host, sin tocar el código de host. No debilites las aserciones de render/HUD.
- Añade tests nuevos en `tests/unit/game/`:
  - `map.test.ts` o `bsp.test.ts`: opciones, determinismo, roles, no solape,
    separación, conectividad, forma de pasillos, bucles, callejones, apariciones,
    serialización, `doors` vacío, `corridors` width 1/doorEligible, rendimiento.
  - `map-integration.test.ts` o ampliación de `engine.test.ts`:
    `createInitialState` con BSP y con un stub de `MapGenerator`; el stub recibe
    la semilla/opciones y el motor funciona con su mapa (movimiento, ataque,
    fin de turno, reinicio).
- Tests de propiedades negativas:
  - una semilla distinta produce un mapa distinto;
  - un mapa con solape o sin conectividad es detectado por el validador (si
    exportas validadores, pruébalos con un mapa fabricado a mano);
  - `doors` debe estar vacío y ningún corredor debe ser `wide`.
- Test de rendimiento: calienta una vez, mide 3 generaciones de la semilla de
  referencia y comprueba que la mediana (y preferiblemente el máximo) es <100 ms.
  Registra los valores reales en el artefacto. No uses `performance.now()` dentro
  del generador.

# Conflicto conocido: `window.__game`

El criterio “`window.__game` expone seed, rooms, corridors, doors y spawns” no se
puede cumplir sin tocar `src/host/debug.ts`, y esta tarea prohíbe tocar
`src/host/`. Además, TASK-0010 tiene ese mismo criterio de forma explícita
(“además de los datos actuales”). Decisión del lead: en TASK-0008 se garantiza el
**modelo serializable** (`GameState.map` con seed/rooms/corridors/doors/spawns y
round-trip JSON); la exposición en `window.__game` se verificará en TASK-0010.
Documéntalo como limitación/deferral en el informe. No modifiques el host para
forzarlo.

# Archivos previstos

```text
src/game/map.ts              # tipos, opciones, PRNG y utilidades públicas
src/game/bsp.ts              # BspMapGenerator (o todo en map.ts si queda claro)
src/game/types.ts            # GameState.map opcional
src/game/engine.ts           # createInitialState con generador/opciones
src/game/index.ts            # exports
tests/unit/game/*.test.ts    # tests nuevos y adaptados
tests/unit/host/*.test.ts    # solo adaptación si hace falta para verify
artifacts/TASK-0008/attempt-1/
```

No toques:

```text
src/host/**
index.html
public/**
docs/**
experiments/**/experiment.md
package.json / pnpm-lock.yaml
REQ-003 / ADR-007 / EXP-001
```

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios, integración, determinismo y rendimiento |
| `pnpm run verify` | 180 s | Docs, config, tests, typecheck y build |
| `pnpm exec tsc --noEmit` | 120 s | Tipos de src y tests |
| `pnpm run build` | 120 s | Build con el generador nuevo |

- Usa `pnpm`, no `npm` ni `npx`.
- Todo comando en primer plano con timeout explícito (el tool de shell ya tiene
  120 s por defecto; indícalo en el informe).
- **No ejecutes `pnpm run test:e2e`**: TASK-0008 es solo motor; el E2E y el QA
  visual son TASK-0010/TASK-0011 y dependen del host actualizado. Si lo ejecutas y
  falla por el host fijo de 20×20, no lo arregles aquí; documéntalo.
- No dejes servidores ni procesos en background.

# Artefactos y respuesta

Crea:

```text
artifacts/TASK-0008/attempt-1/
  report.md
  test-output.txt
  map-seed-279837264.json      # GeneratedMap completo serializado
  map-seed-279837264.txt       # representación ASCII legible (opcional pero útil)
  performance.txt              # mediciones reales de generación
```

El informe debe incluir frontmatter OKF (`type: Task Report`, `task: TASK-0008`,
`attempt: 1`, `report_status`, `generated`), resumen, cambios, commit SHA,
comandos/resultados, tabla de criterios, snapshot de la semilla de referencia
(salas, roles, bucles, conectividad, distancia, pasillos, esquinas, callejones),
mediciones de rendimiento, desviaciones y limitaciones. **No marques la tarea como
`done` ni fusiones**: eso lo hace el lead.

Devuelve al lead un resumen breve con: estado, commit SHA, tests ejecutados y
resultado, artefactos, rendimiento medido y limitaciones/deferrals. Si no puedes
cumplir algún criterio, para y devuelve un bloqueo con evidencia en lugar de
falsear datos.
