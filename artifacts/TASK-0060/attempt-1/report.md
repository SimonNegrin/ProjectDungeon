---
type: Task Report
title: "TASK-0060: informe de ejecución del intento 1"
description: "Atajo fuera de pantalla, cruce y modo reducido."
task: TASK-0060
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:40:00Z }
artifacts: artifacts/TASK-0060/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `motion.ts`: agrupa `UnitMoved` contiguos y clasifica por extremos con la
  política del host. Fuera/fuera → beat de 150 ms sin pasos, fases ni foco;
  cruce → tween completo y cámara solo para el jugador; dentro → foco actual.
  Separa `focusUnitIds` de `animatedUnitIds`. `reducedMotion` colapsa beats,
  pasos y pausas a 0 sin reordenar.
- `visibility.ts` (nuevo) + `main.ts`: el host decide visibilidad con cámara,
  viewport y jugador, y pasa la preferencia reducida al builder.
- Reducido: feedback aplicado en el evento; sin fundido, sacudida ni parpadeo.
  Las vistas omiten animaciones, el texto queda estático y `index.html` añade la
  media query CSS.
- Tests: `motion-visibility.test.ts` (10) y
  `enemy-phase-offscreen-qa.spec.ts` (3, capturas). `src/game/` intacto, sin
  dependencias nuevas.
- Commit SHA: `edf671b7fe8cb5c2106a2f9a6ce7f2399e8ff25f`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `vitest run tests/unit/host` | 180 s | 23 archivos, 339 OK | `test-output.txt` |
| E2E TASK-0060 | 300 s | 3 OK | `test-output.txt` |
| `pnpm run verify` | 300 s | 818 tests, build y bundle OK | `verify-output.txt` |
| Regresión reducido + 0059 | 300 s | 7 OK | `e2e-regression.txt` |

# Evidencia visual

- `screenshots/enemigo-fuera-de-pantalla.png`: beat colapsado sin enemigo ni
  cámara.
- `screenshots/enemigo-cruce-de-borde.png`: cruce 13→12 con tween y cámara
  estable en el jugador. Capturas con `advance` determinista.

# Desviaciones

- Ninguna de alcance.

# Problemas conocidos y preguntas abiertas

- El atajo usa la cámara del instante de la acción; no se reevalúa a mitad del
  recorrido (coincide con brief y ADR).
- Un `verify` falló por timeout de 5 s en el barrido de EXP-004; la repetición
  pasó. El `verify-output.txt` final es el de la ejecución correcta.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `artifactPath` escribe en `<spec>/screenshots/` y la ficha pide `attempt-N/screenshots/` | PNG movidos a mano | Copiar tras el E2E | Afecta a capturas | Unificar ruta | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3680 |
| `report_bytes` | 2712 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
