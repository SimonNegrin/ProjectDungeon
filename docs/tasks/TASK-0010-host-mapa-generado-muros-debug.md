---
type: Task
id: TASK-0010
title: "Host: mapa generado, semilla, muros y debug"
description: Integra el mapa BSP en la partida, añade semilla por URL/R/F2, capa de debug y la regla de muros por borde en el render.
status: stable
task_status: done
task_type: feature
requirement: REQ-003
requirement_ids: [R-005, R-006, R-007, R-008, R-009, R-010, R-011, T-003, T-005, T-006, T-008, T-010]
depends_on: [TASK-0009]
unlocks: [TASK-0011]
created_at: 2026-11-07T22:17:27Z
completed_at: 2026-11-07T23:16:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0010/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:17:27Z }
verified:
  - by: task-lead
    at: 2026-11-07T23:16:00Z
    note: "Verificación independiente: diff completo, `pnpm run verify` (238 tests), `pnpm run test:e2e` (12 tests), tests de muros y semilla, snapshot de la semilla 279837264, capturas con debug activo/desactivado y detalle de esquina/pasillo ancho. Sin cambios en el generador, requisitos ni dependencias; tests adaptados sin debilitar el alcance."
---

# Objetivo

Sustituir la sala fija del host por el mapa generado de `REQ-003`. La partida
arranca con una semilla, el jugador y el enemigo aparecen en las salas
calculadas, la cámara sigue funcionando y los muros usan la regla por borde. Se
añade semilla por URL, `R` con la misma semilla, `F2` con una semilla nueva y la
capa de debug con salas, huecos, apariciones y anchura de pasillos.

# Contexto

- Requisito: [REQ-003](../requirements/REQ-003-generacion-mapa.md).
- TASK-0008: `MapGenerator`, BSP, salas, pasillos estrechos y apariciones.
- TASK-0009: huecos de puerta y pasillos anchos.
- Host actual: `src/host/main.ts`, `session.ts`, `renderer.ts`, `hud.ts`,
  `input.ts`, `debug.ts`, `camera.ts`, `geometry.ts`.
- Encuadre y cámara: [REQ-002](../requirements/REQ-002-encuadre-16-9.md).
- Regla de muros: `wallSide1` solo con suelo al sur; `wallTop` en el resto;
  `wallSide2` reservado.
- Semilla por defecto documentada: `279837264`; configuración `9/4/11/20`.

# Diseño técnico de referencia

- `renderer.ts` deja de elegir el muro por fila/paridad. Usa una función pura
  `wallTileFor(grid, x, y)` (en `src/host/wall.ts` o similar) que devuelve
  `wallTop` o `wallSide1` según el suelo al sur. `wallSide2` no se usa.
- El render dibuja suelo con variantes deterministas por coordenada/semilla y
  muros con la regla por borde, sin alternancias.
- `GameSession` conserva la semilla, las opciones y el `MapGenerator`; `Restart`
  reconstruye el estado con la misma semilla. `F2` crea una semilla nueva desde
  el host (nunca dentro del motor) y reconstruye la sesión.
- El host actualiza `world`, `bounds` y cámara después de un reinicio o cambio de
  semilla; el mapa siempre es 32×32 en este corte, pero la cámara debe recentrarse
  en el nuevo spawn.
- La semilla se lee de `?seed=<entero>`; si falta o no es válida, se usa
  `279837264` y se registra un aviso.
- `F1` abre/cierra la capa de debug existente. Debe mostrar como mínimo: semilla,
  límites/rol de cada sala, huecos con orientación, puntos de aparición y
  pasillos anchos con su anchura. Puede complementarse con marcadores en Canvas.
- El HUD, el marco 16:9, la cámara y el feedback de `REQ-002` no cambian.

# Criterios de aceptación

- [ ] La partida arranca con el mapa generado de 32×32 y los spawns del mapa;
      el jugador está en una sala con salida y el enemigo fuera del viewport
      inicial.
- [ ] La cámara sigue al jugador, se limita a los bordes del mapa y se recentra
      correctamente tras `R` y `F2`.
- [ ] Los muros usan `wallSide1` solo con suelo al sur y `wallTop` en el resto;
      no aparece `wallSide2`; las esquinas y los pasillos anchos se ven
      correctamente.
- [ ] Los suelos usan variantes deterministas y no cambian entre frames.
- [ ] `?seed=<entero>` fija la semilla; sin parámetro se usa `279837264`; `R`
      conserva la semilla; `F2` genera una semilla nueva y regenera el mapa.
- [ ] `F1` muestra semilla, salas, huecos, apariciones y anchura de pasillos; está
      oculta por defecto y no altera la partida.
- [ ] `window.__game` expone seed, rooms, corridors, doors y spawns en el
      snapshot, además de los datos actuales.
- [ ] El HUD, el encuadre 16:9 y el feedback de ataque siguen funcionando.
- [ ] Hay tests unitarios de `wallTileFor` con tabla de vecinos y del parseo de
      semilla; la integración del render y la cámara se cubre con tests.
- [ ] `pnpm run verify` pasa y no se debilitan tests existentes.

# Plan de test

- **Unitario:** `wallTileFor` (suelo al sur, muro, borde, esquinas); parseo y
  normalización de semilla; variantes de suelo deterministas.
- **Integración:** `GameSession` con semilla fija; `R` conserva la semilla; `F2`
  cambia; cámara y bounds tras regenerar; snapshot con rooms/doors/spawns.
- **E2E / visual:** una carga con `?seed=279837264`, movimiento y cámara;
  capturas con debug activo y desactivado. La cobertura amplia es TASK-0011.
- **Manual:** revisar que los muros no tienen huecos ni parches y que el mapa se
  lee con el HUD actual.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Muros, semilla, sesión y cámara |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Carga, cámara y debug |
| `pnpm run build` | 120 s | Build con el host integrado |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0010/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0010/attempt-1/test-output.txt`
- [ ] Captura con debug activo (salas, huecos, spawns, pasillos anchos)
- [ ] Captura con debug desactivado (muros y suelo)
- [ ] Captura de detalle de muros en una esquina y un pasillo ancho
- [ ] Commit SHA en la rama `task/TASK-0010`

# Restricciones

- No cambiar el generador ni los validadores de TASK-0008/0009; si falta un dato,
  se escala.
- No cambiar el HUD, el encuadre 16:9 ni la economía de turno.
- No añadir puertas físicas, barricadas, escaleras ni pasillos de 3 tiles.
- No añadir dependencias.
- No usar `Math.random` en el render ni en el motor; la semilla nueva se elige en
  el host.

# No objetivos

- Puertas abiertas/cerradas y barricadas.
- E2E completo y QA visual amplio (TASK-0011).
- Escaleras, varios niveles, enemigos adicionales, niebla o minimapa.

# Notas

- La capa de debug puede ser DOM y/o Canvas; lo importante es que se lea la
  información y que no altere el estado.
- El mapa es 32×32, así que el mundo y los bounds cambian respecto a la sala
  20×20 actual; revisar los tests de cámara de `REQ-002`.
