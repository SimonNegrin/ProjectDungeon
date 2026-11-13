---
type: Task Brief
title: "TASK-0089: brief del intento 1"
description: Bandas bajo el cursor con LOS, perfil completo en F1 y total con desglose en el feedback de ataque.
task: TASK-0089
attempt: 1
status: stable
brief_bytes: 4077
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T14:05:00Z }
---

# Objetivo

El host muestra las cinco bandas del enemigo bajo el cursor solo con línea de
visión, el perfil completo (incluidas las normales) en `F1` y el ataque como
total más desglose por tipo, leído del evento. Es presentación pura.

# No objetivos

- No tocar motor, perfiles, armas, eventos ni snapshot; no tocar `docs/design/**`.
- No presentar `SpellCast` (TASK-0083) ni añadir eventos, cues o beats nuevos.
- No E2E/QA visual (TASK-0092), matriz de tests (TASK-0090) ni arte final.
- No cambiar `cursorEnemyHp` ni el resto del HUD y del debug.

# Invariantes

- `src/game/**` no cambia; el host lee `event.damage`, `event.damageBreakdown` y
  `unit.stats.resistencia`; no recalcula daño ni bandas.
- Un `AttackPerformed` conserva su único beat de REQ-017; total y desglose se
  presentan juntos. Un paquete con `damage === 0` no aparece en el texto; si
  todos son 0, se muestra el total `−1` sin desglose.
- El total y los PV no cambian; sin dependencias nuevas; no se borran, saltan ni
  debilitan tests.

# Criterios de aceptación

Viven en [TASK-0089 § Criterios](../../../docs/tasks/TASK-0089-host-cursor-bandas-feedback-dano.md#criterios-de-aceptación);
plan en [§ Plan de test](../../../docs/tasks/TASK-0089-host-cursor-bandas-feedback-dano.md#plan-de-test).
Requisito: [REQ-029 T-008 y R-010](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos).

# Contexto mínimo

- `src/game/types.ts` y `damage.ts`: tipos, bandas, desglose y `bandFor`.
- `src/game/perception.ts`: `hasLineOfSight(grid, player, cursor)`; jugador vivo.
- `src/host/hud.ts`: `buildHudModel`, `cursorEnemyDebugLine`, `createHudView`.
- `src/host/feedback.ts`: `collectAttackFeedbacks`; `motion.ts`:
  `FeedbackCueData`; `main.ts`: `addDamageText`, `fireFeedbacks`.
- Tests: `tests/unit/host/hud.test.ts`, `feedback.test.ts`,
  `presentation-feedback.test.ts`; helpers `makeState`, `makeGridWithWalls`,
  `resolvePackets`.
- `index.html`: reutilizar `.hud-group`, `.hud-stat` y `.damage-feedback`.

# Forma recomendada (decisión técnica del lead)

- `src/host/damage-labels.ts` (nuevo, puro): etiquetas de tipos y bandas, icono
  de banda (`▲` vulnerable, `●` normal, `▼` resistente, `▼▼` muy resistente) y
  `formatBreakdown(breakdown)` → `filo 3 + eléctrico 2` filtrando `damage > 0`;
  `formatProfile(profile)` → cinco bandas completas.
- `HudModel.cursorEnemyBands`: filas `{type, icon, typeLabel, band, bandLabel}`
  o `null` sin enemigo vivo bajo cursor, jugador muerto o sin LOS.
  `createHudView` crea un grupo `hud-cursor-bands` con una fila
  `hud-cursor-band-<type>` por tipo y lo oculta cuando es `null`.
- `F1`: `cursorEnemyDebugLine` incluye las cinco bandas con nombre completo,
  normales incluidas, sin filtro de LOS (es debug).
- Feedback: `AttackFeedback.detail` con el desglose del evento; el texto `-N`
  sigue siendo el principal. `DamageTextInstance.detail` se pinta como segunda
  línea del nodo existente y se oculta si está vacía. Fallo o desglose vacío no
  generan detalle.
- No hay arma mixta en el catálogo v1: el fixture de integración se construye
  con `resolvePackets` y un `AttackPerformed` real; no se cambia contenido.

# Artefactos

`report.md` (≤4 KB), `test-output.txt`, `verify-output.txt`; captura opcional del
HUD; commit(s) en `task/TASK-0089` con SHA en el informe.

# Riesgos y decisiones abiertas

- No gatear `cursorEnemyHp` por LOS: el E2E existente lo espera con enemigo bajo
  cursor. Solo cambian las bandas.
- F1 es debug y enseña el perfil completo aunque no haya LOS (REQ-029 T-008); el
  HUD de juego sí respeta la LOS.
- Curación y resurrección no declaran `damageBreakdown`; demostrar que no
  producen detalle y que no se inventa texto.
