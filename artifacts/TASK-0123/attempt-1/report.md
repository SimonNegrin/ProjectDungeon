---
type: Task Report
title: "TASK-0123: informe de ejecución"
description: Menú principal y paso 1 con semilla, validación, ?seed y cancelación confirmada.
task: TASK-0123
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:24:32Z }
artifacts: artifacts/TASK-0123/attempt-1/
verified:
---

# Estado

`success`. Menú principal como primera pantalla y paso 1 (N 1-6, semilla,
`?seed=`, validación y cancelación confirmada) sin arrancar partida.

# Cambios

- `src/host/seed.ts`: `parseSeedText` y `hasSeedParam` reutilizan el parser
  existente; `parseSeedParam` conserva su comportamiento.
- `src/host/start-screen.ts`: modelo puro con `random` inyectable.
- `src/host/start-screen-view.ts`: DOM, foco, `aria-live` y trampa del aviso.
- `index.html`, `src/host/ui.css`: sección opaca `.start-screen` y estilos con
  tokens.
- `src/host/main.ts`: monta la pantalla solo sin `?test=1`, bloquea mapa/F1 y
  deja `onContinue`/`onLoadRequested` como no-op.
- Tests nuevos: `tests/unit/host/start-screen.test.ts`,
  `tests/e2e/start-screen.spec.ts` (capturas).
- Commits: `5043e51`, `2fe3f67`, `fd51b00` (`commit.txt`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/start-screen.test.ts tests/unit/host/seed.test.ts` | 46/46 OK | `test-output.txt` |
| `pnpm run verify` | 1406/1406, tsc, build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 219/219 OK (1,3 m) | `e2e-output.txt` |
| `E2E_ARTIFACTS_DIR=tests/e2e pnpm run test:e2e tests/e2e/start-screen.spec.ts` | 4/4 OK | `tests/e2e/start-screen/screenshots/` |

# Evidencia visual

- `tests/e2e/start-screen/screenshots/` y copia en
  `artifacts/TASK-0123/attempt-1/screenshots/`: `menu-1280x720.png`,
  `paso1-1280x720.png`, `confirmacion-1280x720.png`, `paso1-error-1280x720.png`,
  `paso1-segunda-entrada-1280x720.png`, `menu-900x700.png`.
- Mirar: menú con «Nueva» enfocada, N=1 y semilla generada, aviso de
  cancelación y error de semilla visible; 900×700 conserva el encaje del marco.

# Desviaciones

- `tests/e2e/host-growth-render-qa.spec.ts` es el único spec que abría `/` sin
  `test=1` y necesitaba jugar. Su helper `open` pasa a abrir con `test=1` por
  defecto; no se tocaron aserciones, capturas ni el resto de la suite.
- `?seed=` inválido mantiene el `console.warn` histórico de `seed.ts` además del
  aviso visible en el menú (no se cambió el parser).
- Las capturas E2E viven en `tests/e2e/start-screen/screenshots/` (detalle) y se
  copian a `artifacts/` para el informe.

# Problemas conocidos y preguntas abiertas

- «Continuar» anuncia la configuración pero no navega ni arranca: es el alcance
  de TASK-0124. Hasta entonces la pantalla de inicio bloquea las teclas del mapa
  y `F1` en juego normal; `?test=1` conserva el comportamiento anterior.
- No hay persistencia: recargar genera semilla nueva y N=1, según R-012.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El destino de las capturas E2E difiere entre el brief (artifacts) y su detalle/otras tareas (tests/e2e) | `brief.md` y `brief-detalle.md` de TASK-0123; TASK-0105 usó `E2E_ARTIFACTS_DIR=artifacts/.../e2e` | Copiar los PNG a artifacts | Cualquier tarea visual repite la duda y puede subir capturas duplicadas | Fijar una sola ruta en la plantilla de brief | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2497 |
| `report_bytes` | 3628 |
| `overflow` | `none` |
| `criteria_failed` | `0` |
