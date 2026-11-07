---
type: Task
id: TASK-0003
title: Teclado, HUD, overlays y E2E del loop completo
description: Conecta el teclado al motor, añade HUD y overlays, reinicio y prueba E2E de una partida completa.
status: stable
task_status: backlog
task_type: feature
requirement: REQ-001
requirement_ids: [T-003, T-004, R-004, R-005, R-007, R-008, R-009]
depends_on: [TASK-0002]
unlocks: []
created_at: 2026-11-07T15:24:03Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0003/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
verified:
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

- [ ] `WASD` y flechas envían comandos de movimiento al motor; una pulsación
      mueve una casilla y respeta muros, ocupación y MP.
- [ ] `Espacio` y `Enter` atacan al enemigo adyacente; si no hay objetivo, el
      comando no rompe el estado.
- [ ] `E` termina el turno, ejecuta la fase enemiga y devuelve el control al
      jugador.
- [ ] `R` reinicia la partida al estado inicial.
- [ ] `F1` alterna un overlay de debug con estado útil (coordenadas, MP, acción,
      fase y semilla si aplica).
- [ ] El HUD muestra vida y MP del jugador, acción disponible, fase actual, vida
      del enemigo y ayuda de teclas; se actualiza tras cada comando.
- [ ] Al morir el enemigo aparece el overlay de victoria; al morir el jugador,
      el de derrota. Ambos ofrecen reiniciar.
- [ ] El ataque produce flash y número de daño; no hay animación de movimiento.
- [ ] `window.__game` permite leer el estado y despachar comandos para tests.
- [ ] E2E: mover, atacar, terminar turno, observar la fase enemiga, ganar,
      reiniciar y comprobar la derrota. Guardar capturas de HUD y overlays.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan.

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

- [ ] Informe en `artifacts/TASK-0003/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0003/attempt-1/test-output.txt`
- [ ] Capturas en `artifacts/TASK-0003/attempt-1/screenshots/` de HUD,
      victoria y derrota
- [ ] Commit SHA en la rama `task/TASK-0003`

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
