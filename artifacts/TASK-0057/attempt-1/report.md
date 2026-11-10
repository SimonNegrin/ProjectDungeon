---
type: Task Report
title: "TASK-0057: informe de ejecución"
description: "FEEDBACK_CONFIG, cues deterministas, estado visible retrasado, beat/input y debug."
task: TASK-0057
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T17:45:00Z }
artifacts: artifacts/TASK-0057/attempt-1/
verified:
---

# Estado

`success`. El host ya tiene el esqueleto determinista del feedback: configuración
única, cues sobre la timeline, estado intermedio por cue y bloqueo de input.

# Cambios

- `src/host/feedback-config.ts`: `FEEDBACK_CONFIG` con todos los beats y
  duraciones de REQ-017; de ahí derivan `DAMAGE_FEEDBACK_MS`,
  `ATTACK_FLASH_MS` y `NOTICE_DURATION_MS`. `MOTION_CONFIG` sigue en 125/70.
- `src/host/motion.ts`: `buildMotionTimeline` acepta eventos de presentación,
  secuencia los que no son `UnitMoved` por beat, expone `cues`, `beats` y
  `blockingUntilMs`; añade `activeCues`, `dyingUnitIds` y el estado intermedio
  de muerte, recogida, cambio de arma, fase, fin y turno.
- `src/host/presentation.ts`: `PresentationEvent` y
  `buildPresentationEvents`; `PickUp`/`SelectWeapon` se sintetizan desde el
  comando y el diff inicial/final sin entrar en el motor ni en `lastEvents`.
- `src/host/main.ts`: timeline de presentación, `firedCues`, aviso de alarma en
  su cue, `dyingUnitIds` al render y `cues` en `animation`.
- `src/host/debug.ts`: `AnimationSnapshot.cues` (tipo, unidad, inicio,
  duración), clonado y vacío sin animación.
- `src/host/renderer.ts`: opción `dyingUnitIds` para dibujar viva a la unidad
  hasta `UnitDied`.
- Tests: `presentation-feedback.test.ts` (15) y ajustes explicados abajo.
- Commit SHA: `8ed69ba`
  (`feat(TASK-0057): núcleo determinista del feedback y timeline de cues`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | OK 294/294 (20 archivos) | `test-output.txt` |
| `pnpm run verify` | OK: 773/773, docs, config, build y bundle | `verify-output.txt` |

# Evidencia visual

- No aplica en este corte: TASK-0058/0059 implementan los efectos y TASK-0061
  la QA visual/E2E. El hook `window.__game.animation` ya expone `cues` activos.

# Desviaciones

- No se tocó `docs/**` ni `src/game/**`; el lead actualiza ficha y diseño.
- Migración de expectativas, solo donde el nuevo comportamiento las cambia:
  - `motion.test.ts`: los eventos no `UnitMoved` ya no comparten `atMs`; se
    secuencian por beat (ataque 320, muerte 900, fin 800). Las comprobaciones de
    vida/ acción/fin usan el `atMs` del cue en vez del final de la timeline,
    porque el estado ahora se retrasa hasta su evento.
  - `spot.test.ts`: el movimiento posterior a `EnemySpotted`/`AlarmRaised`
    espera al beat; se conserva que el aviso nace al acabar el paso.
  - `debug.test.ts`: el snapshot de animación incluye `cues: []`/cues.
- Nada se borró, saltó ni debilitó: las intenciones originales siguen.

# Problemas conocidos y preguntas abiertas

- `GameRestarted` tiene beat 250 en la configuración, pero el host mantiene el
  reinicio inmediato actual (`cancelAnimation`); el fundido es TASK-0059.
- Los `setTimeout` de daño/destello siguen hasta TASK-0058, ahora leyendo
  `FEEDBACK_CONFIG`; el reloj de presentación ya gobierna beats y alarma.
- `dyingUnitIds` es el contrato de render; el cadáver persistente es TASK-0058.

# Fricción reutilizable

Ninguna entrada que cumpla un disparador en este intento.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2544 |
| `report_bytes` | 3599 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
