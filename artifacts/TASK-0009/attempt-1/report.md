---
type: Task Report
title: "Informe — TASK-0009: huecos de puerta y pasillos anchos de 2 tiles"
description: Modelo Corridor.width 1|2, 1-3 huecos por sala en accesos estrechos, 1-2 pasillos anchos sin puertas con >=4 tiles de carril real, validadores, tests, determinismo y rendimiento.
task: TASK-0009
attempt: 1
report_status: completed
status: stable
result: implemented
branch: task/TASK-0009
commit: c6e7953e1c89eb0bbf551220755f143a5097b3c8
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:54:00Z }
---

# Resumen

Implementado el modelo de accesos de `REQ-003` v2 sobre el generador BSP de
`TASK-0008`:

- `Corridor.width` es `1 | 2`; los pasillos estrechos conservan
  `doorEligible: true` y los anchos quedan en `doorEligible: false`.
- `doors` se rellena con 1-3 huecos por sala, calculados solo desde extremos de
  corredores estrechos, sin duplicados y ordenados por `roomId`, `y`, `x`.
- El generador abre 1-2 pasillos anchos según semilla/objetivo. Cada uno tiene
  un carril lateral real de al menos 4 tiles, etiqueta `width: 2` y no genera
  puertas.
- El ensanchado solo actúa si ambas salas conservan al menos otra conexión
  estrecha, así que cada sala mantiene un acceso estrecho con hueco.
- La semilla de referencia `279837264` produce 9 salas, 10 corredores
  (8 árbol + 2 bucles), 18 huecos de puerta y **1 pasillo ancho** de 8 tiles de
  carril real (objetivo automático 2; solo había una conexión segura y se avisa).
- Conectividad 100 %, `countWideFloor = 0`, validación estructural OK y
  rendimiento muy por debajo de 100 ms.

No se ha tocado `src/host/`, `index.html`, `public/`, dependencias, requisitos,
ADR ni experimento. No se han implementado puertas físicas, barricadas,
escaleras ni ancho 3. El E2E no se ha ejecutado por indicación del brief.

# Cambios

Producción:

- `src/game/map.ts`
  - `Corridor.width: 1 | 2`.
  - `resolveMapOptions`: `wideCorridorCount` 0-2 (0 = automático) y
    `wideCorridorWidth` normalizado a 2 con aviso.
  - `straightPathRuns`: tramos rectos maximales de una ruta ortogonal.
  - `wideCorridorFootprint` y `wideCorridorStretch`: huella y carril real de un
    pasillo ancho derivados de los tiles.
  - `countWideFloor`: ya no cuenta los 2×2 que forman parte de la huella de un
    pasillo ancho declarado; un 2×2 suelto sigue siendo error.
  - Validación de corredores: anchura 1-2, `kind`, `doorEligible` coherente,
    extremos válidos, path sobre suelo, longitud ≥4 y carril real ≥4 para los
    anchos.
  - Validación de huecos: suelo, sala existente, 1-3 por sala, sin duplicados,
    orientación coherente, muro en los dos lados perpendiculares, sin esquina,
    solo en extremo de corredor estrecho y nunca en pasillo ancho.
  - Validación de cada sala con acceso estrecho y de 1-2 pasillos anchos cuando
    hay ≥3 salas, con aviso honesto admitido para combinaciones extremas.
- `src/game/bsp.ts`
  - PRNG separado `mulberry32(seed ^ 0x9e3779b9)` para elegir el objetivo
    automático 1 o 2 sin alterar la secuencia de salas y corredores.
  - Selección de conexiones seguras con contador de conexiones estrechas por
    sala (`narrowRemaining > 1`), puntuación por longitud de carril y desempate
    determinista.
  - Tallado de un carril lateral continuo por tramo recto: respeta el área
    interior, salas, adyacencia a salas, reservas de huecos, pared y reglas de
    no crear 2×2 ajenos; no talla los dos extremos del path.
  - Fallback: reintento del generador, conexión nueva + ensanchado si hay
    margen y bucles < 3, y aviso honesto como último recurso.
  - `buildDoors` deriva los huecos de los corredores estrechos, deduplica,
    orienta según el eje del muro y ordena; `buildMap` serializa `doors`.
  - `assessMap` exige 1-2 pasillos anchos cuando hay ≥3 salas.

Tests:

- `tests/unit/game/map.test.ts`: 37 tests. Actualizadas las aserciones de
  “sin puertas / todos width 1” para cubrir el criterio nuevo y añadidos tests
  de huecos, orientación, duplicados, esquinas, puertas sobre ancho, carril real,
  variación de semillas, posición, determinismo, serialización, 24×24, 40×40 y
  rendimiento.
- `tests/unit/game/map-integration.test.ts`: 8 tests. Añadido el caso de varias
  semillas con `createInitialState` y validación del mapa; se conservan
  movimiento, ataque, fin de turno, reinicio, stub y serialización.
- No se han borrado ni debilitado tests de HP/MP/acción/fase/turno, movimiento,
  ataque, reinicio, host ni cámara.

# Comandos y resultados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | 20 archivos, **191 tests OK** |
| `pnpm run verify` | 180 s | OK: docs:check, config:check, test y build |
| `pnpm run build` | 120 s | OK, 41 módulos, `dist/` generado |
| `pnpm run test:e2e` | — | **No ejecutado** por restricción del brief |

Salidas completas en `test-output.txt` y `verify-output.txt`.

# Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| Cada sala tiene 1-3 huecos; al menos uno en acceso estrecho | Cumple | `doors` de la semilla de referencia: 18 huecos, 1-3 por sala; test “cada sala tiene entre 1 y 3 huecos” |
| Ningún hueco en pasillo ancho | Cumple | Test que cruza `doors` con paths `width: 2`; validador `doorIssues` |
| Muro a ambos lados del hueco, sin esquina, sin duplicado, orientación correcta | Cumple | Tests positivos y negativos de orientación, muro lateral y duplicado; `doorIssues` |
| 1-2 pasillos anchos de 2 tiles y ≥4 tiles de longitud | Cumple (referencia: 1) | `map-seed-279837264.txt`; test de referencia; 16 semillas siempre 1-2 |
| Pasillos anchos rectos o con esquinas, `width: 2` y `doorEligible: false` | Cumple | Corredor `0→1`: 3 esquinas, tramo recto 20, carril real 8, `doorEligible: false` |
| El ensanchado no rompe salas ni deja suelo inaccesible | Cumple | Conectividad 100 %; validador OK; tests de conectividad y carril |
| Cada sala conserva al menos un acceso estrecho con hueco | Cumple | Tabla de salas: todas con ≥1 acceso estrecho y ≥1 hueco |
| Pasillos estrechos siguen cumpliendo R-003 y 1-3 bucles de R-004 | Cumple | 8 árbol + 2 bucles; validador de corredores y árbol |
| Misma semilla → mismos huecos y anchos | Cumple | Test de determinismo y comparación exacta de `doors`/`corridors` |
| Semillas distintas varían número (1/2) y posición | Cumple | Test con 16 semillas: conjunto de cuentas `[1, 2]` y >2 posiciones distintas |
| Estado serializa `corridors` con anchura y `doors` con orientación | Cumple | Round-trip JSON en tests; `map-seed-279837264.json` |
| Generación 32×32 <100 ms | Cumple | Mediana 3,49 ms; máximo 6,34 ms (10 repeticiones); ver `performance.txt` |
| No tocar host, render, HUD ni encuadre | Cumple | Diff solo en `src/game/` y tests |
| Sin puertas físicas, barricadas, escaleras ni ancho 3 | Cumple | Solo datos `doors`; `wideCorridorWidth` normalizado a 2 |
| `pnpm run verify` pasa sin debilitar tests | Cumple | 191 tests OK; `verify-output.txt` |

# Métricas de la semilla de referencia

Semilla `279837264`, 32×32, opciones de referencia 9/4/11/20, `wideCorridorCount: 0`
(automático), `wideCorridorWidth: 2`. Aviso real registrado:

```text
Pasillos anchos ajustados de 2 a 1: no había más conexiones con carril seguro.
```

## Huecos por sala

| Sala | Rol | Huecos | Accesos estrechos |
|---:|---|---:|---:|
| 0 | large | 1 | 1 |
| 1 | large | 1 | 1 |
| 2 | medium | 3 | 3 |
| 3 | small | 2 | 2 |
| 4 | small | 2 | 2 |
| 5 | medium | 3 | 3 |
| 6 | medium | 2 | 2 |
| 7 | medium | 2 | 2 |
| 8 | small | 2 | 2 |
| **Total** | | **18** | **18** |

## Pasillos anchos

| Desde → hasta | Tipo | Path (tiles) | Longitud | Esquinas | Tramo recto | Carril ancho real |
|---|---|---:|---:|---:|---:|---:|
| 0 → 1 | tree | 26 | 25 | 3 | 20 | 8 |

- Pasillos anchos: **1** (dentro de 1-2).
- `doorEligible: false`, `width: 2`.
- No hay ningún hueco dentro de su path.
- `countWideFloor` = 0: los 2×2 del carril son huella legítima del corredor.

## Resto de corredores

| Desde → hasta | Tipo | Ancho | Puerta | Path (tiles) | Esquinas | Tramo recto |
|---|---|---:|---|---:|---:|---:|
| 2 → 3 | tree | 1 | sí | 8 | 2 | 5 |
| 4 → 5 | tree | 1 | sí | 9 | 4 | 3 |
| 3 → 4 | tree | 1 | sí | 5 | 1 | 3 |
| 6 → 7 | tree | 1 | sí | 3 | 0 | 2 |
| 7 → 8 | tree | 1 | sí | 9 | 2 | 5 |
| 2 → 6 | tree | 1 | sí | 4 | 0 | 3 |
| 0 → 2 | tree | 1 | sí | 4 | 2 | 1 |
| 1 → 5 | loop | 1 | sí | 5 | 0 | 4 |
| 5 → 8 | loop | 1 | sí | 8 | 2 | 5 |

- Conectividad: 100 %.
- Spawns: jugador `(6,8)`, enemigo `(23,28)`, distancia BFS 59.
- Validación estructural: OK.

El snapshot completo (`tiles`, `rooms`, `corridors` con `width`, `doors`,
`spawns`, `warnings` y `options`) está en `map-seed-279837264.json`; la
representación ASCII con `D` para huecos y `W` para pasillos anchos está en
`map-seed-279837264.txt`.

# Rendimiento

Medición real fuera de la función pura, Node `v22.14.0`, `darwin arm64`:

| Métrica | Valor |
|---|---:|
| Arranque en frío (1.ª generación) | 7,16 ms |
| Calentamiento | 1 generación |
| Repeticiones medidas | 10 |
| Mínimo | 2,92 ms |
| Mediana | 3,49 ms |
| Máximo | 6,34 ms |
| Umbral | <100 ms |

La suite de rendimiento (calienta una vez y mide 3 generaciones) registró
`runs=2.09,2.30,2.15`, `median=2.15`, `max=2.30` ms. Valores completos en
`performance.txt`.

# Desviaciones y limitaciones

1. **Referencia con 1 pasillo ancho, no 2.** El objetivo automático para la
   semilla `279837264` es 2, pero solo una conexión admitía un carril seguro con
   las restricciones de la tarea. El generador produce 1 y registra un aviso
   honesto, que el brief permite explícitamente (“si el objetivo es 2 pero solo
   hay una conexión segura, produce 1 y avisa”). No se falsea `options` ni la
   anchura.
2. **24×24 produce 0 pasillos anchos con aviso.** Es un tamaño alternativo que
   ya existía en los tests de regresión. En esa combinación extrema el
   empaquetado de salas no deja ningún tramo con carril seguro y el generador
   devuelve el mejor mapa con aviso (`Pasillos anchos ajustados de 2 a 0…`); el
   validador lo acepta solo porque el aviso está presente. La configuración de
   referencia 32×32 sí cumple 1-2. No se ha cambiado el alcance para forzar
   pasillos anchos en 24×24.
3. **Estrechamientos en los extremos.** El carril no se talla en los dos tiles
   de acceso; por tanto un pasillo ancho puede tener 1 tile de ancho en sus
   extremos y ≥4 tiles de anchura 2 en el tramo central. Es el comportamiento
   permitido por el brief.
4. **El carril no se guarda en el modelo.** `path` sigue siendo la línea central
   y la anchura real se deriva de `tiles`; no se añade un campo nuevo al
   corredor para no ampliar el contrato.
5. **Sin E2E ni QA visual.** El brief lo prohíbe para esta tarea; el render de
   huecos y pasillos anchos corresponde a TASK-0010/TASK-0011. El host no se ha
   tocado.
6. **Rendimiento local, no CI.** Los valores son de esta máquina (`darwin
   arm64`, Node 22.14) y quedan muy por debajo de 100 ms.
7. **Sin puertas físicas, barricadas, escaleras ni ancho 3.** `doors` es solo
   información serializable; el ancho 3 se normaliza a 2 con aviso.

# Artefactos

```text
artifacts/TASK-0009/attempt-1/
  brief.md                    # brief del lead
  report.md                   # este informe
  test-output.txt             # pnpm run test
  verify-output.txt           # pnpm run verify + build standalone
  map-seed-279837264.json     # GeneratedMap completo con doors y width
  map-seed-279837264.txt      # representación ASCII con D y W
  performance.txt             # frío + 10 repeticiones + medición de la suite
```

# Preguntas para el lead

- Se acepta como válido que la semilla de referencia produzca 1 pasillo ancho
  (en vez de forzar 2 cambiando la geometría de salas). El brief permite 1-2;
  confirmar si el playtest prefiere empujar a 2 en esta semilla.
- Confirmar que 24×24 con 0 pasillos anchos y aviso honesto es aceptable para la
  regresión de tamaños alternativos.
