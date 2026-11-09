---
type: Task Report
title: "TASK-0047: informe de ejecución"
description: Build de producción aislado, build de experimentos y guarda de bundle.
task: TASK-0047
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:10:00Z }
artifacts: artifacts/TASK-0047/attempt-1/
verified:
---

# Estado

`success`. Build de producción solo con `index.html` → `src/host/main.ts`;
experimentos en `dist-experiments/`; `check:bundle` detecta marcadores y módulos
prohibidos.

# Cambios

- `vite.config.ts`: única entrada de producción. `vite.config.experiments.ts`:
  shell + EXP con `outDir` `dist-experiments/`.
- `scripts/check-bundle.mjs` (+ `.d.mts`): escaneo de `dist/` y grafo de imports;
  `import type` ignorado.
- `package.json`: `build:experiments`, `check:bundle`; guarda en `verify` tras
  `build`. `.gitignore`, `README.md` y `tsconfig.json` actualizados.
- Test `tests/unit/bundle-guard.test.ts` (10 casos). Commit: `35d6eb0`; evidencia
  después.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 721 tests; build y guarda OK | `verify-output.txt` |
| `pnpm run build` | 52 módulos; solo juego | `build-output.txt` |
| `pnpm run build:experiments` | 43 módulos; shell + 5 EXP | `build-experiments-output.txt` |
| `pnpm run check:bundle` | OK, sin marcadores | `guard-positive.txt` |
| Guarda negativa | falla: `BSP module in production graph at src/game/bsp.ts`; revertida | `guard-negative.txt` |
| `pnpm run dev` | `/`, `/experiments/`, `EXP-004` → 200 | `dev-health.txt` |
| `pnpm run test:e2e` | 20 pasan, 50 fallan (growth) | `e2e-output.txt` |

`dist/` sin `experiments/`; `dist-experiments/` con shell y 5 EXP.

# Evidencia visual

Sin cambio visual; `dev-health.txt` cubre `/experiments/` en desarrollo.

# Desviaciones

- 5173 estaba ocupado por un Vite preexistente (PID 58637); no se mató. Se
  verificó y se levantó otro en 5174, cerrado al terminar.
- E2E rojo por fixtures BSP 32×32 frente al default growth de TASK-0046; fuera
  de alcance (TASK-0048/0049).
- La guarda negativa detecta por grafo: el BSP minificado pierde `buildBsp`.

# Problemas conocidos y preguntas abiertas

- Fixtures E2E pendientes de growth.

# Fricción reutilizable

- `pnpm run dev -- --port 5174` reenvía el `--` literal y Vite ignora flags
  (`dev-health.txt`); workaround `pnpm exec vite --port <n>`; `pending`.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2409 |
| `report_bytes` | 2553 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
