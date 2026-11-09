---
type: Task Brief Detail
title: "TASK-0042: detalle del brief del intento 1"
description: Desglose técnico de la v3 de EXP-004 para task-runner.
task: TASK-0042
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:32:59Z }
---

# Contrato y modelo

- Amplía `GeneratedMap` con `entrance` (`{ roomId, position }`) y `exit`
  (`{ roomId, kind, position, access, tile }`), amenazas/puntos calientes y
  marca de emboscado en `Enemy`. `kind` ∈ `door`, `stairs-down`, `stairs-up`.
- `spawns.player` sigue siendo alias de `party[0]`.
- `MapOptions` gana `hiddenEnemyChance` (0-1, 0,5) y `exitMode` (`door`,
  `stairs-down`, `stairs-up`, `random`); normaliza con avisos.
- Todo serializable con `JSON.parse(JSON.stringify(...))`.

# Salas

- Normales 4-6; caverna exactamente 3 (caverna + 2 anexos). Ningún mapa <3.
  Refuerza `buildCavern` y añade garantía/aviso si un anexo no cabe.
- La caverna debe medir ≥55 % del suelo de sala y conservar ≥4 muescas.

# Spawn

- Elige la sala más protegida por accesos; en empate evita la mayor si otra
  empatada admite 6 huecos. Desempate: mayor superficie libre y menor `id`.
- `party[0]` es el acceso (puerta más cercana al centro; si no, boca).
- El resto a Chebyshev ≤2 del acceso, priorizando ≥2 vecinos libres. Adyacencia
  de 8 direcciones con componentes ≤2; nunca 3 en línea/piña. Sin separación ≥2.
- Fallback radio 3 → sala completa con aviso; nunca rompe componentes ≤2.
- Mide `spawnIsLargest`, componentes y huecos.

# Enemigos

- Total `T = ceil(enemySurfaceFactor × N) + ceil(enemyPlayersFactor × P)`;
  reparto por área con mínimo 1 por sala no-spawn; spawn 0.
- Prefiere celdas interiores (4 vecinos ortogonales de suelo de la misma sala);
  borde solo si no hay interior compatible. Emboscados son la excepción.
- Punto caliente: suelo no-spawn con ≥3 vecinos ortogonales de muro o sin LOS a
  ningún acceso. Tirada determinista independiente por celda con
  `hiddenEnemyChance`; nunca añade fichas sobre `T`.
- Componentes de 8 direcciones ≤2; dos parejas distintas no se tocan. Sin dos
  fichas en el mismo tile. Sin visión inicial al spawn (con aviso si imposible).
- Tipos 60/20/20, cobardes lejos, brutos en salas grandes; `home` en su sala.
- Excluye salida, acceso de salida, puertas, spawn y armas (no hay armas en EXP).

# Salida

- Se elige tras puertas y spawn, antes de enemigos. BFS sobre el grafo de salas
  (conexiones reales). Distancia ≥2; preferir la más lejana; empate por menor
  `id` y mayor área.
- `door`: tile de muro del borde del mapa con suelo de la sala de salida dentro;
  `position` = muro, `access` = suelo interior adyacente; el borde sigue siendo
  muro y no se crea suelo. Si no hay sala de borde válida, `stairs-down` + aviso.
- `stairs-down`/`stairs-up`: tile de suelo de la sala; `access` = `position`.
- `random`: elige entre los tres de forma determinista por semilla.
- Reserva `position` y `access`: sin enemigos, huecos, puertas decorativas ni
  decoración. No altera conectividad.

# Render, métricas y UI

- Render: entrada, puerta de salida (estilo propio, sobre muro) o escalera sobre
  suelo; debug con tipo, sala, distancia, camino, puntos calientes y emboscados.
  Mantén la vista 13×13 y añade datasets para tests/capturas.
- UI: `hiddenEnemyChance` y `exitMode`; export JSON con salida, entrada,
  hotspots, emboscados, componentes, interiores/borde y avisos.
- Métricas: roles, spawn-mayor, componentes, N, P, factores, términos, T,
  reparto, interiores, borde, puntos calientes totales/elegibles/tiradas/
  ocupados/motivo, salida/tipo/acceso/distancia y avisos.

# Tests

- Añade/adapta tests unitarios por función y de mapa: determinismo, mínimo 3,
  caverna 3, spawn no-mayor y 6 huecos, componentes ≤2 (jugadores y enemigos),
  fórmula y factores a 0, reparto/tipos, interior vs borde, hotspots 0/1/0,5,
  sin visión, salida (distancia, puerta en muro, escalera en suelo, reserva,
  fallback, `random` estable).
- Los tests v2 de separación ≥2 se sustituyen por componentes ≤2 con
  justificación REQ-012 v3; no elimines cobertura de determinismo/conectividad.

# Capturas y evidencia

- `capture.mjs` propio en `attempt-1/`; servidor Vite en puerto fijo 4173 con
  comprobación de salud y cierre. 1280×720.
- A/B/C con ≥4 semillas; incluye al menos una caverna y un pasillo ancho; debug
  de spawn, hotspots, emboscados, entrada y salida; capturas de los 4 `exitMode`
  y de la vista 13×13. `decision-example.json` y `capture-log.txt` sin errores.
- Salidas completas de `docs:check`, `test`, `build` y `verify` en archivos.
- Actualiza `experiment.md` con observaciones v3, recuento real, fallback y
  enlaces a la evidencia; no cierres la decisión.
