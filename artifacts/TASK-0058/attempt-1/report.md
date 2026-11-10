---
type: Task Report
title: "TASK-0058: informe de ejecución"
description: "Feedback de impacto, fallo, muerte de 900 ms y cadáver persistente sobre la timeline de TASK-0057."
task: TASK-0058
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:50:00Z }
artifacts: artifacts/TASK-0058/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `world-effects.ts`: embestida, destello, retroceso, sacudida, esquiva/escudo y
  muerte (destello, tres parpadeos, disolución de 300 ms).
- `renderer.ts`/`assets.ts`: efectos en Canvas y cadáver desde la unidad muerta
  con `corpse-22a/b`, sobre decals y bajo unidades; sin escribir en la rejilla.
- `floor.ts`: cadáveres fuera de la decoración ambiental (33→31); huesos, sangre
  y manchas siguen.
- `main.ts`/`index.html`: textos DOM de daño en hasta tres nodos estables,
  anclados a cámara, con cola de tres y sin `setTimeout`. Se retira el div CSS
  `attack-flash`; el texto y los efectos usan el reloj de presentación.
- `motion.ts`/`debug.ts`: el cue de ataque expone posiciones y `hit`.
- Tests: unitarios de efectos, textos y cadáver; E2E migrados a cue/estado y
  nuevo `feedback-combat-qa.spec.ts`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | 21 archivos, 305 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config/tests/build/bundle OK (784 tests) | `verify-output.txt` |
| `pnpm run test:e2e` | 80 tests OK | `e2e-output.txt` |

Commit SHA: `a8673c3f6da8312fe2e1697a260cd74c36d6ab2c`
(`task/TASK-0058`).

# Evidencia visual

- `screenshots/{impacto,fallo,muerte,cadaver}.png`; originales en
  `feedback-combat-qa/screenshots/`. Mirar destello/`-N`, `Fallo` gris, muerte y
  cadáver persistente.

# Desviaciones

- La ficha ya traía cambios del lead (`in_progress`, `attempts: 1`); no los
  edité ni entran en el commit.
- Las aserciones de `attack-flash` se migraron a `animation.cues` con `hit` y
  `advance`, conservando impacto-con-destello / fallo-sin-destello. No se alargó
  ningún efecto.
- `advance(ms)` completa la presentación pendiente, pero no consume el tiempo de
  persistencia de textos ya creados; se apagan en su reloj rAF de presentación.

# Problemas conocidos y preguntas abiertas

- Ninguno bloqueante; QA completa y reduced motion: TASK-0060/0061.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3141 |
| `report_bytes` | 2548 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
