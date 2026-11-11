---
type: Task Report
title: "TASK-0063: informe de ejecución"
description: Motor v2.0 de EXP-003, tests y medición de 12 emparejamientos.
task: TASK-0063
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:45:00Z }
artifacts: artifacts/TASK-0063/attempt-1/
verified:
---

# Estado

`success`. Motor v2.0 en `experiments/EXP-003-mesa-combate/src/v2/`, 61 tests en
verde y 12 × 1.000 duelos reproducibles. **Hallazgo: los 12 quedan fuera de la
banda 40–60 % por arriba (96,3–100 %).** No se ha ajustado ningún valor de
balance.

# Cambios

- `src/v2/`: `types`, `catalog`, `rng`, `resolver`, `actions`, `ai`, `duel`,
  `measure`, `index` y 6 tests. Sin imports de `src/` en runtime; la equivalencia
  vive en `resolver.test.ts`.
- `results/v2-seed-1017-duels-1000.json`: catálogo `EXP-003-v2.0.0`, semilla 1017,
  escenario, banda y métricas. Segunda ejecución byte a byte.
- Commit: `4aec2fe9bed10003b5b93de1a342dce80adbdc21`.

# Tabla de emparejamientos

Banda 40–60 % de victorias del héroe, tolerancia ±2 pp. Los 12 casos quedan por
encima.

| Héroe | Enemigo | Win % | Banda 40–60 ±2 |
|---|---|---:|---|
| Guerrero | Centinela | 100,0 | fuera |
| Guerrero | Bruto | 99,6 | fuera |
| Guerrero | Cobarde | 100,0 | fuera |
| Pícaro | Centinela | 99,7 | fuera |
| Pícaro | Bruto | 96,3 | fuera |
| Pícaro | Cobarde | 99,7 | fuera |
| Mago | Centinela | 99,8 | fuera |
| Mago | Bruto | 99,9 | fuera |
| Mago | Cobarde | 100,0 | fuera |
| Clérigo | Centinela | 100,0 | fuera |
| Clérigo | Bruto | 100,0 | fuera |
| Clérigo | Cobarde | 100,0 | fuera |

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run experiments/EXP-003-mesa-combate/src/v2` | 61/61, 6 archivos | `test-output.txt` |
| `pnpm run docs:check` | OK | `docs-check-output.txt` |
| `pnpm run verify` | OK: 886 tests, build y bundle | `verify-output.txt` |

# Desviaciones

- Añadí frontmatter OKF mínimo a `brief-detalle.md` para que `docs:check` pase;
  el texto vinculante no cambió (ver fricción).
- v2.0 no modela investigación/enfriamiento de alerta: el regreso solo ocurre
  tras huir sin visión; no afecta al pasillo.
- Se permite repetir el mismo hechizo en el turno (acceso por nivel, sin
  grimorio); la variante de hechizos distintos no se midió.
- El escenario por defecto acorrala al Cobarde en el extremo 7; hay test de
  huida con recorrido.
- Los resultados dependen de la política agresiva, iniciativa del héroe, pasillo de 8 y semilla
  1017.

# Recomendaciones (no aplicadas)

1. Subir PV/defensa/acciones enemigas o bajar el output del héroe antes de
   aceptar REQ-026: los enemigos mueren en 1–2 rondas.
2. Revisar el Pícaro: la daga +4 acierta 36/36 contra Centinela y Bruto; solo el
   Bruto le gana un 3,7 % de duelos.
3. Revisar magia: Mago y Clérigo ganan 99,8–100 % con maná 16/12 y Fuego IV
   repetido; medir hechizos distintos y bajar poder o maná.
4. Repetir la medición tras alargar el TTK: con 1–2 rondas la réplica apenas
   participa y su efecto queda subestimado.
5. Revisar el Cobarde (5 PV, umbral 40 %): huye en 91–601 de 1.000 duelos, pero
   casi nunca cambia el resultado.

Detalle, tablas completas y supuestos: [report-detalle.md](report-detalle.md).
JSON: [resultados](../../../experiments/EXP-003-mesa-combate/results/v2-seed-1017-duels-1000.json).

# Problemas conocidos

- `verify` solo muestra avisos de tamaño de handoffs antiguos; no hay fallos.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` exige OKF a `*-detalle.md` | `brief-detalle.md: falta frontmatter OKF` | Frontmatter en el anexo | La plantilla manda desbordar sin pedir OKF; se repetirá | Eximir el anexo | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2524 |
| `report_bytes` | 4009 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
