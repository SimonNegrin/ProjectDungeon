---
type: Task
id: TASK-0049
title: "E2E, QA visual y playtest de growth por defecto"
description: Cubrir con Playwright la partida growth y su debug, verificar la guarda de bundle y preparar el playtest con la semilla 2738263054 y la configuración registrada.
status: draft
task_status: backlog
task_type: qa
requirement: REQ-011
requirement_ids: [R-001, R-002, R-008, R-010, R-011, R-012, R-013, T-007, T-009, T-015, T-016]
depends_on: [TASK-0047, TASK-0048]
unlocks: []
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0049/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
---

# Objetivo

Que `growth` esté cubierto de extremo a extremo como generador por defecto y que
el usuario pueda jugar el corte con la configuración registrada en `EXP-004`,
sin que el bundle de producción contenga variantes descartadas.

# Contexto

- Tareas previas: `TASK-0043` a `TASK-0048`.
- Playtest: semilla `2738263054`, 22×18, 5 salas, salas 3-8, 6 jugadores,
  0,02/1,2, emboscadas 0,25 y `exitMode: random`.
- Usar `E2E_ARTIFACTS_DIR` y guardar capturas en `<spec>/screenshots/`.

# Criterios de aceptación

- [ ] E2E con semilla fija: mapa 22×18, 5 salas, grupo de 6, entrada/salida,
      enemigos y puertas válidas; dos cargas dan el mismo resultado.
- [ ] E2E de render: máscaras, puertas, bocas abiertas, salida, enemigos y debug
      `F1` on/off; la salida no inicia transición.
- [ ] E2E de regresión: BSP inyectado sigue arrancando con 4 enemigos y cámara,
      cursor, movimiento y combate funcionan.
- [ ] La guarda de bundle pasa y su salida queda en evidencia; el build de
      producción no contiene `buildBsp`, `pickTemplate` ni entry de `EXP-004`.
- [ ] Capturas 1280×720 de juego normal, debug, caverna, pasillo ancho, spawn,
      entrada/salida, 13×13 y regresión BSP.
- [ ] Paquete de playtest: comando de arranque, semilla, JSON de configuración y
      checklist breve (legibilidad, densidad, puertas, spawn, salida, 13×13).
- [ ] `EXP-004` permite reproducir la configuración registrada (preset o
      defaults actualizados) y su JSON coincide con
      `results/decision-2026-11-09T14-59-21Z.json`.
- [ ] `pnpm run test:e2e`, `--repeat-each=3` y `pnpm run verify` pasan; no se
      borran, saltan ni debilitan tests.
- [ ] Sin dependencias nuevas; el usuario decide en el playtest si ajusta
      densidad, emboscadas o representación de salida.

# Plan de test

- **E2E:** carga determinista, estructura del mapa, render, debug, regresión BSP
  y guarda de bundle.
- **Visual:** capturas de los estados anteriores; revisar legibilidad a 13×13.
- **Manual:** jugar al menos 8 semillas, incluida la de playtest, y anotar si la
  densidad o la salida piden ajustes.
- **Regresión:** suite completa y `verify`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0049/attempt-1/report.md`.
- [ ] Salidas de E2E, `verify` y guarda de bundle en `attempt-1/`.
- [ ] Capturas en `attempt-1/screenshots/` y `<spec>/screenshots/`.
- [ ] JSON de configuración y checklist de playtest.
- [ ] Commit SHA en `task/TASK-0049`.

# Restricciones

- No cambiar reglas ni valores para hacer pasar un test; si algo falla, se
  reporta con evidencia.
- No usar esperas fijas si existe una condición de estado; reutilizar
  `tests/e2e/support.ts`.
- No borrar, saltar ni debilitar tests existentes.
- No añadir dependencias ni arte final.

# No objetivos

- Implementar el generador o el host: ya están en tareas anteriores.
- Promocionar BSP o plantillas, selector runtime, cámara secreta o transición de
  nivel.
- Pruebas de carga, red, hotseat o persistencia.
