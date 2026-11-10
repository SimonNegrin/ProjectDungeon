---
type: Task Brief
title: "TASK-0058: brief del intento 2"
description: "Corregir el sentido del retroceso/esquiva y hacer visible el gesto de defensa."
task: TASK-0058
attempt: 2
status: stable
brief_bytes: 2535
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:20:00Z }
---

# Objetivo

Corregir dos fallos del intento 1 sin ampliar el alcance: el retroceso y la
esquiva deben alejar al defensor del atacante, y el gesto de escudo debe quedar
visible (no oculto por el sprite del atacante). Mantener todo lo demás igual.

# Evidencia

- `src/host/world-effects.ts` (`applyAttack`): `awayFromAttacker =
  unitDirection(targetTile, attackerTile)` apunta **hacia** el atacante. Con
  atacante al oeste y objetivo al este, `worldEffectsAt(..., 90).get(target).dx`
  da `-1`; debería ser positivo (alejarse). Afecta a `attackKnockbackPx` y a
  `missDodgePx`.
- `src/host/renderer.ts` (`drawDefenseGesture`): la línea se dibuja fuera del
  sprite (`dx - 1`, `dy - 1`, etc.). El atacante se dibuja después y puede taparla;
  en la captura de fallo el gesto no se lee. Dibújala dentro del tile del
  defensor (borde interior) o en una pasada posterior a todas las unidades.
- Evidencia del lead: `artifacts/TASK-0058/attempt-1/lead-direction-evidence.txt`.

# Invariantes

- No cambies reglas, `src/game/`, `experiments/`, dependencias, arte ni el
  alcance de TASK-0058.
- Conserva destello 80-120 ms, embestida 2-4 px, retroceso 2 px, sacudida 1 px,
  muerte de 900 ms y cadáver persistente.
- No borres, saltes ni debilites tests. Añade aserciones de signo para impacto y
  fallo (horizontal/vertical/diagonal) y una prueba de render de que la línea de
  defensa cae dentro del tile del defensor.

# Criterios de aceptación

`docs/tasks/TASK-0058-feedback-combate-muerte.md#criterios-de-aceptación`.
Se mantienen los E2E y se recaptura `fallo` mostrando el gesto.

# Contexto mínimo

- `src/host/world-effects.ts`, `src/host/renderer.ts`,
  `tests/unit/host/world-effects.test.ts`,
  `tests/unit/host/renderer.test.ts`.
- `tests/e2e/feedback-combat-qa.spec.ts` (captura `fallo`).

# Artefactos

`artifacts/TASK-0058/attempt-2/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, capturas actualizadas (al menos `fallo`) y
commit SHA en `task/TASK-0058`.

# Riesgos y decisiones abiertas

- El gesto debe seguir siendo gris claro y sin destello, legible en escala de
  grises, y no debe alargar el beat de 300 ms.
- No cambies el reloj de textos ni el resto de E2E salvo recapturas.
