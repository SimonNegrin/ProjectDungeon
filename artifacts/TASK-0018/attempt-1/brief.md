---
type: Task Brief
title: "TASK-0018: brief del intento 1"
description: Presentación animada del movimiento en el host, con timeline, cámara, input bloqueado, HUD y tests, sin tocar el motor.
task: TASK-0018
attempt: 1
status: stable
brief_bytes: 3807
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:05:00Z }
---

# Objetivo

Implementar en `src/host/` la capa de presentación de `REQ-006` v2: todo
`UnitMoved` se ve como recorrido tile a tile con transición, pausa, cámara que
sigue, input de juego bloqueado, cursor oculto, MP progresivo y feedback
secuenciado. El motor no se toca. Dejar `pnpm run verify` y
`pnpm run test:e2e` en verde, con tests nuevos y evidencia visual para el
playtest.

# No objetivos

- No implementar la cobertura E2E nueva de movimiento (`TASK-0019`).
- No editar `src/game/`, `docs/`, `experiments/` desde producción ni añadir
  dependencias.
- No cambiar reglas, comandos, eventos, pathfinding, economía, combate, mapa,
  viewport, HUD ni arte.

# Invariantes

- Ritmo único 125 ms de paso, 70 ms de pausa por tile y diagonal a duración
  constante. `n` pasos generan `n + 1` pausas; no se reinterpreta.
- El estado del motor sigue siendo la verdad. La timeline se deriva de los
  eventos ordenados; no se simula dos veces ni se muta la entrada.
- `snapshot()` sigue devolviendo el estado final serializable. El HUD y el
  overlay pueden ir por detrás durante la presentación.
- Posiciones visuales enteras, pixel art nítido, recorte al viewport; cámara
  continua redondeada y limitada al mapa.
- Con `prefers-reduced-motion: reduce`, movimiento instantáneo y mismo estado y
  eventos finales.
- No borrar, saltar ni debilitar tests. Los E2E existentes pueden añadir esperas
  explícitas o usar el reloj determinista, sin cambiar su intención.
- `ADR-008` y la documentación de diseño los escribe el lead: no los toques.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0018-movimiento-animado-host.md` §«Criterios de
aceptación». Todos deben cumplirse; enlázalos, no los copies.

# Contexto mínimo

- Requisito: `docs/requirements/REQ-006-movimiento-animado.md` v2, §Requisitos
  creativos (R-001 a R-013) y §Requisitos técnicos (T-001 a T-010).
- Decisión de ritmo: `experiments/EXP-002-ritmo-movimiento/results/decision-2026-11-08T10-23-31Z.json`
  (125/70/`constant-duration`, semilla 508771428).
- Host actual: `src/host/main.ts`, `session.ts`, `renderer.ts`, `camera.ts`,
  `input.ts`, `cursor.ts`, `cursor-view.ts`, `hud.ts`, `feedback.ts`,
  `debug.ts`, `geometry.ts`, `layout.ts`.
- Maqueta descartable: `experiments/EXP-002-ritmo-movimiento/src/motion.ts` y
  `render.ts` (referencia de timeline; no importar).
- Contrato técnico propuesto y reparto de responsabilidades:
  `brief-detalle.md` (`read_detail: true`). Léelo antes de implementar.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run test:e2e` | 240 s |
| `pnpm run build` | 120 s |

# Artefactos

- `artifacts/TASK-0018/attempt-1/report.md` según
  `docs/templates/task-report.md`.
- `test-output.txt`, `verify-output.txt`, `e2e-output.txt`, `logs/`.
- `screenshots/`: paso intermedio, llegada, fase enemiga y reduced motion.
- Commit SHA en `task/TASK-0018`; no fusiones ni marques la tarea.

# Riesgos y decisiones abiertas

- La pausa antes del ataque tras acercarse (~150 ms) es ajustable en playtest,
  pero el orden caminar → pausa → ataque es obligatorio. No improvises cambios
  de sensación.
- Si un E2E falla por el nuevo asincronismo, añade una espera explícita o usa
  `window.__game.advance(...)`; no relajes la aserción.
- Si aparece una duda creativa o una contradicción del requisito, devuelve
  `blocked`; no la resuelvas por tu cuenta.
