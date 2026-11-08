---
type: Task Brief
title: "TASK-0017: brief del intento 1"
description: Construir y dejar listo para probar EXP-002 (ritmo del movimiento) sin decidir el ritmo ni tocar producción.
task: TASK-0017
attempt: 1
status: stable
brief_bytes: 3778
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:58:00Z }
---

# Objetivo

Construir `EXP-002` en `experiments/EXP-002-ritmo-movimiento/` con el shell, los
assets reales y una exportación de decisión, lista para que el usuario compare y
decida. No se decide el ritmo ni se promociona nada a producción.

# No objetivos

- Implementar la animación en el juego real ni tocar `src/`, `index.html`,
  `public/`, `package.json` o `pnpm-lock.yaml`.
- Elegir preset, valores o diagonal; la decisión es de `human:simon`.
- Modificar `REQ-006`, sus criterios o el alcance. No edites `docs/`.
- Cambiar `_shell/` ni añadir dependencias.
- Arte final, ciclos de caminar, sonido, pathfinding o reglas de juego.

# Invariantes

- Solo cambian `experiments/EXP-002-ritmo-movimiento/`,
  `experiments/manifest.ts`, `tests/e2e/experiment-motion.spec.ts` y
  `artifacts/TASK-0017/`. No edites `_shell/`.
- Viewport de 13×13 tiles de 32 px (416×416) sobre un mundo mayor, para que el
  clamp de cámara sea visible. Tiles y sprites de 32rogues.
- Cámara entera con clamp; cursor oculto al caminar; MP progresivo; input de
  juego ignorado durante la reproducción.
- Presets A 90/30, B 125/50, C 160/75; sliders `stepMs` 40–250 y `pauseMs` 0–200;
  al mover un slider el preset pasa a `personalizado`. Diagonal: velocidad
  constante (×√2) o duración constante.
- `?test=1&seed=...` determinista, con avance del reloj por API y sin esperas
  reales; `window.__experiment` expone parámetros, escenario, estado, paso,
  posición visual, cámara, avance y decisión.
- No borrar, saltar ni debilitar tests; sin `Math.random` ni `performance.now` en
  la lógica pura.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0017-ritmo-movimiento.md#criterios-de-aceptación`. No
se copian aquí.

# Contexto mínimo

- Tarea y criterios: `docs/tasks/TASK-0017-ritmo-movimiento.md`; experimento:
  `experiments/EXP-002-ritmo-movimiento/experiment.md`.
- Requisito: `docs/requirements/REQ-006-movimiento-animado.md` (R-002 a R-005,
  R-007, R-008, T-004, T-007).
- Shell y referencia: `experiments/_shell/` y
  `experiments/EXP-001-generador-mazmorra/`.
- Host: `src/host/{assets,camera,layout,wall}.ts`; guía:
  `docs/harness/{experiments,visual-qa}.md`.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run test:e2e` | 240 s |
| `pnpm run build` | 120 s |

Servidores en background solo con puerto fijo, comprobación de salud y cierre;
ningún proceso huérfano. Si algo agota el timeout, para y escala con evidencia.

# Artefactos

- `artifacts/TASK-0017/attempt-1/report.md` según `docs/templates/task-report.md`,
  con `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
  `screenshots/` (A, B, C y largo, misma semilla) y un JSON de decisión.
- Commit en `task/TASK-0017` y SHA en el informe. Deja la tarea en `review`: no
  cierres, no fusiones y no decidas el ritmo.

# Riesgos y decisiones abiertas

- “13×13” es el viewport (como `MAP_VIEWPORT`), no el mundo; si el mundo fuera
  13×13 el clamp nunca se vería. Escenarios sugeridos en el anexo.
- El shell no trae reproducción, HUD ni reloj determinista: reutiliza lo que
  encaje y añade lo imprescindible sin tocar `_shell/` (ver anexo).
- Coherencia preset/sliders/decisión: el JSON debe llevar los valores reales, no
  los del preset anterior. La decisión del ritmo es del usuario.

# Desbordamiento

Detalle en `brief-detalle.md`. El runner lo lee: sí.
