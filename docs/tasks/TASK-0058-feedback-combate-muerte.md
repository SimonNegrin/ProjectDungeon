---
type: Task
id: TASK-0058
title: "Feedback de combate y muerte: impacto, fallo, daño y cadáver"
description: "Presentar ataque, defensa, texto de daño y muerte con el beat de REQ-017; el cadáver persiste como presentación y los cadáveres ambientales se reservan."
status: draft
task_status: backlog
task_type: feature
requirement: REQ-017
requirement_ids: [R-005, R-006, R-007, R-008, R-009, R-010, R-020, R-021, T-006, T-007, T-008, T-012]
depends_on: [TASK-0057]
unlocks: [TASK-0060, TASK-0061]
created_at: 2026-11-10T01:00:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0058/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T01:00:00Z }
verified:
---

# Objetivo

Que el combate se lea: embestida, destello, retroceso, `-N` y tick de PV en el
impacto; gesto de defensa y `Fallo` en el fallo; y una muerte de 900 ms que deja
un cadáver persistente. Todo sobre la timeline de
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md) y
[ADR-017](../decisions/ADR-017-feedback-visual-eventos.md).

# Contexto

- Reglas: REQ-017 «Combate y muerte» y «Lenguaje visual y legibilidad».
- Punto de partida: `src/host/feedback.ts`, `renderer.ts`, `main.ts` e
  `index.html`; el texto y el destello actuales usan `setTimeout` y un único
  elemento.
- `corpse-22a/b` están en la lista ambiental de `src/host/floor.ts` y en
  `REQ-008`; deben reservarse para muertes reales.
- El motor ya conserva la unidad muerta con su equipo; no se añade estado de
  cadáver ni interacción.

# Criterios de aceptación

- [ ] Impacto: embestida de 2-4 px del atacante, destello blanco de 80-120 ms,
      retroceso de 2 px, `-N`, tick de PV y sacudida de sprite de 1 px; el daño y
      la vida no cambian antes del cue.
- [ ] Fallo: embestida, gesto de esquiva o escudo del defensor y `Fallo` gris;
      sin destello de impacto. Impacto y fallo se distinguen en escala de grises.
- [ ] Muerte: destello, tres parpadeos, disolución de 300 ms y sacudida; el
      cadáver aparece al final y persiste hasta reiniciar, regenerar o cambiar de
      nivel.
- [ ] El cadáver se dibuja bajo las unidades y sobre los decals; no bloquea, no
      se interactúa y no se escribe en la rejilla.
- [ ] `corpse-22a/b` deja de elegirse como decoración ambiental; huesos, sangre y
      manchas siguen disponibles. La lista ambiental baja a 31 decals.
- [ ] El texto de daño está anclado al mundo, se recoloca con la cámara y admite
      hasta tres simultáneos sin pisarse; no usa `setTimeout`.
- [ ] Los efectos de mundo van en Canvas y los textos en DOM, en el orden de
      capas de ADR-017; la rejilla, el cursor y el camino siguen visibles.
- [ ] `src/game/` no cambia; `pnpm run verify` pasa y no se debilitan tests.

# Plan de test

- **Unitario:** cues de impacto, fallo y muerte; estado intermedio de PV y
  muerte; selección de cadáver; lista ambiental sin `corpse`; cola de textos.
- **Visual:** capturas del pico de impacto, fallo, muerte y cadáver con el reloj
  de test; comprobar grises y capas.
- **Regresión:** renderer, suelo, HUD y movimiento; `pnpm run verify`.
- **E2E:** las suites de feedback llegan en TASK-0061.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0058/attempt-1/report.md`.
- [ ] Salidas de `verify` y tests nuevos.
- [ ] Capturas en `attempt-1/screenshots/` con impacto, fallo, muerte y cadáver.
- [ ] Commit SHA en la rama `task/TASK-0058`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host` | 180 s |
| `pnpm run verify` | 300 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar fórmulas, reglas de combate, IA ni el estado del motor.
- No añadir arte nuevo; usar sprites, decals y paleta existentes.
- No usar blur, degradados, partículas ni animaciones de sprite de varios frames.
- No tocar `src/game/`, `experiments/` ni dependencias.

# No objetivos

- Recogida, cambio de arma, `!`, alarma, fases y fin de partida (TASK-0059).
- Atajo fuera de pantalla y `prefers-reduced-motion` (TASK-0060).
- E2E completo y QA visual de todas las familias (TASK-0061).
- Saqueo de cadáveres.
