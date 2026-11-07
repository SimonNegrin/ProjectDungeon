---
type: Task
id: TASK-0003
title: Teclado, HUD, overlays y E2E del loop completo
description: Conecta el teclado al motor, añade HUD y overlays, reinicio y prueba E2E de una partida completa.
status: stable
task_status: done
task_type: feature
requirement: REQ-001
requirement_ids: [T-003, T-004, R-004, R-005, R-007, R-008, R-009]
depends_on: [TASK-0002]
unlocks: [TASK-0004]
created_at: 2026-11-07T15:24:03Z
completed_at: 2026-11-07T15:58:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0003/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
verified: { by: task-lead, at: 2026-11-07T15:58:00Z }
---

# Objetivo

Convertir la escena renderizada en una partida jugable con teclado: mover,
atacar, terminar turno, ver la fase enemiga, ganar o perder, reiniciar y
comprobar el loop completo con Playwright.

# Contexto

- Requisito: [REQ-001](../requirements/REQ-001-primer-prototipo-local.md).
- Motor: `src/game/` de TASK-0001.
- Host y cámara: TASK-0002.
- Teclas y reglas: [economía de turno provisional](../design/turn-economy.md).
- QA: [estrategia de tests](../quality/test-strategy.md) y
  [QA visual](../harness/visual-qa.md).

# Criterios de aceptación

- [x] `WASD` y flechas envían comandos de movimiento al motor; una pulsación
      mueve una casilla y respeta muros, ocupación y MP.
- [x] `Espacio` y `Enter` atacan al enemigo adyacente; si no hay objetivo, el
      comando no rompe el estado.
- [x] `E` termina el turno, ejecuta la fase enemiga y devuelve el control al
      jugador.
- [x] `R` reinicia la partida al estado inicial.
- [x] `F1` alterna un overlay de debug con estado útil (coordenadas, MP, acción,
      fase y semilla si aplica).
- [x] El HUD muestra vida y MP del jugador, acción disponible, fase actual, vida
      del enemigo y ayuda de teclas; se actualiza tras cada comando.
- [x] Al morir el enemigo aparece el overlay de victoria; al morir el jugador,
      el de derrota. Ambos ofrecen reiniciar.
- [x] El ataque produce flash y número de daño; no hay animación de movimiento.
- [x] `window.__game` permite leer el estado y despachar comandos para tests.
- [x] E2E: mover, atacar, terminar turno, observar la fase enemiga, ganar,
      reiniciar y comprobar la derrota. Guardar capturas de HUD y overlays.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- **Unitario:** mapeo tecla→comando, actualización del HUD desde el estado y
  visibilidad de overlays.
- **Integración:** teclado→comando→motor→eventos→HUD.
- **E2E:** partida corta completa con teclado y modo test determinista; victoria,
  derrota y reinicio; capturas de HUD, victoria y derrota.
- **Manual:** playtest del usuario para legibilidad, cámara y sensación del loop.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Mapeo, HUD y overlays |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Loop completo, cámara, HUD y overlays |
| `pnpm run build` | 120 s | Build final |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0003/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0003/attempt-1/test-output.txt`
- [x] Capturas en `artifacts/TASK-0003/attempt-1/screenshots/` de HUD,
      victoria y derrota
- [x] Commit SHA en la rama `task/TASK-0003`

# Verificación

- `task-lead` revisó el diff completo de `task/TASK-0003`: solo `src/host/`,
  `index.html`, tests nuevos y artefactos. `src/game/`, `experiments/`,
  `package.json`, lockfile y configuración de Vite/Playwright/TS/Vitest sin
  cambios.
- `pnpm run verify` re-ejecutado de forma independiente: docs, config, 106 tests
  y build OK.
- `pnpm run test:e2e` re-ejecutado: 3 tests OK (loop nuevo, render de TASK-0002
  y shell de experimentos). El test del loop se repitió 5 veces con
  `--repeat-each=5`: 5/5 OK, sin fallos intermitentes del flash.
- Capturas revisadas: `hud.png`, `attack.png`, `victory.png`, `defeat.png` y
  `debug.png`. El HUD es legible, el daño `-5` y el flash se ven sobre el
  objetivo, y los overlays de victoria/derrota muestran el botón de reinicio.
- `window.__game.dispatch()` usa el mismo camino que el teclado y devuelve
  snapshot y eventos serializables; el E2E lo usa para acercarse al enemigo con
  comandos reales y para provocar la derrota.
- `src/host/renderer.ts` sigue sin importar reglas del motor. No se han borrado,
  saltado ni debilitado tests existentes.
- Los puertos 4173 y 5173 quedaron libres; no hay servidores ni procesos en
  background.
- Nota: `tests/e2e/game-render.spec.ts` sigue escribiendo
  `artifacts/TASK-0002/attempt-1/screenshots/room.png`; la re-ejecución del E2E
  lo regenera con el HUD nuevo. El archivo se restauró para no alterar
  artefactos de TASK-0002.
- Commit de implementación: `366782fd29d9fb0f412f35728aebcdc405c062af`.
  Commit de artefactos: `a7391b6dba1af09a090061da7b7cf68cf8c02e5a`.
- Pendiente: playtest del usuario para legibilidad, cámara y sensación del loop.

# Restricciones

- No cambiar las reglas ni los valores de la economía provisional.
- No añadir animaciones de movimiento ni audio.
- No introducir un framework de UI.
- No depender de red ni de assets remotos.
- No debilitar ni saltar tests para que pase el E2E.

# No objetivos

- Hotseat, servidor, QR y móviles.
- Balance y tuning fino.
- Varios niveles, clases, objetos y progresión.
- Arte final y audio.

# Notas

- El modo test debe permitir una partida determinista sin depender de tiempos
  reales. Si hace falta, exponer `window.__game.dispatch(command)`.
- Las capturas deben mostrar la sala completa, el HUD y los overlays; no usar
  diff de píxeles a pantalla completa.
- El `task-lead` debe marcar esta tarea como `ready` solo cuando TASK-0002 esté
  `done`.
