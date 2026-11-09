---
type: Task
id: TASK-0042
title: "EXP-004: distribución orgánica, emboscadas y salida de nivel"
description: Actualizar el experimento con mínimo de 3 salas, spawn que evita la mayor en empate, parejas adyacentes, enemigos interiores con emboscadas y salida como puerta o escalera.
status: stable
task_status: done
task_type: experiment
requirement: REQ-012
requirement_ids: [R-001, R-002, R-009, R-014, R-015, T-004, T-006, T-007, T-012, T-013, R-002, R-004, R-008, T-005, R-001, R-002, R-003, R-004, R-005, R-006, T-002, T-005, T-006]
depends_on: []
unlocks: []
created_at: 2026-11-09T12:31:27Z
completed_at: 2026-11-09T13:16:51Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0042/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:31:27Z }
verified:
  - by: task-lead
    at: 2026-11-09T13:16:51Z
    note: >-
      Intento 2 verificado en task/TASK-0042 (commits 272ddc8, aa6c51a,
      1803f79, 43d6a91 y 4a604d6; fusión b5f62fa). Diff completo revisado:
      solo EXP-004, manifest, tarea y artefactos; src/, tests/, index.html raíz
      y public/ intactos, sin dependencias nuevas. El intento 1 falló la
      componente global de enemigos en bsp/104 y bsp/371; el intento 2 la
      corrige con restricción global secuencial y reubicación determinista.
      Lead re-ejecutó `pnpm run verify` (620 tests, docs/config y build OK);
      barrido independiente de 1.200 mapas con 0 incidencias: 0 componentes >2,
      0 salas no-spawn vacías, T completo, spawn no-mayor en empate, salida a
      distancia ≥2 salvo fallback avisado, sin visión al spawn salvo aviso y
      reserva de salida respetada. 16.625 puntos calientes clasificados sin
      fallos y `hotspotRolls === hotspotsTotal`. 128 capturas 1280×720
      revisadas (A/B/C, 8 semillas, caverna, pasillo ancho, debug de spawn,
      hotspots, emboscados, entrada/salida, 4 exitMode, 13×13 y regresiones
      104/371). Desviaciones documentadas: 33/200 mapas BSP con cajas a gap 0
      (aviso no fatal) y recorte local de escaleras por no tocar producción.
      Decisión A/B/C y representación de salida abiertas al playtest.
---

# Objetivo

Actualizar `EXP-004` a la v3: mínimo de 3 salas, spawn que evita la sala mayor
en empate, parejas adyacentes, enemigos interiores con emboscadas en puntos
calientes y salida de nivel como puerta o escalera. No se modifica producción.

# Contexto

- Definición: [EXP-004](../../experiments/EXP-004-salas-irregulares/experiment.md).
- Implementación: `experiments/EXP-004-salas-irregulares/src/`.
- Evidencia previa: `artifacts/TASK-0041/attempt-2/`.
- Requisitos: [REQ-011 v3](../requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos),
  [REQ-012 v3](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos) y
  [REQ-013](../requirements/REQ-013-entrada-salida-exploracion.md#requisitos-creativos).
- La página y el manifest ya existen; se actualizan.

# Criterios de aceptación

- [ ] A/B/C cumplen el recuento de salas: normales 4-6, caverna exactamente 3 y
      ningún mapa por debajo de 3.
- [ ] La sala de spawn es la más protegida; en empate se evita la sala mayor si
      otra admite 6 huecos. `party[0]` es el acceso y el resto queda a
      Chebyshev ≤2, con adyacencia de 8 direcciones y componentes ≤2. Fallback
      a radio 3 y sala completa con aviso, sin romper el límite de 2.
- [ ] En el generador denso, los enemigos prefieren celdas interiores; el borde
      solo se usa si no hay interior compatible. Los puntos calientes son celdas
      con ≥3 muros ortogonales o sin LOS a ningún acceso, con tirada
      independiente `hiddenEnemyChance` (0-1, por defecto 0,5), sin superar `T`.
- [ ] Los enemigos pueden formar parejas, pero ninguna componente adyacente de
      8 direcciones supera 2. Se mantienen el reparto mínimo 1 por sala no-spawn,
      los tipos 60/20/20, la separación entre parejas y la ausencia de visión al
      spawn.
- [ ] Hay una entrada (`party[0]`) y una salida. La salida está en una sala
      no-spawn a distancia de grafo ≥2, preferiblemente la más lejana. `door` se
      dibuja sobre el muro del borde y no abre paso; `stairs-down`/`stairs-up`
      usan suelo; `random` es determinista. Si `door` no tiene sala de borde,
      cae a `stairs-down` con aviso.
- [ ] El tile y el acceso de la salida se reservan: no reciben enemigos, huecos,
      armas ni decoración.
- [ ] Controles nuevos: `hiddenEnemyChance` (0-1, 0,5) y `exitMode`
      (`door`, `stairs-down`, `stairs-up`, `random`).
- [ ] Métricas y JSON incluyen salas y roles, si el spawn es la mayor, componentes
      del grupo, `N`, `P`, factores, términos, `T`, reparto, interiores, borde,
      puntos calientes ocupados, salida, tipo, acceso, distancia y avisos.
- [ ] Tests unitarios de A/B/C: determinismo, conectividad, recuento y caverna,
      spawn (no-mayor, 6 huecos, parejas, fallback), enemigos (fórmula, factores
      a 0, reparto, tipos, interior, emboscadas 0/1, sin visión), salida
      (distancia, puerta en muro, escalera en suelo, reserva, fallback).
- [ ] Capturas 1280×720 de A/B/C con ≥4 semillas, caverna y pasillo ancho; debug
      de spawn, puntos calientes, emboscados, entrada y salida; `exitMode` y
      13×13.
- [ ] `pnpm run docs:check`, `pnpm run test` y `pnpm run build` pasan; sin
      dependencias nuevas y sin `Math.random`.
- [ ] `src/`, `tests/`, el `index.html` raíz y `public/` no cambian.

# Plan de test

- **Unitario:** `experiments/EXP-004-salas-irregulares/src/*.test.ts` para las
  tres variantes y los validadores de salas, spawn, enemigos y salida.
- **Integración:** la página importa el manifest y renderiza cada variante sin
  errores de consola.
- **E2E / visual:** abrir la página, cambiar semilla, variante, factores y
  `exitMode`; capturar mapa completo, debug, spawn, emboscadas, salida y 13×13.
- **Manual:** 8 semillas; comprobar que la sala de spawn no siempre es la mayor,
  que las parejas se leen bien, que las emboscadas varían y que la salida obliga
  a cruzar al menos una sala intermedia.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0042/attempt-2/report.md`.
- [x] Salidas de `test`, `docs:check` y `build` en `attempt-2/`.
- [x] Capturas en `attempt-2/screenshots/` y JSON de decisión de ejemplo.
- [x] Commits `272ddc8`, `aa6c51a`, `1803f79`, `43d6a91` y `4a604d6`;
      fusión `b5f62fa`.

# Restricciones

- No modificar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No añadir dependencias ni arte final.
- No usar `Math.random`, relojes ni estado global para generar.
- No debilitar los tests de la v2; los cambios de expectativa se justifican por
  `REQ-011` v3, `REQ-012` v3 y `REQ-013`.
- El experimento no decide por el usuario: exporta datos y deja abiertas la
  variante y la representación de salida.

# No objetivos

- Implementar el generador de producción ni promover nada a `src/game/`.
- Cambiar BSP, el motor, el HUD, el combate o la IA.
- Transición funcional al siguiente nivel, varias salidas, llaves o escaleras
  que cambien de profundidad.
- Cerrar `REQ-011`, `REQ-012` o `REQ-013`: solo se validan con el experimento.
