---
type: Task
id: TASK-0041
title: "EXP-004: puertas, acceso de spawn y presupuesto de enemigos"
description: Actualizar el experimento con puertas validadas por geometría, spawn alrededor del acceso y enemigos calculados por superficie y jugadores con factores configurables.
status: stable
task_status: ready
task_type: experiment
requirement: REQ-011
requirement_ids: [R-004, R-009, T-007, T-014, R-002, R-006, R-007, R-008, T-004, T-006, T-012]
depends_on: []
unlocks: []
created_at: 2026-11-09T10:50:25Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0041/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T10:50:25Z }
verified:
---

# Objetivo

Actualizar `EXP-004` para que A, B y C apliquen las reglas v2 de
[puertas](../requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos),
el spawn alrededor del acceso y el presupuesto de enemigos por superficie y
jugadores de
[REQ-012](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos).
No se modifica producción.

# Contexto

- Definición: [EXP-004](../../experiments/EXP-004-salas-irregulares/experiment.md).
- Implementación v1: `experiments/EXP-004-salas-irregulares/src/`.
- Evidencia previa: `artifacts/TASK-0040/attempt-2/`.
- La página y el manifest ya existen; se actualizan.

# Criterios de aceptación

- [ ] Las tres variantes validan cada puerta: dos muros en la línea del muro,
      suelo a ambos lados, conexión entre dos salas distintas, separación global
      Chebyshev ≥3 y máximo una por pasillo. Los pasillos anchos no llevan
      puertas.
- [ ] Si no hay posición válida, se dibuja una boca abierta con motivo en
      métricas/debug; nunca una puerta inválida.
- [ ] El spawn elige el acceso (suelo interior junto a la puerta más cercana al
      centro, desempate por id). `party[0]` ocupa el acceso; el resto queda a
      Chebyshev ≤2, separación ≥2 y prioriza tiles con vecinos libres. Si no
      caben 6, se amplía a radio 3 y después a la sala completa, con aviso.
- [ ] El total de enemigos usa `T = ceil(enemySurfaceFactor × N) +
      ceil(enemyPlayersFactor × P)`, con `N` = tiles de suelo de las salas sin
      pasillos y `P` = `numPlayers` (1-6, por defecto 3).
- [ ] Controles nuevos: `enemySurfaceFactor` (0-0,10, por defecto 0,02),
      `enemyPlayersFactor` (0-3,00, por defecto 1,35) y `numPlayers` (1-6).
- [ ] Reparto proporcional al área, mínimo 1 por sala no-spawn, 0 en spawn y
      sin salas vacías. Tipos 60/20/20: brutos y cobardes redondeados, resto
      centinelas, con al menos 1 de cada si `T ≥ 4`.
- [ ] Métricas y JSON incluyen puertas válidas/bocas abiertas, distancias,
      accesos y huecos, `N`, `P`, factores, términos, `T` y reparto por sala.
- [ ] Tests unitarios de A/B/C: determinismo, conectividad, puertas (positivo y
      negativos: adyacentes, sin muro, en pasillo ancho, dos en un pasillo),
      spawn (acceso, radio, separación, fallback) y enemigos (fórmula, factores a
      0, reparto, tipos, separación, sin visión al spawn).
- [ ] Capturas 1280×720 de A/B/C con ≥4 semillas, una caverna y un pasillo
      ancho; debug de puertas, spawn y enemigos, más 13×13.
- [ ] `pnpm run docs:check`, `pnpm run test` y `pnpm run build` pasan; sin
      dependencias nuevas y sin `Math.random`.
- [ ] `src/`, `tests/`, `index.html` raíz y `public/` no cambian.

# Plan de test

- **Unitario:** `experiments/EXP-004-salas-irregulares/src/*.test.ts` para las
  tres variantes y los validadores de puertas, spawn y enemigos.
- **Integración:** la página importa el manifest y renderiza cada variante sin
  errores de consola.
- **E2E / visual:** abrir la página, cambiar semilla, variante y factores;
  capturar mapa completo, debug, puertas, spawn y 13×13.
- **Manual:** 8 semillas; comprobar que las puertas cumplen las reglas, el grupo
  se lee alrededor del acceso y la densidad sigue la fórmula.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0041/attempt-1/report.md`.
- [ ] Salidas de `test`, `docs:check` y `build` en `attempt-1/`.
- [ ] Capturas en `attempt-1/screenshots/` y JSON de decisión de ejemplo.
- [ ] Commit SHA en la rama `task/TASK-0041`.

# Restricciones

- No modificar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No añadir dependencias ni arte final.
- No usar `Math.random`, relojes ni estado global para generar.
- El experimento no decide por el usuario: exporta datos y deja la decisión
  abierta.

# No objetivos

- Implementar el generador de producción ni promover nada a `src/game/`.
- Cambiar BSP, el motor, el HUD, el combate o la IA.
- Puertas funcionales, escaleras o materiales de muro por zona.
- Cerrar `REQ-011` o `REQ-012`: solo se validan con el experimento.
