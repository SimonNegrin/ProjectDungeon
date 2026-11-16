---
type: Task Report
title: "TASK-0175: informe de ejecución"
description: EXP-004 muestra fórmula, suelo por salas y total aplicado con P de 1 a 6.
task: TASK-0175
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:22:43Z }
artifacts: artifacts/TASK-0175/attempt-1/
verified:
---

# Estado

`success`. `EXP-004` aplica `T = max(fórmula, R)` antes de repartir y declara en
el panel y en el JSON la fórmula, `R` y el total aplicado.

# Cambios

- `experiments/EXP-004-salas-irregulares/src/spawn.ts`: `enemyTotalFor` acepta
  `R`; `placeEnemies` calcula `R`, el total de la fórmula, el aplicado y el
  aviso de suelo antes de repartir.
- `types.ts`: el desglose añade `nonSpawnRooms`, `formulaTotal` y
  `floorWarning`; `total` pasa a ser el aplicado.
- `metrics.ts`: el panel muestra `R` y, en la fila `Enemigos T`, `N`, `P`,
  fórmula y aplicado; con suelo añade `Aviso de suelo` con los tres valores.
- Tests: factor 0 ahora espera `R` fichas y una por sala; se añaden suelo con
  fórmula baja, `P` de 1 a 6 y el desglose serializable. Determinismo,
  reparto y emboscadas conservan sus tests.
- Commit SHA: `bb620fa9e5a1846519711729342a85db91256a99`

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ok: 1904 tests, `tsc`, build y bundle | `verify-output.txt` |
| `pnpm run build:experiments` | ok: bundle de experimentos | `build-experiments-output.txt` |

# Evidencia visual

- Rutas: no hay capturas; el plan de test declara «E2E / visual: no».
- Qué debe mirar el usuario: con factores a 0 en el panel, `Salas no-spawn`,
  `Enemigos T` (aplicado = `R`) y `Aviso de suelo` (fórmula · `R` · aplicado);
  en el JSON exportado, `stats.enemy` con ambos totales y el desglose.

# Desviaciones

- Ninguna de alcance. Los valores de respaldo de `resolveOptions` (1,35 / 3 /
  0,5) no se tocan: la página siempre pasa 1,2 / 6 / 0,25 y la ficha prohíbe
  cambiar los factores por defecto.

# Problemas conocidos y preguntas abiertas

- `generateMap` sin opciones sigue usando los respaldos antiguos; el panel y
  `experiment.md` usan 1,2 / 6 / 0,25. ¿Alinear los respaldos en otra tarea o
  dejarlos como contrato de librería?
- El reparto con suelo puede quedarse corto si una sala no admite la ficha con
  componentes ≤2; el generador ya emite aviso y no se fuerza una colocación
  inválida.

# Fricción reutilizable

Sin entradas que cumplan un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin brief en el intento 1) |
| `report_bytes` | 2636 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
