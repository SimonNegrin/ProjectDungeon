---
type: Task Report
title: "TASK-0124: informe de ejecución"
description: Configuración jugador a jugador con roster, variante, nombre y navegación.
task: TASK-0124
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:47:00Z }
artifacts: artifacts/TASK-0124/attempt-1/
verified:
---

# Estado

`success`. «Continuar» abre la configuración jugador a jugador; el último
«Siguiente» anuncia la party y deja la pantalla como está. Sin resumen, sesión
ni partida.

# Cambios

- `src/host/player-screen.ts`: modelo puro con N borradores, defaults
  Guerrero/variante 1/nombre vacío, normalización NFC y truncado por code points.
- `src/host/player-screen-view.ts`: DOM, foco, aviso de cancelación y teclado.
- `src/host/start-screen.ts` y `-view.ts`: `returnToMenu`, `hide` y `showMenu`;
  las teclas solo se atienden con la pantalla visible.
- `src/host/main.ts`: conecta `onContinue`; `onComplete` anuncia en
  `player-status` y el mapa/F1 quedan bloqueados con cualquiera de las pantallas.
- `index.html`, `src/host/ui.css`: sección opaca hermana de `start-screen`.
- Tests: `tests/unit/host/player-screen.test.ts`,
  `tests/e2e/player-screen.spec.ts` y caso de `returnToMenu`.
- Commits: `15251eb` y `8849d47` (`commit.txt`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/player-screen.test.ts tests/unit/host/start-screen.test.ts` | 49/49 OK | `test-output.txt` |
| `pnpm run verify` | 1426/1426, tsc, build y bundle OK | `verify-output.txt` |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0124/attempt-1 pnpm run test:e2e tests/e2e/player-screen.spec.ts` | 3/3 OK | `e2e-output.txt` |
| `pnpm run test:e2e tests/e2e/start-screen.spec.ts` | 4/4 OK | adaptación descrita abajo |

# Evidencia visual

- `artifacts/TASK-0124/attempt-1/player-screen/screenshots/` (el helper añade el
  segmento `player-screen`): jugador 1 y 2 a 1280×720, Mago con variante 2 y
  nombre con acentos, aviso de party, confirmación y menú restaurado a 900×700.
- Mirar: nueve arquetipos, dos variantes, foco/selección visibles sin color,
  nombre recortado al aceptar y vuelta al menú con «Nueva» enfocada.

# Desviaciones

- `tests/e2e/start-screen.spec.ts`: tras el primer «Continuar» ahora se cancela
  la pantalla de jugador y se vuelve a entrar por «Nueva» para seguir probando
  el paso 1. Las aserciones existentes no cambian.
- `hide()` conserva el anuncio del paso 1 en el `start-status` oculto para no
  romper esa aserción; no tiene efecto visual.
- La selección usa `outline` interior, no `box-shadow`, porque
  `ui-foundations.test.ts` prohíbe sombras.

# Problemas conocidos y preguntas abiertas

- El último «Siguiente» solo anuncia: resumen, «Empezar», estado inicial y
  sesión son TASK-0126.
- «Cargar» sigue siendo no-op hasta TASK-0141; la ficha/miniaturas son
  TASK-0125. `?seed`, N y el bypass `?test=1` no cambian.

# Fricción reutilizable

Sin entradas: no hay comportamiento no documentado, fallo repetible ni
contradicción de arnés que merezca una propuesta.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2557 |
| `report_bytes` | 3244 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
