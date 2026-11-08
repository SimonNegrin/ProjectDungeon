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

- `hud.ts`: arma, escudo, armadura y modificadores; vida bajo cursor y
  `weapon-hint`; `F1` con equipo de jugador y enemigos, vida de todos, tiradas y
  enemigo bajo cursor.
- `debug.ts`: `GameSnapshot.weapons` clonado.
- `renderer.ts`: hacha y daga con formas planas entre decals y unidades.
- `feedback.ts` + `main.ts`: impacto `-N` ASCII y fallo `Fallo`; destello solo
  en impacto.
- Tests: hud/feedback/debug/renderer, integración de recogida/cambio y
  `tests/e2e/equipment-hud-qa.spec.ts`.
- Commits: `0f6e42a` implementación, `e4e4b6d` equipo enemigo en F1 y fallo sin
  `-0`, `605c95f` informe.

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
- `debug-f1` muestra `Equipo enemigo enemy-1: ...`, las tiradas y
  `Últimos eventos: player-1→enemy-1 fallo (HP 9)`.
- El HUD y el feedback no tapan el mapa; el fallo se lee como texto.

# Desviaciones

- Humo con semilla 7 y dos tests: la semilla de referencia repetía impactos.
- `weapon-hint` vive en el HUD; aparece solo sobre un arma y no cubre el mapa.

# Problemas conocidos y preguntas abiertas

- Ninguno funcional. `collectDamageFeedbacks` se conserva por compatibilidad.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `walkTo` puede terminar con 0 MP y `G` se rechaza | El smoke falló al recoger el arma tras caminar | `EndTurn` hasta MP ≥ 1 | Cualquier tarea que camine y gaste MP | Documentarlo o añadir `walkToWithMp` | Bajo; solo E2E | `deferred` (TASK-0030) |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2558 |
| `report_bytes` | 2540 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
