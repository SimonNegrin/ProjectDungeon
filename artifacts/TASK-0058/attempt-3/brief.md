---
type: Task Brief
title: "TASK-0058: brief del intento 3"
description: "Congelar el reloj antes de muestrear cues y eliminar la carrera real de los E2E."
task: TASK-0058
attempt: 3
status: stable
brief_bytes: 2500
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:35:00Z }
---

# Objetivo

Eliminar la carrera de tiempo real que deja el nuevo E2E de fallo sin cue de
ataque. El muestreo de `advanceToCue` debe congelar el reloj de presentación
antes de leer, no después. Sin cambios de producción ni de criterios.

# Evidencia

- `artifacts/TASK-0058/attempt-2/lead-e2e-output.txt`: el test
  `fallo: cuerda opuesta...` falló con `Received has value: undefined` al buscar
  el cue de ataque tras `advanceToCue('attack')` + `advance(70)`.
- El runner pasó la misma suite: es una carrera, no un fallo determinista. Entre
  `dispatch` y `advanceToCue` corre el rAF real; si la animación avanza cerca del
  final del beat de 300 ms, el `advance(70)` posterior sale de la ventana.
- `advanceToCue` (`tests/e2e/support.ts`) comprueba el cue antes de poner el
  reloj en modo manual. Congela con `window.__game.advance(0)` al entrar (o
  justo después de `dispatch`) y luego recorre el cue.

# Invariantes

- No toques `src/game/`, `src/host/`, `experiments/`, dependencias ni el alcance.
- Conserva las aserciones semánticas: impacto con cue `hit:true`, fallo con
  `hit:false` y texto `Fallo`, muerte con cue `death` y cadáver persistente. No
  las debilites ni las sustituyas por esperas reales.
- No cambies el reloj de producción ni el comportamiento del juego.
- Usa pnpm; todo comando con timeout explícito.

# Criterios de aceptación

`docs/tasks/TASK-0058-feedback-combate-muerte.md#criterios-de-aceptación`.
Verificación añadida: la suite nueva pasa 3 repeticiones seguidas.

# Contexto mínimo

- `tests/e2e/support.ts` (`advanceToCue`).
- `tests/e2e/feedback-combat-qa.spec.ts` (impacto, fallo y muerte).
- `docs/harness/workflow.md#timeouts-y-procesos` para `--repeat-each`.

# Artefactos

`artifacts/TASK-0058/attempt-3/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `e2e-repeat-output.txt` (3 repeticiones de
la suite nueva), capturas y commit SHA en `task/TASK-0058`.

# Riesgos y decisiones abiertas

- `advance(0)` debe dejar el reloj en manual sin perder el cue del instante 0;
  comprueba impacto, fallo y muerte.
- No conviertas las esperas de captura en aserciones; las capturas pueden seguir
  usando el pase actual.
