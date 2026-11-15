---
type: Task Report
title: "TASK-0123: informe de ejecución"
description: Menú principal y paso 1 con semilla, validación, ?seed y cancelación confirmada.
task: TASK-0123
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:34:45Z }
artifacts: artifacts/TASK-0123/attempt-1/
verified:
---

# Estado

`success`. Menú principal como primera pantalla y paso 1 (N 1-6, semilla,
`?seed=`, validación y cancelación confirmada) sin arrancar partida.

# Cambios

- `src/host/seed.ts`: `parseSeedText` y `readSeedParam` reutilizan el parser;
  `parseSeedParam` conserva su comportamiento.
- `src/host/start-screen.ts`: modelo puro con `random` inyectable y aviso
  correcto de `?seed` inválido (se ignora y se genera una nueva).
- `src/host/start-screen-view.ts`: DOM, foco, `aria-live` y trampa del aviso.
- `index.html`, `src/host/ui.css`: sección opaca `.start-screen` con tokens.
- `src/host/main.ts`: monta la pantalla fuera de `?test=1`, bloquea mapa/F1 y
  deja `onContinue`/`onLoadRequested` como no-op.
- Tests: `tests/unit/host/start-screen.test.ts` y
  `tests/e2e/start-screen.spec.ts`.
- Commits: `5043e51`, `2fe3f67`, `fd51b00`, `b2212c1` (`commit.txt`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/start-screen.test.ts tests/unit/host/seed.test.ts` | 46/46 OK | `test-output.txt` |
| `pnpm run verify` | 1406/1406, tsc, build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 219/219 OK | `e2e-output.txt` |
| `E2E_ARTIFACTS_DIR=tests/e2e … start-screen.spec.ts` | 4/4 OK | `tests/e2e/start-screen/screenshots/` |

# Evidencia visual

`tests/e2e/start-screen/screenshots/` y copia en `screenshots/`: menú, paso 1,
confirmación, error y segunda entrada a 1280×720, y menú a 900×700. Mirar: foco
en «Nueva», N=1, semilla generada, aviso de cancelación y error visible.

# Desviaciones

- `host-growth-render-qa.spec.ts` abre con `?test=1` por defecto: el menú ya es
  la primera pantalla. No se tocaron aserciones ni capturas.
- `?seed=` inválido conserva el `console.warn` histórico de `seed.ts`.
- Corrección del lead: el aviso visible reutilizaba «se usa la semilla por
  defecto», falso porque se genera una nueva; corregido en `b2212c1`.
- Las capturas se copian a `artifacts/` además de `<spec>/screenshots/`.

# Problemas conocidos y preguntas abiertas

- «Continuar» anuncia la configuración pero no navega ni arranca: alcance de
  TASK-0124. Hasta entonces el menú bloquea mapa/F1 en juego normal.
- Sin persistencia: recargar genera semilla nueva y N=1, según R-012.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Ruta de capturas E2E entre brief y detalle | brief de TASK-0123; TASK-0105 usó artifacts | Copiar PNG | Posible duplicación futura | Fijar una ruta en la plantilla | Bajo | `rejected` |

Triaje del lead: la plantilla ya fija `<spec>/screenshots/` con
`E2E_ARTIFACTS_DIR`; la copia a `artifacts/` es local. No hay cambio de arnés.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2497 |
| `report_bytes` | 3276 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
