---
type: Task
id: TASK-0048
title: "Host: render de máscaras, puertas, spawn, entrada/salida y enemigos"
description: Consumir en el host el mapa growth con máscaras de sala, puertas con estilo, party de 6, entrada y salida y enemigos del generador; debug F1 sin cambiar el HUD normal.
status: stable
task_status: ready
task_type: feature
requirement: REQ-011
requirement_ids: [R-010, R-011, R-012, R-013, T-006, T-007]
depends_on: [TASK-0046]
unlocks: [TASK-0049]
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0048/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
---

# Objetivo

Que el host dibuje el mapa `growth` como se ve en `EXP-004`: máscaras de sala,
puertas válidas con estilo, bocas abiertas sin puerta, grupo de 6, entrada y
salida distinguibles y enemigos colocados por el generador, sin romper cámara,
HUD, movimiento, combate ni debug.

# Contexto

- Host: `src/host/floor.ts`, `renderer.ts`, `hud.ts`, `debug.ts`, `main.ts`.
- Modelo y generador: `TASK-0043` a `TASK-0046`.
- Tiles: `src/host/assets.ts` y `ADR-006`; escaleras con el recorte local que ya
  usa `EXP-004` hasta que se exponga en assets.
- Regla de muro por borde: `src/host/wall.ts`.

# Criterios de aceptación

- [ ] El suelo y la máscara de cada sala se dibujan desde `Room.cells`; BSP
      rectangular sigue viéndose igual. `roomAt` usa la máscara.
- [ ] Las puertas se dibujan solo en huecos válidos y con su estilo; las bocas
      abiertas no dibujan puerta. El jugador puede pisar la puerta.
- [ ] La salida se distingue de una puerta decorativa: `door` en el borde,
      `stairs-down`/`stairs-up` en suelo, con tile propio. Cruzarla no cambia de
      mapa.
- [ ] El jugador actual usa `party[0]`; el debug muestra los 6 huecos, la sala de
      spawn, sus accesos y la entrada.
- [ ] Los enemigos generados por `growth` aparecen con su tipo, `home` y estado
      de emboscada; el HUD normal no revela información nueva.
- [ ] `F1` muestra máscaras, límites, puertas y motivos, spawn, entrada/salida,
      anchura de pasillo, caverna y puntos calientes; sin `F1` el juego se ve
      igual que sin debug.
- [ ] Cámara 13×13, encuadre 16:9, movimiento animado, cursor, combate y feedback
      siguen funcionando; `pnpm run verify` pasa.
- [ ] La misma semilla produce el mismo render; no se usa `Math.random`.

# Plan de test

- **Unitario:** selección de tile de muro y puerta, posición de salida y
  pertenencia por máscara.
- **Integración:** partida con `growth` por defecto y BSP inyectado.
- **E2E / visual:** capturas 1280×720 de juego normal, debug, caverna, pasillo
  ancho, spawn, entrada/salida y 13×13; `F1` on/off.
- **Regresión:** cámara, cursor, movimiento, combate y suelo de `REQ-008`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0048/attempt-1/report.md`.
- [ ] Tests, `verify` y capturas en `attempt-1/`.
- [ ] Commit SHA en `task/TASK-0048`.

# Restricciones

- El host no decide reglas ni muta el estado.
- No añadir arte final, sprites nuevos ni dependencias.
- No implementar transición de nivel ni cámara secreta.
- No romper BSP ni el render histórico de `REQ-008`.

# No objetivos

- QA E2E completa y playtest (`TASK-0049`).
- Bundle (`TASK-0047`) y variantes BSP/plantillas en producción.
