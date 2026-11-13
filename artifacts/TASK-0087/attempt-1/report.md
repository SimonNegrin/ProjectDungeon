---
type: Task Report
title: "TASK-0087: informe de ejecución"
description: Catálogo de tres armas nuevas y martillo determinista en el mapa.
task: TASK-0087
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T13:05:00Z }
artifacts: artifacts/TASK-0087/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `equipment.ts`: IDs `hammer`, `electric-sword`, `arcane-dagger` con
  acierto/paquetes de REQ-029 y marca `estimatedV1`; armas existentes intactas.
- `map.ts`: martillo al final de `MAP_WEAPON_SPECS`; reutiliza sala solo si hay
  menos salas útiles que armas.
- `growth.ts`: admite esa sala compartida (nunca celda) sin perder una sala por
  arma cuando hay suficientes.
- Tests de mapa, growth, debug, HUD, feedback y E2E adaptados a tres armas.
- Commit: `72501d02abfef26ec095153b2d78f9fd0e963b72` (`task/TASK-0087`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 81 archivos, 1129 tests, build y bundle OK | `verify-output.txt` |
| `pnpm exec vitest run` (7 archivos tocados) | 134 tests OK | `test-output.txt` |
| `pnpm run test:e2e` (suite completa) | 112 tests OK | `e2e-output.txt` |

Semilla `279837264`: `axe@8,4`, `dagger@23,10`, `hammer@16,17`; la semilla
`1234` cambia las tres. Comprobado en `tests/unit/game/map.test.ts`.

# Evidencia visual

No aplica; la cobertura visual llega en TASK-0092. Los E2E de equipo/HUD se
reejecutaron sin capturas nuevas.

# Desviaciones

- Un mapa growth de tres salas (caverna) no puede alojar una sala por arma: el
  placement reutiliza sala con celda distinta y el validador solo lo admite si
  `salas útiles < MAP_WEAPON_SPECS.length`. Sin ello, la semilla 6 del barrido
  quedaba con dos armas.
- Se ajustaron recuentos E2E de equipo para no dejar especificaciones rotas.
- La marca de estimado es un campo opcional del catálogo, no una lista paralela.
- Regresión E2E del lead: `floor-qa-ambient` medía el sprite del martillo en
  `(16,17)`. `measurableTiles` excluye `snap.weapons` como decals/spawns; sin
  tocar umbrales ni colores.

# Problemas conocidos y preguntas abiertas

- El desglose de ataque con los paquetes nuevos se verifica en TASK-0088/0090.
- Sin cambios en fórmulas, resolvedor, roster ni enemigos.

# Fricción reutilizable

Ninguna: el ajuste de growth es una decisión de esta tarea, no del arnés.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2754 |
| `report_bytes` | 2524 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
