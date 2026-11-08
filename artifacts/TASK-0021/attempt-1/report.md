---
type: Task Report
title: "TASK-0021: informe de ejecución"
description: Damero y decoración plana deterministas en el host.
task: TASK-0021
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T13:35:00Z }
artifacts: artifacts/TASK-0021/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `floor.ts`: paridad, tinte, lista blanca, cuotas, hash, plan y resumen.
- `assets.ts`: 23 recuadros 32×32 de decals.
- `renderer.ts`: base → tinte → decals → muros → unidades.
- `debug.ts`: `decoration` en `GameSnapshot`.
- `main.ts` no necesitó cambios: el snapshot ya deriva de `state.map`.
- Commits: `ae6164c` (implementación), `b37af32` (tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm test` | 381/381; +21 sobre 360 | `test-output.txt` |
| `pnpm run verify` | OK, 381 tests | `verify-output.txt` |
| `pnpm run test:e2e` | 40/40 | `e2e-output.txt` |

Densidad: salas 51/339 = 15,04 %; pasillos 5/71 = 7,04 %.
Sin decals en 18 puertas ni en spawns; máximo uno por tile.

# Evidencia visual

- `screenshots/sala.png`, `screenshots/pasillo.png`, `screenshots/umbral.png`
  (1280×720, `?seed=279837264`).
- `logs/screenshots.txt`: cámara, jugador y luminancia media por área/paridad.
  Sala 12,6 → 21,3; pasillo 21,6 → 35,9, luego el damero alterna también en
  escala de grises.
- Mirar: paridad global en suelo, decals planos sin props, jugador sobre umbral
  `(10,5)` sin decal, y camino/cursor/unidades por encima.

# Desviaciones

- Ninguna de alcance. Los muros se dibujan tras los decals para que no queden
  tapados; el orden base → tinte → decals → unidades se mantiene.

# Problemas conocidos y preguntas abiertas

- Tinte fijado en 10 % (`rgba(143,163,184,0.10)`), ajustable en playtest.
- QA visual completa y E2E de REQ-007 pertenecen a `TASK-0022`.
- Capturas: una sala, un pasillo y un umbral; no todo el mapa.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `artifacts/*/logs/*.log` no se versiona por `.gitignore` `*.log` | `git check-ignore` sobre `logs/screenshots.log` | Guardar como `screenshots.txt` | El workflow pide `logs/` como evidencia y el ignore lo excluye en cada tarea | Permitir `artifacts/**/logs/*.log` o documentar `.txt` | Bajo | `deferred` — requirements-writer |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2515 |
| `report_bytes` | 2553 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
