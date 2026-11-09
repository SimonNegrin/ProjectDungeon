---
type: Lead Verification
title: "TASK-0051: verificación independiente"
description: Revisión del intento 1, re-ejecución de E2E y verify, y criterios.
task: TASK-0051
attempt: 1
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T22:20:00Z }
---

# Resultado

Intento 1 verificado en `task/TASK-0051`. Rama fusionada en `main`; la tarea
queda en `review` porque el playtest de sensación es del usuario.

# Diff

- Revisado `main..HEAD`: solo `tests/e2e/**`, documentación de la tarea y
  artefactos. Sin cambios en `src/`, `package.json`, `pnpm-lock.yaml`,
  `index.html`, `public/`, `experiments/` ni arte.
- 76 tests E2E (mismo recuento que el baseline); sin `.skip`, `.only` ni
  `fixme`. Las aserciones de criterio se conservan; los cambios de preparación
  con un solo enemigo y las semillas de RNG están documentados en el informe.
- Valores leídos de `BESTIARY`, `WEAPONS`, `ARMORS` y `SHIELDS`; sin cifras
  nuevas duplicadas.

# Re-ejecución

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e` | 76/76 | `lead-e2e.txt` |
| `playwright test perception-alarm-qa flee-behavior-qa --repeat-each=3` | 18/18 | `lead-repeat-each.txt` |
| `pnpm run verify` | 734/734; docs, config, build y bundle OK | `lead-verify.txt` |

# Criterios

1. HUD/debug: capturas `hud-equipo.png` y `perception-alarm-qa/screenshots/debug-f1.png`
   muestran HP 6/6, 6/6, 8/8 y 5/5, alarma 5, armas +3/+3, +2/+5 y +4/+2, y
   centinela «Sin armadura». MP 5/4/6 verificado en catálogo/unitarias y en el
   movimiento de huida (6 MP); el debug no muestra MP enemigo, igual que antes.
2. E2E de alarma a 5/6, colocación ≤5/>5, huida con 5 PV y 6 MP, daños y HP
   nuevos: cubierto por `perception-alarm-qa`, `flee-behavior-qa` y
   `combat-equipment-qa`.
3. `test:e2e` y `verify` verdes; sin tests borrados, saltados o debilitados.
4. Capturas 1280×720 (4 principales y copias por spec). `playtest.md` contiene
   arranque, semilla y checklist; las notas de sensación quedan pendientes del
   usuario, por eso la tarea no se cierra como `done`.

# Observaciones

- El baseline del lead era 60/76 (16 fallos) antes del intento.
- `debug-f1.png` de `equipment-hud-qa` usa un solo centinela por preparación del
  escenario; la captura con los cuatro enemigos es la de `perception-alarm-qa`.
