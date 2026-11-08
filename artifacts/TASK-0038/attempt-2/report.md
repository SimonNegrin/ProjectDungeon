---
type: Task Report
title: "TASK-0038: informe del intento 2"
description: Corrección del rastro de "!" entre episodios y de la aserción exacta de avisos.
task: TASK-0038
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:32:00Z }
artifacts: artifacts/TASK-0038/attempt-2/
verified:
---

# Estado

`success`. Se corrigen los dos hallazgos del lead sin tocar `src/game/` ni el
alcance; verify y E2E vuelven a pasar.

# Cambios

- Archivos: `src/host/spot.ts`, `src/host/main.ts`,
  `tests/unit/host/spot.test.ts`, `tests/unit/host/notices.test.ts`.
- Commit SHA: `9c4d88d` (`fix(TASK-0038)`).
- **Hallazgo 1:** nuevo `reconcileSpottedUnits(state, spotted)` que elimina un
  ID cuando su enemigo muere o deja de estar en `alert`. `render()` lo invoca con
  el estado final, así que el rastro de un episodio anterior no se reutiliza si
  una onda vuelve a alertar al enemigo sin `EnemySpotted`. El "!" del paso de
  detección no se adelanta porque la poda usa el estado final.
- **Hallazgo 2:** `tests/unit/host/notices.test.ts` vuelve a `toEqual` con los
  cinco textos exactos (los cuatro de REQ-004 R-016 y `alarm-raised`).
- Se conservan aviso de alarma, radios solo con `F1`, snapshot profundo y el
  resto del host del intento 1.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | 18 archivos, 266 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config OK, 37 archivos, 559 tests OK, build OK | `verify-output.txt` |
| `pnpm run test:e2e` (`E2E_ARTIFACTS_DIR=…attempt-2`) | 64 tests OK (26.7 s) | `e2e-output.txt` |

Test nuevo: detector marcado → `returning` → `dormant` → alertado por onda sin
`EnemySpotted` → sin marcador; una detección posterior sí lo vuelve a mostrar.
No se borró, saltó ni debilitó ningún test.

# Evidencia visual

- `perception-host-qa/screenshots/normal.png`: "!" y aviso, sin radios.
- `perception-host-qa/screenshots/debug-f1.png`: radios de visión/alarma y
  estado de percepción en el overlay.
- E2E focal con semilla `279837264` y viewport 1280×720.

# Desviaciones

- Ninguna funcional. La única diferencia respecto al intento 1 es la poda del
  rastro y la restauración de la aserción exacta de avisos.

# Problemas conocidos y preguntas abiertas

- **Limitación TASK-0035 (decisión del lead):** un alertado por onda que luego
  vuelve a ver al jugador no reemite `EnemySpotted` (`newEpisode = awareness !==
  'alert'` en `detectEnemiesAfterStep`). El "!" cubre al detector que inicia el
  episodio; los receptores no lo muestran. Evidencia:
  `tests/unit/game/perception.test.ts` y `tests/unit/host/spot.test.ts`. No se
  cambió la percepción.
- El aviso de alarma mantiene la duración breve del HUD (1,6 s).

# Fricción reutilizable

Ninguna entrada: los hallazgos eran de la tarea y ya están corregidos.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2604 |
| `report_bytes` | 3037 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
