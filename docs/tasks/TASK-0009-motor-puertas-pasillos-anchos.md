---
type: Task
id: TASK-0009
title: "Motor: huecos de puerta y pasillos anchos de 2 tiles"
description: Añade huecos de puerta en accesos estrechos y 1-2 pasillos anchos de 2 tiles por mapa, sin puertas y con al menos 4 tiles de longitud.
status: draft
task_status: ready
task_type: feature
requirement: REQ-003
requirement_ids: [R-003, R-004, R-005, R-006, R-012, R-013, T-004, T-012, T-013]
depends_on: [TASK-0008]
unlocks: [TASK-0010]
created_at: 2026-11-07T22:17:27Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0009/
priority: P1
risk: high
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:17:27Z }
verified:
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

- [ ] Cada sala tiene entre 1 y 3 huecos de puerta; al menos uno está en un
      acceso estrecho. Ningún hueco está en un pasillo ancho.
- [ ] Cada hueco tiene muro a ambos lados perpendiculares al paso, no está en
      una esquina, no se repite y su orientación coincide con el eje del muro.
- [ ] Hay 1-2 pasillos anchos de 2 tiles y al menos 4 tiles de longitud; pueden
      ser rectos o con esquinas y están etiquetados `width: 2` y
      `doorEligible: false`.
- [ ] El ensanchado no rompe salas ni deja suelo inaccesible; la conectividad
      sigue al 100 % y cada sala conserva un hueco estrecho.
- [ ] Los pasillos estrechos siguen cumpliendo R-003 y los 1-3 bucles de R-004.
- [ ] La misma semilla produce los mismos huecos y pasillos anchos; semillas
      distintas varían el número (1 o 2) y la posición.
- [ ] El estado serializa `corridors` con anchura y `doors` con orientación.
- [ ] La generación de 32×32 sigue por debajo de 100 ms en CI.
- [ ] No se modifican el host, el render, el HUD ni el encuadre. No se añaden
      puertas físicas, barricadas ni pasillos de 3 tiles.
- [ ] `pnpm run verify` pasa y no se debilitan tests existentes.

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

- [ ] Informe en `artifacts/TASK-0009/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0009/attempt-1/test-output.txt`
- [ ] Snapshot con puertas y pasillos anchos de la semilla `279837264`
- [ ] Medición de rendimiento
- [ ] Commit SHA en la rama `task/TASK-0009`

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
