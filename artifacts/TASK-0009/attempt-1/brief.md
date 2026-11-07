---
type: Task Brief
title: "Brief — TASK-0009: huecos de puerta y pasillos anchos de 2 tiles"
description: Completar GeneratedMap con puertas en accesos estrechos y 1-2 pasillos anchos de 2 tiles por mapa, sin puertas, con longitud ≥4, conectividad total y tests.
task: TASK-0009
attempt: 1
status: stable
branch: task/TASK-0009
created_at: 2026-11-07T23:05:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:05:00Z }
---

# Objetivo

Completar el modelo de mapa de `REQ-003` v2 sobre el generador BSP de
`TASK-0008`:

- `doors` deja de estar vacío: cada sala tiene 1-3 huecos de puerta en accesos
  estrechos, con al menos uno por sala.
- `corridors` admite `width: 1 | 2`; hay 1-2 pasillos anchos de 2 tiles por
  mapa (según la semilla), con al menos 4 tiles de longitud, rectos o con
  esquinas, etiquetados `doorEligible: false` y sin huecos.
- El ensanchado no rompe salas, no deja suelo inaccesible y cada sala conserva
  al menos un acceso estrecho con hueco.
- Determinismo, serialización, conectividad 100 %, rendimiento <100 ms y tests
  unitarios/integración. No se debilitan tests existentes.

Esta tarea **no** implementa puertas físicas, barricadas, escaleras ni pasillos
de 3 tiles y **no** toca `src/host/`, `index.html` ni `public/`.

# Contexto obligatorio

- Tarea: `docs/tasks/TASK-0009-motor-puertas-pasillos-anchos.md`.
- Requisito aprobado: `docs/requirements/REQ-003-generacion-mapa.md` (v2,
  `stable`), en especial R-003, R-005, R-012, R-013, T-004, T-012 y T-013.
- Interfaz/modelo: `docs/decisions/ADR-007-map-generator.md`.
- Implementación de partida: `src/game/map.ts` (modelo, opciones, PRNG,
  validadores) y `src/game/bsp.ts` (`BspMapGenerator`, slots, conexiones,
  bucles, apariciones).
- Informe previo: `artifacts/TASK-0008/attempt-1/report.md`.
- Prototipo visual: `experiments/EXP-001-generador-mazmorra/src/dungeon.ts`.
  **No se importa desde producción.** Sirve de referencia para slots, huecos y
  validaciones; se puede portar y optimizar, no copiar literalmente.
- Decisión del usuario: pasillos anchos de **2 tiles**, **1-2 por mapa según la
  semilla**, sin puertas, al menos 4 tiles de longitud. El ancho 3 queda fuera.

# Estado de partida y Definition of Ready

- `main` en `1cbef9a`; rama `task/TASK-0009` creada con el cambio documental que
  marca la tarea como `ready`.
- `TASK-0008` está `done` y su implementación pasa `pnpm run verify`.
- El generador actual produce 9 salas (2 grandes, 3 pequeñas, 4 medianas), 10
  corredores de 1 tile (8 de árbol + 2 bucles), conectividad 100 %, `doors: []`
  y todos los corredores `width: 1`, `doorEligible: true`.
- Los slots de puerta ya existen internamente (`DoorSlot`, `usedSlots`,
  `slotCache`): son celdas de muro justo fuera de la sala, con la sala detrás,
  muro a ambos lados perpendiculares y sin tocar otra sala. Reutilízalos; no
  inventes otra geometría de acceso.
- Los tests actuales que afirman “sin puertas / todos los corredores de 1 tile”
  deben **actualizarse** a la nueva aceptación (no borrarse ni relajarse sin
  cubrir el criterio nuevo).

# Decisiones técnicas que debe respetar el runner

## Modelo y opciones

- `Corridor.width` pasa a `1 | 2`.
- `Door` mantiene `x`, `y`, `orientation: 'horizontal' | 'vertical'` y `roomId`.
- `GeneratedMap.doors` se rellena y sigue siendo JSON-safe (arrays de objetos
  planos; sin `Set`, `Map`, `Uint8Array` ni clases en la salida).
- `MapOptions.wideCorridorCount` / `wideCorridorWidth` dejan de ser reservados:
  - `wideCorridorCount`: 0-2. **0 significa automático**: el generador elige 1 o
    2 de forma determinista a partir de la semilla (no uses `Math.random`).
    1 o 2 fuerzan ese objetivo máximo.
  - `wideCorridorWidth`: se normaliza a 2 con aviso si llega otro valor. El
    ancho 3 queda fuera de este corte; no lo implementes.
  - `DEFAULT_MAP_OPTIONS` puede conservar `wideCorridorCount: 0` (auto) y
    `wideCorridorWidth: 2`. No hace falta cambiar la forma del objeto de
    opciones resueltas.
- El número real de pasillos anchos se cuenta en `corridors`, no en `options`.
  No falsees `options` para que parezca que se cumplió.
- Elige el objetivo automático con un PRNG separado (por ejemplo
  `mulberry32(seed ^ 0x9e3779b9)`) o con paridad de semilla, para no alterar sin
  necesidad la secuencia aleatoria que coloca salas y corredores. La misma
  semilla y opciones deben producir exactamente el mismo mapa.

## Huecos de puerta

- Un hueco es el tile de suelo del extremo de un corredor **estrecho**
  (`width === 1`) que entra en una sala; en el modelo actual es `path[0]` y
  `path[path.length - 1]`.
- Construye `doors` **después** de decidir qué corredores son anchos, a partir
  solo de corredores estrechos. Un corredor ancho no genera hueco en ninguno de
  sus dos extremos.
- Deriva la orientación del eje del muro:
  - salida hacia el norte/sur (paso vertical) → muro horizontal →
    `orientation: 'horizontal'`;
  - salida hacia el este/oeste (paso horizontal) → muro vertical →
    `orientation: 'vertical'`.
  Esto coincide con `DoorSlot.orientation` de `TASK-0008` y con
  `isDoorValid` de `EXP-001`.
- Deduplica por `(x, y)`; ordena de forma determinista
  (`roomId`, `y`, `x`).
- Cada sala debe quedar con 1-3 huecos. Como cada sala tiene como máximo 3
  slots usados, el límite superior sale solo; garantiza el mínimo con la regla
  de ensanchado de abajo.
- No pongas huecos en esquinas: ambos lados perpendiculares al paso deben ser
  muro. No pongas huecos en celdas que toquen otra sala distinta de `roomId`.

## Pasillos anchos

### Selección

- Trabaja sobre las conexiones ya generadas (árbol y bucles). No cambies la
  topología ni añadas conexiones nuevas salvo el fallback indicado.
- Mantén un contador de conexiones estrechas por sala. Un corredor solo puede
  ensancharse si **ambas** salas conservan al menos otra conexión estrecha
  después del ensanchado (`narrowDegree[room] > 1`). Así cada sala conserva un
  acceso estrecho con hueco.
- Con 1-2 pasillos anchos, evita elegir dos conexiones que dejen a una misma
  sala sin acceso estrecho.
- Prefiere conexiones con holgura geométrica y con un tramo recto de al menos 4
  tiles (para que el ensanchado sea verificable). No ensanches una conexión si
  el carril lateral no cabe.
- Elige 1 o 2 según la semilla/objetivo y varía la posición con un desempate
  determinista. Semillas distintas deben poder producir 1 y 2, y posiciones
  distintas.
- Si el objetivo es 2 pero solo hay una conexión segura, produce 1 y avisa. Si
  no hay ninguna conexión segura, reintenta la generación (el generador ya
  tiene `MAX_GENERATION_ATTEMPTS`); como último recurso devuelve el mejor mapa
  con aviso honesto. **Con la configuración de referencia 9/4/11/20 y la semilla
  `279837264` debe haber 1-2 pasillos anchos; 0 no es aceptable.**
- No ensanches la misma conexión dos veces.

### Tallado a 2 tiles

- El `path` del corredor sigue siendo la línea central ortogonal (cada paso
  Manhattan 1). El carril lateral adicional es geometría derivada de los tiles;
  no lo metas en `path`.
- Para cada tramo recto del path, elige un lado perpendicular (norte/sur para
  tramos horizontales; este/oeste para verticales) y talla el tile adyacente a
  cada celda del tramo. Mantén el mismo lado dentro del tramo para que haya dos
  filas/columnas transitables adyacentes durante al menos 4 tiles.
- No talles el tile del extremo que hace de hueco de acceso a la sala: deja el
  acceso de 1 tile con muro a ambos lados. Así el corredor ancho no genera
  hueco y no rompe la geometría del acceso. El ensanchado empieza en la segunda
  celda del path. El resultado puede tener un pequeño estrechamiento en los
  extremos; es aceptable siempre que haya ≥4 tiles de anchura 2.
- Un tile de carril solo es válido si:
  - está dentro del área interior (`1..width-2`, `1..height-2`);
  - no es celda de sala;
  - no es ortogonalmente adyacente a ninguna celda de sala (evita abrir un
    agujero nuevo en un muro);
  - no está reservado por otro slot;
  - o es pared, o pertenece al propio path; nunca es suelo de otro corredor
    (evita uniones no previstas);
  - no crea suelo inaccesible: cada tile tallado comparte arista con una celda
    del path, así que queda conectado.
- Si un lado no cabe, prueba el otro. Si ninguno cabe, descarta esa conexión y
  elige otra.
- Tras tallar, `corridor.width = 2`, `corridor.doorEligible = false`, conserva
  `kind` (`tree`/`loop`) y `path`.
- No talles 2×2 fuera del footprint declarado de un corredor ancho; el
  validador debe distinguir un ensanchamiento legítimo de un bloque suelto.

### Fallback para no devolver 0

- Si tras elegir todas las conexiones seguras no hay ninguna, prueba, en este
  orden:
  1. reintentar la generación (ya existe el bucle de intentos);
  2. si el mapa tiene margen y bucles < 3, añadir una conexión estrecha nueva
     entre dos salas con grado ≥2 y ensancharla;
  3. devolver el mejor mapa con un aviso que explique por qué no se pudo.
- No falsees `width` ni la longitud. No devuelvas un corredor `width: 2` sin
  carril real.

## Validadores

Actualiza `src/game/map.ts` para que la validación estructural sea la de esta
tarea. Como mínimo:

- `corridorEndpoints` / validación de corredores:
  - `width` es 1 o 2; `kind` es `tree` o `loop`; `path` es ortogonal.
  - Corredor estrecho: `doorEligible: true` y extremos con acceso válido de 1
    tile (muro a ambos lados, sala detrás, sin tocar otra sala).
  - Corredor ancho: `doorEligible: false`, extremos con acceso válido, todos los
    tiles del path son suelo, longitud ≥4 y existe un tramo de al menos 4 tiles
    con dos columnas/filas transitables adyacentes (geometría real sobre
    `tiles`, no solo el campo `width`).
- `doors`:
  - suelo, sala existente, 1-3 por sala, sin duplicados;
  - orientación coherente con el eje del muro;
  - muro en los dos lados perpendiculares (no esquina);
  - el hueco pertenece a un extremo de corredor estrecho; ningún hueco está en
    un corredor ancho.
- Pasillos anchos: 1-2 por mapa con ≥3 salas (si una combinación extrema no lo
  permite, el mapa debe llevar un aviso honesto; la referencia debe cumplirlo).
- Cada sala tiene al menos un acceso estrecho con hueco.
- `countWideFloor` (o equivalente) debe seguir detectando bloques 2×2 sueltos
  fuera de salas, pero **no** debe contar los 2×2 que forman parte del footprint
  de un corredor ancho declarado. Un 2×2 fabricado a mano sin corredor ancho
  sigue siendo un error.
- Mantén las validaciones existentes de salas, roles, separación, bucles,
  callejones, bordes, apariciones, conectividad 100 % y JSON-safe.
- No debilites `validateGeneratedMap`: añade comprobaciones, no quites las que
  siguen siendo válidas.

# Plan de tests exigido

Añade/actualiza tests en `tests/unit/game/`:

- **Huecos**
  - cada sala tiene 1-3 `doors` y al menos una;
  - no hay huecos en corredores `width: 2`;
  - cada hueco está sobre suelo, tiene muro en ambos lados perpendiculares, no
    está en esquina, no se repite y su orientación coincide con el eje;
  - un hueco fabricado mal (sin muro, en esquina, duplicado o sobre ancho) es
    detectado por el validador.
- **Pasillos anchos**
  - hay 1-2 corredores `width: 2` con la semilla de referencia;
  - longitud ≥4 y dos tiles adyacentes transitables durante ≥4 tiles;
  - pueden ser rectos o con esquinas; `doorEligible: false`;
  - no hay puertas en ellos;
  - el ensanchado no toca salas ni deja suelo inaccesible (conectividad 100 %);
  - cada sala conserva al menos un acceso estrecho con hueco;
  - con varias semillas el número es 1-2 y la posición varía; la misma semilla
    reproduce exactamente `doors` y `corridors`.
- **Regresión**
  - los tests de TASK-0008 de estructura, roles, separación, bucles,
    callejones, spawns, serialización, 24×24/40×40 y rendimiento siguen
    pasando, actualizados al modelo nuevo;
  - actualiza las aserciones “sin puertas / todos width 1” para que cubran el
    criterio nuevo en lugar de eliminarlas;
  - no borres ni debilites HP/MP/acción/fase/turno, movimiento, ataque ni
    reinicio en `engine.test.ts` / `map-integration.test.ts`.
- **Integración**
  - `createInitialState` con varias semillas produce mapas aceptados por el
    validador;
  - el motor sigue moviendo, atacando, terminando turno y serializando con el
    mapa nuevo.
- **Rendimiento**
  - calienta una vez y mide 3 generaciones de la semilla de referencia; mediana
    y máximo <100 ms; registra los valores reales (no los maquilles).

# Archivos previstos

```text
src/game/map.ts                 # modelo, opciones, validadores
src/game/bsp.ts                 # selección/ensanchado y construcción de doors
src/game/index.ts               # exports si hace falta
tests/unit/game/map.test.ts     # actualización + tests nuevos
tests/unit/game/map-integration.test.ts
tests/unit/game/engine.test.ts  # solo si el cambio de modelo lo exige
artifacts/TASK-0009/attempt-1/
```

No toques:

```text
src/host/**
index.html
public/**
package.json / pnpm-lock.yaml
docs/requirements/REQ-003-*
docs/decisions/ADR-007-*
experiments/EXP-001-*/experiment.md
```

No añadas dependencias. No implementes puertas físicas, barricadas, escaleras
ni pasillos de 3 tiles. No cambies el alcance ni los criterios.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios, integración, determinismo y rendimiento |
| `pnpm run verify` | 180 s | Docs, config, tests, typecheck y build |
| `pnpm run build` | 120 s | Build con el modelo ampliado |
| `pnpm exec tsc --noEmit` | 120 s | Tipos de `src` y tests (opcional si `verify` ya lo cubre) |

- Usa `pnpm`, no `npm` ni `npx`.
- Todo comando en primer plano con timeout explícito.
- **No ejecutes `pnpm run test:e2e`**: esta tarea es solo motor; el QA visual es
  TASK-0010/TASK-0011 y el host no se toca.
- No dejes servidores ni procesos en background.
- Si un comando agota el timeout, para, guarda evidencia y devuelve bloqueo; no
  lo repitas sin una hipótesis nueva.

# Artefactos y respuesta

Crea en `artifacts/TASK-0009/attempt-1/`:

```text
report.md
test-output.txt
verify-output.txt
map-seed-279837264.json      # GeneratedMap completo con doors y corridors
map-seed-279837264.txt       # representación ASCII legible con puertas y anchos
performance.txt              # mediciones reales
```

El snapshot de la semilla `279837264` debe incluir `doors` y los corredores
anchos. El informe debe incluir frontmatter OKF (`type: Task Report`,
`task: TASK-0009`, `attempt: 1`, `report_status`, `generated`), resumen,
cambios, commit SHA, comandos/resultados, tabla de criterios con evidencia,
métricas (número de puertas por sala, número de pasillos anchos, longitud,
recto/esquinas), snapshot, rendimiento, desviaciones y limitaciones.

**No marques la tarea como `done` ni fusiones**: eso lo hace el lead.

Devuelve al lead un resumen breve con: estado, commit SHA, tests ejecutados y
resultado, artefactos, métricas de puertas/pasillos anchos, rendimiento y
limitaciones. Si no puedes cumplir un criterio, para y devuelve un bloqueo con
evidencia en lugar de falsear datos.
