---
type: Task Report
title: "TASK-0049: informe de ejecución"
description: E2E en verde, evidencia visual, guarda de bundle, playtest y EXP-004 alineado.
task: TASK-0049
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:40:00Z }
artifacts: artifacts/TASK-0049/attempt-1/
verified:
---

# Estado

`success`. Los 36 fallos heredados quedan en verde sin borrar, saltar ni
debilitar tests; la suite pasa de 74 a 76 casos.

# Cambios

- `tests/e2e/support.ts`: `reachableVisibleTiles`, `findVisibleTile` y opciones
  explícitas de `openBspState` (jugador, enemigos, RNG).
- Specs heredados: posiciones y daños derivados del snapshot/setup; escenarios de
  combate con enemigo adyacente y vida completa; avisos temporales comprobados
  antes de `settle`.
- `tests/e2e/host-bsp-regression.spec.ts`: BSP inyectado con 4 enemigos, cámara,
  cursor, movimiento y combate.
- `tests/e2e/host-growth-render-qa.spec.ts`: caso playtest `2738263054` (22×18, 5
  salas, 6 huecos, 11 enemigos, puertas/bocas válidas, dos cargas, F1, salida sin
  transición) y capturas vía `artifactPath`.
- `experiments/EXP-004-salas-irregulares/src/main.ts`: defaults `roomMax 8`,
  `megaRoomChance 15`, `numPlayers 6`, `enemyPlayersFactor 1.2`,
  `hiddenEnemyChance 0.25`, ya iguales al JSON de decisión.
- Commits: `666a358` (E2E), `2b11c45` (EXP-004).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK; 732 unitarias, build y guarda | `verify-output.txt` |
| `pnpm run test:e2e` | 76 pasan, 0 fallos | `e2e-output.txt` |
| `pnpm run test:e2e --repeat-each=3` | 228 pasan | `e2e-repeat-output.txt` |
| `pnpm run check:bundle` | OK, sin marcadores prohibidos | `bundle-output.txt` |

# Evidencia visual

- `host-growth-render-qa/screenshots/`: `growth-playtest-normal`, `-debug`,
  `-exit`, `growth-normal`, `growth-debug-on/off`, `growth-cavern-debug`,
  `growth-wide-corridor-debug`, `growth-spawn-debug`, `growth-13x13`,
  `growth-exit-stairs-debug`, `growth-exit-door-debug`.
- `host-bsp-regression/screenshots/`: `bsp-regression`, `bsp-regression-combat`.
- Todas 1280×720. Revisar legibilidad, densidad y lectura de puertas/salida.

# Desviaciones

- `experiment.md` no se actualizó: la edición fue rechazada por permisos del
  arnés. Los defaults sí quedan alineados en `main.ts`; el lead debe reflejarlo
  en la nota del experimento si lo considera necesario.
- El comando literal del brief
  `pnpm run test:e2e -- --repeat-each=3` no aplica la repetición: pnpm/Playwright
  interpreta el `--` como filtro. Se ejecutó la repetición real con
  `pnpm run test:e2e --repeat-each=3` (228 casos).
- El playtest queda preparado, no aprobado: lo valora el usuario.

# Problemas conocidos y preguntas abiertas

- La salida no inicia transición; la comprobación E2E lo fija, pero la decisión
  de representación final sigue abierta al playtest.
- No hay dependencias nuevas ni arte final.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `pnpm run test:e2e -- --repeat-each=3` ejecuta 76 tests, no 228 | `e2e-repeat-output.txt` (versión previa en historial) | `pnpm run test:e2e --repeat-each=3` | Toda tarea que pida `--` para Playwright repetirá el fallo | Documentar la forma correcta o un script `test:e2e:repeat` | Bajo | `deferred` (requirements-writer) |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3196 |
| `report_bytes` | 3536 |
