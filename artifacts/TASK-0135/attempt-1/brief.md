---
type: Task Brief
title: "TASK-0135: brief del intento 1"
description: Dibujar cadáveres desde contenedores, tras el beat de muerte y con pila visible.
task: TASK-0135
attempt: 1
status: stable
brief_bytes: 2483
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:22:28Z }
---

# Objetivo

Que `renderScene` dibuje cadáveres desde `state.containers` (`kind: 'corpse'`),
no desde unidades muertas: sin contenedor no hay cadáver; aparece al acabar el
beat de muerte; el de jugador persiste vacío; varios en un tile indican que hay
más de uno. Sin arte nuevo.

# No objetivos

- Panel de saqueo, transferencia, coste 0, «coger todo» o cofre: TASK-0136.
- Reglas de muerte, botín, contenedores, retirada o guardado; tocar `src/game/`.
- Sprites, `corpse-22a/b`, pack de arte, animación de muerte, HUD, `F1`,
  snapshot o panel de inventario.

# Invariantes

- `renderScene` solo lee estado y opciones; no muta ni escribe en la rejilla.
- Solo `kind === 'corpse'`; cofres/fixtures fuera. Decal reutilizado con
  `corpseRectFor` e identidad estable (`corpseOf` o `id`).
- Capas existentes: suelo → decals → cadáveres → unidades.
- No borrar, saltar ni debilitar tests; el test de cadáver existente se actualiza
  a contenedor conservando su intención.

# Criterios de aceptación

`docs/tasks/TASK-0135-host-render-cadaveres-contenedores.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/renderer.ts`: bucle actual sobre `hp <= 0`, `drawCorpse`,
  `RenderOptions.dyingUnitIds`/`effects`.
- `src/host/assets.ts`: `corpseRectFor`. `src/host/motion.ts`: una muerte futura
  no rebobina contenedores; el render debe ocultarlos hasta su beat.
- Tests: `tests/unit/host/renderer.test.ts` y
  `tests/unit/host/presentation-feedback.test.ts` (no `presentation.test.ts`).
- Contrato técnico y escenario E2E en `brief-detalle.md`: leerlo antes de editar.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y capturas. Para E2E usa
`E2E_ARTIFACTS_DIR=artifacts/TASK-0135/attempt-1`.

# Riesgos y decisiones abiertas

- La marca de pila es criterio de aceptación, no decisión creativa abierta:
  conserva el decal y añade una indicación determinista de «más de uno»
  (detalle técnico en `brief-detalle.md`).
- `verify` puede fallar solo por el timeout conocido de EXP-004 en paralelo;
  reejecuta ese archivo aislado y anótalo.
- Timeouts: focalizados 120 s; E2E 180 s; `verify` 240 s.
