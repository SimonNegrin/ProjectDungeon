---
type: Task Report
title: "TASK-0029: informe de ejecución"
description: HUD de equipo, armas en el mapa y feedback de combate.
task: TASK-0029
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:00:00Z }
artifacts: artifacts/TASK-0029/attempt-1/
verified:
---

# Estado

`success`. Presentación de R-010/T-006 sin tocar reglas ni `src/game/`.

# Cambios

- `hud.ts`: arma, escudo, armadura, modificadores, vida bajo cursor y
  `weapon-hint`; `F1` con equipo, vida de todos, tiradas y enemigo bajo cursor.
- `debug.ts`: `GameSnapshot.weapons` clonado.
- `renderer.ts`: hacha y daga con formas planas entre decals y unidades.
- `feedback.ts` + `main.ts`: impacto `-N` ASCII, fallo `Fallo`; destello solo en
  impacto.
- Tests: unitarios de hud/feedback/debug/renderer, integración de recogida y
  cambio de arma, y `tests/e2e/equipment-hud-qa.spec.ts`.
- Commit de código y tests: **0f6e42a** en `task/TASK-0029`.

## Corrección tras verificación del lead

- `F1` añade `Equipo enemigo <id>: ...` con arma, escudo, armadura y
  modificadores por enemigo vivo (excluye muertos).
- `Últimos eventos` muestra `fallo (HP N)` cuando `AttackPerformed.hit` es
  falso; los impactos conservan `-N`.
- Tests: línea del centinela (`BESTIARY.sentinel`) y evento de fallo sin `-0`.
- Commit de la corrección: **e4e4b6d** en `task/TASK-0029`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm test` | 33 archivos, 483 tests OK | `pnpm-test.txt` |
| `pnpm run verify` | docs/config/test/build OK; 483 tests | `pnpm-verify.txt` |
| `pnpm run test:e2e` | 57 tests OK | `pnpm-e2e.txt` |
| smoke de equipo | 2 tests OK | `e2e-equipment.txt` |

# Evidencia visual

- `screenshots/`: `weapon-in-map`, `weapon-map-hint`, `weapon-picked`,
  `attack-hit` (`-2`), `attack-miss` (`Fallo`) y `debug-f1`.
- `debug-f1` regenerada: incluye `Equipo enemigo enemy-1: ...` y
  `Últimos eventos: player-1→enemy-1 fallo (HP 9)`.
- Revisar que el HUD no tapa el mapa y que el fallo se lee como texto.

# Desviaciones

- El humo usa la semilla 7 y dos tests: arma/pista/recogida y combate. Con la
  semilla de referencia el recorrido repetía siempre impactos.
- `weapon-hint` vive en el HUD, no anclada al tile: aparece solo si el jugador
  ocupa un arma y no cubre el mapa.

# Problemas conocidos y preguntas abiertas

- Ninguno funcional. `collectDamageFeedbacks` se conserva por compatibilidad.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `walkTo` puede terminar con 0 MP y `G` se rechaza | El smoke falló al recoger el arma tras caminar | `EndTurn` hasta MP ≥ 1 en el spec | Cualquier tarea que camine y gaste MP | Documentar `walkTo` o añadir `walkToWithMp` | Bajo; solo E2E | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2558 |
| `report_bytes` | 3020 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
