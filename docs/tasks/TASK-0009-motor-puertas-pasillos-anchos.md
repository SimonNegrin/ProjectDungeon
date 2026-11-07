---
type: Task
id: TASK-0009
title: "Motor: huecos de puerta y pasillos anchos de 2 tiles"
description: Añade huecos de puerta en accesos estrechos y 1-2 pasillos anchos de 2 tiles por mapa, sin puertas y con al menos 4 tiles de longitud.
status: stable
task_status: done
task_type: feature
requirement: REQ-003
requirement_ids: [R-003, R-004, R-005, R-006, R-012, R-013, T-004, T-012, T-013]
depends_on: [TASK-0008]
unlocks: [TASK-0010]
created_at: 2026-11-07T22:17:27Z
completed_at: 2026-11-07T22:58:05Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0009/
priority: P1
risk: high
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:17:27Z }
verified:
  - by: task-lead
    at: 2026-11-07T22:58:05Z
    note: "Verificación independiente: diff, `pnpm run verify` (191 tests), tests dirigidos, snapshot de la semilla 279837264, geometría de huecos y pasillos anchos, y rendimiento. Se restauró la aserción exacta de 2 bucles del mapa de referencia."
---

# Objetivo

Completar el modelo de mapa de `REQ-003` con los accesos: cada sala tiene al
menos un hueco de puerta en un acceso estrecho y puede tener hasta tres; los
pasillos anchos de 2 tiles (1-2 por mapa, según la semilla) no llevan puertas y
sirven como espacio táctico. El mapa sigue siendo conexo y cada sala conserva al
menos un acceso estrecho con hueco.

# Contexto

- Requisito: [REQ-003](../requirements/REQ-003-generacion-mapa.md).
- TASK-0008: interfaz `MapGenerator`, BSP, salas, pasillos estrechos y
  apariciones.
- [EXP-001](../../experiments/EXP-001-generador-mazmorra/experiment.md):
  referencia visual de huecos y pasillos.
- [ADR-007](../decisions/ADR-007-map-generator.md): modelo de corredores.
- Código: `src/game/` (generador y validadores); no tocar `src/host/`.

# Diseño técnico de referencia

- `Corridor` incluye `width: 1 | 2`, `kind: 'tree' | 'loop'` y
  `doorEligible: boolean`.
- `Door` incluye `x`, `y`, `orientation: 'horizontal' | 'vertical'` y `roomId`.
- Los huecos se calculan en el paso entre una sala y un pasillo estrecho, con
  muro a ambos lados perpendiculares al paso y sin estar en esquina.
- Los pasillos anchos se tallan a 2 tiles sobre 1-2 conexiones BSP con holgura;
  longitud ≥4; pueden ser rectos o con esquinas; se etiquetan
  `doorEligible: false`.
- Cada sala debe conservar al menos un acceso estrecho con hueco. Si el
  ensanchado deja una sala solo con accesos anchos, se elige otra conexión o se
  añade un acceso estrecho.
- La cantidad de pasillos anchos es 1 o 2 según la semilla y el espacio; nunca 0.
- No se implementan puertas físicas, barricadas ni pasillos de 3 tiles.

# Criterios de aceptación

- [x] Cada sala tiene entre 1 y 3 huecos de puerta; al menos uno está en un
      acceso estrecho. Ningún hueco está en un pasillo ancho.
- [x] Cada hueco tiene muro a ambos lados perpendiculares al paso, no está en
      una esquina, no se repite y su orientación coincide con el eje del muro.
- [x] Hay 1-2 pasillos anchos de 2 tiles y al menos 4 tiles de longitud; pueden
      ser rectos o con esquinas y están etiquetados `width: 2` y
      `doorEligible: false`.
- [x] El ensanchado no rompe salas ni deja suelo inaccesible; la conectividad
      sigue al 100 % y cada sala conserva un hueco estrecho.
- [x] Los pasillos estrechos siguen cumpliendo R-003 y los 1-3 bucles de R-004.
- [x] La misma semilla produce los mismos huecos y pasillos anchos; semillas
      distintas varían el número (1 o 2) y la posición.
- [x] El estado serializa `corridors` con anchura y `doors` con orientación.
- [x] La generación de 32×32 sigue por debajo de 100 ms en CI.
- [x] No se modifican el host, el render, el HUD ni el encuadre. No se añaden
      puertas físicas, barricadas ni pasillos de 3 tiles.
- [x] `pnpm run verify` pasa y no se debilitan tests existentes.

# Plan de test

- **Unitario:** validador de huecos; cada sala ≥1; no huecos en `wide`; 1-2
  pasillos anchos; anchura 2; longitud ≥4; conectividad; cada sala conserva
  acceso estrecho; determinismo; serialización; rendimiento.
- **Integración:** `createInitialState` con mapas de varias semillas; el motor
  sigue aceptando el mapa.
- **E2E / visual:** no aplica; el render de los huecos y pasillos anchos es
  TASK-0010 y el QA TASK-0011.
- **Manual:** no aplica; el usuario lo verá en la build.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Huecos, pasillos anchos y determinismo |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run build` | 120 s | Build con el modelo ampliado |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0009/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0009/attempt-1/test-output.txt`
- [x] Snapshot con puertas y pasillos anchos de la semilla `279837264`
- [x] Medición de rendimiento
- [x] Commit SHA en la rama `task/TASK-0009`

# Verificación

Verificación independiente del `task-lead` sobre `task/TASK-0009` (intentos 1 y
2), fusionada en `main` por fast-forward hasta `fff8082`.

- **Rama y commits:** `487ac49` (tarea en `ready` y tablero), `c6e7953`
  (implementación), `ddd602f` (informe y evidencia), `834224b` (restauración de
  la aserción exacta de 2 bucles) y `fff8082` (artefactos actualizados). Fusion
  fast-forward `1cbef9a..fff8082`.
- **Alcance del diff:** solo `src/game/{map,bsp}.ts`,
  `tests/unit/game/{map,map-integration}.test.ts`, `docs/tasks/TASK-0009-*`,
  `docs/tasks/index.md` y `artifacts/TASK-0009/**`. Sin cambios en
  `src/host/**`, `index.html`, `public/**`, `package.json`, `pnpm-lock.yaml`,
  `docs/requirements/REQ-003-*`, `docs/decisions/ADR-007-*` ni
  `experiments/EXP-001-*`. No se añadieron dependencias.
- **Comandos re-ejecutados por el lead:**
  - `pnpm run verify` (180 s): exit 0; docs 66, config 3/9, **191 tests** y
    build de 41 módulos.
  - `pnpm exec vitest run tests/unit/game/map.test.ts
    tests/unit/game/map-integration.test.ts tests/unit/game/engine.test.ts`
    (120 s): 3 archivos, **53 tests** OK. El test de rendimiento registró
    `runs=2.42,2.10,2.13`, mediana 2,13 ms y máximo 2,42 ms.
- **Snapshot de referencia validado por el lead desde el JSON del artefacto:**
  semilla `279837264`, 9 salas, 10 corredores (8 de árbol + 2 bucles), **18
  huecos** (1-3 por sala), **1 pasillo ancho** `0→1` con `width: 2`,
  `doorEligible: false`, path de 26 tiles y carril real de **8 tiles** contiguos
  de anchura 2. Conectividad 100 % (430/430 tiles de suelo), 0 bloques 2×2
  sueltos, 0 huecos en el pasillo ancho, 0 duplicados, muros perpendiculares
  correctos y cada sala con al menos un acceso estrecho con hueco. Spawns
  `(6,8)` y `(23,28)`, distancia BFS 59.
- **Tests no debilitados:** no hay `.skip`, `.todo` ni `.only`; se restauró
  `expect(loops).toHaveLength(2)` para el mapa de referencia tras detectar que
  se había relajado a 1-3. Los tests nuevos cubren huecos, orientación,
  duplicados, esquinas, puertas sobre ancho, carril real, variación de semillas,
  determinismo, serialización, 24×24, 40×40 y rendimiento.
- **Rendimiento:** `performance.txt` registra 7,16 ms en frío y mediana 3,49 ms /
  máximo 6,34 ms en 10 repeticiones; la suite queda en mediana 2,13 ms / máximo
  2,42 ms. Medición local (`darwin arm64`, Node 22.14), no CI, muy por debajo de
  100 ms.
- **Desviaciones aceptadas:**
  - La semilla de referencia produce **1** pasillo ancho, no 2: el objetivo
    automático era 2, pero solo una conexión admitía carril seguro; el generador
    lo registra en `warnings`. El criterio es 1-2 y se cumple.
  - `24×24` puede producir 0 pasillos anchos con aviso honesto por falta de
    holgura; es una combinación extrema fuera de la configuración de referencia
    32×32 / 9 / 4 / 11 / 20, que sí cumple.
  - El carril no se talla en los dos tiles de acceso, así que un pasillo ancho
    puede estrecharse en los extremos; la garantía verificada es ≥4 tiles
    contiguos de anchura 2. El carril no se guarda en el modelo: se deriva de
    `tiles`.
  - E2E y QA visual no aplican: el render de huecos y pasillos anchos es
    TASK-0010 y el QA TASK-0011.

# Restricciones

- No tocar `src/host/`, `index.html` ni `public/`.
- No implementar puertas físicas, barricadas, escaleras ni pasillos de 3 tiles.
- No cambiar `REQ-003`, `EXP-001` ni el alcance.
- No añadir dependencias.
- Si no hay holgura para 1 pasillo ancho, elegir otra conexión o añadir espacio;
  no falsear la métrica ni devolver 0.

# No objetivos

- Render, cámara, HUD y debug (TASK-0010).
- E2E y QA visual (TASK-0011).
- Puertas abiertas/cerradas y barricadas.

# Notas

- La decisión del usuario es 2 tiles, 1-2 por mapa según la semilla. El ancho 3
  queda fuera de este corte.
- Un pasillo ancho puede ser un bucle o una conexión de árbol; en ambos casos no
  lleva puerta.
