---
type: Task Report
title: "TASK-0031: informe de ejecución"
description: Feedback de daño anclado al lado opuesto al atacante.
task: TASK-0031
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:55:00Z }
artifacts: artifacts/TASK-0031/attempt-1/
verified:
---

# Estado

`success`. Solo presentación: `-N`/`Fallo` se ancla al lado opuesto al atacante,
dentro del mapa; reglas y eventos no cambian.

# Cambios

- `src/host/feedback.ts`: `damageFeedbackAnchor` pura en tiles; `AttackFeedback`
  lleva la posición del atacante.
- `src/host/main.ts`: la vista usa el ancla; texto, color, `aria-live`, 1200 ms y
  destello solo en impacto intactos.
- `tests/unit/host/feedback.test.ts`: cuatro direcciones, diagonal, misma casilla,
  bordes y no invasión del atacante.
- `tests/e2e/combat-equipment-qa.spec.ts`: precondición del pasillo, capturas y
  test acotado del ataque normal (semilla 40).
- `index.html` y `src/game/` sin cambios.
- Commit: `4257ee6`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm exec vitest run tests/unit/host/feedback.test.ts` | 120 s | 13 passed | `test-output.txt` |
| `pnpm run test:e2e` | 180 s | 63 passed | `e2e-output.txt` |
| `pnpm run verify` | 180 s | exit 0; 491 tests; avisos previos | `verify-output.txt` |

# Evidencia visual

- `screenshots/attack-corridor.png`: pasillo de una casilla; `-1` en la mitad
  inferior del objetivo, sin tocar al jugador de arriba.
- `screenshots/attack-normal.png`: ataque desde la derecha; `-3` a la izquierda
  del objetivo.

# Desviaciones

- Test E2E acotado del caso normal: la semilla de referencia solo cubre el
  pasillo.
- El test de pasillo fija atacante arriba (`y - 1`) para no cambiar de caso.
- `collectAttackFeedbacks` añade el atacante; expectativas unitarias actualizadas.

# Problemas conocidos y preguntas abiertas

- Tamaño nominal (0,45 × 0,5 tiles) para 1280×720: en ventanas mucho más
  pequeñas el texto puede desbordar unos píxeles en el borde.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `E2E_ARTIFACTS_DIR` anida por spec y el brief pide `screenshots/` | `tests/e2e/artifacts.ts` | Copiar los PNG | Se repite en cada tarea con capturas | Documentar la copia | Bajo; arnés | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2128 |
| `report_bytes` | 2559 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
