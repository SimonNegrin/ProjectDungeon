---
type: Task Report
title: "TASK-0078: informe de ejecución"
description: Contador de acciones en HUD/debug, cierre manual con E, sugerencia y beats por acción.
task: TASK-0078
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T19:20:00Z }
artifacts: artifacts/TASK-0078/attempt-1/
verified:
---

# Estado

`success`. HUD y debug exponen `restantes/máximas`; `E` sigue siendo el único
cierre; la sugerencia aparece solo con 0 acciones y 0 MP; cada ataque conserva
su beat y el contador baja 2→1→0.

# Cambios

- `src/host/hud.ts`: `HudModel.action` pasa a `restantes/máximas`; nuevo
  `actionSuggestion` y nodo `hud-suggestion`; debug muestra acciones de jugador
  y enemigos.
- `src/host/motion.ts`: `presentationState` devuelve una acción por cada ataque
  futuro, en lugar de poner 0 con el primer ataque. Cubre también enemigos.
- `index.html`: etiqueta «Acciones», valor inicial `2/2`, nodo y estilo de la
  sugerencia discreta.
- Tests: unitarios de HUD/debug y de la secuencia de dos ataques; E2E nuevo
  `action-counter-turn-qa.spec.ts`; actualizadas las expectativas `Sí`/`No` de
  `cursor-qa`, `game-input-hud`, `frame-qa` y `generated-map-qa`.
- `cursor-qa` «enemigo alcanzable sin acción»: tras dos `F` exige 0 acciones y
  conserva moverse con MP sin atacar.
- Commit SHA: `19b12ca`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 1014 tests, build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 110/110 | `e2e-output.txt` |

# Evidencia visual

- `tests/e2e/action-counter-turn-qa/screenshots/acciones-sin-mp-1280x720.png`
- `tests/e2e/action-counter-turn-qa/screenshots/acciones-sin-mp-900x700.png`
- Copias con el resto de artefactos en
  `artifacts/TASK-0078/attempt-1/action-counter-turn-qa/screenshots/`.
- Debe verse `Acciones 0/2`, `MP 0/6` y la sugerencia de pulsar `E`, sin
  desbordar en 900×700.

# Desviaciones

- El enlace del brief a REQ-026 usaba `../../docs/...`, que no resuelve desde
  `artifacts/TASK-0078/attempt-1/`; se corrigió a `../../../docs/...` para que
  `docs:check` pase. Sin cambios de contenido ni de criterios.

# Problemas conocidos y preguntas abiertas

- Ninguno. El HUD lateral de REQ-022/REQ-023 sigue fuera de alcance.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Un brief en `artifacts/TASK-*/attempt-*` con enlaces `../../docs/...` bloquea `docs:check` | `verify-output.txt` (primera ejecución): «enlace local roto» en `brief.md` | Corregir la ruta relativa a `../../../docs/...` | Cualquier brief generado en artifacts puede repetir la profundidad incorrecta | Snippet de enlace en la plantilla o que el validador resuelva desde `artifacts/` | Bajo; no cambia criterios | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2535 |
| `report_bytes` | 3033 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
