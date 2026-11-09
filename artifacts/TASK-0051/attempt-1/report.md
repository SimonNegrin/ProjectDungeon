---
type: Task Report
title: "TASK-0051: informe de ejecución"
description: Host, E2E y QA visual alineados con el balance provisional v1.
task: TASK-0051
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T22:25:00Z }
artifacts: artifacts/TASK-0051/attempt-1/
verified:
---

# Estado

`success`: los E2E y `verify` pasan con el balance provisional v1; capturas y
paquete de playtest preparados. El playtest de sensación sigue pendiente del
usuario.

# Cambios

- `tests/e2e/{combat-equipment-qa,equipment-hud-qa}.spec.ts`: etiquetas de HUD y
  debug derivadas de `WEAPONS`, `ARMORS` y `SHIELDS`; fórmulas de impacto/daño
  leídas del catálogo; centinela sin armadura.
- `tests/e2e/{frame-qa,game-input-hud,generated-map-qa}.spec.ts`: HP de enemigo
  desde `maxHp`, sin `9/9`.
- `tests/e2e/{perception-alarm-qa,perception-host-qa,perception-fixtures}.ts`:
  radios y MP desde `BESTIARY`; receptores de alarma a 5/6; pareja
  `enemy-3/enemy-4` y aislado `enemy-1` con radio 5.
- `tests/e2e/flee-behavior-qa.spec.ts` y fixtures: cobarde con 5 PV/6 MP, semilla
  de combate 3, umbral calculado y huida verificada por distancia/LOS.
- `tests/e2e/{cursor-qa,game-cursor,frame-qa,game-input-hud,combat-equipment-qa}`
  y `support.ts`: preparación con un solo centinela en escenarios de equipo o
  cursor; comentarios de MP por tipo. No cambian reglas ni aserciones de juego.
- `src/` y `package.json`/`pnpm-lock.yaml` sin cambios.
- Commit SHA: `9c1908171101ea4fc80b0f6aa7e0a315c094d15a`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e` | 76/76 en verde (43,0 s) | `e2e-output.txt` |
| `pnpm exec playwright test perception-alarm-qa flee-behavior-qa --repeat-each=3` | 18/18 en verde (10,9 s) | `e2e-repeat-output.txt` |
| `pnpm run verify` | 734/734 unitarios; docs, config, build y bundle OK | `verify-output.txt` |

No se borró, saltó ni debilitó ningún test; se conserva el recuento de 76 E2E.

# Evidencia visual

- `screenshots/hud-equipo.png`: HUD con Espada +3/+3, equipo y modificadores.
- `screenshots/debug-f1.png`: overlay F1 con equipo y vida.
- `screenshots/alarma.png`: detección, «!» y aviso de alarma.
- `screenshots/huida.png`: cobarde huido tras romper la visión.
- Todas las capturas son 1280×720; hay copias por spec en las carpetas
  `combat-equipment-qa/`, `equipment-hud-qa/`, `perception-alarm-qa/` y
  `flee-behavior-qa/`.
- `playtest.md`: arranque, semilla 279837264 y checklist de sensación.

# Desviaciones

- Los escenarios de cursor/equipo que antes despejaban la guardia con comandos
  ahora cargan solo `enemy-1` con `?test=1`: con MP 5/4/6 y alarma 5 la guardia
  completa mataba al jugador antes del escenario. Las aserciones del criterio no
  cambian.
- El test de impacto/fallo de `equipment-hud-qa` usa un centinela adyacente y
  RNG 15 (primero fallo, luego impacto) porque el centinela muere en 1–2 golpes;
  sigue exigiendo impacto, fallo y debug.
- La huida del cobarde usa semilla de combate 3 y comprueba distancia/LOS en vez
  de una coordenada fija: con 6 MP el cobarde se aleja más que antes.

# Problemas conocidos y preguntas abiertas

- `pnpm run verify` emite avisos de tamaño de handoffs históricos y del brief
  (3761 B), pero termina OK; no afecta a los criterios.
- El playtest de sensación es del usuario; este informe no lo aprueba.
- Sin bloqueos ni preguntas abiertas.

# Fricción reutilizable

Ninguna entrada: no se detectó comportamiento no documentado, fallo repetible ni
contradicción entre brief, plantilla y validador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3761 |
| `report_bytes` | 3731 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
