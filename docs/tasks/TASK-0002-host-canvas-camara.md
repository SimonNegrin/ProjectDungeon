---
type: Task
id: TASK-0002
title: Host Canvas con sala, sprites y cámara
description: Renderiza la sala y las entidades con Canvas 2D, cámara que sigue al jugador y sprites de 32rogues.
status: stable
task_status: backlog
task_type: feature
requirement: REQ-001
requirement_ids: [T-002, T-003, R-001, R-002, R-006, R-010]
depends_on: [TASK-0001]
unlocks: [TASK-0003]
created_at: 2026-11-07T15:24:03Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0002/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
verified:
---

# Objetivo

Tener una página jugable que muestre la sala de 32×24, al caballero y al goblin
con los sprites de 32rogues, y una cámara que siga al jugador y se limite a los
bordes del mapa. Todavía sin teclado ni HUD completo.

# Contexto

- Requisito: [REQ-001](../requirements/REQ-001-primer-prototipo-local.md).
- Motor: `src/game/` de TASK-0001.
- Arquitectura: [Canvas y cámara](../design/architecture.md).
- Arte: [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md).
- Assets ya versionados en `public/assets/32rogues/`.
- Sprites recomendados: caballero en `rogues.png` (fila 2, columna 1) y goblin
  en `monsters.png` (fila 1, columna 3). Muros de ladrillo de piedra y suelo de
  piedra en `tiles.png`.

# Criterios de aceptación

- [ ] Existe una página de juego que arranca con `pnpm run dev` y muestra la
      sala de 32×24 con tiles de 32 px.
- [ ] El suelo y los muros usan los tiles de 32rogues; el borde del mapa está
      cerrado por muros y no se puede atravesar.
- [ ] El jugador se dibuja con el sprite del caballero y el enemigo con el del
      goblin, centrados en su casilla y con escala nítida.
- [ ] La cámara sigue al jugador y se limita a los bordes del mapa; la sala es
      mayor que el viewport para que el desplazamiento sea observable.
- [ ] El canvas se adapta al tamaño de la ventana sin deformar los tiles.
- [ ] El render lee el estado del motor y no implementa reglas de movimiento,
      combate ni turnos.
- [ ] El estado se expone en `window.__game` al menos con un snapshot
      serializable para depuración y tests visuales.
- [ ] Los assets se cargan desde `public/assets/32rogues/` y la página funciona
      sin red.
- [ ] `LICENSE.txt` y el crédito a Seth Boyles están presentes en los assets.
- [ ] `pnpm run verify` y `pnpm run build` pasan; hay una captura de la sala.

# Plan de test

- **Unitario:** cálculo de la cámara con clamp en los cuatro bordes; conversión
  de coordenadas de casilla a píxel.
- **Integración:** el render recibe un estado del motor y produce un canvas con
  píxeles no vacíos.
- **E2E / visual:** cargar la página, comprobar que el canvas existe, que
  `window.__game` devuelve estado y guardar una captura.
- **Manual:** comprobar que los sprites se distinguen y que la cámara no deja
  huecos fuera del mapa.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Cámara y utilidades de render |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run build` | 120 s | Build de la página de juego |
| `pnpm exec playwright test tests/e2e/game-render.spec.ts` | 180 s | Render y captura |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0002/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0002/attempt-1/test-output.txt`
- [ ] Captura en `artifacts/TASK-0002/attempt-1/screenshots/room.png`
- [ ] Commit SHA en la rama `task/TASK-0002`

# Restricciones

- No implementar teclado, HUD, overlays ni reinicio; eso es TASK-0003.
- No modificar las reglas del motor salvo bugs justificados y testeados.
- No usar imágenes remotas ni CDN.
- No introducir un framework de UI.
- Mantener el render separado del motor.

# No objetivos

- Interacción con teclado.
- HUD y textos de estado.
- Animaciones de sprites.
- Arte final.

# Notas

- El viewport de referencia es aproximadamente 960×600; la sala completa mide
  1024×768, así que la cámara debe desplazarse.
- Usar `image-rendering: pixelated` o el equivalente de Canvas para mantener los
  sprites nítidos.
- El `task-lead` debe marcar esta tarea como `ready` solo cuando TASK-0001 esté
  `done`.
